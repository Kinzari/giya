const GiyaTable = {
    defaults: {
        dom: '<"row mb-4"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row mt-4"<"col-sm-12 col-md-4"i><"col-sm-12 col-md-8 d-flex justify-content-end"p>>',
        pageLength: 10,
        processing: true,
        serverSide: false,
        responsive: true,
        autoWidth: false,
        scrollX: false,
        scrollCollapse: true,
        language: {
            emptyTable: "No data available.",
            zeroRecords: "No matching records found",
            searchPlaceholder: "Search",
            search: "",
            lengthMenu: "_MENU_ per page",
            paginate: {
                previous: "<i class='bi bi-chevron-left'></i>",
                next: "<i class='bi bi-chevron-right'></i>"
            },
            processing: "<div class='spinner-border text-primary' role='status'><span class='visually-hidden'>Loading...</span></div>"
        },
        drawCallback: function() {
            $('.dataTables_paginate > .pagination').addClass('pagination-md border-0');
            $('.dataTables_paginate').addClass('mt-3');
            $('.page-item .page-link').css({
                'border': 'none',
                'padding': '0.5rem 1rem',
                'margin': '0 0.2rem'
            });

            $('table.dataTable tbody tr').css('cursor', 'pointer');

            $('table.dataTable tbody td').css({
                'text-align': 'left',
                'vertical-align': 'middle'
            });

            $('table.dataTable thead th').css({
                'background-color': '#155f37',
                'color': 'white',
                'text-align': 'center'
            });

            GiyaTable.addPageNumberInput(this);
        }
    },

    initPostsTable: function(tableSelector, action, rowClickHandler = null, additionalOptions = {}) {
        window.lastInitTime = Date.now();
        window.lastInitSelector = tableSelector;
        window.lastInitAction = action;

        if (!window.giyaTables) {
            window.giyaTables = {};
        }

        const trackingKey = tableSelector.replace('#', '');
        if (!window[trackingKey]) {
            window[trackingKey] = {
                initialized: false,
                attempts: 0,
                lastAttempt: Date.now(),
                element: document.querySelector(tableSelector),
                action: action
            };
        }

        if (window.giyaTables[tableSelector]) {
            try {
                const existingTable = $(tableSelector).DataTable();
                if (existingTable) {
                    setTimeout(() => {
                        const tableEl = document.querySelector(tableSelector);
                        if (tableEl) tableEl.style.display = '';
                    }, 50);

                    return existingTable;
                }
            } catch (error) {
                // Continue with initialization
            }
        }

        const originalTable = document.querySelector(tableSelector);
        if (!originalTable) {
            return null;
        }

        if (!window.tableOriginals) window.tableOriginals = {};
        window.tableOriginals[tableSelector] = originalTable.cloneNode(true);

        if ($.fn.DataTable.isDataTable(tableSelector)) {
            $(tableSelector).DataTable().destroy();
        }

        const columns = [
            {
                title: "Status",
                data: "post_status",
                render: this.renderStatusBadge,
                width: "100px"
            },
            {
                title: "Classification",
                data: "user_typeId",
                render: function(data, type, row) {
                    if (data === null || data === undefined || data === '') {
                        if (row.user_typeId) {
                            data = row.user_typeId;
                        }
                    }

                    let typeId = parseInt(data, 10);

                    if (data === null || data === undefined || data === '' || isNaN(typeId)) {
                        return 'Unknown';
                    }

                    switch(typeId) {
                        case 1: return 'Visitor';
                        case 2: return 'Student';
                        case 3: return 'Faculty';
                        case 4: return 'Employee';
                        case 5: return 'POC';
                        case 6: return 'Administrator / SSG';
                        default: return 'Unknown (Type ' + typeId + ')';
                    }
                },
                width: "120px"
            },
            {
                title: "Full Name",
                data: "user_fullname"
            },
            {
                title: "Type",
                data: "postType_name",
                width: "120px"
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
                data: null,
                width: "150px",
                render: function(data, type, row) {
                    return row.latest_activity_date || row.post_date || '';
                }
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
        ];

        // Use centralized session management
        const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);

        const userTypeId = GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);
        const userDepartmentId = GiyaSession.get(GIYA_SESSION_KEYS.USER_DEPARTMENT_ID);

        if (!window.tableData) window.tableData = {};

        const staticConfig = {
            ajax: {
                url: `${baseURL || ''}posts.php?action=${action}`,
                type: 'GET',
                dataType: 'json',
                cache: false,
                headers: {
                    'X-User-Type': userTypeId || '',
                    'X-User-Department': userDepartmentId || ''
                },
                dataSrc: function(json) {
                    let dataArray = [];

                    if (json && json.data && Array.isArray(json.data)) {
                        dataArray = json.data;
                    } else if (json && json.success === true && Array.isArray(json.data)) {
                        dataArray = json.data;
                    } else if (json && json.success === true && typeof json.data === 'object') {
                        dataArray = [json.data];
                    } else if (Array.isArray(json)) {
                        dataArray = json;
                    }

                    window.tableData[tableSelector] = dataArray;

                    return dataArray;
                },
                error: function(xhr, status, error) {
                    if (window.tableData && window.tableData[tableSelector]) {
                        return window.tableData[tableSelector];
                    }
                    return [];
                }
            },
            columns: columns,
            destroy: false,
            retrieve: true,
            processing: true,
            responsive: false,
            deferRender: false,
            stateSave: false,
            lengthChange: true,
            autoWidth: false,
            searching: true,
            ordering: true,
            info: true,
            paging: true,
            order: [[6, 'desc'], [7, 'desc']]  // Order by Date then Time Since Last Activity
        };

        const defaultsMod = { ...this.defaults };
        defaultsMod.drawCallback = function(settings) {
            const tableElement = document.querySelector(tableSelector);
            if (tableElement) {
                tableElement.style.display = '';
                tableElement.style.visibility = 'visible';
            }

            $('table.dataTable thead th').css({
                'background-color': '#155f37',
                'color': 'white',
                'text-align': 'left'
            });

            // Add post IDs and unread styling to rows
            const table = $(tableSelector).DataTable();

            $(tableSelector + ' tbody tr').each(function(index) {
                const rowData = table.row(this).data();

                if (rowData && rowData.post_id) {
                    // Add post ID as data attribute
                    $(this).attr('data-post-id', rowData.post_id);

                    // Add bold styling for unread posts
                    const isUnread = (rowData.is_read_by_admin === 0 || rowData.is_read_by_admin === null || rowData.is_read_by_admin === '0');

                    if (isUnread) {
                        $(this).css('font-weight', 'bold');
                        $(this).addClass('unread-post');
                        $(this).attr('data-unread', 'true');
                        // Apply to all cells in the row
                        $(this).find('td').css('font-weight', 'bold');
                    } else {
                        $(this).css('font-weight', 'normal');
                        $(this).removeClass('unread-post');
                        $(this).attr('data-unread', 'false');
                        $(this).find('td').css('font-weight', 'normal');
                    }
                }
            });

            // Trigger immediate notification update if NotificationManager exists
            if (window.notificationManager) {
                setTimeout(() => {
                    window.notificationManager.refreshDataTableStyling();
                    window.notificationManager.forceUpdate();
                }, 100);
            }

            try {
                GiyaTable.addPageNumberInput(this);
            } catch (e) {
                // Ignore errors
            }
        };

        const finalOptions = $.extend(true,
            {},
            defaultsMod,
            staticConfig,
            additionalOptions
        );

        let table = null;
        try {
            table = $(tableSelector).DataTable(finalOptions);

            window.giyaTables[tableSelector] = table;
            window[trackingKey].initialized = true;

            if (!window.allTables) window.allTables = {};
            window.allTables[tableSelector] = table;

            if (rowClickHandler) {
                $(tableSelector + ' tbody').on('click', 'tr', function() {
                    const data = table.row(this).data();
                    if (data) {
                        rowClickHandler(data);
                    }
                });
            } else {
                $(tableSelector + ' tbody').on('click', 'tr', function() {
                    const data = table.row(this).data();
                    if (data && window.showPostDetails) {
                        window.showPostDetails(data.post_id);
                    }
                });
            }

            $(tableSelector).addClass('table-hover');
            $(tableSelector + ' tbody').addClass('cursor-pointer');

            monitorTableVisibility(tableSelector, table);

            return table;
        } catch (e) {
            setTimeout(() => {
                try {
                    if (!$.fn.DataTable.isDataTable(tableSelector)) {
                        const container = $(tableSelector).closest('.table-responsive, .card-body');
                        if (container.length && window.tableOriginals && window.tableOriginals[tableSelector]) {
                            container.empty();
                            container.append(window.tableOriginals[tableSelector].cloneNode(true));

                            $(tableSelector).DataTable({
                                ajax: {
                                    url: `${GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL) || ''}posts.php?action=${action}`,
                                    headers: {
                                        'X-User-Type': GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID) || '',
                                        'X-User-Department': GiyaSession.get(GIYA_SESSION_KEYS.USER_DEPARTMENT_ID) || ''
                                    }
                                },
                                columns: columns
                            });
                        }
                    }
                } catch (recoverError) {
                    // Recovery failed
                }
            }, 500);

            return null;
        }
    },

    attachTableClickHandlers: function(tableSelector, table, rowClickHandler) {
        if (rowClickHandler) {
            $(tableSelector + ' tbody').on('click', 'tr', function() {
                const data = table.row(this).data();
                if (data) {
                    rowClickHandler(data);
                }
            });
        } else {
            $(tableSelector + ' tbody').on('click', 'tr', function() {
                const data = table.row(this).data();
                if (data && window.showPostDetails) {
                    window.showPostDetails(data.post_id);
                }
            });
        }

        $(tableSelector).addClass('table-hover');
        $(tableSelector + ' tbody').addClass('cursor-pointer');
    },

    attachTableEventListeners: function(tableSelector, table) {
        table.on('xhr.dt', function (e, settings, json, xhr) {
            setTimeout(() => {
                const tableEl = document.querySelector(tableSelector);
                if (tableEl) {
                    tableEl.style.display = '';
                }
            }, 50);
        });

        table.on('draw.dt', function() {
            setTimeout(() => {
                const tableEl = document.querySelector(tableSelector);
                if (tableEl) {
                    tableEl.style.display = '';
                }
            }, 50);
        });
    },

    renderStatusBadge: function(data) {
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
    },

    attachFiltering: function(table, filterSelector) {
        const filterFunction = function(settings, data, dataIndex) {
            const statusCell = data[0];
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = statusCell;
            const statusText = tempDiv.textContent.trim().toLowerCase();

            switch(window.currentFilter) {
                case 'all':
                    return statusText !== 'resolved';
                case 'pending':
                    return statusText === 'pending';
                case 'ongoing':
                    return statusText === 'ongoing';
                case 'resolved':
                    return statusText === 'resolved';
                default:
                    return true;
            }
        };

        $.fn.dataTable.ext.search.push(filterFunction);
        window.currentFilter = 'all';

        $(filterSelector).on('click', function() {
            const filterValue = $(this).data('filter').toLowerCase();
            window.currentFilter = filterValue;

            $(filterSelector).removeClass('active');
            $(this).addClass('active');

            table.draw();
        });
    },

    refreshTables: function() {
        if (window.allTables) {
            Object.keys(window.allTables).forEach(tableSelector => {
                try {
                    const table = window.allTables[tableSelector];
                    if (table && typeof table.ajax === 'object' && typeof table.ajax.reload === 'function') {
                        table.ajax.reload(function() {
                            const tableEl = document.querySelector(tableSelector);
                            if (tableEl) {
                                tableEl.style.display = '';
                                tableEl.style.visibility = 'visible';
                            }
                        }, false);
                    }
                } catch (error) {
                    // Ignore errors
                }
            });
        }
    },

    addPageNumberInput: function(table) {
        const api = table.api();
        if (api.page.info().pages <= 1) return;

        setTimeout(function() {
            $(api.table().container()).find('.page-number-input-container').remove();

            const inputContainer = $('<div class="page-number-input-container ms-2"></div>');
            const inputGroup = $('<div class="input-group input-group-sm"></div>');
            const inputLabel = $('<span class="input-group-text">Page</span>');
            const input = $('<input type="number" min="1" class="page-number-input form-control">');
            const totalPages = $(`<span class="input-group-text">of ${api.page.info().pages}</span>`);

            inputGroup.append(inputLabel);
            inputGroup.append(input);
            inputGroup.append(totalPages);
            inputContainer.append(inputGroup);

            input.val(api.page.info().page + 1);

            input.on('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const pageNum = parseInt($(this).val(), 10);
                    const maxPage = api.page.info().pages;

                    if (pageNum > 0 && pageNum <= maxPage) {
                        api.page(pageNum - 1).draw('page');
                    } else {
                        $(this).val(api.page.info().page + 1);
                        toastr.warning(`Please enter a page number between 1 and ${maxPage}`);
                    }
                }
            });

            const paginationContainer = $(api.table().container()).find('.dataTables_paginate');

            paginationContainer.prepend(inputContainer);

            paginationContainer.css({
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'flex-end'
            });
        }, 100);
    },

    updatePageInputValue: function(api) {
        const container = $(api.table().container());
        const input = container.find('.page-number-input');
        const totalPagesSpan = container.find('.page-number-input-container .input-group-text:last-child');

        if (input.length > 0) {
            input.val(api.page.info().page + 1);

            if (totalPagesSpan.length > 0) {
                totalPagesSpan.text(`of ${api.page.info().pages}`);
            }
        }
    }
};

