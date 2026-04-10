// ── Auth guard ──
const tripToken = sessionStorage.getItem('tripify_token');
if (!tripToken) { window.location.href = '../auth/login.html'; }
const user = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
(function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials'), ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const url = 'http://localhost:8080' + u.profilePicture + '?t=' + Date.now();
        const imgTag = '<img src="' + url + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sa.innerHTML = imgTag; ta.innerHTML = imgTag;
    } else { sa.textContent = ini; ta.textContent = ini; }
})(user);
const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

function showToast(icon, msg, dur = 2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── Travel mode ──
let travelMode = 'DRIVING';
function setMode(m) {
    travelMode = m;
    document.querySelectorAll('.mode-tab').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-mode="' + m + '"]').classList.add('active');
}

function swapLocations() {
    const a = document.getElementById('originInput'), b = document.getElementById('destInput');
    [a.value, b.value] = [b.value, a.value];
}

// ── Google Maps globals ──
let map, allRoutes = [], activePolylines = [], activeMarkers = [];

// Called by Google Maps script after it loads
function initMap() {
    const darkStyle = [
        { elementType:'geometry', stylers:[{ color:'#0d1b2a' }] },
        { elementType:'labels.text.fill', stylers:[{ color:'#8a9bb0' }] },
        { elementType:'labels.text.stroke', stylers:[{ color:'#0d1b2a' }] },
        { featureType:'road', elementType:'geometry', stylers:[{ color:'#1c3048' }] },
        { featureType:'road', elementType:'geometry.stroke', stylers:[{ color:'#0f2236' }] },
        { featureType:'road.highway', elementType:'geometry', stylers:[{ color:'#1e4a6e' }] },
        { featureType:'road.highway', elementType:'labels.text.fill', stylers:[{ color:'#f5a623' }] },
        { featureType:'water', elementType:'geometry', stylers:[{ color:'#06111e' }] },
        { featureType:'water', elementType:'labels.text.fill', stylers:[{ color:'#4a6480' }] },
        { featureType:'poi', stylers:[{ visibility:'off' }] },
        { featureType:'administrative.country', elementType:'geometry.stroke', stylers:[{ color:'#2a4a6a' }] },
        { featureType:'landscape', elementType:'geometry', stylers:[{ color:'#0d1f30' }] },
    ];
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 30.3753, lng: 69.3451 },
        zoom: 6,
        styles: darkStyle,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
    });
    const ov = document.getElementById('mapOverlay');
    ov.classList.add('hidden');
    setTimeout(() => { ov.style.display = 'none'; }, 400);
    window._mapsReady = true;
}

// ── Geocode with Nominatim ──
async function geocode(query) {
    const url = 'https://nominatim.openstreetmap.org/search?q=' +
        encodeURIComponent(query) + '&format=json&limit=1&accept-language=en';
    const res = await fetch(url, { headers: { 'User-Agent': 'Tripify/1.0' } });
    if (!res.ok) throw new Error('geocode-failed');
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// ── Route with OSRM ──
async function getOsrmRoute(orig, dest, profile) {
    const url = 'https://router.project-osrm.org/route/v1/' + profile + '/' +
        orig.lng + ',' + orig.lat + ';' +
        dest.lng + ',' + dest.lat +
        '?steps=true&overview=full&geometries=geojson&alternatives=true';
    const res = await fetch(url);
    if (!res.ok) throw new Error('osrm-failed');
    return res.json();
}

// ── Duration display ──
// DRIVING  → OSRM driving profile (accurate car time)
// TRANSIT  → OSRM driving route shown on map; transit time = driving * 1.45
//            (Pakistan buses/wagons avg ~45% slower than cars — no free transit API covers PK)
const TRANSIT_FACTOR = 1.45;

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return m + ' min';
    return h + ' hr ' + (m > 0 ? m + ' min' : '');
}

function displayDuration(rawSeconds) {
    const secs = travelMode === 'TRANSIT' ? rawSeconds * TRANSIT_FACTOR : rawSeconds;
    return formatDuration(secs);
}

// ── Clear previous route drawings ──
function clearMap() {
    activePolylines.forEach(p => p.setMap(null));
    activeMarkers.forEach(m => m.setMap(null));
    activePolylines = [];
    activeMarkers   = [];
}

function drawPolyline(coords, color, weight, opacity) {
    const path = coords.map(c => ({ lat: c[1], lng: c[0] }));
    const poly = new google.maps.Polyline({ path, map, strokeColor: color, strokeWeight: weight, strokeOpacity: opacity });
    activePolylines.push(poly);
    return path;
}

function placeMarker(latlng, title, color) {
    const m = new google.maps.Marker({
        position: latlng, map, title,
        icon: 'http://maps.google.com/mapfiles/ms/icons/' + color + '-dot.png'
    });
    activeMarkers.push(m);
}

// ── Build step text from OSRM maneuver ──
function buildInstruction(step) {
    const type = step.maneuver.type, mod = step.maneuver.modifier || '', name = step.name || 'unnamed road';
    const map_ = { 'depart':'Start on', 'arrive':'Arrive at', 'turn':'Turn '+mod+' onto',
        'new name':'Continue onto', 'continue':'Continue '+(mod?mod+' on':'on'),
        'merge':'Merge onto', 'on ramp':'Take ramp onto', 'off ramp':'Take exit onto',
        'fork':'Keep '+mod+' toward', 'roundabout':'Enter roundabout', 'rotary':'Enter rotary',
        'end of road':'At end of road turn '+mod+' onto' };
    return (map_[type] || 'Continue onto') + ' ' + name;
}

