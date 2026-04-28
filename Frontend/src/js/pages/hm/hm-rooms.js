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

let allRooms = [];
let hotels   = [];
let editingId = null;
let deletingId = null;

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
    // Load hotels for filter + modal select
    const hRes = await apiCall(ENDPOINTS.HOTELS.MY);
    if (!hRes || !hRes.ok) throw new Error();
    hotels = await hRes.json();

    // Populate hotel filter and modal select
    const filterSel = document.getElementById('hotelFilter');
    const modalSel  = document.getElementById('fHotelId');
    hotels.forEach(h => {
      filterSel.innerHTML += `<option value="${h.id}">${h.name}</option>`;
      modalSel.innerHTML  += `<option value="${h.id}">${h.name}</option>`;
    });

    // Load room types
    const rRes = await apiCall(ENDPOINTS.ROOMS.MY);
    if (!rRes || !rRes.ok) throw new Error();
    allRooms = await rRes.json();

    document.getElementById('loadingState').style.display = 'none';
    renderRooms(allRooms);
  } catch(e) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
  }
}

function renderRooms(rooms) {
  const tbody = document.getElementById('roomsBody');
  document.getElementById('roomCount').textContent = `${rooms.length} room type${rooms.length !== 1 ? 's' : ''}`;

  if (!rooms.length) {
    document.getElementById('tableCard').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    return;
  }
  document.getElementById('tableCard').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';

  tbody.innerHTML = rooms.map(r => `
    <tr>
      <td><strong>${r.typeName}</strong>${r.description ? `<div style="font-size:11.5px;color:var(--text-3);margin-top:2px">${r.description.slice(0,60)}${r.description.length>60?'…':''}</div>` : ''}</td>
      <td>${r.hotelName || '—'}</td>
      <td>${r.capacity} guest${r.capacity !== 1 ? 's' : ''}</td>
      <td>PKR ${Number(r.pricePerNight).toLocaleString()}</td>
      <td>${r.totalRooms}</td>
      <td>
        <span class="badge ${r.availableRooms > 0 ? 'badge-success' : 'badge-warning'}">
          ${r.availableRooms} / ${r.totalRooms}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal(${r.roomTypeId})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${r.roomTypeId}, '${r.typeName.replace(/'/g,"\\'")}')">Remove</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function applyFilter() {
  const val = document.getElementById('hotelFilter').value;
  const filtered = val ? allRooms.filter(r => String(r.hotelId) === val) : allRooms;
  renderRooms(filtered);
}

// MODAL
function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Room Type';
  document.getElementById('saveBtn').textContent = 'Add Room Type';
  clearForm();
  // Pre-select hotel if one is already chosen in the filter
  const filteredHotelId = document.getElementById('hotelFilter').value;
  if (filteredHotelId) document.getElementById('fHotelId').value = filteredHotelId;
  document.getElementById('availRow').style.display = 'none';
  document.getElementById('roomModal').classList.remove('hidden');
}

function openEditModal(id) {
  editingId = id;
  const r = allRooms.find(x => x.roomTypeId === id);
  if (!r) return;
  document.getElementById('modalTitle').textContent = 'Edit Room Type';
  document.getElementById('saveBtn').textContent = 'Save Changes';
  document.getElementById('fHotelId').value    = r.hotelId;
  document.getElementById('fHotelId').disabled = true;
  document.getElementById('fTypeName').value   = r.typeName;
  document.getElementById('fCapacity').value   = r.capacity;
  document.getElementById('fPrice').value      = r.pricePerNight;
  document.getElementById('fTotal').value      = r.totalRooms;
  document.getElementById('fAvailable').value  = r.availableRooms;
  document.getElementById('fAmenities').value  = r.amenities || '';
  document.getElementById('fDescription').value= r.description || '';
  document.getElementById('availRow').style.display = 'block';
  document.getElementById('roomModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('roomModal').classList.add('hidden');
  document.getElementById('fHotelId').disabled = false;
}

function clearForm() {
  ['fHotelId','fTypeName','fCapacity','fPrice','fTotal','fAmenities','fDescription'].forEach(id => {
    const el = document.getElementById(id);
    if (el.tagName === 'SELECT') el.value = '';
    else el.value = '';
  });
  document.getElementById('fCapacity').value = 2;
  document.getElementById('fTotal').value    = 1;
  ['eHotelId','eTypeName','ePrice','eCapacity','eTotal','eAvailable'].forEach(id => document.getElementById(id).classList.remove('show'));
}

async function saveRoom() {
  // Validate
  let valid = true;
  const hotelId   = parseInt(document.getElementById('fHotelId').value);
  const typeName  = document.getElementById('fTypeName').value.trim();
  const price     = parseFloat(document.getElementById('fPrice').value);
  const capacity  = parseInt(document.getElementById('fCapacity').value);
  const total     = parseInt(document.getElementById('fTotal').value);
  const available = parseInt(document.getElementById('fAvailable').value);

  if (!editingId && !hotelId) { document.getElementById('eHotelId').classList.add('show'); valid = false; }
  else document.getElementById('eHotelId').classList.remove('show');
  if (!typeName) { document.getElementById('eTypeName').classList.add('show'); valid = false; }
  else document.getElementById('eTypeName').classList.remove('show');
  if (isNaN(price) || price <= 0) { document.getElementById('ePrice').classList.add('show'); valid = false; }
  else document.getElementById('ePrice').classList.remove('show');
  if (isNaN(capacity) || capacity < 1) { document.getElementById('eCapacity').classList.add('show'); valid = false; }
  else document.getElementById('eCapacity').classList.remove('show');
  if (isNaN(total) || total < 1) { document.getElementById('eTotal').classList.add('show'); valid = false; }
  else document.getElementById('eTotal').classList.remove('show');
  if (editingId && (isNaN(available) || available < 0 || available > total)) { document.getElementById('eAvailable').classList.add('show'); valid = false; }
  else document.getElementById('eAvailable').classList.remove('show');
  if (!valid) return;

  const body = {
    typeName, capacity, pricePerNight: price, totalRooms: total,
    amenities:    document.getElementById('fAmenities').value.trim() || null,
    description:  document.getElementById('fDescription').value.trim() || null,
  };
  if (!editingId) body.hotelId = hotelId;
  if (editingId)  body.availableRooms = isNaN(available) ? total : available;

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

  try {
    const url = editingId ? ENDPOINTS.ROOMS.UPDATE(editingId) : ENDPOINTS.ROOMS.ADD;
    const method = editingId ? 'PUT' : 'POST';
    const res = await apiCall(url, { method, body: JSON.stringify(body) });
    if (!res) return;
    if (!res.ok) {
      const err = await res.json();
      showToast(err.message || 'Failed to save', 'error');
      return;
    }
    closeModal();
    showToast(editingId ? 'Room type updated' : 'Room type added', 'success');
    allRooms = [];
    await load2();
  } catch(e) {
    showToast('Network error', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editingId ? 'Save Changes' : 'Add Room Type';
  }
}

function openDeleteModal(id, name) {
  deletingId = id;
  document.getElementById('deleteRoomName').textContent = name;
  document.getElementById('deleteModal').classList.remove('hidden');
}
function closeDeleteModal() { document.getElementById('deleteModal').classList.add('hidden'); }

async function confirmDelete() {
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true; btn.textContent = 'Removing…';
  try {
    const res = await apiCall(ENDPOINTS.ROOMS.DELETE(deletingId), { method: 'DELETE' });
    if (!res) return;
    closeDeleteModal();
    showToast('Room type removed', 'success');
    await load2();
  } catch(e) {
    showToast('Failed to remove', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Remove';
  }
}

// Reload only rooms after mutation
async function load2() {
  const rRes = await apiCall(ENDPOINTS.ROOMS.MY);
  if (!rRes || !rRes.ok) return;
  allRooms = await rRes.json();
  const val = document.getElementById('hotelFilter').value;
  const filtered = val ? allRooms.filter(r => String(r.hotelId) === val) : allRooms;
  renderRooms(filtered);
}

function showToast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

(function initNumericGuards() {
  const intFields = new Set(['fCapacity','fTotal','fAvailable']);
  ['fCapacity','fTotal','fAvailable','fPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isInt = intFields.has(id);
    el.addEventListener('keydown', e => {
      const deny = ['-','+','e','E'];
      if (isInt) deny.push('.');
      if (deny.includes(e.key)) e.preventDefault();
    });
    el.addEventListener('input', () => {
      if (el.value === '') return;
      const min = el.min !== '' ? parseFloat(el.min) : 0;
      const max = el.max !== '' ? parseFloat(el.max) : Infinity;
      const v = isInt ? parseInt(el.value) : parseFloat(el.value);
      if (isNaN(v)) { el.value = min; return; }
      if (v < min) el.value = String(min);
      else if (isFinite(max) && v > max) el.value = String(max);
    });
  });
})();

load();
