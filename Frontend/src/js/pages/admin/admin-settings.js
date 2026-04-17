const ADMIN_API = API_CONFIG.BASE_URL + '/admin';
const token = sessionStorage.getItem('tripify_token');
const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');

if (!token || user.userType !== 'Admin') {
  location.href = '../auth/admin-login.html';
}

// Init topbar + sign-out display
(function() {
  const name = user.fullName || 'Super Admin';
  const ini  = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('topbarInitials').textContent = ini;
  document.getElementById('adminNameDisplay').textContent = name;
})();

function getHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
}

function doLogout() {
  sessionStorage.removeItem('tripify_token');
  sessionStorage.removeItem('tripify_user');
  location.href = '../auth/admin-login.html';
}

// ─── Toast helpers ─────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(type, msg) {
  const el  = document.getElementById(type === 'success' ? 'toastSuccess' : 'toastError');
  const txt = document.getElementById(type === 'success' ? 'toastSuccessMsg' : 'toastErrorMsg');
  txt.textContent = msg;
  el.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ─── Feature toggle key → checkbox ID map ──────────────────────────────────
const TOGGLE_MAP = {
  'FEATURE_USER_REGISTRATION': 'toggleUserReg',
  'FEATURE_HM_REGISTRATION':   'toggleHMReg',
  'FEATURE_WEATHER_SCHEDULER': 'toggleWeather',
  'FEATURE_BOOKING':           'toggleBooking',
  'FEATURE_REVIEWS':           'toggleReviews',
  'FEATURE_MAINTENANCE_MODE':  'toggleMaintenance',
};

// ─── Load settings from DB ─────────────────────────────────────────────────
async function loadSettings() {
  try {
    const res  = await fetch(ADMIN_API + '/settings', { headers: getHeaders() });
    if (!res.ok) throw new Error();
    const list = await res.json();
    list.forEach(s => {
      if (s.key === 'BASE_TRAVEL_COST_PER_DAY') {
        document.getElementById('baseCostField').value = s.value;
      }
      // API keys: never populate into the field — just leave placeholder
      // Feature toggles
      const cbId = TOGGLE_MAP[s.key];
      if (cbId) {
        document.getElementById(cbId).checked = (s.value === 'true');
      }
    });
  } catch {
    document.getElementById('baseCostField').placeholder = 'Failed to load';
    showToast('error', 'Could not load settings from server.');
  }
}

// ─── Save all changes ──────────────────────────────────────────────────────
async function saveAllChanges() {
  const updates = [];

  // Base cost
  const baseCost = document.getElementById('baseCostField').value.trim();
  if (baseCost) updates.push({ key: 'BASE_TRAVEL_COST_PER_DAY', value: baseCost });

  // Feature toggles
  Object.entries(TOGGLE_MAP).forEach(([dbKey, cbId]) => {
    updates.push({ key: dbKey, value: document.getElementById(cbId).checked ? 'true' : 'false' });
  });

  if (updates.length === 0) {
    showToast('error', 'Nothing to save.');
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    const res  = await fetch(ADMIN_API + '/settings', {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.message || 'Failed to save settings.');
      return;
    }
    showToast('success', 'Settings saved successfully.');
  } catch {
    showToast('error', 'Network error — check if the backend is running.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Save All Changes';
  }
}

// ─── Danger zone ───────────────────────────────────────────────────────────
let pendingDangerAction = null;

function dangerAction(type) {
  pendingDangerAction = type;
  const overlay = document.getElementById('confirmOverlay');
  if (type === 'notifications') {
    document.getElementById('confirmTitle').textContent = 'Clear All Notifications';
    document.getElementById('confirmMsg').textContent   = 'This will permanently delete ALL notifications for every user. This cannot be undone.';
  } else {
    document.getElementById('confirmTitle').textContent = 'Purge Old Logs';
    document.getElementById('confirmMsg').textContent   = 'This will permanently delete all activity log entries older than 90 days. This cannot be undone.';
  }
  overlay.style.display = 'flex';
}

function closeConfirm() {
  document.getElementById('confirmOverlay').style.display = 'none';
  pendingDangerAction = null;
}

async function executeConfirm() {
  if (!pendingDangerAction) return;
  const action = pendingDangerAction;
  closeConfirm();

  const btnId = action === 'notifications' ? 'btnClearNotif' : 'btnPurgeLogs';
  const btn   = document.getElementById(btnId);
  btn.disabled = true;
  btn.textContent = 'Working…';

  const url = action === 'notifications'
    ? ADMIN_API + '/notifications/clear'
    : ADMIN_API + '/logs/purge';

  try {
    const res  = await fetch(url, { method: 'DELETE', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.message || 'Operation failed.');
    } else {
      const count = data.deleted !== undefined ? ` (${data.deleted} records)` : '';
      showToast('success', (data.message || 'Done') + count);
    }
  } catch {
    showToast('error', 'Network error — operation could not be completed.');
  } finally {
    btn.disabled = false;
    btn.textContent = action === 'notifications' ? 'Clear Notifications' : 'Purge Old Logs';
  }
}

// Close confirm on backdrop click
document.getElementById('confirmOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeConfirm();
});

// ─── Init ──────────────────────────────────────────────────────────────────
loadSettings();
