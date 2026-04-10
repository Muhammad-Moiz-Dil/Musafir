(function () {
'use strict';

// ── Auth guard ────────────────────────────────────────────
const token = sessionStorage.getItem('tripify_token');
if (!token) { window.location.href = '../auth/login.html'; return; }

// ── State ─────────────────────────────────────────────────
let userData = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');

// ── Helper: initials from name ─────────────────────────────
function initials(name) {
    return (name || 'U').split(' ').map(function(n){ return n[0]; }).join('').slice(0, 2).toUpperCase();
}

// ── Helper: update all UI with user data ───────────────────
function populateUI(u) {
    userData = u;
    var ini = initials(u.fullName);

    // Sidebar / topbar
    document.getElementById('sidebarName').textContent = u.fullName || '—';

    var sidebarAvatar = document.getElementById('sidebarAvatar');
    var topbarAvatar  = document.getElementById('topbarAvatar');

    if (u.profilePicture && u.profilePicture !== '') {
        var imgTag = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sidebarAvatar.innerHTML = imgTag;
        topbarAvatar.innerHTML  = imgTag;
    } else {
        sidebarAvatar.textContent = ini;
        topbarAvatar.textContent  = ini;
    }

    // Profile card
    document.getElementById('profileName').textContent  = u.fullName || '—';
    document.getElementById('profileEmail').textContent = u.email    || '—';

    // Avatar
    var bigAvatar = document.getElementById('bigAvatar');
    if (u.profilePicture && u.profilePicture !== '') {
        bigAvatar.innerHTML = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.innerHTML=\'<span>' + ini + '</span>\'">';
    } else {
        bigAvatar.innerHTML = '<span id="bigAvatarInitials">' + ini + '</span>';
    }

    // View fields
    document.getElementById('dispName').textContent        = u.fullName    || '—';
    document.getElementById('dispEmail').textContent       = u.email       || '—';
    document.getElementById('dispPhone').textContent       = u.phoneNumber || 'Not provided';
    document.getElementById('dispCnic').textContent        = u.cnic        || 'Not provided';
    document.getElementById('dispAddress').textContent     = u.address     || 'Not provided';
    document.getElementById('dispMemberSince').textContent = u.memberSince || '—';

    // Wishlist count
    var wl = JSON.parse(sessionStorage.getItem('tripify_wishlist') || '[]');
    document.getElementById('wishCount').textContent = wl.length;
}

// ── Fetch full profile from API ────────────────────────────
async function loadProfile() {
    try {
        var res = await fetch(ENDPOINTS.USER.PROFILE, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) { AuthService.logout(); return; }
        if (!res.ok) return;
        var u = await res.json();
        var stored = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
        var merged = Object.assign({}, stored, u);
        sessionStorage.setItem('tripify_user', JSON.stringify(merged));
        populateUI(merged);
    } catch (e) {
        populateUI(userData);
    }
}

// ── Fetch preferences ──────────────────────────────────────
async function loadPreferences() {
    try {
        var res = await fetch(ENDPOINTS.USER.PREFERENCES, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        var p = await res.json();
        var ag = document.getElementById('ageGroup');
        if (p.ageGroup) ag.value = p.ageGroup;
        var prefs = [];
        try { prefs = JSON.parse(p.travelPreferences || '[]'); } catch(e){}
        document.querySelectorAll('.pref-chip').forEach(function(c) {
            if (prefs.includes(c.dataset.pref)) c.classList.add('selected');
            else c.classList.remove('selected');
        });
    } catch (e) {}
}

// ── Populate from localStorage immediately ─────────────────
if (userData.fullName) populateUI(userData);

// ── Load fresh data from API ───────────────────────────────
loadProfile();
loadPreferences();

// ── Tab navigation ─────────────────────────────────────────
document.querySelectorAll('.pnav-item').forEach(function(item) {
    item.addEventListener('click', function() {
        document.querySelectorAll('.pnav-item').forEach(function(i) { i.classList.remove('active'); });
        document.querySelectorAll('.profile-section').forEach(function(s) { s.classList.remove('active'); });
        item.classList.add('active');
        document.getElementById('sec-' + item.dataset.tab).classList.add('active');
    });
});

// ── Sidebar toggle ─────────────────────────────────────────
var sidebar = document.getElementById('sidebar');
var overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', function() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
});
overlay.addEventListener('click', function() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
});

