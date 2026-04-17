
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

// ── Seasonal Data Modal ───────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let currentSeasonalDestId = null;

async function openSeasonalModal(destId, destName) {
  currentSeasonalDestId = destId;
  document.getElementById('seasonalModalTitle').textContent = `Seasonal Data — ${destName}`;
  document.getElementById('seasonalFormErr').style.display = 'none';

  const tbody = document.getElementById('seasonalTableBody');
  tbody.innerHTML = MONTH_NAMES.map((m, i) => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 12px;font-weight:600;color:var(--text-1)">${m}</td>
      <td style="padding:6px 12px"><input type="number" step="0.01" id="s-temp-${i+1}" class="form-input" style="width:100%;padding:6px 10px" placeholder="e.g. 12.5"></td>
      <td style="padding:6px 12px"><input type="number" step="0.01" min="0" id="s-rain-${i+1}" class="form-input" style="width:100%;padding:6px 10px" placeholder="e.g. 45.0"></td>
    </tr>`).join('');

  document.getElementById('seasonalModal').classList.add('open');

  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/seasonal-data/admin/${destId}`, { headers: getHeaders() });
    if (res.status === 401) { doLogout(); return; }
    if (res.ok) {
      const data = await res.json();
      (data.months || []).forEach(row => {
        const m = row.month;
        if (m < 1 || m > 12) return;
        if (row.temperature != null) document.getElementById(`s-temp-${m}`).value = row.temperature;
        if (row.rainfall    != null) document.getElementById(`s-rain-${m}`).value = row.rainfall;
      });
    }
  } catch (e) { /* no existing data, leave blank */ }
}

