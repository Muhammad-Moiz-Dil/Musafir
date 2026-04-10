(function(){
  const token = sessionStorage.getItem('tripify_token');
  const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
  if (!token || user.userType !== 'Admin') { window.location.href = '../auth/admin-login.html'; return; }

  const ini = (user.fullName||'SA').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('topbarInitials').textContent  = ini;

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateY(12px)'; toast.style.transition='all .3s ease'; }, 2800);
    setTimeout(() => toast.remove(), 3200);
  }

  // ── Tab switching ──────────────────────────────────────────────────────────
  window.switchTab = function(id, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panelId = 'tab' + id.charAt(0).toUpperCase() + id.slice(1);
    document.getElementById(panelId).classList.add('active');
    if (id === 'logs'    && !logsLoaded)    loadLogs();
    if (id === 'reviews' && !reviewsLoaded) loadReviews();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function authHeaders() { return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }; }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })
         + ' ' + d.toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit', hour12:true });
  }

  function avatarColor(name) {
    const colors = ['#2563EB','#10B981','#8B5CF6','#F59E0B','#EF4444','#0891B2','#EC4899','#6366F1'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }

  function initials(name) {
    return (name||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  }

  function actionBadge(action) {
    const a = (action||'').toUpperCase();
    let cls = 'badge-other';
    if (a.includes('LOGIN'))    cls = 'badge-login';
    else if (a.includes('REGISTER')) cls = 'badge-register';
    else if (a.includes('BOOKING'))  cls = 'badge-booking';
    else if (a.includes('REVIEW'))   cls = 'badge-review';
    else if (a.includes('ADMIN'))    cls = 'badge-admin';
    return `<span class="badge badge-action ${cls}">${action}</span>`;
  }

  function starsHtml(rating) {
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<span style="color:${i<=rating?'#F59E0B':'#CBD5E1'}">${i<=rating?'★':'☆'}</span>`;
    return `<div class="stars">${s}</div>`;
  }

  function rowSelect(tr) {
    document.querySelectorAll('tbody tr.row-selected').forEach(r => r.classList.remove('row-selected'));
    tr.classList.add('row-selected');
  }

  // ── Flag content ───────────────────────────────────────────────────────────
  window.flagContent = function(contentType, contentId, btn) {
    btn.disabled = true;
    btn.textContent = 'Flagging…';
    fetch(ENDPOINTS.ADMIN.FLAG, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ contentType, contentId })
    })
    .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
    .then(({ ok, data }) => {
      if (ok) {
        btn.replaceWith(Object.assign(document.createElement('span'), {
          className: 'badge badge-flagged', textContent: '⚑ Flagged'
        }));
        showToast('Content flagged successfully. Marked for review.', 'success');
      } else if (data.message && data.message.includes('Already flagged')) {
        btn.replaceWith(Object.assign(document.createElement('span'), {
          className: 'badge badge-flagged', textContent: '⚑ Flagged'
        }));
        showToast('This entry was already flagged.', 'success');
      } else {
        btn.disabled = false;
        btn.textContent = '⚑ Flag';
        showToast(data.message || 'Failed to flag content.', 'error');
      }
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = '⚑ Flag';
      showToast('Connection error. Please try again.', 'error');
    });
  };

  // ── USERS tab ──────────────────────────────────────────────────────────────
  let allUsers = [], currentFilter = 'all';

  function loadUsers() {
    const body = document.getElementById('usersBody');
    body.innerHTML = '<tr><td colspan="5"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>';
    document.getElementById('usersError').classList.remove('show');

    fetch(ENDPOINTS.ADMIN.USERS, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message || 'Failed to load users'); }))
      .then(data => {
        allUsers = data.users || [];
        document.getElementById('statTotal').textContent    = data.total        || 0;
        document.getElementById('statTourists').textContent = data.tourists      || 0;
        document.getElementById('statHMs').textContent      = data.hotelManagers || 0;
        document.getElementById('statNew').textContent      = data.newThisMonth  || 0;
        renderUsers();
      })
      .catch(err => {
        const eb = document.getElementById('usersError');
        eb.textContent = err.message || 'Failed to load users. Try refreshing.';
        eb.classList.add('show');
        body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load users</div></div></td></tr>';
        document.getElementById('userFooter').textContent = '—';
      });
  }

  function renderUsers() {
    const q      = document.getElementById('userSearch').value.toLowerCase();
    const body   = document.getElementById('usersBody');
    const filtered = allUsers.filter(u => {
      const matchRole = currentFilter === 'all' || u.userType === currentFilter;
      const matchQ    = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchRole && matchQ;
    });

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">No users found</div><div class="empty-msg">Try adjusting your search or filter.</div></div></td></tr>`;
      document.getElementById('userFooter').textContent = 'No results';
      return;
    }

    body.innerHTML = filtered.map(u => {
      const color     = avatarColor(u.fullName);
      const ini       = initials(u.fullName);
      const roleBadge = u.userType === 'Tourist'
        ? '<span class="badge badge-blue">Tourist</span>'
        : '<span class="badge badge-purple">Hotel Manager</span>';
      const statusBadge = u.isActive
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge badge-red">Inactive</span>';
      return `<tr onclick="rowSelect(this)" id="user-row-${u.id}">
        <td><div class="user-cell"><div class="u-avatar" style="background:${color}">${ini}</div><div><div class="u-name">${u.fullName}</div><div class="u-email">${u.email}</div></div></div></td>
        <td>${roleBadge}</td>
        <td>${u.phoneNumber || '—'}</td>
        <td>${fmtDate(u.createdAt)}</td>
        <td>${statusBadge}</td>
        <td><button class="btn-del" onclick="event.stopPropagation();confirmDelete(${u.id},'${u.fullName.replace(/'/g,"\\'")}')">🗑 Delete</button></td>
      </tr>`;
    }).join('');

    document.getElementById('userFooter').textContent =
      `Showing ${filtered.length} of ${allUsers.length} users`;
  }

  window.setUserFilter = function(btn, role) {
    document.querySelectorAll('.fpill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = role;
    renderUsers();
  };

  document.getElementById('userSearch').addEventListener('input', renderUsers);

  // ── LOGS tab ───────────────────────────────────────────────────────────────
  let logsLoaded = false;

  function loadLogs(userId, action) {
    const body = document.getElementById('logsBody');
    body.innerHTML = '<tr><td colspan="6"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>';
    document.getElementById('logsError').classList.remove('show');
    document.getElementById('btnSearchLogs').disabled = true;

    fetch(ENDPOINTS.ADMIN.LOGS(userId || null, action || null), { headers: authHeaders() })
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message || 'Failed to load logs'); }))
      .then(data => {
        logsLoaded = true;
        const logs = data.logs || [];

        if (!logs.length) {
          body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No logs found</div><div class="empty-msg">No activity matches your search.</div></div></td></tr>`;
          document.getElementById('logsFooter').textContent = 'No results';
          return;
        }

        body.innerHTML = logs.map(lg => {
          const flagCell = `<button class="flag-btn" onclick="event.stopPropagation();flagContent('LOG',${lg.logId},this)">⚑ Flag</button>`;
          return `<tr onclick="rowSelect(this)">
            <td style="color:var(--text-3);font-size:12px">${lg.logId}</td>
            <td>${lg.userId ? `<span style="color:var(--text-1);font-weight:600">${lg.userName}</span><br><small style="color:var(--text-3)">ID: ${lg.userId}</small>` : '<span style="color:var(--text-3)">—</span>'}</td>
            <td>${actionBadge(lg.action)}</td>
            <td style="font-family:monospace;font-size:12px;color:var(--text-3)">${lg.ipAddress}</td>
            <td style="font-size:12.5px;color:var(--text-2)">${fmtDateTime(lg.createdAt)}</td>
            <td>${flagCell}</td>
          </tr>`;
        }).join('');

        document.getElementById('logsFooter').textContent = `${logs.length} log${logs.length !== 1 ? 's' : ''} found`;
      })
      .catch(err => {
        logsLoaded = false;
        const eb = document.getElementById('logsError');
        eb.textContent = err.message || 'Failed to load logs. Please refresh the page.';
        eb.classList.add('show');
        body.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load logs</div><div class="empty-msg">Check your connection and refresh the page.</div></div></td></tr>';
        document.getElementById('logsFooter').textContent = '—';
      })
      .finally(() => { document.getElementById('btnSearchLogs').disabled = false; });
  }

  window.searchLogs = function() {
    const userId = document.getElementById('logUserId').value.trim();
    const action = document.getElementById('logAction').value.trim();
    logsLoaded = false;
    loadLogs(userId || null, action || null);
  };

  window.clearLogFilters = function() {
    document.getElementById('logUserId').value = '';
    document.getElementById('logAction').value  = '';
    logsLoaded = false;
    loadLogs();
  };

  // ── REVIEWS tab ────────────────────────────────────────────────────────────
  let reviewsLoaded = false;

  function loadReviews() {
    const body = document.getElementById('reviewsBody');
    body.innerHTML = '<tr><td colspan="7"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>';
    document.getElementById('reviewsError').classList.remove('show');

    fetch(ENDPOINTS.ADMIN.REVIEWS, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message || 'Failed to load reviews'); }))
      .then(data => {
        reviewsLoaded = true;
        const reviews = data.reviews || [];

        if (!reviews.length) {
          body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">No reviews yet</div><div class="empty-msg">Reviews from tourists will appear here.</div></div></td></tr>`;
          document.getElementById('reviewsFooter').textContent = 'No results';
          return;
        }

        body.innerHTML = reviews.map(r => {
          const color  = avatarColor(r.userName);
          const ini    = initials(r.userName);
          const typeBadge = r.type === 'REVIEW'
            ? '<span class="badge badge-blue" style="font-size:11px">Destination</span>'
            : '<span class="badge badge-purple" style="font-size:11px">Hotel</span>';
          const flagCell = r.flagged
            ? '<span class="badge badge-flagged">⚑ Flagged</span>'
            : `<button class="flag-btn" onclick="event.stopPropagation();flagContent('${r.type}',${r.id},this)">⚑ Flag</button>`;
          const text = r.text ? (r.text.length > 80 ? r.text.slice(0,80)+'…' : r.text) : '<span style="color:var(--text-3);font-style:italic">No comment</span>';
          return `<tr onclick="rowSelect(this)">
            <td><div class="user-cell"><div class="u-avatar" style="background:${color};width:30px;height:30px;font-size:11px">${ini}</div><div><div class="u-name" style="font-size:13px">${r.userName}</div></div></div></td>
            <td>${typeBadge}</td>
            <td style="font-weight:500;color:var(--text-1);font-size:13px">${r.targetName}</td>
            <td>${starsHtml(r.rating)}</td>
            <td style="font-size:12.5px;color:var(--text-2);max-width:220px">${text}</td>
            <td style="font-size:12px;color:var(--text-3)">${fmtDate(r.createdAt)}</td>
            <td>${flagCell}</td>
          </tr>`;
        }).join('');

        document.getElementById('reviewsFooter').textContent =
          `${reviews.length} review${reviews.length !== 1 ? 's' : ''} total`;
      })
      .catch(err => {
        reviewsLoaded = false;
        const eb = document.getElementById('reviewsError');
        eb.textContent = err.message || 'Failed to load reviews. Please refresh the page.';
        eb.classList.add('show');
        body.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load reviews</div><div class="empty-msg">Check your connection and refresh the page.</div></div></td></tr>';
        document.getElementById('reviewsFooter').textContent = '—';
      });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  window.doLogout = function() {
    sessionStorage.removeItem('tripify_token');
    sessionStorage.removeItem('tripify_user');
    window.location.href = '../auth/admin-login.html';
  };

  // ── Delete user ────────────────────────────────────────────────────────────
  let deleteTargetId = null;

  window.confirmDelete = function(userId, userName) {
    deleteTargetId = userId;
    document.getElementById('deleteModalSub').textContent =
      `Permanently delete "${userName}"? This cannot be undone.`;
    document.getElementById('deleteModal').classList.add('show');
  };

  window.closeDeleteModal = function() {
    document.getElementById('deleteModal').classList.remove('show');
    deleteTargetId = null;
  };

  window.executeDelete = async function() {
    if (!deleteTargetId) return;
    const btn = document.getElementById('deleteConfirmBtn');
    btn.disabled = true; btn.textContent = 'Deleting…';
    try {
      const res = await fetch(`http://localhost:8080/api/admin/users/${deleteTargetId}`, {
        method: 'DELETE', headers: authHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById(`user-row-${deleteTargetId}`)?.remove();
        allUsers = allUsers.filter(u => u.id !== deleteTargetId);
        showToast('User deleted successfully', 'success');
        closeDeleteModal();
      } else {
        showToast(data.message || 'Failed to delete user', 'error');
      }
    } catch {
      showToast('Connection error. Please try again.', 'error');
    }
    btn.disabled = false; btn.textContent = 'Delete';
  };

  document.getElementById('deleteModal').addEventListener('click', function(e) {
    if (e.target === this) closeDeleteModal();
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  loadUsers();
})();
