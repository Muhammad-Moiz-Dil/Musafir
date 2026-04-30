(function () {
  const token = sessionStorage.getItem('tripify_token');
  const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
  if (!token || user.userType !== 'Admin') { window.location.replace('../auth/admin-login.html'); return; }

  function authHeaders() {
    return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg, type) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'success');
    t.innerHTML = '<span class="toast-icon">' + (type === 'error' ? '❌' : '✅') + '</span><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
      t.style.transition = 'all .3s';
    }, 3000);
    setTimeout(function () { t.remove(); }, 3400);
  }

  function clearErr(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  }
  function setErr(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  // ── Populate UI ────────────────────────────────────────────────────────────
  function applyProfile(p) {
    const ini = (p.fullName || 'SA').split(' ').map(function (n) { return n[0]; }).join('').slice(0, 2).toUpperCase();
    document.getElementById('topbarInitials').textContent = ini;
    document.getElementById('profileAvatar').textContent  = ini;
    document.getElementById('profileName').textContent    = p.fullName    || 'Super Admin';
    document.getElementById('profileEmail').textContent   = p.email       || '—';
    document.getElementById('inputName').value            = p.fullName    || '';
    document.getElementById('inputEmail').value           = p.email       || '';
    document.getElementById('inputPhone').value           = p.phoneNumber || '';
    if (p.id || p.userId) {
      document.getElementById('inputUserId').value = '#' + (p.id || p.userId);
    }
    // memberSince and lastLogin come pre-formatted from backend
    if (p.memberSince) document.getElementById('statMemberSince').textContent = p.memberSince;
    if (p.lastLogin)   document.getElementById('statLastLogin').textContent   = p.lastLogin;

    // Profile picture
    if (p.profilePicture) {
      const url = p.profilePicture.startsWith('http') ? p.profilePicture : 'http://localhost:8080' + p.profilePicture;
      ['topbarInitials', 'profileAvatar'].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        const img = document.createElement('img');
        img.src = url; img.alt = '';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
        img.onerror = function () { el.textContent = ini; };
        el.textContent = ''; el.appendChild(img);
      });
    }
  }

  // ── Load fresh profile from API ────────────────────────────────────────────
  async function loadProfile() {
    try {
      const r = await fetch(ENDPOINTS.USER.PROFILE, { headers: authHeaders() });
      if (!r.ok) return;
      const p = await r.json();
      applyProfile(Object.assign({}, user, p));
    } catch (e) {}
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  window.saveProfile = async function () {
    clearErr('emailErr'); clearErr('phoneErr');

    const name  = document.getElementById('inputName').value.trim();
    const email = document.getElementById('inputEmail').value.trim();
    const phone = document.getElementById('inputPhone').value.trim().replace(/[\s\-]/g, '');

    let hasError = false;

    if (!name) { showToast('Full name is required.', 'error'); return; }

    // Email — required + whitelist check
    if (!email) {
      setErr('emailErr', 'Email address is required.');
      hasError = true;
    } else if (!Validator.email(email)) {
      setErr('emailErr', 'Enter a valid email (Gmail, Yahoo, Outlook, etc.).');
      hasError = true;
    }

    // Phone — optional, but must be valid Pakistani format if provided
    if (phone && !Validator.phone(phone)) {
      setErr('phoneErr', 'Use format 03XX-XXXXXXX or +923XXXXXXXXX.');
      hasError = true;
    }

    if (hasError) return;

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      const r = await fetch(ENDPOINTS.USER.PROFILE, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ fullName: name, email: email, phoneNumber: phone })
      });
      const data = await r.json();
      if (!r.ok) {
        if (data.errors) {
          if (data.errors.email) setErr('emailErr', data.errors.email);
          if (data.errors.phoneNumber) setErr('phoneErr', data.errors.phoneNumber);
        }
        showToast(data.message || 'Failed to save changes.', 'error');
        return;
      }
      const updated = Object.assign({}, user, { fullName: name, email: email });
      sessionStorage.setItem('tripify_user', JSON.stringify(updated));
      showToast('Profile updated successfully!');
      applyProfile(updated);
    } catch (e) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes';
    }
  };

  // ── Reset form ────────────────────────────────────────────────────────────
  window.resetForm = function () {
    clearErr('emailErr'); clearErr('phoneErr');
    loadProfile();
  };

  // ── Change password ───────────────────────────────────────────────────────
  window.changePassword = async function () {
    const current = document.getElementById('currentPwd').value;
    const newPwd  = document.getElementById('newPwd').value;
    const confirm = document.getElementById('confirmPwd').value;

    if (!current || !newPwd || !confirm) { showToast('All password fields are required.', 'error'); return; }
    if (newPwd.length < 8)               { showToast('New password must be at least 8 characters.', 'error'); return; }
    if (newPwd !== confirm)              { showToast('New passwords do not match.', 'error'); return; }

    const strength = Validator.passwordStrength(newPwd);
    if (strength.level < 1) { showToast('Password is too weak. Add uppercase, numbers, or symbols.', 'error'); return; }

    const btn = document.getElementById('changePwdBtn');
    btn.disabled = true; btn.textContent = 'Updating…';

    try {
      const r = await fetch(ENDPOINTS.USER.CHANGE_PASSWORD, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword: current, newPassword: newPwd, confirmPassword: confirm })
      });
      const data = await r.json();
      if (!r.ok) { showToast(data.message || 'Failed to update password.', 'error'); return; }
      showToast('Password updated successfully!');
      ['currentPwd', 'newPwd', 'confirmPwd'].forEach(function (id) { document.getElementById(id).value = ''; });
    } catch (e) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Update Password';
    }
  };

  // ── Phone auto-format as user types ──────────────────────────────────────
  document.getElementById('inputPhone').addEventListener('input', function () {
    this.value = Validator.formatPhone(this.value);
    clearErr('phoneErr');
  });
  document.getElementById('inputEmail').addEventListener('input', function () { clearErr('emailErr'); });

  // ── Logout ────────────────────────────────────────────────────────────────
  window.doLogout = function () { AuthService.logout(); };

  // ── Live moderation badge ─────────────────────────────────────────────────
  (async function () {
    try {
      const r = await fetch(ENDPOINTS.ADMIN.FLAGS_COUNT, { headers: authHeaders() });
      if (!r.ok) return;
      const d = await r.json();
      const b = document.getElementById('moderationBadge');
      if (b) { if (d.count > 0) { b.textContent = d.count; b.style.display = ''; } else b.style.display = 'none'; }
    } catch (e) {}
  })();

  // ── Init ─────────────────────────────────────────────────────────────────
  applyProfile(user);   // instant render from session
  loadProfile();        // then fetch fresh from API
})();