// ── Personal Info: Edit / Save ─────────────────────────────
window.showEditMode = function () {
    document.getElementById('eName').value    = userData.fullName    || '';
    document.getElementById('ePhone').value   = userData.phoneNumber || '';
    document.getElementById('eCnic').value    = userData.cnic        || '';
    document.getElementById('eAddress').value = userData.address     || '';
    clearAllFieldErrors();
    document.getElementById('viewMode').style.display = 'none';
    document.getElementById('editMode').style.display = 'block';
};

window.cancelEdit = function () {
    document.getElementById('viewMode').style.display = 'block';
    document.getElementById('editMode').style.display = 'none';
    clearAllFieldErrors();
};

window.saveProfile = async function () {
    clearAllFieldErrors();
    var body = {
        fullName:    document.getElementById('eName').value.trim(),
        phoneNumber: document.getElementById('ePhone').value.trim().replace(/-/g, ''),
        cnic:        document.getElementById('eCnic').value.trim(),
        address:     document.getElementById('eAddress').value.trim()
    };

    if (!body.fullName) { showFieldError('fullName', 'Full name is required.'); return; }

    // Phone: optional, but if provided must be exactly 11 digits starting with 03
    if (body.phoneNumber) {
        if (!/^03[0-9]{9}$/.test(body.phoneNumber)) {
            showFieldError('phoneNumber', 'Enter an 11-digit Pakistani number starting with 03 (e.g. 03001234567).');
            return;
        }
    }

    // CNIC validation — must be empty OR a valid Pakistani CNIC
    if (body.cnic) {
        var cnicDigits = body.cnic.replace(/\D/g, '');
        if (cnicDigits.length !== 13) {
            showFieldError('cnic', 'CNIC must have exactly 13 digits (format: XXXXX-XXXXXXX-X).');
            return;
        }
        // Province/territory code: first digit must be 1–7
        var provinceCode = parseInt(cnicDigits.charAt(0), 10);
        if (provinceCode < 1 || provinceCode > 7) {
            showFieldError('cnic', 'Invalid CNIC — first digit must be 1–7 (province code).');
            return;
        }
        // Reject obviously fake values (all same digit)
        if (/^(\d)\1{12}$/.test(cnicDigits)) {
            showFieldError('cnic', 'Enter a valid Pakistani CNIC number.');
            return;
        }
        // Normalise to XXXXX-XXXXXXX-X before sending
        body.cnic = cnicDigits.slice(0,5) + '-' + cnicDigits.slice(5,12) + '-' + cnicDigits.slice(12);
    }

    var btn = document.getElementById('saveProfileBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
        var res = await fetch(ENDPOINTS.USER.PROFILE, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        var data = await res.json();

        if (res.status === 422) {
            if (data.errors) Object.entries(data.errors).forEach(function(e) { showFieldError(e[0], e[1]); });
            showToast('❌', 'Please fix the errors.');
            return;
        }
        if (!res.ok) { showToast('❌', data.message || 'Update failed.'); return; }

        var merged = Object.assign({}, userData, data.user);
        sessionStorage.setItem('tripify_user', JSON.stringify(merged));
        populateUI(merged);
        cancelEdit();
        showToast('✅', 'Profile updated successfully!');
    } catch (e) {
        showToast('❌', 'Network error. Check your connection.');
    } finally {
        btn.disabled = false; btn.textContent = '💾 Save Changes';
    }
};

// ── Phone: digits only, max 11 ───────────────────────────────
window.autoFormatPhone = function (input) {
    input.value = input.value.replace(/\D/g, '').slice(0, 11);
};

// ── CNIC auto-format (based on digit count, max 13 digits) ──
window.autoFormatCnic = function (input) {
    var d = input.value.replace(/\D/g, '').slice(0, 13); // keep only digits, max 13
    var v = d;
    if (d.length > 5)  v = d.slice(0,5) + '-' + d.slice(5);
    if (d.length > 12) v = d.slice(0,5) + '-' + d.slice(5,12) + '-' + d.slice(12);
    input.value = v;
};

// ── CNIC blur validation ─────────────────────────────────────
window.validateCnicField = function () {
    var val = document.getElementById('eCnic').value.trim();
    if (!val) return;
    var digits = val.replace(/\D/g, '');
    if (digits.length !== 13) {
        showFieldError('cnic', 'CNIC must have exactly 13 digits (format: XXXXX-XXXXXXX-X).'); return;
    }
    var pc = parseInt(digits.charAt(0), 10);
    if (pc < 1 || pc > 7) {
        showFieldError('cnic', 'Invalid CNIC — first digit must be 1–7 (province code).'); return;
    }
    if (/^(\d)\1{12}$/.test(digits)) {
        showFieldError('cnic', 'Enter a valid Pakistani CNIC number.'); return;
    }
};

// ── Avatar upload ───────────────────────────────────────────
window.handleAvatarUpload = async function (input) {
    var file = input.files[0];
    if (!file) return;

    if (!['image/jpeg','image/png'].includes(file.type)) {
        showToast('❌', 'Only JPG and PNG images are allowed.'); input.value = ''; return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast('❌', 'Image must be smaller than 2MB.'); input.value = ''; return;
    }

    var bigAvatar = document.getElementById('bigAvatar');
    var origContent = bigAvatar.innerHTML;
    bigAvatar.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.5)">⏳</div>';

    var form = new FormData();
    form.append('file', file);

    try {
        var res = await fetch(ENDPOINTS.USER.UPLOAD_AVATAR, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: form
        });
        var data = await res.json();

        if (!res.ok) { bigAvatar.innerHTML = origContent; showToast('❌', data.message || 'Upload failed.'); return; }

        var imgUrl = 'http://localhost:8080' + data.avatarUrl + '?t=' + Date.now();
        bigAvatar.innerHTML = '<img src="' + imgUrl + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';

        userData.profilePicture = data.avatarUrl;
        sessionStorage.setItem('tripify_user', JSON.stringify(userData));
        showToast('✅', 'Profile photo updated!');
    } catch (e) {
        bigAvatar.innerHTML = origContent;
        showToast('❌', 'Upload failed. Check your connection.');
    }
    input.value = '';
};

