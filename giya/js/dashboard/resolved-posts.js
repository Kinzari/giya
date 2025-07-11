document.addEventListener('DOMContentLoaded', function() {
    // Use centralized base URL management
    const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);

    if (!baseURL) {
        // Don't set a new baseURL, just warn the user
        toastr.warning('API URL not found. You may need to login again.');
    }

    // Initialize notifications for this page
    if (typeof NotificationManager !== 'undefined') {
        window.notificationManager = new NotificationManager();
        window.notificationManager.init();
    }

    // Real-time notifications are handled automatically by real-time-notifications.js

    const path = window.location.pathname.toLowerCase();
    const userData = GiyaSession.getUserData();
    let departmentId = null;
    let userTypeId = null;

    if (userData && userData.user_id) {
        departmentId = userData.user_departmentId;
        userTypeId = userData.user_typeId;
    }

    function getEndpoint() {
        // Always use the general resolved posts endpoint since we unified the page
        return "get_resolved_posts";
    }

    function getUserTypeLabel(typeId) {
        if (typeId === null || typeId === undefined) {
            return 'Unknown';
        }

        const parsedTypeId = parseInt(typeId, 10) || 0;

        switch(parsedTypeId) {
            case 1: return 'Visitor';
            case 2: return 'Student';
            case 3: return 'Faculty';
            case 4: return 'Employee';
            case 5: return 'POC';
            case 6: return 'Administrator';
            default: return `Unknown (${typeId})`;
        }
    }

    if (document.getElementById("resolvedPostsTable")) {
        const endpoint = getEndpoint();

        const resolvedTable = $('#resolvedPostsTable').DataTable({
            order: [[7, 'desc'], [8, 'desc']], // Order by Date then Time Since Last Activity
            ajax: {
                url: `${baseURL}posts.php?action=${endpoint}`,
                type: 'GET',
                dataSrc: function(json) {
                    if (!json || !json.data) {
                        return [];
                    }

                    document.querySelectorAll('.filter-control').forEach(filter => {
                        const value = filter.value;
                        if (value) {
                            const columnIndex = parseInt(filter.getAttribute('data-column'));
                            json.data = json.data.filter(item => item[columnIndex] === value);
                        }
                    });

                    if (userTypeId == 5 && departmentId) {
                        return json.data.filter(item =>
                            item.post_departmentId == departmentId ||
                            item.department_id == departmentId
                        );
                    }

                    json.data.forEach(record => {
                        if (!record.user_typeId && record.user_schoolId) {
                            const schoolId = record.user_schoolId.toLowerCase();
                            if (schoolId.startsWith('02-')) {
                                record.user_typeId = 2; // Student
                            } else if (schoolId.startsWith('01-')) {
                                record.user_typeId = 3; // Faculty
                            } else if (schoolId.startsWith('VS-')) {
                                record.user_typeId = 1; // Visitor
                            } else if (schoolId.startsWith('25-')) {
                                record.user_typeId = 4; // Employee (default for 25- prefix)
                            }
                        }
                    });

                    return json.data;
                },
                error: function(xhr, error, thrown) {
                    toastr.error('Error loading resolved posts data. Please try refreshing the page.');
                }
            },
            columns: [
                {
                    title: "Status",
                    data: "post_status",
                    render: renderStatusBadge,
                    width: "100px"
                },
                {
                    title: "Classification",
                    data: null,
                    render: function(data, type, row) {
                        let typeId = null;
                        if (row.user_typeId !== undefined && row.user_typeId !== null) {
                            typeId = row.user_typeId;
                        } else if (row.user_type_id !== undefined && row.user_type_id !== null) {
                            typeId = row.user_type_id;
                        } else if (row.user && row.user.user_typeId !== undefined) {
                            typeId = row.user.user_typeId;
                        }

                        if (typeId !== null) {
                            return getUserTypeLabel(typeId);
                        }

                        if (row.user_schoolId) {
                            const schoolId = row.user_schoolId.toLowerCase();
                            if (schoolId.startsWith('02-')) {
                                return 'Student';
                            } else if (schoolId.startsWith('01-')) {
                                return 'Faculty/Employee';
                            } else if (schoolId.startsWith('vs-')) {
                                return 'Visitor';
                            } else if (schoolId.startsWith('25-')) {
                                return 'POC/Administrator';
                            }
                        }

                        if (endpoint.includes('visitor')) {
                            return 'Visitor';
                        } else if (endpoint.includes('student')) {
                            return 'Student';
                        } else if (endpoint.includes('employee')) {
                            return 'Faculty/Employee';
                        }

                        return 'Unknown';
                    },
                    width: "120px"
                },
                {
                    title: "Full Name",
                    data: "user_fullname",
                    width: "150px"
                },
                {
                    title: "Type",
                    data: "postType_name",
                    width: "120px"
                },
                {
                    title: "Message",
                    data: null,
                    render: function(data, type, row) {
                        let content = row.post_message || row.post_title || '';

                        if (content && content.length > 20) {
                            return content.substring(0, 20) + ' . . .';
                        }
                        return content;
                    }
                },
                {
                    title: "Department",
                    data: "department_name",
                    render: function(data) {
                        return data || 'Not Assigned';
                    },
                    width: "130px"
                },
                {
                    title: "Campus",
                    data: "campus_name",
                    render: function(data) {
                        return data || 'Carmen';
                    },
                    width: "100px"
                },
                {
                    title: "Date",
                    data: "latest_activity_date",
                    width: "100px"
                },
                {
                    title: "Time Since Last Activity",
                    data: null,
                    width: "150px",
                    render: function(data, type, row) {
                        if (typeof getTimeSinceLastActivity === 'function') {
                            if (row.latest_activity_date && row.latest_activity_time) {
                                return getTimeSinceLastActivity(row.latest_activity_date, row.latest_activity_time);
                            } else if (row.last_activity_datetime && typeof getTimeSinceDateTime === 'function') {
                                return getTimeSinceDateTime(row.last_activity_datetime);
                            } else if (row.post_date && row.post_time) {
                                return getTimeSinceLastActivity(row.post_date, row.post_time);
                            }
                        }
                        // Fallback to showing just the time if utility function is not available
                        if (row.latest_activity_time) {
                            const dt = new Date((row.latest_activity_date || row.post_date) + " " + row.latest_activity_time);
                            const options = { hour: 'numeric', minute: '2-digit', hour12: true };
                            return dt.toLocaleTimeString('en-US', options);
                        } else if (row.post_time) {
                            const dt = new Date(row.post_date + " " + row.post_time);
                            const options = { hour: 'numeric', minute: '2-digit', hour12: true };
                            return dt.toLocaleTimeString('en-US', options);
                        }
                        return 'Unknown';
                    }
                }
            ],
            dom: '<"row mb-4"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row mt-4"<"col-sm-12 col-md-4"i><"col-sm-12 col-md-8 d-flex justify-content-end"p>>',
            pageLength: 10,
            processing: true,
            language: {
                emptyTable: "No resolved posts available",
                zeroRecords: "No resolved posts found",
                searchPlaceholder: "Search records...",
                search: "",
                lengthMenu: "_MENU_ per page"
            },
            drawCallback: function() {
                $('.dataTables_paginate > .pagination').addClass('pagination-md border-0');
                $('.dataTables_paginate').addClass('mt-3');
                $('.page-item .page-link').css({
                    'border': 'none',
                    'padding': '0.5rem 1rem',
                    'margin': '0 0.2rem'
                });

                applyTableHeaderStyling();
            }
        });

        $('#resolvedPostsTable tbody').on('click', 'tr', function() {
            const data = resolvedTable.row(this).data();
            if (data && data.post_id) {
                showResolvedPostDetails(data.post_id);
            }
        });
    }

    let currentPostId = null;

    window.showResolvedPostDetails = async function(postId) {
        try {
            currentPostId = postId;
            // Use centralized base URL management
            const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);

            if (!baseURL) {
                toastr.error('Base URL not found. Please re-login.');
                return;
            }

            const loadingToast = toastr.info('Loading post details...', '', {timeOut: 0});

            const response = await axios.get(`${baseURL}posts.php?action=get_post_details&post_id=${postId}`);

            toastr.clear(loadingToast);

            if (response.data.success && response.data.post) {
                const post = response.data.post;
                const modal = new bootstrap.Modal(document.getElementById('postDetailsModal'));
                modal.show();

                setTimeout(updateModalButtons, 300);

                const userNameElement = document.getElementById('postUserName');
                if (userNameElement) {
                    userNameElement.textContent = post.user_fullname;
                }

                const userIdElement = document.getElementById('postUserId');
                if (userIdElement) {
                    userIdElement.textContent = post.user_schoolId || '';
                }

                const statusBadgeElement = document.getElementById('postStatusBadge');
                if (statusBadgeElement) {
                    statusBadgeElement.innerHTML = renderStatusBadge(post.post_status);
                }

                const repliesContainer = document.querySelector('.replies-container');
                if (repliesContainer) {
                    repliesContainer.innerHTML = '';

                    // Display original post
                    const originalPostElement = document.createElement('div');
                    originalPostElement.className = 'message-bubble border-start border-4 border-primary bg-light rounded p-3 w-100';
                    originalPostElement.innerHTML = `
                        <div class="message-content">
                            <div class="mb-2">
                                <span class="badge bg-secondary">${post.postType_name}</span>
                                ${post.inquiry_type ? `<span class="badge bg-info ms-1">${post.inquiry_type}</span>` : ''}
                            </div>
                            <h5 class="text-primary">${post.post_title || ''}</h5>
                            <p>${post.post_message || ''}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${new Date(post.post_date + " " + post.post_time).toLocaleString()}</small>
                                ${renderStatusBadge(post.post_status)}
                            </div>
                        </div>
                    `;
                    repliesContainer.appendChild(originalPostElement);

                    // Display replies
                    if (post.replies && post.replies.length > 0) {
                        post.replies.forEach(reply => {
                            const replyElement = document.createElement('div');
                            replyElement.className = `message-bubble ${reply.user_type === 'admin' ? 'admin-message' : 'user-message'}`;
                            replyElement.innerHTML = `
                                <div class="message-content">
                                    <strong>${reply.display_name}</strong>
                                    <p>${reply.reply_message}</p>
                                    <small>${new Date(reply.reply_date + " " + reply.reply_time).toLocaleString()}</small>
                                </div>
                            `;
                            repliesContainer.appendChild(replyElement);
                        });
                    }
                }

                // Always show the resolved message for the reply form
                const formContainer = document.querySelector('.reply-form-container');
                if (formContainer) {
                    formContainer.innerHTML = `
                        <div class="alert alert-success mb-0 text-center">
                            <i class="bi bi-check-circle me-2"></i>
                            This post is resolved and the conversation is closed.
                        </div>`;
                }

                // Scroll the replies container to the bottom
                setTimeout(scrollToBottom, 300);
            } else {
                toastr.error(response.data.message || 'Failed to load post details');
            }
        } catch (error) {
            toastr.error('Failed to load post details');
        }
    };

    function updateModalButtons() {
    }

    function renderStatusBadge(data) {
        let statusText = "";
        let badgeClass = "";

        switch (Number(data)) {
            case 0:
                statusText = "Pending";
                badgeClass = "btn-solid-danger";
                break;
            case 1:
                statusText = "Ongoing";
                badgeClass = "btn-solid-warning";
                break;
            case 2:
            case 3:
                statusText = "Resolved";
                badgeClass = "btn-solid-primary";
                break;
            default:
                statusText = "Unknown";
                badgeClass = "btn-secondary";
        }

        return `<span class="badge ${badgeClass}">${statusText}</span>`;
    }

    function scrollToBottom() {
        const repliesContainer = document.querySelector('.replies-container');
        if (repliesContainer) {
            repliesContainer.scrollTop = repliesContainer.scrollHeight;
        }
    }

    function applyTableHeaderStyling() {
        document.querySelectorAll('th').forEach(el => {
            el.style.backgroundColor = '#155f37';
            el.style.color = 'white';
        });
    }

    setTimeout(applyTableHeaderStyling, 500);

    $(document).on('draw.dt', function() {
        setTimeout(applyTableHeaderStyling, 100);
    });
});
