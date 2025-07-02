/**
 * Table Filters JS - Handles dynamic filtering for GIYA tables
 */

document.addEventListener('DOMContentLoaded', function() {
    const baseURL = typeof getBaseURL === 'function' ? getBaseURL() : sessionStorage.getItem('baseURL');

    if (!baseURL) {
        toastr.warning('API URL not found. You may need to login again.');
    }

    initializeMasterData();
    initializeFilterListeners();
});

/**
 * Load master data for filter dropdowns (departments, campuses)
 */
async function initializeMasterData() {
    try {
        await loadDepartments();
        await loadCampuses();
        checkPOCRestrictions();
    } catch (error) {
        toastr.error('Failed to load filter data. Some features may be limited.');
    }
}

/**
 * Load departments for the filter dropdown
 */
async function loadDepartments() {
    try {
        const baseURL = typeof getBaseURL === 'function' ? getBaseURL() : sessionStorage.getItem('baseURL');
        if (!baseURL) {
            toastr.warning('Base URL not found. Please login again.');
            return false;
        }

        const response = await axios.get(`${baseURL}masterfile.php?action=departments`);

        if (response.data && response.data.success && Array.isArray(response.data.data)) {
            const departmentSelects = document.querySelectorAll('#department-filter, #forwardDepartment');

            departmentSelects.forEach(departmentSelect => {
                if (!departmentSelect) return;

                const firstOption = departmentSelect.querySelector('option:first-child');
                departmentSelect.innerHTML = '';
                departmentSelect.appendChild(firstOption);

                response.data.data.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.department_id;
                    option.textContent = dept.department_name;
                    departmentSelect.appendChild(option);
                });
            });

            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

/**
 * Load campuses for the filter dropdown
 */
async function loadCampuses() {
    try {
        const baseURL = typeof getBaseURL === 'function' ? getBaseURL() : sessionStorage.getItem('baseURL');
        if (!baseURL) {
            toastr.warning('Base URL not found. Please login again.');
            return false;
        }

        const response = await axios.get(`${baseURL}masterfile.php?action=campuses`);

        if (response.data && response.data.success && Array.isArray(response.data.data)) {
            const campusSelects = document.querySelectorAll('#campus-filter, #forwardCampus');

            campusSelects.forEach(campusSelect => {
                if (!campusSelect) return;

                const firstOption = campusSelect.querySelector('option:first-child');
                campusSelect.innerHTML = '';
                campusSelect.appendChild(firstOption);

                response.data.data.forEach(campus => {
                    const option = document.createElement('option');
                    option.value = campus.campus_id;
                    option.textContent = campus.campus_name;
                    campusSelect.appendChild(option);
                });
            });

            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

/**
 * Set up filter event listeners for DataTable filtering
 */
function initializeFilterListeners() {
    const filterControls = document.querySelectorAll('.filter-control');

    filterControls.forEach(filter => {
        filter.addEventListener('change', function() {
            applyTableFilters();
        });
    });

    setupForwardPostHandler();
}

/**
 * Apply all selected filters to the DataTable
 */
function applyTableFilters() {
    const tableIds = ['postsTable', 'latestPostsTable', 'resolvedPostsTable'];
    let activeTable = null;

    for (const id of tableIds) {
        const table = document.getElementById(id);
        if (table) {
            activeTable = $(`#${id}`).DataTable();
            break;
        }
    }

    if (!activeTable) {
        return;
    }

    try {
        const userInfo = sessionStorage.getItem('user');
        const user = userInfo ? JSON.parse(userInfo) : null;
        const isPOC = user && user.user_typeId == 5;

        document.querySelectorAll('.filter-control').forEach(filter => {
            const value = filter.value;
            const columnIndex = parseInt(filter.getAttribute('data-column'));

            if (isPOC && filter.id === 'department-filter') {
                return;
            }

            if (!isNaN(columnIndex)) {
                activeTable.column(columnIndex).search(value);
            }
        });

        activeTable.draw();

        const tableEl = activeTable.table().node();
        if (tableEl) {
            tableEl.style.display = '';
        }
    } catch (error) {
        // Handle error silently
    }
}

/**
 * Check if the user is a POC and apply restrictions
 */
function checkPOCRestrictions() {
    const userInfo = sessionStorage.getItem('user');
    if (!userInfo) return;

    try {
        const user = JSON.parse(userInfo);

        if (user.user_typeId == 5) {
            const departmentFilter = document.getElementById('department-filter');
            if (departmentFilter && user.user_departmentId) {
                departmentFilter.value = user.user_departmentId;
                departmentFilter.disabled = true;

                addLockIndicator(departmentFilter, 'Department filter is locked based on your role');

                const tableIds = ['postsTable', 'latestPostsTable'];
                for (const id of tableIds) {
                    const table = $(`#${id}`).DataTable();
                    if (table) {
                        table.column(5).search('').draw();

                        setTimeout(() => {
                            table.column(5).search(user.department_name || user.user_departmentId).draw();
                        }, 100);
                    }
                }
            }
        }
    } catch (e) {
        // Handle error silently
    }
}

/**
 * Apply POC locks to department and campus filters
 */
function applyPOCLocks(user) {
    if (user.user_departmentId) {
        const departmentFilter = document.getElementById('department-filter');
        if (departmentFilter) {
            departmentFilter.value = user.user_departmentId;
            departmentFilter.disabled = true;

            addLockIndicator(departmentFilter, 'Department filter is locked based on your role');
        }
    }

    if (user.user_campusId) {
        const campusFilter = document.getElementById('campus-filter');
        if (campusFilter) {
            campusFilter.value = user.user_campusId;
            campusFilter.disabled = true;

            addLockIndicator(campusFilter, 'Campus filter is locked based on your role');
        }
    }

    setTimeout(function() {
        try {
            const tableIds = ['postsTable', 'latestPostsTable', 'resolvedPostsTable'];
            for (const id of tableIds) {
                const tableEl = document.getElementById(id);
                if (tableEl && $.fn.DataTable.isDataTable(`#${id}`)) {
                    const dt = $(`#${id}`).DataTable();

                    const deptCol = dt.column(5);
                    if (deptCol && user.user_departmentId) {
                        deptCol.search(user.department_name || user.user_departmentId).draw();
                    }

                    tableEl.style.display = '';
                    break;
                }
            }
        } catch (e) {
            // Handle error silently
        }
    }, 1000);
}

/**
 * Add a lock indicator to a filter element
 */
function addLockIndicator(element, tooltip) {
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

        parentDiv.classList.add('locked-filter');
    }
}

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

        const userInfo = sessionStorage.getItem('user');
        if (!userInfo) {
            toastr.error('User information not found. Please log in again.');
            return;
        }

        const user = JSON.parse(userInfo);
        const forwardedBy = user.user_id;

        const baseURL = typeof getBaseURL === 'function' ? getBaseURL() : sessionStorage.getItem('baseURL');
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
    },

    loadFilterOptions: function() {
        const baseURL = typeof getBaseURL === 'function' ? getBaseURL() : sessionStorage.getItem('baseURL');
        if (!baseURL) {
            toastr.warning('Base URL not found. Please login again.');
            return;
        }

        // Load departments
        axios.get(`${baseURL}masterfile.php?action=departments`)
            .then(response => {
                if (response.data && response.data.success) {
                    this.populateFilter('departmentFilter', response.data.data, 'department_id', 'department_name');
                }
            })
            .catch(() => console.error('Failed to load departments'));

        // Load campuses
        axios.get(`${baseURL}masterfile.php?action=campuses`)
            .then(response => {
                if (response.data && response.data.success) {
                    this.populateFilter('campusFilter', response.data.data, 'campus_id', 'campus_name');
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
            const userInfo = sessionStorage.getItem('user');
            if (userInfo) {
                try {
                    const user = JSON.parse(userInfo);
                    if (user.user_typeId == 5 && user.user_departmentId) {
                        filter.value = user.user_departmentId;
                        filter.disabled = true;
                    }
                } catch (e) {}
            }
        }
    },

    setupEventHandlers: function() {
        // Set up filters to update tables when changed
        const filters = document.querySelectorAll('.table-filter');
        filters.forEach(filter => {
            filter.addEventListener('change', function() {
                const tableId = this.getAttribute('data-table');
                const table = $(tableId).DataTable();

                if (table) {
                    const columnIndex = parseInt(this.getAttribute('data-column')) || 0;

                    if (this.value) {
                        // If using direct value filtering
                        if (this.hasAttribute('data-value-filter')) {
                            table.column(columnIndex).search(this.value).draw();
                        }
                        // If filtering by text content of the selected option
                        else {
                            const text = this.options[this.selectedIndex].text;
                            table.column(columnIndex).search(text).draw();
                        }
                    } else {
                        table.column(columnIndex).search('').draw();
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

                        const tableId = filter.getAttribute('data-table');
                        const table = $(tableId).DataTable();

                        if (table) {
                            const columnIndex = parseInt(filter.getAttribute('data-column')) || 0;
                            table.column(columnIndex).search('').draw();
                        }
                    }
                });
            });
        }
    },

    applyUserRestrictions: function() {
        // Add restrictions based on user type (e.g., for POC users)
        const userInfo = sessionStorage.getItem('user');
        if (userInfo) {
            try {
                const user = JSON.parse(userInfo);
                if (user.user_typeId == 5 && user.user_departmentId) {
                    const departmentFilter = document.getElementById('departmentFilter');
                    if (departmentFilter) {
                        departmentFilter.value = user.user_departmentId;
                        departmentFilter.disabled = true;

                        // Apply this filter to any tables using it
                        const tableId = departmentFilter.getAttribute('data-table');
                        const table = $(tableId).DataTable();

                        if (table) {
                            const columnIndex = parseInt(departmentFilter.getAttribute('data-column')) || 0;
                            const text = departmentFilter.options[departmentFilter.selectedIndex].text;
                            table.column(columnIndex).search(text).draw();
                        }
                    }
                }
            } catch (e) {}
        }
    }
};

// Initialize on document ready
$(document).ready(function() {
    TableFilters.init();
    // Apply user restrictions after a short delay to ensure tables are initialized
    setTimeout(() => TableFilters.applyUserRestrictions(), 500);
});
