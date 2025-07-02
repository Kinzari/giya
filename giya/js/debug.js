// Debug script to check sessionStorage values
console.log('=== SessionStorage Debug ===');
console.log('user_id:', sessionStorage.getItem('user_id'));
console.log('user_typeId:', sessionStorage.getItem('user_typeId'));
console.log('user_firstname:', sessionStorage.getItem('user_firstname'));
console.log('user_lastname:', sessionStorage.getItem('user_lastname'));
console.log('user_schoolId:', sessionStorage.getItem('user_schoolId'));
console.log('user (full object):', sessionStorage.getItem('user'));

// Test AuthHelper
if (window.AuthHelper) {
    console.log('=== AuthHelper Test ===');
    console.log('AuthHelper.getCurrentUser():', window.AuthHelper.getCurrentUser());
    console.log('AuthHelper.checkAuth():', window.AuthHelper.checkAuth());
} else {
    console.error('AuthHelper not available');
}

// Test toastr
if (typeof toastr !== 'undefined') {
    console.log('Toastr is available');
    toastr.info('Debug: Toastr is working');
} else {
    console.error('Toastr not available');
}
