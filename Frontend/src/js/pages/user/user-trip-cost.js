// ── Selected hotel / room state ───────────────────────────
let selectedHotel       = null;  // { id, name, pricePerNight, destinationName, stars }
let selectedRoomType    = null;  // { roomTypeId, typeName, pricePerNight, capacity }
let selectedDestination = null;  // { id, name, lat, lng }
let selectedSource      = null;  // { name, lat, lng }

// ── Major Pakistani cities with coordinates ───────────────
const PAKISTAN_CITIES = [
    { name: 'Islamabad',   lat: 33.6844, lng: 73.0479 },
    { name: 'Rawalpindi',  lat: 33.5651, lng: 73.0169 },
    { name: 'Lahore',      lat: 31.5204, lng: 74.3587 },
    { name: 'Karachi',     lat: 24.8607, lng: 67.0011 },
    { name: 'Peshawar',    lat: 34.0150, lng: 71.5249 },
    { name: 'Quetta',      lat: 30.1798, lng: 66.9750 },
    { name: 'Multan',      lat: 30.1575, lng: 71.5249 },
    { name: 'Faisalabad',  lat: 31.4504, lng: 73.1350 },
    { name: 'Hyderabad',   lat: 25.3960, lng: 68.3578 },
    { name: 'Sialkot',     lat: 32.4927, lng: 74.5317 },
    { name: 'Gujranwala',  lat: 32.1877, lng: 74.1945 },
    { name: 'Abbottabad',  lat: 34.1466, lng: 73.2117 },
    { name: 'Sukkur',      lat: 27.7052, lng: 68.8574 },
    { name: 'Bahawalpur',  lat: 29.3956, lng: 71.6836 },
    { name: 'Gilgit',      lat: 35.9208, lng: 74.3082 },
];

// Populate source city dropdown
(function(){
    const sel = document.getElementById('srcCity');
    PAKISTAN_CITIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.dataset.lat = c.lat;
        opt.dataset.lng = c.lng;
        opt.textContent = c.name;
        sel.appendChild(opt);
    });
})();

// ── Haversine distance (km) × 1.3 road factor ────────────
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3);
}

// ── Auto-fill distance when both source + dest have coords ─
function tryAutoCalcDist() {
    if (selectedSource && selectedSource.lat &&
        selectedDestination && selectedDestination.lat) {
        const km = haversineKm(selectedSource.lat, selectedSource.lng,
                               selectedDestination.lat, selectedDestination.lng);
        document.getElementById('dist').value = km;
        document.getElementById('distAutoNote').textContent = '— auto-calculated';
        clearError('dist');
    }
}

// ── Source city change handler ────────────────────────────
function onSrcChange() {
    const sel = document.getElementById('srcCity');
    const opt = sel.options[sel.selectedIndex];
    if (sel.value && opt.dataset.lat) {
        selectedSource = { name: sel.value, lat: parseFloat(opt.dataset.lat), lng: parseFloat(opt.dataset.lng) };
    } else {
        selectedSource = null;
    }
    clearError('src');
    tryAutoCalcDist();
}

function onDestChange(dest, destId, lat, lng){
    selectedDestination = (dest && destId) ? { id: destId, name: dest, lat: lat||null, lng: lng||null } : null;
    tryAutoCalcDist();
    // If a hotel was already selected but is not at this destination, clear it
    if(selectedHotel && selectedDestination && selectedHotel.destinationName !== selectedDestination.name){
        clearHotel();
    }
    // Update hotel search placeholder to reflect destination
    const hotelInput = document.getElementById('hotelSearchInput');
    if(hotelInput){
        hotelInput.placeholder = dest ? `Search hotels in ${dest}…` : 'Search hotel by name…';
    }
}

function clearError(field){
    const err=document.getElementById(field+'Err');
    if(err) err.textContent='';
    const inp=document.getElementById(field);
    if(inp) inp.classList.remove('invalid');
    document.getElementById('errorBanner').style.display='none';
}

// ── Room type change handler ──────────────────────────────
function onRoomTypeChange(){
    const sel=document.getElementById('roomTypeSelect');
    const opt=sel.options[sel.selectedIndex];
    if(sel.value && opt.dataset.price){
        selectedRoomType={
            roomTypeId: parseInt(sel.value),
            typeName:   opt.dataset.name,
            pricePerNight: parseFloat(opt.dataset.price),
            capacity:   parseInt(opt.dataset.cap||'2')
        };
    } else {
        selectedRoomType=null;
    }
    clearError('roomType');
}

