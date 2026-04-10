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

function showToast(msg, type = 'success') {
  const t = document.getElementById('toastHm');
  t.textContent = msg;
  t.className = 'toast-hm ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3500);
}

let hotels = [];
let currentHotelId = null;

function hotelImg(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/uploads')) return API_CONFIG.BASE_URL.replace('/api', '') + imageUrl;
  return '../../../../public/assets/images/' + imageUrl;
}

async function apiCall(url) {
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (res.status === 401) { AuthService.logout(); return null; }
  return res;
}

function starsFull(n) {
  const s = (n === null || n === undefined || n === 0) ? 0 : Math.min(5, Math.max(0, Math.round(n)));
  if (s === 0) return '<span style="color:var(--text-3);font-size:13px">Not rated</span>';
  return '<span style="color:var(--accent)">' + '★'.repeat(s) + '</span>' +
         '<span style="color:#CBD5E1">' + '☆'.repeat(5 - s) + '</span>';
}

async function load() {
  try {
    const hRes = await apiCall(ENDPOINTS.HOTELS.MY);
    if (!hRes || !hRes.ok) throw new Error();
    hotels = await hRes.json();

    document.getElementById('loadingState').style.display = 'none';
    if (!hotels.length) { document.getElementById('emptyState').style.display = 'block'; return; }

    // Check URL param ?id=
    const urlId = new URLSearchParams(location.search).get('id');
    const startHotel = (urlId && hotels.find(h => String(h.id) === urlId)) || hotels[0];

    // Populate dropdown
    const sel = document.getElementById('hotelSelect');
    hotels.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = h.name;
      if (h.id === startHotel.id) opt.selected = true;
      sel.appendChild(opt);
    });
    // Hide selector if only one hotel
    if (hotels.length <= 1) document.getElementById('hotelSelectorWrap').style.display = 'none';

    document.getElementById('mainContent').style.display = 'block';
    await loadProfile(startHotel.id);
  } catch(e) {
    document.getElementById('loadingState').innerHTML =
      '<div style="color:var(--danger);font-size:14px">Failed to load. Please refresh.</div>';
  }
}

