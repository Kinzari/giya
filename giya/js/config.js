// giya base urls
const GIYA_URLS = {
    DEVELOPMENT: 'http://localhost/api/',
    PRODUCTION: 'https://coc-studentinfo.net/giya/api/'
};

// centralized session storage keys
const GIYA_SESSION_KEYS = {
    // main config
    BASE_URL: 'GiyaURL',

    // user auth data
    USER_ID: 'user_id',
    USER_SCHOOL_ID: 'user_schoolId',
    USER_FIRSTNAME: 'user_firstname',
    USER_MIDDLENAME: 'user_middlename',
    USER_LASTNAME: 'user_lastname',
    USER_SUFFIX: 'user_suffix',
    USER_EMAIL: 'user_email',
    PHINMAED_EMAIL: 'phinmaed_email',
    USER_CONTACT: 'user_contact',
    USER_TYPE_ID: 'user_typeId',
    USER_DEPARTMENT_ID: 'user_departmentId',
    USER_CAMPUS_ID: 'user_campusId',
    USER_SCHOOLYEAR_ID: 'user_schoolyearId',

    // dept and course info
    DEPARTMENT_NAME: 'department_name',
    COURSE_NAME: 'course_name',

    // User roles and permissions
    IS_POC: 'isPOC',
    IS_ADMIN: 'isAdmin',

    // User object (complete user data)
    USER: 'user',

    // Application state
    SELECTED_POST_TYPE: 'selectedPostType',
    PENDING_REDIRECT: 'pendingRedirect',
    PRIVACY_POLICY_ACCEPTED: 'privacyPolicyAccepted',
    UNREAD_NOTIFICATIONS: 'unreadNotifications'
};

// Configuration object
window.GIYA_CONFIG = {
    // Current environment (change this to switch between dev/prod)
    ENVIRONMENT: 'development', // 'development' or 'production'

    // Get the appropriate URL based on environment
    getBaseURL: function() {
        const storedURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);
        if (storedURL) {
            return storedURL;
        }

        return this.ENVIRONMENT === 'production'
            ? GIYA_URLS.PRODUCTION
            : GIYA_URLS.DEVELOPMENT;
    },

    // Session keys for easy access
    SESSION_KEYS: GIYA_SESSION_KEYS,

    // URLs
    URLS: GIYA_URLS
};