// ── Clear selected hotel ──────────────────────────────────
function clearHotel(){
    selectedHotel=null; selectedRoomType=null;
    document.getElementById('hotelSearchInput').value='';
    document.getElementById('hotelSearchClear').style.display='none';
    document.getElementById('hotelBadge').style.display='none';
    document.getElementById('hotelSearchWrap').style.display='block';
    document.getElementById('roomTypeGroup').style.display='none';
    document.getElementById('roomTypeSelect').innerHTML='<option value="">— Select room type —</option>';
    clearError('hotel'); clearError('roomType');
}

// ── Load room types for selected hotel ───────────────────
async function loadRoomTypes(hotelId){
    const tok=sessionStorage.getItem('tripify_token');
    const group=document.getElementById('roomTypeGroup');
    const sel=document.getElementById('roomTypeSelect');
    // Show section immediately with a loading state
    sel.innerHTML='<option value="">Loading room types…</option>';
    sel.disabled=true;
    group.style.display='block';
    try{
        const res=await fetch(ENDPOINTS.HOTELS.BY_ID(hotelId),{headers:{'Authorization':'Bearer '+tok}});
        if(!res.ok) throw new Error('fetch failed');
        const data=await res.json();
        const rooms=data.roomTypes||[];
        sel.disabled=false;
        if(rooms.length===0){
            // No room types configured — show info and auto-use hotel base rate
            sel.innerHTML='<option value="base">No room types — hotel base rate will be used</option>';
            sel.value='base';
            selectedRoomType=null; // will fall back to hotel base price in calculate()
        } else {
            sel.innerHTML='<option value="">— Select room type —</option>';
            rooms.forEach(r=>{
                const opt=document.createElement('option');
                opt.value=r.roomTypeId;
                opt.dataset.price=r.pricePerNight;
                opt.dataset.name=r.typeName;
                opt.dataset.cap=r.capacity||2;
                opt.textContent=r.typeName+' — Rs. '+Number(r.pricePerNight).toLocaleString('en-PK')+'/night  (max '+r.capacity+' guests)';
                sel.appendChild(opt);
            });
            selectedRoomType=null;
        }
    } catch(e){
        sel.disabled=false;
        sel.innerHTML='<option value="">Could not load room types</option>';
        selectedRoomType=null;
    }
}

// ── Select a hotel from search results ───────────────────
function selectHotel(hotel){
    selectedHotel={
        id: hotel.id,
        name: hotel.name,
        pricePerNight: parseFloat(hotel.pricePerNight),
        destinationName: hotel.destinationName,
        stars: hotel.stars
    };
    selectedRoomType=null;
    // Hide search widget, show badge
    document.getElementById('hotelSearchWrap').style.display='none';
    const badge=document.getElementById('hotelBadge');
    badge.style.display='flex';
    document.getElementById('hotelBadgeName').textContent=hotel.name;
    const stars=hotel.stars?'⭐'.repeat(hotel.stars)+' ':'';
    document.getElementById('hotelBadgeSub').textContent=stars+hotel.destinationName+' — Base Rs. '+Number(hotel.pricePerNight).toLocaleString('en-PK')+'/night';
    clearError('hotel');
    // Load room types
    loadRoomTypes(hotel.id);
}

document.getElementById('hotelBadgeClear').addEventListener('click', clearHotel);

