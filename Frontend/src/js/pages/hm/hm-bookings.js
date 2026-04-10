const token = sessionStorage.getItem('tripify_token');
if (!token) window.location.href = '../auth/login.html';
const user = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
if (user.userType !== 'HotelManager') window.location.href = '../auth/login.html';

function applyProfile(u) {
  const ini = (u.fullName || 'HM').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('sidebarName').textContent = u.fullName || 'Hotel Manager';
  if (u.profilePicture) {
    const img = `<img src="http://localhost:8080${u.profilePicture}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    document.getElementById('sidebarInitials').innerHTML = img;
    document.getElementById('topbarInitials').innerHTML  = img;
  } else {
    document.getElementById('sidebarInitials').textContent = ini;
    document.getElementById('topbarInitials').textContent  = ini;
  }
}
applyProfile(user);
(async () => {
  try {
    const r = await fetch(ENDPOINTS.USER.PROFILE, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!r.ok) return;
    const d = await r.json();
    if (d.profilePicture) {
      const updated = { ...user, profilePicture: d.profilePicture };
      sessionStorage.setItem('tripify_user', JSON.stringify(updated));
      applyProfile(updated);
    }
  } catch(e) {}
})();
function doLogout(){ AuthService.logout(); }

let allBookings = [];
let activeTab = 'All';
let activeHotelFilter = 0;

async function apiCall(url, opts={}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers||{}) }
  });
  if (res.status === 401) { AuthService.logout(); return null; }
  return res;
}

function badgeCls(status) {
  return {Pending:'badge-warning', Confirmed:'badge-success', Cancelled:'badge-danger'}[status] || 'badge-gray';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', {day:'numeric',month:'short',year:'numeric'});
}

async function load() {
  try {
    // Fetch bookings and hotels list in parallel
    const [bRes, hRes] = await Promise.all([
      apiCall(ENDPOINTS.BOOKINGS.ALL),
      apiCall(ENDPOINTS.HOTELS.MY)
    ]);
    if (!bRes || !bRes.ok) throw new Error();
    const data  = await bRes.json();
    const hotels = (hRes && hRes.ok) ? await hRes.json() : [];
    allBookings = data.bookings || [];

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display  = 'block';

    document.getElementById('statTotal').textContent     = data.totalCount || 0;
    document.getElementById('statPending').textContent   = data.pendingCount || 0;
    document.getElementById('statConfirmed').textContent = allBookings.filter(b => b.bookingStatus === 'Confirmed').length;

    // Populate hotel filter from full hotels list (not just bookings)
    if (hotels.length > 1) {
      const sel = document.getElementById('hotelFilterSelect');
      hotels.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id; opt.textContent = h.name;
        sel.appendChild(opt);
      });
      document.getElementById('hotelFilterWrap').style.display = 'block';
    }

    // Pre-select hotel from URL param
    const urlHotelId = parseInt(new URLSearchParams(location.search).get('hotelId')) || 0;
    if (urlHotelId) {
      activeHotelFilter = urlHotelId;
      const sel = document.getElementById('hotelFilterSelect');
      sel.value = urlHotelId;
      document.getElementById('hotelFilterWrap').style.display = 'block';
    }

    renderTable();
  } catch(e) {
    document.getElementById('loadingState').innerHTML =
      '<div style="color:var(--danger);font-size:14px">Failed to load bookings. Please refresh.</div>';
  }
}

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  renderTable();
}

function setHotelFilter(hotelId) {
  activeHotelFilter = hotelId;
  renderTable();
}

function renderTable() {
  let filtered = activeTab === 'All' ? allBookings : allBookings.filter(b => b.bookingStatus === activeTab);
  if (activeHotelFilter) filtered = filtered.filter(b => b.hotelId === activeHotelFilter);
  const tbody = document.getElementById('bookingsBody');
  const empty = document.getElementById('emptyState');
  const table = document.querySelector('.table-card');

  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    table.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  table.style.display = 'block';

  tbody.innerHTML = filtered.map(b => `
    <tr id="row-${b.bookingId}">
      <td style="font-weight:600">#${b.bookingId}</td>
      <td>
        <div style="font-weight:600">${b.guestName || 'Unknown'}</div>
        <div style="font-size:11.5px;color:var(--text-3)">${b.guestEmail || ''}</div>
      </td>
      <td>${b.hotelName || '—'}</td>
      <td>${b.roomTypeName || '<span style="color:var(--text-3)">General</span>'}</td>
      <td>${fmtDate(b.checkInDate)}</td>
      <td>${fmtDate(b.checkOutDate)}</td>
      <td>${b.nights} night${b.nights !== 1 ? 's' : ''}</td>
      <td style="font-weight:600">PKR ${Number(b.totalCost).toLocaleString()}</td>
      <td><span class="badge ${badgeCls(b.bookingStatus)}">${b.bookingStatus}</span></td>
      <td>
        ${b.bookingStatus === 'Pending' ? `
          <div style="display:flex;gap:6px">
            <button class="btn btn-accept" id="acc-${b.bookingId}" onclick="setStatus(${b.bookingId},'confirm')">Accept</button>
            <button class="btn btn-decline" id="dec-${b.bookingId}" onclick="setStatus(${b.bookingId},'cancel')">Decline</button>
          </div>
        ` : `<span style="font-size:12px;color:var(--text-3)">—</span>`}
      </td>
    </tr>
  `).join('');
}

async function setStatus(id, action) {
  const accBtn = document.getElementById(`acc-${id}`);
  const decBtn = document.getElementById(`dec-${id}`);
  if (accBtn) accBtn.disabled = true;
  if (decBtn) decBtn.disabled = true;

  try {
    const url = action === 'confirm' ? ENDPOINTS.BOOKINGS.CONFIRM(id) : ENDPOINTS.BOOKINGS.CANCEL(id);
    const res = await apiCall(url, { method: 'PUT' });
    if (!res) return;
    if (!res.ok) {
      const err = await res.json();
      showToast(err.message || 'Action failed', 'error');
      return;
    }
    // Update local state
    const b = allBookings.find(x => x.bookingId === id);
    if (b) b.bookingStatus = action === 'confirm' ? 'Confirmed' : 'Cancelled';

    const pending = allBookings.filter(x => x.bookingStatus === 'Pending').length;
    const confirmed = allBookings.filter(x => x.bookingStatus === 'Confirmed').length;
    document.getElementById('statPending').textContent   = pending;
    document.getElementById('statConfirmed').textContent = confirmed;

    renderTable();
    showToast(action === 'confirm' ? 'Booking confirmed!' : 'Booking declined', action === 'confirm' ? 'success' : 'error');
  } catch(e) {
    showToast('Network error', 'error');
    if (accBtn) accBtn.disabled = false;
    if (decBtn) decBtn.disabled = false;
  }
}

function showToast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

load();
