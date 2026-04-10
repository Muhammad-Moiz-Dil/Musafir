(function(){
  const token = sessionStorage.getItem('tripify_token');
  const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
  if (!token || user.userType !== 'Admin') { window.location.href = '../auth/admin-login.html'; return; }

  const ini = (user.fullName||'SA').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('topbarInitials').textContent  = ini;

  function authHeaders() { return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }; }

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${type==='success'?'✅':'⚠️'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(12px)'; t.style.transition='all .3s'; }, 2800);
    setTimeout(() => t.remove(), 3200);
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
  }

  function avatarColor(name) {
    const cols=['#2563EB','#10B981','#8B5CF6','#F59E0B','#EF4444','#0891B2','#EC4899'];
    let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))&0xffffffff;
    return cols[Math.abs(h)%cols.length];
  }
  function initials(n){ return (n||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

  // ── State ──────────────────────────────────────────────────────────────────
  let allFlags = [], currentFilter = 'all';
  let sessionDismissed = 0, sessionResolved = 0;

  // ── Load flags ─────────────────────────────────────────────────────────────
  window.loadFlags = function() {
    const body = document.getElementById('flagsBody');
    body.innerHTML = '<tr><td colspan="6"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>';
    document.getElementById('flagsError').classList.remove('show');

    fetch(ENDPOINTS.ADMIN.FLAGS, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message || 'Failed to load'); }))
      .then(data => {
        allFlags = data.flags || [];
        document.getElementById('statPending').textContent  = allFlags.length;
        document.getElementById('statDismissed').textContent = sessionDismissed;
        document.getElementById('statResolved').textContent  = sessionResolved;
        const badge = document.getElementById('pendingBadge');
        if (allFlags.length > 0) { badge.textContent = allFlags.length; badge.style.display=''; }
        else badge.style.display='none';
        renderFlags();
      })
      .catch(err => {
        const eb = document.getElementById('flagsError');
        eb.textContent = err.message || 'Failed to load flagged content. Please refresh the page.';
        eb.classList.add('show');
        body.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load flags</div><div class="empty-msg">Check your connection and refresh the page.</div></div></td></tr>';
        document.getElementById('flagsFooter').textContent = '—';
      });
  };

  function renderFlags() {
    const q    = document.getElementById('flagSearch').value.toLowerCase();
    const body = document.getElementById('flagsBody');
    const filtered = allFlags.filter(f => {
      const matchType = currentFilter === 'all' || f.contentType === currentFilter;
      const matchQ    = !q || (f.preview||'').toLowerCase().includes(q)
                           || (f.targetName||'').toLowerCase().includes(q)
                           || (f.userName||'').toLowerCase().includes(q);
      return matchType && matchQ;
    });

    if (!filtered.length) {
      const msg = allFlags.length === 0
        ? 'No flagged content — everything looks clean!'
        : 'No results match your search/filter.';
      body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🛡️</div><div class="empty-title">${allFlags.length===0?'All clear':'No results'}</div><div class="empty-msg">${msg}</div></div></td></tr>`;
      document.getElementById('flagsFooter').textContent = allFlags.length === 0 ? 'No pending flags' : 'No results';
      return;
    }

    body.innerHTML = filtered.map(f => {
      const typeBadge = f.contentType === 'REVIEW'
        ? '<span class="badge badge-purple" style="font-size:11px">Dest. Review</span>'
        : f.contentType === 'HOTEL_REVIEW'
          ? '<span class="badge badge-blue" style="font-size:11px">Hotel Review</span>'
          : '<span class="badge badge-gray" style="font-size:11px">Activity Log</span>';

      const color  = avatarColor(f.userName || 'U');
      const ini    = initials(f.userName || 'U');
      const preview = (f.preview||'No content');
      const previewShort = preview.length > 70 ? preview.slice(0,70)+'…' : preview;

      const canDelete = f.contentType !== 'LOG'; // logs can only be dismissed
      const deleteBtn = canDelete
        ? `<button class="act-btn danger" onclick="doAction('resolve',${f.flagId},this)" title="Delete content & resolve flag">Delete</button>`
        : '';

      return `<tr>
        <td>${typeBadge}</td>
        <td><div class="content-preview" title="${preview.replace(/"/g,'&quot;')}">"${previewShort}"</div></td>
        <td><div class="reporter-cell"><div class="r-avatar" style="background:${color}">${ini}</div><span style="font-size:13px">${f.userName}</span></div></td>
        <td style="font-weight:500;color:var(--text-1);font-size:13px">${f.targetName}</td>
        <td style="font-size:12px;color:var(--text-3)">${fmtDate(f.createdAt)}</td>
        <td><div class="actions">
          <button class="act-btn success" onclick="doAction('dismiss',${f.flagId},this)" title="Dismiss — content stays, flag closed">Dismiss</button>
          ${deleteBtn}
        </div></td>
      </tr>`;
    }).join('');

    document.getElementById('flagsFooter').textContent = `${filtered.length} pending flag${filtered.length!==1?'s':''} shown`;
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  window.doAction = function(type, flagId, btn) {
    const row = btn.closest('tr');
    btn.disabled = true;
    row.querySelectorAll('.act-btn').forEach(b => b.disabled = true);

    const url = type === 'dismiss'
      ? ENDPOINTS.ADMIN.FLAG_DISMISS(flagId)
      : ENDPOINTS.ADMIN.FLAG_RESOLVE(flagId);

    fetch(url, { method:'PUT', headers: authHeaders() })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          if (type === 'dismiss') {
            sessionDismissed++;
            showToast('Flag dismissed — content remains visible.', 'success');
          } else {
            sessionResolved++;
            showToast('Content deleted and flag resolved.', 'success');
          }
          // Remove flag from local state and re-render
          allFlags = allFlags.filter(f => f.flagId !== flagId);
          document.getElementById('statPending').textContent   = allFlags.length;
          document.getElementById('statDismissed').textContent = sessionDismissed;
          document.getElementById('statResolved').textContent  = sessionResolved;
          const badge = document.getElementById('pendingBadge');
          if (allFlags.length > 0) { badge.textContent = allFlags.length; badge.style.display=''; }
          else badge.style.display='none';
          renderFlags();
        } else {
          row.querySelectorAll('.act-btn').forEach(b => b.disabled = false);
          showToast(data.message || 'Action failed.', 'error');
        }
      })
      .catch(() => {
        row.querySelectorAll('.act-btn').forEach(b => b.disabled = false);
        showToast('Connection error. Please try again.', 'error');
      });
  };

  window.setFilter = function(btn, type) {
    document.querySelectorAll('.fpill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = type;
    renderFlags();
  };

  window.filterFlags = renderFlags;

  window.doLogout = function() {
    sessionStorage.removeItem('tripify_token');
    sessionStorage.removeItem('tripify_user');
    window.location.href = '../auth/admin-login.html';
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  loadFlags();
})();