function validate(){
    let ok=true;
    const dist     = parseInt(document.getElementById('dist').value);
    const travelers= parseInt(document.getElementById('travelers').value);
    const nights   = parseInt(document.getElementById('nights').value);

    if(!document.getElementById('srcCity').value){
        document.getElementById('srcErr').textContent='Please select your starting city.';
        document.getElementById('srcCity').classList.add('invalid');
        ok=false;
    }
    if(!document.getElementById('dist').value.trim() || isNaN(dist) || dist < 1 || dist > 5000){
        document.getElementById('distErr').textContent = dist > 5000 ? 'Maximum distance is 5,000 km.' : 'Please enter a valid distance (1–5,000 km).';
        document.getElementById('dist').classList.add('invalid');
        ok=false;
    }
    if(!document.getElementById('travelers').value.trim() || isNaN(travelers) || travelers < 1 || travelers > 100){
        document.getElementById('travelersErr').textContent = travelers > 100 ? 'Maximum 100 travelers.' : 'Please enter a valid number of travelers (1–100).';
        document.getElementById('travelers').classList.add('invalid');
        ok=false;
    }
    if(!document.getElementById('nights').value.trim() || isNaN(nights) || nights < 1 || nights > 365){
        document.getElementById('nightsErr').textContent = nights > 365 ? 'Maximum 365 nights.' : 'Please enter valid nights of stay (1–365).';
        document.getElementById('nights').classList.add('invalid');
        ok=false;
    }
    // Hotel typed but not selected from dropdown
    const hotelInput = document.getElementById('hotelSearchInput').value.trim();
    if(hotelInput && !selectedHotel){
        document.getElementById('hotelErr').textContent = 'This hotel was not found in our listings for the selected destination. Select from the suggestions.';
        ok=false;
    }
    // Room types exist but none chosen
    if(selectedHotel){
        const sel=document.getElementById('roomTypeSelect');
        const hasOptions = sel.options.length > 1 && sel.options[1] && sel.options[1].value !== 'base';
        if(hasOptions && !selectedRoomType){
            document.getElementById('roomTypeErr').textContent='Please select a room type for this hotel.';
            ok=false;
        }
    }
    return ok;
}

async function applyPreset(src, dest, distFallback, travelers, nights){
    // Set source dropdown
    const srcSel = document.getElementById('srcCity');
    if(srcSel){ srcSel.value = src; onSrcChange(); }

    // Set destination input
    const destIn = document.getElementById('destSearchInput');
    if(destIn){ destIn.value = dest; document.getElementById('destSearchClear').style.display='inline'; }

    document.getElementById('travelers').value = travelers;
    document.getElementById('nights').value    = nights;
    ['travelers','nights'].forEach(id=>{ clearError(id); });

    // Look up destination to get id + lat/lng
    try {
        const tok = sessionStorage.getItem('tripify_token');
        const res = await fetch(ENDPOINTS.DESTINATIONS.SEARCH + '?q=' + encodeURIComponent(dest), {
            headers: { 'Authorization': 'Bearer ' + tok }
        });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const match = data.find(d => d.name === dest) || data[0];
                onDestChange(match.name, match.id, match.lat, match.lng);
            }
        }
    } catch(e) { /* non-critical */ }

    // If auto-calc didn't produce a distance, use fallback
    if (!document.getElementById('dist').value) {
        document.getElementById('dist').value = distFallback;
        clearError('dist');
    }

    calculate();
}

function fmtPKR(n){ return 'Rs. '+n.toLocaleString('en-PK'); }

