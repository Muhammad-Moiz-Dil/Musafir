// ── Auth guard
const tripToken = sessionStorage.getItem('tripify_token');
if (!tripToken) { window.location.href = '../auth/login.html'; }
const user = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');

// ── State
let selectedHotel       = null;
let selectedRoomType    = null;
let selectedDestination = null;
let selectedSource      = null;

// ── Pakistani cities & tourist destinations with coordinates
const PAKISTAN_CITIES = [
    // Major cities
    { name: 'Islamabad',        lat: 33.6844, lng: 73.0479 },
    { name: 'Rawalpindi',       lat: 33.5651, lng: 73.0169 },
    { name: 'Lahore',           lat: 31.5204, lng: 74.3587 },
    { name: 'Karachi',          lat: 24.8607, lng: 67.0011 },
    { name: 'Peshawar',         lat: 34.0150, lng: 71.5249 },
    { name: 'Quetta',           lat: 30.1798, lng: 66.9750 },
    { name: 'Multan',           lat: 30.1575, lng: 71.5249 },
    { name: 'Faisalabad',       lat: 31.4504, lng: 73.1350 },
    { name: 'Hyderabad',        lat: 25.3960, lng: 68.3578 },
    { name: 'Sialkot',          lat: 32.4927, lng: 74.5317 },
    { name: 'Gujranwala',       lat: 32.1877, lng: 74.1945 },
    { name: 'Abbottabad',       lat: 34.1466, lng: 73.2117 },
    { name: 'Sukkur',           lat: 27.7052, lng: 68.8574 },
    { name: 'Bahawalpur',       lat: 29.3956, lng: 71.6836 },
    { name: 'Gilgit',           lat: 35.9208, lng: 74.3082 },
    { name: 'Larkana',          lat: 27.5570, lng: 68.2248 },
    { name: 'Sahiwal',          lat: 30.6706, lng: 73.1064 },
    { name: 'Sargodha',         lat: 32.0836, lng: 72.6711 },
    { name: 'Gujrat',           lat: 32.5736, lng: 74.0789 },
    { name: 'Sheikhupura',      lat: 31.7167, lng: 73.9850 },
    { name: 'Mardan',           lat: 34.1986, lng: 72.0404 },
    { name: 'Nowshera',         lat: 34.0153, lng: 71.9747 },
    { name: 'Attock',           lat: 33.7667, lng: 72.3667 },
    { name: 'Jhelum',           lat: 32.9425, lng: 73.7257 },
    { name: 'Chakwal',          lat: 32.9328, lng: 72.8563 },
    { name: 'Taxila',           lat: 33.7467, lng: 72.8408 },
    { name: 'Haripur',          lat: 33.9980, lng: 72.9333 },
    { name: 'Bannu',            lat: 32.9889, lng: 70.6044 },
    { name: 'Kohat',            lat: 33.5869, lng: 71.4414 },
    { name: 'Dera Ismail Khan', lat: 31.8300, lng: 70.9010 },
    { name: 'Dera Ghazi Khan',  lat: 30.0500, lng: 70.6333 },
    { name: 'Muzaffarabad',     lat: 34.3700, lng: 73.4710 },
    { name: 'Mirpur',           lat: 33.1450, lng: 73.7502 },
    { name: 'Jacobabad',        lat: 28.2769, lng: 68.4514 },
    { name: 'Nawabshah',        lat: 26.2442, lng: 68.4100 },
    { name: 'Turbat',           lat: 26.0025, lng: 63.0444 },
    { name: 'Khuzdar',          lat: 27.8000, lng: 66.6167 },
    // Tourist destinations
    { name: 'Skardu',           lat: 35.2971, lng: 75.6346 },
    { name: 'Hunza',            lat: 36.3167, lng: 74.6500 },
    { name: 'Hunza Valley',     lat: 36.3167, lng: 74.6500 },
    { name: 'Murree',           lat: 33.9042, lng: 73.3939 },
    { name: 'Swat',             lat: 35.2227, lng: 72.4258 },
    { name: 'Mingora',          lat: 34.7717, lng: 72.3600 },
    { name: 'Naran',            lat: 34.9063, lng: 73.6507 },
    { name: 'Kaghan',           lat: 34.7683, lng: 73.5943 },
    { name: 'Naran Kaghan',     lat: 34.9063, lng: 73.6507 },
    { name: 'Chitral',          lat: 35.8518, lng: 71.7861 },
    { name: 'Gwadar',           lat: 25.1264, lng: 62.3225 },
    { name: 'Kalam',            lat: 35.4897, lng: 72.5792 },
    { name: 'Fairy Meadows',    lat: 35.3731, lng: 74.5856 },
    { name: 'Naltar',           lat: 36.1667, lng: 74.1833 },
    { name: 'Khunjerab',        lat: 36.8417, lng: 75.4281 },
    { name: 'Shigar',           lat: 35.5000, lng: 75.7333 },
    { name: 'Astore',           lat: 35.3667, lng: 74.8667 },
    { name: 'Mansehra',         lat: 34.3330, lng: 73.1960 },
    { name: 'Swabi',            lat: 34.1203, lng: 72.4698 },
    { name: 'Mohenjo-daro',     lat: 27.3244, lng: 68.1375 },
    { name: 'Mohenjodaro',      lat: 27.3244, lng: 68.1375 },
    { name: 'Kashmir',          lat: 34.0837, lng: 74.7973 },
    { name: 'Azad Kashmir',     lat: 34.3700, lng: 73.4710 },
    { name: 'Neelum Valley',    lat: 34.7000, lng: 73.9000 },
    { name: 'Shogran',          lat: 34.6025, lng: 73.4661 },
    { name: 'Besham',           lat: 34.9117, lng: 72.8700 },
    { name: 'Chilas',           lat: 35.4244, lng: 74.0994 },
    { name: 'Ghizer',           lat: 36.1500, lng: 73.8333 },
    { name: 'Kalash',           lat: 35.7000, lng: 71.7167 },
    { name: 'Ratti Gali',       lat: 34.8667, lng: 73.9167 },
    { name: 'Deosai',           lat: 34.9833, lng: 75.4000 },
    { name: 'Khaplu',           lat: 35.1667, lng: 76.3333 },
];

