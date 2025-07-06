/**
 * Time utility functions for calculating and formatting time differences
 */

/**
 * Calculate time difference from given datetime to now and return human-readable format
 * @param {string} dateStr - Date string in format 'MM-DD-YYYY' or 'YYYY-MM-DD'
 * @param {string} timeStr - Time string in format 'HH:MM:SS'
 * @returns {string} Human-readable time difference (e.g., "2h 30m", "1d 3hr 15m", "3m")
 */
function getTimeSinceLastActivity(dateStr, timeStr) {
    if (!dateStr || !timeStr) {
        return 'Unknown';
    }

    try {
        // Convert MM-DD-YYYY to YYYY-MM-DD for proper parsing
        let formattedDate = dateStr;
        if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
            const parts = dateStr.split('-');
            formattedDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
        }

        const activityTime = new Date(`${formattedDate} ${timeStr}`);
        const now = new Date();

        const diffMs = now - activityTime;

        if (diffMs < 0) {
            return 'Just now';
        }

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
        const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));

        if (diffMonths > 0) {
            const remainingDays = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
            const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            if (remainingDays > 0) {
                return remainingHours > 0 ? `${diffMonths}mo ${remainingDays}d ${remainingHours}hr` : `${diffMonths}mo ${remainingDays}d`;
            }
            return `${diffMonths}mo`;
        } else if (diffWeeks > 0) {
            const remainingDays = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));
            const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            if (remainingDays > 0) {
                return remainingHours > 0 ? `${diffWeeks}w ${remainingDays}d ${remainingHours}hr` : `${diffWeeks}w ${remainingDays}d`;
            }
            return `${diffWeeks}w`;
        } else if (diffDays > 0) {
            const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (remainingHours > 0) {
                return remainingMinutes > 0 ? `${diffDays}d ${remainingHours}hr ${remainingMinutes}m` : `${diffDays}d ${remainingHours}hr`;
            }
            return `${diffDays}d`;
        } else if (diffHours > 0) {
            const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes}m`;
        } else {
            return 'Just now';
        }
    } catch (error) {
        console.error('Error calculating time difference:', error);
        return 'Unknown';
    }
}

/**
 * Format a datetime string to show relative time
 * @param {string} dateTimeStr - Full datetime string 'YYYY-MM-DD HH:MM:SS'
 * @returns {string} Human-readable time difference
 */
function getTimeSinceDateTime(dateTimeStr) {
    if (!dateTimeStr) {
        return 'Unknown';
    }

    try {
        const activityTime = new Date(dateTimeStr);
        const now = new Date();

        const diffMs = now - activityTime;

        if (diffMs < 0) {
            return 'Just now';
        }

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
        const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));

        if (diffMonths > 0) {
            const remainingDays = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
            const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            if (remainingDays > 0) {
                return remainingHours > 0 ? `${diffMonths}mo ${remainingDays}d ${remainingHours}hr` : `${diffMonths}mo ${remainingDays}d`;
            }
            return `${diffMonths}mo`;
        } else if (diffWeeks > 0) {
            const remainingDays = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));
            const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            if (remainingDays > 0) {
                return remainingHours > 0 ? `${diffWeeks}w ${remainingDays}d ${remainingHours}hr` : `${diffWeeks}w ${remainingDays}d`;
            }
            return `${diffWeeks}w`;
        } else if (diffDays > 0) {
            const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (remainingHours > 0) {
                return remainingMinutes > 0 ? `${diffDays}d ${remainingHours}hr ${remainingMinutes}m` : `${diffDays}d ${remainingHours}hr`;
            }
            return `${diffDays}d`;
        } else if (diffHours > 0) {
            const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes}m`;
        } else {
            return 'Just now';
        }
    } catch (error) {
        console.error('Error calculating time difference:', error);
        return 'Unknown';
    }
}

// Make functions available globally
window.getTimeSinceLastActivity = getTimeSinceLastActivity;
window.getTimeSinceDateTime = getTimeSinceDateTime;
