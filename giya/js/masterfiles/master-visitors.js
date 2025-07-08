let visitorsTable;
let currentVisitorData = null;

$(document).ready(function() {
    initVisitorsTable();
    loadCampusDropdown('campusFilter');
    setupEventHandlers();
    setupFilterHandlers();
    checkModals();
});

function initVisitorsTable() {
    try {
        if ($.fn.DataTable.isDataTable('#visitorsTable')) {
            $('#visitorsTable').DataTable().destroy();
        }

        const columns = [
            { data: 'user_schoolId' },
            {
                data: null,
                render: function(data) {
                    return MasterTable.renderFullName(
                        data.user_firstname,
                        data.user_lastname,
                        data.user_middlename,
                        data.user_suffix
                    );
                }
            },
            { data: 'campus_name' },
            {
                data: 'user_status',
                render: function(data, type, row) {
                    return MasterTable.renderStatusButton(data, row.user_id, 'data-active');
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    return MasterTable.renderActionButtons(data.user_id, {
                        view: true,
                        edit: true,
                        reset: true,
                        delete: true,
                        viewClass: 'view-visitor',
                        editClass: 'edit-visitor',
                        resetClass: 'reset-visitor-pw',
                        deleteClass: 'delete-visitor'
                    });
                }
            }
        ];

        const options = {
            ajax: MasterTable.createAjaxConfig('masterfile.php?action=visitors'),
            language: {
                emptyTable: "No visitors available",
                zeroRecords: "No matching visitors found",
                searchPlaceholder: "Search visitors..."
            }
        };

        visitorsTable = MasterTable.initTable('#visitorsTable', columns, options);

        $('#visitorsTable tbody').on('click', 'tr', function(e) {
            if (!$(e.target).closest('button').length) {
                const data = visitorsTable.row(this).data();
                if (data) {
                    showVisitorDetails(data.user_id);
                }
            }
        });

        setupActionButtonEvents();
    } catch (error) {
        console.error('Error initializing visitors table:', error);
    }
}

function setupActionButtonEvents() {
    $('#visitorsTable').on('click', '.view-visitor', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).data('id');
        showVisitorDetails(id);
    });

    $('#visitorsTable').on('click', '.edit-visitor', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).data('id');
        editVisitor(id);
    });

    $('#visitorsTable').on('click', '.delete-visitor', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).data('id');
        deleteVisitor(id);
    });

    $('#visitorsTable').on('click', '.reset-visitor-pw', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).data('id');
        $('#resetPasswordVisitorId').val(id);
        $('#resetPasswordModal').modal('show');
    });

    $('#visitorsTable').on('click', '.status-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).data('id');
        const isCurrentlyActive = $(this).data('active') == 1;
        const newStatus = isCurrentlyActive ? 0 : 1;
        const statusText = isCurrentlyActive ? 'deactivate' : 'activate';

        Swal.fire({
            title: `${isCurrentlyActive ? 'Deactivate' : 'Activate'} Visitor?`,
            text: `Are you sure you want to ${statusText} this visitor account?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: isCurrentlyActive ? '#dc3545' : '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: `Yes, ${statusText} it!`
        }).then((result) => {
            if (result.isConfirmed) {
                toggleVisitorStatus(id, newStatus);
            }
        });
    });
}

function setupEventHandlers() {
    $('#visitorForm').on('submit', function(e) {
        e.preventDefault();
        if (validateVisitorForm()) {
            saveVisitor();
        }
    });

    $('#confirmResetPassword').on('click', function() {
        const visitorId = $('#resetPasswordVisitorId').val();
        resetVisitorPassword(visitorId);
    });

    $(document).on('click', '#detailsEdit', function() {
        $('#visitorDetailsModal').modal('hide');
        if (currentVisitorData) {
            editVisitor(currentVisitorData.user_id);
        }
    });

    $(document).on('click', '#detailsDelete', function() {
        $('#visitorDetailsModal').modal('hide');
        if (currentVisitorData) {
            deleteVisitor(currentVisitorData.user_id);
        }
    });

    $(document).on('click', '#detailsResetPassword', function() {
        $('#visitorDetailsModal').modal('hide');
        if (currentVisitorData) {
            $('#resetPasswordVisitorId').val(currentVisitorData.user_id);
            $('#resetPasswordModal').modal('show');
        }
    });
}

function showVisitorDetails(visitorId) {
    const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

    $.ajax({
        url: `${baseURL}masterfile.php?action=get_visitor`,
        type: 'GET',
        data: { id: visitorId },
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success && response.data) {
                const visitor = response.data;
                currentVisitorData = visitor;

                $('#detailsVisitorId').text(visitor.user_schoolId || 'N/A');

                let fullName = `${visitor.user_firstname} `;
                if (visitor.user_middlename) {
                    fullName += `${visitor.user_middlename} `;
                }
                fullName += visitor.user_lastname;
                if (visitor.user_suffix) {
                    fullName += `, ${visitor.user_suffix}`;
                }
                $('#detailsFullName').text(fullName);

                $('#detailsEmail').text(visitor.user_email || 'Not provided');
                $('#detailsContact').text(visitor.user_contact || 'Not provided');
                $('#detailsCampus').text(visitor.campus_name || 'Not assigned');

                if (visitor.user_status == 1) {
                    $('#detailsStatusBadge')
                        .removeClass('bg-danger')
                        .addClass('bg-success')
                        .html(`Active <button class="btn btn-sm btn-outline-light ms-2 toggle-status-btn" data-id="${visitor.user_id}" data-status="0">Deactivate</button>`);
                } else {
                    $('#detailsStatusBadge')
                        .removeClass('bg-success')
                        .addClass('bg-danger')
                        .html(`Inactive <button class="btn btn-sm btn-outline-light ms-2 toggle-status-btn" data-id="${visitor.user_id}" data-status="1">Activate</button>`);
                }

                $('.toggle-status-btn').on('click', function(e) {
                    e.preventDefault();
                    const id = $(this).data('id');
                    const newStatus = $(this).data('status');
                    const action = newStatus == 1 ? 'activate' : 'deactivate';

                    Swal.fire({
                        title: `${newStatus == 1 ? 'Activate' : 'Deactivate'} Visitor?`,
                        text: `Are you sure you want to ${action} this visitor account?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: newStatus == 1 ? '#28a745' : '#dc3545',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: `Yes, ${action} it!`
                    }).then((result) => {
                        if (result.isConfirmed) {
                            toggleVisitorStatus(id, newStatus);
                            $('#visitorDetailsModal').modal('hide');
                        }
                    });
                });

                $('#visitorDetailsModal').modal('show');
            } else {
                Swal.fire('Error', response.message || 'Failed to load visitor details', 'error');
            }
        },
        error: handleAjaxError
    });
}

