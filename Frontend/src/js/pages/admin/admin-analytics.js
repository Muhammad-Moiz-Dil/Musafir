(function(){
  // ── Auth guard ────────────────────────────────────────────────────────────
  const token = sessionStorage.getItem('tripify_token');
  const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
  if (!token || user.userType !== 'Admin') {
    window.location.href = '../auth/admin-login.html'; return;
  }
  const ini = (user.fullName || 'SA').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('topbarInitials').textContent  = ini;
  window.doLogout = function(){
    sessionStorage.removeItem('tripify_token');
    sessionStorage.removeItem('tripify_user');
    window.location.href = '../auth/admin-login.html';
  };

  // ── Chart instances ───────────────────────────────────────────────────────
  let bookingsChartInst = null, usersChartInst = null;
  const BAR_COLORS = ['#2563EB','#10B981','#8B5CF6','#F59E0B','#EF4444'];

  // ── Helpers ───────────────────────────────────────────────────────────────
  function fmtRevenue(val) {
    if (val >= 1_000_000) return 'PKR ' + (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000)     return 'PKR ' + (val / 1_000).toFixed(0)     + 'K';
    return 'PKR ' + val;
  }

  function toDateStr(d) {
    return d.toISOString().slice(0, 10);
  }

  // ── Default date range: last 6 complete months ───────────────────────────
  function setDefaultRange() {
    const end   = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 6);
    start.setDate(1);
    document.getElementById('filterStart').value = toDateStr(start);
    document.getElementById('filterEnd').value   = toDateStr(end);
  }
  setDefaultRange();

  // ── Render ────────────────────────────────────────────────────────────────
  function renderStats(data) {
    const noDataBanner = document.getElementById('noDataBanner');

    if (!data.hasData) {
      noDataBanner.style.display = 'flex';
    } else {
      noDataBanner.style.display = 'none';
    }

    // Stat cards
    document.getElementById('statTotalUsers').textContent    = data.totalUsers.toLocaleString();
    document.getElementById('statUsersChange').textContent   = `${data.totalTourists} tourists · ${data.totalHMs} hotel managers`;
    document.getElementById('statUsersChange').className     = 'stat-change';

    document.getElementById('statTotalBookings').textContent = data.totalBookings.toLocaleString();
    document.getElementById('statBookingsChange').textContent= `In selected range`;
    document.getElementById('statBookingsChange').className  = 'stat-change';

    document.getElementById('statRevenue').textContent       = fmtRevenue(data.totalRevenue);
    document.getElementById('statRevenueChange').textContent = `${data.newUsersInRange} new registrations in range`;
    document.getElementById('statRevenueChange').className   = 'stat-change';

    // Update subtitle
    const months = data.monthly;
    if (months.length > 0) {
      document.getElementById('pageSubtitle').textContent =
        `${months[0].month} – ${months[months.length - 1].month}`;
    }

    // ── Charts ──────────────────────────────────────────────────────────────
    const labels  = months.map(m => m.month);
    const bCounts = months.map(m => m.bookings);
    const revs    = months.map(m => Math.round(m.revenue / 1000)); // PKR 000s
    const users   = months.map(m => m.users);

    if (bookingsChartInst) bookingsChartInst.destroy();
    bookingsChartInst = new Chart(document.getElementById('bookingsChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Bookings', data: bCounts, backgroundColor: 'rgba(37,99,235,0.15)',
            borderColor: '#2563EB', borderWidth: 2, borderRadius: 6, yAxisID: 'y' },
          { type: 'line', label: 'Revenue (PKR 000s)', data: revs, borderColor: '#10B981',
            backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 2.5, tension: 0.4,
            pointRadius: 4, pointBackgroundColor: '#10B981', yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y:  { position: 'left',  beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
          y1: { position: 'right', beginAtZero: true, grid: { display: false } }
        }
      }
    });

    if (usersChartInst) usersChartInst.destroy();
    usersChartInst = new Chart(document.getElementById('usersChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'New Users', data: users, borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 2.5, tension: 0.4,
          pointRadius: 4, pointBackgroundColor: '#8B5CF6', fill: true }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
                  x: { grid: { display: false } } }
      }
    });

    // ── Top destinations ────────────────────────────────────────────────────
    const list = document.getElementById('topDestsList');
    if (!data.topDestinations || data.topDestinations.length === 0) {
      list.innerHTML = '<p style="padding:16px 0;font-size:13px;color:var(--text-3);text-align:center">No booking data for this period.</p>';
    } else {
      list.innerHTML = data.topDestinations.map((d, i) => `
        <div class="top-item">
          <div class="top-rank">${i + 1}</div>
          <div class="top-name">${d.name}</div>
          <div class="top-bar-wrap"><div class="top-bar" style="width:${d.pct}%;background:${BAR_COLORS[i] || '#2563EB'}"></div></div>
          <div class="top-val">${d.count}</div>
        </div>`).join('');
    }
  }

  // ── Fetch statistics ──────────────────────────────────────────────────────
  function loadStats(start, end) {
    const btn = document.getElementById('applyFilter');
    btn.disabled = true;
    btn.textContent = 'Loading…';

    const url = start && end
      ? ENDPOINTS.ADMIN.STATISTICS(start, end)
      : ENDPOINTS.ADMIN.STATISTICS(null, null);

    fetch(url, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(res => {
        if (res.status === 401) { window.location.href = '../auth/admin-login.html'; return; }
        if (res.status === 403) { alert('Access denied.'); return; }
        if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Server error'); });
        return res.json();
      })
      .then(data => { if (data) renderStats(data); })
      .catch(err => {
        document.getElementById('noDataBanner').style.display = 'flex';
        document.getElementById('noDataBanner').querySelector('svg').nextSibling.textContent =
          ' Failed to load statistics: ' + err.message + '. Please try again.';
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Apply Filter';
      });
  }

  // ── Initial load ──────────────────────────────────────────────────────────
  loadStats(
    document.getElementById('filterStart').value,
    document.getElementById('filterEnd').value
  );

  // ── Filter events ─────────────────────────────────────────────────────────
  document.getElementById('applyFilter').addEventListener('click', function() {
    const s = document.getElementById('filterStart').value;
    const e = document.getElementById('filterEnd').value;
    if (!s || !e) { alert('Please select both a start and end date.'); return; }
    if (s > e)    { alert('Start date must be before end date.'); return; }
    loadStats(s, e);
  });

  document.getElementById('resetFilter').addEventListener('click', function() {
    setDefaultRange();
    loadStats(
      document.getElementById('filterStart').value,
      document.getElementById('filterEnd').value
    );
  });

(async function(){try{const r=await fetch(ENDPOINTS.ADMIN.FLAGS_COUNT,{headers:{Authorization:'Bearer '+token}});if(!r.ok)return;const {count}=await r.json();const b=document.getElementById('moderationBadge');if(b){if(count>0){b.textContent=count;b.style.display='';}else b.style.display='none';}}catch(e){}})();

})();
