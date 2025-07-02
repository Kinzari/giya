# MasterTable.js Refactoring Guide

This document provides a guide for refactoring all masterfile JavaScript files to use the standardized `MasterTable.js` utility for consistent and maintainable code.

## What We've Completed

✅ **Enhanced MasterTable.js** with additional utility functions:
- `renderActionButtons()` - with custom class names support
- `renderStatusBadge()` - for simple status display
- `renderStatusButton()` - for clickable status buttons
- `renderCountBadge()` - for count displays with custom colors
- `renderFullName()` - for consistent name formatting
- `createAjaxConfig()` - for standardized AJAX configuration

✅ **Added MasterTable.js** to all HTML files:
- master-faq.html ✅ (already had it)
- master-courses.html ✅ (already had it)
- master-employees.html ✅
- master-students.html ✅
- master-departments.html ✅
- master-campus.html ✅
- master-inquiry-types.html ✅
- master-poc.html ✅
- master-visitors.html ✅

✅ **Refactored JavaScript files**:
- master-faq.js ✅ (was already using MasterTable)
- master-employees.js ✅
- master-courses.js ✅
- master-students.js ✅
- master-departments.js ✅

## Remaining Files to Refactor

🔄 **Still need refactoring**:
- master-campus.js
- master-inquiry-types.js
- master-poc.js
- master-visitors.js

## Refactoring Pattern

### Before (Old Pattern):
```javascript
function initTable() {
    try {
        if ($.fn.DataTable.isDataTable('#tableId')) {
            $('#tableId').DataTable().destroy();
        }

        const baseUrl = getBaseURL();
        const userType = sessionStorage.getItem('user_typeId');

        table = $('#tableId').DataTable({
            ajax: {
                url: `${baseUrl}endpoint.php`,
                dataSrc: function(response) {
                    if (!response || !response.success) {
                        return [];
                    }
                    return response.data || [];
                },
                error: function(xhr, error, thrown) {
                    console.error('Error:', error, thrown);
                    return [];
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-User-Type', userType || '6');
                }
            },
            columns: [
                { data: 'field1' },
                {
                    data: 'status',
                    render: function(data, type, row) {
                        const isActive = Number(data) === 1;
                        const badgeClass = isActive ? "bg-success" : "bg-danger";
                        const statusText = isActive ? "Active" : "Inactive";
                        return `<span class="badge ${badgeClass}">${statusText}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    render: function(data) {
                        return `<div class="d-flex gap-1">
                            <button class="btn btn-sm btn-primary view-item" data-id="${data.id}">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-primary edit-item" data-id="${data.id}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-item" data-id="${data.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>`;
                    }
                }
            ],
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
        });
    } catch (error) {
        console.error('Error initializing table:', error);
    }
}
```

### After (New Pattern):
```javascript
function initTable() {
    try {
        if ($.fn.DataTable.isDataTable('#tableId')) {
            $('#tableId').DataTable().destroy();
        }

        const columns = [
            { data: 'field1' },
            {
                data: 'status',
                render: function(data, type, row) {
                    return MasterTable.renderStatusBadge(data);
                    // OR for clickable status:
                    // return MasterTable.renderStatusButton(data, row.id);
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data) {
                    return MasterTable.renderActionButtons(data.id, {
                        view: true,
                        edit: true,
                        delete: true,
                        viewClass: 'view-item',
                        editClass: 'edit-item',
                        deleteClass: 'delete-item'
                    });
                }
            }
        ];

        const options = {
            ajax: MasterTable.createAjaxConfig('endpoint.php'),
            language: {
                emptyTable: "No data available",
                zeroRecords: "No matching records found",
                searchPlaceholder: "Search..."
            }
        };

        table = MasterTable.initTable('#tableId', columns, options);
    } catch (error) {
        console.error('Error initializing table:', error);
    }
}
```

## Key Benefits

1. **Reduced Code Duplication**: Removed ~50+ lines of repetitive DataTable configuration per file
2. **Consistent UI**: All tables now have identical styling, language settings, and behavior
3. **Easier Maintenance**: Changes to table behavior only need to be made in MasterTable.js
4. **Better Error Handling**: Centralized AJAX error handling
5. **Standardized Action Buttons**: Consistent button styling and spacing across all tables

## MasterTable.js Utility Functions

### `MasterTable.initTable(selector, columns, options)`
- Initializes a DataTable with standard configuration
- Merges custom options with defaults

### `MasterTable.renderActionButtons(id, options)`
- Generates consistent action button layouts
- Supports custom CSS classes for event binding
- Options: view, edit, delete, reset, customButtons

### `MasterTable.renderStatusBadge(status)`
- Simple status badge (Active/Inactive)

### `MasterTable.renderStatusButton(status, id, dataAttribute)`
- Clickable status button for status toggles

### `MasterTable.renderCountBadge(count, className)`
- Count badges with customizable colors

### `MasterTable.renderFullName(firstname, lastname, middlename, suffix)`
- Consistent name formatting: "Last, First M. Suffix"

### `MasterTable.createAjaxConfig(endpoint, userType)`
- Standardized AJAX configuration with error handling
- Automatic header setting for authentication

## Next Steps

To complete the refactoring, apply the pattern above to the remaining 4 masterfile JavaScript files:
- master-campus.js
- master-inquiry-types.js
- master-poc.js
- master-visitors.js

This will result in a fully consistent and maintainable masterfile codebase.
