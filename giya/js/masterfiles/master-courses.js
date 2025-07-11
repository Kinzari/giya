let coursesTable;
let currentCourseData = null;
const baseUrl = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);

$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const departmentFilter = urlParams.get('department');

    initBasicCoursesTable(departmentFilter);

    loadDepartmentsDropdown('departmentFilter');
    setupEventHandlers();
    checkModals();

    if (departmentFilter) {
        $('#departmentFilter').val(departmentFilter);
        $('#departmentFilterLabel').text('Filtered by department:');
    }
});

function initBasicCoursesTable(departmentId = null) {
    try {
        if ($.fn.DataTable.isDataTable('#coursesTable')) {
            $('#coursesTable').DataTable().destroy();
        }

        $('#coursesTable').empty();
        $('#coursesTable').append('<thead><tr>' +
            '<th>Course Name</th>' +
            '<th>Department</th>' +
            '<th>Students</th>' +
            '<th>Actions</th>' +
            '</tr></thead><tbody></tbody>');

        let ajaxUrl = 'masterfile.php?action=courses';
        if (departmentId) {
            ajaxUrl += `&department_id=${departmentId}`;
        }

        const columns = [
            { data: 'course_name' },
            { data: 'department_name' },
            {
                data: 'student_count',
                render: function(data) {
                    return MasterTable.renderCountBadge(data);
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    return MasterTable.renderActionButtons(data.course_id, {
                        view: true,
                        edit: true,
                        delete: true,
                        viewClass: 'view-course',
                        editClass: 'edit-course',
                        deleteClass: 'delete-course'
                    });
                }
            }
        ];

        const options = {
            ajax: MasterTable.createAjaxConfig(ajaxUrl),
            language: {
                emptyTable: "No courses available",
                zeroRecords: "No matching courses found",
                searchPlaceholder: "Search courses..."
            }
        };

        coursesTable = MasterTable.initTable('#coursesTable', columns, options);

        $('#coursesTable tbody').on('click', 'tr', function(e) {
            if (!$(e.target).closest('button').length) {
                const data = coursesTable.row(this).data();
                if (data) {
                    showCourseDetails(data.course_id);
                }
            }
        });

        setupActionButtonEvents();
    } catch (error) {
        console.error('Error initializing courses table:', error);
    }
}

function setupActionButtonEvents() {
    $('#coursesTable').on('click', '.view-course', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).data('id');
        showCourseDetails(id);
    });

    $('#coursesTable').on('click', '.edit-course', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).data('id');
        editCourse(id);
    });

    $('#coursesTable').on('click', '.delete-course', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).data('id');
        deleteCourse(id);
    });
}

function setupEventHandlers() {
    $('#addCourseBtn').on('click', function() {
        showAddCourseForm();
    });

    $('#departmentFilter').on('change', function() {
        const departmentId = $(this).val();
        if (departmentId) {
            initBasicCoursesTable(departmentId);
        } else {
            initBasicCoursesTable();
        }
    });

    $('#courseForm').on('submit', function(e) {
        e.preventDefault();
        if (validateCourseForm()) {
            saveCourse();
        }
    });

    $(document).on('click', '#detailsEdit', function() {
        $('#courseDetailsModal').modal('hide');
        if (currentCourseData) {
            editCourse(currentCourseData.course_id);
        }
    });

    $(document).on('click', '#detailsDelete', function() {
        $('#courseDetailsModal').modal('hide');
        if (currentCourseData) {
            deleteCourse(currentCourseData.course_id);
        }
    });

    $(document).on('click', '#viewStudents', function() {
        if (currentCourseData) {
            window.location.href = `master-students.html?course=${currentCourseData.course_id}`;
        }
    });
}

function checkModals() {
    if ($('#courseDetailsModal').length === 0) {
        createCourseDetailsModal();
    }
}

function createCourseDetailsModal() {
    const modalHtml = `
    <div class="modal fade" id="courseDetailsModal" tabindex="-1" aria-labelledby="courseDetailsModalTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="courseDetailsModalTitle">Course Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Course ID:</strong> <span id="detailsCourseId"></span></p>
                    <p><strong>Course Name:</strong> <span id="detailsCourseName"></span></p>
                    <p><strong>Department:</strong> <span id="detailsDepartmentName"></span></p>
                    <p><strong>Total Students:</strong> <span id="detailsStudentCount" class="badge bg-primary"></span></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-info" id="viewStudents">View Students</button>
                    <button type="button" class="btn btn-primary" id="detailsEdit">Edit</button>
                    <button type="button" class="btn btn-danger" id="detailsDelete">Delete</button>
                </div>
            </div>
        </div>
    </div>`;

    $('body').append(modalHtml);
}

