/**
 * app.js — CLEM Divine Breakthrough Assembly
 * All UI behavior for the public site and admin dashboard.
 *
 * Loaded as a plain (non-module) script, after firebase-service.js.
 * Functions referenced by inline onclick/onsubmit attributes in index.html
 * are intentionally kept as global functions here so existing markup keeps
 * working unchanged.
 */

/* ── Loading Screen ── */
window.addEventListener("load", () => setTimeout(() => document.getElementById("loading-screen").classList.add("hide"), 2600));

/* ── Demo-mode notice ──
 * firebase-service.js runs first (see index.html script order) and sets
 * window.__adminIsConfigured synchronously, so it's safe to read here.
 */
(function () {
  const banner = document.getElementById("demo-mode-banner");
  if (banner) banner.style.display = window.__adminIsConfigured ? "none" : "block";
})();

/* ── Navbar scroll (rAF-throttled so scroll work runs at most once per frame) ── */
let _scrollTicking = false;
function handleScroll() {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 50);
  const btt = document.getElementById("back-to-top");
  if (btt) btt.classList.toggle("visible", window.scrollY > 500);
  // Scroll progress
  const prog = document.getElementById("scroll-progress");
  if (prog) prog.style.width = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100) + "%";
  // Active nav
  document.querySelectorAll("section[id]").forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 130) {
      document.querySelectorAll(".nav-links a").forEach(a => {
        a.classList.toggle("active-nav", a.getAttribute("href") === "#" + sec.id);
      });
    }
  });
  _scrollTicking = false;
}
window.addEventListener("scroll", () => {
  if (!_scrollTicking) { requestAnimationFrame(handleScroll); _scrollTicking = true; }
}, { passive: true });

/* ── Mobile menu ── */
document.getElementById("hamburger").addEventListener("click", () => document.getElementById("mobile-menu").classList.toggle("open"));
function closeMobileMenu() { document.getElementById("mobile-menu").classList.remove("open"); }

/* ── Dark/Light mode ── */
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  const icon = document.getElementById("theme-icon");
  if (icon) icon.className = next === "dark" ? "fas fa-sun" : "fas fa-moon";
  localStorage.setItem("clem-theme", next);
}
(function() {
  const saved = localStorage.getItem("clem-theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
    const icon = document.getElementById("theme-icon");
    if (icon) icon.className = saved === "dark" ? "fas fa-sun" : "fas fa-moon";
  }
})();

/* ── Scroll Reveal ── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObs.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal,.reveal-left,.reveal-right").forEach(el => revealObs.observe(el));

/* ── Animated counters ── */
function runCounters() {
  document.querySelectorAll(".counter").forEach(el => {
    const target = parseInt(el.getAttribute("data-target"));
    let cur = 0; const step = Math.ceil(target / 80);
    const t = setInterval(() => { cur = Math.min(cur+step, target); el.textContent = cur.toLocaleString(); if (cur >= target) clearInterval(t); }, 20);
  });
}
new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { runCounters(); } }, {threshold:.5})
  .observe(document.querySelector(".hero-stats") || document.body);

