
(function () {
    'use strict';

    const form        = document.getElementById('adminLoginForm');
    const submitBtn   = document.getElementById('submitBtn');
    const alertBanner = document.getElementById('alertBanner');
    const alertMsg    = document.getElementById('alertMessage');
    const emailInput  = document.getElementById('email');
    const passInput   = document.getElementById('password');

    function showError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
    function clearError(id)     { const el = document.getElementById(id); if (el) el.textContent = ''; }
    function setInputState(input, state) { input.classList.remove('is-valid', 'is-error'); if (state) input.classList.add(state); }

    function showAlert(type, msg) {
        alertBanner.className = `alert alert--${type} show`;
        alertMsg.textContent = msg;
        alertBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function hideAlert() { alertBanner.classList.remove('show'); }

    // Password toggle
    const toggleBtn = document.getElementById('togglePassword');
    toggleBtn.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleBtn.querySelector('.eye-open').style.display  = isPass ? 'none' : '';
        toggleBtn.querySelector('.eye-closed').style.display = isPass ? '' : 'none';
        toggleBtn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
    });

    emailInput.addEventListener('blur', validateEmail);
    passInput.addEventListener('blur',  validatePassword);

    function validateEmail() {
        const v = emailInput.value.trim();
        if (!Validator.required(v)) { showError('emailError', 'Email is required.'); setInputState(emailInput, 'is-error'); return false; }
        if (!Validator.email(v))    { showError('emailError', 'Enter a valid email address.'); setInputState(emailInput, 'is-error'); return false; }
        clearError('emailError'); setInputState(emailInput, 'is-valid'); return true;
    }

    function validatePassword() {
        const v = passInput.value;
        if (!Validator.required(v)) { showError('passwordError', 'Password is required.'); setInputState(passInput, 'is-error'); return false; }
        clearError('passwordError'); setInputState(passInput, 'is-valid'); return true;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const ok = [validateEmail(), validatePassword()].every(Boolean);
        if (!ok) return;

        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        try {
            const data = await AuthService.adminLogin(
                emailInput.value.trim().toLowerCase(),
                passInput.value
            );

            showAlert('success', `Welcome, ${data.user.fullName}! Loading admin panel…`);
            submitBtn.classList.remove('loading');

            setTimeout(() => {
                window.location.href = '../admin/admin-dashboard.html';
            }, 1500);

        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');

            if (err.status === 401) {
                showAlert('error', 'Invalid email or password. Please try again.');
                setInputState(emailInput, 'is-error');
                setInputState(passInput, 'is-error');
            } else if (err.status === 403) {
                showAlert('error', 'Access denied. This portal is for administrators only.');
                setInputState(emailInput, 'is-error');
            } else if (err.status === 422 && err.errors) {
                Object.entries(err.errors).forEach(([field, msg]) => showError(`${field}Error`, msg));
                showAlert('error', 'Please fix the errors above and try again.');
            } else if (!navigator.onLine) {
                showAlert('error', 'No internet connection. Please check your network and try again.');
            } else {
                showAlert('error', err.message || 'Something went wrong. Please try again.');
            }
        }
    });

})();
