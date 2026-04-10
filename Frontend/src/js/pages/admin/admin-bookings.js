(function(){
  const token = sessionStorage.getItem('tripify_token');
  const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
  if (!token || user.userType !== 'Admin') { window.location.href = '../auth/admin-login.html'; return; }

  const ini = (user.fullName || 'SA').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('topbarInitials').textContent  = ini;

  window.doLogout = function() {
    sessionStorage.removeItem('tripify_token');
    sessionStorage.removeItem('tripify_user');
    window.location.href = '../auth/admin-login.html';
  };

  // ── Moderation badge ──────────────────────────────────────
  (async function() {
    try {
      const r = await fetch(ENDPOINTS.ADMIN.FLAGS_COUNT, { headers: { 'Authorization': 'Bearer ' + token } });
      if (!r.ok) return;
      const { count } = await r.json();
      const b = document.getElementById('moderationBadge');
      if (b) { if (count > 0) b.textContent = count; else b.style.display = 'none'; }
    } catch(e) {}
  })();

  // ── Admin profile picture ─────────────────────────────────
  (async function() {
    const _i = (user.fullName || 'SA').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    try {
      const r = await fetch(ENDPOINTS.USER.PROFILE, { headers: { 'Authorization': 'Bearer ' + token } });
      if (!r.ok) return;
      const u = await r.json();
      if (!u.profilePicture) return;
      const url = u.profilePicture.startsWith('http') ? u.profilePicture : 'http://localhost:8080' + u.profilePicture;
      [document.getElementById('topbarInitials'), document.getElementById('sidebarInitials')].forEach(function(el) {
        if (!el) return;
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.onerror = function() { el.textContent = _i; el.style.background = ''; };
        el.textContent = '';
        el.style.background = 'transparent';
        el.appendChild(img);
      });
    } catch(e) {}
  })();

  // ── Bookings data ─────────────────────────────────────────
  let allBookings = [];
  let activeFilter = 'All';
  let searchQ = '';

  const AVATAR_COLORS = ['#2563EB','#10B981','#8B5CF6','#F59E0B','#EF4444','#0891B2','#6366F1','#EC4899','#14B8A6','#F97316'];
  function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFF;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }
  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtAmount(v) {
    if (v == null) return '—';
    const n = parseFloat(v);
    return isNaN(n) ? '—' : 'PKR ' + n.toLocaleString('en-PK', { maximumFractionDigits: 0 });
  }
  function badgeHtml(status) {
    const map = { Pending:'badge-yellow', Confirmed:'badge-green', Cancelled:'badge-red', Completed:'badge-blue' };
    return `<span class="badge ${map[status] || 'badge-gray'}">${status || '—'}</span>`;
  }

  function renderTable() {
    const q = searchQ.toLowerCase();
    const rows = allBookings.filter(b => {
      const matchFilter = activeFilter === 'All' || b.bookingStatus === activeFilter;
      const matchQ = !q ||
        String(b.bookingId).includes(q) ||
        (b.guestName  || '').toLowerCase().includes(q) ||
        (b.hotelName  || '').toLowerCase().includes(q);
      return matchFilter && matchQ;
    });

    const tbody = document.getElementById('tableBody');
    document.getElementById('footerInfo').textContent = `Showing ${rows.length} of ${allBookings.length} booking${allBookings.length !== 1 ? 's' : ''}`;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No bookings found.</div></td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(b => `
      <tr>
        <td><span class="booking-id">#BK-${b.bookingId}</span></td>
        <td><div class="tourist-cell">
          <div class="t-avatar" style="background:${avatarColor(b.guestName)}">${initials(b.guestName)}</div>
          ${b.guestName || '—'}
        </div></td>
        <td>${b.hotelName || '—'}</td>
        <td>${fmtDate(b.checkInDate)}</td>
        <td>${fmtDate(b.checkOutDate)}</td>
        <td>${b.numberOfGuests || '—'}</td>
        <td><span class="amount">${fmtAmount(b.totalCost)}</span></td>
        <td>${badgeHtml(b.bookingStatus)}</td>
      </tr>`).join('');
  }

  window.setFilter = function(f, el) {
    activeFilter = f;
    document.querySelectorAll('.fpill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderTable();
  };

  document.getElementById('searchInput').addEventListener('input', function() {
    searchQ = this.value.trim();
    renderTable();
  });

  (async function load() {
    try {
      const res = await fetch(ENDPOINTS.BOOKINGS.ADMIN_ALL, { headers: { 'Authorization': 'Bearer ' + token } });
      if (!res.ok) throw new Error();
      allBookings = await res.json();

      // Stats
      const total     = allBookings.length;
      const pending   = allBookings.filter(b => b.bookingStatus === 'Pending').length;
      const confirmed = allBookings.filter(b => b.bookingStatus === 'Confirmed').length;
      const revenue   = allBookings
        .filter(b => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed')
        .reduce((sum, b) => sum + parseFloat(b.totalCost || 0), 0);

      document.getElementById('statTotal').textContent     = total;
      document.getElementById('statPending').textContent   = pending;
      document.getElementById('statConfirmed').textContent = confirmed;
      const revM = revenue >= 1_000_000
        ? (revenue / 1_000_000).toFixed(1) + 'M'
        : revenue >= 1000
          ? (revenue / 1000).toFixed(0) + 'K'
          : revenue.toFixed(0);
      document.getElementById('statRevenue').textContent = 'PKR ' + revM;

      renderTable();
    } catch(e) {
      document.getElementById('tableBody').innerHTML =
        '<tr><td colspan="8"><div class="empty-state">Failed to load bookings. Please refresh.</div></td></tr>';
      document.getElementById('footerInfo').textContent = '';
    }
  })();
})();