// ── Determines if a place name is within Pakistan using the curated list
// Synchronous check — no network call, no race condition.
function isPakistaniPlace(name) {
    return findCity(name) !== null;
}


// ── Fast lookup from known-cities list (exact → starts-with → contains)
function findCity(input) {
    if (!input) return null;
    const q = input.trim().toLowerCase();
    if (!q) return null;
    return (
        PAKISTAN_CITIES.find(c => c.name.toLowerCase() === q) ||
        PAKISTAN_CITIES.find(c => c.name.toLowerCase().startsWith(q)) ||
        PAKISTAN_CITIES.find(c => c.name.toLowerCase().includes(q)) ||
        null
    );
}

// ── Geocode any city via Nominatim — Pakistan-biased, with importance filter
// Returns { lat, lng, fromPakistan } so callers know if the result is within Pakistan.
async function geocodeCity(name) {
    const search = async (q) => {
        const url = 'https://nominatim.openstreetmap.org/search?q=' +
                    encodeURIComponent(q) + '&format=json&limit=1&addressdetails=0';
        const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        if (!data || !data.length) return null;
        if ((parseFloat(data[0].importance) || 0) < 0.20) return null;
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    };
    // Try Pakistan-biased first to avoid global-code ambiguity (e.g. LHR → Lahore not London)
    const pkResult = await search(name + ', Pakistan');
    if (pkResult) return { ...pkResult, fromPakistan: true };
    const globalResult = await search(name);
    if (globalResult) return { ...globalResult, fromPakistan: false };
    return null;
}

// ── Haversine distance (km) × 1.3 road factor
function haversineKm(lat1, lng1, lat2, lng2) {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3);
}

// ── Auto-fill distance when both source + dest have coordinates
function tryAutoCalcDist() {
    if (selectedSource && selectedSource.lat && selectedDestination && selectedDestination.lat) {
        const km = haversineKm(selectedSource.lat, selectedSource.lng,
                               selectedDestination.lat, selectedDestination.lng);
        document.getElementById('dist').value = km;
        document.getElementById('distAutoNote').textContent = '— auto-calculated';
        clearError('dist');
    }
}

// ── Warn if starting city equals destination
function checkSameSourceDest() {
    if (!selectedSource || !selectedDestination) return;
    if (selectedSource.name.toLowerCase() === selectedDestination.name.toLowerCase()) {
        showToast('⚠️', `Starting city and destination are both ${selectedSource.name}. Please choose different locations.`, 5000);
        const destErr = document.getElementById('destErr');
        if (destErr) destErr.textContent = 'Destination cannot be the same as your starting city.';
    }
}

