// ── Auth guard ─────────────────────────────────────────
const TOKEN = sessionStorage.getItem('tripify_token');
const USER  = JSON.parse(sessionStorage.getItem('tripify_user') || '{"fullName":"Tourist"}');
if (!TOKEN) { window.location.href = '../auth/login.html'; }

// ── Chart instances (kept to destroy before re-render) ──
let chartTemp    = null;
let chartRain    = null;
let chartScore   = null;
let chartClimate = null;

// ── Chart.js global defaults ───────────────────────────
Chart.defaults.color           = 'rgba(255,255,255,0.45)';
Chart.defaults.borderColor     = 'rgba(255,255,255,0.07)';
Chart.defaults.font.family     = 'Inter, sans-serif';
Chart.defaults.font.size       = 12;
Chart.defaults.plugins.legend.display = false;

// ── Helpers ────────────────────────────────────────────
function destroyCharts() {
    if (chartTemp)    { chartTemp.destroy();    chartTemp    = null; }
    if (chartRain)    { chartRain.destroy();    chartRain    = null; }
    if (chartScore)   { chartScore.destroy();   chartScore   = null; }
    if (chartClimate) { chartClimate.destroy(); chartClimate = null; }
}

function makeGradient(ctx, color) {
    const g = ctx.createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, color.replace('1)', '0.35)'));
    g.addColorStop(1, color.replace('1)', '0.02)'));
    return g;
}

