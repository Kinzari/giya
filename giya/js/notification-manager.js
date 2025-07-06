/**
 * Notification system for GIYA Dashboard
 * Handles real-time notification updates and visual indicators
 */

class NotificationManager {
    constructor() {
        this.baseURL = typeof getBaseURL === 'function' ? getBaseURL() : sessionStorage.getItem('baseURL');
        this.updateInterval = 5000; // 5 seconds for near real-time updates
        this.intervalId = null;
        this.lastUpdateTime = 0;
        this.isUpdating = false; // Prevent multiple simultaneous updates
        this.cachedCounts = null; // Cache notification counts
        this.tableInitialized = false; // Track if table is ready
        this.init();
    }

    init() {
        // Start polling for notifications with immediate first update
        this.updateNotifications();
        this.startPolling();

        // Listen for post clicks to mark as read
        this.attachPostClickListeners();

        // Watch for table initialization
        this.watchForTableLoad();
    }

    /**
     * Watch for DataTable initialization and apply styling immediately
     */
    watchForTableLoad() {
        // Check every 500ms for table initialization
        const checkInterval = setInterval(() => {
            const tables = document.querySelectorAll('table.dataTable');
            if (tables.length > 0 && !this.tableInitialized) {
                this.tableInitialized = true;
                clearInterval(checkInterval);

                // Apply initial styling immediately
                setTimeout(() => {
                    this.refreshDataTableStyling();
                }, 100);

                // Also update notifications immediately when table is ready
                this.updateNotifications();
            }
        }, 500);

        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    /**
     * Start polling for notification updates
     */
    startPolling() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            this.updateNotifications();
        }, this.updateInterval);
    }

    /**
     * Stop polling for notifications
     */
    stopPolling() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Fetch notification counts from the API
     */
    async updateNotifications() {
        // Prevent multiple simultaneous updates
        if (this.isUpdating) {
            return;
        }

        // Throttle requests to prevent too frequent calls (reduced to 2 seconds)
        const now = Date.now();
        if (now - this.lastUpdateTime < 2000) {
            return;
        }

        this.isUpdating = true;
        this.lastUpdateTime = now;

        try {
            const userTypeId = sessionStorage.getItem('user_typeId');
            const userDepartmentId = sessionStorage.getItem('user_departmentId');

            const response = await axios.get(`${this.baseURL}posts.php?action=get_notification_counts`, {
                headers: {
                    'X-User-Type': userTypeId || '',
                    'X-User-Department': userDepartmentId || ''
                },
                timeout: 3000 // Reduced timeout for faster response
            });            if (response.data.success) {
                const newCounts = response.data.data;

                // Only update UI if counts have changed (optimization)
                if (!this.cachedCounts || JSON.stringify(this.cachedCounts) !== JSON.stringify(newCounts)) {
                    this.cachedCounts = newCounts;
                    this.updateNotificationUI(newCounts);
                }
            }
        } catch (error) {
            // Silent error handling to avoid console spam
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Update the UI with notification counts
     */
    updateNotificationUI(counts) {
        // Update hamburger menu notification
        this.updateHamburgerNotification(counts.total);

        // Update sidebar notifications
        this.updateSidebarNotifications(counts);

        // Refresh DataTable styling if tables are present
        this.refreshDataTableStyling();
    }

    /**
     * Force immediate notification update (for use when table is loaded)
     */
    forceUpdate() {
        this.lastUpdateTime = 0; // Reset throttle
        this.updateNotifications();
    }

    /**
     * Refresh DataTable row styling for unread posts
     */
    refreshDataTableStyling() {
        // Check if there are any DataTables on the page
        const tables = document.querySelectorAll('table.dataTable');

        tables.forEach(table => {
            try {
                if ($.fn.DataTable.isDataTable(table)) {
                    const dataTable = $(table).DataTable();

                    // Redraw the table to refresh row styling
                    $(table).find('tbody tr').each(function() {
                        const rowData = dataTable.row(this).data();
                        if (rowData && rowData.post_id) {
                            // Add post ID as data attribute if missing
                            if (!$(this).attr('data-post-id')) {
                                $(this).attr('data-post-id', rowData.post_id);
                            }

                            // Update bold styling based on read status
                            const isUnread = (rowData.is_read_by_admin === 0 || rowData.is_read_by_admin === null || rowData.is_read_by_admin === '0');

                            if (isUnread) {
                                $(this).css('font-weight', 'bold').addClass('unread-post').attr('data-unread', 'true');
                                $(this).find('td').css('font-weight', 'bold');
                            } else {
                                $(this).css('font-weight', 'normal').removeClass('unread-post').attr('data-unread', 'false');
                                $(this).find('td').css('font-weight', 'normal');
                            }
                        }
                    });
                }
            } catch (error) {
                // Ignore errors for tables that might not be DataTables
            }
        });
    }

    /**
     * Update hamburger menu notification indicator
     */
    updateHamburgerNotification(totalCount) {
        const hamburger = document.querySelector('.sidebar-toggle');
        if (!hamburger) return;

        // Remove existing notification indicator
        const existingBadge = hamburger.querySelector('.notification-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Add notification badge if there are unread items
        if (totalCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = totalCount > 99 ? '99+' : totalCount;
            badge.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: #dc3545;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 10px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;

            hamburger.style.position = 'relative';
            hamburger.appendChild(badge);
        }
    }

    /**
     * Update sidebar notification indicators
     */
    updateSidebarNotifications(counts) {
        // Update Active Posts (use counts.active from API)
        this.updateSidebarLink('latest-posts', counts.active || 0);

        // Update Resolved Posts (use counts.resolved from API)
        this.updateSidebarLink('resolved-posts', counts.resolved || 0);
    }

    /**
     * Update individual sidebar link notification
     */
    updateSidebarLink(menuType, count) {
        const link = document.querySelector(`[data-menu="${menuType}"]`);
        if (!link) return;

        // Look for existing notification dot in the link
        let dot = link.querySelector('.notification-dot');

        if (count > 0) {
            // Show the notification dot if it exists
            if (dot) {
                dot.style.display = 'block';
            } else {
                // Create a new dot if it doesn't exist
                dot = document.createElement('span');
                dot.className = 'notification-dot';
                dot.style.cssText = `
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 10px;
                    height: 10px;
                    background: #dc3545;
                    border: 2px solid white;
                    border-radius: 50%;
                    z-index: 1000;
                    animation: pulse 2s infinite;
                    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
                `;

                link.style.position = 'relative';
                link.appendChild(dot);

                // Add CSS animation if not already added
                this.addNotificationStyles();
            }
        } else {
            // Hide the notification dot if it exists
            if (dot) {
                dot.style.display = 'none';
            }
        }
    }

    /**
     * Add CSS styles for notification animations
     */
    addNotificationStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes pulse {
                0% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
                }
                70% {
                    transform: scale(1.1);
                    box-shadow: 0 0 0 6px rgba(220, 53, 69, 0);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
                }
            }
            .notification-dot {
                animation: pulse 2s infinite !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Mark a post as read when clicked
     */
    async markPostAsRead(postId) {
        try {
            const response = await axios.post(`${this.baseURL}posts.php?action=mark_post_read`, {
                post_id: postId
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 3000 // Quick timeout for immediate feedback
            });

            if (response.data.success) {
                // Immediately update the row styling
                const postRow = document.querySelector(`tr[data-post-id="${postId}"]`);
                if (postRow) {
                    postRow.style.fontWeight = 'normal';
                    postRow.classList.remove('unread-post');
                }

                // Update notification counts immediately (don't wait for next poll)
                setTimeout(() => {
                    this.updateNotifications();
                }, 100);
            }
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Attach click listeners to post rows to mark them as read
     */
    attachPostClickListeners() {
        // Use event delegation to handle dynamically loaded content
        document.addEventListener('click', (event) => {
            const postRow = event.target.closest('tr[data-post-id]');
            if (postRow) {
                const postId = postRow.getAttribute('data-post-id');
                if (postId) {
                    this.markPostAsRead(postId);

                    // Remove bold styling immediately for visual feedback
                    postRow.style.fontWeight = 'normal';
                }
            }
        });
    }

    /**
     * Add styles for unread posts (bold text)
     */
    addUnreadPostStyling(postData) {
        // This method will be called from DataTables render functions
        // to add bold styling for unread posts
        return postData.is_read_by_admin === 0 || postData.is_read_by_admin === null;
    }
}

// Initialize notification manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on dashboard pages
    if (window.location.pathname.includes('/dashboard/')) {
        window.notificationManager = new NotificationManager();
    }
});

// Make NotificationManager available globally
window.NotificationManager = NotificationManager;
