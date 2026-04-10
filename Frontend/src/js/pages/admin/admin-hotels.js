
(function(){
  const token = sessionStorage.getItem('tripify_token');
  const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
  if (!token || user.userType !== 'Admin') { window.location.href = '../auth/admin-login.html'; return; }

  const ini = (user.fullName||'SA').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('topbarInitials').textContent  = ini;
  window.doLogout = function(){ sessionStorage.removeItem('tripify_token'); sessionStorage.removeItem('tripify_user'); window.location.href='../auth/admin-login.html'; };

  // ── State ──────────────────────────────────────────
  let allHotels    = [];
  let activeFilter = 'all';
  let searchQuery  = '';
  let editingId    = null;
  let submitting   = false;

  // ── Helpers ────────────────────────────────────────
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function starsHTML(n){ if(!n) return '—'; return '<span class="stars">'+'★'.repeat(n)+'☆'.repeat(Math.max(0,5-n))+'</span>'; }
  function resolveImg(url){
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('/uploads')) return url;
    return '../../../../public/assets/images/' + url;
  }
  function showToast(msg, type='success'){
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast '+type+' show';
    setTimeout(()=>t.classList.remove('show'), 3500);
  }

  // ── Load hotels from API ───────────────────────────
  async function loadHotels(){
    try {
      const res = await fetch(ENDPOINTS.HOTELS.ADMIN_ALL, { headers:{'Authorization':'Bearer '+token} });
      if (res.status===401){ doLogout(); return; }
      if (res.status===403){ showToast('Access denied','error'); return; }
      if (!res.ok) throw new Error();
      allHotels = await res.json();
      updateStats();
      renderTable();
    } catch(e){
      showToast('Failed to load hotels. Please try again.','error');
      document.getElementById('hotelsTableBody').innerHTML =
        '<tr><td colspan="8" class="empty-state"><div>Unable to load hotels. Please refresh.</div></td></tr>';
    }
  }

  // ── Stats ──────────────────────────────────────────
  function updateStats(){
    const total    = allHotels.length;
    const active   = allHotels.filter(h=>h.isActive).length;
    const inactive = total - active;
    const managers = new Set(allHotels.filter(h=>h.managerName!=='Unassigned').map(h=>h.managerName)).size;
    document.getElementById('statTotal').textContent    = total;
    document.getElementById('statActive').textContent   = active;
    document.getElementById('statInactive').textContent = inactive;
    document.getElementById('statManagers').textContent = managers;
  }

  // ── Filter / search ────────────────────────────────
  function getVisible(){
    let list = allHotels;
    if (activeFilter==='active')   list = list.filter(h=>h.isActive);
    if (activeFilter==='inactive') list = list.filter(h=>!h.isActive);
    if (searchQuery){
      const q = searchQuery.toLowerCase();
      list = list.filter(h=>
        h.name.toLowerCase().includes(q) ||
        (h.destinationName||'').toLowerCase().includes(q) ||
        (h.managerName||'').toLowerCase().includes(q)
      );
    }
    return list;
  }

  // ── Render table ───────────────────────────────────
  function renderTable(){
    const hotels = getVisible();
    const tbody  = document.getElementById('hotelsTableBody');
    if (!hotels.length){
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div>No hotels found.</div></td></tr>';
      document.getElementById('tableFooterInfo').textContent = 'No results';
      document.getElementById('paginationBar').innerHTML = '';
      return;
    }
    tbody.innerHTML = hotels.map(h=>{
      const badge = h.isActive
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge badge-red">Inactive</span>';
      const toggleLabel = h.isActive ? 'Deactivate' : 'Activate';
      return `<tr>
        <td><div class="hotel-cell"><div><div class="hotel-name">${esc(h.name)}</div><div class="hotel-sub">${esc(h.address||'')}</div></div></div></td>
        <td>${esc(h.destinationName)}</td>
        <td>${esc(h.managerName)}</td>
        <td>${h.availableRooms}/${h.totalRooms}</td>
        <td>${badge}</td>
        <td><div class="actions">
          <button class="act-btn" onclick="openEditModal(${h.id})">Edit</button>
          <button class="act-btn danger" onclick="toggleStatus(${h.id},${h.isActive})">${toggleLabel}</button>
        </div></td>
      </tr>`;
    }).join('');
    document.getElementById('tableFooterInfo').textContent =
      `Showing 1–${hotels.length} of ${allHotels.length} hotel${allHotels.length!==1?'s':''}`;
  }

  // ── Filter pills ───────────────────────────────────
  document.querySelectorAll('.fpill').forEach(p=>p.addEventListener('click',function(){
    document.querySelectorAll('.fpill').forEach(x=>x.classList.remove('active'));
    this.classList.add('active');
    activeFilter = this.dataset.filter || 'all';
    renderTable();
  }));

  // ── Search ─────────────────────────────────────────
  document.querySelectorAll('.search-box input, .topbar-search input').forEach(inp=>{
    inp.addEventListener('input',function(){ searchQuery=this.value.trim(); renderTable(); });
  });

  // ── Edit modal ─────────────────────────────────────
  window.openEditModal = async function(hotelId){
    const h = allHotels.find(x=>x.id===hotelId);
    if (!h) return;
    editingId = hotelId;
    document.getElementById('editHotelName').value      = h.name || '';
    document.getElementById('editPricePerNight').value  = h.pricePerNight || '';
    document.getElementById('editStarRating').value     = h.stars || 0;
    document.getElementById('editTotalRooms').value     = h.totalRooms || '';
    document.getElementById('editAvailableRooms').value = h.availableRooms || '';
    document.getElementById('editDescription').value    = h.description || '';
    document.getElementById('editIsActive').value       = h.isActive ? 'true' : 'false';
    clearErrors();

    // Load managers into dropdown
    const mgrSel = document.getElementById('editManager');
    mgrSel.innerHTML = '<option value="">Loading…</option>';
    try {
      const res = await fetch(ENDPOINTS.HOTELS.MANAGERS, { headers:{'Authorization':'Bearer '+token} });
      if (res.ok) {
        const managers = await res.json();
        mgrSel.innerHTML = '<option value="">— Unassigned —</option>' +
          managers.map(m=>`<option value="${m.id}">${esc(m.fullName)}</option>`).join('');
      } else {
        mgrSel.innerHTML = '<option value="">— Unable to load —</option>';
      }
    } catch { mgrSel.innerHTML = '<option value="">— Unable to load —</option>'; }
    mgrSel.value = h.managerId != null ? String(h.managerId) : '';

    document.getElementById('editModalOverlay').classList.add('show');
    document.getElementById('editHotelName').focus();
  };
  window.closeEditModal = function(){
    document.getElementById('editModalOverlay').classList.remove('show');
    editingId = null;
  };
  document.getElementById('editModalOverlay').addEventListener('click',function(e){
    if (e.target===this) closeEditModal();
  });

  // ── Validation ─────────────────────────────────────
  function clearErrors(){
    document.querySelectorAll('#editForm .field-err').forEach(el=>el.textContent='');
    document.querySelectorAll('#editForm .err').forEach(el=>el.classList.remove('err'));
  }
  function fieldErr(id, msg){
    document.getElementById(id).classList.add('err');
    document.getElementById(id+'Error').textContent = msg;
  }
  function validate(){
    clearErrors();
    let ok = true;
    const name  = document.getElementById('editHotelName').value.trim();
    const price = document.getElementById('editPricePerNight').value.trim();
    const total = document.getElementById('editTotalRooms').value.trim();
    const avail = document.getElementById('editAvailableRooms').value.trim();
    if (!name)                                        { fieldErr('editHotelName','Hotel name is required'); ok=false; }
    if (!price||isNaN(price)||parseFloat(price)<1)    { fieldErr('editPricePerNight','Enter a valid price (min 1)'); ok=false; }
    if (!total||isNaN(total)||parseInt(total)<1)      { fieldErr('editTotalRooms','Enter valid total rooms'); ok=false; }
    if (avail===''||isNaN(avail)||parseInt(avail)<0)  { fieldErr('editAvailableRooms','Enter valid available rooms'); ok=false; }
    if (ok && parseInt(avail)>parseInt(total))        { fieldErr('editAvailableRooms','Cannot exceed total rooms'); ok=false; }
    return ok;
  }

  // ── Submit update ──────────────────────────────────
  document.getElementById('editForm').addEventListener('submit', async function(e){
    e.preventDefault();
    if (!validate() || submitting) return;
    submitting = true;
    const btn = document.getElementById('updateBtn');
    btn.disabled = true; btn.textContent = 'Updating...';
    try {
      const mgrVal = document.getElementById('editManager').value;
      const payload = {
        name:           document.getElementById('editHotelName').value.trim(),
        pricePerNight:  parseFloat(document.getElementById('editPricePerNight').value),
        starRating:     parseInt(document.getElementById('editStarRating').value),
        totalRooms:     parseInt(document.getElementById('editTotalRooms').value),
        availableRooms: parseInt(document.getElementById('editAvailableRooms').value),
        description:    document.getElementById('editDescription').value.trim() || null,
        isActive:       document.getElementById('editIsActive').value === 'true',
        managerId:      mgrVal ? parseInt(mgrVal) : null
      };
      const res = await fetch(ENDPOINTS.HOTELS.UPDATE(editingId), {
        method:'PUT',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (res.status===401){ doLogout(); return; }
      if (res.status===404){ showToast('Hotel listing not found','error'); closeEditModal(); return; }
      if (res.status===400){ showToast(data.message||'Invalid input','error'); return; }
      if (!res.ok)         { showToast(data.message||'Update failed. Please try again.','error'); return; }
      showToast('Hotel listing updated successfully','success');
      closeEditModal();
      await loadHotels();
    } catch(err){
      showToast('Network error. Please try again.','error');
    } finally {
      submitting = false;
      btn.disabled = false; btn.textContent = 'Update Listing';
    }
  });

  // ── Toggle active/inactive ─────────────────────────
  window.toggleStatus = async function(hotelId, isActive){
    try {
      const res = await fetch(ENDPOINTS.HOTELS.UPDATE(hotelId), {
        method:'PUT',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body: JSON.stringify({ isActive: !isActive })
      });
      if (res.status===401){ doLogout(); return; }
      if (!res.ok){ showToast('Failed to update status','error'); return; }
      showToast(`Hotel ${isActive?'deactivated':'activated'} successfully`,'success');
      await loadHotels();
    } catch(e){
      showToast('Network error. Please try again.','error');
    }
  };

  // Blur validation for required fields (edit form)
  ['editHotelName','editTotalRooms','editAvailableRooms'].forEach(id=>{
    document.getElementById(id).addEventListener('blur', function(){
      if (!this.value.trim()) fieldErr(id, 'This field is required');
    });
  });

  // Blur validation for add form required fields
  document.getElementById('addPricePerNight').addEventListener('blur', function(){
    if (!this.value.trim() || parseFloat(this.value) < 1) addFieldErr('addPricePerNight','Enter a valid price (min PKR 1)');
  });

  // Auto-format phone: digits only, dash after 4th digit, max 11 digits (03XX-XXXXXXX)
  document.getElementById('addContactNumber').addEventListener('input', function(){
    const digits = this.value.replace(/\D/g,'').slice(0,11);
    this.value = digits.length > 4 ? digits.slice(0,4)+'-'+digits.slice(4) : digits;
  });
  document.getElementById('addContactNumber').addEventListener('blur', function(){
    const v = this.value.trim();
    if (!v) addFieldErr('addContactNumber','Contact number is required');
    else if (!PHONE_RE.test(v)) addFieldErr('addContactNumber','Format must be 03XX-XXXXXXX');
  });
  document.getElementById('addEmail').addEventListener('blur', function(){
    const v = this.value.trim();
    if (!v) addFieldErr('addEmail','Email is required');
    else if (!EMAIL_RE.test(v)) addFieldErr('addEmail','Enter a valid email address');
  });
  document.getElementById('addAddress').addEventListener('blur', function(){
    if (!this.value.trim()) addFieldErr('addAddress','Address is required');
  });

  // ── Add Hotel Modal ────────────────────────────────
  let addSubmitting = false;

  async function populateAddDropdowns(){
    // Destinations
    const destSel = document.getElementById('addDestination');
    // Managers
    const mgrSel  = document.getElementById('addManager');
    try {
      const [dRes, mRes] = await Promise.all([
        fetch(ENDPOINTS.DESTINATIONS.SEARCH, { headers:{'Authorization':'Bearer '+token} }),
        fetch(ENDPOINTS.HOTELS.MANAGERS,     { headers:{'Authorization':'Bearer '+token} })
      ]);
      if (dRes.ok){
        const dests = await dRes.json();
        destSel.innerHTML = '<option value="">— Select Destination —</option>' +
          dests.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('');
      } else {
        destSel.innerHTML = '<option value="">Unable to load destinations</option>';
      }
      if (mRes.ok){
        const mgrs = await mRes.json();
        if (mgrs.length===0){
          mgrSel.innerHTML = '<option value="">No hotel managers registered</option>';
        } else {
          mgrSel.innerHTML = '<option value="">— Select Manager —</option>' +
            mgrs.map(m=>`<option value="${m.id}">${esc(m.fullName)} (${esc(m.email)})</option>`).join('');
        }
      } else {
        mgrSel.innerHTML = '<option value="">Unable to load managers</option>';
      }
    } catch(e){
      destSel.innerHTML = '<option value="">Error loading destinations</option>';
      mgrSel.innerHTML  = '<option value="">Error loading managers</option>';
    }
  }

  window.openAddModal = function(){
    document.getElementById('addForm').reset();
    clearAddErrors();
    document.getElementById('addModalOverlay').classList.add('show');
    populateAddDropdowns();
    document.getElementById('addHotelName').focus();
  };
  window.closeAddModal = function(){
    document.getElementById('addModalOverlay').classList.remove('show');
  };
  document.getElementById('addModalOverlay').addEventListener('click',function(e){
    if (e.target===this) closeAddModal();
  });

  function clearAddErrors(){
    document.querySelectorAll('#addForm .field-err').forEach(el=>el.textContent='');
    document.querySelectorAll('#addForm .err').forEach(el=>el.classList.remove('err'));
  }
  function addFieldErr(id, msg){
    const el = document.getElementById(id);
    if (el) el.classList.add('err');
    const errEl = document.getElementById(id+'Error');
    if (errEl) errEl.textContent = msg;
  }
  const PHONE_RE = /^03\d{2}-\d{7}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateAddForm(){
    clearAddErrors();
    let ok = true;
    const name    = document.getElementById('addHotelName').value.trim();
    const dest    = document.getElementById('addDestination').value;
    const mgr     = document.getElementById('addManager').value;
    const price   = document.getElementById('addPricePerNight').value.trim();
    const total   = document.getElementById('addTotalRooms').value.trim();
    const avail   = document.getElementById('addAvailableRooms').value.trim();
    const contact = document.getElementById('addContactNumber').value.trim();
    const email   = document.getElementById('addEmail').value.trim();
    const address = document.getElementById('addAddress').value.trim();
    if (!name)                                        { addFieldErr('addHotelName','Hotel name is required'); ok=false; }
    if (!dest)                                        { addFieldErr('addDestination','Please select a destination'); ok=false; }
    if (!mgr)                                         { addFieldErr('addManager','Please select a hotel manager'); ok=false; }
    if (!price||isNaN(price)||parseFloat(price)<1)    { addFieldErr('addPricePerNight','Enter a valid price (min PKR 1)'); ok=false; }
    if (!total||isNaN(total)||parseInt(total)<1)      { addFieldErr('addTotalRooms','Enter valid total rooms (min 1)'); ok=false; }
    if (avail===''||isNaN(avail)||parseInt(avail)<0)  { addFieldErr('addAvailableRooms','Enter valid available rooms (min 0)'); ok=false; }
    if (ok && parseInt(avail)>parseInt(total))        { addFieldErr('addAvailableRooms','Cannot exceed total rooms'); ok=false; }
    if (!contact)                                     { addFieldErr('addContactNumber','Contact number is required'); ok=false; }
    else if (!PHONE_RE.test(contact))                 { addFieldErr('addContactNumber','Format must be 03XX-XXXXXXX'); ok=false; }
    if (!email)                                       { addFieldErr('addEmail','Email is required'); ok=false; }
    else if (!EMAIL_RE.test(email))                   { addFieldErr('addEmail','Enter a valid email address'); ok=false; }
    if (!address)                                     { addFieldErr('addAddress','Address is required'); ok=false; }
    return ok;
  }

  document.getElementById('addForm').addEventListener('submit', async function(e){
    e.preventDefault();
    if (!validateAddForm() || addSubmitting) return;
    addSubmitting = true;
    const btn = document.getElementById('addBtn');
    btn.disabled = true; btn.textContent = 'Adding...';
    try {
      const payload = {
        hotelName:      document.getElementById('addHotelName').value.trim(),
        destinationId:  parseInt(document.getElementById('addDestination').value),
        managerId:      parseInt(document.getElementById('addManager').value),
        pricePerNight:  parseFloat(document.getElementById('addPricePerNight').value),
        starRating:     parseInt(document.getElementById('addStarRating').value),
        totalRooms:     parseInt(document.getElementById('addTotalRooms').value),
        availableRooms: parseInt(document.getElementById('addAvailableRooms').value),
        contactNumber:  document.getElementById('addContactNumber').value.trim(),
        address:        document.getElementById('addAddress').value.trim(),
        email:          document.getElementById('addEmail').value.trim(),
        description:    document.getElementById('addDescription').value.trim() || null,
      };
      const res = await fetch(ENDPOINTS.HOTELS.CREATE, {
        method:'POST',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (res.status===401){ doLogout(); return; }
      if (res.status===400){ showToast(data.message||'Invalid input','error'); return; }
      if (!res.ok)         { showToast(data.message||'Failed to add hotel. Please try again.','error'); return; }
      showToast('Hotel added successfully','success');
      closeAddModal();
      await loadHotels();
    } catch(err){
      showToast('Network error. Please try again.','error');
    } finally {
      addSubmitting = false;
      btn.disabled = false; btn.textContent = 'Add Hotel';
    }
  });

  loadHotels();
  (async function(){try{const r=await fetch(ENDPOINTS.ADMIN.FLAGS_COUNT,{headers:{Authorization:'Bearer '+token}});if(!r.ok)return;const {count}=await r.json();const b=document.getElementById('moderationBadge');if(b){if(count>0){b.textContent=count;b.style.display='';}else b.style.display='none';}}catch(e){}})();
})();