// ── Render charts + stats ──────────────────────────────
function renderInsights(data) {
    const labels   = data.months.map(m => m.monthName);
    const temps    = data.months.map(m => m.temperature   != null ? Number(m.temperature)   : null);
    const rains    = data.months.map(m => m.rainfall      != null ? Number(m.rainfall)      : null);

    // Stats
    const validTemps  = temps.filter(v => v != null);
    const validRains  = rains.filter(v => v != null);

    const avgTemp     = validTemps.length  ? (validTemps.reduce((a,b)=>a+b,0)  / validTemps.length).toFixed(1)  : '—';
    const maxRain     = validRains.length  ? Math.max(...validRains).toFixed(1) : '—';

    // Travel Comfort Score per month (0–100)
    // Temp comfort: peak at 22°C, falls off linearly. Rainfall penalty: higher rain = lower score.
    const peakRain = validRains.length ? Math.max(...validRains) : 1;
    const scores = data.months.map((m, i) => {
        const t = temps[i], r = rains[i];
        if (t == null && r == null) return null;
        const tempScore = t != null ? Math.max(0, 100 - Math.abs(t - 22) * 3.5) : 50;
        const rainScore = r != null ? Math.max(0, 100 - (r / (peakRain || 1)) * 100) : 50;
        return Math.round(tempScore * 0.45 + rainScore * 0.55);
    });

    // Best month = lowest rainfall + warm enough
    let bestIdx = 0;
    if (validRains.length) {
        bestIdx = rains.indexOf(Math.min(...rains.filter(v => v != null)));
    }
    const bestMonth = data.months[bestIdx];

    destroyCharts();

    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <!-- Best month banner -->
        <div class="best-month-row">
            <div class="best-month-icon">🌟</div>
            <div>
                <div class="best-month-title">Best Month to Visit — ${bestMonth.monthName}</div>
                <div class="best-month-sub">Lowest rainfall, ideal travel conditions for ${data.destination}</div>
            </div>
        </div>

        <!-- Summary stats -->
        <div class="stat-row">
            <div class="stat-card">
                <div class="stat-label">Avg Temperature</div>
                <div class="stat-value temp">${avgTemp}°C</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Peak Rainfall</div>
                <div class="stat-value rain">${maxRain} mm</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Data Points</div>
                <div class="stat-value" style="color:var(--white)">${data.months.length} months</div>
            </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-card-header">
                    <div class="chart-card-icon temp">🌡️</div>
                    <div>
                        <div class="chart-card-title">Temperature Trend</div>
                        <div class="chart-card-sub">Average °C per month</div>
                    </div>
                </div>
                <div class="chart-wrap"><canvas id="chartTemp"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-card-header">
                    <div class="chart-card-icon rain">🌧️</div>
                    <div>
                        <div class="chart-card-title">Rainfall</div>
                        <div class="chart-card-sub">Average mm per month</div>
                    </div>
                </div>
                <div class="chart-wrap"><canvas id="chartRain"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-card-header">
                    <div class="chart-card-icon" style="background:rgba(167,139,250,0.15)">⭐</div>
                    <div>
                        <div class="chart-card-title">Travel Comfort Score</div>
                        <div class="chart-card-sub">Best months to visit (0–100)</div>
                    </div>
                </div>
                <div class="chart-wrap"><canvas id="chartScore"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-card-header">
                    <div class="chart-card-icon score">🌍</div>
                    <div>
                        <div class="chart-card-title">Climate Overview</div>
                        <div class="chart-card-sub">Temperature (°C) vs Rainfall (mm)</div>
                    </div>
                </div>
                <div class="chart-wrap"><canvas id="chartClimate"></canvas></div>
            </div>
        </div>
    `;

    // ── Temperature — line chart ──
    const ctxT = document.getElementById('chartTemp').getContext('2d');
    chartTemp = new Chart(ctxT, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: temps,
                borderColor: '#fb923c',
                backgroundColor: makeGradient(ctxT, 'rgba(251,146,60,1)'),
                borderWidth: 2.5,
                pointBackgroundColor: '#fb923c',
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4,
                fill: true,
                spanGaps: true,
            }]
        },
        options: chartOptions('°C')
    });

    // ── Rainfall — bar chart ──
    const ctxR = document.getElementById('chartRain').getContext('2d');
    chartRain = new Chart(ctxR, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: rains,
                backgroundColor: 'rgba(96,165,250,0.5)',
                borderColor: '#60a5fa',
                borderWidth: 1.5,
                borderRadius: 5,
                spanGaps: true,
            }]
        },
        options: chartOptions('mm')
    });

    // ── Travel Comfort Score — horizontal bar chart ──
    const ctxS = document.getElementById('chartScore').getContext('2d');
    chartScore = new Chart(ctxS, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: scores,
                backgroundColor: scores.map(s =>
                    s == null ? 'rgba(255,255,255,0.1)' :
                    s >= 70   ? 'rgba(52,211,153,0.7)'  :
                    s >= 40   ? 'rgba(251,191,36,0.7)'  :
                                'rgba(239,68,68,0.6)'
                ),
                borderColor: scores.map(s =>
                    s == null ? 'transparent' :
                    s >= 70   ? '#34d399' :
                    s >= 40   ? '#fbbf24' :
                                '#ef4444'
                ),
                borderWidth: 1.5,
                borderRadius: 5,
                spanGaps: true,
            }]
        },
        options: {
            ...chartOptions('%'),
            plugins: {
                ...chartOptions('%').plugins,
                tooltip: {
                    ...chartOptions('%').plugins?.tooltip,
                    callbacks: {
                        label: ctx => {
                            const v = ctx.parsed.y;
                            if (v == null) return 'No data';
                            const label = v >= 70 ? '🟢 Great' : v >= 40 ? '🟡 Moderate' : '🔴 Poor';
                            return `Score: ${v}/100 — ${label}`;
                        }
                    }
                }
            }
        }
    });

    // ── Climate Overview — dual-axis (temp line + rainfall bars) ──
    const ctxC = document.getElementById('chartClimate').getContext('2d');
    chartClimate = new Chart(ctxC, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Temp (°C)',
                    data: temps,
                    borderColor: '#fb923c',
                    backgroundColor: 'rgba(251,146,60,0.0)',
                    pointBackgroundColor: '#fb923c',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    spanGaps: true,
                    yAxisID: 'yTemp',
                    order: 1,
                },
                {
                    type: 'bar',
                    label: 'Rainfall (mm)',
                    data: rains,
                    backgroundColor: 'rgba(96,165,250,0.4)',
                    borderColor: '#60a5fa',
                    borderWidth: 1.5,
                    borderRadius: 4,
                    spanGaps: true,
                    yAxisID: 'yRain',
                    order: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: 'rgba(255,255,255,0.55)', font: { size: 11 }, boxWidth: 12, padding: 14 }
                },
                tooltip: {
                    backgroundColor: 'rgba(7,14,23,0.92)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: 'rgba(255,255,255,0.7)',
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + (ctx.parsed.y != null ? ctx.parsed.y : '—')
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11 } }
                },
                yTemp: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#fb923c',
                        font: { size: 11 },
                        callback: v => v + '°C'
                    },
                    title: { display: true, text: '°C', color: '#fb923c', font: { size: 11 } }
                },
                yRain: {
                    type: 'linear',
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        color: '#60a5fa',
                        font: { size: 11 },
                        callback: v => v + ' mm'
                    },
                    title: { display: true, text: 'mm', color: '#60a5fa', font: { size: 11 } }
                }
            }
        }
    });
}

function chartOptions(unit, compact = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                callbacks: {
                    label: ctx => compact
                        ? ` PKR ${Number(ctx.parsed.y).toLocaleString()}`
                        : ` ${ctx.parsed.y} ${unit}`
                }
            }
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 11 } } },
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: {
                    font: { size: 11 },
                    callback: v => compact ? `${(v/1000).toFixed(0)}k` : v
                }
            }
        }
    };
}

// ── Show placeholder ───────────────────────────────────
function showPlaceholder(icon, msg) {
    destroyCharts();
    document.getElementById('contentArea').innerHTML = `
        <div class="seasonal-placeholder">
            <span>${icon}</span>
            <p>${msg}</p>
        </div>`;
}

// ── Load seasonal data ─────────────────────────────────
async function loadSeasonalData(destName) {
    showPlaceholder('⏳', 'Loading seasonal data…');
    try {
        const res  = await fetch(ENDPOINTS.SEASONAL.BY_DESTINATION(destName), {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });

        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }

        const data = await res.json();

        if (res.status === 404) {
            showPlaceholder('🌤️', data.message || 'No seasonal insights available for this location yet.');
            return;
        }
        if (!res.ok) {
            showPlaceholder('📶', 'Something went wrong. Please try again later.');
            return;
        }

        renderInsights(data);

    } catch (e) {
        showPlaceholder('📶', 'Network error. Please check your connection and that the server is running.');
    }
}

// ── Load destinations (no-op — search widget handles lookup) ──
async function loadDestinations() { return; }

// ── Destination search widget ─────────────────────────
(function(){
    const input = document.getElementById('destSearchInput');
    const dropdown = document.getElementById('destSearchDropdown');
    const clearBtn = document.getElementById('destSearchClear');
    let timer;
    async function search(q) {
        try {
            const res = await fetch(ENDPOINTS.DESTINATIONS.SEARCH + '?q=' + encodeURIComponent(q.trim()), {
                headers: { 'Authorization': 'Bearer ' + TOKEN }
            });
            if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
            const data = await res.json();
            showDropdown(Array.isArray(data) ? data : []);
        } catch(e) { showDropdown([]); }
    }
    function showDropdown(items) {
        if (!items.length) {
            dropdown.innerHTML = '<div class="dest-no-result">🔍 No destination found</div>';
            dropdown.style.display = 'block'; return;
        }
        dropdown.innerHTML = items.map(d =>
            `<div class="dest-search-item" data-name="${d.name}">${d.name}${d.city ? ` <span class="dsrc-city">— ${d.city}</span>` : ''}</div>`
        ).join('');
        dropdown.style.display = 'block';
        dropdown.querySelectorAll('.dest-search-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                input.value = el.dataset.name;
                clearBtn.style.display = 'inline';
                hideDropdown();
                loadSeasonalData(el.dataset.name);
            });
        });
    }
    function hideDropdown() { dropdown.style.display = 'none'; }
    input.addEventListener('input', e => {
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        clearTimeout(timer);
        if (!e.target.value.trim()) { hideDropdown(); showPlaceholder('🌤️', 'Choose a destination above to view its seasonal charts.'); return; }
        timer = setTimeout(() => search(e.target.value), 300);
    });
    clearBtn.addEventListener('click', () => {
        input.value = ''; clearBtn.style.display = 'none'; hideDropdown();
        showPlaceholder('🌤️', 'Choose a destination above to view its seasonal charts.');
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#destSearchWrap')) hideDropdown();
    });
})();

// ── User info ──────────────────────────────────────────
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials'), ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const img = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sa.innerHTML = img; ta.innerHTML = img;
    } else { sa.textContent = ini; ta.textContent = ini; }
}
applyUserProfile(USER);

// ── Sidebar toggle ─────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
});
overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
});

// ── Boot ───────────────────────────────────────────────
loadDestinations();
