/**
 * Real-time notification system using Server-Sent Events (SSE)
 * This provides instant notification updates without polling delays
 */

class RealTimeNotifications {
    constructor() {
        this.baseURL = typeof getBaseURL === 'function' ? getBaseURL() : sessionStorage.getItem('baseURL');
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 seconds
        this.fallbackToPolling = false;

        // Initialize SSE connection
        this.initSSE();
    }

    /**
     * Initialize Server-Sent Events connection
     */
    initSSE() {
        try {
            const userTypeId = sessionStorage.getItem('user_typeId');
            const userDepartmentId = sessionStorage.getItem('user_departmentId');

            const sseUrl = `${this.baseURL}sse-notifications.php?userTypeId=${userTypeId || ''}&departmentId=${userDepartmentId || ''}`;

            this.eventSource = new EventSource(sseUrl);

            this.eventSource.onopen = (event) => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleSSEMessage(data);
                } catch (error) {
                    // Silent error handling
                }
            };

            this.eventSource.onerror = (event) => {
                this.isConnected = false;
                this.handleConnectionError();
            };

        } catch (error) {
            // Failed to initialize SSE
            this.fallbackToPolling = true;
            this.initPollingFallback();
        }
    }

    /**
     * Handle incoming SSE messages
     */
    handleSSEMessage(data) {
        switch (data.type) {
            case 'connected':
                // SSE connection established
                break;

            case 'notification_update':
                // Update UI immediately with new notification data
                if (window.notificationManager) {
                    window.notificationManager.updateNotificationUI(data.data);
                }
                break;

            case 'heartbeat':
                // Connection is alive
                break;

            case 'error':
                // SSE Error occurred
                this.handleConnectionError();
                break;

            case 'disconnected':
                // SSE connection closed by server
                this.isConnected = false;
                break;
        }
    }

    /**
     * Handle connection errors and implement reconnection logic
     */
    handleConnectionError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Attempting to reconnect

            setTimeout(() => {
                this.closeConnection();
                this.initSSE();
            }, this.reconnectDelay);
        } else {
            // Max reconnection attempts reached. Falling back to polling.
            this.fallbackToPolling = true;
            this.closeConnection();
            this.initPollingFallback();
        }
    }

    /**
     * Fallback to polling when SSE is not available
     */
    initPollingFallback() {
        // Falling back to polling mode

        // Use the existing NotificationManager polling system
        if (window.notificationManager) {
            // Reduce polling interval for better responsiveness
            window.notificationManager.updateInterval = 3000; // 3 seconds
            window.notificationManager.startPolling();
        }
    }

    /**
     * Close SSE connection
     */
    closeConnection() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
    }

    /**
     * Force immediate notification update
     */
    forceUpdate() {
        if (this.isConnected && window.notificationManager) {
            // SSE will handle updates automatically
            return;
        } else if (window.notificationManager) {
            // Fall back to manual update
            window.notificationManager.forceUpdate();
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            type: this.fallbackToPolling ? 'polling' : 'sse',
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Simple initialization for real-time notifications
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on dashboard pages
    if (window.location.pathname.includes('/dashboard/')) {
        // Initialize real-time notifications if SSE is supported
        if (typeof EventSource !== 'undefined') {
            window.realTimeNotifications = new RealTimeNotifications();
        }
    }
});

// Make RealTimeNotifications class available globally
window.RealTimeNotifications = RealTimeNotifications;
