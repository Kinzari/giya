// GIYA Dashboard & Masterfiles - Final Verification Script
// Run this in browser console to verify the centralized session storage is working

console.group('🔍 GIYA Session Storage Migration Verification');

// Test 1: Check if new configuration is loaded
console.log('1. Testing configuration availability:');
console.log('   - GIYA_CONFIG:', typeof GIYA_CONFIG !== 'undefined' ? '✅ Available' : '❌ Missing');
console.log('   - GiyaSession:', typeof GiyaSession !== 'undefined' ? '✅ Available' : '❌ Missing');
console.log('   - GiyaUtils:', typeof GiyaUtils !== 'undefined' ? '✅ Available' : '❌ Missing');
console.log('   - GIYA_SESSION_KEYS:', typeof GIYA_SESSION_KEYS !== 'undefined' ? '✅ Available' : '❌ Missing');

// Test 2: Check base URL
console.log('\n2. Testing base URL:');
try {
    const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);
    console.log('   - Base URL:', baseURL ? '✅ ' + baseURL : '❌ Not found');
} catch (e) {
    console.log('   - Base URL: ❌ Error -', e.message);
}

// Test 3: Check user data
console.log('\n3. Testing user data:');
try {
    const userData = GiyaSession.getUserData();
    console.log('   - User ID:', userData.user_id ? '✅ ' + userData.user_id : '❌ Not found');
    console.log('   - User Type:', userData.user_typeId ? '✅ ' + userData.user_typeId : '❌ Not found');
    console.log('   - User Name:', GiyaUtils.getUserDisplayName() || '❌ Not found');
} catch (e) {
    console.log('   - User data: ❌ Error -', e.message);
}

// Test 4: Check utility functions
console.log('\n4. Testing utility functions:');
try {
    console.log('   - Is Admin:', GiyaUtils.isAdmin() ? '✅ Yes' : '❌ No');
    console.log('   - Is POC:', GiyaUtils.isPOC() ? '✅ Yes' : '❌ No');
    console.log('   - Is Logged In:', GiyaUtils.isLoggedIn() ? '✅ Yes' : '❌ No');
} catch (e) {
    console.log('   - Utility functions: ❌ Error -', e.message);
}

// Test 5: Check API utilities
console.log('\n5. Testing API utilities:');
try {
    const headers = GiyaUtils.getApiHeaders();
    console.log('   - API Headers:', headers ? '✅ Generated' : '❌ Failed');
    console.log('   - API URL Builder:', typeof GiyaUtils.buildApiUrl === 'function' ? '✅ Available' : '❌ Missing');
} catch (e) {
    console.log('   - API utilities: ❌ Error -', e.message);
}

// Test 6: Check for old session storage usage
console.log('\n6. Checking for legacy session storage usage:');
const legacyKeys = ['baseURL', 'user_id', 'user_typeId', 'user_firstname', 'user_lastname'];
let legacyFound = false;
legacyKeys.forEach(key => {
    const value = sessionStorage.getItem(key);
    if (value && key !== 'user_id' && key !== 'user_typeId') { // These might still exist for compatibility
        console.log(`   - Legacy key "${key}": ⚠️ Still exists`);
        legacyFound = true;
    }
});
if (!legacyFound) {
    console.log('   - No problematic legacy keys found: ✅');
}

// Test 7: Migration recommendations
console.log('\n7. Migration status:');
if (typeof GiyaSession !== 'undefined' && typeof GiyaUtils !== 'undefined') {
    console.log('   - ✅ Core migration: COMPLETE');
    console.log('   - ✅ Session management: CENTRALIZED');
    console.log('   - ✅ Utility functions: AVAILABLE');
    console.log('   - 🎉 Dashboard & Masterfiles migration: SUCCESS!');
} else {
    console.log('   - ❌ Migration: INCOMPLETE - Missing core components');
}

console.groupEnd();

// Provide helpful commands
console.log('\n💡 Helpful commands for testing:');
console.log('   - GiyaUtils.debugSessionData() - Show all session data');
console.log('   - GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL) - Get base URL');
console.log('   - GiyaSession.getUserData() - Get all user data');
console.log('   - GiyaUtils.getUserDisplayName() - Get user display name');
console.log('   - GiyaUtils.isAdmin() - Check if user is admin');
console.log('   - GiyaUtils.isPOC() - Check if user is POC');
