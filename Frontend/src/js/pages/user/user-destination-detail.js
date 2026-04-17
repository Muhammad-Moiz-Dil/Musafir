// ── Auth guard ────────────────────────────────────────────
const tripToken = sessionStorage.getItem('tripify_token');
if (!tripToken) { window.location.href = '../auth/login.html'; }

// ── User profile ──────────────────────────────────────────
const tripUser = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials'), ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const img = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sa.innerHTML = img; ta.innerHTML = img;
    } else { sa.textContent = ini; ta.textContent = ini; }
}
applyUserProfile(tripUser);

// ── Sidebar toggle ────────────────────────────────────────
const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

// ── Helpers ───────────────────────────────────────────────
function starStr(r) { return '★'.repeat(Math.floor(r)) + (r%1>=0.5?'½':'') + '☆'.repeat(5-Math.floor(r)-(r%1>=0.5?1:0)); }
function showToast(icon, msg, dur=2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── Image resolver (same as destinations page) ────────────
const IMG_BASE = '../../../../public/assets/images/';
const IMG_MAP = {
    'hunza.jpg': IMG_BASE+'hunza-valley.jpg', 'murree.jpg': IMG_BASE+'murree.jpeg',
    'swat.jpg':  IMG_BASE+'swat.jpg',         'skardu.jpg': IMG_BASE+'skardu.jpeg',
    'naran.jpg': IMG_BASE+'naran kaghan.jpg',
    'lahore.jpg': IMG_BASE+'lahore.jpg',
    'islamabad.jpg': IMG_BASE+'islamabad.jpeg', 'islamabad.jpeg': IMG_BASE+'islamabad.jpeg',
    'fairy-meadows.jpg': IMG_BASE+'fairyMeadows.jpeg', 'fairyMeadows.jpeg': IMG_BASE+'fairyMeadows.jpeg',
    'mohenjo-daro.jpg':  IMG_BASE+'mohenjodaro.jpeg',  'mohenjodaro.jpeg': IMG_BASE+'mohenjodaro.jpeg',
    'cholistan.jpg': IMG_BASE+'cholistanDesert.jpeg',  'cholistanDesert.jpeg': IMG_BASE+'cholistanDesert.jpeg',
};
function resolveImage(url) {
    if (!url) return IMG_BASE + 'hunza-valley.jpg';
    if (url.startsWith('/uploads/')) return 'http://localhost:8080' + url;
    if (url.startsWith('http')) return url;
    if (IMG_MAP[url]) return IMG_MAP[url];
    if (url.startsWith('/') || url.startsWith('../')) return url;
    return IMG_BASE + url;
}

// ── Extra static data keyed by DB destination id ─────────
const EXTRAS = {
    1:{ altitude:'2,438 m', bestTime:'Apr–Oct', budget:'Moderate', tags:['Mountain','Scenic','Trekking','Photography'],
        guidelines:[ {icon:'🌸',title:'Best Time to Visit',text:'April–June for cherry blossoms. September–October for clear mountain views and harvest festivals.'}, {icon:'👗',title:'Dress Code',text:'Dress modestly and respectfully. Carry warm layers even in summer — nights are cold at altitude.'}, {icon:'🥾',title:'Trekking Tips',text:'Carry proper trekking gear. Acclimatize gradually. Hire a local guide for remote treks.'}, {icon:'💱',title:'Currency & Cash',text:'ATM access is limited beyond Karimabad. Carry sufficient PKR cash for your entire stay.'} ],
        souvenirs:[ {name:'Hunza Apricots & Dry Fruits', vendor:'Local Markets, Karimabad', price:'Rs. 500–1,500/kg'}, {name:'Gemstone Jewellery', vendor:'Karimabad Bazaar', price:'Rs. 1,000–15,000'}, {name:'Handwoven Wool Caps', vendor:'Artisan Shops', price:'Rs. 300–800'} ],
        hotels:[ {name:'Eagle Nest Hotel', stars:4, price:'Rs. 8,500/night', rating:4.6}, {name:'Serena Hunza', stars:5, price:'Rs. 18,000/night', rating:4.9}, {name:'Hunza Inn', stars:3, price:'Rs. 4,000/night', rating:4.2} ] },
    2:{ altitude:'2,291 m', bestTime:'Apr–Oct', budget:'Budget', tags:['Hill Station','Family','Scenic'],
        guidelines:[ {icon:'🚗',title:'Getting There',text:'Only 50 km from Islamabad. Avoid weekends in peak season — traffic jams can last 3–4 hours.'}, {icon:'❄️',title:'Winter Safety',text:'Roads can be icy Dec–Feb. Keep snow chains in the car. Check PDMA road status before travelling.'}, {icon:'🍎',title:'Local Food',text:'Try fresh apples, kashmiri tea, and freshly baked bread at local dhabas on Mall Road.'} ],
        souvenirs:[ {name:'Kashmiri Shawls', vendor:'Mall Road Shops', price:'Rs. 1,500–5,000'}, {name:'Wooden Crafts', vendor:'Local Artisans', price:'Rs. 500–2,000'} ],
        hotels:[ {name:'Shangrila Resort', stars:4, price:'Rs. 7,000/night', rating:4.4}, {name:'Mall Hotel', stars:3, price:'Rs. 3,500/night', rating:4.1} ] },
    3:{ altitude:'980 m', bestTime:'Apr–Sep', budget:'Budget', tags:['Valley','Scenic','Adventure'],
        guidelines:[ {icon:'🏛️',title:'Historical Sites',text:'Visit Butkara Stupa and Mingora Museum. Hire local guides for historical context — very knowledgeable.'}, {icon:'🌊',title:'River Safety',text:'Do not swim in the Swat River during monsoon season. Currents are extremely dangerous Jul–Aug.'}, {icon:'🍽️',title:'Local Cuisine',text:'Try Peshawari chapli kabab and fresh fish at Kalam riverfront restaurants.'} ],
        souvenirs:[ {name:'Swat Emeralds', vendor:'Mingora Gem Bazaar', price:'Rs. 5,000–50,000'}, {name:'Pashtun Embroidery', vendor:'Local Women Cooperatives', price:'Rs. 800–3,000'} ],
        hotels:[ {name:'Serena Swat', stars:5, price:'Rs. 15,000/night', rating:4.7}, {name:'Kalam Valley Hotel', stars:3, price:'Rs. 3,000/night', rating:4.2} ] },
    4:{ altitude:'2,228 m', bestTime:'Jun–Sep', budget:'Moderate', tags:['Adventure','K2','Mountain'],
        guidelines:[ {icon:'✈️',title:'How to Get There',text:'PIA operates flights from Islamabad. Book in advance — seats fill quickly. KKH is an alternative but takes 2 days.'}, {icon:'🏔️',title:'Altitude Sickness',text:'Skardu is at 2,228m. Acclimatize for 1–2 days before trekking to higher elevations.'}, {icon:'🧊',title:'Weather',text:'Summer days are warm (25°C) but nights are cold (5–10°C). Winters are extreme — only visit June–September.'} ],
        souvenirs:[ {name:'Skardu Salt Lamps', vendor:'Local Shops', price:'Rs. 500–2,000'}, {name:'Karakoram Gems', vendor:'Gem Dealers, Skardu Bazaar', price:'Rs. 2,000–20,000'} ],
        hotels:[ {name:'Serena Skardu', stars:5, price:'Rs. 20,000/night', rating:4.8}, {name:'Shangrila Resort', stars:4, price:'Rs. 12,000/night', rating:4.6}, {name:'K2 Motel', stars:3, price:'Rs. 4,500/night', rating:4.0} ] },
    5:{ altitude:'2,409 m', bestTime:'Jun–Sep', budget:'Budget', tags:['Valley','Nature','Scenic'],
        guidelines:[ {icon:'📅',title:'Short Window',text:'Naran is accessible only June–September. The Babusar Top pass closes for the rest of the year due to heavy snow.'}, {icon:'🌙',title:'Night Temperature',text:'Even in summer, night temperatures drop to near 0°C. Pack a warm sleeping bag and heavy jacket.'}, {icon:'🚐',title:'4x4 Vehicles',text:'Beyond Naran town, roads are unpaved and steep. Hire a local 4x4 jeep — do not attempt in a regular car.'} ],
        souvenirs:[ {name:'Wild Mountain Honey', vendor:'Naran Bazaar', price:'Rs. 1,200–3,000/kg'}, {name:'Woollen Blankets', vendor:'Local Weavers', price:'Rs. 1,500–4,000'} ],
        hotels:[ {name:'Pine Park Hotel', stars:4, price:'Rs. 6,500/night', rating:4.3}, {name:'Kaghan Resort', stars:3, price:'Rs. 3,200/night', rating:4.0} ] },
    6:{ altitude:'217 m', bestTime:'Oct–Mar', budget:'Budget', tags:['Cultural','Heritage','Food','History'],
        guidelines:[ {icon:'🕌',title:'Visiting Mosques & Shrines',text:'Cover head and remove shoes before entering. Separate entrances for men and women at Badshahi Mosque and Data Darbar.'}, {icon:'🌡️',title:'Best Time',text:'October to March is ideal (5–20°C). Summers (May–Aug) are extremely hot at 40–45°C.'}, {icon:'🍢',title:'Food Street',text:'Visit Gawalmandi Food Street and Anarkali Bazaar for authentic Lahori food — biryani, nihari, and paya are must-tries.'}, {icon:'🚇',title:'Getting Around',text:'Orange Line Metro connects major areas. Rickshaws and Careem/Uber are widely available.'} ],
        souvenirs:[ {name:'Rang Mahal Embroidered Fabric', vendor:'Anarkali Bazaar', price:'Rs. 1,500–6,000'}, {name:'Brass & Copper Craft', vendor:'Shahi Bazaar', price:'Rs. 800–4,000'}, {name:'Lahori Khusa (Embroidered Shoes)', vendor:'Liberty Market', price:'Rs. 500–2,500'} ],
        hotels:[ {name:'Pearl Continental Lahore', stars:5, price:'Rs. 25,000/night', rating:4.7}, {name:'Avari Lahore', stars:4, price:'Rs. 14,000/night', rating:4.4}, {name:'Faletti\'s Hotel', stars:4, price:'Rs. 10,000/night', rating:4.2} ] },
    7:{ altitude:'507 m', bestTime:'Oct–Apr', budget:'Budget', tags:['Capital','Modern','Scenic','Nature'],
        guidelines:[ {icon:'🕌',title:'Faisal Mosque',text:'Non-Muslims welcome outside prayer times. Dress modestly and cover head. Separate entrances for men and women.'}, {icon:'🌿',title:'Margalla Hills',text:'Hiking trails open 6am–6pm. Trail 3 is the most popular (2 hours round trip). Carry water and wear sturdy shoes.'}, {icon:'🔒',title:'Safety',text:'Islamabad is one of Pakistan\'s safest cities. Carry your CNIC or passport near diplomatic enclaves and checkpoints.'}, {icon:'✈️',title:'Airport',text:'Islamabad International Airport (ISB) is 25 km from the city. Metro Bus connects to Rawalpindi. Uber/Careem available.'} ],
        souvenirs:[ {name:'Lok Mela Handicrafts', vendor:'Lok Virsa Museum Shop', price:'Rs. 500–5,000'}, {name:'Pakistani Marble Crafts', vendor:'F-6 Supermarket', price:'Rs. 1,000–8,000'}, {name:'Kashmiri Shawls', vendor:'Jinnah Super Market', price:'Rs. 2,000–8,000'} ],
        hotels:[ {name:'Serena Hotel Islamabad', stars:5, price:'Rs. 30,000/night', rating:4.8}, {name:'Marriott Islamabad', stars:5, price:'Rs. 28,000/night', rating:4.7}, {name:'Islamabad Hotel', stars:4, price:'Rs. 12,000/night', rating:4.2} ] },
    8:{ altitude:'3,300 m', bestTime:'Jun–Sep', budget:'Moderate', tags:['Mountain','Trek','Camping','Nanga Parbat'],
        guidelines:[ {icon:'🚙',title:'Getting There',text:'Drive from Islamabad to Raikot Bridge (~6 hrs). Take a hired jeep (1 hr) to Tattu village, then 3 km hike to the meadow.'}, {icon:'❄️',title:'Cold Nights',text:'Even in July, nights drop to 5°C or below. Bring a quality sleeping bag, thermal layers, and a warm jacket.'}, {icon:'🥾',title:'Trekking to Base Camp',text:'The 2-day Nanga Parbat Base Camp trek requires a licensed guide and proper high-altitude trekking gear.'}, {icon:'🏥',title:'No Medical Facilities',text:'The nearest hospital is in Chilas. Carry a comprehensive first-aid kit and altitude sickness medicine (Diamox).'} ],
        souvenirs:[ {name:'Handmade Wool Products', vendor:'Tattu Village', price:'Rs. 600–2,500'}, {name:'Mountain Herb Tea', vendor:'Local Guesthouses', price:'Rs. 200–800'}, {name:'Nanga Parbat Prints & Postcards', vendor:'Fairy Meadows Camp', price:'Rs. 150–500'} ],
        hotels:[ {name:'Fairy Meadows Hut', stars:2, price:'Rs. 2,500/night', rating:4.3}, {name:'Nanga Parbat View Camp', stars:2, price:'Rs. 1,800/night', rating:4.1}, {name:'Raikot Bridge Guesthouse', stars:2, price:'Rs. 1,500/night', rating:3.9} ] },
    9:{ altitude:'55 m', bestTime:'Nov–Feb', budget:'Budget', tags:['UNESCO','Ancient','History','Archaeology'],
        guidelines:[ {icon:'🏛️',title:'Site Rules',text:'Do not touch or climb on any ruins — they are 4,500 years old. Photography permitted but flash and tripods inside the museum require written permission.'}, {icon:'☀️',title:'Beat the Heat',text:'Go early morning (8–11am). Summers are brutally hot (45–50°C). Only visit November–February.'}, {icon:'🚌',title:'Getting There',text:'Fly to Moenjodaro Airport (MJD) from Karachi or Islamabad. Or take a train to Larkana then hire a taxi (~30 km).'}, {icon:'🎟️',title:'Entry Fee',text:'Approx. PKR 500 for Pakistanis, PKR 1,000 for foreigners. Guided tours available at the gate.'} ],
        souvenirs:[ {name:'Indus Valley Replica Artefacts', vendor:'Site Gift Shop', price:'Rs. 300–2,000'}, {name:'Sindhi Ajrak (Block-print Fabric)', vendor:'Larkana Bazaar', price:'Rs. 800–3,500'}, {name:'Sindhi Embroidery', vendor:'Larkana Craft Shops', price:'Rs. 1,000–4,000'} ],
        hotels:[ {name:'Mohenjo Daro Hotel', stars:2, price:'Rs. 3,000/night', rating:3.6}, {name:'Hotel Indus Larkana', stars:3, price:'Rs. 5,000/night', rating:3.8}, {name:'PTDC Motel Larkana', stars:2, price:'Rs. 2,500/night', rating:3.5} ] },
   10:{ altitude:'150 m', bestTime:'Nov–Feb', budget:'Budget', tags:['Desert','Adventure','Heritage','Safari'],
        guidelines:[ {icon:'🧭',title:'Never Enter Alone',text:'Always hire a local guide or join an organised tour from Bahawalpur. Carry at least 4 litres of water per person.'}, {icon:'🏰',title:'Derawar Fort',text:'Contact Bahawalpur Commissioner\'s office for access permits to Derawar Fort interior. Exterior is always accessible.'}, {icon:'🌪️',title:'Sandstorms',text:'Sandstorms can arise suddenly. Have a plan to shelter — stay in or near your vehicle and cover face with cloth.'}, {icon:'📱',title:'Connectivity',text:'Mobile signal is limited. Zong has the best coverage in Bahawalpur district. Save emergency numbers before you go.'} ],
        souvenirs:[ {name:'Camel Leather Goods', vendor:'Bahawalpur Bazaar', price:'Rs. 1,000–5,000'}, {name:'Cholistani Pottery', vendor:'Local Artisans', price:'Rs. 500–2,500'}, {name:'Derawar Fort Miniature Prints', vendor:'Souvenir Stalls', price:'Rs. 200–800'} ],
        hotels:[ {name:'PC Bahawalpur', stars:4, price:'Rs. 8,000/night', rating:4.0}, {name:'Hotel Al-Farooq', stars:3, price:'Rs. 4,500/night', rating:3.8}, {name:'Desert Safari Camp', stars:2, price:'Rs. 3,000/night', rating:4.2} ] },
};

const DEFAULT_EXTRAS = {
    altitude:'—', bestTime:'Year-round', budget:'Varies', tags:['Pakistan'],
    guidelines:[ {icon:'📱',title:'Stay Connected',text:'Save local emergency numbers before you travel. Tourist Helpline: 1422.'}, {icon:'💧',title:'Stay Hydrated',text:'Carry drinking water, especially for longer trips.'}, {icon:'🚗',title:'Plan Your Route',text:'Use our Route Finder to plan the best way to get there.'} ],
    souvenirs:[ {name:'Local Handicrafts', vendor:'Local Bazaars', price:'Varies'}, {name:'Regional Specialties', vendor:'Local Markets', price:'Varies'} ],
    hotels:[ {name:'Contact PTDC', stars:3, price:'Varies by season', rating:4.0} ],
};

// ── Wishlist state ────────────────────────────────────────
let isFavorited = false;
let wishBtnBusy = false;
let currentDestId = null;
let userRating = 0;

// ── Render page with destination data ─────────────────────
function renderPage(d, extras, seasonalData) {
    const img = resolveImage(d.imageUrl);
    const rating = d.averageRating ? Number(d.averageRating).toFixed(1) : '–';
    const reviews = d.totalReviews || 0;
    const starsDisplay = d.averageRating ? starStr(Number(d.averageRating)) : '☆☆☆☆☆';

    document.getElementById('topbarTitle').textContent = d.name;
    document.title = d.name + ' — Tripify';

    document.getElementById('pageContent').innerHTML = `
<div style="margin-bottom:14px">
    <a href="destinations.html" class="btn btn-ghost btn-sm">← Back to Destinations</a>
</div>

<div class="dest-hero">
    <img src="${img}" alt="${d.name}" onerror="this.src='${IMG_BASE}hunza-valley.jpg'">
    <div class="dest-hero-overlay"></div>
    <div class="dest-hero-content">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            ${extras.tags.map(t=>`<span class="badge badge-accent">${t}</span>`).join('')}
        </div>
        <div class="dest-hero-name">${d.name}</div>
        <div class="dest-hero-region">📍 ${d.city || 'Pakistan'} · ⛰️ ${extras.altitude} · 📅 Best: ${extras.bestTime} · 💰 ${extras.budget}</div>
    </div>
    <button class="dest-hero-wish" id="wishBtn" onclick="toggleWish()">🤍</button>
</div>

<div class="info-strip">
    <div class="info-chip"><div class="info-chip-icon">⭐</div><div class="info-chip-val">${rating}</div><div class="info-chip-lbl">${reviews} Reviews</div></div>
    <div class="info-chip"><div class="info-chip-icon">⛰️</div><div class="info-chip-val">${extras.altitude}</div><div class="info-chip-lbl">Altitude</div></div>
    <div class="info-chip"><div class="info-chip-icon">📅</div><div class="info-chip-val">${extras.bestTime}</div><div class="info-chip-lbl">Best Season</div></div>
    <div class="info-chip"><div class="info-chip-icon">💰</div><div class="info-chip-val">${extras.budget}</div><div class="info-chip-lbl">Budget Level</div></div>
</div>

<div class="detail-layout">
<div class="detail-main">

    <div class="section-card">
        <h3>📖 About ${d.name}</h3>
        <p class="desc-text">${d.description || 'A beautiful destination in Pakistan.'}</p>
    </div>

    <div class="section-card" id="guidelinesCard">
        <h3>📋 Travel Guidelines</h3>
        <div id="guidelinesList"><div style="text-align:center;padding:14px;color:var(--t3);font-size:13px">Loading…</div></div>
    </div>

    <div class="section-card" id="souvenirCard">
        <h3>🛍️ Souvenirs &amp; Local Goods</h3>
        <div id="souvenirList"><div style="text-align:center;padding:14px;color:var(--t3);font-size:13px">Loading…</div></div>
    </div>

    ${seasonalData ? `
    <div class="section-card">
        <h3>🌦️ Year-Round Climate</h3>
        <table class="climate-table">
            <thead><tr><th>Month</th><th>Avg Temp</th><th>Rainfall</th><th>Avg Hotel/Night</th></tr></thead>
            <tbody>
            ${seasonalData.map(row => {
                const curMonth = new Date().getMonth() + 1;
                const isCur = row.month === curMonth;
                const barW = Math.min(100, Math.max(8, ((row.temperature + 10) / 55) * 100));
                return `<tr class="${isCur ? 'climate-cur' : ''}">
                    <td>${row.monthName}${isCur ? ' ◀' : ''}</td>
                    <td>${row.temperature}°C <span class="temp-bar" style="width:${barW}px"></span></td>
                    <td>${row.rainfall} mm</td>
                    <td>${row.averagePrice ? 'Rs. ' + Number(row.averagePrice).toLocaleString() : '—'}</td>
                </tr>`;
            }).join('')}
            </tbody>
        </table>
    </div>` : ''}

    <div class="section-card" id="reviewsCard">
        <h3>⭐ Ratings &amp; Reviews</h3>
        <div class="rating-summary">
            <div>
                <div class="rating-big-num">${rating}</div>
                <div class="rating-big-stars">${starsDisplay}</div>
                <div class="rating-big-count">${reviews} review${reviews !== 1 ? 's' : ''}</div>
            </div>
        </div>
        <div id="reviewsList"><div style="text-align:center;padding:20px;color:var(--t3);font-size:13px">Loading reviews…</div></div>
        <div class="rate-form">
            <h4>✍️ Write a Review</h4>
            <p style="font-size:12px;color:var(--t3);margin-bottom:10px">Anyone can submit feedback. Trips with a completed itinerary earn a <strong style="color:#22c55e">✅ Verified Traveller</strong> badge.</p>
            <div class="rate-stars" id="rateStars">
                ${[1,2,3,4,5].map(i=>`<span class="rate-star" data-val="${i}" onclick="setRating(${i})">★</span>`).join('')}
            </div>
            <textarea class="rate-textarea" id="reviewText" placeholder="Share your experience (optional)…" maxlength="1000"></textarea>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:10px">
                <span class="rate-msg" id="rateMsg"></span>
                <button class="btn btn-primary btn-sm" onclick="submitReview()">Submit Review</button>
            </div>
        </div>
    </div>
</div>

<div class="detail-side">
    <div class="action-panel">
        <h3>🚀 Plan Your Visit</h3>
        <p>Ready to explore ${d.name}? Use our tools to plan the perfect trip.</p>
        <div class="action-btns">
            <a href="trip-cost.html?dest=${d.id}" class="btn btn-primary btn-full">💰 Estimate Trip Cost</a>
            <a href="route-finder.html?to=${d.id}" class="btn btn-ghost btn-full" style="background:rgba(255,255,255,0.1)">🗺️ Find Route</a>
            <a href="hotels.html?dest=${d.id}" class="btn btn-outline-accent btn-full">🏨 View Hotels</a>
        </div>
    </div>

    <div class="section-card">
        <h3>🏨 Top Hotels</h3>
        ${extras.hotels.map(h=>`
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:13.5px;font-weight:600;color:var(--white)">${h.name}</span>
                <span class="badge badge-accent">${'★'.repeat(h.stars)}</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:11.5px;color:var(--t3)">⭐ ${h.rating}</span>
                <span style="font-size:13px;font-weight:700;color:var(--accent)">${h.price}</span>
            </div>
        </div>`).join('')}
        <a href="hotels.html?dest=${d.id}" class="btn btn-ghost btn-full btn-sm" style="margin-top:12px">View All Hotels →</a>
    </div>

    <div class="section-card">
        <h3>🚨 Emergency Contacts</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12.5px;color:var(--t2)">🚔 Police</span><span style="font-weight:700;color:var(--danger)">15</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12.5px;color:var(--t2)">🚑 Rescue</span><span style="font-weight:700;color:var(--danger)">1122</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12.5px;color:var(--t2)">📞 Tourist Helpline</span><span style="font-weight:700;color:var(--accent)">1422</span></div>
        </div>
        <a href="emergency.html" class="btn btn-danger btn-full btn-sm" style="margin-top:12px">Full Emergency Guide →</a>
    </div>
</div>
</div>`;
}

async function toggleWish() {
    if (wishBtnBusy) return;
    wishBtnBusy = true;
    const btn    = document.getElementById('wishBtn');
    const method = isFavorited ? 'DELETE' : 'POST';
    try {
        const res = await fetch(ENDPOINTS.FAVORITES.ADD(currentDestId), {
            method, headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (res.status === 409) { showToast('💛', 'Already in your Favorites.'); wishBtnBusy = false; return; }
        if (res.ok) {
            isFavorited = !isFavorited;
            btn.textContent = isFavorited ? '❤️' : '🤍';
            showToast(isFavorited ? '❤️' : '🤍', isFavorited ? 'Added to Favorites!' : 'Removed from Favorites');
        } else { showToast('❌', 'Unable to update Favorites. Please try again.'); }
    } catch (e) { showToast('📶', 'Network error. Try again.'); }
    wishBtnBusy = false;
}

function setRating(v) {
    userRating = v;
    document.querySelectorAll('.rate-star').forEach((s, i) => s.classList.toggle('active', i < v));
}

// ── Load + render reviews ─────────────────────────────────
async function loadReviews(destId) {
    const list = document.getElementById('reviewsList');
    if (!list) return;
    try {
        const res = await fetch(ENDPOINTS.REVIEWS.BY_DEST(destId), {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (!res.ok) { list.innerHTML = '<div class="reviews-empty"><span>❌</span>Could not load reviews.</div>'; return; }
        const reviews = await res.json();
        if (!reviews.length) {
            list.innerHTML = '<div class="reviews-empty"><span>💬</span>No reviews for this destination yet.</div>';
            return;
        }
        list.innerHTML = reviews.map(r => {
            const stars  = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            const date   = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', {month:'short', year:'numeric'}) : '';
            const text   = r.reviewText ? `<div class="review-text">${escHtml(r.reviewText)}</div>` : '';
            const badge  = r.verified
                ? `<span style="font-size:10.5px;background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25);border-radius:20px;padding:2px 8px;font-weight:600;">✅ Verified Traveller</span>`
                : `<span style="font-size:10.5px;background:rgba(255,255,255,0.05);color:var(--t3);border:1px solid var(--border);border-radius:20px;padding:2px 8px;font-weight:500;">💬 General Feedback</span>`;
            return `<div class="review-card">
                <div class="review-header">
                    <span class="reviewer-name">${escHtml(r.reviewerName || 'Anonymous')}</span>
                    <span class="review-date">${date}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                    <div class="review-stars">${stars}</div>
                    ${badge}
                </div>
                ${text}
            </div>`;
        }).join('');
    } catch (e) {
        list.innerHTML = '<div class="reviews-empty"><span>📶</span>Could not load reviews.</div>';
    }
}

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Submit review ─────────────────────────────────────────
async function submitReview() {
    const msg = document.getElementById('rateMsg');
    if (!userRating) { msg.className = 'rate-msg err'; msg.textContent = 'Please select a star rating first.'; return; }
    const text = (document.getElementById('reviewText').value || '').trim();

    msg.className = 'rate-msg'; msg.textContent = 'Submitting…';
    try {
        const res = await fetch(ENDPOINTS.REVIEWS.SUBMIT, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + tripToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinationId: currentDestId, rating: userRating, reviewText: text || null })
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 201) {
            const label = data.verified ? '✅ Verified review submitted!' : '💬 General feedback submitted!';
            msg.className = 'rate-msg ok'; msg.textContent = label;
            document.getElementById('reviewText').value = '';
            userRating = 0;
            document.querySelectorAll('.rate-star').forEach(s => s.classList.remove('active'));
            loadReviews(currentDestId);
        } else if (res.status === 403) {
            msg.className = 'rate-msg err'; msg.textContent = data.message || 'Only allowed for completed-trip destinations.';
        } else if (res.status === 409) {
            msg.className = 'rate-msg err'; msg.textContent = 'You have already reviewed this destination.';
        } else {
            msg.className = 'rate-msg err'; msg.textContent = data.message || 'Submission failed. Try again.';
        }
    } catch (e) {
        msg.className = 'rate-msg err'; msg.textContent = 'Network error. Try again.';
    }
}

// ── Fetch image → blob URL (bypasses file:// img-src restrictions) ────────────
async function fetchImageBlob(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return URL.createObjectURL(await res.blob());
    } catch (e) { return null; }
}

// ── Load + render souvenirs ───────────────────────────────
async function loadSouvenirs(destId, extras) {
    const list = document.getElementById('souvenirList');
    if (!list) return;
    try {
        const res = await fetch(ENDPOINTS.SOUVENIRS.BY_DESTINATION(destId), {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (res.ok) {
            const items = await res.json();
            if (Array.isArray(items) && items.length) {
                // Pre-load all images as blob URLs so they work from file:// pages
                const blobUrls = await Promise.all(items.map(s => {
                    if (!s.imageUrl || !s.imageUrl.trim()) return Promise.resolve(null);
                    return fetchImageBlob(resolveImage(s.imageUrl));
                }));

                list.innerHTML = items.map((s, i) => {
                    const blobUrl = blobUrls[i];
                    return `<div class="souvenir-item">
                        ${blobUrl ? `<img src="${blobUrl}" alt="${escHtml(s.name)}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0">` : ''}
                        <div style="flex:1;min-width:0">
                            <div class="souvenir-name">${escHtml(s.name)}</div>
                            <div class="souvenir-vendor">📍 ${escHtml(s.vendorName || 'Local Markets')}</div>
                            ${s.description ? `<div style="font-size:11.5px;color:var(--t3);margin-top:2px;line-height:1.5">${escHtml(s.description)}</div>` : ''}
                        </div>
                    </div>`;
                }).join('');
                return;
            }
        }
    } catch (e) {}
    // Fallback to static extras
    list.innerHTML = extras.souvenirs.map(s => `
        <div class="souvenir-item">
            <div style="flex:1"><div class="souvenir-name">${s.name}</div><div class="souvenir-vendor">📍 ${s.vendor}</div></div>
        </div>`).join('');
}

// ── Load + render guidelines ──────────────────────────────
async function loadGuidelines(destId, extras) {
    const list = document.getElementById('guidelinesList');
    if (!list) return;
    const CAT_ICON = {
        'Safety':'🛡️','Visa':'✈️','Health':'🏥','Transport':'🚗','Food':'🍽️',
        'Culture':'🕌','Weather':'🌡️','Trekking':'🥾','General':'📌','Emergency':'🚨',
        'Tips':'💡','Nature':'🌿','History':'🏛️','Currency':'💱','Connectivity':'📱'
    };
    try {
        const res = await fetch(ENDPOINTS.GUIDELINES.BY_DEST(destId), {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (res.ok) {
            const items = await res.json();
            if (Array.isArray(items) && items.length) {
                list.innerHTML = items.map(g => {
                    const icon = CAT_ICON[g.category] || '📋';
                    return `<div class="guideline-item">
                        <span class="g-icon">${icon}</span>
                        <div><div class="g-title">${escHtml(g.title)}</div><div class="g-text">${escHtml(g.content)}</div></div>
                    </div>`;
                }).join('');
                return;
            }
        }
    } catch (e) {}
    // Fallback to static extras
    list.innerHTML = extras.guidelines.map(g => `
        <div class="guideline-item">
            <span class="g-icon">${g.icon}</span>
            <div><div class="g-title">${g.title}</div><div class="g-text">${g.text}</div></div>
        </div>`).join('');
}

// ── Load destination from API ─────────────────────────────
async function loadDestination() {
    const id = parseInt(new URLSearchParams(location.search).get('id'));
    if (!id) { window.location.href = 'destinations.html'; return; }
    currentDestId = id;

    const content = document.getElementById('pageContent');
    content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--t2)"><div style="font-size:36px;animation:spin 1s linear infinite;display:inline-block">⏳</div><p style="margin-top:14px">Loading destination…</p></div>`;

    try {
        const res = await fetch(ENDPOINTS.DESTINATIONS.BY_ID(id), {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (res.status === 404) {
            content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--t2)"><div style="font-size:40px">🔍</div><p style="margin-top:14px">Destination not found.</p><a href="destinations.html" class="btn btn-primary" style="margin-top:16px">← Back to Destinations</a></div>`;
            return;
        }
        if (!res.ok) {
            content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--t2)"><div style="font-size:40px">❌</div><p style="margin-top:14px">Something went wrong. Please try again.</p><a href="destinations.html" class="btn btn-ghost" style="margin-top:16px">← Go Back</a></div>`;
            return;
        }
        const d = await res.json();
        // Merge DB fields into extras (DB takes priority over static EXTRAS)
        const base   = EXTRAS[id] || DEFAULT_EXTRAS;
        const extras = {
            ...base,
            altitude:  d.altitude    || base.altitude,
            bestTime:  d.bestTime    || base.bestTime,
            budget:    d.budgetLevel || base.budget,
        };

        // Fetch seasonal data
        let seasonalData = null;
        try {
            const seRes = await fetch(ENDPOINTS.SEASONAL.BY_DESTINATION(d.name), {
                headers: { 'Authorization': 'Bearer ' + tripToken }
            });
            if (seRes.ok) { const seData = await seRes.json(); if (seData.length) seasonalData = seData; }
        } catch (e) {}

        try {
            const favRes = await fetch(ENDPOINTS.FAVORITES.IDS, { headers: { 'Authorization': 'Bearer ' + tripToken } });
            if (favRes.ok) { const ids = await favRes.json(); isFavorited = ids.includes(id); }
        } catch (e) {}

        renderPage(d, extras, seasonalData);
        const wishBtn = document.getElementById('wishBtn');
        if (wishBtn) wishBtn.textContent = isFavorited ? '❤️' : '🤍';

        loadReviews(id);
        loadSouvenirs(id, extras);
        loadGuidelines(id, extras);

    } catch (e) {
        content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--t2)"><div style="font-size:40px">📶</div><p style="margin-top:14px">Network error. Check your connection.</p><a href="destinations.html" class="btn btn-ghost" style="margin-top:16px">← Go Back</a></div>`;
    }
}

loadDestination();
