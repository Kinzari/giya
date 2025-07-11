document.addEventListener("DOMContentLoaded", function () {

    // Check if GIYA URL is configured
    const giyaURL = getGiyaURL();
    if (!giyaURL) {
        window.location.href = 'index.html';
        return;
    }

    const registerForm = document.getElementById("register-form");
    const passwordInput = document.getElementById("password");

    if (!registerForm) {
        toastr.error("Error: Registration form not found!", "Error");
        console.error("Error: The form element with ID 'register-form' was not found.");
        return;
    }

    function validatePassword(password) {
        const validations = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password)
        };

        Object.entries(validations).forEach(([key, valid]) => {
            const item = document.getElementById(key);
            if (item) {
                const icon = item.querySelector('i');
                const span = item.querySelector('span');

                if (valid) {
                    item.classList.remove('invalid');
                    item.classList.add('valid');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-check');
                    }
                } else {
                    item.classList.remove('valid');
                    item.classList.add('invalid');
                    if (icon) {
                        icon.classList.remove('fa-check');
                        icon.classList.add('fa-times');
                    }
                }
            }
        });

        return Object.values(validations).every(Boolean);
    }
    passwordInput.addEventListener('input', function() {
        validatePassword(this.value);
    });

    const termsCheckbox = document.getElementById("terms");

    termsCheckbox.addEventListener("click", function (e) {

        e.preventDefault();

        Swal.fire({
            title: "Privacy Policy",
            html: "Please read the privacy policy carefully.<br><br>" +
                  "Your data will be processed according to our privacy policy.",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Accept",
            confirmButtonColor: '#155f37',
            cancelButtonColor: '#d33',
            cancelButtonText: "Decline"
        }).then((result) => {
            if (result.isConfirmed) {
                termsCheckbox.checked = true;
                sessionStorage.setItem("privacyPolicyAccepted", "true");
            } else {
                termsCheckbox.checked = false;
                sessionStorage.removeItem("privacyPolicyAccepted");
            }
        });
    });

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const firstName = document.getElementById("user_firstname").value.trim();
        const middleName = document.getElementById("user_middlename").value.trim();
        const lastName = document.getElementById("user_lastname").value.trim();
        const suffix = document.getElementById("user_suffix").value.trim();
        const email = document.getElementById("user_email").value.trim();
        const contactNumber = document.getElementById("user_contact").value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = document.getElementById("confirm_password").value.trim();
        const agreeTerms = termsCheckbox.checked;

        if (!agreeTerms) {
            Swal.fire({
                icon: 'warning',
                title: 'Terms Not Accepted',
                text: 'You must accept the Privacy Policy to proceed.'
            });
            return;
        }

        if (password !== confirmPassword) {
            toastr.error("Passwords do not match.", "Validation Error");
            return;
        }

        if (!firstName || !lastName || !email || !contactNumber || !password) {
            toastr.error("All required fields must be filled.", "Validation Error");
            return;
        }

        if (!validatePassword(password)) {
            toastr.error("Password does not meet requirements");
            return;
        }

        const userData = {
            first_name: firstName,
            middle_name: middleName,
            family_name: lastName,
            suffix: suffix,
            user_email: email,
            user_contact: contactNumber,
            user_password: password,
        };

        try {
            const response = await axios.post(`${getGiyaURL()}giya.php?action=register`, userData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.status === "success") {
                Swal.fire({
                    icon: 'info',
                    confirmButtonColor: '#155f37',
                    title: 'Note',
                    text: 'Remember your email address, as it will be required for logging in.'
                }).then(() => {
                    Swal.fire({
                        icon: 'success',
                        confirmButtonColor: '#155f37',
                        title: 'Registration Successful!',
                        text: `Your Visitor ID is ${response.data.schoolId}`
                    }).then(() => {
                        window.location.href = "index.html";
                    });
                });
            } else {
                toastr.error(response.data.message || "Registration failed", "Error");
            }
        } catch (error) {
            console.error("Error:", error);
            const errorMessage = error.response?.data?.message || "An error occurred. Please try again.";
            toastr.error(errorMessage, "Error");
        }
    });

    const togglePassword = document.getElementById("togglePassword");
    const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

    function toggleVisibility(fieldId, icon) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.type = field.type === "password" ? "text" : "password";
            const eyeIcon = icon.querySelector('i');
            if (eyeIcon) {
                eyeIcon.classList.toggle("fa-eye");
                eyeIcon.classList.toggle("fa-eye-slash");
            }
        }
    }

    if (togglePassword && toggleConfirmPassword) {
        togglePassword.addEventListener("click", function () {
            toggleVisibility("password", this);
        });

        toggleConfirmPassword.addEventListener("click", function () {
            toggleVisibility("confirm_password", this);
        });
    } else {
        console.error("Error: Toggle password elements not found.");
    }
});