async function saveSeasonalData() {
  const btn   = document.getElementById('seasonalSaveBtn');
  const errEl = document.getElementById('seasonalFormErr');
  errEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Saving…';

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const temp = document.getElementById(`s-temp-${m}`).value.trim();
    const rain = document.getElementById(`s-rain-${m}`).value.trim();
    months.push({
      month:       m,
      temperature: temp !== '' ? parseFloat(temp) : null,
      rainfall:    rain !== '' ? parseFloat(rain) : null,
    });
  }

  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/seasonal-data/admin/${currentSeasonalDestId}`, {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(months)
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { doLogout(); return; }
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
    document.getElementById('statTotal').textContent    = total;
    document.getElementById('statActive').textContent   = active;
    document.getElementById('statInactive').textContent = inactive;
    document.getElementById('statGuidelines').textContent = '—';
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
    document.getElementById('f-img').value     = '';
    document.getElementById('imgPreview').style.display  = 'none';
    document.getElementById('imgFileName').textContent   = 'No image selected';
    document.getElementById('imgUploadErr').style.display = 'none';
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

  window.handleImageSelect = async function (input) {
    const file = input.files[0];
    if (!file) return;
    const errEl = document.getElementById('imgUploadErr');
    errEl.style.display = 'none';
    document.getElementById('imgFileName').textContent = file.name;

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/destinations/upload-image`, {
        method: 'POST', headers: getHeaders(), body: formData
      });
      if (res.status === 401) { doLogout(); return; }
      const data = await res.json();
      if (!res.ok) { errEl.textContent = data.message || 'Upload failed'; errEl.style.display = 'block'; return; }
      document.getElementById('f-img').value = data.imageUrl;
      const prev = document.getElementById('imgPreview');
      prev.src = API_CONFIG.BASE_URL.replace('/api', '') + data.imageUrl;
      prev.style.display = 'block';
    } catch (e) {
      errEl.textContent = 'Upload failed. Is the backend running?'; errEl.style.display = 'block';
    }
  };

  window.saveDestination = async function () {
    const errEl   = document.getElementById('destFormErr');
    const nameErr = document.getElementById('e-name');
    errEl.style.display = 'none';
    nameErr.style.display = 'none';

    const name = document.getElementById('f-name').value.trim();
    if (!name) { nameErr.style.display = 'block'; document.getElementById('f-name').focus(); return; }

    const btn = document.getElementById('destSaveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const payload = {
      name,
      country:        document.getElementById('f-country').value.trim() || 'Pakistan',
      city:           document.getElementById('f-city').value.trim(),
      description:    document.getElementById('f-desc').value.trim(),
      latitude:       document.getElementById('f-lat').value.trim()      || null,
      longitude:      document.getElementById('f-lon').value.trim()      || null,
      imageUrl:       document.getElementById('f-img').value             || null,
      altitude:       document.getElementById('f-altitude').value.trim(),
      bestTime:       document.getElementById('f-besttime').value.trim(),
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
      if (res.status === 401) { doLogout(); return; }
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
      if (res.status === 401) { doLogout(); return; }
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
  window.stripCoord = function (input) {
    input.value = input.value.replace(/[^0-9.\-]/g, '');
  };

  window.updateCompass = function () {
    const lat = parseFloat(document.getElementById('f-lat').value);
    const lon = parseFloat(document.getElementById('f-lon').value);
    document.getElementById('latDir').textContent = isNaN(lat) ? '' : (lat >= 0 ? '(N)' : '(S)');
    document.getElementById('lonDir').textContent = isNaN(lon) ? '' : (lon >= 0 ? '(E)' : '(W)');
  };

  window.formatCoord = function (input, min, max) {
    let v = parseFloat(input.value);
    if (isNaN(v)) { input.value = ''; return; }
    v = Math.max(min, Math.min(max, v));
    input.value = parseFloat(v.toFixed(4));
    updateCompass();
  };

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
    list.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:4px 0">Loading…</div>';
    try {
      const res  = await fetch(`${API_CONFIG.BASE_URL}/admin/guidelines?destId=${currentGuidelineDestId}`, { headers: getHeaders() });
      if (res.status === 401) { doLogout(); return; }
      const data = await res.json();
      if (!res.ok || !Array.isArray(data) || !data.length) {
        list.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:4px 0">No guidelines yet. Add the first one below.</div>';
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
      list.innerHTML = '<div style="color:var(--danger);font-size:13px">Failed to load guidelines.</div>';
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
      if (res.status === 401) { doLogout(); return; }
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
      if (res.status === 401) { doLogout(); return; }
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
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('emergencyModal').classList.add('open');

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/emergency/${destId}`, { headers: getHeaders() });
      if (res.status === 401) { doLogout(); return; }
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

  window.saveEmergency = async function () {
    const btn   = document.getElementById('emergencySaveBtn');
    const errEl = document.getElementById('emergencyFormErr');
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Saving…';

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
      if (res.status === 401) { doLogout(); return; }
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
      if (res.status === 401) { doLogout(); return; }
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
    document.getElementById('s-name').value   = '';
    document.getElementById('s-vendor').value = '';
    document.getElementById('s-desc').value   = '';
    document.getElementById('s-image').value  = '';
    document.getElementById('sFormLabel').textContent    = 'Add New Souvenir';
    document.getElementById('sSaveBtn').textContent      = 'Add Souvenir';
    document.getElementById('sCancelBtn').style.display  = 'none';
    document.getElementById('sFormErr').style.display    = 'none';
    document.getElementById('sImgPreview').style.display = 'none';
    document.getElementById('sImgFileName').textContent  = 'No image selected';
  };

  window.handleSouvenirImageSelect = async function (input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('sImgFileName').textContent = file.name;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/souvenirs/upload-image`, {
        method: 'POST', headers: getHeaders(), body: formData
      });
      if (res.status === 401) { doLogout(); return; }
      const data = await res.json();
      if (!res.ok) { showToast(data.message || 'Upload failed', 'error'); return; }
      document.getElementById('s-image').value = data.imageUrl;
      const prev = document.getElementById('sImgPreview');
      prev.src = API_CONFIG.BASE_URL.replace('/api', '') + data.imageUrl; prev.style.display = 'block';
    } catch (e) { showToast('Upload failed', 'error'); }
  };

  window.saveSouvenir = async function () {
    const errEl = document.getElementById('sFormErr');
    errEl.style.display = 'none';
    const name = document.getElementById('s-name').value.trim();
    if (!name) { errEl.textContent = 'Name is required'; errEl.style.display = 'block'; return; }

    const btn = document.getElementById('sSaveBtn');
    btn.disabled = true;

    const payload = {
      destId:      currentSouvenirsDestId,
      name,
      vendorName:  document.getElementById('s-vendor').value.trim(),
      description: document.getElementById('s-desc').value.trim(),
      imageUrl:    document.getElementById('s-image').value || null,
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
      if (res.status === 401) { doLogout(); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { errEl.textContent = data.message || 'Save failed'; errEl.style.display = 'block'; return; }
      resetSouvenirForm();
      await loadSouvenirs();
      showToast(editingSouvenirId ? 'Souvenir updated!' : 'Souvenir added!');
    } catch (e) {
      errEl.textContent = 'Network error.'; errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  };

  window.deleteSouvenir = async function (id) {
    if (!confirm('Delete this souvenir?')) return;
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/souvenirs/${id}`, {
        method: 'DELETE', headers: getHeaders()
      });
      if (res.status === 401) { doLogout(); return; }
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
