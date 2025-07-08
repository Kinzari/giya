// GIYA Session Storage Utilities
// Helper functions for common session storage operations

window.GiyaUtils = {

    // User role checking utilities
    isAdmin: function() {
        return GiyaSession.get(GIYA_SESSION_KEYS.IS_ADMIN) === 'true' ||
               GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID) === '6';
    },

    isPOC: function() {
        return GiyaSession.get(GIYA_SESSION_KEYS.IS_POC) === 'true' ||
               GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID) === '5';
    },

    isRegularUser: function() {
        const userTypeId = parseInt(GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID));
        return userTypeId >= 1 && userTypeId <= 4;
    },

    // Get user's full name
    getUserFullName: function() {
        const firstName = GiyaSession.get(GIYA_SESSION_KEYS.USER_FIRSTNAME, '');
        const middleName = GiyaSession.get(GIYA_SESSION_KEYS.USER_MIDDLENAME, '');
        const lastName = GiyaSession.get(GIYA_SESSION_KEYS.USER_LASTNAME, '');
        const suffix = GiyaSession.get(GIYA_SESSION_KEYS.USER_SUFFIX, '');

        let fullName = `${firstName} ${lastName}`;
        if (middleName) fullName = `${firstName} ${middleName} ${lastName}`;
        if (suffix) fullName += ` ${suffix}`;

        return fullName.trim();
    },

    // Get user's display name (first + last only)
    getUserDisplayName: function() {
        const firstName = GiyaSession.get(GIYA_SESSION_KEYS.USER_FIRSTNAME, '');
        const lastName = GiyaSession.get(GIYA_SESSION_KEYS.USER_LASTNAME, '');
        return `${firstName} ${lastName}`.trim();
    },

    // Check if user is logged in
    isLoggedIn: function() {
        return !!GiyaSession.get(GIYA_SESSION_KEYS.USER_ID);
    },

    // Get current user ID
    getCurrentUserId: function() {
        return GiyaSession.get(GIYA_SESSION_KEYS.USER_ID);
    },

    // Get current user type ID
    getCurrentUserTypeId: function() {
        return parseInt(GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID)) || 0;
    },

    // Get current user department ID
    getCurrentUserDepartmentId: function() {
        return GiyaSession.get(GIYA_SESSION_KEYS.USER_DEPARTMENT_ID);
    },

    // Check if user needs to change default password
    needsPasswordChange: function() {
        const userTypeId = this.getCurrentUserTypeId();
        return userTypeId >= 1 && userTypeId <= 4; // Regular users
    },

    // Logout utility
    logout: function() {
        GiyaSession.clearAll();
        window.location.href = './index.html';
    },

    // Redirect based on user type
    redirectBasedOnUserType: function() {
        if (this.isAdmin() || this.isPOC()) {
            window.location.href = './dashboard/dashboard.html';
        } else {
            window.location.href = './choose-concern.html';
        }
    },

    // Build API URL
    buildApiUrl: function(endpoint) {
        const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);
        return `${baseURL}${endpoint}`;
    },

    // Common headers for API requests
    getApiHeaders: function() {
        return {
            'Content-Type': 'application/json',
            'X-User-Type': GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID),
            'X-User-ID': GiyaSession.get(GIYA_SESSION_KEYS.USER_ID)
        };
    },

    // Migration helper - convert old session keys to new ones
    migrateOldSessionData: function() {
        const oldToNewMapping = {
            'baseURL': GIYA_SESSION_KEYS.BASE_URL
        };

        Object.entries(oldToNewMapping).forEach(([oldKey, newKey]) => {
            const oldValue = sessionStorage.getItem(oldKey);
            if (oldValue && !GiyaSession.get(newKey)) {
                GiyaSession.set(newKey, oldValue);
                sessionStorage.removeItem(oldKey);
            }
        });
    },

    // Debug helper - log all session data
    debugSessionData: function() {
        console.group('GIYA Session Data');
        Object.values(GIYA_SESSION_KEYS).forEach(key => {
            const value = GiyaSession.get(key);
            if (value !== null) {
                console.log(`${key}:`, value);
            }
        });
        console.groupEnd();
    }
};

// Auto-migration on script load
GiyaUtils.migrateOldSessionData();

// Export for global access
window.GiyaUtils = GiyaUtils;

// Module exports for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GiyaUtils };
}