$(document).on('init.dt', function(e, settings) {
    const api = new $.fn.dataTable.Api(settings);
    const tableId = $(api.table().node()).attr('id');

    setTimeout(function() {
        const rowCount = api.rows().count();

        if (rowCount === 0 && window.lastProcessedTableData &&
            window.lastProcessedTableData.length > 0) {
            api.ajax.reload();
        }
    }, 500);
});

$(document).on('draw.dt', function(e, settings) {
    const api = new $.fn.dataTable.Api(settings);

    setTimeout(function() {
        if ($(api.table().container()).find('.page-number-input-container').length === 0) {
            GiyaTable.addPageNumberInput({api: function() { return api; }});
        } else {
            GiyaTable.updatePageInputValue(api);
        }
    }, 50);
});

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const tableContainers = document.querySelectorAll('.student-table-container');
        tableContainers.forEach(container => {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        const tables = {
                            '#latestPostsTable': window.originalTables && window.originalTables['#latestPostsTable'],
                            '#postsTable': window.originalTables && window.originalTables['#postsTable'],
                            '#resolvedPostsTable': window.originalTables && window.originalTables['#resolvedPostsTable']
                        };

                        for (const [selector, originalTable] of Object.entries(tables)) {
                            if (originalTable && !document.querySelector(selector)) {
                                const tableResponsive = container.querySelector('.table-responsive');
                                if (tableResponsive) {
                                    tableResponsive.appendChild(originalTable);
                                }
                            }
                        }
                    }
                }
            });

            observer.observe(container, { childList: true, subtree: true });

            if (!window.tableObservers) window.tableObservers = [];
            window.tableObservers.push(observer);
        });
    }, 500);
});