// ── Source city: live input validation (characters only)
function onSrcInput() {
    const input  = document.getElementById('srcCity');
    const srcErr = document.getElementById('srcErr');
    if (input.value && !/^[a-zA-Z\s\-']+$/.test(input.value)) {
        srcErr.style.color   = '#ef4444';
        srcErr.textContent   = 'Please use letters only (no numbers or special characters).';
        input.classList.add('invalid');
        selectedSource = null;
        return;
    }
    srcErr.textContent = '';
    input.classList.remove('invalid');
    selectedSource = null; // will be confirmed on blur after geocoding
}

// ── Source city: geocode on blur (fast list first, then Nominatim for any city)
async function onSrcBlur() {
    const input  = document.getElementById('srcCity');
    const srcErr = document.getElementById('srcErr');
    const val    = input.value.trim();

    if (!val) { selectedSource = null; srcErr.textContent = ''; input.classList.remove('invalid'); return; }

    if (!/^[a-zA-Z\s\-']+$/.test(val)) {
        srcErr.style.color = '#ef4444';
        srcErr.textContent = 'Please use letters only.';
        input.classList.add('invalid');
        selectedSource = null;
        return;
    }

    if ((val.match(/[a-zA-Z]/g) || []).length < 2) {
        srcErr.style.color = '#ef4444';
        srcErr.textContent = 'Please enter a valid starting city.';
        input.classList.add('invalid');
        selectedSource = null;
        return;
    }

    // Determine Pakistan membership immediately from the curated list (synchronous, no race condition)
    const inPk = isPakistaniPlace(val);
    selectedSource = { name: val, lat: null, lng: null, inPakistan: inPk };
    input.classList.remove('invalid');

    // 1. Try fast lookup from known cities list
    const fast = findCity(val);
    if (fast) {
        selectedSource = { name: fast.name, lat: fast.lat, lng: fast.lng, inPakistan: true };
        input.value    = fast.name;
        srcErr.textContent = '';
        checkSameSourceDest();
        tryAutoCalcDist();
        return;
    }

    // 2. Geocode via Nominatim for coordinates only (inPakistan already determined above)
    srcErr.style.color = 'var(--t2)';
    srcErr.textContent = '⏳ Locating city…';

    try {
        const coords = await geocodeCity(val);
        if (coords) {
            selectedSource.lat = coords.lat;
            selectedSource.lng = coords.lng;
            srcErr.textContent = '';
            checkSameSourceDest();
            tryAutoCalcDist();
        } else {
            srcErr.style.color = 'var(--t2)';
            srcErr.textContent = `"${val}" not found — distance will need to be entered manually.`;
        }
    } catch(e) {
        srcErr.style.color = 'var(--t2)';
        srcErr.textContent = 'Could not locate city — enter distance manually.';
    }
}

// ── Destination: live character validation
function onDestInput() {
    const input   = document.getElementById('destSearchInput');
    const destErr = document.getElementById('destErr');
    if (input.value && !/^[a-zA-Z0-9\s\-']+$/.test(input.value)) {
        destErr.style.color  = '#ef4444';
        destErr.textContent  = 'Please use letters and numbers only.';
        input.classList.add('invalid');
        selectedDestination  = null;
        return;
    }
    destErr.textContent = '';
    input.classList.remove('invalid');
    selectedDestination = null;
}

// ── Destination: geocode on blur (Nominatim, same approach as source)
async function onDestBlur() {
    const input   = document.getElementById('destSearchInput');
    const destErr = document.getElementById('destErr');
    const val     = input.value.trim();

    if (!val) {
        selectedDestination = null;
        destErr.textContent = '';
        input.classList.remove('invalid');
        return;
    }

    if (!/^[a-zA-Z0-9\s\-']+$/.test(val)) {
        destErr.style.color = '#ef4444';
        destErr.textContent = 'Please use letters and numbers only.';
        input.classList.add('invalid');
        selectedDestination = null;
        return;
    }

    if ((val.match(/[a-zA-Z]/g) || []).length < 2) {
        destErr.style.color = '#ef4444';
        destErr.textContent = 'Please enter a valid destination.';
        input.classList.add('invalid');
        selectedDestination = null;
        return;
    }

    // Determine Pakistan membership immediately from the curated list (synchronous, no race condition)
    const destInPk = isPakistaniPlace(val);
    selectedDestination = { name: val, lat: null, lng: null, id: null, inPakistan: destInPk };
    input.classList.remove('invalid');

    // Fast lookup: if it's a known Pakistani city we're done
    const fastCity = findCity(val);
    if (fastCity) {
        selectedDestination.name       = fastCity.name;
        selectedDestination.lat        = fastCity.lat;
        selectedDestination.lng        = fastCity.lng;
        selectedDestination.inPakistan = true;
        input.value         = fastCity.name;
        destErr.textContent = '';
        checkSameSourceDest();
        tryAutoCalcDist();
        const hotelInput = document.getElementById('hotelSearchInput');
        if (hotelInput) hotelInput.placeholder = `Search hotels in ${fastCity.name}…`;
        return;
    }

    // Show locating indicator
    destErr.style.color = 'var(--t2)';
    destErr.textContent = '⏳ Locating destination…';

    try {
        const coords = await geocodeCity(val);
        if (coords) {
            selectedDestination.lat = coords.lat;
            selectedDestination.lng = coords.lng;
            // inPakistan already set from curated list; do not override with Nominatim
            destErr.textContent     = '';
            tryAutoCalcDist();
        } else {
            destErr.style.color = 'var(--t2)';
            destErr.textContent = `"${val}" not found — distance will need to be entered manually.`;
        }
    } catch(e) {
        destErr.style.color = 'var(--t2)';
        destErr.textContent = 'Could not locate destination — enter distance manually.';
    }

    checkSameSourceDest();

    // Update hotel search placeholder
    const hotelInput = document.getElementById('hotelSearchInput');
    if (hotelInput) hotelInput.placeholder = `Search hotels in ${val}…`;
}

// ── Meal preference preset → auto-fill price input
function onMealPrefChange() {
    const sel = document.getElementById('mealPref');
    const priceInput = document.getElementById('mealPrice');
    if (sel.value !== 'custom') {
        priceInput.value = sel.value;
    }
    document.getElementById('mealPriceErr').textContent = '';
    priceInput.classList.remove('invalid');
}

// ── When price is manually edited, switch dropdown to "Custom"
function onMealPriceInput() {
    const sel   = document.getElementById('mealPref');
    const inp   = document.getElementById('mealPrice');
    const errEl = document.getElementById('mealPriceErr');
    const val   = parseFloat(inp.value);

    if (!isNaN(val) && val > 1000000) {
        errEl.textContent = 'Maximum meal price is Rs. 50,000 per meal.';
        inp.classList.add('invalid');
        sel.value = 'custom';
        return;
    }

    const match = [...sel.options].find(o => o.value !== 'custom' && parseFloat(o.value) === val);
    sel.value = match ? match.value : 'custom';
    errEl.textContent = '';
    inp.classList.remove('invalid');
}

// ── Clear a field's error state
function clearError(field) {
    const err = document.getElementById(field + 'Err');
    if (err) err.textContent = '';
    const inp = document.getElementById(field);
    if (inp) inp.classList.remove('invalid');
    document.getElementById('errorBanner').style.display = 'none';
}

// ── Room type dropdown change
function onRoomTypeChange() {
    const sel = document.getElementById('roomTypeSelect');
    const opt = sel.options[sel.selectedIndex];
    if (sel.value && sel.value !== '' && opt.dataset.price) {
        selectedRoomType = {
            roomTypeId:    parseInt(sel.value),
            typeName:      opt.dataset.name,
            pricePerNight: parseFloat(opt.dataset.price),
            capacity:      parseInt(opt.dataset.cap || '2')
        };
    } else {
        selectedRoomType = null;
    }
    clearError('roomType');
}

// ── Clear hotel selection
function clearHotel() {
    selectedHotel    = null;
    selectedRoomType = null;
    document.getElementById('hotelSearchInput').value          = '';
    document.getElementById('hotelSearchClear').style.display  = 'none';
    document.getElementById('hotelBadge').style.display        = 'none';
    document.getElementById('hotelSearchWrap').style.display   = 'block';
    document.getElementById('roomTypeGroup').style.display     = 'none';
    document.getElementById('roomTypeSelect').innerHTML        = '<option value="">— Select room type —</option>';
    clearError('hotel');
    clearError('roomType');
}

// ── Load room types filtered by traveler count
async function loadRoomTypes(hotelId) {
    const tok       = sessionStorage.getItem('tripify_token');
    const travelers = parseInt(document.getElementById('travelers').value) || 1;
    const group     = document.getElementById('roomTypeGroup');
    const sel       = document.getElementById('roomTypeSelect');

    sel.innerHTML        = '<option value="">Loading room types…</option>';
    sel.disabled         = true;
    group.style.display  = 'block';

    try {
        const res = await fetch(ENDPOINTS.HOTELS.BY_ID(hotelId), {
            headers: { 'Authorization': 'Bearer ' + tok }
        });
        if (!res.ok) throw new Error('fetch failed');
        const data  = await res.json();
        const rooms = data.roomTypes || [];
        sel.disabled = false;

        if (rooms.length === 0) {
            sel.innerHTML = '<option value="base">No room types — hotel base rate will be used</option>';
            sel.value     = 'base';
            selectedRoomType = null;
            return;
        }

        // Keep only room types where enough rooms are available for the group
        const suitable = rooms.filter(r => {
            const needed = Math.ceil(travelers / (r.capacity || 2));
            return (r.availableRooms || 0) >= needed;
        });

        if (suitable.length === 0) {
            sel.innerHTML = `<option value="">No room types can fit ${travelers} traveler${travelers > 1 ? 's' : ''}</option>`;
            document.getElementById('hotelErr').textContent =
                `No room type at this hotel can accommodate ${travelers} traveler${travelers > 1 ? 's' : ''}. Choose a different hotel or reduce your group size.`;
            selectedRoomType = null;
            return;
        }

        sel.innerHTML = '<option value="">— Select room type —</option>';
        suitable.forEach(r => {
            const needed       = Math.ceil(travelers / (r.capacity || 2));
            const opt          = document.createElement('option');
            opt.value          = r.roomTypeId;
            opt.dataset.price  = r.pricePerNight;
            opt.dataset.name   = r.typeName;
            opt.dataset.cap    = r.capacity || 2;
            opt.textContent    = `${r.typeName} — Rs. ${Number(r.pricePerNight).toLocaleString('en-PK')}/night` +
                                 `  (${needed} room${needed > 1 ? 's' : ''} needed for ${travelers} guests)`;
            sel.appendChild(opt);
        });
        selectedRoomType = null;

    } catch(e) {
        sel.disabled  = false;
        sel.innerHTML = '<option value="">Could not load room types</option>';
        selectedRoomType = null;
    }
}

// ── Select a hotel from the dropdown
function selectHotel(hotel) {
    selectedHotel = {
        id:              hotel.id,
        name:            hotel.name,
        pricePerNight:   parseFloat(hotel.pricePerNight),
        destinationName: hotel.destinationName,
        stars:           hotel.stars
    };
    selectedRoomType = null;
    document.getElementById('hotelSearchWrap').style.display = 'none';
    const badge = document.getElementById('hotelBadge');
    badge.style.display = 'flex';
    document.getElementById('hotelBadgeName').textContent = hotel.name;
    const stars = hotel.stars ? '⭐'.repeat(hotel.stars) + ' ' : '';
    document.getElementById('hotelBadgeSub').textContent =
        stars + hotel.destinationName + ' — Base Rs. ' + Number(hotel.pricePerNight).toLocaleString('en-PK') + '/night';
    clearError('hotel');
    loadRoomTypes(hotel.id);
}

document.getElementById('hotelBadgeClear').addEventListener('click', clearHotel);

// ── Validation (returns true if all inputs are valid)
function validate() {
    let ok = true;
    const dist      = parseInt(document.getElementById('dist').value);
    const travelers = parseInt(document.getElementById('travelers').value);
    const nights    = parseInt(document.getElementById('nights').value);

    // Starting city — any non-empty letters-only string is acceptable
    const srcVal    = document.getElementById('srcCity').value.trim();
    const srcErrEl  = document.getElementById('srcErr');
    if (!srcVal) {
        srcErrEl.style.color = '#ef4444';
        srcErrEl.textContent = 'Please enter your starting city.';
        document.getElementById('srcCity').classList.add('invalid');
        ok = false;
    } else if (!/^[a-zA-Z\s\-']+$/.test(srcVal)) {
        srcErrEl.style.color = '#ef4444';
        srcErrEl.textContent = 'Please use letters only (no numbers or special characters).';
        document.getElementById('srcCity').classList.add('invalid');
        ok = false;
    }

    // Petrol price
    const petrolVal = parseFloat(document.getElementById('petrolPrice').value);
    if (isNaN(petrolVal) || petrolVal < 1) {
        document.getElementById('petrolErr').textContent = 'Please enter a valid petrol price (minimum Rs. 1).';
        document.getElementById('petrolPrice').classList.add('invalid');
        ok = false;
    }

    // Meal price
    const mealPriceVal = parseFloat(document.getElementById('mealPrice').value);
    if (isNaN(mealPriceVal) || mealPriceVal < 1 || mealPriceVal > 1000000) {
        document.getElementById('mealPriceErr').textContent =
            mealPriceVal > 1000000
                ? 'Maximum meal price is Rs. 50,000 per meal.'
                : 'Please enter a valid meal price (minimum Rs. 1).';
        document.getElementById('mealPrice').classList.add('invalid');
        ok = false;
    }

    // Destination — any non-empty text is acceptable
    const destVal = document.getElementById('destSearchInput').value.trim();
    const destErr = document.getElementById('destErr');
    if (!destVal) {
        if (destErr) { destErr.style.color = '#ef4444'; destErr.textContent = 'Please enter a destination.'; }
        ok = false;
    } else if (!/^[a-zA-Z0-9\s\-']+$/.test(destVal)) {
        if (destErr) { destErr.style.color = '#ef4444'; destErr.textContent = 'Please use letters and numbers only.'; }
        ok = false;
    } else if (selectedSource && selectedDestination &&
               selectedSource.name.toLowerCase() === (selectedDestination.name || destVal).toLowerCase()) {
        if (destErr) { destErr.style.color = '#ef4444'; destErr.textContent = 'Destination cannot be the same as your starting city.'; }
        ok = false;
    }

    // Distance
    if (!document.getElementById('dist').value.trim() || isNaN(dist) || dist < 1 || dist > 40075) {
        document.getElementById('distErr').textContent =
            dist > 40075 ? 'Maximum distance is 40,075 km.' : 'Please enter a valid distance (1–40,075 km).';
        document.getElementById('dist').classList.add('invalid');
        ok = false;
    }

    // Travelers
    if (!document.getElementById('travelers').value.trim() || isNaN(travelers) || travelers < 1 || travelers > 100) {
        document.getElementById('travelersErr').textContent =
            travelers > 100 ? 'Maximum 100 travelers.' : 'Please enter a valid number of travelers (1–100).';
        document.getElementById('travelers').classList.add('invalid');
        ok = false;
    }

    // Nights
    if (!document.getElementById('nights').value.trim() || isNaN(nights) || nights < 1 || nights > 365) {
        document.getElementById('nightsErr').textContent =
            nights > 365 ? 'Maximum 365 nights.' : 'Please enter valid nights of stay (1–365).';
        document.getElementById('nights').classList.add('invalid');
        ok = false;
    }

    // Hotel typed but not actually selected from dropdown
    const hotelInputVal = document.getElementById('hotelSearchInput').value.trim();
    if (hotelInputVal && !selectedHotel) {
        document.getElementById('hotelErr').textContent =
            'This hotel was not found. Please select from the suggestions, or clear the hotel field.';
        ok = false;
    }

    // Room type required only when hotel is selected and real room type options exist
    if (selectedHotel) {
        const sel     = document.getElementById('roomTypeSelect');
        const hasOpts = sel.options.length > 1 && sel.options[1] && sel.options[1].value !== 'base';
        if (hasOpts && !selectedRoomType) {
            document.getElementById('roomTypeErr').textContent = 'Please select a room type for this hotel.';
            ok = false;
        }
    }

    return ok;
}

// ── Apply a quick preset
async function applyPreset(src, dest, distFallback, travelers, nights) {
    // Source
    const srcInput = document.getElementById('srcCity');
    const city     = findCity(src);
    if (city) {
        srcInput.value = city.name;
        selectedSource = { name: city.name, lat: city.lat, lng: city.lng };
        clearError('src');
    }

    // Destination
    const destInput = document.getElementById('destSearchInput');
    destInput.value = dest;
    const destErr   = document.getElementById('destErr');
    if (destErr) destErr.textContent = '';
    selectedDestination = { name: dest, lat: null, lng: null, id: null };

    document.getElementById('travelers').value = travelers;
    document.getElementById('nights').value    = nights;
    ['travelers', 'nights'].forEach(id => clearError(id));

    // Geocode destination for auto-distance
    try {
        const coords = await geocodeCity(dest);
        if (coords) {
            selectedDestination.lat = coords.lat;
            selectedDestination.lng = coords.lng;
        }
    } catch(e) { /* non-critical */ }

    // Auto-calc or fall back to preset distance
    tryAutoCalcDist();
    if (!document.getElementById('dist').value) {
        document.getElementById('dist').value = distFallback;
        clearError('dist');
    }

    calculate();
}

function fmtPKR(n) { return 'Rs. ' + n.toLocaleString('en-PK'); }

// ── Main calculation
function calculate() {
    document.getElementById('errorBanner').style.display = 'none';
    if (!validate()) return;

    try {
        const dist      = parseInt(document.getElementById('dist').value);
        const travelers = parseInt(document.getElementById('travelers').value);
        const nights    = parseInt(document.getElementById('nights').value);
        const transport = document.getElementById('transport').value;
        const mealRate    = Math.max(1, parseFloat(document.getElementById('mealPrice').value) || 800);
        const petrolPrice = Math.max(1, parseFloat(document.getElementById('petrolPrice').value) || 295);

        const srcLabel  = (selectedSource      && selectedSource.name)      ? selectedSource.name      : document.getElementById('srcCity').value.trim()        || 'Origin';
        const destLabel = (selectedDestination && selectedDestination.name) ? selectedDestination.name : document.getElementById('destSearchInput').value.trim() || 'Destination';

        let fuelCost = 0;
        if      (transport === 'car') fuelCost = Math.round((dist * 2 / 12) * petrolPrice);
        else if (transport === 'suv') fuelCost = Math.round((dist * 2 / 8)  * petrolPrice);
        else if (transport === 'bus') fuelCost = Math.round(dist * 2 * 7 * travelers);

        // Hotel is optional — cost = 0 if not selected
        let hotelCost = 0;
        let hotelSub  = 'Not included in estimate';
        if (selectedHotel) {
            if (selectedRoomType) {
                const cap   = selectedRoomType.capacity || 2;
                const rooms = Math.ceil(travelers / cap);
                hotelCost   = Math.round(selectedRoomType.pricePerNight * nights * rooms);
                hotelSub    = `${nights} nights × ${rooms} ${selectedRoomType.typeName}${rooms > 1 ? ' rooms' : ' room'} @ ${selectedHotel.name}`;
            } else {
                const rooms = Math.ceil(travelers / 2);
                hotelCost   = Math.round(selectedHotel.pricePerNight * nights * rooms);
                hotelSub    = `${nights} nights × ${rooms} rooms @ ${selectedHotel.name} (base rate)`;
            }
        }

        const foodCost = mealRate * 3 * travelers * (nights + 1);
        const misc     = Math.round((fuelCost + hotelCost + foodCost) * 0.10);
        const total    = fuelCost + hotelCost + foodCost + misc;

        if (!isFinite(total) || total <= 0) throw new Error('Invalid total');

        const items = [
            { icon: '⛽', label: 'Fuel / Transport',     sub: `${srcLabel} → ${destLabel} (${dist * 2} km)`,              amt: fuelCost,  color: '#f5a623', pct: Math.round(fuelCost  / total * 100) },
            { icon: '🏨', label: 'Accommodation',        sub: hotelSub,                                                    amt: hotelCost, color: '#3b82f6', pct: Math.round(hotelCost / total * 100) },
            { icon: '🍽️', label: 'Food & Meals',         sub: `${travelers} traveler${travelers > 1 ? 's' : ''} × 3 meals × ${nights + 1} days @ ${fmtPKR(mealRate)}/meal`, amt: foodCost, color: '#22c55e', pct: Math.round(foodCost / total * 100) },
            { icon: '🎒', label: 'Miscellaneous (10%)',  sub: 'Tips, entry fees, emergencies',                             amt: misc,      color: '#a855f7', pct: Math.round(misc      / total * 100) },
        ];

        document.getElementById('totalAmt').textContent = fmtPKR(total);
        document.getElementById('totalPer').textContent = `≈ ${fmtPKR(Math.round(total / travelers))} per person`;
        document.getElementById('breakdown').innerHTML  = items.map(it => `
        <div class="breakdown-item">
            <div class="bi-icon" style="background:${it.color}22">${it.icon}</div>
            <div style="flex:1">
                <div class="bi-label">${it.label}</div>
                <div class="bi-sub">${it.sub}</div>
                <div class="cost-bar" style="background:${it.color};width:${it.pct}%;"></div>
            </div>
            <div class="bi-amount">${fmtPKR(it.amt)}</div>
        </div>`).join('');

        document.getElementById('resultPlaceholder').style.display = 'none';
        document.getElementById('resultContent').style.display     = 'block';
        document.getElementById('resultPanel').classList.add('has-result');
        showToast('💰', 'Cost calculated!');

    } catch(e) {
        document.getElementById('errorBanner').style.display       = 'flex';
        document.getElementById('resultContent').style.display     = 'none';
        document.getElementById('resultPlaceholder').style.display = 'block';
        document.getElementById('resultPanel').classList.remove('has-result');
    }
}

// ── User profile
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials'), ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const img = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() +
                    '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sa.innerHTML = img; ta.innerHTML = img;
    } else {
        sa.textContent = ini;
        ta.textContent = ini;
    }
}
applyUserProfile(user);

// ── Sidebar toggle
const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.toggle('open'); overlay.classList.toggle('show');
});
overlay.addEventListener('click', () => {
    sidebar.classList.remove('open'); overlay.classList.remove('show');
});

// ── Toast helper
function showToast(icon, msg, dur = 2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── Source city text input listeners
(function () {
    const srcInput = document.getElementById('srcCity');
    srcInput.addEventListener('input',   onSrcInput);
    srcInput.addEventListener('blur',    onSrcBlur);
    srcInput.addEventListener('keydown', e => { if (e.key === 'Enter') srcInput.blur(); });
})();

// ── Destination text input listeners
(function () {
    const input = document.getElementById('destSearchInput');
    input.addEventListener('input',   onDestInput);
    input.addEventListener('blur',    onDestBlur);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
})();

// ── Hotel search widget
(function () {
    const tok      = sessionStorage.getItem('tripify_token');
    const input    = document.getElementById('hotelSearchInput');
    const dropdown = document.getElementById('hotelSearchDropdown');
    const clearBtn = document.getElementById('hotelSearchClear');
    let timer;

    async function search(q) {
        // Block hotel search only when BOTH source AND destination are confirmed outside Pakistan.
        // inPakistan is set synchronously from the curated city list the moment the user tabs out
        // of each field — no async race condition possible.
        const srcOutside  = selectedSource      && selectedSource.inPakistan      === false;
        const destOutside = selectedDestination && selectedDestination.inPakistan === false;
        if (srcOutside && destOutside) {
            dropdown.innerHTML = '<div class="dest-no-result">🌍 Hotel booking is only available for trips involving Pakistan. Neither your source nor destination is within Pakistan.</div>';
            dropdown.style.display = 'block';
            return;
        }

        const hasDestId = selectedDestination && selectedDestination.id;
        if (!hasDestId && q.trim().length < 2) {
            dropdown.innerHTML = '<div class="dest-no-result">✏️ Type at least 2 letters to search hotels</div>';
            dropdown.style.display = 'block';
            return;
        }
        try {
            let url = ENDPOINTS.HOTELS.SEARCH + '?q=' + encodeURIComponent(q.trim());
            if (hasDestId) url += '&destinationId=' + selectedDestination.id;
            const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + tok } });
            if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
            const data = await res.json();
            const available = Array.isArray(data) ? data.filter(h => (h.availableRooms || 0) > 0) : [];
            showDropdown(available);
        } catch(e) { showDropdown([]); }
    }

    function showDropdown(items) {
        if (!items.length) {
            const destName = selectedDestination ? selectedDestination.name : null;
            dropdown.innerHTML = `<div class="dest-no-result">🏨 No available hotels found${destName ? ` at <strong>${destName}</strong>` : ''}</div>`;
            dropdown.style.display = 'block';
            return;
        }
        dropdown.innerHTML = items.map(h => {
            const stars = h.stars ? '⭐'.repeat(h.stars) : '';
            const price = h.pricePerNight
                ? 'Rs. ' + Number(h.pricePerNight).toLocaleString('en-PK') + '/night'
                : '';
            return `<div class="dest-search-item hotel-search-item"
                         data-id="${h.id}" data-name="${h.name}"
                         data-price="${h.pricePerNight || 0}" data-dest="${h.destinationName || ''}"
                         data-stars="${h.stars || 0}" data-avail="${h.availableRooms || 0}">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span style="font-weight:600">${h.name}</span>
                            <span class="hsrc-price">${price}</span>
                        </div>
                        <div style="margin-top:2px">
                            <span class="hsrc-stars">${stars}</span>
                            <span class="dsrc-city">📍 ${h.destinationName || ''}</span>
                        </div>
                    </div>`;
        }).join('');
        dropdown.style.display = 'block';
        dropdown.querySelectorAll('.dest-search-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                hideDropdown();
                selectHotel({
                    id:              parseInt(el.dataset.id),
                    name:            el.dataset.name,
                    pricePerNight:   parseFloat(el.dataset.price),
                    destinationName: el.dataset.dest,
                    stars:           parseInt(el.dataset.stars) || 0,
                    availableRooms:  parseInt(el.dataset.avail) || 0
                });
            });
        });
    }

    function hideDropdown() { dropdown.style.display = 'none'; }

    input.addEventListener('focus', () => {
        if (!selectedHotel) search(input.value);
    });
    input.addEventListener('input', e => {
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        if (selectedHotel) { clearHotel(); input.value = e.target.value; }
        clearTimeout(timer);
        timer = setTimeout(() => search(e.target.value), 300);
    });
    clearBtn.addEventListener('click', () => { clearHotel(); });
    document.addEventListener('click', e => {
        if (!e.target.closest('#hotelSearchWrap') && !e.target.closest('#hotelBadge')) hideDropdown();
    });
})();

// Pre-calculate if dest param is in URL
const qp = new URLSearchParams(location.search);
if (qp.get('dest')) calculate();