// ── Preferences ────────────────────────────────────────────
document.querySelectorAll('.pref-chip').forEach(function(c) {
    c.addEventListener('click', function() { c.classList.toggle('selected'); });
});

var AGE_PRESETS = {
    'Under 18': ['Family Trips', 'Photography', 'Adventure'],
    '18-25':    ['Adventure', 'Trekking', 'Photography', 'Mountains'],
    '26-35':    ['Mountains', 'Lakes & Rivers', 'Trekking', 'Local Food'],
    '36-50':    ['History & Culture', 'Family Trips', 'Local Food', 'Scenic'],
    '50+':      ['History & Culture', 'Local Food', 'Scenic'],
};

window.onAgeGroupChange = function (val) {
    var preset = AGE_PRESETS[val] || [];
    document.querySelectorAll('.pref-chip').forEach(function(c) {
        if (preset.includes(c.dataset.pref)) c.classList.add('selected');
        else c.classList.remove('selected');
    });
};

window.savePreferences = async function () {
    var ageGroup = document.getElementById('ageGroup').value;
    var selected = Array.from(document.querySelectorAll('.pref-chip.selected')).map(function(c) { return c.dataset.pref; });
    var btn = document.getElementById('savePrefBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
        var res = await fetch(ENDPOINTS.USER.PREFERENCES, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ageGroup: ageGroup, travelPreferences: JSON.stringify(selected) })
        });
        if (!res.ok) { showToast('❌', 'Failed to save preferences.'); return; }
        showToast('✅', 'Preferences saved!');
    } catch (e) {
        showToast('❌', 'Network error.');
    } finally {
        btn.disabled = false; btn.textContent = '💾 Save Preferences';
    }
};

