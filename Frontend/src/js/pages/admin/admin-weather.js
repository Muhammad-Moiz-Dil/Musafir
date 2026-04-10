(function(){
  const token=sessionStorage.getItem('tripify_token');
  const user=JSON.parse(sessionStorage.getItem('tripify_user')||'{}');
  if(!token||user.userType!=='Admin'){window.location.href='../auth/admin-login.html';return;}
  const ini=(user.fullName||'SA').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('topbarInitials').textContent=ini;
  document.querySelectorAll('.fpill').forEach(p=>p.addEventListener('click',function(){document.querySelectorAll('.fpill').forEach(x=>x.classList.remove('active'));this.classList.add('active');}));
  window.doLogout=function(){sessionStorage.removeItem('tripify_token');sessionStorage.removeItem('tripify_user');window.location.href='../auth/admin-login.html';};
  // ── Live moderation badge ──────────────────────────
  (async function(){try{const r=await fetch(ENDPOINTS.ADMIN.FLAGS_COUNT,{headers:{'Authorization':'Bearer '+token}});if(!r.ok)return;const {count}=await r.json();const b=document.getElementById('moderationBadge');if(b){if(count>0)b.textContent=count;else b.style.display='none';}}catch(e){}})();
  // ── Admin profile picture ──────────────────────────
  (async function(){const _i=(user.fullName||'SA').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();try{const r=await fetch(ENDPOINTS.USER.PROFILE,{headers:{'Authorization':'Bearer '+token}});if(!r.ok)return;const u=await r.json();if(!u.profilePicture)return;const url=u.profilePicture.startsWith('http')?u.profilePicture:'http://localhost:8080'+u.profilePicture;[document.getElementById('topbarInitials'),document.getElementById('sidebarInitials')].forEach(function(el){if(!el)return;const img=document.createElement('img');img.src=url;img.alt='';img.onerror=function(){el.textContent=_i;el.style.background='';};el.textContent='';el.style.background='transparent';el.appendChild(img);});}catch(e){}})();
})();
