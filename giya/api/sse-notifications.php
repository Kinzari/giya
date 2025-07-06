<?php
/**
 * Server-Sent Events (SSE) endpoint for real-time GIYA notifications
 * This provides real-time updates without requiring WebSocket libraries
 */

require_once 'db_connection.php';

// Set headers for SSE
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Cache-Control');

// Prevent timeout
set_time_limit(0);
ini_set('max_execution_time', 0);

// Get user credentials from query parameters
$userTypeId = $_GET['userTypeId'] ?? null;
$departmentId = $_GET['departmentId'] ?? null;

$lastCounts = null;

/**
 * Get notification counts from database
 */
function getNotificationCounts($pdo, $userTypeId = null, $departmentId = null) {
    try {
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
            $stmt = $pdo->prepare($activeQuery);
            $stmt->execute([$departmentId]);
        } else {
            $stmt = $pdo->prepare($activeQuery);
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
            $stmt = $pdo->prepare($resolvedQuery);
            $stmt->execute([$departmentId]);
        } else {
            $stmt = $pdo->prepare($resolvedQuery);
            $stmt->execute();
        }

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $resolvedPosts = $result['count'];

        return [
            'active' => $activePosts,
            'resolved' => $resolvedPosts,
            'total' => $activePosts + $resolvedPosts,
            'timestamp' => time()
        ];

    } catch (Exception $e) {
        error_log("Error in SSE getNotificationCounts: " . $e->getMessage());
        return [
            'active' => 0,
            'resolved' => 0,
            'total' => 0,
            'error' => $e->getMessage(),
            'timestamp' => time()
        ];
    }
}

/**
 * Send SSE message
 */
function sendSSEMessage($data) {
    echo "data: " . json_encode($data) . "\n\n";
    if (ob_get_level()) {
        ob_flush();
    }
    flush();
}

// Send initial connection message
sendSSEMessage([
    'type' => 'connected',
    'message' => 'SSE connection established',
    'timestamp' => time()
]);

// Main loop for sending notifications
while (true) {
    try {
        // Check if client is still connected
        if (connection_aborted()) {
            break;
        }

        // Get current notification counts
        $currentCounts = getNotificationCounts($pdo, $userTypeId, $departmentId);

        // Only send update if counts have changed
        if ($lastCounts === null || $currentCounts !== $lastCounts) {
            sendSSEMessage([
                'type' => 'notification_update',
                'data' => $currentCounts
            ]);
            $lastCounts = $currentCounts;
        }

        // Send heartbeat every 10 seconds to keep connection alive
        static $lastHeartbeat = 0;
        if (time() - $lastHeartbeat >= 10) {
            sendSSEMessage([
                'type' => 'heartbeat',
                'timestamp' => time()
            ]);
            $lastHeartbeat = time();
        }

        // Sleep for 2 seconds before next check (real-time updates)
        sleep(2);

    } catch (Exception $e) {
        error_log("SSE Error: " . $e->getMessage());
        sendSSEMessage([
            'type' => 'error',
            'message' => 'Server error occurred',
            'timestamp' => time()
        ]);
        break;
    }
}

// Connection closed
sendSSEMessage([
    'type' => 'disconnected',
    'message' => 'SSE connection closed',
    'timestamp' => time()
]);

?>