function editVisitor(visitorId) {
    const baseURL = getBaseURL();
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

    $.ajax({
        url: `${baseURL}masterfile.php?action=get_visitor`,
        type: 'GET',
        data: { id: visitorId },
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success && response.data) {
                const visitor = response.data;

                // Set form mode and visitor ID
                $('#visitorForm').data('mode', 'edit');
                $('#visitorForm').data('id', visitor.user_id);

                // Populate the form
                $('#firstName').val(visitor.user_firstname);
                $('#lastName').val(visitor.user_lastname);
                $('#middleName').val(visitor.user_middlename || '');
                $('#suffix').val(visitor.user_suffix || '');
                $('#email').val(visitor.user_email || '');
                $('#contact').val(visitor.user_contact || '');
                $('#isActive').prop('checked', visitor.user_status == 1);

                // Clear password field - it's optional for editing
                $('#password').val('');

                // Load campus dropdown and select the visitor's campus
                loadCampusDropdown('campus', visitor.user_campusId);

                // Update modal title
                $('#visitorModalLabel').text('Edit Visitor');

                // Show the modal
                $('#visitorModal').modal('show');
            } else {
                Swal.fire('Error', response.message || 'Failed to load visitor data', 'error');
            }
        },
        error: handleAjaxError
    });
}

function saveVisitor() {
    const baseURL = getBaseURL();
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);
    const formData = {
        mode: $('#visitorForm').data('mode') || 'add',
        id: $('#visitorForm').data('id'),
        firstName: $('#firstName').val(),
        lastName: $('#lastName').val(),
        middleName: $('#middleName').val(),
        suffix: $('#suffix').val(),
        email: $('#email').val(),
        contact: $('#contact').val(),
        campusId: $('#campus').val(),
        password: $('#password').val(),
        isActive: $('#isActive').is(':checked') ? 1 : 0
    };

    $.ajax({
        url: `${baseURL}masterfile.php?action=save_visitor`,
        type: 'POST',
        data: formData,
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success) {
                $('#visitorModal').modal('hide');

                Swal.fire({
                    title: 'Success',
                    text: formData.mode === 'add' ? 'Visitor added successfully' : 'Visitor updated successfully',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                visitorsTable.ajax.reload();
            } else {
                Swal.fire('Error', response.message || 'Failed to save visitor', 'error');
            }
        },
        error: handleAjaxError
    });
}