/* ── Hero canvas particles ── */
(function() {
  const canvas = document.getElementById("hero-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener("resize", resize);
  const particles = Array.from({length:80}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height,
    r: Math.random()*2+.5, dx:(Math.random()-.5)*.4, dy:(Math.random()-.5)*.4, a:Math.random()
  }));
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${p.a*.5})`; ctx.fill();
      p.x+=p.dx; p.y+=p.dy;
      if(p.x<0) p.x=canvas.width; if(p.x>canvas.width) p.x=0;
      if(p.y<0) p.y=canvas.height; if(p.y>canvas.height) p.y=0;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── Mini Calendar ── */
let calDate = new Date();
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const EVENT_DAYS = [15, 22, 29];
function renderCalendar() {
  const label = document.getElementById("cal-month-label");
  const grid  = document.getElementById("cal-grid");
  if (!label || !grid) return;
  label.textContent = MONTHS[calDate.getMonth()] + " " + calDate.getFullYear();
  grid.innerHTML = "";
  DAYS.forEach(d => { const el=document.createElement("div"); el.className="cal-day-label"; el.textContent=d; grid.appendChild(el); });
  const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth()+1, 0).getDate();
  const today = new Date();
  for (let i=0; i<firstDay; i++) grid.appendChild(document.createElement("div"));
  for (let d=1; d<=daysInMonth; d++) {
    const el = document.createElement("div"); el.className = "cal-day"; el.textContent = d;
    if (d===today.getDate() && calDate.getMonth()===today.getMonth() && calDate.getFullYear()===today.getFullYear()) el.classList.add("today");
    if (EVENT_DAYS.includes(d)) el.classList.add("has-event");
    grid.appendChild(el);
  }
}
function prevMonth() { calDate.setMonth(calDate.getMonth()-1); renderCalendar(); }
function nextMonth() { calDate.setMonth(calDate.getMonth()+1); renderCalendar(); }
renderCalendar();

/* ── Countdown to next Sunday 8AM ── */
function updateCountdown() {
  const now = new Date();
  const next = new Date(now);
  const days = (7-now.getDay())%7||7;
  next.setDate(now.getDate()+days); next.setHours(8,0,0,0);
  const diff = next - now;
  if (diff < 0) return;
  const pad = n => String(Math.floor(n)).padStart(2,"0");
  document.getElementById("cd-days").textContent  = pad(diff/86400000);
  document.getElementById("cd-hours").textContent = pad((diff%86400000)/3600000);
  document.getElementById("cd-mins").textContent  = pad((diff%3600000)/60000);
  document.getElementById("cd-secs").textContent  = pad((diff%60000)/1000);
  // next-sun-day label in live section
  const nsd = document.getElementById("next-sun-day");
  if (nsd) { const s=new Date(now); s.setDate(now.getDate()+days); nsd.textContent=s.getDate(); }
}
setInterval(updateCountdown, 1000); updateCountdown();

/* ── Gallery filters ── */
document.querySelectorAll(".filter-btn").forEach(btn => btn.addEventListener("click", function() {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  this.classList.add("active");
  const f = this.dataset.filter;
  document.querySelectorAll(".gallery-item").forEach(el => { el.style.display = (f==="all"||el.dataset.category===f) ? "" : "none"; });
}));

/* ── Lightbox ── */
let lbItems=[], lbIndex=0, lbPlaying=false, lbTimer=null, lbZoomed=false;

function wireGalleryItems() {
  document.querySelectorAll("#gallery-grid .gallery-item").forEach((el, i) => {
    el.onclick = () => openLightbox(i);
  });
}
wireGalleryItems();

new MutationObserver(wireGalleryItems).observe(document.getElementById("gallery-grid")||document.body, {childList:true});

function collectLbItems() {
  lbItems = [];
  document.querySelectorAll("#gallery-grid .gallery-item").forEach(el => {
    const bg  = el.style.backgroundImage;
    const url = bg ? bg.replace(/url\(["']?([^"')]+)["']?\)/, "$1") : null;
    const cap = (el.querySelector(".gallery-overlay span")||el.querySelector(".gallery-placeholder span")||{textContent:"Photo"}).textContent;
    lbItems.push({ url, caption: cap, category: el.dataset.category||"gallery" });
  });
}

function openLightbox(idx) {
  collectLbItems();
  if (!lbItems.length) return;
  document.body.style.overflow = "hidden";
  document.getElementById("lightbox").classList.add("open");
  buildLbThumbs();
  lbGoTo(idx||0);
}
window.openLightbox = openLightbox;

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
  lbStop();
  lbZoomed = false;
  const wrap = document.getElementById("lb-img-wrap");
  if (wrap) wrap.classList.remove("zoomed");
}
window.closeLightbox = closeLightbox;

function lbGoTo(idx) {
  lbIndex = ((idx % lbItems.length) + lbItems.length) % lbItems.length;
  const item = lbItems[lbIndex];
  const wrap = document.getElementById("lb-img-wrap");
  if (!wrap) return;
  wrap.innerHTML = "";
  lbZoomed = false; wrap.classList.remove("zoomed");
  if (item.url && item.url.startsWith("http")) {
    const img = new Image(); img.alt = item.caption; img.style.opacity="0";
    img.onload = () => img.style.opacity = "1"; img.src = item.url; wrap.appendChild(img);
  } else {
    wrap.innerHTML = `<div class="lb-placeholder"><i class="fas fa-image"></i><p>${item.caption}</p><span>Upload images via Admin &rarr; Gallery</span></div>`;
  }
  const capEl = document.getElementById("lb-caption-text");
  const cntEl = document.getElementById("lb-counter");
  if (capEl) capEl.textContent = item.caption + " · " + item.category.charAt(0).toUpperCase()+item.category.slice(1);
  if (cntEl) cntEl.textContent = (lbIndex+1) + " / " + lbItems.length;
  document.querySelectorAll(".lb-thumb").forEach((t,i) => {
    t.classList.toggle("active", i===lbIndex);
    if (i===lbIndex) t.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
  });
  let bar = document.querySelector(".lb-slideshow-bar");
  if (!bar) { bar=document.createElement("div"); bar.className="lb-slideshow-bar"; document.getElementById("lightbox").appendChild(bar); }
  bar.style.transition="none"; bar.style.width="0%";
  if (lbPlaying) setTimeout(() => { bar.style.transition="width 4s linear"; bar.style.width="100%"; }, 50);
}

function buildLbThumbs() {
  const tb = document.getElementById("lb-thumbs"); if (!tb) return;
  tb.innerHTML = "";
  lbItems.forEach((item,i) => {
    const th = document.createElement("div"); th.className="lb-thumb"+(i===lbIndex?" active":"");
    if (item.url) { const img=new Image(); img.src=item.url; img.style.cssText="width:100%;height:100%;object-fit:cover;"; th.appendChild(img); }
    else th.innerHTML = `<i class="fas fa-image"></i>`;
    th.addEventListener("click", () => lbGoTo(i)); tb.appendChild(th);
  });
}

function lbStart() {
  lbPlaying=true;
  const btn=document.getElementById("lb-slideshow-btn"), ic=document.getElementById("lb-ss-icon");
  if(btn) btn.classList.add("playing"); if(ic) ic.className="fas fa-pause";
  lbTimer = setInterval(() => lbGoTo(lbIndex+1), 4000);
}
function lbStop() {
  lbPlaying=false; clearInterval(lbTimer);
  const btn=document.getElementById("lb-slideshow-btn"), ic=document.getElementById("lb-ss-icon");
  if(btn) btn.classList.remove("playing"); if(ic) ic.className="fas fa-play";
  const bar=document.querySelector(".lb-slideshow-bar"); if(bar){bar.style.transition="none";bar.style.width="0%";}
}

document.getElementById("lb-close").addEventListener("click", closeLightbox);
document.getElementById("lb-prev").addEventListener("click", e => { e.stopPropagation(); lbGoTo(lbIndex-1); });
document.getElementById("lb-next").addEventListener("click", e => { e.stopPropagation(); lbGoTo(lbIndex+1); });
document.getElementById("lb-slideshow-btn").addEventListener("click", () => lbPlaying ? lbStop() : lbStart());
document.getElementById("lb-img-wrap").addEventListener("click", () => {
  lbZoomed = !lbZoomed;
  document.getElementById("lb-img-wrap").classList.toggle("zoomed", lbZoomed);
});
document.getElementById("lightbox").addEventListener("click", e => { if (e.target===document.getElementById("lightbox")) closeLightbox(); });

// Touch swipe
let touchX = 0;
document.getElementById("lightbox").addEventListener("touchstart", e => { touchX=e.changedTouches[0].clientX; },{passive:true});
document.getElementById("lightbox").addEventListener("touchend", e => { const dx=e.changedTouches[0].clientX-touchX; if(Math.abs(dx)>50) lbGoTo(dx<0?lbIndex+1:lbIndex-1); });

/* ── Copy account number ── */
function copyAccountNumber() {
  navigator.clipboard.writeText("1310288373").then(() => {
    const btn = document.getElementById("copy-btn");
    if (btn) { btn.classList.add("copied"); btn.innerHTML = `<i class="fas fa-check"></i> Copied!`; }
    showToast("✅ Account number copied!", "success");
    setTimeout(() => { if(btn){btn.classList.remove("copied");btn.innerHTML=`<i class="fas fa-copy"></i> Copy Account Number`;} }, 2500);
  }).catch(() => showToast("Copy failed — please copy manually: 1310288373","error"));
}

/* ── QR Code canvas ── */
(function() {
  const canvas = document.getElementById("qr-canvas"); if (!canvas) return;
  const ctx=canvas.getContext("2d"), SIZE=130, MOD=5, MODS=Math.floor(SIZE/MOD);
  const seed="1310288373";
  function rnd(i) { let h=0; for(let j=0;j<seed.length;j++) h=(Math.imul(31,h)+seed.charCodeAt(j))|0; h=(Math.imul(h,i+1)^(h>>>16))|0; return (h>>>0)/0xffffffff; }
  ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,SIZE,SIZE);
  for (let r=0;r<MODS;r++) for (let c=0;c<MODS;c++) {
    const tl=r<7&&c<7, tr=r<7&&c>=MODS-7, bl=r>=MODS-7&&c<7;
    const finder=tl||tr||bl;
    let dark;
    if (finder) {
      const re=r===0||r===6||r===MODS-1||r===MODS-7, ce=c===0||c===6||c===MODS-1||c===MODS-7;
      const inn=(tl&&r>=2&&r<=4&&c>=2&&c<=4)||(tr&&r>=2&&r<=4&&c>=MODS-5&&c<=MODS-3)||(bl&&r>=MODS-5&&r<=MODS-3&&c>=2&&c<=4);
      dark=re||ce||inn;
    } else dark=rnd(r*MODS+c)>.52;
    ctx.fillStyle=dark?"#003366":"#ffffff";
    ctx.fillRect(c*MOD,r*MOD,MOD,MOD);
  }
  ctx.fillStyle="#003366"; ctx.font="bold 6px Arial"; ctx.textAlign="center";
  ctx.fillText("1310288373",SIZE/2,SIZE-1);
})();

/* ── Giving progress bars ── */
(function() {
  const goals = [
    { label:"🎯 Building Fund 2025",   raised:2850000, target:5000000 },
    { label:"🌍 Mission Outreach Fund", raised:320000,  target:500000  },
  ];
  const givingLeft = document.querySelector(".giving-layout > div:first-child");
  if (!givingLeft) return;
  goals.forEach(g => {
    const pct = Math.min(100, Math.round(g.raised/g.target*100));
    const wrap = document.createElement("div"); wrap.className = "giving-goal-wrap";
    wrap.innerHTML = `<div class="giving-goal-header"><span class="giving-goal-label">${g.label}</span><span class="giving-goal-pct">${pct}%</span></div>
      <div class="giving-goal-bar"><div class="giving-goal-fill" data-pct="${pct}"></div></div>
      <div class="giving-goal-amounts"><span>₦${g.raised.toLocaleString()} raised</span><span>Goal: ₦${g.target.toLocaleString()}</span></div>`;
    givingLeft.appendChild(wrap);
  });
  new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting) e.target.querySelectorAll(".giving-goal-fill").forEach(f => f.style.width=f.dataset.pct+"%"); });
  },{threshold:.4}).observe(givingLeft);
})();

/* ── Audio player ── */
let playerPlaying=false, playerProgress=0, playerTimer=null;
function playSermon(title, speaker) {
  document.getElementById("player-title").textContent = title;
  document.getElementById("player-speaker").textContent = speaker;
  document.getElementById("audio-player-bar").classList.add("active");
  playerPlaying=true;
  document.getElementById("play-icon").className="fas fa-pause";
  startPlayerTick();
  showToast(`▶ Now Playing: "${title}"`, "info");
}
function togglePlay() {
  playerPlaying=!playerPlaying;
  document.getElementById("play-icon").className=playerPlaying?"fas fa-pause":"fas fa-play";
  playerPlaying ? startPlayerTick() : clearInterval(playerTimer);
}
function startPlayerTick() {
  clearInterval(playerTimer);
  playerTimer = setInterval(() => {
    if (playerProgress<100) {
      playerProgress+=.05;
      document.getElementById("progress-fill").style.width=playerProgress+"%";
      const m=Math.floor(playerProgress*.58), s=Math.floor((playerProgress*.58*60)%60);
      document.getElementById("p-current").textContent=`${m}:${String(s).padStart(2,"0")}`;
    } else { clearInterval(playerTimer); closePlayer(); }
  }, 500);
}
function seekBack()    { playerProgress=Math.max(0,playerProgress-4.3); }
function seekForward() { playerProgress=Math.min(100,playerProgress+4.3); }
function scrubProgress(e) { const r=e.currentTarget.getBoundingClientRect(); playerProgress=((e.clientX-r.left)/r.width)*100; }
function closePlayer() {
  clearInterval(playerTimer); playerPlaying=false; playerProgress=0;
  document.getElementById("audio-player-bar").classList.remove("active");
  document.getElementById("progress-fill").style.width="0%";
  document.getElementById("play-icon").className="fas fa-play";
}

/* ── Toast ── */
function showToast(msg, type="info") {
  const c=document.getElementById("toast-container");
  const t=document.createElement("div"); t.className=`toast ${type}`;
  const icons={success:"fa-check-circle",error:"fa-exclamation-circle",info:"fa-info-circle"};
  t.innerHTML=`<i class="fas ${icons[type]||icons.info}"></i> ${msg}`;
  c.appendChild(t);
  requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add("show")));
  setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),400);},4500);
}
window.showToast = showToast;

/* ── Forms ── */
document.getElementById("testimony-form").addEventListener("submit", function(e) {
  e.preventDefault();
  const name=document.getElementById("t-name").value, title=document.getElementById("t-title").value, details=document.getElementById("t-details").value;
  if (window._submitTestimony) window._submitTestimony(name, title, details);
  this.reset();
  showToast("🙏 Testimony submitted! Pending review. God bless you!", "success");
});

document.getElementById("prayer-form").addEventListener("submit", function(e) {
  e.preventDefault();
  const name=document.getElementById("p-name").value, phone=document.getElementById("p-phone").value,
        email=document.getElementById("p-email").value, req=document.getElementById("p-request").value;
  if (window._submitPrayer) window._submitPrayer(name, phone, email, req);
  this.reset();
  showToast("🔥 Prayer request received! Our team is interceding for you.", "success");
});

document.getElementById("giving-form").addEventListener("submit", function(e) {
  e.preventDefault();
  const data = {
    name:    document.getElementById("g-name").value,
    phone:   document.getElementById("g-phone").value,
    amount:  document.getElementById("g-amount").value,
    purpose: document.getElementById("g-purpose").value,
    message: document.getElementById("g-msg").value
  };
  if (window._saveGiving) window._saveGiving(data);
  this.reset();
  showToast(`✅ Thank you, ${data.name}! ₦${Number(data.amount).toLocaleString()} ${data.purpose} confirmed. God bless you!`, "success");
});

/* ── Admin ──
 * Authentication itself lives in firebase-service.js, which exposes
 * window.__adminSignIn(identifier, password) → {ok, message}. That keeps
 * real credential checking off the client in production (Firebase Auth)
 * instead of the previous hardcoded username/password pair. See README.md
 * for setup and /firestore.rules for the matching database rules.
 */
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && e.key==="A") { e.preventDefault(); document.getElementById("admin-overlay").classList.add("open"); }
  if (e.ctrlKey && (e.key==="k"||e.key==="K")) { e.preventDefault(); openSearch(); }
  if (e.key==="Escape") {
    closeLightbox();
    closeSearch();
    closeJoinModal();
    ["add-event-modal","add-sermon-modal","add-gallery-modal","add-ann-modal"].forEach(id => closeModal(id));
    document.getElementById("admin-overlay").classList.remove("open");
  }
});
async function adminLogin() {
  const u = document.getElementById("admin-user").value.trim();
  const p = document.getElementById("admin-pass").value;
  const btn = document.querySelector('#admin-overlay button[onclick="adminLogin()"]');
  if (btn) { btn.disabled = true; btn.dataset.origLabel = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…'; }

  const result = await (window.__adminSignIn ? window.__adminSignIn(u, p) : Promise.resolve({ ok:false, message:"Auth service unavailable." }));

  if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.origLabel; }

  if (result.ok) {
    document.getElementById("admin-overlay").classList.remove("open");
    document.getElementById("admin-panel").classList.add("open");
    document.body.style.overflow="hidden";
    document.getElementById("admin-pass").value = "";
    buildDashChart();
    showToast("Welcome to the Admin Dashboard!", "success");
  } else {
    showToast(result.message || "Invalid credentials. Please try again.", "error");
  }
}
function closeAdminLogin() { document.getElementById("admin-overlay").classList.remove("open"); }
async function closeAdminPanel() {
  document.getElementById("admin-panel").classList.remove("open"); document.body.style.overflow="";
  if (window.__adminIsConfigured && window.__adminSignOut) await window.__adminSignOut();
}

function switchTab(id, btn) {
  document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  btn.classList.add("active");
}

function buildDashChart() {
  const chart=document.getElementById("dash-bar-chart"); if(!chart||chart.children.length>0) return;
  [{l:"Jan",v:18},{l:"Feb",v:22},{l:"Mar",v:30},{l:"Apr",v:25},{l:"May",v:40},{l:"Jun",v:35}].forEach(d => {
    const col=document.createElement("div"); col.className="bar-col";
    col.innerHTML=`<div class="bar-val">${d.v}</div><div class="bar-fill" data-h="${Math.round(d.v/40*90)+10}" style="height:4px;"></div><div class="bar-label">${d.l}</div>`;
    chart.appendChild(col);
  });
  setTimeout(() => chart.querySelectorAll(".bar-fill").forEach(b => b.style.height=b.dataset.h+"px"), 100);
}

function approveAdminRow(btn, collection, id) {
  const row=btn.closest("tr"), badge=row.querySelector(".status-badge");
  if (badge) { badge.className="status-badge status-approved"; badge.textContent="Approved"; }
  btn.remove();
  if (id && window[`_approve${collection.charAt(0).toUpperCase()+collection.slice(1)}`]) window[`_approve${collection.charAt(0).toUpperCase()+collection.slice(1)}`](id);
  showToast("✅ Record approved!", "success");
}
function deleteAdminRow(btn, collection, id) {
  const row=btn.closest("tr")||btn.closest(".ann-list-item");
  if (row) { row.style.opacity=".3"; setTimeout(()=>row.remove(),300); }
  if (id && window._deleteEvent && collection==="events") window._deleteEvent(id);
  if (id && window._deleteTestimony && collection==="testimonies") window._deleteTestimony(id);
  if (id && window._deletePrayer && collection==="prayerRequests") window._deletePrayer(id);
  if (id && window._deleteSermon && collection==="sermons") window._deleteSermon(id);
  if (id && window._deleteAnnouncement && collection==="announcements") window._deleteAnnouncement(id);
  showToast("🗑 Record deleted.", "info");
}
function markPrayedFor(btn) { btn.closest("tr").style.opacity=".5"; btn.remove(); showToast("🙏 Marked as prayed for!","success"); }
function toggleAnnItem(btn) {
  const dot=btn.closest(".ann-list-item").querySelector(".ann-status-dot");
  const active=dot.classList.contains("active");
  dot.classList.toggle("active",!active); dot.classList.toggle("inactive",active);
  showToast(`Announcement ${!active?"activated":"deactivated"}.`,"info");
}

/* ── Modal helpers ── */
function openModal(id)  { document.getElementById(id).classList.add("open");    document.body.style.overflow="hidden"; }
function closeModal(id) { document.getElementById(id).classList.remove("open"); document.body.style.overflow=""; }
document.querySelectorAll(".modal-overlay").forEach(el => el.addEventListener("click", function(e) { if(e.target===this) closeModal(this.id); }));

/* ── Form handlers for admin modals ── */
function saveEvent(e) {
  e.preventDefault();
  const data = { title:document.getElementById("ev-title").value, date:document.getElementById("ev-date").value, time:document.getElementById("ev-time").value, location:document.getElementById("ev-location").value, type:document.getElementById("ev-type").value, description:document.getElementById("ev-desc").value };
  if (window._saveEvent) window._saveEvent(data);
  e.target.reset(); closeModal("add-event-modal");
  showToast(`📅 Event "${data.title}" added!`, "success");
}
function saveSermon(e) {
  e.preventDefault();
  const data = { title:document.getElementById("sr-title").value, speaker:document.getElementById("sr-speaker").value, date:document.getElementById("sr-date").value, series:document.getElementById("sr-series").value, duration:document.getElementById("sr-duration").value, url:document.getElementById("sr-url").value, scripture:document.getElementById("sr-scripture").value, description:document.getElementById("sr-desc").value };
  const pw=document.getElementById("sr-progress-wrap"), pf=document.getElementById("sr-progress-fill");
  if (pw) pw.style.display="block";
  let p=0; const t=setInterval(()=>{ p=Math.min(p+15,100); if(pf) pf.style.width=p+"%"; if(p>=100){clearInterval(t);setTimeout(()=>{if(pw)pw.style.display="none";if(pf)pf.style.width="0%";},400);} },80);
  if (window._saveSermon) window._saveSermon(data);
  e.target.reset(); document.getElementById("sr-url-preview").classList.remove("show");
  closeModal("add-sermon-modal");
  showToast(`🎙 Sermon "${data.title}" saved!`, "success");
}
function saveGalleryImage(e) {
  e.preventDefault();
  const urlFields=document.querySelectorAll(".gallery-url-field"), catFields=document.querySelectorAll(".gallery-cat-field");
  const caption=document.getElementById("gal-caption").value;
  const images=[];
  urlFields.forEach((inp,i)=>{ const url=inp.value.trim(); if(url) images.push({url,category:catFields[i]?catFields[i].value:"worship",caption}); });
  if (!images.length) { showToast("Please enter at least one image URL.","error"); return; }
  if (window._saveGalleryImages) window._saveGalleryImages(images);
  document.getElementById("add-gallery-form").reset(); resetGalleryRows();
  closeModal("add-gallery-modal");
  showToast(`🖼 ${images.length} image${images.length>1?"s":""} added to gallery!`,"success");
}
function saveAnnouncement(e) {
  e.preventDefault();
  const data = { text:document.getElementById("ann-text").value, startDate:document.getElementById("ann-start").value, endDate:document.getElementById("ann-end").value, priority:document.getElementById("ann-priority").value, active:document.getElementById("ann-active").checked };
  if (window._saveAnnouncement) window._saveAnnouncement(data);
  e.target.reset(); closeModal("add-ann-modal");
  showToast("📢 Announcement published!", "success");
}
function toggleSermonPreview(val) { document.getElementById("sr-url-preview").classList.toggle("show", val && val.startsWith("http")); }

/* ── Gallery row helpers ── */
function addGalleryRow() {
  const c=document.getElementById("gallery-url-inputs"); if(!c) return;
  const row=document.createElement("div"); row.className="gallery-url-row";
  row.innerHTML=`<input type="url" class="gallery-url-field" placeholder="https://example.com/image.jpg">
    <select class="gallery-cat-field"><option value="worship">Worship</option><option value="conference">Conference</option><option value="choir">Choir</option><option value="youth">Youth</option><option value="children">Children</option><option value="outreach">Outreach</option></select>
    <button type="button" class="btn-icon" onclick="removeGalleryRow(this)" title="Remove"><i class="fas fa-trash"></i></button>`;
  c.appendChild(row);
}
function removeGalleryRow(btn) { const rows=document.querySelectorAll(".gallery-url-row"); if(rows.length>1) btn.closest(".gallery-url-row").remove(); else showToast("At least one URL required.","info"); }
function resetGalleryRows() {
  const c=document.getElementById("gallery-url-inputs"); if(!c) return;
  c.innerHTML=`<div class="gallery-url-row"><input type="url" class="gallery-url-field" placeholder="https://example.com/image.jpg"><select class="gallery-cat-field"><option value="worship">Worship</option><option value="conference">Conference</option><option value="choir">Choir</option><option value="youth">Youth</option><option value="children">Children</option><option value="outreach">Outreach</option></select><button type="button" class="btn-icon" onclick="removeGalleryRow(this)"><i class="fas fa-trash"></i></button></div>`;
}

/* ── Drag & drop for gallery ── */
function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add("dragover"); }
function handleDragLeave(e) { e.currentTarget.classList.remove("dragover"); }
function handleDrop(e) { e.preventDefault(); e.currentTarget.classList.remove("dragover"); const txt=e.dataTransfer.getData("text"); if(txt){const f=document.querySelector(".gallery-url-field");if(f)f.value=txt;} }

/* ── Search ── */
function openSearch()  { document.getElementById("search-overlay").classList.add("open");    document.body.style.overflow="hidden"; setTimeout(()=>document.getElementById("search-input").focus(),100); }
function closeSearch() { document.getElementById("search-overlay").classList.remove("open"); document.body.style.overflow=""; }
function goToSection(selector) { closeSearch(); const el=document.querySelector(selector); if(el) el.scrollIntoView({behavior:"smooth"}); }
document.getElementById("search-overlay").addEventListener("click", function(e){if(e.target===this)closeSearch();});

/* ── Join modal ── */
function openJoinModal()  { document.getElementById("join-modal-overlay").classList.add("open");    document.body.style.overflow="hidden"; joinStep(1); }
function closeJoinModal() { document.getElementById("join-modal-overlay").classList.remove("open"); document.body.style.overflow=""; }
function joinStep(step) {
  [1,2,3].forEach(s => {
    const el=document.getElementById(`join-step-${s}`), ind=document.getElementById(`step-${s}-ind`);
    if(el) el.style.display=s===step?"block":"none";
    if(ind){ ind.classList.toggle("active",s===step); ind.classList.toggle("done",s<step); }
  });
}
function submitJoinForm() {
  const name=`${document.getElementById("jn-fname").value} ${document.getElementById("jn-lname").value}`.trim()||"friend";
  closeJoinModal(); showToast(`🎉 Welcome, ${name}! You're now part of the CLEM family!`,"success");
}
document.getElementById("join-modal-overlay").addEventListener("click",function(e){if(e.target===this)closeJoinModal();});

