/**
 * Table Filters JS - Handles dynamic filtering for GIYA tables
 */

// Note: TableFilters object handles all initialization via jQuery document ready
// This ensures compatibility with existing jQuery-based table initialization

/**
 * Set up forward post functionality
 */
function setupForwardPostHandler() {
    const submitForwardBtn = document.getElementById('submitForward');
    if (submitForwardBtn) {
        submitForwardBtn.addEventListener('click', forwardCurrentPost);
    }

    window.openForwardModal = function(postId) {
        window.currentForwardPostId = postId;

        const forwardModal = new bootstrap.Modal(document.getElementById('forwardPostModal'));
        forwardModal.show();
    };
}

/**
 * Forward the current post to selected department/campus
 */
async function forwardCurrentPost() {
    try {
        const postId = window.currentForwardPostId;
        if (!postId) {
            toastr.error('No post selected for forwarding');
            return;
        }

        const departmentId = document.getElementById('forwardDepartment').value;
        const campusId = document.getElementById('forwardCampus').value;
        const note = document.getElementById('forwardNote').value;

        if (!departmentId || !campusId) {
            toastr.warning('Please select both department and campus');
            return;
        }

        const userData = GiyaSession.getUserData();
        if (!userData.user_id) {
            toastr.error('User information not found. Please log in again.');
            return;
        }

        const forwardedBy = userData.user_id;

        const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);
        if (!baseURL) {
            toastr.error('Base URL not found. Please login again.');
            return;
        }

        const response = await axios.post(`${baseURL}posts.php?action=forward_post`, {
            post_id: postId,
            department_id: departmentId,
            campus_id: campusId,
            forwarded_by: forwardedBy,
            note: note
        });

        if (response.data && response.data.success) {
            const forwardModal = bootstrap.Modal.getInstance(document.getElementById('forwardPostModal'));
            forwardModal.hide();

            toastr.success('Post forwarded successfully');

            if (window.GiyaTable && window.GiyaTable.refreshTables) {
                window.GiyaTable.refreshTables();
            } else if (window.refreshTables) {
                window.refreshTables();
            } else {
                setTimeout(() => location.reload(), 1500);
            }

            if (window.currentPostId === postId && window.showPostDetails) {
                setTimeout(() => window.showPostDetails(postId), 500);
            }
        } else {
            toastr.error(response.data?.message || 'Failed to forward post');
        }
    } catch (error) {
        toastr.error('An error occurred while forwarding the post');
    }
}

/**
 * TableFilters - Handles table filtering functionality for dashboard tables
 */