// Centralized Session Storage Manager
window.GiyaSession = {
    // Set a value in session storage
    set: function(key, value) {
        try {
            if (typeof value === 'object') {
                sessionStorage.setItem(key, JSON.stringify(value));
            } else {
                sessionStorage.setItem(key, value);
            }
        } catch (error) {
            console.error('Error setting session storage:', error);
        }
    },

    // Get a value from session storage
    get: function(key, defaultValue = null) {
        try {
            const value = sessionStorage.getItem(key);
            if (value === null) return defaultValue;

            // Try to parse as JSON, return as string if it fails
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error('Error getting session storage:', error);
            return defaultValue;
        }
    },

    // Remove a specific key
    remove: function(key) {
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing session storage:', error);
        }
    },

    // Clear all session storage except baseURL
    clearExceptBaseURL: function() {
        try {
            const baseURL = this.get(GIYA_SESSION_KEYS.BASE_URL);
            sessionStorage.clear();
            if (baseURL) {
                this.set(GIYA_SESSION_KEYS.BASE_URL, baseURL);
            }
        } catch (error) {
            console.error('Error clearing session storage:', error);
        }
    },

    // Clear all session storage
    clearAll: function() {
        try {
            sessionStorage.clear();
        } catch (error) {
            console.error('Error clearing all session storage:', error);
        }
    },

    // Set user data (all user-related information)
    setUserData: function(userData) {
        const userKeys = {
            [GIYA_SESSION_KEYS.USER_ID]: userData.user_id,
            [GIYA_SESSION_KEYS.USER_SCHOOL_ID]: userData.user_schoolId,
            [GIYA_SESSION_KEYS.USER_FIRSTNAME]: userData.user_firstname,
            [GIYA_SESSION_KEYS.USER_MIDDLENAME]: userData.user_middlename,
            [GIYA_SESSION_KEYS.USER_LASTNAME]: userData.user_lastname,
            [GIYA_SESSION_KEYS.USER_SUFFIX]: userData.user_suffix,
            [GIYA_SESSION_KEYS.USER_EMAIL]: userData.user_email,
            [GIYA_SESSION_KEYS.PHINMAED_EMAIL]: userData.phinmaed_email,
            [GIYA_SESSION_KEYS.USER_CONTACT]: userData.user_contact,
            [GIYA_SESSION_KEYS.USER_TYPE_ID]: userData.user_typeId,
            [GIYA_SESSION_KEYS.USER_DEPARTMENT_ID]: userData.user_departmentId,
            [GIYA_SESSION_KEYS.USER_CAMPUS_ID]: userData.user_campusId,
            [GIYA_SESSION_KEYS.USER_SCHOOLYEAR_ID]: userData.user_schoolyearId,
            [GIYA_SESSION_KEYS.DEPARTMENT_NAME]: userData.department_name,
            [GIYA_SESSION_KEYS.COURSE_NAME]: userData.course_name,
            [GIYA_SESSION_KEYS.USER]: userData
        };

        // Set individual user data
        Object.entries(userKeys).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                this.set(key, value);
            }
        });

        // Set role flags
        this.set(GIYA_SESSION_KEYS.IS_POC, userData.user_typeId === 5 ? 'true' : 'false');
        this.set(GIYA_SESSION_KEYS.IS_ADMIN, userData.user_typeId === 6 ? 'true' : 'false');
    },

    // Get user data
    getUserData: function() {
        return {
            user_id: this.get(GIYA_SESSION_KEYS.USER_ID),
            user_schoolId: this.get(GIYA_SESSION_KEYS.USER_SCHOOL_ID),
            user_firstname: this.get(GIYA_SESSION_KEYS.USER_FIRSTNAME),
            user_middlename: this.get(GIYA_SESSION_KEYS.USER_MIDDLENAME),
            user_lastname: this.get(GIYA_SESSION_KEYS.USER_LASTNAME),
            user_suffix: this.get(GIYA_SESSION_KEYS.USER_SUFFIX),
            user_email: this.get(GIYA_SESSION_KEYS.USER_EMAIL),
            phinmaed_email: this.get(GIYA_SESSION_KEYS.PHINMAED_EMAIL),
            user_contact: this.get(GIYA_SESSION_KEYS.USER_CONTACT),
            user_typeId: this.get(GIYA_SESSION_KEYS.USER_TYPE_ID),
            user_departmentId: this.get(GIYA_SESSION_KEYS.USER_DEPARTMENT_ID),
            user_campusId: this.get(GIYA_SESSION_KEYS.USER_CAMPUS_ID),
            user_schoolyearId: this.get(GIYA_SESSION_KEYS.USER_SCHOOLYEAR_ID),
            department_name: this.get(GIYA_SESSION_KEYS.DEPARTMENT_NAME),
            course_name: this.get(GIYA_SESSION_KEYS.COURSE_NAME),
            isPOC: this.get(GIYA_SESSION_KEYS.IS_POC) === 'true',
            isAdmin: this.get(GIYA_SESSION_KEYS.IS_ADMIN) === 'true'
        };
    },

    // Initialize base URL
    initializeBaseURL: function() {
        const currentURL = this.get(GIYA_SESSION_KEYS.BASE_URL);
        if (!currentURL) {
            this.set(GIYA_SESSION_KEYS.BASE_URL, GIYA_CONFIG.getBaseURL());
        }
    }
};

// Initialize the base URL when the script loads
GiyaSession.initializeBaseURL();

// Legacy function for backward compatibility
function getBaseURL() {
    return GIYA_CONFIG.getBaseURL();
}

// Export for global access
window.getBaseURL = getBaseURL;
window.GIYA_SESSION_KEYS = GIYA_SESSION_KEYS;

// Module exports for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getBaseURL,
        GIYA_CONFIG,
        GiyaSession,
        GIYA_SESSION_KEYS
    };
}
