
// ── Global helpers (used by seasonal modal too) ───────────────────────────────
function getHeaders() {
  const token = sessionStorage.getItem('tripify_token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3500);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ── Seasonal Data — strict validation ─────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_KEYS  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
let currentSeasonalDestId = null;

// Strict numeric regex: optional leading minus, digits, at most one decimal point.
// Rejects: letters, scientific notation (e/E), multiple dots, spaces, special chars.
const STRICT_NUM_RE = /^-?\d+(\.\d+)?$/;

function _parseStrict(raw) {
  const v = (raw == null ? '' : String(raw)).trim();
  if (!v) return { empty: true };
  if (/\s/.test(v))               return { err: 'No spaces allowed.' };
  if (!STRICT_NUM_RE.test(v))     return { err: 'Must be a plain number (no letters, symbols, or scientific notation).' };
  const n = Number(v);
  if (!isFinite(n) || isNaN(n))   return { err: 'Must be a finite number.' };
  return { value: n };
}

function validateTemp(raw) {
  const r = _parseStrict(raw);
  if (r.empty)  return null;
  if (r.err)    return `Invalid temperature value — ${r.err}`;
  if (r.value < -89) return 'Temperature must be a number between -89°C and 57°C.';
  if (r.value > 57)  return 'Temperature must be a number between -89°C and 57°C.';
  return null;
}

function validateRainfall(raw) {
  const r = _parseStrict(raw);
  if (r.empty)  return null;
  if (r.err)    return `Invalid rainfall value — ${r.err}`;
  if (r.value < 0)    return 'Rainfall cannot be negative.';
  if (r.value > 2000) return 'Rainfall exceeds realistic limit (max 2000 mm).';
  return null;
}

// Keyboard blockers — fire before character enters field
function blockTempKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'e' || e.key === 'E') { e.preventDefault(); return; }
  if (e.key === '-' && e.target.selectionStart !== 0) { e.preventDefault(); return; }
  if (e.key.length === 1 && !/^[0-9.\-]$/.test(e.key)) e.preventDefault();
}

function blockRainKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length === 1 && !/^[0-9.]$/.test(e.key)) e.preventDefault();
}

// oninput sanitisers — clean up paste / autofill
function stripSeasonalTemp(input) {
  let v = input.value.replace(/[^0-9.\-]/g, '');
  // Only one leading minus
  const neg = v.startsWith('-');
  v = (neg ? '-' : '') + v.replace(/-/g, '');
  // Only one decimal point
  const dot = v.indexOf('.');
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
  input.value = v;
}

function stripSeasonalRain(input) {
  let v = input.value.replace(/[^0-9.]/g, '');
  // Only one decimal point
  const dot = v.indexOf('.');
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
  input.value = v;
}

// onblur handlers — show / clear inline error
function blurSeasonalTemp(input, errId) {
  const err = validateTemp(input.value);
  _setFieldState(input, document.getElementById(errId), err);
}

function blurSeasonalRain(input, errId) {
  const err = validateRainfall(input.value);
  _setFieldState(input, document.getElementById(errId), err);
}

function _setFieldState(input, errEl, err) {
  if (!errEl) return;
  const val = input.value.trim();
  if (err) {
    errEl.textContent = err;
    errEl.style.display = 'block';
    input.style.borderColor = 'var(--danger)';
  } else {
    errEl.style.display = 'none';
    input.style.borderColor = val ? '#22c55e' : '';
  }
}

async function openSeasonalModal(destId, destName) {
  currentSeasonalDestId = destId;
  document.getElementById('seasonalModalTitle').textContent = `Seasonal Data — ${destName}`;
  document.getElementById('seasonalFormErr').style.display = 'none';

  const tbody = document.getElementById('seasonalTableBody');
  tbody.innerHTML = MONTH_NAMES.map((m, i) => {
    const idx = i + 1;
    return `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 12px;font-weight:600;color:var(--text-1);white-space:nowrap">${m}</td>
      <td style="padding:6px 12px">
        <input type="text" inputmode="decimal" id="s-temp-${idx}" class="form-input"
          style="width:100%;padding:6px 10px" placeholder="e.g. 12.5"
          onkeydown="blockTempKey(event)"
          oninput="stripSeasonalTemp(this)"
          onblur="blurSeasonalTemp(this,'s-temp-err-${idx}')">
        <div id="s-temp-err-${idx}" style="display:none;font-size:11px;color:var(--danger);margin-top:2px;line-height:1.4"></div>
      </td>
      <td style="padding:6px 12px">
        <input type="text" inputmode="decimal" id="s-rain-${idx}" class="form-input"
          style="width:100%;padding:6px 10px" placeholder="e.g. 45.0"
          onkeydown="blockRainKey(event)"
          oninput="stripSeasonalRain(this)"
          onblur="blurSeasonalRain(this,'s-rain-err-${idx}')">
        <div id="s-rain-err-${idx}" style="display:none;font-size:11px;color:var(--danger);margin-top:2px;line-height:1.4"></div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('seasonalModal').classList.add('open');

  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/seasonal-data/admin/${destId}`, { headers: getHeaders() });
    if (res.status === 401) { /* session expired — leave fields blank, user will see error on save */ return; }
    if (res.ok) {
      const data = await res.json();
      (data.months || []).forEach(row => {
        const m = row.month;
        if (m < 1 || m > 12) return;
        if (row.temperature != null) document.getElementById(`s-temp-${m}`).value = row.temperature;
        if (row.rainfall    != null) document.getElementById(`s-rain-${m}`).value = row.rainfall;
      });
    }
  } catch (e) { /* no existing data — leave blank */ }
}

