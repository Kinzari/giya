/**
 * Dashboard-specific notification integration
 * Extends the notification system to work with dashboard elements
 */

class DashboardNotifications {
    constructor() {
        this.lastUpdateTime = null;
        this.init();
    }

    init() {
        // Wait for notification manager to be ready
        this.waitForNotificationManager();

        // Set up event listeners
        this.setupEventListeners();

        // Update UI elements immediately
        setTimeout(() => {
            this.updateDashboardNotifications();
        }, 1000);
    }

    waitForNotificationManager() {
        const checkInterval = setInterval(() => {
            if (window.notificationManager) {
                clearInterval(checkInterval);

                // Override the notification UI update to include dashboard elements
                const originalUpdateUI = window.notificationManager.updateNotificationUI.bind(window.notificationManager);
                window.notificationManager.updateNotificationUI = (counts) => {
                    // Call original method first
                    originalUpdateUI(counts);

                    // Then update dashboard elements
                    this.updateDashboardElements(counts);
                };

                // Force initial update
                window.notificationManager.forceUpdate();
            }
        }, 100);

        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    updateDashboardElements(counts) {
        // Update notification counts
        this.updateElement('dashboard-active-count', counts.active || 0);
        this.updateElement('dashboard-resolved-count', counts.resolved || 0);

        // Update notification dots
        this.updateNotificationDot('active-notification-dot', counts.active > 0);
        this.updateNotificationDot('resolved-notification-dot', counts.resolved > 0);

        // Update connection status
        this.updateConnectionStatus();

        // Update last update time
        this.updateLastUpdateTime();

        // Dashboard notifications updated
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;

            // Add animation effect for changes
            if (element.textContent !== value.toString()) {
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 150);
            }
        }
    }

    updateNotificationDot(elementId, show) {
        const dot = document.getElementById(elementId);
        if (dot) {
            if (show) {
                dot.classList.remove('d-none');
                dot.classList.add('active');
            } else {
                dot.classList.add('d-none');
                dot.classList.remove('active');
            }
        }
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('notification-status');
        if (!statusElement || !window.notificationManager) return;

        let status, icon, colorClass;

        if (window.notificationManager.realTime && window.notificationManager.realTime.isConnected) {
            status = 'Real-time Active';
            icon = 'bi-circle-fill';
            colorClass = 'bg-success';
        } else if (window.notificationManager.intervalId) {
            status = 'Polling Mode';
            icon = 'bi-circle-fill';
            colorClass = 'bg-warning';
        } else {
            status = 'Disconnected';
            icon = 'bi-circle';
            colorClass = 'bg-danger';
        }

        statusElement.className = `badge ${colorClass} me-2`;
        statusElement.innerHTML = `<i class="bi ${icon} me-1"></i>${status}`;
    }

    updateLastUpdateTime() {
        const element = document.getElementById('last-update');
        if (element) {
            const now = new Date();
            element.textContent = now.toLocaleTimeString();
            this.lastUpdateTime = now;
        }
    }

    setupEventListeners() {
        // Mark all active as read
        const markAllActiveBtn = document.getElementById('mark-all-active-read');
        if (markAllActiveBtn) {
            markAllActiveBtn.addEventListener('click', () => {
                this.markAllAsRead('active');
            });
        }

        // Mark all resolved as read
        const markAllResolvedBtn = document.getElementById('mark-all-resolved-read');
        if (markAllResolvedBtn) {
            markAllResolvedBtn.addEventListener('click', () => {
                this.markAllAsRead('resolved');
            });
        }

        // Refresh notifications
        const refreshBtn = document.getElementById('refresh-notifications');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshNotifications();
            });
        }
    }

    async markAllAsRead(type) {
        try {
            const baseURL = sessionStorage.getItem('baseURL');
            if (!baseURL) {
                toastr.error('API URL not found');
                return;
            }

            const userTypeId = sessionStorage.getItem('user_typeId');
            const userDepartmentId = sessionStorage.getItem('user_departmentId');

            const response = await axios.post(`${baseURL}posts.php?action=mark_all_read`, {
                type: type,
                user_type: userTypeId,
                department_id: userDepartmentId
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Type': userTypeId,
                    'X-User-Department': userDepartmentId
                }
            });

            if (response.data.success) {
                toastr.success(`All ${type} posts marked as read`);

                // Force notification update
                if (window.notificationManager) {
                    window.notificationManager.forceUpdate();
                }
            } else {
                toastr.error(`Failed to mark ${type} posts as read`);
            }
        } catch (error) {
            console.error(`Error marking ${type} posts as read:`, error);
            toastr.error(`Error marking ${type} posts as read`);
        }
    }

    refreshNotifications() {
        const refreshBtn = document.getElementById('refresh-notifications');
        if (refreshBtn) {
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1 spinning"></i>Refreshing...';
            refreshBtn.disabled = true;

            // Add spinning animation
            const style = document.createElement('style');
            style.textContent = '.spinning { animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);

            setTimeout(() => {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
                document.head.removeChild(style);
            }, 1000);
        }

        // Force notification update
        if (window.notificationManager) {
            window.notificationManager.forceUpdate();
        }

        toastr.info('Notifications refreshed');
    }

    // Public method to manually update dashboard
    updateDashboardNotifications() {
        if (window.notificationManager) {
            window.notificationManager.forceUpdate();
        }
    }
}

// Initialize dashboard notifications when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on dashboard pages
    if (window.location.pathname.includes('/dashboard/')) {
        window.dashboardNotifications = new DashboardNotifications();

        // Add periodic status updates
        setInterval(() => {
            if (window.dashboardNotifications) {
                window.dashboardNotifications.updateConnectionStatus();
            }
        }, 5000);
    }
});

// Make DashboardNotifications available globally
window.DashboardNotifications = DashboardNotifications;
