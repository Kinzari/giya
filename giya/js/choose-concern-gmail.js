document.addEventListener('DOMContentLoaded', () => {
    // Get baseURL, fallback to default if not set
    let baseURL = sessionStorage.getItem("baseURL");
    if (!baseURL) {
        baseURL = 'http://localhost/api';
        sessionStorage.setItem("baseURL", baseURL);
    }

    // Normalize baseURL to prevent double slashes
    baseURL = baseURL.replace(/\/+$/, '');

    // Also clean up sessionStorage if it has bad data
    if (baseURL !== sessionStorage.getItem("baseURL")) {
        sessionStorage.setItem("baseURL", baseURL);
    }

    // Utility function to properly construct URLs
    function buildURL(endpoint) {
        const cleanBase = baseURL.replace(/\/+$/, '');
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        const result = `${cleanBase}/${cleanEndpoint}`;
        return result;
    }

    // Load inquiry types for the dropdown
    async function loadInquiryTypes() {
        try {
            const inquirySelect = document.getElementById('postDepartment');
            if (!inquirySelect) {
                return;
            }

            // Clear existing options except the loading message
            inquirySelect.innerHTML = '<option value="">Loading inquiry types...</option>';

            const response = await axios.get(buildURL('inquiry.php?action=get_inquiry_types'));
            // Inquiry types response loaded

            if (response.data && response.data.success && response.data.types) {
                // Clear the loading message
                inquirySelect.innerHTML = '<option value="">Select inquiry type...</option>';

                // Add inquiry types from database
                response.data.types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.inquiry_type;
                    option.textContent = `${type.inquiry_type.replace(/_/g, ' ')} - ${type.description}`;
                    inquirySelect.appendChild(option);
                });
            } else {
                throw new Error('No inquiry types in response');
            }
        } catch (error) {
            console.error('Error loading inquiry types:', error);
            const inquirySelect = document.getElementById('postDepartment');
            if (inquirySelect) {
                // Add fallback options if API fails
                inquirySelect.innerHTML = `
                    <option value="">Select inquiry type...</option>
                    <option value="ENROLLMENT">Enrollment - Process, ORF, SIS, ID, Email, Down Payment, Module</option>
                    <option value="ACADEMICS">Academics - Grades, Teachers, Dean</option>
                    <option value="REGISTRAR">Registrar - TOR, Diploma, Credentials, School Related Documents</option>
                    <option value="FINANCE">Finance - Balance, Assessment, Scholarships</option>
                    <option value="OTHERS">Others - Other inquiries</option>
                `;
            }
        }
    }

    // Create mapping for inquiry types
    let inquiryTypeMap = {};

    const auth = AuthHelper.checkAuth();
    if (!auth.isValid) {
        alert('Authentication failed. Please login first.');
        return;
    }

    // Set user info
    document.getElementById('userFirstName').textContent = auth.firstName;
    document.getElementById('userInitials').textContent = auth.firstName.charAt(0).toUpperCase();

    // Initialize modals
    const composeModal = new bootstrap.Modal(document.getElementById('composeModal'));
    const submissionDetailModal = new bootstrap.Modal(document.getElementById('submissionDetailModal'));
    const privacyModal = new bootstrap.Modal(document.getElementById('privacyModal'));

    let allSubmissions = [];
    let currentFilter = 'inbox';
    let currentSubmissionId = null;

    // Gmail-style functionality
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const mailList = document.getElementById('mailList');
    const welcomeMessage = document.getElementById('welcomeMessage');

    // Load inquiry types when page loads
    setTimeout(() => {
        loadInquiryTypes();
    }, 1000);

    // Also try to load immediately
    loadInquiryTypes();

    // Compose button click
    document.getElementById('composeBtn').addEventListener('click', () => {
        composeModal.show();
    });

    // Send post functionality
    document.getElementById('sendPostBtn').addEventListener('click', async () => {
        const form = document.getElementById('composeForm');
        const postType = document.getElementById('postType').value;
        const postDepartment = document.getElementById('postDepartment').value;
        const postTitle = document.getElementById('postTitle').value;
        const postContent = document.getElementById('postContent').value;
        const postFiles = document.getElementById('postFiles').files;

        if (!postType || !postDepartment || !postTitle || !postContent) {
            toastr.error('Please fill in all required fields including department.');
            return;
        }

        // Show loading state
        const sendBtn = document.getElementById('sendPostBtn');
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = '<span class="loading-spinner me-2"></span>Sending...';
        sendBtn.disabled = true;

        try {
            // The postDepartment actually contains the inquiry type (FINANCE, ACADEMICS, etc.)
            const selectedInquiryType = postDepartment;

            // Map post type to post type ID
            const postTypeIdMap = {
                'inquiry': 1,
                'feedback': 2,
                'suggestion': 3
            };

            // Use the inquiry.php API for submitting posts based on the API structure
            const postData = {
                user_id: auth.id,
                post_type: selectedInquiryType, // This is the actual inquiry type like "FINANCE"
                post_title: postTitle,
                post_message: postContent,
                campus_id: 1, // Default campus
                post_type_id: postTypeIdMap[postType] || 1
            };

            // Submitting post with data
            // Selected inquiry type data ready

            const response = await axios.post(buildURL('inquiry.php?action=submit_inquiry'), postData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                toastr.success('Post submitted successfully!');
                composeModal.hide();
                form.reset();
                loadUserSubmissions(); // Refresh the list
            } else {
                toastr.error(response.data.message || 'Failed to submit post');
            }
        } catch (error) {

            toastr.error('An error occurred while submitting your post. Please try again.');
        } finally {
            // Restore button state
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
        }
    });

    // Sidebar item clicks
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            sidebarItems.forEach(i => i.classList.remove('active'));

            // Add active class to clicked item
            item.classList.add('active');

            // Get filter type
            const filter = item.dataset.filter || item.dataset.type;
            if (filter) {
                currentFilter = filter;
                filterAndDisplaySubmissions();
            }
        });
    });

    // Search functionality
    document.getElementById('globalSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterAndDisplaySubmissions(searchTerm);
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadUserSubmissions();
        toastr.info('Refreshing...');
    });

    // Select all button
    document.getElementById('selectAllBtn').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.mail-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
            const mailItem = cb.closest('.mail-item');
            if (cb.checked) {
                mailItem.classList.add('selected');
            } else {
                mailItem.classList.remove('selected');
            }
        });

        updateToolbarState();
    });

    // Archive button (for resolved posts)
    document.getElementById('archiveBtn').addEventListener('click', () => {
        const selectedIds = getSelectedPostIds();
        if (selectedIds.length === 0) {
            toastr.warning('Please select posts to archive.');
            return;
        }

        Swal.fire({
            title: 'Archive Posts',
            text: `Are you sure you want to archive ${selectedIds.length} post(s)?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#155f37',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, archive'
        }).then((result) => {
            if (result.isConfirmed) {
                // Implementation would depend on your API
                toastr.info('Archive functionality would be implemented here.');
            }
        });
    });

    // Delete button
    document.getElementById('deleteBtn').addEventListener('click', () => {
        const selectedIds = getSelectedPostIds();
        if (selectedIds.length === 0) {
            toastr.warning('Please select posts to delete.');
            return;
        }

        Swal.fire({
            title: 'Delete Posts',
            text: `Are you sure you want to delete ${selectedIds.length} post(s)? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete'
        }).then((result) => {
            if (result.isConfirmed) {
                // Implementation would depend on your API
                toastr.info('Delete functionality would be implemented here.');
            }
        });
    });

    // Helper function to get selected post IDs
    function getSelectedPostIds() {
        const checkedBoxes = document.querySelectorAll('.mail-checkbox:checked');
        return Array.from(checkedBoxes).map(cb => cb.dataset.id);
    }

    // Helper function to update toolbar state
    function updateToolbarState() {
        const selectedCount = document.querySelectorAll('.mail-checkbox:checked').length;
        const archiveBtn = document.getElementById('archiveBtn');
        const deleteBtn = document.getElementById('deleteBtn');

        if (selectedCount > 0) {
            archiveBtn.style.opacity = '1';
            deleteBtn.style.opacity = '1';
            archiveBtn.disabled = false;
            deleteBtn.disabled = false;
        } else {
            archiveBtn.style.opacity = '0.5';
            deleteBtn.style.opacity = '0.5';
            archiveBtn.disabled = true;
            deleteBtn.disabled = true;
        }
    }

    // Logout functionality
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

    // Load user submissions
    async function loadUserSubmissions() {
        try {
            // Show loading state
            mailList.innerHTML = `
                <div class="empty-state">
                    <div class="loading-spinner"></div>
                    <h5>Loading your posts...</h5>
                </div>
            `;

            // Determine which endpoint to use based on user type
            let endpoint = '';
            const userType = sessionStorage.getItem('user_typeId');

            if (userType === '2') { // Student
                endpoint = buildURL('posts.php?action=get_student_posts');
            } else if (userType === '1') { // Visitor
                endpoint = buildURL('posts.php?action=get_visitor_posts');
            } else if (userType === '3' || userType === '4') { // Employee
                endpoint = buildURL('posts.php?action=get_employee_posts');
            } else {
                endpoint = buildURL('posts.php?action=get_posts');
            }

            const response = await axios.get(endpoint, {
                headers: {
                    'X-User-Type': userType,
                    'X-User-Id': auth.id
                }
            });

            // Handle different response formats
            let posts = [];
            if (response.data.success && response.data.data) {
                // Standard API format
                posts = response.data.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                // DataTables format
                posts = response.data.data;
            } else if (Array.isArray(response.data)) {
                // Direct array format
                posts = response.data;
            } else {

                posts = [];
            }

            // Show all posts
            allSubmissions = posts;

            updateCounts();
            filterAndDisplaySubmissions();

            if (allSubmissions.length === 0) {
                welcomeMessage.style.display = 'block';
            }
        } catch (error) {
            // Try alternative endpoints
            try {
                let altResponse;

                // Try the general posts endpoint
                altResponse = await axios.get(buildURL('posts.php?action=get_posts'), {
                    headers: {
                        'X-User-Type': sessionStorage.getItem('user_typeId'),
                        'X-User-Id': auth.id
                    }
                });

                // Handle different response formats for alternative endpoint too
                let altPosts = [];
                if (altResponse.data.success && altResponse.data.data) {
                    altPosts = altResponse.data.data;
                } else if (altResponse.data.data && Array.isArray(altResponse.data.data)) {
                    altPosts = altResponse.data.data;
                } else if (Array.isArray(altResponse.data)) {
                    altPosts = altResponse.data;
                } else {
                    altPosts = [];
                }

                // Filter posts for current user only
                allSubmissions = altPosts.filter(post => post.user_id == auth.id);


                updateCounts();
                filterAndDisplaySubmissions();

                if (allSubmissions.length === 0) {
                    welcomeMessage.style.display = 'block';
                }

            } catch (altError) {

                showEmptyState('Error loading posts', 'Please check your connection and try again.');
            }
        }
    }

    // Show empty state with custom message
    function showEmptyState(title, message) {
        mailList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>${title}</h5>
                <p>${message}</p>
                <button class="btn btn-custom-green" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Refresh Page
                </button>
            </div>
        `;
    }

    // Update counts in sidebar
    function updateCounts() {


        const counts = {
            pending: allSubmissions.filter(s => s.post_status == 0 || s.post_status === '0').length,
            ongoing: allSubmissions.filter(s => s.post_status == 1 || s.post_status === '1').length,
            resolved: allSubmissions.filter(s => s.post_status == 2 || s.post_status === '2' || s.post_status == 3 || s.post_status === '3').length,
            inbox: allSubmissions.filter(s => s.post_status == 0 || s.post_status === '0' || s.post_status == 1 || s.post_status === '1').length
        };



        document.getElementById('inboxCount').textContent = counts.inbox;
        document.getElementById('pendingCount').textContent = counts.pending;
        document.getElementById('ongoingCount').textContent = counts.ongoing;
        document.getElementById('resolvedCount').textContent = counts.resolved;

        // Show/hide badge based on count
        Object.keys(counts).forEach(key => {
            const badge = document.getElementById(`${key}Count`);
            if (badge) {
                if (counts[key] > 0) {
                    badge.classList.remove('d-none');
                } else {
                    badge.classList.add('d-none');
                }
            }
        });
    }

    // Filter and display submissions
    function filterAndDisplaySubmissions(searchTerm = '') {

        let filteredSubmissions = [...allSubmissions];

        // Apply filter
        switch (currentFilter) {
            case 'inbox':
                filteredSubmissions = filteredSubmissions.filter(s => s.post_status == 0 || s.post_status === '0' || s.post_status == 1 || s.post_status === '1');
                break;
            case 'sent':
                // All submissions are "sent" by the user
                break;
            case 'pending':
                filteredSubmissions = filteredSubmissions.filter(s => s.post_status == 0 || s.post_status === '0');
                break;
            case 'ongoing':
                filteredSubmissions = filteredSubmissions.filter(s => s.post_status == 1 || s.post_status === '1');
                break;
            case 'resolved':
                filteredSubmissions = filteredSubmissions.filter(s => s.post_status == 2 || s.post_status === '2' || s.post_status == 3 || s.post_status === '3');
                break;
            case 'inquiry':
                filteredSubmissions = filteredSubmissions.filter(s => s.type === 'inquiry' || s.postType_name === 'Inquiry');
                break;
            case 'feedback':
                filteredSubmissions = filteredSubmissions.filter(s => s.type === 'feedback' || s.postType_name === 'Feedback');
                break;
            case 'suggestion':
                filteredSubmissions = filteredSubmissions.filter(s => s.type === 'suggestion' || s.postType_name === 'Suggestion');
                break;
        }



        // Apply search
        if (searchTerm) {
            filteredSubmissions = filteredSubmissions.filter(s =>
                (s.post_title && s.post_title.toLowerCase().includes(searchTerm)) ||
                (s.type && s.type.toLowerCase().includes(searchTerm)) ||
                (s.post_content && s.post_content.toLowerCase().includes(searchTerm))
            );
        }

        displaySubmissions(filteredSubmissions);
        document.getElementById('mailCount').textContent = `${filteredSubmissions.length} of ${allSubmissions.length}`;
    }

    // Display submissions in Gmail style
    function displaySubmissions(submissions) {


        if (submissions.length === 0) {

            mailList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h5>No posts found</h5>
                    <p>No posts match your current filter. Try changing the filter or creating a new post.</p>
                </div>
            `;
            return;
        }


        welcomeMessage.style.display = 'none';

        const mailItems = submissions.map(submission => {
            const statusClass = getStatusClass(submission.post_status);
            const statusText = getStatusText(submission.post_status);
            const typeIcon = getTypeIcon(submission.type, submission.postType_name);
            const isUnread = submission.post_status == 0; // Pending posts are "unread"

            // Handle different possible date fields and formats
            let dateToFormat = submission.created_at || submission.post_date || submission.date_created;
            if (submission.post_date && submission.post_time) {
                dateToFormat = `${submission.post_date} ${submission.post_time}`;
            }
            const formattedDate = formatDate(dateToFormat);

            return `
                <div class="mail-item ${isUnread ? 'unread' : 'read'}" data-id="${submission.post_id}" data-status="${submission.post_status}">
                    <div class="d-flex align-items-center">
                        <div class="me-3">
                            <input type="checkbox" class="form-check-input mail-checkbox" data-id="${submission.post_id}">
                        </div>
                        <div class="me-3">
                            ${typeIcon}
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center mb-1">
                                        <span class="fw-bold me-2">${submission.post_title || 'Untitled'}</span>
                                        <span class="status-badge ${statusClass}">${statusText}</span>
                                    </div>
                                    <div class="text-muted small">
                                        ${truncateText(submission.post_content, 100)}
                                    </div>
                                </div>
                                <div class="text-muted small ms-3">
                                    ${formattedDate}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        mailList.innerHTML = mailItems;

        // Add click handlers to mail items
        document.querySelectorAll('.mail-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const postId = item.dataset.id;
                    const postStatus = item.dataset.status;

                    // Add visual feedback
                    item.style.backgroundColor = '#e3f2fd';
                    setTimeout(() => {
                        item.style.backgroundColor = '';
                    }, 200);

                    // Always open the modal, but it will be read-only for resolved posts
                    openSubmissionDetail(postId);
                }
            });
        });

        // Add checkbox event handlers
        document.querySelectorAll('.mail-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const mailItem = e.target.closest('.mail-item');
                if (e.target.checked) {
                    mailItem.classList.add('selected');
                } else {
                    mailItem.classList.remove('selected');
                }
                updateToolbarState();
                e.stopPropagation(); // Prevent opening the detail modal
            });
        });

        // Initialize toolbar state
        updateToolbarState();
    }

    // Helper functions
    function getStatusClass(status) {
        // Handle both string and numeric status values
        const statusStr = String(status);
        switch (statusStr) {
            case '0': return 'status-pending';
            case '1': return 'status-ongoing';
            case '2': return 'status-resolved';
            case '3': return 'status-resolved'; // Also handle status 3 as resolved
            case 'pending': return 'status-pending';
            case 'ongoing': return 'status-ongoing';
            case 'resolved': return 'status-resolved';
            default: return 'status-pending';
        }
    }

    function getStatusText(status) {
        // Handle both string and numeric status values
        const statusStr = String(status);
        switch (statusStr) {
            case '0': return 'Pending';
            case '1': return 'Ongoing';
            case '2': return 'Resolved';
            case '3': return 'Resolved'; // Also handle status 3 as resolved
            case 'pending': return 'Pending';
            case 'ongoing': return 'Ongoing';
            case 'resolved': return 'Resolved';
            default: return 'Pending';
        }
    }

    function getTypeIcon(type, postTypeName) {
        // Handle different type field formats
        let iconType = type;

        if (!iconType && postTypeName) {
            // Map from postType_name to our icon types
            const typeNameLower = postTypeName.toLowerCase();
            if (typeNameLower.includes('inquiry')) {
                iconType = 'inquiry';
            } else if (typeNameLower.includes('feedback')) {
                iconType = 'feedback';
            } else if (typeNameLower.includes('suggestion')) {
                iconType = 'suggestion';
            }
        }

        switch (iconType) {
            case 'inquiry':
                return '<i class="fas fa-question-circle text-info"></i>';
            case 'feedback':
                return '<i class="fas fa-exclamation-triangle text-warning"></i>';
            case 'suggestion':
                return '<i class="fas fa-lightbulb text-success"></i>';
            default:
                return '<i class="fas fa-file-alt text-secondary"></i>';
        }
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    function formatDate(dateInput) {
        let date;

        // Handle different date formats
        if (!dateInput) return 'Unknown';

        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else {
            return 'Invalid Date';
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    // Open submission detail modal
    async function openSubmissionDetail(postId) {
        currentSubmissionId = postId;

        try {
            const modal = document.getElementById('submissionDetailModal');
            modal.dataset.postId = postId;

            const repliesContainer = modal.querySelector('.replies-container');
            repliesContainer.innerHTML = `
                <div class="text-center p-4">
                    <div class="loading-spinner"></div>
                    <p class="mt-2">Loading post details...</p>
                </div>
            `;

            submissionDetailModal.show();

            // Get submission details from the posts API
            const apiUrl = buildURL(`posts.php?action=get_post_details&post_id=${postId}`);


            const response = await axios.get(apiUrl, {
                headers: {
                    'X-User-Type': sessionStorage.getItem('user_typeId'),
                    'X-User-Id': auth.id
                }
            });







            if (response.data.success && response.data.post) {
                const submission = response.data.post;

                populateSubmissionDetail(submission);
            } else if (response.data.data) {
                // Handle different response format
                const submission = response.data.data;

                populateSubmissionDetail(submission);
            } else {

                repliesContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load submission details. ${response.data.message || 'Unexpected response format'}
                    </div>
                `;
            }
        } catch (error) {
            const repliesContainer = document.querySelector('.replies-container');
            repliesContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    An error occurred while loading submission details: ${error.message}
                </div>
            `;
        }
    }

    // Populate submission detail modal
    function populateSubmissionDetail(submission) {
        // Handle different possible field names for user information
        let userName = '';
        if (submission.user_fullname) {
            userName = submission.user_fullname;
        } else if (submission.first_name && submission.last_name) {
            userName = submission.first_name + ' ' + submission.last_name;
        } else if (submission.user_firstname && submission.user_lastname) {
            userName = submission.user_firstname + ' ' + submission.user_lastname;
        } else {
            userName = 'Unknown User';
        }

        document.getElementById('postUserName').textContent = userName;
        document.getElementById('postUserId').textContent = submission.user_schoolId || `User ID: ${submission.post_userId || submission.user_id || 'Unknown'}`;

        const statusBadge = document.getElementById('postStatus');
        statusBadge.textContent = getStatusText(submission.post_status);
        statusBadge.className = `badge rounded-pill ${getStatusClass(submission.post_status).replace('status-', 'bg-')}`;

        // Show/hide Mark as Resolved button based on post status
        const markResolvedBtn = document.getElementById('markResolvedBtn');
        const replyForm = document.getElementById('replyForm');

        // Debug: Log the actual status value
        // Post status check

        // Convert status to string for comparison
        const statusStr = String(submission.post_status);

        if (statusStr === 'resolved' || statusStr === '2' || statusStr === '3') {
            // Post is already resolved - show read-only mode
            // Post is resolved - hiding form
            if (markResolvedBtn) {
                markResolvedBtn.style.display = 'none';
            }

            // Replace the entire reply form container with resolved message (like admin side)
            const formContainer = document.querySelector('.reply-form-container');
            if (formContainer) {
                formContainer.innerHTML = `
                    <div class="alert alert-success mb-0 text-center p-3">
                        <i class="fas fa-check-circle me-2"></i>
                        <strong>This post is resolved and the conversation is closed.</strong>
                    </div>
                `;
                // Replaced form container with resolved message
            }
        } else {
            // Post is not resolved - normal interactive mode
            // Post is active - showing form
            if (markResolvedBtn) {
                markResolvedBtn.style.display = 'inline-block';
            }

            // Restore reply form container if it was replaced
            const formContainer = document.querySelector('.reply-form-container');
            if (formContainer && !formContainer.querySelector('#replyForm')) {
                formContainer.innerHTML = `
                    <form id="replyForm" class="reply-form p-3 border-top bg-white shadow-sm">
                        <div class="input-group rounded-pill overflow-hidden border">
                            <button class="btn btn-outline-secondary border-0" type="button" id="attachButton">
                                <i class="bi bi-paperclip"></i>
                            </button>
                            <input type="file" id="attachFile" style="display: none;">
                            <input type="text" class="form-control border-0 reply-input" placeholder="Write a reply..." style="box-shadow: none;">
                            <button class="btn btn-primary border-0" type="submit">
                                <i class="bi bi-send-fill"></i>
                            </button>
                        </div>
                        <div id="attachmentPreview" class="mt-2" style="display: none;">
                            <div class="d-flex align-items-center p-2 bg-light rounded">
                                <i class="bi bi-file-earmark me-2 text-primary"></i>
                                <span id="fileName" class="flex-grow-1"></span>
                                <button type="button" class="btn btn-link text-danger p-0 ms-2" id="removeAttachment">
                                    <i class="bi bi-x-circle"></i>
                                </button>
                            </div>
                        </div>
                    </form>
                `;

                // Re-attach event listeners for the restored form
                attachReplyFormListeners();
            }
        }

        // Load replies and original post
        loadReplies(submission.post_id, submission);
    }

    // Display main post in the dedicated section
    function displayMainPost(postData) {
        const mainPostContainer = document.querySelector('.main-post');
        if (!mainPostContainer) return;

        // Format the date properly
        let dateStr = 'Unknown date';
        if (postData.post_date && postData.post_time) {
            dateStr = `${postData.post_date} at ${postData.post_time}`;
        } else if (postData.created_at) {
            dateStr = new Date(postData.created_at).toLocaleString();
        } else if (postData.post_date) {
            dateStr = postData.post_date;
        }

        mainPostContainer.innerHTML = `
            <div class="message-bubble main-post-bubble border-start border-4 border-primary bg-light rounded p-4 w-100 mb-3">
                <div class="message-content">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <span class="badge bg-secondary me-2">${postData.postType_name || 'General'}</span>
                            ${postData.inquiry_type ? `<span class="badge bg-info">${postData.inquiry_type}</span>` : ''}
                        </div>
                        <span class="badge ${getStatusClass(postData.post_status).replace('status-', 'bg-')}">${getStatusText(postData.post_status)}</span>
                    </div>
                    <h4 class="text-primary mb-3 fw-bold">${postData.post_title || 'No Title'}</h4>
                    <div class="post-message mb-3">
                        <p class="mb-0 lh-base">${postData.post_message || postData.post_content || 'No message content'}</p>
                    </div>
                    <div class="post-meta text-muted">
                        <small><i class="fas fa-clock me-1"></i>${dateStr}</small>
                    </div>
                </div>
            </div>
        `;
    }

    // Load replies and show post details
    async function loadReplies(postId, submissionData = null) {
        const repliesContainer = document.querySelector('.replies-container');

        try {
            const apiUrl = buildURL(`posts.php?action=get_post_details&post_id=${postId}`);
            const postResponse = await axios.get(apiUrl);

            let postData = null;
            if (postResponse.data.success && postResponse.data.post) {
                postData = postResponse.data.post;
            } else if (postResponse.data.data) {
                postData = postResponse.data.data;
            } else {
                postData = submissionData || allSubmissions.find(p => p.post_id == postId);
            }

            if (postData) {
                // Clear only the replies, not the main post
                const mainPost = repliesContainer.querySelector('.main-post');
                const mainPostHTML = mainPost ? mainPost.outerHTML : '<div class="main-post p-3 border-bottom bg-light"></div>';

                repliesContainer.innerHTML = mainPostHTML;

                // Display the main post content
                displayMainPost(postData);

                if (postData.replies && postData.replies.length > 0) {
                    postData.replies.forEach((reply, index) => {
                        if (reply.display_name === 'GIYA Representative' &&
                            reply.reply_message.includes('Post forwarded to')) {
                            return;
                        }

                        const isAdmin = reply.user_type === 'admin' || reply.user_type === 'Admin' || reply.user_type === 'poc';
                        const replyDate = reply.reply_date && reply.reply_time ?
                            `${reply.reply_date} ${reply.reply_time}` :
                            (reply.formatted_date || reply.created_at || 'Unknown date');

                        const replyElement = document.createElement('div');
                        replyElement.className = `message-bubble ${isAdmin ? 'admin-message' : 'user-message'}`;
                        replyElement.innerHTML = `
                            <div class="message-content">
                                <strong>${reply.display_name || reply.user_firstname || reply.user_lastname || (isAdmin ? 'GIYA Representative' : 'User')}</strong>
                                <p>${reply.reply_message || reply.message || 'No message content'}</p>
                                <small>${new Date(replyDate).toLocaleString()}</small>
                            </div>
                        `;
                        repliesContainer.appendChild(replyElement);
                    });
                } else {
                    repliesContainer.innerHTML = `
                        <div class="text-center text-muted py-4">
                            <i class="fas fa-comments fa-2x mb-3 opacity-50"></i>
                            <p class="mb-0">No replies yet. Wait for a response from the administration.</p>
                        </div>
                    `;
                }

                // Add resolved message if post is resolved
                if (postData.post_status === 'resolved' || postData.post_status === '3') {
                    const resolvedMessage = document.createElement('div');
                    resolvedMessage.className = 'resolved-message text-center';
                    resolvedMessage.innerHTML = `
                        <i class="fas fa-check-circle me-2"></i>
                        <strong>This post is resolved and the conversation is closed.</strong>
                    `;
                    repliesContainer.appendChild(resolvedMessage);
                }

                setTimeout(() => {
                    repliesContainer.scrollTop = repliesContainer.scrollHeight;
                }, 100);
            } else {
                repliesContainer.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3 opacity-50"></i>
                        <p class="mb-0">Unable to load conversation details.</p>
                    </div>
                `;
            }
        } catch (error) {
            repliesContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3 opacity-50"></i>
                    <p class="mb-0">Error loading conversation. Please try again.</p>
                </div>
            `;
        }
    }

    // Handle opening submission details
    // Removed debug function call

    // Initial load
    loadUserSubmissions();

    // Keyboard navigation support
    document.addEventListener('keydown', (e) => {
        // Escape key to close modals
        if (e.key === 'Escape') {
            if (composeModal._isShown) {
                composeModal.hide();
            }
            if (submissionDetailModal._isShown) {
                submissionDetailModal.hide();
            }
        }

        // Ctrl+N for new post
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            composeModal.show();
        }

        // Ctrl+R for refresh
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            loadUserSubmissions();
        }

        // Delete key for delete selected
        if (e.key === 'Delete') {
            const selectedIds = getSelectedPostIds();
            if (selectedIds.length > 0) {
                document.getElementById('deleteBtn').click();
            }
        }
    });

    // Add tooltips for keyboard shortcuts
    document.getElementById('composeBtn').setAttribute('title', 'New Post (Ctrl+N)');
    document.getElementById('refreshBtn').setAttribute('title', 'Refresh (Ctrl+R)');

    // Initial load
    loadUserSubmissions();

    // Mark as Resolved functionality
    const markResolvedBtn = document.getElementById('markResolvedBtn');
    if (markResolvedBtn) {
        markResolvedBtn.addEventListener('click', async () => {
            const auth = AuthHelper.checkAuth();
            if (!auth.isValid) {
                showInlineError('Authentication required to resolve posts');
                return;
            }

            const currentPostId = document.getElementById('submissionDetailModal').dataset.postId;
            if (!currentPostId) {
                showInlineError('No post selected');
                return;
            }

            try {
                // Show loading state
                const originalButtonText = markResolvedBtn.innerHTML;
                markResolvedBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Resolving...';
                markResolvedBtn.disabled = true;

                const resolveData = {
                    post_id: currentPostId,
                    status: '2' // 2 = resolved status (not 3)
                };

                const response = await axios.post(buildURL('posts.php?action=update_post_status'), resolveData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Type': sessionStorage.getItem('user_typeId'),
                        'X-User-Id': auth.id
                    }
                });

                if (response.data.success) {
                    updateUIForResolvedPost();
                    loadUserSubmissions();
                } else {
                    showInlineError(response.data.message || 'Failed to resolve post. Please try again.');
                    markResolvedBtn.innerHTML = originalButtonText;
                    markResolvedBtn.disabled = false;
                }

            } catch (error) {
                showInlineError('Failed to resolve post. Please check your connection and try again.');
                markResolvedBtn.innerHTML = originalButtonText;
                markResolvedBtn.disabled = false;
            }
        });
    }

    // Function to show inline error messages in the modal
    function showInlineError(message) {
        const modal = document.getElementById('submissionDetailModal');
        const modalBody = modal.querySelector('.modal-body');

        const existingError = modal.querySelector('.alert-danger');
        if (existingError) {
            existingError.remove();
        }

        const errorElement = document.createElement('div');
        errorElement.className = 'alert alert-danger d-flex align-items-center';
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
        `;
        modalBody.insertBefore(errorElement, modalBody.firstChild);

        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
    }

    // Function to update UI when post is resolved
    function updateUIForResolvedPost() {
        const markResolvedBtn = document.getElementById('markResolvedBtn');
        if (markResolvedBtn) {
            markResolvedBtn.style.display = 'none';
        }

        const statusBadge = document.getElementById('postStatus');
        if (statusBadge) {
            statusBadge.textContent = 'Resolved';
            statusBadge.className = 'badge rounded-pill bg-success';
        }

        // Replace the entire reply form container with resolved message (like admin side)
        const formContainer = document.querySelector('.reply-form-container');
        if (formContainer) {
            formContainer.innerHTML = `
                <div class="alert alert-success mb-0 text-center">
                    <i class="fas fa-check-circle me-2"></i>
                    This post is resolved and the conversation is closed.
                </div>
            `;
        }

        const mainPostStatus = document.querySelector('.main-post .badge');
        if (mainPostStatus) {
            mainPostStatus.textContent = 'Resolved';
            mainPostStatus.className = 'badge bg-success';
        }

        // Don't auto-close the modal - let users view the conversation history
    }

    // Reply form functionality using event delegation
    function attachReplyFormListeners() {
        // Remove any existing listeners first
        const modalContainer = document.getElementById('submissionDetailModal');
        if (modalContainer) {
            modalContainer.removeEventListener('submit', handleReplySubmit);
            modalContainer.addEventListener('submit', handleReplySubmit);
        }
    }

    async function handleReplySubmit(e) {
        // Only handle submit events from the reply form
        if (e.target.id !== 'replyForm') return;

        e.preventDefault();

        // Check if this is a resolved post by looking for the resolved message
        const formContainer = document.querySelector('.reply-form-container');
        const resolvedMessage = formContainer?.querySelector('.alert-success');
        if (resolvedMessage && resolvedMessage.textContent.includes('resolved and the conversation is closed')) {
            toastr.warning('This conversation is resolved and closed. You cannot send new replies.');
            return;
        }

        const replyInput = e.target.querySelector('.reply-input');
        if (!replyInput) {
            toastr.warning('Reply form is not available');
            return;
        }

        const replyMessage = replyInput.value.trim();

        if (!replyMessage) {
            toastr.warning('Please enter a reply message');
            return;
        }

        const auth = AuthHelper.checkAuth();
        if (!auth.isValid) {
            toastr.error('Authentication required');
            return;
        }

        const currentPostId = document.getElementById('submissionDetailModal').dataset.postId;
        if (!currentPostId) {
            toastr.error('No post selected');
            return;
        }

        try {
            const replyData = new FormData();
            replyData.append('post_id', currentPostId);
            replyData.append('reply_message', replyMessage);
            replyData.append('admin_id', auth.id);

            // Show loading state
            const replyButton = e.target.querySelector('button[type="submit"]');
            const originalButtonText = replyButton ? replyButton.innerHTML : '';
            if (replyButton) {
                replyButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
                replyButton.disabled = true;
            }

            // Add the message immediately to the conversation for real-time feel
            const repliesContainer = document.querySelector('.replies-container');
            const tempReplyElement = document.createElement('div');
            tempReplyElement.className = 'message-bubble user-message sending';
            tempReplyElement.id = 'temp-reply';
            tempReplyElement.innerHTML = `
                <div class="message-content">
                    <strong>${auth.firstName} ${auth.lastName || ''}</strong>
                    <p>${replyMessage}</p>
                    <small>${new Date().toLocaleString()}</small>
                    <span class="sending-indicator text-muted ms-2"><i class="fas fa-clock"></i> Sending...</span>
                </div>
            `;
            repliesContainer.appendChild(tempReplyElement);
            repliesContainer.scrollTop = repliesContainer.scrollHeight;

            const response = await axios.post(buildURL('posts.php?action=submit_reply'), replyData, {
                headers: {
                    'X-User-Type': sessionStorage.getItem('user_typeId'),
                    'X-User-Id': auth.id
                }
            });

            // Remove the temporary message
            const tempElement = document.getElementById('temp-reply');
            if (tempElement) {
                tempElement.remove();
            }

            if (response.data.success) {
                // Clear the input immediately
                replyInput.value = '';

                // Add the confirmed message to the conversation
                const confirmedReplyElement = document.createElement('div');
                confirmedReplyElement.className = 'message-bubble user-message';
                confirmedReplyElement.innerHTML = `
                    <div class="message-content">
                        <strong>${auth.firstName} ${auth.lastName || ''}</strong>
                        <p>${replyMessage}</p>
                        <small>${new Date().toLocaleString()}</small>
                    </div>
                `;
                repliesContainer.appendChild(confirmedReplyElement);
                repliesContainer.scrollTop = repliesContainer.scrollHeight;
            } else {
                // Show error message directly in the conversation
                const errorElement = document.createElement('div');
                errorElement.className = 'alert alert-danger mt-2';
                errorElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${response.data.message || 'Failed to send reply. Please try again.'}
                `;
                repliesContainer.appendChild(errorElement);

                // Remove error message after 5 seconds
                setTimeout(() => {
                    if (errorElement.parentNode) {
                        errorElement.remove();
                    }
                }, 5000);
            }

            // Restore button state
            if (replyButton) {
                replyButton.innerHTML = originalButtonText;
                replyButton.disabled = false;
            }

        } catch (error) {
            // Remove the temporary message if there was an error
            const tempElement = document.getElementById('temp-reply');
            if (tempElement) {
                tempElement.remove();
            }

            // Show error message directly in the conversation
            const repliesContainer = document.querySelector('.replies-container');
            const errorElement = document.createElement('div');
            errorElement.className = 'alert alert-danger mt-2';
            errorElement.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                Failed to send reply. Please check your connection and try again.
            `;
            repliesContainer.appendChild(errorElement);

            // Remove error message after 5 seconds
            setTimeout(() => {
                if (errorElement.parentNode) {
                    errorElement.remove();
                }
            }, 5000);

            // Restore button state
            if (replyButton) {
                replyButton.innerHTML = originalButtonText;
                replyButton.disabled = false;
            }
        }
    }

    // Initialize the event listeners
    attachReplyFormListeners();

});
