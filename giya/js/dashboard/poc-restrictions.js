/**
 * POC Restrictions - Handles restrictions for POC user accounts
 */

document.addEventListener('DOMContentLoaded', function() {
    applyPOCRestrictions();
});

function applyPOCRestrictions() {
    const userInfo = sessionStorage.getItem('user');
    if (!userInfo) return;

    try {
        const user = JSON.parse(userInfo);
        if (user.user_typeId == 5) {
            // Apply POC-specific restrictions

            // Lock department filters to POC's department
            if (user.user_departmentId) {
                lockDepartmentFilters(user.user_departmentId, user.department_name);

                // Adjust API requests to include department filter
                addDepartmentHeaderToRequests(user.user_departmentId);
            }

            // Hide admin-only elements
            hideAdminOnlyElements();
        }
    } catch (e) {
        console.error('Error applying POC restrictions:', e);
    }
}

function lockDepartmentFilters(departmentId, departmentName) {
    // Find all department filter dropdowns
    const departmentFilters = document.querySelectorAll('select[id*="department"]');

    departmentFilters.forEach(filter => {
        // Set value to POC's department and disable the filter
        if (filter.options) {
            // Find and select the option with the matching department ID
            for (let i = 0; i < filter.options.length; i++) {
                if (filter.options[i].value == departmentId) {
                    filter.selectedIndex = i;
                    break;
                }
            }
        }

        filter.disabled = true;

        // Add visual indicator
        const filterContainer = filter.closest('.form-group, .mb-3');
        if (filterContainer) {
            filterContainer.classList.add('poc-locked');
            const lockIcon = document.createElement('div');
            lockIcon.className = 'poc-lock-icon';
            lockIcon.innerHTML = '<i class="bi bi-lock-fill text-secondary ms-2"></i>';
            filterContainer.appendChild(lockIcon);
        }
    });
}

function addDepartmentHeaderToRequests(departmentId) {
    // Add department header to all future API requests
    if (window.axios) {
        axios.interceptors.request.use(config => {
            config.headers['X-Department-ID'] = departmentId;
            return config;
        });
    }
}

function hideAdminOnlyElements() {
    // Hide elements that should only be visible to admin users
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
    });
}

window.isPOCUser = function() {
    const userInfo = sessionStorage.getItem('user');
    if (!userInfo) return false;

    try {
        const user = JSON.parse(userInfo);
        return user.user_typeId == 5;
    } catch (e) {
        return false;
    }
};
