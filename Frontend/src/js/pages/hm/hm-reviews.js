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

let hotels = [];
let activeHotel = null;
let reviewsCache = {};

async function apiCall(url, opts={}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers||{}) }
  });
  if (res.status === 401) { AuthService.logout(); return null; }
  return res;
}

function starsStr(n) {
  const full = Math.round(n);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

async function load() {
  try {
    const hRes = await apiCall(ENDPOINTS.HOTELS.MY);
    if (!hRes || !hRes.ok) throw new Error();
    hotels = await hRes.json();

    document.getElementById('loadingState').style.display = 'none';

    if (!hotels.length) {
      document.getElementById('emptyState').style.display = 'block';
      return;
    }

    // Build hotel dropdown
    const sel = document.getElementById('hotelSelect');
    hotels.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = h.name;
      sel.appendChild(opt);
    });
    if (hotels.length <= 1) document.getElementById('hotelSelectorWrap').style.display = 'none';

    document.getElementById('mainContent').style.display = 'block';

    // Pre-select hotel from URL param if present
    const urlHotelId = parseInt(new URLSearchParams(location.search).get('hotelId')) || 0;
    const startHotel = (urlHotelId && hotels.find(h => h.id === urlHotelId)) || hotels[0];
    sel.value = startHotel.id;
    await selectHotel(startHotel);
  } catch(e) {
    document.getElementById('loadingState').innerHTML =
      '<div style="color:var(--danger);font-size:14px">Failed to load. Please refresh.</div>';
  }
}

function selectHotelById(id) {
  const hotel = hotels.find(h => h.id === id);
  if (hotel) selectHotel(hotel);
}

async function selectHotel(hotel) {
  activeHotel = hotel;
  document.getElementById('hotelSelect').value = hotel.id;

  const cont = document.getElementById('reviewsContent');
  cont.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner"></div></div>';

  try {
    let reviews;
    if (reviewsCache[hotel.id] !== undefined) {
      reviews = reviewsCache[hotel.id];
    } else {
      const rRes = await apiCall(ENDPOINTS.HOTEL_REVIEWS.BY_HOTEL(hotel.id));
      if (!rRes || !rRes.ok) { reviews = []; }
      else { reviews = await rRes.json(); }
      reviewsCache[hotel.id] = reviews;
    }

    if (!reviews.length) {
      cont.innerHTML = `
        <div class="empty-state">
          <div style="font-size:36px;margin-bottom:10px">📝</div>
          <p style="font-size:14px;color:var(--text-2)">No reviews yet for ${hotel.name}.</p>
        </div>`;
      return;
    }

    // Rating breakdown
    const counts = [0,0,0,0,0];
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    const total = reviews.length;
    const avg = total ? counts.reduce((s, c, i) => s + c * (i + 1), 0) / total : 0;

    cont.innerHTML = `
      <div class="summary-card">
        <div style="text-align:center">
          <div class="big-rating">${avg.toFixed(1)}</div>
          <div class="stars-row">${starsStr(avg)}</div>
          <div class="total-reviews">${total} review${total !== 1 ? 's' : ''} · ${hotel.name}</div>
        </div>
        <div class="rating-bars">
          ${[5,4,3,2,1].map(star => `
            <div class="rbar-row">
              <div class="rbar-lbl">${star}</div>
              <div class="rbar-track">
                <div class="rbar-fill" style="width:${total ? (counts[star-1]/total*100).toFixed(0) : 0}%"></div>
              </div>
              <div class="rbar-count">${counts[star-1]}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="review-list">
        ${reviews.map(r => `
          <div class="review-card">
            <div class="review-hdr">
              <div>
                <div class="reviewer-name">${r.reviewerName || 'Anonymous'}
                  ${r.verified ? '<span class="badge-verified" style="margin-left:6px">✓ Verified</span>' : ''}
                </div>
                <div class="review-date">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
              </div>
              <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            </div>
            ${r.comment ? `<div class="review-text">${escapeHtml(r.comment)}</div>` : '<div class="review-text" style="color:var(--text-3);font-style:italic">No written review.</div>'}
          </div>
        `).join('')}
      </div>
    `;
  } catch(e) {
    cont.innerHTML = '<div style="color:var(--danger);text-align:center;padding:30px">Failed to load reviews.</div>';
  }
}

load();