// ── Password change ────────────────────────────────────────
window.changePassword = async function () {
    clearAllFieldErrors();
    document.getElementById('pwSuccess').classList.remove('show');

    var cur  = document.getElementById('pwCurrent').value;
    var nw   = document.getElementById('pwNew').value;
    var conf = document.getElementById('pwConfirm').value;

    var valid = true;
    if (!cur)          { showFieldError('currentPassword', 'Current password is required.'); valid = false; }
    if (nw.length < 8) { showFieldError('newPassword', 'New password must be at least 8 characters.'); valid = false; }
    if (nw !== conf)   { showFieldError('confirmPassword', 'Passwords do not match.'); valid = false; }
    if (!valid) return;

    var btn = document.getElementById('changePwBtn');
    btn.disabled = true; btn.textContent = 'Updating...';

    try {
        var res = await fetch(ENDPOINTS.USER.CHANGE_PASSWORD, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: cur, newPassword: nw, confirmPassword: conf })
        });
        var data = await res.json();

        if (res.status === 422) {
            if (data.errors) Object.entries(data.errors).forEach(function(e) { showFieldError(e[0], e[1]); });
            return;
        }
        if (!res.ok) { showToast('❌', data.message || 'Failed to update password.'); return; }

        document.getElementById('pwCurrent').value = '';
        document.getElementById('pwNew').value = '';
        document.getElementById('pwConfirm').value = '';
        document.getElementById('pwStrength').className = 'pw-strength';
        document.getElementById('pwSuccess').classList.add('show');
        showToast('🔒', 'Password changed successfully!');
    } catch (e) {
        showToast('❌', 'Network error.');
    } finally {
        btn.disabled = false; btn.textContent = '🔒 Update Password';
    }
};

// ── Password strength checker ───────────────────────────────
window.checkPasswordStrength = function (val) {
    var box = document.getElementById('pwStrength');
    if (!val) { box.className = 'pw-strength'; return; }
    box.classList.add('show');

    var rules = {
        len:     val.length >= 8,
        upper:   /[A-Z]/.test(val),
        lower:   /[a-z]/.test(val),
        num:     /[0-9]/.test(val),
        special: /[^A-Za-z0-9]/.test(val)
    };

    // Update rule pills
    Object.keys(rules).forEach(function(k) {
        var el = document.getElementById('rule-' + k);
        if (el) el.className = 'pw-rule' + (rules[k] ? ' pass' : '');
    });

    // Score: each passing rule = 1 point
    var score = Object.values(rules).filter(Boolean).length;

    var label = document.getElementById('pwStrengthLabel');
    box.classList.remove('weak', 'fair', 'strong');
    if (!rules.len || score <= 2) {
        box.classList.add('weak');  label.textContent = 'Weak';
    } else if (score <= 3) {
        box.classList.add('fair');  label.textContent = 'Fair';
    } else {
        box.classList.add('strong'); label.textContent = 'Strong';
    }
};

// ── Password toggle visibility ──────────────────────────────
window.togglePw = function (inputId, btn) {
    var input = document.getElementById(inputId);
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
    else { input.type = 'password'; btn.textContent = '👁️'; }
};

// ── Delete Account ─────────────────────────────────────────
window.openDeleteModal = function () {
    document.getElementById('delPwInput').value = '';
    document.getElementById('delPwErr').textContent = '';
    document.getElementById('delPwInput').classList.remove('is-error');
    document.getElementById('delPwToggle').textContent = '👁️';
    document.getElementById('delPwInput').type = 'password';
    document.getElementById('deleteModal').classList.add('open');
    setTimeout(function() { document.getElementById('delPwInput').focus(); }, 100);
};