const TableFilters = {
    init: function() {
        this.loadFilterOptions();
        this.setupEventHandlers();
        this.checkPOCRestrictions();
        setupForwardPostHandler(); // Set up forward post functionality
    },

    checkPOCRestrictions: function() {
        const userData = GiyaSession.getUserData();
        if (!userData.user_id) return;

        if (userData.user_typeId == 5) {
            this.applyPOCLocks(userData);
        }
    },

    applyPOCLocks: function(userData) {
        if (userData.user_departmentId) {
            const departmentFilter = document.getElementById('department-filter');
            if (departmentFilter) {
                departmentFilter.value = user.user_departmentId;
                departmentFilter.disabled = true;

                this.addLockIndicator(departmentFilter, 'Department filter is locked based on your role');
            }
        }

        if (user.user_campusId) {
            const campusFilter = document.getElementById('campus-filter');
            if (campusFilter) {
                campusFilter.value = user.user_campusId;
                campusFilter.disabled = true;

                this.addLockIndicator(campusFilter, 'Campus filter is locked based on your role');
            }
        }

        // Apply the POC filtering to tables after they are initialized
        setTimeout(() => {
            try {
                const tableIds = ['latestPostsTable', 'resolvedPostsTable'];
                for (const id of tableIds) {
                    const tableEl = document.getElementById(id);
                    if (tableEl && $.fn.DataTable.isDataTable(`#${id}`)) {
                        const dt = $(`#${id}`).DataTable();

                        // Department is column 4, Campus is column 5
                        if (user.user_departmentId) {
                            const deptCol = dt.column(4);
                            if (deptCol) {
                                deptCol.search(user.department_name || '').draw();
                            }
                        }

                        if (user.user_campusId) {
                            const campusCol = dt.column(5);
                            if (campusCol) {
                                campusCol.search(user.campus_name || '').draw();
                            }
                        }

                        tableEl.style.display = '';
                        break;
                    }
                }
            } catch (e) {
                console.error('Error applying POC table filters:', e);
            }
        }, 1000);
    },

    addLockIndicator: function(element, tooltip) {
        const lockIcon = document.createElement('i');
        lockIcon.className = 'bi bi-lock-fill text-secondary filter-lock-icon';
        lockIcon.style.position = 'absolute';
        lockIcon.style.right = '10px';
        lockIcon.style.top = '50%';
        lockIcon.style.transform = 'translateY(-50%)';
        lockIcon.title = tooltip || 'This filter is locked';

        const parentDiv = element.parentElement;
        if (parentDiv) {
            parentDiv.style.position = 'relative';
            parentDiv.appendChild(lockIcon);
        }
    },

    loadFilterOptions: function() {
        const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);
        if (!baseURL) {
            toastr.warning('Base URL not found. Please login again.');
            return;
        }

        // Load departments
        axios.get(`${baseURL}masterfile.php?action=departments`)
            .then(response => {
                if (response.data && response.data.success) {
                    this.populateFilter('department-filter', response.data.data, 'department_id', 'department_name');
                    this.populateFilter('forwardDepartment', response.data.data, 'department_id', 'department_name');
                }
            })
            .catch(() => console.error('Failed to load departments'));

        // Load campuses
        axios.get(`${baseURL}masterfile.php?action=campuses`)
            .then(response => {
                if (response.data && response.data.success) {
                    this.populateFilter('campus-filter', response.data.data, 'campus_id', 'campus_name');
                    this.populateFilter('forwardCampus', response.data.data, 'campus_id', 'campus_name');
                }
            })
            .catch(() => console.error('Failed to load campuses'));
    },

    populateFilter: function(filterId, data, valueKey, textKey) {
        const filter = document.getElementById(filterId);
        if (!filter) return;

        // Clear existing options but keep the first one (All option)
        const firstOption = filter.options[0];
        filter.innerHTML = '';
        filter.appendChild(firstOption);

        // Add new options
        if (Array.isArray(data)) {
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item[valueKey];
                option.textContent = item[textKey];
                filter.appendChild(option);
            });
        }

        // Check if we need to pre-select an option for POC users
        if (filterId === 'departmentFilter') {
            const userData = GiyaSession.getUserData();
            if (userData.user_id && userData.user_typeId == 5 && userData.user_departmentId) {
                filter.value = userData.user_departmentId;
                filter.disabled = true;
            }
        }
    },

    setupEventHandlers: function() {
        // Set up filters to update tables when changed
        const filters = document.querySelectorAll('.filter-control');
        filters.forEach(filter => {
            filter.addEventListener('change', function() {
                const columnIndex = parseInt(this.getAttribute('data-column'));

                if (!isNaN(columnIndex)) {
                    const tableIds = ['latestPostsTable', 'resolvedPostsTable'];
                    let activeTable = null;

                    for (const id of tableIds) {
                        const table = document.getElementById(id);
                        if (table && $.fn.DataTable.isDataTable(`#${id}`)) {
                            activeTable = $(`#${id}`).DataTable();
                            break;
                        }
                    }

                    if (activeTable) {
                        if (this.value) {
                            // For department and campus filters, use the text content instead of value
                            if (this.id === 'department-filter' || this.id === 'campus-filter') {
                                const searchValue = this.options[this.selectedIndex].text;
                                activeTable.column(columnIndex).search(searchValue).draw();
                            } else {
                                // For other filters, use the value directly
                                activeTable.column(columnIndex).search(this.value).draw();
                            }
                        } else {
                            activeTable.column(columnIndex).search('').draw();
                        }
                    }
                }
            });
        });

        // Set up reset filters button
        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                filters.forEach(filter => {
                    // Skip locked filters (e.g., for POC users)
                    if (!filter.disabled) {
                        filter.selectedIndex = 0;

                        const columnIndex = parseInt(filter.getAttribute('data-column'));
                        if (!isNaN(columnIndex)) {
                            const tableIds = ['latestPostsTable', 'resolvedPostsTable'];
                            for (const id of tableIds) {
                                const table = document.getElementById(id);
                                if (table && $.fn.DataTable.isDataTable(`#${id}`)) {
                                    const activeTable = $(`#${id}`).DataTable();
                                    activeTable.column(columnIndex).search('').draw();
                                    break;
                                }
                            }
                        }
                    }
                });
            });
        }
    },

    applyUserRestrictions: function() {
        // Add restrictions based on user type (e.g., for POC users)
        const userData = GiyaSession.getUserData();
        if (userData.user_id && userData.user_typeId == 5 && userData.user_departmentId) {
            const departmentFilter = document.getElementById('department-filter');
            if (departmentFilter) {
                departmentFilter.value = userData.user_departmentId;
                departmentFilter.disabled = true;

                // Apply this filter to tables
                const tableIds = ['latestPostsTable', 'resolvedPostsTable'];
                for (const id of tableIds) {
                    const table = document.getElementById(id);
                    if (table && $.fn.DataTable.isDataTable(`#${id}`)) {
                        const activeTable = $(`#${id}`).DataTable();
                        const text = departmentFilter.options[departmentFilter.selectedIndex].text;
                        activeTable.column(4).search(text).draw(); // Department is column 4
                        break;
                    }
                }
            }
        }
    }
};

// Initialize on document ready
$(document).ready(function() {
    TableFilters.init();
    // Apply user restrictions after a short delay to ensure tables are initialized
    setTimeout(() => TableFilters.applyUserRestrictions(), 500);
});