function calculate(){
    document.getElementById('errorBanner').style.display='none';
    if(!validate()) return;

    try {
        const dist      = parseInt(document.getElementById('dist').value);
        const travelers = parseInt(document.getElementById('travelers').value);
        const nights    = parseInt(document.getElementById('nights').value);
        const transport = document.getElementById('transport').value;
        const mealPref  = document.getElementById('mealPref').value;

        const mealRate    = {local:400, mid:800, restaurant:1500}[mealPref];
        const petrolPrice = Math.max(100, parseInt(document.getElementById('petrolPrice').value) || 295);

        // Source / destination labels for display
        const srcLabel  = document.getElementById('srcCity').value || 'Origin';
        const destLabel = document.getElementById('destSearchInput').value.trim() || 'Destination';

        let fuelCost = 0;
        if(transport==='car')       fuelCost = Math.round((dist*2/12)*petrolPrice);
        else if(transport==='suv')  fuelCost = Math.round((dist*2/8)*petrolPrice);
        else if(transport==='bus')  fuelCost = Math.round(dist*2*7*travelers);
        else if(transport==='flight') fuelCost = Math.round(travelers*18000);

        // ── Accommodation: hotel must be selected from listings ──
        if(!selectedHotel){
            document.getElementById('hotelErr').textContent = 'Please select a hotel from the listings to calculate accommodation cost.';
            return;
        }
        let hotelCost, hotelSub;
        if(selectedRoomType){
            const cap   = selectedRoomType.capacity || 2;
            const rooms = Math.ceil(travelers / cap);
            hotelCost   = Math.round(selectedRoomType.pricePerNight * nights * rooms);
            hotelSub    = `${nights} nights × ${rooms} ${selectedRoomType.typeName}${rooms>1?' rooms':' room'} @ ${selectedHotel.name}`;
        } else {
            const rooms = Math.ceil(travelers / 2);
            hotelCost   = Math.round(selectedHotel.pricePerNight * nights * rooms);
            hotelSub    = `${nights} nights × ${rooms} rooms @ ${selectedHotel.name} (base rate)`;
        }

        const foodCost = mealRate * 3 * travelers * (nights+1);
        const misc     = Math.round((fuelCost+hotelCost+foodCost)*0.10);
        const total    = fuelCost + hotelCost + foodCost + misc;

        if(total <= 0) throw new Error('Invalid total');

        const items=[
            {icon:'⛽',label:'Fuel / Transport',sub:`${srcLabel} → ${destLabel} (${dist*2} km)`,amt:fuelCost,color:'#f5a623',pct:Math.round(fuelCost/total*100)},
            {icon:'🏨',label:'Accommodation',sub:hotelSub,amt:hotelCost,color:'#3b82f6',pct:Math.round(hotelCost/total*100)},
            {icon:'🍽️',label:'Food & Meals',sub:`${travelers} traveler${travelers>1?'s':''} × ${nights+1} days`,amt:foodCost,color:'#22c55e',pct:Math.round(foodCost/total*100)},
            {icon:'🎒',label:'Miscellaneous (10%)',sub:'Tips, entry fees, emergencies',amt:misc,color:'#a855f7',pct:Math.round(misc/total*100)},
        ];

        document.getElementById('totalAmt').textContent=fmtPKR(total);
        document.getElementById('totalPer').textContent=`≈ ${fmtPKR(Math.round(total/travelers))} per person`;
        document.getElementById('breakdown').innerHTML=items.map(it=>`
        <div class="breakdown-item">
            <div class="bi-icon" style="background:${it.color}22">${it.icon}</div>
            <div style="flex:1">
                <div class="bi-label">${it.label}</div>
                <div class="bi-sub">${it.sub}</div>
                <div class="cost-bar" style="background:${it.color};width:${it.pct}%;"></div>
            </div>
            <div class="bi-amount">${fmtPKR(it.amt)}</div>
        </div>`).join('');

        document.getElementById('resultPlaceholder').style.display='none';
        document.getElementById('resultContent').style.display='block';
        document.getElementById('resultPanel').classList.add('has-result');
        showToast('💰','Cost calculated!');
    } catch(e) {
        document.getElementById('errorBanner').style.display='flex';
        document.getElementById('resultContent').style.display='none';
        document.getElementById('resultPlaceholder').style.display='block';
        document.getElementById('resultPanel').classList.remove('has-result');
    }
}

// User
const tripToken=sessionStorage.getItem('tripify_token');
if(!tripToken){window.location.href='../auth/login.html';}
const user=JSON.parse(sessionStorage.getItem('tripify_user')||'{}');
function applyUserProfile(u){
    const ini=(u.fullName||'T').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('sidebarName').textContent=u.fullName||'Tourist';
    const sa=document.getElementById('sidebarInitials'),ta=document.getElementById('topbarInitials');
    if(u.profilePicture&&u.profilePicture!==''){
        const img='<img src="http://localhost:8080'+u.profilePicture+'?t='+Date.now()+'" alt="Avatar" onerror="this.parentElement.textContent=\''+ini+'\'">';
        sa.innerHTML=img; ta.innerHTML=img;
    } else { sa.textContent=ini; ta.textContent=ini; }
}
applyUserProfile(user);
const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click',()=>{sidebar.classList.toggle('open');overlay.classList.toggle('show');});
overlay.addEventListener('click',()=>{sidebar.classList.remove('open');overlay.classList.remove('show');});
function showToast(icon,msg,dur=2800){const c=document.getElementById('toastContainer');const t=document.createElement('div');t.className='toast';t.innerHTML=`<span class="toast-icon">${icon}</span><span>${msg}</span>`;c.appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},dur);}

// Pre-calculate if dest param
const qp=new URLSearchParams(location.search);
if(qp.get('dest')) calculate();

