<?php
require 'db_connection.php';

function returnSuccess($data) {
    echo json_encode([
        'success' => true,
        'data' => $data
    ]);
    exit;
}

function returnError($message, $code = 400) {
    echo json_encode([
        'success' => false,
        'message' => $message,
        'code' => $code
    ]);
    exit;
}

class ProfileHandler {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getUserProfile($userId) {
        try {
            $query = "
                SELECT
                    u.*,
                    ut.user_type,
                    d.department_name,
                    c.course_name,
                    sy.schoolyear,
                    camp.campus_name
                FROM tblusers u
                LEFT JOIN tblusertype ut ON u.user_typeId = ut.user_typeId
                LEFT JOIN tbldepartments d ON u.user_departmentId = d.department_id
                LEFT JOIN tblcourses c ON u.user_courseId = c.course_id
                LEFT JOIN tblschoolyear sy ON u.user_schoolyearId = sy.schoolyear_id
                LEFT JOIN tblcampus camp ON u.user_campusId = camp.campus_id
                WHERE u.user_id = ?
            ";

            $stmt = $this->pdo->prepare($query);
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                return returnError('User not found', 404);
            }

            // Format the response
            $response = [
                'user_id' => $user['user_id'],
                'school_id' => $user['user_schoolId'],
                'first_name' => $user['user_firstname'],
                'middle_name' => $user['user_middlename'],
                'last_name' => $user['user_lastname'],
                'suffix' => $user['user_suffix'],
                'phinmaed_email' => $user['phinmaed_email'],
                'email' => $user['user_email'],
                'contact' => $user['user_contact'],
                'user_type' => $user['user_type'],
                'user_type_id' => $user['user_typeId'],
                'department_id' => $user['user_departmentId'],
                'department_name' => $user['department_name'],
                'course_id' => $user['user_courseId'],
                'course_name' => $user['course_name'],
                'school_year_id' => $user['user_schoolyearId'],
                'school_year' => $user['schoolyear'],
                'campus_id' => $user['user_campusId'],
                'campus_name' => $user['campus_name'],
                'user_status' => $user['user_status'],
                'user_level' => $user['user_level']
            ];

            return returnSuccess($response);
        } catch (PDOException $e) {
            return returnError('Database error: ' . $e->getMessage());
        }
    }

    public function updateProfile($data) {
        try {
            $userId = $data['user_id'];

            // Get current user data to check user type
            $userQuery = "SELECT user_typeId FROM tblusers WHERE user_id = ?";
            $userStmt = $this->pdo->prepare($userQuery);
            $userStmt->execute([$userId]);
            $currentUser = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!$currentUser) {
                return returnError('User not found', 404);
            }

            $userTypeId = $currentUser['user_typeId'];

            // Start transaction
            $this->pdo->beginTransaction();

            // Base fields that all user types can update
            $baseFields = [
                'user_firstname' => $data['first_name'],
                'user_lastname' => $data['last_name'],
                'user_middlename' => $data['middle_name'] ?? null,
                'user_suffix' => $data['suffix'] ?? null,
                'user_contact' => $data['contact'],
                'user_campusId' => $data['campus_id']
            ];

            // Add email for visitors and employees (students use phinmaed_email)
            if ($userTypeId == 1 || $userTypeId == 3 || $userTypeId == 4) {
                $baseFields['user_email'] = $data['email'];
            } else {
                $baseFields['phinmaed_email'] = $data['phinmaed_email'];
            }

            // Type-specific fields
            if ($userTypeId == 2) { // Student
                $baseFields['user_courseId'] = $data['course_id'];
                $baseFields['user_departmentId'] = $data['department_id'];
                $baseFields['user_schoolyearId'] = $data['school_year_id'];
            } elseif ($userTypeId == 3 || $userTypeId == 4) { // Faculty/Employee
                $baseFields['user_departmentId'] = $data['department_id'];
            }
            // Visitors don't have department/course fields

            // Build update query
            $setClause = [];
            $params = [];
            foreach ($baseFields as $field => $value) {
                $setClause[] = "$field = ?";
                $params[] = $value;
            }
            $params[] = $userId;

            $updateQuery = "UPDATE tblusers SET " . implode(', ', $setClause) . " WHERE user_id = ?";
            $updateStmt = $this->pdo->prepare($updateQuery);
            $updateStmt->execute($params);

            // Handle password change if provided
            if (!empty($data['current_password']) && !empty($data['new_password'])) {
                $passwordQuery = "SELECT user_password FROM tblusers WHERE user_id = ?";
                $passwordStmt = $this->pdo->prepare($passwordQuery);
                $passwordStmt->execute([$userId]);
                $currentPassword = $passwordStmt->fetchColumn();

                if ($currentPassword !== $data['current_password']) {
                    $this->pdo->rollback();
                    return returnError('Current password is incorrect');
                }

                $newPasswordQuery = "UPDATE tblusers SET user_password = ? WHERE user_id = ?";
                $newPasswordStmt = $this->pdo->prepare($newPasswordQuery);
                $newPasswordStmt->execute([$data['new_password'], $userId]);
            }

            $this->pdo->commit();

            return returnSuccess(['message' => 'Profile updated successfully']);

        } catch (PDOException $e) {
            $this->pdo->rollback();
            return returnError('Database error: ' . $e->getMessage());
        }
    }

    public function getCourses() {
        try {
            $query = "
                SELECT c.course_id, c.course_name, c.course_departmentId, d.department_name
                FROM tblcourses c
                LEFT JOIN tbldepartments d ON c.course_departmentId = d.department_id
                ORDER BY d.department_name, c.course_name
            ";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute();
            $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return returnSuccess($courses);
        } catch (PDOException $e) {
            return returnError('Database error: ' . $e->getMessage());
        }
    }

    public function getDepartments() {
        try {
            $query = "SELECT department_id, department_name FROM tbldepartments ORDER BY department_name";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute();
            $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return returnSuccess($departments);
        } catch (PDOException $e) {
            return returnError('Database error: ' . $e->getMessage());
        }
    }

    public function getCampuses() {
        try {
            $query = "SELECT campus_id, campus_name FROM tblcampus ORDER BY campus_name";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute();
            $campuses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return returnSuccess($campuses);
        } catch (PDOException $e) {
            return returnError('Database error: ' . $e->getMessage());
        }
    }

    public function getSchoolYears() {
        try {
            $query = "SELECT schoolyear_id, schoolyear FROM tblschoolyear WHERE is_active = 1 ORDER BY schoolyear_id";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute();
            $schoolYears = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return returnSuccess($schoolYears);
        } catch (PDOException $e) {
            return returnError('Database error: ' . $e->getMessage());
        }
    }
}

// Handle API requests
if (isset($_GET['action'])) {
    $handler = new ProfileHandler($pdo);

    switch ($_GET['action']) {
        case 'get_profile':
            if (!isset($_GET['user_id'])) {
                returnError('User ID is required');
            }
            $handler->getUserProfile($_GET['user_id']);
            break;

        case 'update_profile':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                returnError('Invalid request method');
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                returnError('Invalid JSON data');
            }

            if (!isset($data['user_id'])) {
                returnError('User ID is required');
            }

            $handler->updateProfile($data);
            break;

        case 'get_courses':
            $handler->getCourses();
            break;

        case 'get_departments':
            $handler->getDepartments();
            break;

        case 'get_campuses':
            $handler->getCampuses();
            break;

        case 'get_school_years':
            $handler->getSchoolYears();
            break;

        default:
            returnError('Invalid action');
            break;
    }
} else {
    returnError('Action is required');
}
?>
