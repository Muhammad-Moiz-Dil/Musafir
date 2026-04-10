// Auth guard
const token = sessionStorage.getItem('tripify_token');
if (!token) window.location.href = '../auth/login.html';
const user = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
if (user.userType !== 'HotelManager') window.location.href = '../auth/login.html';

// Profile
function applyProfile(u) {
  const initials = (u.fullName || 'HM').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('sidebarName').textContent = u.fullName || 'Hotel Manager';
  if (u.profilePicture) {
    const img = `<img src="http://localhost:8080${u.profilePicture}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    document.getElementById('sidebarInitials').innerHTML = img;
    document.getElementById('topbarInitials').innerHTML  = img;
  } else {
    document.getElementById('sidebarInitials').textContent = initials;
    document.getElementById('topbarInitials').textContent  = initials;
  }
}
applyProfile(user);
// Refresh pic from API and persist to sessionStorage
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

function doLogout() { AuthService.logout(); }

// Rating stars: based on averageRating (0–5), empty when null/0
function ratingStars(rating) {
  const filled = Math.round(Number(rating) || 0);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

function hotelImg(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/uploads')) return API_CONFIG.BASE_URL.replace('/api', '') + imageUrl;
  return '../../../../public/assets/images/' + imageUrl;
}

async function loadHotels() {
  try {
    const [hotelsRes, roomsRes] = await Promise.all([
      fetch(ENDPOINTS.HOTELS.MY,  { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(ENDPOINTS.ROOMS.MY,   { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    if (hotelsRes.status === 401) { AuthService.logout(); return; }
    if (!hotelsRes.ok) throw new Error('Failed to load hotels');

    const hotels = await hotelsRes.json();
    const rooms  = roomsRes.ok ? await roomsRes.json() : [];

    // Build per-hotel room totals from RoomTypes (source of truth)
    const roomTotals = {};
    for (const r of rooms) {
      if (!roomTotals[r.hotelId]) roomTotals[r.hotelId] = { total: 0, available: 0 };
      roomTotals[r.hotelId].total     += Number(r.totalRooms)     || 0;
      roomTotals[r.hotelId].available += Number(r.availableRooms) || 0;
    }

    document.getElementById('loadingState').style.display = 'none';

    if (!hotels.length) {
      document.getElementById('emptyState').style.display = 'block';
      return;
    }

    const grid = document.getElementById('hotelsGrid');
    grid.style.display = 'grid';
    grid.innerHTML = hotels.map(h => {
      const rt        = roomTotals[h.id] || { total: h.totalRooms || 0, available: h.availableRooms || 0 };
      const totalRms  = rt.total;
      const availRms  = rt.available;
      const imgSrc    = hotelImg(h.imageUrl);
      const imgHtml   = imgSrc
        ? `<img class="hotel-img" src="${imgSrc}" alt="${h.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : '';
      return `
      <div class="hotel-card">
        ${imgHtml}<div class="hotel-img-placeholder" style="${imgSrc ? 'display:none' : ''}">🏨</div>
        <div class="hotel-body">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div class="hotel-name">${h.name}</div>
            <span class="badge ${h.isActive ? 'badge-success' : 'badge-warning'}">${h.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div class="hotel-dest">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${h.destinationName}
          </div>
          <div style="color:#F59E0B;font-size:14px;margin-bottom:12px">${ratingStars(h.averageRating)} <span style="color:var(--text-3);font-size:12px">${h.averageRating ? Number(h.averageRating).toFixed(1) + '/5' : 'No reviews'}</span></div>
          <div class="hotel-stats">
            <div class="hotel-stat">
              <div class="hotel-stat-val">${availRms}</div>
              <div class="hotel-stat-lbl">Available</div>
            </div>
            <div class="hotel-stat">
              <div class="hotel-stat-val">${totalRms}</div>
              <div class="hotel-stat-lbl">Total Rooms</div>
            </div>
            <div class="hotel-stat">
              <div class="hotel-stat-val">${h.averageRating ? Number(h.averageRating).toFixed(1) : '—'}</div>
              <div class="hotel-stat-lbl">Avg Rating</div>
            </div>
          </div>
          <div style="font-size:12.5px;color:var(--text-2)"><strong>PKR ${Number(h.pricePerNight).toLocaleString()}</strong> / night base rate</div>
        </div>
        <div class="hotel-footer">
          <a href="hm-hotel-profile.html?id=${h.id}" class="btn btn-primary btn-sm">View Profile</a>
          <a href="hm-bookings.html" class="btn btn-ghost btn-sm">Bookings</a>
          <a href="hm-rooms.html" class="btn btn-ghost btn-sm">Rooms</a>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    console.error(e);
  }
}

async function loadAvailability() {
  try {
    const res = await fetch(ENDPOINTS.ROOMS.MY, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { return; }
    const rooms = await res.json();
    if (!Array.isArray(rooms) || !rooms.length) {
      return;
    }

    // Group by hotel and sum rooms
    const hotelMap = {};
    for (const r of rooms) {
      const id = r.hotelId;
      if (!hotelMap[id]) {
        hotelMap[id] = { name: r.hotelName || 'Hotel #' + id, total: 0, available: 0 };
      }
      hotelMap[id].total     += Number(r.totalRooms)     || 0;
      hotelMap[id].available += Number(r.availableRooms) || 0;
    }

    document.getElementById('availSection').style.display = 'block';

    const tbody = document.getElementById('availBody');
    let html = '';
    for (const id of Object.keys(hotelMap)) {
      const h        = hotelMap[id];
      const occupied = h.total - h.available;
      const pct      = h.total > 0 ? Math.round((occupied / h.total) * 100) : 0;
      const barClass = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '';
      html += `
        <tr>
          <td style="font-weight:600;color:#0F172A">${h.name}</td>
          <td>${h.total}</td>
          <td style="color:#10B981;font-weight:600">${h.available}</td>
          <td>${occupied}</td>
          <td>
            <span class="avail-bar"><span class="avail-bar-fill ${barClass}" style="width:${pct}%"></span></span>
            <span style="font-size:12px;font-weight:600">${pct}%</span>
          </td>
        </tr>`;
    }
    tbody.innerHTML = html;
  } catch(e) { console.error('Availability load error:', e); }
}

loadHotels();
loadAvailability();
