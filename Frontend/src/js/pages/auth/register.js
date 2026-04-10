

(function () {
    'use strict';

    // ── DOM refs ────────────────────────────────────────────
    const form           = document.getElementById('registerForm');
    const submitBtn      = document.getElementById('submitBtn');
    const alertBanner    = document.getElementById('alertBanner');
    const alertMessage   = document.getElementById('alertMessage');

    const fullNameInput  = document.getElementById('fullName');
    const emailInput     = document.getElementById('email');
    const passwordInput  = document.getElementById('password');
    const confirmInput   = document.getElementById('confirmPassword');
    const phoneInput     = document.getElementById('phoneNumber');
    const cnicInput      = document.getElementById('cnic');

    // ── Helpers ─────────────────────────────────────────────
    function showError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
    }

    function clearError(id) {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    }

    function setInputState(input, state) {
        input.classList.remove('is-valid', 'is-error');
        if (state) input.classList.add(state);
    }

    function showAlert(type, msg) {
        alertBanner.className = `alert alert--${type} show`;
        alertMessage.textContent = msg;
        alertBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideAlert() {
        alertBanner.classList.remove('show');
    }

    // ── Password toggle ─────────────────────────────────────
    function bindToggle(btnId, inputEl) {
        const btn = document.getElementById(btnId);
        btn.addEventListener('click', () => {
            const isPass = inputEl.type === 'password';
            inputEl.type = isPass ? 'text' : 'password';
            btn.querySelector('.eye-open').style.display  = isPass ? 'none'  : '';
            btn.querySelector('.eye-closed').style.display = isPass ? ''     : 'none';
            btn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
        });
    }
    bindToggle('togglePassword', passwordInput);
    bindToggle('toggleConfirm',  confirmInput);

    // ── Password strength ───────────────────────────────────
    const strengthWidget = document.getElementById('passwordStrength');
    const strengthFill   = document.getElementById('strengthFill');
    const strengthLabel  = document.getElementById('strengthLabel');

    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        if (!val) {
            strengthWidget.style.display = 'none';
            return;
        }
        strengthWidget.style.display = 'block';
        const result = Validator.passwordStrength(val);
        const widths = ['20%', '40%', '60%', '80%', '100%'];
        strengthFill.style.width      = widths[result.level];
        strengthFill.style.background = result.color;
        strengthLabel.textContent     = result.label;
        strengthLabel.style.color     = result.color;
    });

    // ── CNIC auto-format ────────────────────────────────────
    cnicInput.addEventListener('input', (e) => {
        const formatted = Validator.formatCNIC(e.target.value);
        e.target.value = formatted;
    });

    // ── Phone auto-format ───────────────────────────────────
    phoneInput.addEventListener('input', (e) => {
        const formatted = Validator.formatPhone(e.target.value);
        e.target.value = formatted;
    });

    // ── Inline validation on blur ───────────────────────────
    fullNameInput.addEventListener('blur', () => validateFullName());
    emailInput.addEventListener('blur',    () => validateEmail());
    passwordInput.addEventListener('blur', () => validatePassword());
    confirmInput.addEventListener('blur',  () => validateConfirm());
    phoneInput.addEventListener('blur',    () => validatePhone());
    cnicInput.addEventListener('blur',     () => validateCNIC());

    // ── Clear error as user starts typing ───────────────────
    fullNameInput.addEventListener('input', () => { clearError('fullNameError'); setInputState(fullNameInput, null); });
    emailInput.addEventListener('input',    () => { clearError('emailError'); setInputState(emailInput, null); });
    passwordInput.addEventListener('input', () => { clearError('passwordError'); setInputState(passwordInput, null); });
    confirmInput.addEventListener('input',  () => { clearError('confirmPasswordError'); setInputState(confirmInput, null); });
    phoneInput.addEventListener('input',    () => { clearError('phoneError'); setInputState(phoneInput, null); });
    cnicInput.addEventListener('input',     () => { clearError('cnicError'); setInputState(cnicInput, null); });

    function validateFullName() {
        const v = fullNameInput.value.trim();
        if (!Validator.required(v)) {
            showError('fullNameError', 'Full name is required.');
            setInputState(fullNameInput, 'is-error');
            return false;
        }
        if (!Validator.minLength(v, 3)) {
            showError('fullNameError', 'Name must be at least 3 characters.');
            setInputState(fullNameInput, 'is-error');
            return false;
        }
        if (!Validator.name(v)) {
            showError('fullNameError', 'Name cannot contain numbers or special characters.');
            setInputState(fullNameInput, 'is-error');
            return false;
        }
        clearError('fullNameError');
        setInputState(fullNameInput, 'is-valid');
        return true;
    }

    function validateEmail() {
        const v = emailInput.value.trim();
        if (!Validator.required(v)) {
            showError('emailError', 'Email address is required.');
            setInputState(emailInput, 'is-error');
            return false;
        }
        if (!Validator.email(v)) {
            showError('emailError', 'Please enter a valid email address.');
            setInputState(emailInput, 'is-error');
            return false;
        }
        clearError('emailError');
        setInputState(emailInput, 'is-valid');
        return true;
    }

    function validatePassword() {
        const v = passwordInput.value;
        if (!Validator.required(v)) {
            showError('passwordError', 'Password is required.');
            setInputState(passwordInput, 'is-error');
            return false;
        }
        if (!Validator.minLength(v, 8)) {
            showError('passwordError', 'Password must be at least 8 characters.');
            setInputState(passwordInput, 'is-error');
            return false;
        }
        const strength = Validator.passwordStrength(v);
        if (strength.level === 0) {
            showError('passwordError', 'Password is too weak. Add numbers or symbols.');
            setInputState(passwordInput, 'is-error');
            return false;
        }
        clearError('passwordError');
        setInputState(passwordInput, 'is-valid');
        return true;
    }

    function validateConfirm() {
        const v = confirmInput.value;
        if (!Validator.required(v)) {
            showError('confirmPasswordError', 'Please confirm your password.');
            setInputState(confirmInput, 'is-error');
            return false;
        }
        if (!Validator.passwordsMatch(passwordInput.value, v)) {
            showError('confirmPasswordError', 'Passwords do not match.');
            setInputState(confirmInput, 'is-error');
            return false;
        }
        clearError('confirmPasswordError');
        setInputState(confirmInput, 'is-valid');
        return true;
    }

    function validatePhone() {
        const v = phoneInput.value.trim();
        if (!v) return true; // optional
        if (!Validator.phone(v)) {
            showError('phoneError', 'Enter a valid Pakistani number (e.g. 0300-0000000).');
            setInputState(phoneInput, 'is-error');
            return false;
        }
        clearError('phoneError');
        setInputState(phoneInput, 'is-valid');
        return true;
    }

    function validateCNIC() {
        const v = cnicInput.value.trim();
        if (!v) return true; // optional
        if (!Validator.cnic(v)) {
            showError('cnicError', 'Enter a valid CNIC (e.g. 42101-1234567-8).');
            setInputState(cnicInput, 'is-error');
            return false;
        }
        clearError('cnicError');
        setInputState(cnicInput, 'is-valid');
        return true;
    }

    // ── Form submit ─────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        // Step 1: check if any required field is empty
        const requiredEmpty =
            !fullNameInput.value.trim() ||
            !emailInput.value.trim()    ||
            !passwordInput.value        ||
            !confirmInput.value;

        if (requiredEmpty) {
            validateFullName();
            validateEmail();
            validatePassword();
            validateConfirm();
            showAlert('error', 'Please fill in all required fields.');
            return;
        }

        // Step 2: run full validation (format checks)
        const nameOk    = validateFullName();
        const emailOk   = validateEmail();
        const passOk    = validatePassword();
        const confirmOk = validateConfirm();
        const phoneOk   = validatePhone();
        const cnicOk    = validateCNIC();

        if (!emailOk) {
            showAlert('error', 'Please enter a valid email address.');
            return;
        }

        if (!nameOk || !passOk || !confirmOk || !phoneOk || !cnicOk) {
            showAlert('error', 'Please fix the highlighted fields and try again.');
            return;
        }

        const userType = 'Tourist';

        const payload = {
            fullName:    fullNameInput.value.trim(),
            email:       emailInput.value.trim().toLowerCase(),
            password:    passwordInput.value,
            userType,
            phoneNumber: phoneInput.value.trim().replace(/-/g, '') || null,
            cnic:        cnicInput.value.trim()  || null,
            address:     document.getElementById('address').value.trim() || null,
        };

        // Loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        try {
            await AuthService.register(payload);

            showAlert('success', 'Account created successfully! Redirecting to login…');
            submitBtn.classList.remove('loading');

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');

            if (err.status === 409) {
                showAlert('error', 'An account with this email already exists. Please sign in.');
                setInputState(emailInput, 'is-error');
                showError('emailError', 'Email already in use.');
            } else if (err.status === 422 && err.errors) {
                const fieldMap = { phoneNumber: 'phone' };
                Object.entries(err.errors).forEach(([field, msg]) => {
                    const id = (fieldMap[field] || field) + 'Error';
                    showError(id, msg);
                });
                showAlert('error', 'Please fix the errors above and try again.');
            } else {
                showAlert('error', err.message || 'Something went wrong. Please try again.');
            }
        }
    });

})();