window.GiyaTable = GiyaTable;

$(document).ready(function() {
    setTimeout(() => {
        const tables = [
            '#latestPostsTable',
            '#postsTable',
            '#resolvedPostsTable',
            '#studentsTable',
            '#employeeTable'
        ];

        tables.forEach(tableId => {
            const table = document.querySelector(tableId);
            if (!table) return;

            const container = $(tableId).closest('.card, .student-table-container')[0];
            if (!container) return;

            if (!window.originalTableHTML) window.originalTableHTML = {};
            window.originalTableHTML[tableId] = table.outerHTML;

            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        if (!document.querySelector(tableId) && window.originalTableHTML[tableId]) {
                            const tableContainer = $(container).find('.table-responsive, .card-body')[0];
                            if (tableContainer) {
                                tableContainer.innerHTML = window.originalTableHTML[tableId];

                                if (window.giyaTables && window.giyaTables[tableId]) {
                                    const tableAction = tableId === '#latestPostsTable'
                                        ? 'get_latest_posts'
                                        : tableId === '#postsTable'
                                            ? getPostsAction()
                                            : 'get_resolved_posts';

                                    setTimeout(() => {
                                        if (!$.fn.DataTable.isDataTable(tableId)) {
                                            GiyaTable.initPostsTable(tableId, tableAction);
                                        }
                                    }, 100);
                                }
                            }
                        }
                    }
                }
            });

            observer.observe(container, { childList: true, subtree: true });

            if (!window.tableObservers) window.tableObservers = {};
            window.tableObservers[tableId] = observer;
        });
    }, 500);

    function getPostsAction() {
        const path = window.location.pathname.toLowerCase();
        const userTypeId = window.userTypeId || GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID);
        const departmentId = window.departmentId || GiyaSession.get(GIYA_SESSION_KEYS.USER_DEPARTMENT_ID);

        if (path.includes('students.html')) {
            return (userTypeId == 5 && departmentId) ?
                `get_student_posts_by_department&department_id=${departmentId}` :
                "get_student_posts";
        } else if (path.includes('visitors.html')) {
            return (userTypeId == 5 && departmentId) ?
                `get_visitor_posts_by_department&department_id=${departmentId}` :
                "get_visitor_posts";
        } else if (path.includes('employees.html')) {
            return (userTypeId == 5 && departmentId) ?
                `get_employee_posts_by_department&department_id=${departmentId}` :
                "get_employee_posts";
        }
        return 'get_latest_posts';
    }
});

