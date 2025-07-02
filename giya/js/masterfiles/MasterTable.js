if (typeof getBaseURL !== 'function') {
    window.getBaseURL = function() {
        return sessionStorage.getItem("baseURL");
    };
}

const MasterTable = {
    initTable: function(selector, columns, options = {}) {
        const baseURL = getBaseURL();

        const defaultOptions = {
            responsive: true,
            language: {
                emptyTable: "No data available",
                zeroRecords: "No matching records found",
                searchPlaceholder: "Search...",
                search: "",
                lengthMenu: "_MENU_ per page",
                paginate: {
                    previous: "<i class='bi bi-chevron-left'></i>",
                    next: "<i class='bi bi-chevron-right'></i>"
                }
            },
            initComplete: function() {
                $('.dataTables_filter input')
                    .attr('placeholder', 'Search...')
                    .addClass('form-control-search');
            }
        };

        const mergedOptions = { ...defaultOptions, ...options, columns };
        const table = $(selector).DataTable(mergedOptions);
        return table;
    },

    renderActionButtons: function(id, options = {}) {
        const {
            view = true,
            edit = true,
            delete: deleteBtn = true,
            reset = false,
            customButtons = [],
            viewClass = 'view-btn',
            editClass = 'edit-btn',
            deleteClass = 'delete-btn',
            resetClass = 'reset-btn'
        } = options;
        let html = '<div class="d-flex gap-1">';

        if (view) {
            html += `<button class="btn btn-sm btn-primary ${viewClass}" data-id="${id}">
                <i class="bi bi-eye"></i>
            </button>`;
        }

        if (edit) {
            html += `<button class="btn btn-sm btn-primary ${editClass}" data-id="${id}">
                <i class="bi bi-pencil"></i>
            </button>`;
        }

        if (reset) {
            html += `<button class="btn btn-sm btn-warning ${resetClass}" data-id="${id}">
                <i class="bi bi-key"></i>
            </button>`;
        }

        // Add custom buttons
        customButtons.forEach(button => {
            html += `<button class="btn btn-sm ${button.class}" ${button.attributes || ''} data-id="${id}">
                <i class="${button.icon}"></i>
            </button>`;
        });

        if (deleteBtn) {
            html += `<button class="btn btn-sm btn-danger ${deleteClass}" data-id="${id}">
                <i class="bi bi-trash"></i>
            </button>`;
        }

        html += '</div>';
        return html;
    },

    renderStatusBadge: function(status) {
        const isActive = Number(status) === 1;
        const badgeClass = isActive ? "bg-success" : "bg-danger";
        const statusText = isActive ? "Active" : "Inactive";

        return `<span class="badge ${badgeClass}">${statusText}</span>`;
    },

    // Utility function for rendering clickable status buttons
    renderStatusButton: function(status, id, dataAttribute = 'data-active') {
        const isActive = Number(status) === 1;
        const btnClass = isActive ? 'btn-success' : 'btn-danger';
        const statusText = isActive ? 'Active' : 'Inactive';

        return `<button class="btn btn-sm status-btn ${btnClass}"
                    data-id="${id}"
                    ${dataAttribute}="${status}">
                    ${statusText}
                </button>`;
    },

    // Utility function for rendering count badges
    renderCountBadge: function(count, className = 'bg-primary') {
        return `<span class="badge ${className}">${count || 0}</span>`;
    },

    // Utility function for rendering full names
    renderFullName: function(firstname, lastname, middlename = null, suffix = null) {
        let fullName = `${lastname}, ${firstname}`;
        if (middlename) {
            fullName += ` ${middlename.charAt(0)}.`;
        }
        if (suffix) {
            fullName += ` ${suffix}`;
        }
        return fullName;
    },

    // Utility function to create AJAX configuration
    createAjaxConfig: function(endpoint, userType = null) {
        const baseURL = getBaseURL();
        const userTypeId = userType || sessionStorage.getItem('user_typeId') || '6';

        return {
            url: `${baseURL}${endpoint}`,
            dataSrc: function(response) {
                if (!response || !response.success) {
                    console.error('Error loading data:', response?.message || 'Unknown error');
                    return [];
                }
                return response.data || [];
            },
            error: function(xhr, error, thrown) {
                console.error('AJAX Error:', error, thrown);
                return [];
            },
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-User-Type', userTypeId);
            }
        };
    }
};

window.MasterTable = MasterTable;