/* ── Wire "Join Us" hero button to open join modal ── */
document.querySelectorAll(".hero-cta a").forEach(a => {
  if (a.textContent.trim().startsWith("Join")) {
    a.href="#"; a.addEventListener("click", e => { e.preventDefault(); openJoinModal(); });
  }
});

/* ── Announcement close ── */
function closeAnnouncement() {
  const b=document.getElementById("announcement-banner"); if(b) b.style.display="none";
}

/* ── Cookie banner ── */
if (!localStorage.getItem("clem-cookies")) setTimeout(()=>{const b=document.getElementById("cookie-banner");if(b)b.classList.add("show");},3000);
function acceptCookies()  { localStorage.setItem("clem-cookies","accepted"); document.getElementById("cookie-banner").classList.remove("show"); showToast("Cookies accepted. Thank you!","success"); }
function declineCookies() { localStorage.setItem("clem-cookies","declined"); document.getElementById("cookie-banner").classList.remove("show"); }

/* ── PWA manifest ──
 * Now a real static file (manifest.json) linked directly in index.html's
 * <head>, instead of being generated at runtime as a Blob URL. A static
 * file is cacheable, indexable by browsers before JS runs, and is what
 * "Add to Home Screen" / Lighthouse PWA audits expect.
 */

/* ── Share sermon ── */
function shareSermon() {
  if (navigator.share) {
    navigator.share({ title: 'CLEM Sermon', text: 'Listen to this powerful message from CLEM Divine Breakthrough Assembly.', url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Sermon link copied to clipboard!', 'success')).catch(() => showToast('Copy the URL from your address bar to share.', 'info'));
  }
}

/* ── Footer year ── */
document.getElementById("year").textContent = new Date().getFullYear();

console.log("%c✝ CLEM Divine Breakthrough Assembly","color:#C9A84C;font-size:18px;font-weight:bold;font-family:serif;");
console.log("%c\"A Place Where Everybody Is Somebody\"","color:#4DA6FF;font-size:12px;font-style:italic;");
console.log("%cAdmin: Ctrl+Shift+A  |  Search: Ctrl+K  |  Built to the glory of God","color:#C9A84C;font-size:11px;");