async function loadProfile(hotelId) {
  const cont = document.getElementById('profileContent');
  cont.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner"></div></div>';

  try {
    const res = await apiCall(ENDPOINTS.HOTELS.BY_ID(hotelId));
    if (!res || !res.ok) throw new Error();
    const h = await res.json();
    currentHotelId = hotelId;

    const amenityList = h.amenities
      ? h.amenities.split(',').map(a => a.trim()).filter(Boolean)
      : [];

    const cameraIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:28px;height:28px"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

    cont.innerHTML = `
      <div class="profile-layout">

        <!-- LEFT -->
        <div class="profile-card">
          <label class="cover-wrap" for="hotelImgInput" title="Click to change hotel photo">
            ${hotelImg(h.imageUrl)
              ? `<img class="hotel-cover" src="${hotelImg(h.imageUrl)}" alt="${h.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
              : ''}
            <div class="hotel-cover-placeholder" ${hotelImg(h.imageUrl) ? 'style="display:none"' : ''}>🏨</div>
            <div class="cover-upload-overlay">${cameraIcon}<span>Change Photo</span></div>
          </label>
          <div class="profile-body">
            <div class="hotel-name-big">${h.name}</div>
            <div class="hotel-dest-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${h.destinationName}
            </div>
            <div style="margin-bottom:14px">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--text-3);margin-bottom:4px">Hotel Class</div>
              <div class="stars-big">${starsFull(h.stars)}</div>
            </div>
            <div style="margin-bottom:14px">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--text-3);margin-bottom:4px">Guest Rating</div>
              ${(h.averageRating && h.totalReviews)
                ? (() => { const r = Math.min(5, Math.max(0, Math.round(parseFloat(h.averageRating)))); return `<div style="display:flex;align-items:center;gap:6px">
                    <span style="color:var(--accent);font-size:16px">${'★'.repeat(r)}${'☆'.repeat(5 - r)}</span>
                    <span class="rating-num">${parseFloat(h.averageRating).toFixed(1)}</span>
                    <span class="rating-sub">(${h.totalReviews} review${h.totalReviews !== 1 ? 's' : ''})</span>
                  </div>`; })()
                : '<span style="color:var(--text-3);font-size:13px">No reviews yet</span>'}
            </div>

            <div class="info-row">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <div><div class="info-label">Address</div><div class="info-val">${h.address || '—'}</div></div>
            </div>
            <div class="info-row">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <div><div class="info-label">Contact</div><div class="info-val">${h.contactNumber || '—'}</div></div>
            </div>
            <div class="info-row">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <div><div class="info-label">Email</div><div class="info-val">${h.email || '—'}</div></div>
            </div>
            <div class="info-row">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <div><div class="info-label">Base Rate</div><div class="info-val">PKR ${Number(h.pricePerNight).toLocaleString()} / night</div></div>
            </div>

            <div class="quick-stats">
              <div class="q-stat">
                <div class="q-stat-val">${h.availableRooms}</div>
                <div class="q-stat-lbl">Available Rooms</div>
              </div>
              <div class="q-stat">
                <div class="q-stat-val">${h.totalRooms}</div>
                <div class="q-stat-lbl">Total Rooms</div>
              </div>
            </div>

            <!-- Edit hotel info toggle -->
            <div style="margin-top:14px">
              <button type="button" class="btn btn-ghost btn-sm" id="infoEditToggleBtn" onclick="toggleHotelInfoEdit()">✏️ Edit Info</button>
            </div>
            <div id="hotelInfoEditForm" class="info-edit-form" style="display:none">
              <div class="field-group">
                <label class="field-lbl" for="editAddress">Address *</label>
                <textarea id="editAddress" class="field-input" rows="2" placeholder="Hotel address" maxlength="500">${h.address || ''}</textarea>
                <div id="editAddressErr" class="field-err"></div>
              </div>
              <div class="field-group">
                <label class="field-lbl" for="editContact">Contact Number *</label>
                <input id="editContact" class="field-input" type="text" placeholder="03XX-XXXXXXX" maxlength="20" value="${h.contactNumber || ''}"
                  oninput="const d=this.value.replace(/\\D/g,'').slice(0,11);this.value=d.length>4?d.slice(0,4)+'-'+d.slice(4):d">
                <div id="editContactErr" class="field-err"></div>
              </div>
              <div class="field-group">
                <label class="field-lbl" for="editEmail">Email Address</label>
                <input id="editEmail" class="field-input" type="email" placeholder="hotel@example.com" maxlength="255" value="${h.email || ''}">
                <div id="editEmailErr" class="field-err"></div>
              </div>
              <div class="field-group">
                <label class="field-lbl" for="editPrice">Base Rate (PKR) *</label>
                <input id="editPrice" class="field-input" type="number" min="1" placeholder="e.g. 8500" value="${h.pricePerNight || ''}"
                  onkeydown="if(['-','e','E','+'].includes(event.key))event.preventDefault()">
                <div id="editPriceErr" class="field-err"></div>
              </div>
              <div class="desc-save-row">
                <span id="infoSavedMsg" style="font-size:12px;color:var(--secondary);display:none">Saved!</span>
                <button type="button" class="btn btn-ghost btn-sm" onclick="toggleHotelInfoEdit()">Cancel</button>
                <button type="button" class="btn btn-primary btn-sm" id="saveInfoBtn" onclick="saveHotelInfo()">Save</button>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT -->
        <div class="right-section">

          <div class="info-card">
            <div class="info-card-title">📋 About this Hotel</div>
            <textarea class="desc-edit-area" id="descTextarea" maxlength="1000" placeholder="Add a description — location highlights, unique features, atmosphere…">${h.description ? h.description : ''}</textarea>
            <div class="desc-save-row">
              <span id="descMsg" style="font-size:12px;color:var(--secondary);display:none">Saved!</span>
              <button type="button" class="btn btn-primary btn-sm" id="descSaveBtn" onclick="saveDescription()">Save Description</button>
            </div>
          </div>

          <div class="info-card">
            <div class="info-card-title">✨ Amenities</div>
            ${amenityList.length ? `
            <div class="amenity-tags" id="amenityPreview">
              ${amenityList.map(a => `<span class="amenity-tag">${a}</span>`).join('')}
            </div>` : `<div id="amenityPreview" style="font-size:13px;color:var(--text-3);margin-bottom:8px">No amenities added yet.</div>`}
            <textarea class="desc-edit-area" id="amenityTextarea" placeholder="e.g. WiFi, Parking, Restaurant, Mountain View" maxlength="500" style="margin-top:12px">${h.amenities ? h.amenities : ''}</textarea>
            <div style="font-size:11px;color:var(--text-3);margin-top:4px">Separate amenities with commas</div>
            <div class="desc-save-row">
              <span id="amenityMsg" style="font-size:12px;color:var(--secondary);display:none">Saved!</span>
              <button type="button" class="btn btn-primary btn-sm" id="amenitySaveBtn" onclick="saveAmenities()">Save Amenities</button>
            </div>
          </div>

          <div class="info-card">
            <div class="info-card-title" style="justify-content:space-between">
              <span>🛏️ Room Types (${(h.roomTypes||[]).length})</span>
              <a href="hm-rooms.html" class="btn btn-ghost btn-sm" style="font-size:12px">Manage Rooms</a>
            </div>
            ${h.roomTypes && h.roomTypes.length ? `
            <div style="overflow-x:auto">
              <table class="rooms-mini">
                <thead><tr>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Price / Night</th>
                  <th>Availability</th>
                </tr></thead>
                <tbody>
                  ${h.roomTypes.map(rt => `
                    <tr>
                      <td><strong>${rt.typeName}</strong></td>
                      <td>${rt.capacity} guest${rt.capacity !== 1 ? 's' : ''}</td>
                      <td>PKR ${Number(rt.pricePerNight).toLocaleString()}</td>
                      <td>
                        <span class="badge ${rt.availableRooms > 0 ? 'badge-success' : 'badge-warning'}">
                          ${rt.availableRooms} / ${rt.totalRooms}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : `<p style="font-size:13px;color:var(--text-3)">No room types yet. <a href="hm-rooms.html" style="color:var(--secondary);font-weight:600">Add room types →</a></p>`}
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <a href="hm-bookings.html?hotelId=${h.id}" class="btn btn-ghost" style="font-size:13px">📋 View Bookings</a>
            <a href="hm-reviews.html?hotelId=${h.id}" class="btn btn-ghost" style="font-size:13px">⭐ View Reviews</a>
            <a href="hm-pricing.html?hotelId=${h.id}" class="btn btn-ghost" style="font-size:13px">💰 Manage Pricing</a>
          </div>

        </div>
      </div>
    `;
  } catch(e) {
    cont.innerHTML = '<div style="color:var(--danger);text-align:center;padding:30px">Failed to load hotel details.</div>';
  }
}

// Description save
window.saveDescription = async function() {
  const textarea = document.getElementById('descTextarea');
  const btn      = document.getElementById('descSaveBtn');
  const msg      = document.getElementById('descMsg');
  if (!textarea || !currentHotelId) return;

  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch(ENDPOINTS.HOTELS.UPDATE_DESC(currentHotelId), {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: textarea.value.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { AuthService.logout(); return; }
    if (!res.ok) { showToast(data.message || 'Failed to save description.', 'error'); return; }
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  } catch(e) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Description';
  }
};

// Amenities save
window.saveAmenities = async function() {
  const textarea = document.getElementById('amenityTextarea');
  const btn      = document.getElementById('amenitySaveBtn');
  const msg      = document.getElementById('amenityMsg');
  if (!textarea || !currentHotelId) return;

  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch(ENDPOINTS.HOTELS.UPDATE_AMENITIES(currentHotelId), {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amenities: textarea.value.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { AuthService.logout(); return; }
    if (!res.ok) { showToast(data.message || 'Failed to save amenities.', 'error'); return; }

    // Update the preview tags live
    const tags = textarea.value.trim().split(',').map(a => a.trim()).filter(Boolean);
    const preview = document.getElementById('amenityPreview');
    if (preview) {
      preview.innerHTML = tags.length
        ? tags.map(a => `<span class="amenity-tag">${a}</span>`).join('')
        : '<span style="font-size:13px;color:var(--text-3)">No amenities added yet.</span>';
    }
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  } catch(e) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Amenities';
  }
};

// Toggle hotel info edit form
window.toggleHotelInfoEdit = function() {
  const form = document.getElementById('hotelInfoEditForm');
  const btn  = document.getElementById('infoEditToggleBtn');
  if (!form) return;
  const isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'block';
  btn.textContent = isOpen ? '✏️ Edit Info' : '← Cancel';
  // Clear errors when closing
  if (isOpen) {
    ['editAddressErr','editContactErr','editEmailErr','editPriceErr'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.classList.remove('show'); }
    });
    ['editAddress','editContact','editEmail','editPrice'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('is-err');
    });
  }
};

// Save hotel info (address, contact, price)
window.saveHotelInfo = async function() {
  if (!currentHotelId) return;

  // Clear previous errors
  ['editAddressErr','editContactErr','editEmailErr','editPriceErr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('show'); }
  });
  ['editAddress','editContact','editEmail','editPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-err');
  });

  const address  = document.getElementById('editAddress').value.trim();
  const contact  = document.getElementById('editContact').value.trim();
  const email    = document.getElementById('editEmail').value.trim();
  const price    = document.getElementById('editPrice').value.trim();
  const PHONE_RE = /^03\d{2}-\d{7}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let valid = true;
  if (!address) {
    document.getElementById('editAddressErr').textContent = 'Address is required';
    document.getElementById('editAddressErr').classList.add('show');
    document.getElementById('editAddress').classList.add('is-err');
    valid = false;
  }
  if (!contact) {
    document.getElementById('editContactErr').textContent = 'Contact number is required';
    document.getElementById('editContactErr').classList.add('show');
    document.getElementById('editContact').classList.add('is-err');
    valid = false;
  } else if (!PHONE_RE.test(contact)) {
    document.getElementById('editContactErr').textContent = 'Format must be 03XX-XXXXXXX';
    document.getElementById('editContactErr').classList.add('show');
    document.getElementById('editContact').classList.add('is-err');
    valid = false;
  }
  if (email && !EMAIL_RE.test(email)) {
    document.getElementById('editEmailErr').textContent = 'Enter a valid email address';
    document.getElementById('editEmailErr').classList.add('show');
    document.getElementById('editEmail').classList.add('is-err');
    valid = false;
  }
  if (!price || parseFloat(price) < 1) {
    document.getElementById('editPriceErr').textContent = 'Enter a valid base rate (min 1)';
    document.getElementById('editPriceErr').classList.add('show');
    document.getElementById('editPrice').classList.add('is-err');
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('saveInfoBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch(ENDPOINTS.HOTELS.UPDATE_INFO(currentHotelId), {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, contactNumber: contact, email, pricePerNight: parseFloat(price) })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { AuthService.logout(); return; }
    if (res.status === 422 && data.errors) {
      const errMap = { address:'editAddressErr', contactNumber:'editContactErr', email:'editEmailErr', pricePerNight:'editPriceErr' };
      const inpMap = { address:'editAddress',    contactNumber:'editContact',    email:'editEmail',    pricePerNight:'editPrice' };
      Object.entries(data.errors).forEach(([k, v]) => {
        const errEl = document.getElementById(errMap[k]);
        const inpEl = document.getElementById(inpMap[k]);
        if (errEl) { errEl.textContent = v; errEl.classList.add('show'); }
        if (inpEl) inpEl.classList.add('is-err');
      });
      return;
    }
    if (!res.ok) { showToast(data.message || 'Failed to save info.', 'error'); return; }

    // Reload profile to show updated values
    document.getElementById('hotelInfoEditForm').style.display = 'none';
    document.getElementById('infoEditToggleBtn').textContent = '✏️ Edit Info';
    await loadProfile(currentHotelId);
    showToast('Hotel info updated!', 'success');
  } catch(e) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save';
  }
};

// Hotel image upload
document.getElementById('hotelImgInput').addEventListener('change', async function() {
  const file = this.files[0];
  if (!file || !currentHotelId) return;

  if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); this.value = ''; return; }
  if (file.size > 5 * 1024 * 1024)    { showToast('Image must be under 5 MB.', 'error');     this.value = ''; return; }

  const overlay = document.querySelector('.cover-upload-overlay');
  if (overlay) overlay.innerHTML = '<span style="font-size:12px">Uploading…</span>';

  try {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(ENDPOINTS.HOTELS.UPLOAD_IMAGE(currentHotelId), {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: fd
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { AuthService.logout(); return; }
    if (!res.ok) { showToast(data.message || 'Upload failed. Please try again.', 'error'); return; }
    showToast('Hotel photo updated!', 'success');
    await loadProfile(currentHotelId);
  } catch(e) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    this.value = '';
  }
});

load();
