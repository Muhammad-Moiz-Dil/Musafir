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

let rooms = [];
let hotelSectionIds = [];   // tracks rendered hotel section element IDs

function filterSections() {
  const q = document.getElementById('hotelSearch').value.toLowerCase().trim();
  hotelSectionIds.forEach(({ id, name }) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (!q || name.toLowerCase().includes(q)) ? '' : 'none';
  });
}

async function apiCall(url, opts={}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers||{}) }
  });
  if (res.status === 401) { AuthService.logout(); return null; }
  return res;
}

async function load() {
  try {
    const res = await apiCall(ENDPOINTS.ROOMS.MY);
    if (!res || !res.ok) throw new Error();
    rooms = await res.json();
    document.getElementById('loadingState').style.display = 'none';

    if (!rooms.length) { document.getElementById('emptyState').style.display = 'block'; return; }

    // Group by hotel
    const byHotel = {};
    rooms.forEach(r => {
      const k = r.hotelId;
      if (!byHotel[k]) byHotel[k] = { name: r.hotelName, rooms: [] };
      byHotel[k].rooms.push(r);
    });

    hotelSectionIds = Object.entries(byHotel).map(([hid, h]) => ({ id: `hs-${hid}`, name: h.name }));
    const cont = document.getElementById('pricingContent');
    cont.innerHTML = Object.entries(byHotel).map(([hid, h]) => `
      <div class="hotel-section" id="hs-${hid}">
        <div class="hotel-section-hdr">
          <div>
            <div class="hotel-section-name">🏨 ${h.name}</div>
          </div>
        </div>
        <table class="price-table">
          <thead><tr>
            <th>Room Type</th>
            <th>Capacity</th>
            <th>Availability</th>
            <th>Current Price / Night</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${h.rooms.map(r => `
              <tr id="prow-${r.roomTypeId}">
                <td><strong>${r.typeName}</strong></td>
                <td>${r.capacity} guest${r.capacity !== 1 ? 's' : ''}</td>
                <td>
                  <span class="badge ${r.availableRooms > 0 ? 'badge-success' : 'badge-warning'}">
                    ${r.availableRooms} / ${r.totalRooms} available
                  </span>
                </td>
                <td>
                  <div class="price-display" id="pd-${r.roomTypeId}">
                    <span class="price-val" id="pv-${r.roomTypeId}">PKR ${Number(r.pricePerNight).toLocaleString()}</span>
                  </div>
                  <div class="price-input-wrap" id="pi-${r.roomTypeId}" style="display:none">
                    <input class="price-input" id="pinput-${r.roomTypeId}" type="number" min="0" step="100" value="${r.pricePerNight}">
                  </div>
                </td>
                <td>
                  <div id="pbtns-${r.roomTypeId}">
                    <button class="btn btn-edit" onclick="startEdit(${r.roomTypeId})">✏️ Edit Price</button>
                  </div>
                  <div id="pbtns-edit-${r.roomTypeId}" style="display:none;gap:6px;display:none">
                    <button class="btn btn-save" id="psave-${r.roomTypeId}" onclick="savePrice(${r.roomTypeId})">Save</button>
                    <button class="btn btn-cancel" onclick="cancelEdit(${r.roomTypeId})">Cancel</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    // Scroll to specific hotel if coming from hotel profile
    const urlHotelId = new URLSearchParams(location.search).get('hotelId');
    if (urlHotelId) {
      const el = document.getElementById('hs-' + urlHotelId);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  } catch(e) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
  }
}

function startEdit(id) {
  document.getElementById(`pd-${id}`).style.display     = 'none';
  document.getElementById(`pi-${id}`).style.display     = 'flex';
  document.getElementById(`pbtns-${id}`).style.display  = 'none';
  const editBtns = document.getElementById(`pbtns-edit-${id}`);
  editBtns.style.display = 'flex';
  document.getElementById(`pinput-${id}`).focus();
}

function cancelEdit(id) {
  document.getElementById(`pd-${id}`).style.display     = 'flex';
  document.getElementById(`pi-${id}`).style.display     = 'none';
  document.getElementById(`pbtns-${id}`).style.display  = 'block';
  document.getElementById(`pbtns-edit-${id}`).style.display = 'none';
}

async function savePrice(id) {
  const newPrice = parseFloat(document.getElementById(`pinput-${id}`).value);
  if (!newPrice || newPrice <= 0) { showToast('Enter a valid price', 'error'); return; }

  const btn = document.getElementById(`psave-${id}`);
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    const res = await apiCall(ENDPOINTS.ROOMS.UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify({ pricePerNight: newPrice })
    });
    if (!res) return;
    if (!res.ok) { showToast('Failed to update price', 'error'); return; }

    document.getElementById(`pv-${id}`).textContent = `PKR ${newPrice.toLocaleString()}`;
    cancelEdit(id);
    showToast('Price updated successfully', 'success');
  } catch(e) {
    showToast('Network error', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save';
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
