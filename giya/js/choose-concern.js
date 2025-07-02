document.addEventListener('DOMContentLoaded', () => {
    const baseURL = sessionStorage.getItem("baseURL");
    if (!baseURL) {
        window.location.href = 'index.html';
        return;
    }

    const auth = AuthHelper.checkAuth();
    if (!auth.isValid) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('userFirstName').textContent = auth.firstName;

    const inquiryStatusModal = new bootstrap.Modal(document.getElementById('inquiryStatusModal'));
    const submissionDetailModal = new bootstrap.Modal(document.getElementById('submissionDetailModal'));
    const privacyModal = new bootstrap.Modal(document.getElementById('privacyModal'));

    let currentSubmissionId = null;

    const showInquiryStatus = () => {
        clearNotification();

        document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeFilterBtn = document.querySelector('[data-filter="active"]');
        if (activeFilterBtn) {
            activeFilterBtn.classList.add('active');
        }

        inquiryStatusModal.show();
        loadUserSubmissions();
    };

    document.getElementById('inquiryStatusFloatBtn').addEventListener('click', showInquiryStatus);

    let allSubmissions = [];

    async function loadUserSubmissions() {
        try {
            const userId = sessionStorage.getItem('user_id');
            if (!userId) {
                toastr.error('User ID not found. Please login again.');
                return;
            }

            document.getElementById('inquiriesTableBody').innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';

            const response = await axios.get(
                `${baseURL}posts.php?action=get_user_posts&user_id=${userId}`
            );

            if (response.data && response.data.success) {
                allSubmissions = response.data.data || [];

                if (allSubmissions.length === 0) {
                    document.getElementById('inquiriesTableBody').innerHTML = '<tr><td colspan="5" class="text-center">No submissions found.</td></tr>';
                    return;
                }

                initializeFilterButtons();
                renderSubmissions(filterSubmissions());
            } else {
                document.getElementById('inquiriesTableBody').innerHTML = '<tr><td colspan="5" class="text-center">Error loading submissions: ' + (response.data.message || 'Unknown error') + '</td></tr>';
            }
        } catch (error) {
            document.getElementById('inquiriesTableBody').innerHTML = '<tr><td colspan="5" class="text-center">Failed to load submissions. Please try again.</td></tr>';
            toastr.error('Failed to load submissions. Please try again.');
        }
    }

    function initializeFilterButtons() {
        document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });

        const defaultFilter = document.querySelector('[data-filter="active"]');
        if (defaultFilter) {
            defaultFilter.classList.add('active');
        }

        document.querySelectorAll('.filter-buttons .btn').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                renderSubmissions(filterSubmissions());
            });
        });
    }

    function filterSubmissions() {
        const activeFilter = document.querySelector('.filter-buttons .btn.active');
        if (!activeFilter) return allSubmissions;

        const filterValue = activeFilter.dataset.filter;
        const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

        return allSubmissions.filter(submission => {
            const matchesSearch = !searchFilter ||
                (submission.post_title && submission.post_title.toLowerCase().includes(searchFilter)) ||
                (submission.type && submission.type.toLowerCase().includes(searchFilter));

            if (!matchesSearch) return false;

            const status = String(submission.post_status);

            if (filterValue === 'active') {
                return status === '0' || status === '1';
            }

            return status === filterValue;
        });
    }

    document.getElementById('searchFilter').addEventListener('input', () => {
        renderSubmissions(filterSubmissions());
    });

    function renderSubmissions(submissions) {
        const tableBody = document.getElementById('inquiriesTableBody');

        if (submissions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No matching submissions found.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';

        submissions.forEach(submission => {
            const row = document.createElement('tr');
            row.className = 'submission-row';
            row.dataset.id = submission.post_id;

            row.innerHTML = `
                <td>#${submission.post_id}</td>
                <td><span class="badge ${getStatusBadgeClass(submission.post_status)}">
                    ${getStatusText(submission.post_status)}</span></td>
                <td>${submission.type || ''}</td>
                <td>${submission.post_title || ''}</td>
                <td>${formatDate(submission.post_date)}</td>
            `;

            row.addEventListener('click', () => {
                loadSubmissionDetails(submission.post_id);
            });

            tableBody.appendChild(row);
        });
    }

    async function loadSubmissionDetails(submissionId) {
        try {
            if (window.NotificationHelper) {
                NotificationHelper.resetProcessedReplies();
            }

            const detailModal = document.getElementById('submissionDetailModal');
            if (detailModal.querySelector('.replies-container')) {
                detailModal.querySelector('.replies-container').innerHTML =
                    '<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary" role="status"></div></div>';
            }

            const timestamp = new Date().getTime();
            const response = await axios.get(
                `${baseURL}posts.php?action=get_post_details&post_id=${submissionId}&_t=${timestamp}`,
                {
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                }
            );

            if (response.data.success) {
                currentSubmissionId = submissionId;
                const post = response.data.post;

                if (bootstrap.Modal.getInstance(document.getElementById('inquiryStatusModal'))) {
                    bootstrap.Modal.getInstance(document.getElementById('inquiryStatusModal')).hide();
                }

                submissionDetailModal.show();

                document.getElementById('postUserName').textContent = post.user_fullname || '';
                document.getElementById('postUserId').textContent = `ID: ${post.user_schoolId || ''}`;

                const currentStatus = post.post_status;

                const statusBadge = document.getElementById('postStatus');
                statusBadge.className = `badge ${getStatusBadgeClass(currentStatus)}`;
                statusBadge.textContent = getStatusText(currentStatus);

                const repliesContainer = document.querySelector('.replies-container');
                if (repliesContainer) {
                    repliesContainer.innerHTML = '';

                    const originalPostElement = document.createElement('div');
                    originalPostElement.className = 'message-bubble admin-bg';
                    originalPostElement.innerHTML = `
                        <div class="message-content original-post">
                            <div class="mb-2">
                                <span class="badge bg-secondary">${post.postType_name || ''}</span>
                                ${post.inquiry_type ? `<span class="badge bg-info ms-1">${post.inquiry_type}</span>` : ''}
                            </div>
                            <h5>${post.post_title || ''}</h5>
                            <p>${post.post_message || ''}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${formatDateTime(post.post_date, post.post_time)}</small>
                                <span class="badge ${getStatusBadgeClass(post.post_status)}">${getStatusText(post.post_status)}</span>
                            </div>
                        </div>
                    `;
                    repliesContainer.appendChild(originalPostElement);

                    const addedReplyIds = new Set();

                    if (post.replies && post.replies.length > 0) {
                        let processedReplies = post.replies;
                        if (window.NotificationHelper) {
                            processedReplies = NotificationHelper.processReplies(post.replies);
                        }

                        processedReplies.forEach(reply => {
                            if (addedReplyIds.has(reply.reply_id)) {
                                return;
                            }

                            if (reply.user_type === 'admin' &&
                                reply.reply_message.includes('Post forwarded to') &&
                                sessionStorage.getItem('user_typeId') !== '6') {
                                return;
                            }

                            addedReplyIds.add(reply.reply_id);

                            const replyElement = document.createElement('div');
                            replyElement.className = `message-bubble ${reply.user_type === 'admin' ? 'admin-message' : 'user-message'}`;
                            replyElement.innerHTML = `
                                <div class="message-content">
                                    <strong>${reply.display_name || ''}</strong>
                                    <p>${reply.reply_message || ''}</p>
                                    <small>${new Date(reply.reply_date + " " + reply.reply_time).toLocaleString()}</small>
                                </div>
                            `;
                            repliesContainer.appendChild(replyElement);
                        });
                    }
                }

                updateReplyForm(currentStatus);
                scrollToBottom();

                const userId = sessionStorage.getItem('user_id');
                if (userId) {
                    try {
                        await axios.post(`${baseURL}posts.php?action=mark_replies_read`, {
                            user_id: userId
                        });

                        setTimeout(checkForNewReplies, 500);
                    } catch (markError) {
                    }
                }
            } else {
                toastr.error(response.data.message || 'Failed to load submission details');
            }
        } catch (error) {
            toastr.error('Failed to load submission details. Please try again.');
        }
    }

    function renderReplies(replies) {
        const repliesContainer = document.querySelector('.replies-container');

        repliesContainer.innerHTML = replies.length ?
            replies.map(reply => `
                <div class="message-bubble ${reply.user_type === 'admin' ? 'admin-message' : 'user-message'}">
                    <div class="message-content">
                        <strong>${reply.display_name || ''}</strong>
                        <p>${reply.reply_message || ''}</p>
                        <small>${new Date(reply.reply_date + " " + reply.reply_time).toLocaleString()}</small>
                    </div>
                </div>
            `).join('') :
            '<p class="text-muted text-center">No replies yet.</p>';
    }

    function updateReplyForm(status) {
        const replyFormContainer = document.getElementById('replyFormContainer');
        const userType = sessionStorage.getItem('user_typeId');
        const isStudentOrVisitor = userType === '1' || userType === '2';

        status = String(status);

        if (status === '2') {
            replyFormContainer.innerHTML = `
                <div class="alert alert-success mb-0 text-center">
                    <i class="fas fa-check-circle me-2"></i>
                    This post is resolved and the conversation is closed.
                </div>`;
        } else {
            const resolveButton = isStudentOrVisitor ? `
                <div class="d-flex justify-content-end mt-2">
                    <button class="btn btn-success btn-sm" id="resolveButton">
                        <i class="fas fa-check-circle"></i> Mark as Resolved
                    </button>
                </div>` : '';

            replyFormContainer.innerHTML = `
                <form id="replyForm" class="reply-form">
                    <div class="input-group">
                        <input type="text" class="form-control reply-input" placeholder="Write a reply...">
                        <button class="btn btn-primary" type="submit">
                            <i class="bi bi-send-fill"></i>
                        </button>
                    </div>
                </form>
                ${resolveButton}`;

            attachReplyFormListener();

            const resolveBtn = document.getElementById('resolveButton');
            if (resolveBtn) {
                resolveBtn.addEventListener('click', function() {
                    markAsResolved(currentSubmissionId);
                });
            }
        }
    }

    function scrollToBottom() {
        const repliesContainer = document.querySelector('.replies-container');
        if (repliesContainer) {
            setTimeout(() => {
                repliesContainer.scrollTop = repliesContainer.scrollHeight;
            }, 300);
        }
    }

    async function markAsResolved(submissionId) {
        try {
            const result = await Swal.fire({
                title: 'Mark as Resolved?',
                text: 'This will close the concern and no further replies can be added.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, mark as resolved'
            });

            if (result.isConfirmed) {
                const response = await axios.post(
                    `${baseURL}posts.php?action=update_post_status`,
                    {
                        post_id: submissionId,
                        status: '2'
                    }
                );

                if (response.data.success) {
                    const statusBadge = document.getElementById('postStatus');
                    statusBadge.className = 'badge bg-success';
                    statusBadge.textContent = 'Resolved';

                    updateReplyForm('2');

                    const submissionIndex = allSubmissions.findIndex(s => s.post_id == submissionId);
                    if (submissionIndex !== -1) {
                        allSubmissions[submissionIndex].post_status = '2';
                    }

                    toastr.success('Concern marked as resolved');
                    loadUserSubmissions();
                } else {
                    toastr.error(response.data.message || 'Failed to mark as resolved');
                }
            }
        } catch (error) {
            toastr.error('Failed to update status. Please try again.');
        }
    }

    window.markAsResolved = markAsResolved;

    function attachReplyFormListener() {
        const replyForm = document.getElementById('replyForm');
        if (replyForm) {
            replyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const replyInput = e.target.querySelector('.reply-input');
                if (!replyInput || !replyInput.value.trim()) return;

                try {
                    const submitBtn = e.target.querySelector('button[type="submit"]');
                    const originalBtnHtml = submitBtn.innerHTML;
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

                    const content = replyInput.value.trim();
                    replyInput.value = '';

                    const currentUserName = `${sessionStorage.getItem('user_firstname') || ''} ${sessionStorage.getItem('user_lastname') || ''}`;
                    addReplyToUI(content, currentUserName, 'user-message', new Date());

                    scrollToBottom();

                    const userId = sessionStorage.getItem('user_id');
                    if (!userId) {
                        toastr.error('Session expired. Please login again.');
                        return;
                    }

                    const payload = {
                        post_id: currentSubmissionId,
                        user_id: userId,
                        content: content
                    };

                    const response = await axios.post(
                        `${baseURL}posts.php?action=add_reply`,
                        payload,
                        {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (response.data.status === 'success') {
                        toastr.success('Reply sent successfully');
                    } else {
                        toastr.error(response.data.message || 'Failed to send reply');
                    }

                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;

                } catch (error) {
                    toastr.error('Failed to send reply. Please try again.');

                    const submitBtn = e.target.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="bi bi-send-fill"></i>';
                    }
                }
            });
        }
    }

    function addReplyToUI(message, authorName, cssClass, timestamp) {
        const repliesContainer = document.querySelector('.replies-container');

        const newReply = document.createElement('div');
        newReply.className = `message-bubble ${cssClass}`;
        newReply.innerHTML = `
            <div class="message-content">
                <strong>${authorName}</strong>
                <p>${message}</p>
                <small>${timestamp.toLocaleString()}</small>
            </div>
        `;

        repliesContainer.appendChild(newReply);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString();
    }

    function formatDateTime(date, time) {
        if (!date || !time) return '';
        return new Date(date + ' ' + time).toLocaleString();
    }

    function getStatusBadgeClass(status) {
        const statusMap = {
            '0': 'bg-danger',
            '1': 'bg-warning',
            '2': 'bg-success'
        };
        return statusMap[status] || 'bg-secondary';
    }

    function getStatusText(status) {
        const statusMap = {
            '0': 'Pending',
            '1': 'Ongoing',
            '2': 'Resolved'
        };
        return statusMap[status] || 'Unknown';
    }

    document.querySelectorAll('.dropdown-toggle').forEach(dropdown => {
        new bootstrap.Dropdown(dropdown);
    });

    const privacyModalElement = document.getElementById('privacyModal');
    const privacyContent = document.getElementById('privacyContent');
    const acceptBtn = document.getElementById('acceptPrivacyBtn');

    privacyContent.addEventListener('scroll', () => {
        const isAtBottom = Math.abs(
            privacyContent.scrollHeight - privacyContent.scrollTop - privacyContent.clientHeight
        ) < 2;
        if (isAtBottom) {
            acceptBtn.removeAttribute('disabled');
            acceptBtn.classList.add('btn-pulse');
        }
    });

    privacyModalElement.addEventListener('show.bs.modal', () => {
        acceptBtn.setAttribute('disabled', 'disabled');
        acceptBtn.classList.remove('btn-pulse');
        privacyContent.scrollTop = 0;
    });

    document.getElementById('acceptPrivacyBtn').addEventListener('click', async () => {
        try {
            const userId = sessionStorage.getItem('user_id');
            const pendingUrl = sessionStorage.getItem('pendingRedirect');

            if (!userId) {
                toastr.error('User ID not found. Please login again.');
                return;
            }

            const response = await axios.post(
                `${baseURL}inquiry.php?action=update_privacy_policy`,
                {
                    user_id: userId,
                    privacy_policy_check: 1
                }
            );

            if (response.data.success) {
                sessionStorage.setItem('privacyPolicyAccepted', 'true');

                Swal.fire({
                    icon: 'success',
                    title: 'Privacy Policy Accepted',
                    text: 'Redirecting...',
                    timer: 1500,
                    showConfirmButton: false
                });

                if (pendingUrl) {
                    sessionStorage.removeItem('pendingRedirect');
                    setTimeout(() => {
                        window.location.href = pendingUrl;
                    }, 1500);
                } else {
                    setTimeout(() => {
                        bootstrap.Modal.getInstance(document.getElementById('privacyModal')).hide();
                    }, 1500);
                }
            } else {
                toastr.error('Failed to update privacy policy status. Please try again.');
            }
        } catch (error) {
            toastr.error('An error occurred. Please try again.');
        }
    });

    document.querySelectorAll('.concern-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            sessionStorage.setItem('selectedPostType', type);
            window.location.href = 'form.html';
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', function() {
        Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#155f37',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, logout'
        }).then((result) => {
            if (result.isConfirmed) {
                toastr.success('Logging out...');
                sessionStorage.clear();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        });
    });

    checkForNewReplies();
    setInterval(checkForNewReplies, 120000);

    async function checkForNewReplies() {
        const userId = sessionStorage.getItem('user_id');
        if (!userId) return;

        if (window.NotificationHelper) {
            try {
                const result = await NotificationHelper.checkNotifications(userId, baseURL);
                if (result && typeof result.unreadCount === 'number') {
                    updateNotificationBadge(result.unreadCount);
                }
            } catch (error) {
                checkNotificationsDirectly(userId);
            }
            return;
        }

        await checkNotificationsDirectly(userId);
    }

    async function checkNotificationsDirectly(userId) {
        try {
            const timestamp = new Date().getTime();

            try {
                const notifResponse = await axios.get(
                    `${baseURL}posts.php?action=check_new_replies&user_id=${userId}&_t=${timestamp}`,
                    {
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    }
                );

                if (notifResponse.data.success && typeof notifResponse.data.unreadCount === 'number') {
                    const unreadCount = notifResponse.data.unreadCount;

                    updateNotificationBadge(unreadCount);
                    sessionStorage.setItem('unreadNotifications', unreadCount);
                    return;
                }
            } catch (directError) {
            }

            const postsResponse = await axios.get(
                `${baseURL}posts.php?action=get_user_posts&user_id=${userId}&_t=${timestamp}`
            );

            if (!postsResponse.data.success || !postsResponse.data.data) {
                return;
            }

            const ongoingPosts = postsResponse.data.data.filter(post => post.post_status === '1');
            const unreadCount = ongoingPosts.length;

            updateNotificationBadge(unreadCount);
            sessionStorage.setItem('unreadNotifications', unreadCount);

            if (unreadCount > 0) {
                toastr.info(
                    `You have ${unreadCount} ${unreadCount === 1 ? 'conversation' : 'conversations'} with new replies.`,
                    'New Replies',
                    {timeOut: 5000}
                );
            }
        } catch (error) {
        }
    }

    function updateNotificationBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (!badge) {
            return;
        }

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;

            badge.classList.remove('d-none');
            badge.style.display = 'inline-block';
            badge.style.visibility = 'visible';
            badge.style.opacity = '1';
            badge.style.position = 'absolute';

            badge.style.top = '-5px';
            badge.style.right = '-5px';
            badge.style.fontSize = '12px';
            badge.style.padding = '4px 6px';
            badge.style.borderRadius = '50%';
            badge.style.backgroundColor = '#ff4d4d';
            badge.style.color = 'white';

            badge.classList.add('badge-pulse');
            void badge.offsetWidth;

            setTimeout(() => {
                badge.classList.remove('badge-pulse');
            }, 1000);
        } else {
            badge.classList.add('d-none');
            badge.style.display = 'none';
        }
    }

    async function clearNotification() {
        const userId = sessionStorage.getItem('user_id');
        if (!userId) return;

        try {
            const response = await axios.post(
                `${baseURL}posts.php?action=mark_replies_read`,
                { user_id: userId },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success === true) {
                const badge = document.getElementById('notificationBadge');
                if (badge) {
                    badge.classList.add('d-none');
                    badge.style.display = 'none';
                    badge.textContent = '0';
                }

                sessionStorage.setItem('unreadNotifications', '0');
            }
        } catch (error) {
        }
    }

    setTimeout(checkForNewReplies, 1000);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkForNewReplies();
        }
    });

    window.addEventListener('focus', () => {
        checkForNewReplies();
    });

    checkForNewReplies();
    setInterval(checkForNewReplies, 30000);

    window.addEventListener('load', function() {
        const unreadCount = parseInt(sessionStorage.getItem('unreadNotifications') || '0');
        if (unreadCount > 0) {
            updateNotificationBadge(unreadCount);
        }

        setTimeout(checkForNewReplies, 1000);
    });
});
