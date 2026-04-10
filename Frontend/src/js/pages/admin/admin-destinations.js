
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let currentSeasonalDestId = null;

async function openSeasonalModal(destId, destName) {
  currentSeasonalDestId = destId;
  document.getElementById('seasonalModalTitle').textContent = `Seasonal Data — ${destName}`;
  document.getElementById('seasonalFormErr').style.display = 'none';

  // Build 12 empty rows
  const tbody = document.getElementById('seasonalTableBody');
  tbody.innerHTML = MONTH_NAMES.map((m, i) => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 12px;font-weight:600;color:var(--text-1)">${m}</td>
      <td style="padding:6px 12px"><input type="number" step="0.01" id="s-temp-${i+1}" class="form-input" style="width:100%;padding:6px 10px" placeholder="e.g. 12.5"></td>
      <td style="padding:6px 12px"><input type="number" step="0.01" min="0" id="s-rain-${i+1}" class="form-input" style="width:100%;padding:6px 10px" placeholder="e.g. 45.0"></td>
    </tr>`).join('');

  document.getElementById('seasonalModal').classList.add('open');

  // Load existing data
  try {
    const res = await fetch(`http://localhost:8080/api/seasonal-data/admin/${destId}`, { headers: getHeaders() });
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
  const btn = document.getElementById('seasonalSaveBtn');
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
    const res = await fetch(`http://localhost:8080/api/seasonal-data/admin/${currentSeasonalDestId}`, {
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