// ── Find Route ──
async function findRoute() {
    const originText = document.getElementById('originInput').value.trim();
    const destText   = document.getElementById('destInput').value.trim();

    if (!originText && !destText) { showToast('⚠️', 'Please enter both a starting point and a destination.'); return; }
    if (!originText) { showToast('⚠️', 'Please enter a starting location (From).'); return; }
    if (!destText)   { showToast('⚠️', 'Please enter a destination (To).'); return; }
    if (!window._mapsReady) { showToast('❌', 'Map is not ready yet. Please wait a moment.', 3000); return; }

    const btn = document.getElementById('findBtn');
    btn.disabled = true;
    btn.textContent = 'Calculating…';
    showToast('🗺️', 'Finding route…', 2500);

    try {
        const [orig, dest] = await Promise.all([geocode(originText), geocode(destText)]);
        if (!orig) { showToast('❌', 'Could not find "' + originText + '". Try adding ", Pakistan".', 4500); return; }
        if (!dest) { showToast('❌', 'Could not find "' + destText + '". Try adding ", Pakistan".', 4500); return; }

        // TRANSIT uses the driving road network on the map (buses follow roads)
        const profile = 'driving';
        const data    = await getOsrmRoute(orig, dest, profile);

        if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
            showToast('❌', 'No route found between these locations.', 4000);
            return;
        }

        allRoutes = data.routes;
        window._routeOrig = orig;
        window._routeDest = dest;
        clearMap();
        applyRoute(0, orig, dest);
        renderAlternatives();
        showToast('✅', 'Route found! ' + allRoutes.length + ' option' + (allRoutes.length > 1 ? 's' : '') + ' available');

    } catch (e) {
        showToast('❌', 'Unable to connect to routing service. Please try again later.', 5000);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>Find Route';
    }
}

function applyRoute(idx, orig, dest) {
    orig = orig || window._routeOrig;
    dest = dest || window._routeDest;
    clearMap();
    const route = allRoutes[idx];

    allRoutes.forEach((r, i) => {
        if (i !== idx) drawPolyline(r.geometry.coordinates, '#4a6480', 4, 0.35);
    });
    const path = drawPolyline(route.geometry.coordinates, '#f5a623', 5, 0.9);

    placeMarker({ lat: orig.lat, lng: orig.lng }, 'Start', 'green');
    placeMarker({ lat: dest.lat, lng: dest.lng }, 'End',   'red');

    const bounds = new google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });

    const distKm = (route.distance / 1000).toFixed(1);
    document.getElementById('statDist').textContent = distKm + ' km';
    document.getElementById('statTime').textContent = displayDuration(route.duration);
    document.getElementById('statMode').textContent = { DRIVING:'🚗 Driving', TRANSIT:'🚌 Transit' }[travelMode];
    document.getElementById('routeSummary').style.display = 'block';

    let html = '', n = 1;
    (route.legs || []).forEach(leg => {
        (leg.steps || []).forEach(step => {
            const dist = step.distance >= 1000 ? (step.distance/1000).toFixed(1)+' km' : Math.round(step.distance)+' m';
            html += '<div class="step-item"><div class="step-num">'+n+++'</div><div>' +
                    '<div class="step-text">'+buildInstruction(step)+'</div>' +
                    '<div class="step-dist">'+dist+' · '+formatDuration(step.duration)+'</div>' +
                    '</div></div>';
        });
    });
    document.getElementById('stepsContainer').innerHTML = html;

    document.querySelectorAll('.alt-route').forEach((el, i) => el.classList.toggle('active', i === idx));
}

function renderAlternatives() {
    const wrap = document.getElementById('alternativesWrap');
    if (allRoutes.length <= 1) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    document.getElementById('alternativesList').innerHTML = allRoutes.map((r, i) => {
        const distKm = (r.distance / 1000).toFixed(1);
        return '<div class="alt-route '+(i===0?'active':'')+'" id="alt-'+i+'" onclick="switchRoute('+i+')">' +
            '<div><div class="alt-label">Route '+(i+1)+(i===0?' (Fastest)':'')+'</div>' +
            '<div class="alt-detail">'+distKm+' km · '+displayDuration(r.duration)+'</div></div>' +
            '<span class="alt-badge '+(i===0?'best':'alt')+'">'+(i===0?'Best':'Alt')+'</span>' +
            '</div>';
    }).join('');
}

function switchRoute(idx) {
    applyRoute(idx);
    showToast('🗺️', 'Switched to Route ' + (idx + 1));
}

function toggleSteps() {
    const w = document.getElementById('stepsWrap');
    w.style.display = w.style.display === 'none' ? 'block' : 'none';
}

// ── Google Maps error handler (called by Maps when key is invalid/rejected) ──
window.gm_authFailure = function () { showMapsConnectError(); };

function showMapsConnectError() {
    document.getElementById('mapsErrorOverlay').style.display = 'flex';
    document.getElementById('mapOverlay').style.display = 'none';
    showToast('❌', 'Unable to connect to Google Maps. Please try again later.', 5000);
}

// ── Fetch API key from backend, then inject Maps script ──
async function loadGoogleMaps() {
    let key;
    try {
        const res = await fetch('http://localhost:8080/api/config/maps-key', {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (!res.ok) throw new Error('key-fetch-failed');
        const data = await res.json();
        key = data.key;
    } catch (e) {
        showMapsConnectError();
        return;
    }

    const loadTimeout = setTimeout(() => {
        if (!window._mapsReady) { showMapsConnectError(); }
    }, 12000);

    const _origInit = window.initMap;
    window.initMap = function () {
        clearTimeout(loadTimeout);
        _origInit();
    };

    const script = document.createElement('script');
    script.src   = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&callback=initMap';
    script.async = true;
    script.defer = true;
    script.onerror = function () { clearTimeout(loadTimeout); showMapsConnectError(); };
    document.head.appendChild(script);
}

loadGoogleMaps();
