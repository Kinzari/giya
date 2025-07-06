<?php
/**
 * WebSocket notification server for real-time GIYA notifications
 * This implements a simple WebSocket server using Ratchet/ReactPHP
 */

require_once 'db_connection.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\App;
use Ratchet\RFC6455\Messaging\MessageInterface;

class NotificationServer implements MessageComponentInterface {
    protected $clients;
    protected $pdo;
    protected $userConnections;

    public function __construct($pdo) {
        $this->clients = new \SplObjectStorage;
        $this->pdo = $pdo;
        $this->userConnections = [];

        // Start periodic notification checks
        $this->startNotificationChecker();
    }

    public function onOpen(ConnectionInterface $conn) {
        // Store the new connection to send notifications later
        $this->clients->attach($conn);

        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);

        if (isset($data['type']) && $data['type'] === 'auth') {
            // Store user authentication info
            $userTypeId = $data['userTypeId'] ?? null;
            $departmentId = $data['departmentId'] ?? null;

            $this->userConnections[$from->resourceId] = [
                'userTypeId' => $userTypeId,
                'departmentId' => $departmentId,
                'connection' => $from
            ];

            // Send initial notification counts
            $this->sendNotificationCounts($from, $userTypeId, $departmentId);
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Remove the connection from storage
        $this->clients->detach($conn);
        unset($this->userConnections[$conn->resourceId]);

        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }

    private function startNotificationChecker() {
        // Check for new notifications every 2 seconds
        $loop = \React\EventLoop\Factory::create();

        $loop->addPeriodicTimer(2, function() {
            $this->checkAndSendNotifications();
        });
    }

    private function checkAndSendNotifications() {
        foreach ($this->userConnections as $resourceId => $userData) {
            try {
                $this->sendNotificationCounts(
                    $userData['connection'],
                    $userData['userTypeId'],
                    $userData['departmentId']
                );
            } catch (Exception $e) {
                echo "Error sending notifications to {$resourceId}: {$e->getMessage()}\n";
            }
        }
    }

    private function sendNotificationCounts($conn, $userTypeId = null, $departmentId = null) {
        try {
            $counts = $this->getNotificationCounts($userTypeId, $departmentId);

            $message = json_encode([
                'type' => 'notification_update',
                'data' => $counts
            ]);

            $conn->send($message);
        } catch (Exception $e) {
            echo "Error getting notification counts: {$e->getMessage()}\n";
        }
    }

    private function getNotificationCounts($userTypeId = null, $departmentId = null) {
        $activePosts = 0;
        $resolvedPosts = 0;

        // Count unread active posts
        $activeQuery = "
            SELECT COUNT(*) as count
            FROM tbl_giya_posts p
            WHERE p.post_status IN (0, 1)
            AND (p.is_read_by_admin = 0 OR p.is_read_by_admin IS NULL)
        ";

        if ($userTypeId == 5 && $departmentId) {
            $activeQuery .= " AND (p.is_forwarded = 1 AND p.post_departmentId = ?)";
            $stmt = $this->pdo->prepare($activeQuery);
            $stmt->execute([$departmentId]);
        } else {
            $stmt = $this->pdo->prepare($activeQuery);
            $stmt->execute();
        }

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $activePosts = $result['count'];

        // Count unread resolved posts
        $resolvedQuery = "
            SELECT COUNT(*) as count
            FROM tbl_giya_posts p
            WHERE p.post_status = 2
            AND (p.is_read_by_admin = 0 OR p.is_read_by_admin IS NULL)
        ";

        if ($userTypeId == 5 && $departmentId) {
            $resolvedQuery .= " AND (p.is_forwarded = 1 AND p.post_departmentId = ?)";
            $stmt = $this->pdo->prepare($resolvedQuery);
            $stmt->execute([$departmentId]);
        } else {
            $stmt = $this->pdo->prepare($resolvedQuery);
            $stmt->execute();
        }

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $resolvedPosts = $result['count'];

        return [
            'active' => $activePosts,
            'resolved' => $resolvedPosts,
            'total' => $activePosts + $resolvedPosts
        ];
    }
}

// Note: This requires Ratchet/ReactPHP to be installed via Composer
// Run: composer require ratchet/pawl ratchet/rfc6455 react/socket-client

// Start the WebSocket server (uncomment when Ratchet is installed)
/*
$app = new App('localhost', 8080);
$app->route('/notifications', new NotificationServer($pdo), ['*']);
$app->run();
*/

?>