function deleteVisitor(visitorId) {
    Swal.fire({
        title: 'Delete Visitor',
        text: "Are you sure you want to delete this visitor? This action cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it'
    }).then((result) => {
        if (result.isConfirmed) {
            const baseURL = getBaseURL();
            const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

            $.ajax({
                url: `${baseURL}masterfile.php?action=visitor_delete`,
                type: 'POST',
                data: { id: visitorId },
                headers: {
                    'X-User-Type': userType || '6'
                },
                success: function(response) {
                    console.log("Delete response:", response); // Add debugging

                    if (response.success) {
                        Swal.fire({
                            title: 'Success',
                            text: 'Visitor deleted successfully',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        visitorsTable.ajax.reload();
                    } else {
                        Swal.fire('Error', response.message || 'Failed to delete visitor', 'error');
                    }
                },
                error: function(xhr, status, error) {
                    console.error("Delete error:", xhr.responseText);
                    handleAjaxError(xhr, status, error);
                }
            });
        }
    });
}

function toggleVisitorStatus(visitorId, isActive) {
    const baseURL = getBaseURL();
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

    $.ajax({
        url: `${baseURL}masterfile.php?action=toggle_visitor_status`,
        type: 'POST',
        data: { id: visitorId, status: isActive },
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success) {
                Swal.fire({
                    title: 'Success',
                    text: isActive ? 'Visitor activated successfully' : 'Visitor deactivated successfully',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                visitorsTable.ajax.reload();
            } else {
                Swal.fire('Error', response.message || 'Failed to update status', 'error');
            }
        },
        error: handleAjaxError
    });
}

function resetVisitorPassword(visitorId) {
    const baseURL = getBaseURL();
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);

    $.ajax({
        url: `${baseURL}giya.php?action=reset_password`,
        type: 'POST',
        data: { user_id: visitorId },
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            $('#resetPasswordModal').modal('hide');

            if (response.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Password has been reset to default (phinma-coc)',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', response.message || 'Failed to reset password', 'error');
            }
        },
        error: function(xhr, status, error) {
            $('#resetPasswordModal').modal('hide');
            handleAjaxError(xhr, status, error);
        }
    });
}

function validateVisitorForm() {
    const firstName = $('#firstName').val().trim();
    if (!firstName) {
        Swal.fire('Error', 'First Name is required', 'error');
        return false;
    }

    const lastName = $('#lastName').val().trim();
    if (!lastName) {
        Swal.fire('Error', 'Last Name is required', 'error');
        return false;
    }

    const email = $('#email').val().trim();
    if (!email) {
        Swal.fire('Error', 'Email is required', 'error');
        return false;
    }

    if (!validateEmail(email)) {
        Swal.fire('Error', 'Please enter a valid email address', 'error');
        return false;
    }

    const contact = $('#contact').val().trim();
    if (!contact) {
        Swal.fire('Error', 'Contact number is required', 'error');
        return false;
    }

    if (!validatePhoneNumber(contact)) {
        Swal.fire('Error', 'Please enter a valid Philippine mobile number (e.g., 09xxxxxxxxx)', 'error');
        return false;
    }

    const campus = $('#campus').val();
    if (!campus) {
        Swal.fire('Error', 'Please select a campus', 'error');
        return false;
    }

    return true;
}

function loadCampusDropdown(selectId, selectedId = null) {
    const userType = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);
    const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);

    $.ajax({
        url: `${baseURL}giya.php?action=get_campuses`,
        type: 'GET',
        headers: {
            'X-User-Type': userType || '6'
        },
        success: function(response) {
            if (response.success && response.campuses) {
                let options = '<option value="">All Campuses</option>';
                response.campuses.forEach(campus => {
                    const isSelected = selectedId && campus.campus_id == selectedId ? 'selected' : '';
                    options += `<option value="${campus.campus_id}" ${isSelected}>${campus.campus_name}</option>`;
                });
                $(`#${selectId}`).html(options);
            }
        },
        error: function() {
            $(`#${selectId}`).html('<option value="">Error loading campuses</option>');
        }
    });
}

function setupFilterHandlers() {
    // Campus filter change
    $('#campusFilter').on('change', function() {
        const campusText = $(this).find('option:selected').text();
        if (campusText && campusText !== 'All Campuses') {
            visitorsTable.column(4).search(campusText).draw();
        } else {
            visitorsTable.column(4).search('').draw();
        }
    });

    // Status filter change
    $('#statusFilter').on('change', function() {
        const status = $(this).val();
        if (status !== '') {
            const statusText = status === '1' ? 'Active' : 'Inactive';
            visitorsTable.column(5).search(statusText).draw();
        } else {
            visitorsTable.column(5).search('').draw();
        }
    });

    // Email filter change
    $('#emailFilter').on('change', function() {
        const emailType = $(this).val();
        if (emailType && emailType !== '') {
            let searchTerm = '';
            switch(emailType) {
                case 'gmail':
                    searchTerm = '@gmail.';
                    break;
                case 'yahoo':
                    searchTerm = '@yahoo.';
                    break;
                case 'outlook':
                    searchTerm = '@outlook.|@hotmail.';
                    break;
                case 'other':
                    // This would need more complex logic
                    searchTerm = '';
                    break;
            }
            if (searchTerm) {
                visitorsTable.column(2).search(searchTerm, true, false).draw();
            }
        } else {
            visitorsTable.column(2).search('').draw();
        }
    });
}

function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
}

function validatePhoneNumber(phone) {
    const re = /^(09|\+639)\d{9}$/;
    return re.test(String(phone));
}

function checkModals() {
    // Modals are already defined in the HTML
}

function handleAjaxError(xhr, status, error) {
    console.error('Ajax Error:', status, error);
    Swal.fire({
        title: 'Error',
        text: 'An error occurred while communicating with the server',
        icon: 'error'
    });
}
