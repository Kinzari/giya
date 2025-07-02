/*
-----------------------------------------------------------------------------------
    GIYA EDIT PROFILE JavaScript
    Handles dynamic profile editing for different user types:
    - Students (user_typeId = 2)
    - Visitors (user_typeId = 1)
    - Faculty/Employees (user_typeId = 3,4)
-----------------------------------------------------------------------------------*/

class EditProfile {
    constructor() {
        this.apiBaseUrl = window.CONFIG?.API_BASE_URL || 'http://localhost/giya/api';
        this.currentUser = null;
        this.userTypeMapping = {
            1: 'Visitor',
            2: 'Student',
            3: 'Faculty',
            4: 'Employee',
            5: 'POC',
            6: 'Administrator'
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserData();
        this.initializePasswordToggles();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('editProfileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Logout functionality
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Password validation
        document.getElementById('newPassword').addEventListener('input', () => {
            this.validatePassword();
        });

        document.getElementById('confirmPassword').addEventListener('input', () => {
            this.validatePasswordMatch();
        });
    }

    initializePasswordToggles() {
        const toggleButtons = [
            { buttonId: 'toggleCurrentPassword', inputId: 'currentPassword' },
            { buttonId: 'toggleNewPassword', inputId: 'newPassword' },
            { buttonId: 'toggleConfirmPassword', inputId: 'confirmPassword' }
        ];

        toggleButtons.forEach(({ buttonId, inputId }) => {
            const button = document.getElementById(buttonId);
            const input = document.getElementById(inputId);
            const icon = button.querySelector('i');

            button.addEventListener('click', () => {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    async loadUserData() {
        try {
            const user = window.AuthHelper.getCurrentUser();
            if (!user || !user.id) {
                // Use console.error as fallback if toastr has issues
                if (typeof toastr !== 'undefined' && toastr.error) {
                    toastr.error('Please log in to edit your profile');
                } else {
                    console.error('Please log in to edit your profile');
                    alert('Please log in to edit your profile');
                }
                window.location.href = 'index.html';
                return;
            }

            this.showLoading();

            const response = await fetch(`${this.apiBaseUrl}/profile.php?action=get_profile&user_id=${user.id}`);
            const data = await response.json();

            if (data.success) {
                this.currentUser = data.data;
                this.setupFormForUserType(this.currentUser.user_type_id);
                await this.loadDropdownData();
                this.populateForm(this.currentUser);
            } else {
                throw new Error(data.message || 'Failed to load user data');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            // Use console.error as fallback if toastr has issues
            if (typeof toastr !== 'undefined' && toastr.error) {
                toastr.error('Failed to load profile data');
            } else {
                console.error('Failed to load profile data:', error.message);
                alert('Failed to load profile data. Please refresh the page.');
            }
        } finally {
            this.hideLoading();
        }
    }

    setupFormForUserType(userTypeId) {
        const userType = this.userTypeMapping[userTypeId] || 'Unknown';
        const userTypeBadge = document.getElementById('userTypeBadge');
        if (userTypeBadge) {
            userTypeBadge.textContent = userType;
        }

        // Hide all dynamic sections first
        document.getElementById('academicSection').style.display = 'none';
        document.getElementById('workSection').style.display = 'none';
        document.getElementById('visitorCampusSection').style.display = 'none';

        // Setup email section based on user type
        this.setupEmailSection(userTypeId);

        // Show relevant sections based on user type
        switch (userTypeId) {
            case 2: // Student
                document.getElementById('academicSection').style.display = 'block';
                break;
            case 3: // Faculty
            case 4: // Employee
                document.getElementById('workSection').style.display = 'block';
                break;
            case 1: // Visitor
                document.getElementById('visitorCampusSection').style.display = 'block';
                break;
            default:
                // POC/Admin get work section
                document.getElementById('workSection').style.display = 'block';
                break;
        }
    }

    setupEmailSection(userTypeId) {
        const emailSection = document.getElementById('emailSection');

        if (userTypeId === 2) { // Student - uses phinmaed_email
            emailSection.innerHTML = `
                <div class="row g-3 mb-3">
                    <div class="col-12">
                        <label for="phinmaedEmail" class="form-label fw-semibold">
                            PHINMA Email <span class="text-danger">*</span>
                        </label>
                        <input type="email" class="form-control bg-light" id="phinmaedEmail" name="phinmaedEmail" readonly>
                        <div class="form-text">PHINMA email cannot be changed</div>
                    </div>
                </div>
            `;
        } else { // Visitor, Faculty, Employee - uses regular email
            emailSection.innerHTML = `
                <div class="row g-3 mb-3">
                    <div class="col-12">
                        <label for="email" class="form-label fw-semibold">
                            Email Address <span class="text-danger">*</span>
                        </label>
                        <input type="email" class="form-control" id="email" name="email" required>
                    </div>
                </div>
            `;
        }
    }

    async loadDropdownData() {
        try {
            // Load all dropdown data in parallel
            const [coursesRes, departmentsRes, campusesRes, schoolYearsRes] = await Promise.all([
                fetch(`${this.apiBaseUrl}/profile.php?action=get_courses`),
                fetch(`${this.apiBaseUrl}/profile.php?action=get_departments`),
                fetch(`${this.apiBaseUrl}/profile.php?action=get_campuses`),
                fetch(`${this.apiBaseUrl}/profile.php?action=get_school_years`)
            ]);

            const [coursesData, departmentsData, campusesData, schoolYearsData] = await Promise.all([
                coursesRes.json(),
                departmentsRes.json(),
                campusesRes.json(),
                schoolYearsRes.json()
            ]);

            // Populate dropdowns
            if (coursesData.success) {
                this.populateDropdown('course', coursesData.data, 'course_id', 'course_name');
            }

            if (departmentsData.success) {
                this.populateDropdown('department', departmentsData.data, 'department_id', 'department_name');
            }

            if (campusesData.success) {
                this.populateDropdown('campus', campusesData.data, 'campus_id', 'campus_name');
                this.populateDropdown('visitorCampus', campusesData.data, 'campus_id', 'campus_name');
            }

            if (schoolYearsData.success) {
                this.populateDropdown('schoolYear', schoolYearsData.data, 'schoolyear_id', 'schoolyear');
            }

        } catch (error) {
            console.error('Error loading dropdown data:', error);
            if (typeof toastr !== 'undefined' && toastr.warning) {
                toastr.warning('Some dropdown options may not be available');
            } else {
                console.warn('Some dropdown options may not be available');
            }
        }
    }

    populateDropdown(selectId, items, valueField, textField) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;

        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Add new options
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            select.appendChild(option);
        });

        // Restore value if it exists
        if (currentValue) {
            select.value = currentValue;
        }
    }

    populateForm(userData) {
        // Personal information
        document.getElementById('firstName').value = userData.first_name || '';
        document.getElementById('lastName').value = userData.last_name || '';
        document.getElementById('middleName').value = userData.middle_name || '';
        document.getElementById('suffix').value = userData.suffix || '';
        document.getElementById('schoolId').value = userData.school_id || '';
        document.getElementById('contact').value = userData.contact || '';

        // Email based on user type
        if (userData.user_type_id === 2) { // Student
            const phinmaedEmailField = document.getElementById('phinmaedEmail');
            if (phinmaedEmailField) {
                phinmaedEmailField.value = userData.phinmaed_email || '';
            }
        } else {
            const emailField = document.getElementById('email');
            if (emailField) {
                emailField.value = userData.email || '';
            }
        }

        // Type-specific information
        if (userData.user_type_id === 2) { // Student
            document.getElementById('schoolYear').value = userData.school_year_id || '';
            document.getElementById('course').value = userData.course_id || '';
        } else if (userData.user_type_id === 3 || userData.user_type_id === 4) { // Faculty/Employee
            document.getElementById('department').value = userData.department_id || '';
            document.getElementById('campus').value = userData.campus_id || '';
        } else if (userData.user_type_id === 1) { // Visitor
            document.getElementById('visitorCampus').value = userData.campus_id || '';
        }
    }

    validatePassword() {
        const newPassword = document.getElementById('newPassword').value;
        const input = document.getElementById('newPassword');

        if (newPassword && newPassword.length < 6) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            return false;
        } else if (newPassword) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-invalid', 'is-valid');
        }

        return true;
    }

    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const input = document.getElementById('confirmPassword');

        if (confirmPassword && newPassword !== confirmPassword) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            return false;
        } else if (confirmPassword) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-invalid', 'is-valid');
        }

        return true;
    }