// ── Destination search widget ─────────────────────────────
(function(){
    const tok = sessionStorage.getItem('tripify_token');
    const input = document.getElementById('destSearchInput');
    const dropdown = document.getElementById('destSearchDropdown');
    const clearBtn = document.getElementById('destSearchClear');
    let timer;
    async function search(q) {
        try {
            const res = await fetch(ENDPOINTS.DESTINATIONS.SEARCH + '?q=' + encodeURIComponent(q.trim()), {
                headers: { 'Authorization': 'Bearer ' + tok }
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
            `<div class="dest-search-item" data-value="${d.name}" data-id="${d.id}" data-lat="${d.lat||''}" data-lng="${d.lng||''}">${d.name}${d.city ? ` <span class="dsrc-city">— ${d.city}</span>` : ''}</div>`
        ).join('');
        dropdown.style.display = 'block';
        dropdown.querySelectorAll('.dest-search-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                input.value = el.dataset.value;
                clearBtn.style.display = 'inline';
                hideDropdown();
                onDestChange(el.dataset.value, parseInt(el.dataset.id),
                             parseFloat(el.dataset.lat)||null, parseFloat(el.dataset.lng)||null);
            });
        });
    }
    function hideDropdown() { dropdown.style.display = 'none'; }
    input.addEventListener('input', e => {
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        // If user edits the field, clear tracked destination
        selectedDestination = null;
        onDestChange(null, null);
        clearTimeout(timer);
        if (!e.target.value.trim()) { hideDropdown(); return; }
        timer = setTimeout(() => search(e.target.value), 300);
    });
    clearBtn.addEventListener('click', () => {
        input.value = ''; clearBtn.style.display = 'none'; hideDropdown();
        selectedDestination = null;
        onDestChange(null, null);
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#destSearchWrap')) hideDropdown();
    });
})();


// ── Hotel search widget ───────────────────────────────────
(function(){
    const tok = sessionStorage.getItem('tripify_token');
    const input = document.getElementById('hotelSearchInput');
    const dropdown = document.getElementById('hotelSearchDropdown');
    const clearBtn = document.getElementById('hotelSearchClear');
    let timer;

    function showNoDest() {
        dropdown.innerHTML = '<div class="dest-no-result">📍 Please select a destination first</div>';
        dropdown.style.display = 'block';
    }

    async function search(q) {
        // Never search without a destination — this prevents cross-destination results
        if (!selectedDestination || !selectedDestination.id) { showNoDest(); return; }
        try {
            const url = ENDPOINTS.HOTELS.SEARCH
                + '?q=' + encodeURIComponent(q.trim())
                + '&destinationId=' + selectedDestination.id;
            const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + tok } });
            if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
            const data = await res.json();
            showDropdown(Array.isArray(data) ? data : []);
        } catch(e) { showDropdown([]); }
    }

    function showDropdown(items) {
        if (!items.length) {
            dropdown.innerHTML = `<div class="dest-no-result">🏨 This hotel is not found at <strong>${selectedDestination ? selectedDestination.name : 'this destination'}</strong></div>`;
            dropdown.style.display = 'block'; return;
        }
        dropdown.innerHTML = items.map(h => {
            const stars = h.stars ? '⭐'.repeat(h.stars) : '';
            const price = h.pricePerNight ? 'Rs. ' + Number(h.pricePerNight).toLocaleString('en-PK') + '/night' : '';
            return `<div class="dest-search-item hotel-search-item"
                        data-id="${h.id}" data-name="${h.name}"
                        data-price="${h.pricePerNight||0}" data-dest="${h.destinationName||''}"
                        data-stars="${h.stars||0}" data-avail="${h.availableRooms||0}">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span style="font-weight:600">${h.name}</span>
                            <span class="hsrc-price">${price}</span>
                        </div>
                        <div style="margin-top:2px">
                            <span class="hsrc-stars">${stars}</span>
                            <span class="dsrc-city">📍 ${h.destinationName||''}</span>
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
                    stars:           parseInt(el.dataset.stars)||0,
                    availableRooms:  parseInt(el.dataset.avail)||0
                });
            });
        });
    }

    function hideDropdown() { dropdown.style.display = 'none'; }

    input.addEventListener('focus', () => {
        if (!selectedDestination) { showNoDest(); return; }
        if (!selectedHotel) search(input.value);
    });
    input.addEventListener('input', e => {
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        if (selectedHotel) { clearHotel(); input.value = e.target.value; }
        clearTimeout(timer);
        if (!selectedDestination) { showNoDest(); return; }
        timer = setTimeout(() => search(e.target.value), 300);
    });
    clearBtn.addEventListener('click', () => { clearHotel(); });
    document.addEventListener('click', e => {
        if (!e.target.closest('#hotelSearchWrap') && !e.target.closest('#hotelBadge')) hideDropdown();
    });
})();