window.closeDeleteModal = function () {
    document.getElementById('deleteModal').classList.remove('open');
};

window.toggleDelPw = function () {
    var input = document.getElementById('delPwInput');
    var btn = document.getElementById('delPwToggle');
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
    else { input.type = 'password'; btn.textContent = '👁️'; }
};

window.confirmDeleteAccount = async function () {
    var password = document.getElementById('delPwInput').value.trim();
    var errEl = document.getElementById('delPwErr');
    var input = document.getElementById('delPwInput');
    var btn = document.getElementById('delConfirmBtn');

    if (!password) {
        errEl.textContent = 'Password is required.';
        input.classList.add('is-error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        var res = await fetch(ENDPOINTS.USER.DELETE_ACCOUNT, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AuthService.getToken()
            },
            body: JSON.stringify({ password: password })
        });
        var data = await res.json();

        if (res.status === 422) {
            var msg = (data.errors && data.errors.password) ? data.errors.password : (data.message || 'Incorrect password.');
            errEl.textContent = msg;
            input.classList.add('is-error');
            btn.disabled = false; btn.textContent = 'Delete Account';
            return;
        }
        if (res.status === 409) {
            errEl.textContent = data.message || 'Cannot delete account at this time.';
            btn.disabled = false; btn.textContent = 'Delete Account';
            return;
        }
        if (!res.ok) {
            errEl.textContent = data.message || 'Something went wrong. Please try again.';
            btn.disabled = false; btn.textContent = 'Delete Account';
            return;
        }

        // Success — clear session and redirect
        closeDeleteModal();
        showToast('🗑️', 'Account deleted. Goodbye!', 2500);
        setTimeout(function() {
            sessionStorage.removeItem('tripify_token');
            sessionStorage.removeItem('tripify_user');
            window.location.href = '../auth/login.html';
        }, 2000);

    } catch (e) {
        errEl.textContent = 'Network error. Please check your connection.';
        btn.disabled = false; btn.textContent = 'Delete Account';
    }
};

// Close modal when clicking outside
document.getElementById('deleteModal').addEventListener('click', function(e) {
    if (e.target === this) closeDeleteModal();
});

// ── Logout ─────────────────────────────────────────────────
window.doLogout = function () {
    showToast('👋', 'Signing out...');
    setTimeout(function() {
        sessionStorage.removeItem('tripify_token');
        sessionStorage.removeItem('tripify_user');
        window.location.href = '../auth/login.html';
    }, 1200);
};

// ── Error helpers ──────────────────────────────────────────
function inputIdForField(field) {
    if (field === 'fullName')        return 'eName';
    if (field === 'phoneNumber')     return 'ePhone';
    if (field === 'cnic')            return 'eCnic';
    if (field === 'address')         return 'eAddress';
    if (field === 'currentPassword') return 'pwCurrent';
    if (field === 'newPassword')     return 'pwNew';
    if (field === 'confirmPassword') return 'pwConfirm';
    return '';
}

function showFieldError(field, msg) {
    var el = document.getElementById('err-' + field);
    var input = document.getElementById(inputIdForField(field));
    if (el) el.textContent = msg;
    if (input) input.classList.add('is-error');
}

window.clearFieldError = function (field) {
    var el = document.getElementById('err-' + field);
    var input = document.getElementById(inputIdForField(field));
    if (el) el.textContent = '';
    if (input) input.classList.remove('is-error');
};

function clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function(e) { e.textContent = ''; });
    document.querySelectorAll('.form-input').forEach(function(i) { i.classList.remove('is-error', 'is-valid'); });
}

// ── Toast ──────────────────────────────────────────────────
function showToast(icon, msg, dur) {
    dur = dur || 3000;
    var c = document.getElementById('toastContainer');
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function() { t.classList.add('out'); setTimeout(function() { t.remove(); }, 300); }, dur);
}
window.showToast = showToast;

})();