function monitorTableVisibility(tableSelector, tableInstance) {
    if (!window.tableMonitors) window.tableMonitors = {};
    window.tableMonitors[tableSelector] = {
        lastChecked: Date.now(),
        instance: tableInstance,
        visible: true
    };

    const monitorInterval = setInterval(() => {
        const tableElement = document.querySelector(tableSelector);

        if (window.tableMonitors[tableSelector]) {
            window.tableMonitors[tableSelector].lastChecked = Date.now();
            window.tableMonitors[tableSelector].visible =
                tableElement &&
                (tableElement.style.display !== 'none') &&
                (tableElement.offsetParent !== null);
        }

        if (!tableElement ||
            tableElement.style.display === 'none' ||
            tableElement.offsetParent === null) {

            if (tableElement) {
                tableElement.style.display = '';
                tableElement.style.visibility = 'visible';
            } else if (window.tableOriginals && window.tableOriginals[tableSelector]) {
                const container = $(tableSelector).closest('.table-responsive, .card-body');
                if (container.length) {
                    container.append(window.tableOriginals[tableSelector].cloneNode(true));

                    if (!$.fn.DataTable.isDataTable(tableSelector) && window.tableData && window.tableData[tableSelector]) {
                        $(tableSelector).DataTable({
                            data: window.tableData[tableSelector],
                            columns: window.giyaTableColumns || GiyaTable.getDefaultColumns()
                        });
                    }
                }
            }
        }
    }, 200);

    if (!window.monitorIntervals) window.monitorIntervals = {};
    window.monitorIntervals[tableSelector] = monitorInterval;

    window.addEventListener('beforeunload', () => {
        if (window.monitorIntervals && window.monitorIntervals[tableSelector]) {
            clearInterval(window.monitorIntervals[tableSelector]);
        }
    });
}

