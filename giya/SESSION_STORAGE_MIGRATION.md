# GIYA Session Storage Migration Guide

## Overview

This document outlines the new centralized session storage system for the GIYA project. The system provides a clean, maintainable way to manage session data across all JavaScript files.

## New Architecture

### Core Files
- `js/config.js` - Main configuration and session storage manager
- `js/giya-session-utils.js` - Utility functions for common operations

### Key Components

#### 1. GIYA_CONFIG
Central configuration object that manages:
- Environment settings (development/production)
- Base URL management
- Session storage keys

#### 2. GiyaSession
Centralized session storage manager with methods:
- `set(key, value)` - Store data
- `get(key, defaultValue)` - Retrieve data
- `remove(key)` - Remove specific data
- `clearAll()` - Clear everything
- `clearExceptBaseURL()` - Clear all except base URL
- `setUserData(userData)` - Store complete user data
- `getUserData()` - Retrieve complete user data

#### 3. GiyaUtils
Helper utilities for common operations:
- User role checking (`isAdmin()`, `isPOC()`, `isRegularUser()`)
- User name formatting (`getUserFullName()`, `getUserDisplayName()`)
- Authentication status (`isLoggedIn()`)
- API helpers (`buildApiUrl()`, `getApiHeaders()`)

## Migration Steps

### 1. Update HTML Files
Add the new script files to your HTML pages:

```html
<!-- Add BEFORE any other JavaScript files -->
<script src="js/config.js"></script>
<script src="js/giya-session-utils.js"></script>
```

### 2. Replace Old Session Storage Calls

#### Old Way:
```javascript
// Setting values
sessionStorage.setItem('baseURL', 'http://localhost/api/');
sessionStorage.setItem('user_id', userId);

// Getting values
const baseURL = sessionStorage.getItem('baseURL');
const userId = sessionStorage.getItem('user_id');

// Clearing
sessionStorage.clear();
```

#### New Way:
```javascript
// Setting values
GiyaSession.set(GIYA_SESSION_KEYS.BASE_URL, 'http://localhost/api/');
GiyaSession.set(GIYA_SESSION_KEYS.USER_ID, userId);

// Getting values
const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);
const userId = GiyaSession.get(GIYA_SESSION_KEYS.USER_ID);

// Clearing
GiyaSession.clearAll(); // or GiyaSession.clearExceptBaseURL()
```

### 3. Use Utility Functions

#### Old Way:
```javascript
const firstName = sessionStorage.getItem('user_firstname') || '';
const lastName = sessionStorage.getItem('user_lastname') || '';
const fullName = `${firstName} ${lastName}`;

const userTypeId = parseInt(sessionStorage.getItem('user_typeId'));
const isAdmin = userTypeId === 6;
```

#### New Way:
```javascript
const fullName = GiyaUtils.getUserDisplayName();
const isAdmin = GiyaUtils.isAdmin();
```

## Available Session Keys

All session storage keys are now centralized in `GIYA_SESSION_KEYS`:

```javascript
// Base configuration
GIYA_SESSION_KEYS.BASE_URL          // 'GiyaURL'

// User data
GIYA_SESSION_KEYS.USER_ID           // 'user_id'
GIYA_SESSION_KEYS.USER_FIRSTNAME    // 'user_firstname'
GIYA_SESSION_KEYS.USER_LASTNAME     // 'user_lastname'
GIYA_SESSION_KEYS.USER_TYPE_ID      // 'user_typeId'
// ... and many more (see config.js for complete list)
```

## Environment Configuration

### Switching Between Development and Production

Edit `config.js` and change the environment:

```javascript
window.GIYA_CONFIG = {
    ENVIRONMENT: 'development', // or 'production'
    // ...
};
```

Or programmatically set the URL:
```javascript
// For development
GiyaSession.set(GIYA_SESSION_KEYS.BASE_URL, GIYA_CONFIG.URLS.DEVELOPMENT);

// For production
GiyaSession.set(GIYA_SESSION_KEYS.BASE_URL, GIYA_CONFIG.URLS.PRODUCTION);
```

## Common Patterns

### 1. API Calls
```javascript
// Old way
const response = await axios.post(`${sessionStorage.getItem('baseURL')}giya.php?action=login`, data);

// New way
const response = await axios.post(GiyaUtils.buildApiUrl('giya.php?action=login'), data, {
    headers: GiyaUtils.getApiHeaders()
});
```

### 2. User Authentication
```javascript
// Old way
const userTypeId = parseInt(sessionStorage.getItem('user_typeId'));
if (userTypeId === 5 || userTypeId === 6) {
    // Admin or POC logic
}

// New way
if (GiyaUtils.isAdmin() || GiyaUtils.isPOC()) {
    // Admin or POC logic
}
```

### 3. User Data Storage
```javascript
// Old way
sessionStorage.setItem('user_id', result.user_id);
sessionStorage.setItem('user_firstname', result.user_firstname);
// ... many more lines

// New way
GiyaSession.setUserData(result);
```

## Benefits

1. **Centralized Management**: All session storage keys in one place
2. **Type Safety**: Reduces typos and string literal errors
3. **Easy Environment Switching**: Simple configuration changes
4. **Utility Functions**: Common operations become one-liners
5. **Future-Proof**: Easy to modify keys or add new functionality
6. **Backward Compatibility**: Migration utilities preserve existing data

## Files to Update

The following files need to be updated to use the new system:

### High Priority (Core functionality)
- ✅ `js/login.js` - Already updated
- ✅ `js/config.js` - Already updated
- ⚠️ `js/choose-concern.js` - Partially updated
- ⚠️ `js/form.js` - Partially updated

### Medium Priority
- `js/choose-concern-gmail.js`
- `js/auth-helper.js`
- `js/real-time-notifications.js`
- `js/notification-manager.js`
- `js/quick-view.js`
- `js/faq-loader.js`

### Dashboard Files
- `js/dashboard/dashboard.js`
- `js/dashboard/table-filters.js`
- `js/dashboard/subdir-components.js`
- `js/dashboard/resolved-posts.js`
- `js/dashboard/posts.js`

### Masterfiles
- All files in `js/masterfiles/` directory

## Debug Utilities

Use these functions to debug session storage:

```javascript
// Log all session data
GiyaUtils.debugSessionData();

// Check current user info
console.log('User Data:', GiyaSession.getUserData());

// Check if user is logged in
console.log('Logged in:', GiyaUtils.isLoggedIn());
```

## Breaking Changes

1. Session key `baseURL` is now `GiyaURL`
2. Direct `sessionStorage` access should be replaced with `GiyaSession` methods
3. HTML files need to include the new configuration scripts

## Migration Checklist

- [ ] Add config files to HTML pages
- [ ] Update session storage calls
- [ ] Replace hardcoded URLs with configuration
- [ ] Use utility functions for common operations
- [ ] Test all functionality
- [ ] Update any remaining direct sessionStorage calls

## Support

For questions or issues with the migration, refer to this guide or check the implementation in the updated files.