function showCourseDetails(courseId) {
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

    $.ajax({
        url: `${baseUrl}masterfile.php?action=get_course`,
        type: 'GET',
        data: { id: courseId },
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success && response.data) {
                const course = response.data;
                currentCourseData = course;

                $('#detailsCourseId').text(course.course_id);
                $('#detailsCourseName').text(course.course_name);
                $('#detailsDepartmentName').text(course.department_name);
                $('#detailsStudentCount').text(course.student_count || 0);

                const hasStudents = course.student_count > 0;
                $('#detailsDelete').prop('disabled', hasStudents);
                if (hasStudents) {
                    $('#detailsDelete').attr('title', 'Cannot delete courses with associated students');
                } else {
                    $('#detailsDelete').attr('title', 'Delete this course');
                }

                $('#courseDetailsModal').modal('show');
            } else {
                Swal.fire('Error', response.message || 'Failed to load course details', 'error');
            }
        },
        error: handleAjaxError
    });
}

function editCourse(courseId) {
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

    $.ajax({
        url: `${baseUrl}masterfile.php?action=get_course`,
        type: 'GET',
        data: { id: courseId },
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success && response.data) {
                const course = response.data;

                $('#courseForm')[0].reset();

                $('#courseForm').data('mode', 'edit');
                $('#courseForm').data('id', course.course_id);
                $('#courseName').val(course.course_name);

                loadDepartmentsDropdown('department', course.course_departmentId);

                $('#courseModalLabel').text('Edit Course');
                $('#courseModal').modal('show');
            } else {
                Swal.fire('Error', response.message || 'Failed to load course data', 'error');
            }
        },
        error: handleAjaxError
    });
}

function showAddCourseForm() {
    $('#courseForm')[0].reset();
    $('#courseForm').removeData('id');
    $('#courseForm').data('mode', 'add');

    loadDepartmentsDropdown('department');
    $('#courseModalLabel').text('Add Course');
    $('#courseModal').modal('show');
}

function deleteCourse(courseId) {
    Swal.fire({
        title: 'Delete Course',
        text: "Are you sure you want to delete this course? This action cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

            $.ajax({
                url: `${baseUrl}masterfile.php?action=course_delete`,
                type: 'POST',
                data: { id: courseId },
                headers: {
                    'X-User-Type': userType || '6'
                },
                success: function(response) {
                    if (response.success) {
                        showSuccessMessage('Course deleted successfully');
                        coursesTable.ajax.reload();
                    } else {
                        Swal.fire('Error', response.message || 'Failed to delete course', 'error');
                    }
                },
                error: handleAjaxError
            });
        }
    });
}

function saveCourse() {
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);
    const formData = {
        courseName: $('#courseName').val(),
        departmentId: $('#department').val(),
        mode: $('#courseForm').data('mode') || 'add',
        id: $('#courseForm').data('id')
    };

    $.ajax({
        url: `${baseUrl}masterfile.php?action=submit_course`,
        type: 'POST',
        data: formData,
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success) {
                $('#courseModal').modal('hide');
                showSuccessMessage(response.message || 'Course saved successfully');
                coursesTable.ajax.reload();
            } else {
                Swal.fire('Error', response.message || 'Failed to save course', 'error');
            }
        },
        error: handleAjaxError
    });
}

function validateCourseForm() {
    const courseName = $('#courseName').val();
    if (!courseName || courseName.trim() === '') {
        Swal.fire('Error', 'Course name is required', 'error');
        return false;
    }

    const department = $('#department').val();
    if (!department) {
        Swal.fire('Error', 'Please select a department', 'error');
        return false;
    }

    return true;
}

function showSuccessMessage(message) {
    Swal.fire({
        title: 'Success',
        text: message,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
}

function handleAjaxError(xhr, status, error) {
    Swal.fire({
        title: 'Error',
        text: 'An error occurred while communicating with the server',
        icon: 'error'
    });
}

function loadDepartmentsDropdown(selectId, selectedId = null) {
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

    $.ajax({
        url: `${baseUrl}masterfile.php?action=departments`,
        type: 'GET',
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success && response.data) {
                const departments = response.data;
                const select = $(`#${selectId}`);
                select.empty();
                select.append('<option value="">Select Department</option>');
                departments.forEach(department => {
                    const selected = selectedId && selectedId == department.department_id ? 'selected' : '';
                    select.append(`<option value="${department.department_id}" ${selected}>${department.department_name}</option>`);
                });
            } else {
                $(`#${selectId}`).html('<option value="">Error loading departments</option>');
            }
        },
        error: function() {
            $(`#${selectId}`).html('<option value="">Error loading departments</option>');
        }
    });
}