GiyaTable.getDefaultColumns = function() {
    return [
        {
            title: "Status",
            data: "post_status",
            render: this.renderStatusBadge,
        },
        {
            title: "Classification",
            data: "user_typeId",
        },
        {
            title: "Full Name",
            data: "user_fullname"
        },
        {
            title: "Type",
            data: "postType_name",
        },
        {
            title: "Department",
            data: "department_name",
        },
        {
            title: "Campus",
            data: "campus_name",
        },
        {
            title: "Date",
            data: "post_date",
        },
        {
            title: "Time",
            data: "post_time",
        }
    ];
};

document.addEventListener('DOMContentLoaded', function() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        table.dataTable,
        table.table,
        table#latestPostsTable,
        table#postsTable,
        table#resolvedPostsTable {
            display: table !important;
            visibility: visible !important;
        }

        .table-responsive {
            display: block !important;
            visibility: visible !important;
            overflow: auto !important;
        }
    `;
    document.head.appendChild(styleEl);

    const observer = new MutationObserver((mutations) => {
        const activeSelectors = [];
        if (window.tableMonitors) {
            activeSelectors.push(...Object.keys(window.tableMonitors));
        }

        const tablesAffected = mutations.some(mutation => {
            return activeSelectors.some(selector => {
                return mutation.target.matches &&
                       (mutation.target.matches(selector) ||
                        mutation.target.querySelector(selector));
            });
        });

        if (tablesAffected) {
            activeSelectors.forEach(selector => {
                const table = document.querySelector(selector);
                if (table) {
                    if (table.style.display === 'none' || table.offsetParent === null) {
                        table.style.display = '';
                        table.style.visibility = 'visible';
                    }
                }
            });
        }
    });

    observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['style', 'class']
    });

    window.globalVisibilityObserver = observer;
});

window.GiyaTable = GiyaTable;