async function saveSeasonalData() {
  const btn   = document.getElementById('seasonalSaveBtn');
  const errEl = document.getElementById('seasonalFormErr');
  errEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Saving…';

  // ── Validate all 12 rows, collect structured errors ────────────────────────
  const errors = {};
  MONTH_KEYS.forEach(k => { errors[k] = { temp: null, rainfall: null }; });

  let firstError = null;
  const months   = [];

  for (let m = 1; m <= 12; m++) {
    const key      = MONTH_KEYS[m - 1];
    const label    = MONTH_NAMES[m - 1];
    const tempRaw  = document.getElementById(`s-temp-${m}`).value.trim();
    const rainRaw  = document.getElementById(`s-rain-${m}`).value.trim();

    const tempErr  = validateTemp(tempRaw);
    const rainErr  = validateRainfall(rainRaw);

    // Show / clear inline errors
    _setFieldState(
      document.getElementById(`s-temp-${m}`),
      document.getElementById(`s-temp-err-${m}`),
      tempErr
    );
    _setFieldState(
      document.getElementById(`s-rain-${m}`),
      document.getElementById(`s-rain-err-${m}`),
      rainErr
    );

    if (tempErr) { errors[key].temp = tempErr; if (!firstError) firstError = `${label} — Temperature: ${tempErr}`; }
    if (rainErr) { errors[key].rainfall = rainErr; if (!firstError) firstError = `${label} — Rainfall: ${rainErr}`; }

    // Parse valid values (empty → null)
    const tempParsed = (!tempErr && tempRaw !== '') ? Number(tempRaw) : null;
    const rainParsed = (!rainErr && rainRaw !== '') ? Number(rainRaw) : null;
    months.push({ month: m, temperature: tempParsed, rainfall: rainParsed });
  }

  if (firstError) {
    errEl.textContent = firstError;
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Save All Months';
    return errors; // structured error object available if needed
  }

  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/seasonal-data/admin/${currentSeasonalDestId}`, {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(months)
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { errEl.textContent = 'Session expired — please refresh the page.'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Save All Months'; return; }
    if (!res.ok) { errEl.textContent = data.message || 'Save failed.'; errEl.style.display = 'block'; return; }
    closeModal('seasonalModal');
    showToast('Seasonal data saved!');
  } catch (e) {
    errEl.textContent = 'Network error. Is the backend running?'; errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Save All Months';
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(function () {
  const token = sessionStorage.getItem('tripify_token');
  const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
  if (!token || user.userType !== 'Admin') {
    window.location.href = '../auth/admin-login.html'; return;
  }

  const ini = (user.fullName || 'SA').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('topbarInitials').textContent = ini;

  window.doLogout = function () {
    sessionStorage.removeItem('tripify_token');
    sessionStorage.removeItem('tripify_user');
    window.location.href = '../auth/admin-login.html';
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let allDests              = [];
  let activeFilter          = 'all';
  let searchQuery           = '';
  let editingId             = null;
  let currentGuidelineDestId = null;
  let currentEmergencyDestId = null;
  let currentSouvenirsDestId = null;
  let editingGuidelineId    = null;
  let editingSouvenirId     = null;
  let pendingImageFile          = null;
  let pendingSouvenirImageFile  = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function resolveImg(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return API_CONFIG.BASE_URL.replace('/api', '') + url;
    return '../../../../public/assets/images/' + url;
  }

  // ── Load destinations ─────────────────────────────────────────────────────
  async function loadDestinations() {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/destinations`, { headers: getHeaders() });
      if (res.status === 401) { doLogout(); return; }
      if (res.status === 403) { showToast('Access denied', 'error'); return; }
      if (!res.ok) throw new Error();
      allDests = await res.json();
      updateStats();
      renderTable();
    } catch (e) {
      showToast('Failed to load destinations. Is the backend running?', 'error');
      document.getElementById('destTableBody').innerHTML =
        '<tr><td colspan="6" class="empty-state">Unable to load destinations. Please refresh.</td></tr>';
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  function updateStats() {
    const total    = allDests.length;
    const active   = allDests.filter(d => d.isActive).length;
    const inactive = total - active;
    const withGuidelines = allDests.filter(d => d.guidelineCount > 0).length;
    document.getElementById('statTotal').textContent      = total;
    document.getElementById('statActive').textContent     = active;
    document.getElementById('statInactive').textContent   = inactive;
    document.getElementById('statGuidelines').textContent = withGuidelines;
  }

  // ── Filter / search ───────────────────────────────────────────────────────
  function getVisible() {
    let list = allDests;
    if (activeFilter === 'active')   list = list.filter(d => d.isActive);
    if (activeFilter === 'inactive') list = list.filter(d => !d.isActive);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.city    || '').toLowerCase().includes(q) ||
        (d.country || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  window.setFilter = function (filter, el) {
    activeFilter = filter;
    document.querySelectorAll('.fpill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderTable();
  };

  window.filterTable = function () {
    searchQuery = document.getElementById('tableSearch').value.trim();
    renderTable();
  };

  // ── Render table ──────────────────────────────────────────────────────────
  function renderTable() {
    const dests = getVisible();
    const tbody = document.getElementById('destTableBody');
    document.getElementById('tableCount').textContent =
      `${dests.length} destination${dests.length !== 1 ? 's' : ''}`;

    if (!dests.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No destinations found</td></tr>';
      return;
    }

    tbody.innerHTML = dests.map(d => {
      const img = d.imageUrl
        ? `<img src="${resolveImg(d.imageUrl)}" alt="" style="width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0">`
        : `<div style="width:36px;height:36px;border-radius:6px;background:var(--bg);flex-shrink:0"></div>`;
      const statusBadge = d.isActive
        ? `<span class="badge badge-green">Active</span>`
        : `<span class="badge badge-red">Inactive</span>`;
      const toggleLabel = d.isActive ? 'Deactivate' : 'Activate';
      const rating = d.averageRating ? Number(d.averageRating).toFixed(1) + ' ★' : '—';

      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${img}
            <div>
              <div style="font-weight:600;color:var(--text-1)">${esc(d.name)}</div>
              <div style="font-size:12px;color:var(--text-3)">${esc(d.country || 'Pakistan')}</div>
            </div>
          </div>
        </td>
        <td>${esc(d.city || '—')}</td>
        <td>${rating}</td>
        <td>${d.totalReviews || 0}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="openEditModal(${d.id})">Edit</button>
            <button class="btn btn-outline btn-sm" onclick="toggleDest(${d.id})">${toggleLabel}</button>
            <button class="btn btn-outline btn-sm" onclick="openGuidelinesModal(${d.id},'${esc(d.name)}')">Guidelines</button>
            <button class="btn btn-outline btn-sm" onclick="openEmergencyModal(${d.id},'${esc(d.name)}')">Emergency</button>
            <button class="btn btn-outline btn-sm" onclick="openSouvenirsModal(${d.id},'${esc(d.name)}')">Souvenirs</button>
            <button class="btn btn-outline btn-sm" onclick="openSeasonalModal(${d.id},'${esc(d.name)}')">Seasonal</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Add / Edit destination modal ──────────────────────────────────────────
  function clearDestForm() {
    ['f-name', 'f-country', 'f-city', 'f-desc', 'f-lat', 'f-lon', 'f-altitude', 'f-besttime', 'f-kw']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('f-country').value = 'Pakistan';
    document.getElementById('f-budget').value  = '';
    document.getElementById('f-img').value      = '';
    document.getElementById('f-img-file').value = '';
    document.getElementById('imgPreview').style.display   = 'none';
    document.getElementById('imgFileName').textContent    = 'No image selected';
    document.getElementById('imgUploadErr').style.display = 'none';
    document.getElementById('destSaveBtn').disabled       = false;
    pendingImageFile = null;
    document.getElementById('e-name').style.display      = 'none';
    document.getElementById('destFormErr').style.display = 'none';
    document.getElementById('latDir').textContent = '';
    document.getElementById('lonDir').textContent = '';
  }

  window.openAddModal = function () {
    editingId = null;
    clearDestForm();
    document.getElementById('destModalTitle').textContent = 'Add Destination';
    document.getElementById('destSaveBtn').textContent    = 'Save Destination';
    document.getElementById('destModal').classList.add('open');
  };

  window.openEditModal = function (id) {
    const d = allDests.find(x => x.id === id);
    if (!d) return;
    editingId = id;
    clearDestForm();
    document.getElementById('destModalTitle').textContent = 'Edit Destination';
    document.getElementById('destSaveBtn').textContent    = 'Update Destination';

    document.getElementById('f-name').value     = d.name          || '';
    document.getElementById('f-country').value  = d.country       || 'Pakistan';
    document.getElementById('f-city').value     = d.city          || '';
    document.getElementById('f-desc').value     = d.description   || '';
    document.getElementById('f-lat').value      = d.latitude      || '';
    document.getElementById('f-lon').value      = d.longitude     || '';
    document.getElementById('f-altitude').value = d.altitude      || '';
    document.getElementById('f-besttime').value = d.bestTime      || '';
    document.getElementById('f-budget').value   = d.budgetLevel   || '';
    document.getElementById('f-kw').value       = d.searchKeywords|| '';

    if (d.imageUrl) {
      document.getElementById('f-img').value = d.imageUrl;
      const prev = document.getElementById('imgPreview');
      prev.src = resolveImg(d.imageUrl);
      prev.style.display = 'block';
      document.getElementById('imgFileName').textContent = 'Current image';
    }
    updateCompass();
    document.getElementById('destModal').classList.add('open');
  };

  window.handleImageSelect = function (input) {
    const file = input.files[0];
    if (!file) return;
    const errEl  = document.getElementById('imgUploadErr');
    const nameEl = document.getElementById('imgFileName');
    errEl.style.display = 'none';

    if (file.size > 5 * 1024 * 1024) {
      errEl.textContent = 'Image is too large (max 5 MB). Try compressing it or saving as JPG.';
      errEl.style.display = 'block';
      input.value = '';
      return;
    }

    pendingImageFile = file;
    nameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function (e) {
      const prev = document.getElementById('imgPreview');
      prev.src = e.target.result;
      prev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  };

  window.saveDestination = async function () {
    const errEl   = document.getElementById('destFormErr');
    const nameErr = document.getElementById('e-name');
    errEl.style.display = 'none';
    nameErr.style.display = 'none';

    const name = document.getElementById('f-name').value.trim();
    if (!name) { nameErr.style.display = 'block'; document.getElementById('f-name').focus(); return; }

    // ── Validate latitude ─────────────────────────────────────────────────────
    const latRaw = document.getElementById('f-lat').value.trim();
    let latitude = null;
    if (latRaw !== '') {
      if (!/^-?\d+(\.\d{1,4})?$/.test(latRaw)) {
        errEl.textContent = 'Latitude must be a number with up to 4 decimal places (e.g. 33.7294).';
        errEl.style.display = 'block'; return;
      }
      latitude = parseFloat(latRaw);
      if (latitude < -90 || latitude > 90) {
        errEl.textContent = 'Latitude must be between -90 (S) and 90 (N).';
        errEl.style.display = 'block'; return;
      }
      latitude = parseFloat(latitude.toFixed(4));
    }

    // ── Validate longitude ────────────────────────────────────────────────────
    const lonRaw = document.getElementById('f-lon').value.trim();
    let longitude = null;
    if (lonRaw !== '') {
      if (!/^-?\d+(\.\d{1,4})?$/.test(lonRaw)) {
        errEl.textContent = 'Longitude must be a number with up to 4 decimal places (e.g. 74.3587).';
        errEl.style.display = 'block'; return;
      }
      longitude = parseFloat(lonRaw);
      if (longitude < -180 || longitude > 180) {
        errEl.textContent = 'Longitude must be between -180 (W) and 180 (E).';
        errEl.style.display = 'block'; return;
      }
      longitude = parseFloat(longitude.toFixed(4));
    }

    // ── Validate altitude ─────────────────────────────────────────────────────
    const altRaw = document.getElementById('f-altitude').value.trim();
    let altitude = null;
    if (altRaw !== '') {
      if (!/^\d+(\.\d+)?$/.test(altRaw)) {
        errEl.textContent = 'Altitude must be a non-negative number (e.g. 2500). No text or negative values.';
        errEl.style.display = 'block'; return;
      }
      altitude = parseFloat(altRaw);
      if (altitude < 0 || altitude > 9000) {
        errEl.textContent = 'Altitude must be between 0 and 9,000 metres (highest peak on Earth is 8,849 m).';
        errEl.style.display = 'block'; return;
      }
    }

    // ── Validate best time to visit ───────────────────────────────────────────
    const bestTimeRaw = document.getElementById('f-besttime').value.trim();
    if (bestTimeRaw !== '') {
      const MONTH_RE = /^(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(t(ember)?)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)$/i;
      const tokens = bestTimeRaw.split(/[\s,\-–\/&]+/).map(t => t.trim()).filter(t => t);
      if (tokens.length === 0) {
        errEl.textContent = 'Best time field is empty after cleaning. Use month names like "Apr–Oct" or "Dec, Jan".';
        errEl.style.display = 'block'; return;
      }
      const badToken = tokens.find(t => !MONTH_RE.test(t));
      if (badToken) {
        errEl.textContent = `"${badToken}" is not a valid month. Use names like Jan, February, Apr–Oct, Dec–Feb.`;
        errEl.style.display = 'block'; return;
      }
    }

    const btn = document.getElementById('destSaveBtn');
    btn.disabled = true;

    // ── Step 1: upload pending image first (if user selected one) ────────────
    let imageUrl = document.getElementById('f-img').value || null;
    if (pendingImageFile) {
      btn.textContent = 'Uploading image…';
      const fd = new FormData();
      fd.append('file', pendingImageFile);
      try {
        const upRes  = await fetch(`${API_CONFIG.BASE_URL}/admin/destinations/upload-image`, {
          method: 'POST', headers: getHeaders(), body: fd
        });
        const upData = await upRes.json().catch(() => ({}));
        if (upRes.status === 401) {
          errEl.textContent = 'Session expired — please refresh the page.';
          errEl.style.display = 'block'; btn.disabled = false; btn.textContent = editingId ? 'Update Destination' : 'Save Destination'; return;
        }
        if (!upRes.ok) {
          errEl.textContent = upData.message || 'Image upload failed — is the backend running?';
          errEl.style.display = 'block'; btn.disabled = false; btn.textContent = editingId ? 'Update Destination' : 'Save Destination'; return;
        }
        imageUrl = upData.imageUrl;
        pendingImageFile = null;
      } catch (e) {
        errEl.textContent = 'Image upload failed — make sure the backend is running.';
        errEl.style.display = 'block'; btn.disabled = false; btn.textContent = editingId ? 'Update Destination' : 'Save Destination'; return;
      }
    }

    // ── Step 2: save destination with confirmed imageUrl ─────────────────────
    btn.textContent = 'Saving…';
    const payload = {
      name,
      country:        document.getElementById('f-country').value.trim() || 'Pakistan',
      city:           document.getElementById('f-city').value.trim(),
      description:    document.getElementById('f-desc').value.trim(),
      latitude,
      longitude,
      imageUrl,
      altitude:       altitude !== null ? String(altitude) : '',
      bestTime:       bestTimeRaw,
      budgetLevel:    document.getElementById('f-budget').value,
      searchKeywords: document.getElementById('f-kw').value.trim(),
    };

    const url    = editingId
      ? `${API_CONFIG.BASE_URL}/admin/destinations/${editingId}`
      : `${API_CONFIG.BASE_URL}/admin/destinations`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res  = await fetch(url, {
        method,
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { errEl.textContent = 'Session expired — please refresh the page and log in again.'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = editingId ? 'Update Destination' : 'Save Destination'; return; }
      if (!res.ok) { errEl.textContent = data.message || 'Save failed.'; errEl.style.display = 'block'; return; }

      if (editingId) {
        const idx = allDests.findIndex(d => d.id === editingId);
        if (idx !== -1) allDests[idx] = data;
      } else {
        allDests.push(data);
        allDests.sort((a, b) => a.name.localeCompare(b.name));
      }
      updateStats();
      renderTable();
      closeModal('destModal');
      showToast(editingId ? 'Destination updated!' : 'Destination added!');
    } catch (e) {
      errEl.textContent = 'Network error. Is the backend running?'; errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = editingId ? 'Update Destination' : 'Save Destination';
    }
  };

  window.toggleDest = async function (id) {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/destinations/${id}/toggle`, {
        method: 'PUT', headers: getHeaders()
      });
      if (res.status === 401) { showToast('Session expired — please refresh the page.', 'error'); return; }
      if (!res.ok) { showToast('Toggle failed', 'error'); return; }
      const data = await res.json();
      const idx = allDests.findIndex(d => d.id === id);
      if (idx !== -1) allDests[idx] = data;
      updateStats();
      renderTable();
      showToast(data.isActive ? 'Destination activated' : 'Destination deactivated');
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  // ── Coord helpers ─────────────────────────────────────────────────────────

  // Allow only digits, one decimal point, one leading minus — live on input
  window.stripCoord = function (input) {
    let v = input.value;
    // Strip everything except digits, dot, leading minus
    v = v.replace(/[^0-9.\-]/g, '');
    // Only one decimal point
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    // Minus only at the very start
    if (v.indexOf('-') > 0) v = v.replace(/-/g, '');
    // Max 4 decimal places
    if (v.includes('.')) {
      const [intPart, decPart] = v.split('.');
      v = intPart + '.' + decPart.slice(0, 4);
    }
    input.value = v;
    clearDestFieldErr(input.closest('.form-group') || input.parentElement);
  };

  window.updateCompass = function () {
    const lat = parseFloat(document.getElementById('f-lat').value);
    const lon = parseFloat(document.getElementById('f-lon').value);
    document.getElementById('latDir').textContent = isNaN(lat) ? '' : (lat >= 0 ? '(N)' : '(S)');
    document.getElementById('lonDir').textContent = isNaN(lon) ? '' : (lon >= 0 ? '(E)' : '(W)');
  };

  // On blur: clamp to valid range and enforce 4 d.p.
  window.formatCoord = function (input, min, max) {
    const raw = input.value.trim();
    if (raw === '' || raw === '-') { input.value = ''; updateCompass(); return; }
    const v = parseFloat(raw);
    if (isNaN(v)) {
      input.value = '';
      showDestFieldErr(input, `Enter a number (e.g. ${min < 0 ? min : ''}${((min + max) / 2).toFixed(4)})`);
      return;
    }
    if (v < min || v > max) {
      input.value = parseFloat(Math.max(min, Math.min(max, v)).toFixed(4));
      showDestFieldErr(input, `Must be between ${min} and ${max}. Clamped automatically.`);
    } else {
      input.value = parseFloat(v.toFixed(4));
      clearDestFieldErr(input);
    }
    updateCompass();
  };

  // Strip altitude live: digits and one decimal only, no negatives
  window.stripAltitude = function (input) {
    let v = input.value.replace(/[^0-9.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    input.value = v;
    clearDestFieldErr(input);
  };

  // On blur: validate altitude
  window.formatAltitude = function (input) {
    const raw = input.value.trim();
    if (raw === '') return;
    if (!/^\d+(\.\d+)?$/.test(raw)) {
      input.value = '';
      showDestFieldErr(input, 'Altitude must be a positive number (e.g. 2500)');
      return;
    }
    const v = parseFloat(raw);
    if (v < 0 || v > 9000) {
      input.value = parseFloat(Math.max(0, Math.min(9000, v)).toFixed(1));
      showDestFieldErr(input, 'Altitude must be between 0 and 9,000 m. Clamped automatically.');
    } else {
      clearDestFieldErr(input);
    }
  };

  // Best time: strip any character that is not a letter, space, comma, hyphen
  window.stripBestTime = function (input) {
    input.value = input.value.replace(/[^a-zA-Z ,\-–]/g, '');
  };

  // Shared inline error helpers
  function showDestFieldErr(inputEl, msg) {
    let errEl = inputEl.nextElementSibling;
    if (!errEl || !errEl.classList.contains('dest-field-err')) {
      errEl = document.createElement('span');
      errEl.className = 'dest-field-err';
      errEl.style.cssText = 'display:block;font-size:11.5px;color:#ef4444;margin-top:3px';
      inputEl.parentNode.insertBefore(errEl, inputEl.nextSibling);
    }
    errEl.textContent = msg;
    inputEl.style.borderColor = '#ef4444';
  }

  function clearDestFieldErr(inputEl) {
    if (!inputEl || !inputEl.style) return;
    const errEl = inputEl.nextElementSibling;
    if (errEl && errEl.classList.contains('dest-field-err')) errEl.textContent = '';
    inputEl.style.borderColor = '';
  }

  // ── Guidelines modal ──────────────────────────────────────────────────────
  window.openGuidelinesModal = async function (destId, destName) {
    currentGuidelineDestId = destId;
    editingGuidelineId = null;
    document.getElementById('guidelineModalTitle').textContent = `Guidelines — ${destName}`;
    document.getElementById('g-title').value   = '';
    document.getElementById('g-content').value = '';
    document.getElementById('g-cat').value     = 'General';
    document.getElementById('gFormLabel').textContent  = 'Add New Guideline';
    document.getElementById('gSaveBtn').textContent    = 'Add Guideline';
    document.getElementById('gCancelBtn').style.display = 'none';
    document.getElementById('gFormErr').style.display  = 'none';
    document.getElementById('guidelinesModal').classList.add('open');
    await loadGuidelines();
  };

  async function loadGuidelines() {
    const list = document.getElementById('guidelinesList');
    list.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:8px 0">Loading…</div>';
    try {
      const res  = await fetch(`${API_CONFIG.BASE_URL}/admin/guidelines?destId=${currentGuidelineDestId}`, { headers: getHeaders() });
      if (res.status === 401) { list.innerHTML = '<div style="color:var(--danger);font-size:13px;padding:8px">Session expired — please refresh the page.</div>'; return; }
      const data = await res.json();
      if (!res.ok || !Array.isArray(data) || !data.length) {
        list.innerHTML = '<div style="color:var(--text-2);font-size:13px;padding:12px 14px;background:var(--bg);border:1px dashed var(--border);border-radius:var(--r-sm);text-align:center">No guidelines yet for this destination. Use the form below to add the first one.</div>';
        return;
      }
      list.innerHTML = data.map(g => `
        <div style="border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="flex:1">
              <span class="badge badge-gray" style="margin-bottom:4px">${esc(g.category)}</span>
              <div style="font-weight:600;font-size:13px;color:var(--text-1);margin-top:2px">${esc(g.title)}</div>
              <div style="font-size:12.5px;color:var(--text-2);margin-top:3px">${esc(g.content)}</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="btn btn-outline btn-sm" onclick="editGuideline(${g.id},'${esc(g.title)}','${esc(g.content)}','${esc(g.category)}')">Edit</button>
              <button class="btn btn-sm" style="background:var(--danger-lt);color:var(--danger);border:1px solid transparent;border-radius:var(--r-sm);cursor:pointer" onclick="deleteGuideline(${g.id})">Delete</button>
            </div>
          </div>
        </div>`).join('');
    } catch (e) {
      list.innerHTML = '<div style="color:var(--danger);font-size:13px;padding:10px 14px;background:var(--danger-lt);border-radius:var(--r-sm)">Failed to load guidelines — is the backend running?</div>';
    }
  }

  window.editGuideline = function (id, title, content, category) {
    editingGuidelineId = id;
    document.getElementById('g-title').value   = title;
    document.getElementById('g-content').value = content;
    document.getElementById('g-cat').value     = category;
    document.getElementById('gFormLabel').textContent   = 'Edit Guideline';
    document.getElementById('gSaveBtn').textContent     = 'Update Guideline';
    document.getElementById('gCancelBtn').style.display = 'inline-flex';
  };

  window.resetGuidelineForm = function () {
    editingGuidelineId = null;
    document.getElementById('g-title').value   = '';
    document.getElementById('g-content').value = '';
    document.getElementById('g-cat').value     = 'General';
    document.getElementById('gFormLabel').textContent   = 'Add New Guideline';
    document.getElementById('gSaveBtn').textContent     = 'Add Guideline';
    document.getElementById('gCancelBtn').style.display = 'none';
    document.getElementById('gFormErr').style.display   = 'none';
  };

  window.saveGuideline = async function () {
    const errEl   = document.getElementById('gFormErr');
    errEl.style.display = 'none';
    const title    = document.getElementById('g-title').value.trim();
    const content  = document.getElementById('g-content').value.trim();
    const category = document.getElementById('g-cat').value;
    if (!title) { errEl.textContent = 'Title is required'; errEl.style.display = 'block'; return; }

    const btn = document.getElementById('gSaveBtn');
    btn.disabled = true;

    try {
      let res;
      if (editingGuidelineId) {
        res = await fetch(`${API_CONFIG.BASE_URL}/admin/guidelines/${editingGuidelineId}`, {
          method: 'PUT',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, category })
        });
      } else {
        res = await fetch(`${API_CONFIG.BASE_URL}/admin/guidelines`, {
          method: 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ destId: currentGuidelineDestId, title, content, category })
        });
      }
      if (res.status === 401) { errEl.textContent = 'Session expired — please refresh the page.'; errEl.style.display = 'block'; btn.disabled = false; return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { errEl.textContent = data.message || 'Save failed'; errEl.style.display = 'block'; return; }
      resetGuidelineForm();
      await loadGuidelines();
      showToast(editingGuidelineId ? 'Guideline updated!' : 'Guideline added!');
    } catch (e) {
      errEl.textContent = 'Network error.'; errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  };

  window.deleteGuideline = async function (id) {
    if (!confirm('Delete this guideline?')) return;
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/guidelines/${id}`, {
        method: 'DELETE', headers: getHeaders()
      });
      if (res.status === 401) { showToast('Session expired — please refresh the page.', 'error'); return; }
      if (!res.ok) { showToast('Delete failed', 'error'); return; }
      await loadGuidelines();
      showToast('Guideline deleted');
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  // ── Emergency modal ───────────────────────────────────────────────────────
  window.openEmergencyModal = async function (destId, destName) {
    currentEmergencyDestId = destId;
    document.getElementById('emergencyModalTitle').textContent = `Emergency — ${destName}`;
    document.getElementById('emergencyFormErr').style.display = 'none';
    ['em-police','em-ambulance','em-fire','em-helpline','em-hospital','em-embassy','em-covid']
      .forEach(id => { const el = document.getElementById(id); if (el) { el.value = ''; el.style.borderColor = ''; } });
    ['em-police-err','em-ambulance-err','em-fire-err','em-helpline-err','em-hospital-err','em-embassy-err']
      .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.getElementById('emergencyModal').classList.add('open');

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/emergency/${destId}`, { headers: getHeaders() });
      if (res.status === 401) { /* session expired — leave fields blank */ return; }
      if (!res.ok) return;
      const d = await res.json();
      document.getElementById('em-police').value    = d.policeNumber      || '';
      document.getElementById('em-ambulance').value = d.ambulanceNumber   || '';
      document.getElementById('em-fire').value      = d.fireServiceNumber || '';
      document.getElementById('em-helpline').value  = d.touristHelpline   || '';
      document.getElementById('em-hospital').value  = d.nearestHospital   || '';
      document.getElementById('em-embassy').value   = d.embassyContact    || '';
      document.getElementById('em-covid').value     = d.covidRules        || '';
    } catch (e) { /* leave blank */ }
  };

  // ── Emergency contacts — strict Pakistani phone validation ──────────────────

  // Per-field strict regex patterns
  const EM_PATTERNS = {
    'em-police':    /^(03\d{2}-\d{7}|03\d{9}|0\d{2}-\d{7}|0\d{9})$/,
    'em-ambulance': /^(\d{4}|03\d{9}|0\d{9}|03\d{2}-\d{7}|0\d{2}-\d{7})$/,
    'em-fire':      /^\d{2}$/,
    'em-helpline':  /^(\d{4}|03\d{9}|0\d{9}|03\d{2}-\d{7}|0\d{2}-\d{7})$/,
    'em-embassy':   /^(03\d{2}-\d{7}|03\d{9}|0\d{2}-\d{7}|0\d{9})$/,
  };

  const EM_HINTS = {
    'em-police':    'e.g. 0301-1234567, 03011234567, 042-1234567, 0421234567',
    'em-ambulance': 'e.g. 1122, 0301-1234567, 042-1234567',
    'em-fire':      'Exactly 2 digits (e.g. 16)',
    'em-helpline':  'e.g. 1422, 0301-1234567, 042-1234567',
    'em-embassy':   'e.g. 0301-1234567, 03011234567, 042-1234567, 0421234567',
  };

  // Returns null if valid, or an error string if invalid (all fields are optional)
  function validateEmPhone(val, fieldId) {
    if (!val) return null;
    if (val.includes('--'))   return 'Consecutive hyphens are not allowed.';
    if (val.startsWith('-'))  return 'Hyphen cannot be at the start.';
    if (val.endsWith('-'))    return 'Hyphen cannot be at the end.';
    if (!EM_PATTERNS[fieldId].test(val))
      return `Invalid format — ${EM_HINTS[fieldId]}.`;
    return null;
  }

  function validateEmHospital(val) {
    if (!val) return null;
    if (val.length < 3)   return 'Must be at least 3 characters.';
    if (val.length > 100) return 'Must be 100 characters or fewer.';
    if (!/^[A-Za-z ]+$/.test(val)) return 'Only letters and spaces allowed (no numbers or symbols).';
    return null;
  }

  // Keyboard: only digits and hyphen — block everything else
  window.blockEmPhoneKey = function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && !/^[0-9\-]$/.test(e.key)) e.preventDefault();
  };

  // oninput: strip any invalid chars from paste/autofill, enforce maxlength
  window.stripEmPhone = function (input, maxLen) {
    let v = input.value.replace(/[^0-9\-]/g, '');
    if (maxLen && v.length > maxLen) v = v.slice(0, maxLen);
    input.value = v;
  };

  // oninput for hospital: letters and spaces only
  window.stripEmHospital = function (input) {
    input.value = input.value.replace(/[^A-Za-z ]/g, '');
  };

  // onblur for phone fields — show/clear inline error
  window.blurEmPhone = function (input, errId) {
    const val = input.value.trim();
    const errEl = document.getElementById(errId);
    if (!errEl) return;
    const err = validateEmPhone(val, input.id);
    if (err) {
      errEl.textContent = err;
      errEl.style.display = 'block';
      input.style.borderColor = 'var(--danger)';
    } else {
      errEl.style.display = 'none';
      input.style.borderColor = val ? '#22c55e' : '';
    }
  };

  // onblur for hospital field
  window.blurEmHospital = function (input, errId) {
    const val = input.value.trim();
    const errEl = document.getElementById(errId);
    if (!errEl) return;
    const err = validateEmHospital(val);
    if (err) {
      errEl.textContent = err;
      errEl.style.display = 'block';
      input.style.borderColor = 'var(--danger)';
    } else {
      errEl.style.display = 'none';
      input.style.borderColor = val ? '#22c55e' : '';
    }
  };

  window.saveEmergency = async function () {
    const btn   = document.getElementById('emergencySaveBtn');
    const errEl = document.getElementById('emergencyFormErr');
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Saving…';

    // ── Validate all fields and collect structured errors ────────────────────
    const phoneFields = [
      { id: 'em-police',    label: 'Police Number',       errId: 'em-police-err' },
      { id: 'em-ambulance', label: 'Ambulance Number',    errId: 'em-ambulance-err' },
      { id: 'em-fire',      label: 'Fire Service',        errId: 'em-fire-err' },
      { id: 'em-helpline',  label: 'Tourist Helpline',    errId: 'em-helpline-err' },
      { id: 'em-embassy',   label: 'Embassy / Consulate', errId: 'em-embassy-err' },
    ];

    const errors = {
      policeNumber: null, ambulanceNumber: null, fireService: null,
      touristHelpline: null, hospital: null, embassyContact: null,
    };
    const errKeys = ['policeNumber','ambulanceNumber','fireService','touristHelpline',null,'embassyContact'];

    let firstErrorField = null;
    for (let i = 0; i < phoneFields.length; i++) {
      const f   = phoneFields[i];
      const val = document.getElementById(f.id).value.trim();
      const err = validateEmPhone(val, f.id);
      const errInline = document.getElementById(f.errId);
      const inputEl   = document.getElementById(f.id);
      if (err) {
        if (errKeys[i]) errors[errKeys[i]] = err;
        if (errInline) { errInline.textContent = err; errInline.style.display = 'block'; }
        inputEl.style.borderColor = 'var(--danger)';
        if (!firstErrorField) firstErrorField = { label: f.label, err };
      } else {
        if (errInline) errInline.style.display = 'none';
        inputEl.style.borderColor = val ? '#22c55e' : '';
      }
    }

    // Hospital
    const hospVal = document.getElementById('em-hospital').value.trim();
    const hospErr = validateEmHospital(hospVal);
    const hospErrEl = document.getElementById('em-hospital-err');
    const hospInput = document.getElementById('em-hospital');
    if (hospErr) {
      errors.hospital = hospErr;
      if (hospErrEl) { hospErrEl.textContent = hospErr; hospErrEl.style.display = 'block'; }
      hospInput.style.borderColor = 'var(--danger)';
      if (!firstErrorField) firstErrorField = { label: 'Nearest Hospital', err: hospErr };
    } else {
      if (hospErrEl) hospErrEl.style.display = 'none';
      hospInput.style.borderColor = hospVal ? '#22c55e' : '';
    }

    if (firstErrorField) {
      errEl.textContent = `${firstErrorField.label}: ${firstErrorField.err}`;
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Save Contacts';
      return;
    }

    const payload = {
      policeNumber:      document.getElementById('em-police').value.trim(),
      ambulanceNumber:   document.getElementById('em-ambulance').value.trim(),
      fireServiceNumber: document.getElementById('em-fire').value.trim(),
      touristHelpline:   document.getElementById('em-helpline').value.trim(),
      nearestHospital:   document.getElementById('em-hospital').value.trim(),
      embassyContact:    document.getElementById('em-embassy').value.trim(),
      covidRules:        document.getElementById('em-covid').value.trim(),
    };

    try {
      const res  = await fetch(`${API_CONFIG.BASE_URL}/admin/emergency/${currentEmergencyDestId}`, {
        method: 'PUT',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) { errEl.textContent = 'Session expired — please refresh the page.'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Save Contacts'; return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { errEl.textContent = data.message || 'Save failed.'; errEl.style.display = 'block'; return; }
      closeModal('emergencyModal');
      showToast('Emergency contacts saved!');
    } catch (e) {
      errEl.textContent = 'Network error.'; errEl.style.display = 'block';
    } finally {
      btn.disabled = false; btn.textContent = 'Save Contacts';
    }
  };

  // ── Souvenirs modal ───────────────────────────────────────────────────────
  window.openSouvenirsModal = async function (destId, destName) {
    currentSouvenirsDestId = destId;
    editingSouvenirId = null;
    document.getElementById('souvenirsModalTitle').textContent = `Souvenirs — ${destName}`;
    resetSouvenirForm();
    document.getElementById('souvenirsModal').classList.add('open');
    await loadSouvenirs();
  };

  async function loadSouvenirs() {
    const list = document.getElementById('souvenirsList');
    list.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:4px 0">Loading…</div>';
    try {
      const res  = await fetch(`${API_CONFIG.BASE_URL}/admin/souvenirs?destId=${currentSouvenirsDestId}`, { headers: getHeaders() });
      if (res.status === 401) { list.innerHTML = '<div style="color:var(--danger);font-size:13px;padding:8px">Session expired — please refresh the page.</div>'; return; }
      const data = await res.json();
      if (!res.ok || !Array.isArray(data) || !data.length) {
        list.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:4px 0">No souvenirs yet. Add the first one below.</div>';
        return;
      }
      list.innerHTML = data.map(s => {
        const img = s.imageUrl
          ? `<img src="${resolveImg(s.imageUrl)}" alt="" style="width:44px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0">`
          : `<div style="width:44px;height:44px;border-radius:6px;background:var(--bg);flex-shrink:0"></div>`;
        return `
        <div style="border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
          ${img}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13px;color:var(--text-1)">${esc(s.name)}</div>
            <div style="font-size:12px;color:var(--text-3)">${esc(s.vendorName || '—')}</div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button class="btn btn-outline btn-sm" onclick="editSouvenir(${s.id},'${esc(s.name)}','${esc(s.vendorName||'')}','${esc(s.description||'')}','${esc(s.imageUrl||'')}')">Edit</button>
            <button class="btn btn-sm" style="background:var(--danger-lt);color:var(--danger);border:1px solid transparent;border-radius:var(--r-sm);cursor:pointer" onclick="deleteSouvenir(${s.id})">Delete</button>
          </div>
        </div>`;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div style="color:var(--danger);font-size:13px">Failed to load souvenirs.</div>';
    }
  }

  window.editSouvenir = function (id, name, vendor, desc, imageUrl) {
    editingSouvenirId = id;
    document.getElementById('s-name').value   = name;
    document.getElementById('s-vendor').value = vendor;
    document.getElementById('s-desc').value   = desc;
    document.getElementById('s-image').value  = imageUrl;
    document.getElementById('sFormLabel').textContent   = 'Edit Souvenir';
    document.getElementById('sSaveBtn').textContent     = 'Update Souvenir';
    document.getElementById('sCancelBtn').style.display = 'inline-flex';
    if (imageUrl) {
      const prev = document.getElementById('sImgPreview');
      prev.src = resolveImg(imageUrl); prev.style.display = 'block';
      document.getElementById('sImgFileName').textContent = 'Current image';
    }
  };

  window.resetSouvenirForm = function () {
    editingSouvenirId = null;
    pendingSouvenirImageFile = null;
    document.getElementById('s-name').value   = '';
    document.getElementById('s-vendor').value = '';
    document.getElementById('s-desc').value   = '';
    document.getElementById('s-image').value  = '';
    document.getElementById('s-img-file').value = '';
    document.getElementById('sFormLabel').textContent    = 'Add New Souvenir';
    document.getElementById('sSaveBtn').textContent      = 'Add Souvenir';
    document.getElementById('sSaveBtn').disabled         = false;
    document.getElementById('sCancelBtn').style.display  = 'none';
    document.getElementById('sFormErr').style.display    = 'none';
    document.getElementById('sImgPreview').style.display = 'none';
    document.getElementById('sImgFileName').textContent  = 'No image selected';
  };

  window.handleSouvenirImageSelect = function (input) {
    const file = input.files[0];
    if (!file) return;

    const errEl  = document.getElementById('sFormErr');
    const nameEl = document.getElementById('sImgFileName');
    errEl.style.display = 'none';

    if (file.size > 5 * 1024 * 1024) {
      errEl.textContent = 'Image is too large (max 5 MB). Try compressing it or saving as JPG.';
      errEl.style.display = 'block';
      input.value = '';
      return;
    }

    pendingSouvenirImageFile = file;
    nameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function (e) {
      const prev = document.getElementById('sImgPreview');
      prev.src = e.target.result;
      prev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  };

  window.saveSouvenir = async function () {
    const errEl = document.getElementById('sFormErr');
    errEl.style.display = 'none';
    const name = document.getElementById('s-name').value.trim();
    if (!name) { errEl.textContent = 'Name is required'; errEl.style.display = 'block'; return; }

    const btn = document.getElementById('sSaveBtn');
    btn.disabled = true;

    // Step 1: upload image if one was selected
    let imageUrl = document.getElementById('s-image').value || null;
    if (pendingSouvenirImageFile) {
      btn.textContent = 'Uploading image…';
      const fd = new FormData();
      fd.append('file', pendingSouvenirImageFile);
      try {
        const upRes  = await fetch(`${API_CONFIG.BASE_URL}/admin/souvenirs/upload-image`, {
          method: 'POST', headers: getHeaders(), body: fd
        });
        const upData = await upRes.json().catch(() => ({}));
        if (upRes.status === 401) {
          errEl.textContent = 'Session expired — please refresh the page.';
          errEl.style.display = 'block'; btn.disabled = false; btn.textContent = editingSouvenirId ? 'Update Souvenir' : 'Add Souvenir'; return;
        }
        if (!upRes.ok) {
          errEl.textContent = upData.message || 'Image upload failed — is the backend running?';
          errEl.style.display = 'block'; btn.disabled = false; btn.textContent = editingSouvenirId ? 'Update Souvenir' : 'Add Souvenir'; return;
        }
        imageUrl = upData.imageUrl;
        pendingSouvenirImageFile = null;
      } catch (e) {
        errEl.textContent = 'Image upload failed — make sure the backend is running.';
        errEl.style.display = 'block'; btn.disabled = false; btn.textContent = editingSouvenirId ? 'Update Souvenir' : 'Add Souvenir'; return;
      }
    }

    // Step 2: save souvenir with confirmed imageUrl
    btn.textContent = 'Saving…';
    const payload = {
      destId:      currentSouvenirsDestId,
      name,
      vendorName:  document.getElementById('s-vendor').value.trim(),
      description: document.getElementById('s-desc').value.trim(),
      imageUrl,
    };

    try {
      const url    = editingSouvenirId
        ? `${API_CONFIG.BASE_URL}/admin/souvenirs/${editingSouvenirId}`
        : `${API_CONFIG.BASE_URL}/admin/souvenirs`;
      const method = editingSouvenirId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) { errEl.textContent = 'Session expired — please refresh the page.'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = editingSouvenirId ? 'Update Souvenir' : 'Add Souvenir'; return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { errEl.textContent = data.message || 'Save failed'; errEl.style.display = 'block'; btn.textContent = editingSouvenirId ? 'Update Souvenir' : 'Add Souvenir'; return; }
      resetSouvenirForm();
      await loadSouvenirs();
      showToast(editingSouvenirId ? 'Souvenir updated!' : 'Souvenir added!');
    } catch (e) {
      errEl.textContent = 'Network error.'; errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = editingSouvenirId ? 'Update Souvenir' : 'Add Souvenir';
    }
  };

  window.deleteSouvenir = async function (id) {
    if (!confirm('Delete this souvenir?')) return;
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/souvenirs/${id}`, {
        method: 'DELETE', headers: getHeaders()
      });
      if (res.status === 401) { showToast('Session expired — please refresh the page.', 'error'); return; }
      if (!res.ok) { showToast('Delete failed', 'error'); return; }
      await loadSouvenirs();
      showToast('Souvenir deleted');
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  loadDestinations();
})();