    async handleSubmit() {
        try {
            if (!this.validateForm()) {
                return;
            }

            this.showModal('loadingModal');

            const formData = {
                user_id: this.currentUser.user_id,
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                middle_name: document.getElementById('middleName').value,
                suffix: document.getElementById('suffix').value,
                contact: document.getElementById('contact').value
            };

            // Add email based on user type
            if (this.currentUser.user_type_id === 2) { // Student
                formData.phinmaed_email = document.getElementById('phinmaedEmail').value;
            } else {
                formData.email = document.getElementById('email').value;
            }

            // Add type-specific fields
            if (this.currentUser.user_type_id === 2) { // Student
                formData.school_year_id = document.getElementById('schoolYear').value;
                formData.course_id = document.getElementById('course').value;
                // Department is derived from course
                const courseSelect = document.getElementById('course');
                const selectedCourse = courseSelect.options[courseSelect.selectedIndex];
                if (selectedCourse && selectedCourse.dataset.departmentId) {
                    formData.department_id = selectedCourse.dataset.departmentId;
                }
            } else if (this.currentUser.user_type_id === 3 || this.currentUser.user_type_id === 4) { // Faculty/Employee
                formData.department_id = document.getElementById('department').value;
                formData.campus_id = document.getElementById('campus').value;
            } else if (this.currentUser.user_type_id === 1) { // Visitor
                formData.campus_id = document.getElementById('visitorCampus').value;
            }

            // Add password fields if provided
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;

            if (currentPassword && newPassword) {
                formData.current_password = currentPassword;
                formData.new_password = newPassword;
            }

            const response = await fetch(`${this.apiBaseUrl}/profile.php?action=update_profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                if (typeof toastr !== 'undefined' && toastr.success) {
                    toastr.success('Profile updated successfully!');
                } else {
                    alert('Profile updated successfully!');
                }

                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';

                // Remove validation classes
                document.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
                    el.classList.remove('is-valid', 'is-invalid');
                });

                // Optionally redirect back to choose concern page
                setTimeout(() => {
                    window.location.href = 'choose-concern.html';
                }, 2000);

            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (typeof toastr !== 'undefined' && toastr.error) {
                toastr.error(error.message || 'Failed to update profile');
            } else {
                alert('Failed to update profile: ' + (error.message || 'Unknown error'));
            }
        } finally {
            this.hideModal('loadingModal');
        }
    }

    validateForm() {
        const requiredFields = [
            { id: 'firstName', name: 'First Name' },
            { id: 'lastName', name: 'Last Name' },
            { id: 'contact', name: 'Contact Number' }
        ];

        // Add email validation based on user type
        if (this.currentUser.user_type_id === 2) {
            // Students use phinmaed_email (readonly, so skip validation)
        } else {
            requiredFields.push({ id: 'email', name: 'Email' });
        }

        // Add type-specific required fields
        if (this.currentUser.user_type_id === 2) { // Student
            requiredFields.push(
                { id: 'schoolYear', name: 'Year Level' },
                { id: 'course', name: 'Course' }
            );
        } else if (this.currentUser.user_type_id === 3 || this.currentUser.user_type_id === 4) { // Faculty/Employee
            requiredFields.push(
                { id: 'department', name: 'Department' },
                { id: 'campus', name: 'Campus' }
            );
        } else if (this.currentUser.user_type_id === 1) { // Visitor
            requiredFields.push({ id: 'visitorCampus', name: 'Campus' });
        }

        let isValid = true;

        // Check required fields
        requiredFields.forEach(field => {
            const input = document.getElementById(field.id);
            if (input && !input.value.trim()) {
                input.classList.add('is-invalid');
                if (typeof toastr !== 'undefined' && toastr.error) {
                    toastr.error(`${field.name} is required`);
                } else {
                    console.error(`${field.name} is required`);
                }
                isValid = false;
            } else if (input) {
                input.classList.remove('is-invalid');
            }
        });

        // Validate password if provided
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword || confirmPassword) {
            if (!currentPassword) {
                document.getElementById('currentPassword').classList.add('is-invalid');
                if (typeof toastr !== 'undefined' && toastr.error) {
                    toastr.error('Current password is required to change password');
                } else {
                    console.error('Current password is required to change password');
                }
                isValid = false;
            }

            if (!this.validatePassword()) {
                if (typeof toastr !== 'undefined' && toastr.error) {
                    toastr.error('New password must be at least 6 characters long');
                } else {
                    console.error('New password must be at least 6 characters long');
                }
                isValid = false;
            }

            if (!this.validatePasswordMatch()) {
                if (typeof toastr !== 'undefined' && toastr.error) {
                    toastr.error('Passwords do not match');
                } else {
                    console.error('Passwords do not match');
                }
                isValid = false;
            }
        }

        return isValid;
    }

    handleLogout() {
        Swal.fire({
            title: 'Are you sure?',
            text: 'You will be logged out of the system',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#155f37',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, log out!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                // Show success message before logging out
                Swal.fire({
                    title: 'Logged Out!',
                    text: 'You have been successfully logged out.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.AuthHelper.logout();
                });
            }
        });
    }

    showLoading() {
        document.body.style.cursor = 'wait';
    }

    hideLoading() {
        document.body.style.cursor = 'default';
    }

    showModal(modalId) {
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
    }

    hideModal(modalId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) {
            modal.hide();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for all dependencies to be available
    const checkDependencies = () => {
        if (typeof window.AuthHelper !== 'undefined' &&
            typeof toastr !== 'undefined' &&
            typeof bootstrap !== 'undefined' &&
            typeof $ !== 'undefined' &&
            typeof Swal !== 'undefined') {
            new EditProfile();
        } else {
            // Retry after a short delay
            setTimeout(checkDependencies, 100);
        }
    };

    checkDependencies();
});
