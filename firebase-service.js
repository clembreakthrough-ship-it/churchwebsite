/**
 * firebase-service.js
 * ────────────────────
 * All Firestore + Firebase Auth wiring for CLEM Divine Breakthrough Assembly.
 *
 * This file preserves the exact public API the rest of the app relies on
 * (window._submitTestimony, window._saveEvent, etc.) from the original
 * build, but adds two things the original was missing:
 *
 *   1. Real admin authentication via Firebase Auth, instead of a plaintext
 *      username/password pair hardcoded in client-side JavaScript (which
 *      anyone could read via "View Source" or DevTools).
 *   2. HTML-escaping of every piece of user-submitted content before it is
 *      inserted into the page, to prevent stored/DOM-based XSS from public
 *      forms (testimonies, prayer requests) reaching the admin dashboard
 *      or public page as executable markup.
 *
 * See README.md for full setup + deployment/security instructions, and
 * /firestore.rules for the database-side rules this relies on.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, updateDoc,
  deleteDoc, doc, query, orderBy, where, limit,
  serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

/* ════════════════════════════
   INIT
════════════════════════════ */
let db = null;
let auth = null;
const CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";

if (CONFIGURED) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    setFirebaseStatus(true);
  } catch (e) {
    console.error("Firebase initialization failed:", e.message);
    setFirebaseStatus(false);
  }
} else {
  setFirebaseStatus(false);
}

function setFirebaseStatus(ok) {
  document.querySelectorAll("#firebase-status-badge").forEach(el => {
    el.className = "firebase-status " + (ok ? "connected" : "disconnected");
    el.innerHTML = `<div class="status-dot"></div>${ok ? "Firebase Connected" : "Demo Mode"}`;
  });
}

/* ════════════════════════════
   SECURITY: HTML escaping
   Applied to every field that originates from a public, unauthenticated
   form before it is written into innerHTML anywhere on the page.
════════════════════════════ */
function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

/* ════════════════════════════
   ADMIN AUTHENTICATION
   Replaces the original hardcoded ADMIN_UN / ADMIN_PW check.

   - If Firebase is configured: real sign-in via Firebase Authentication.
     Grant admin access in the Firebase console (Authentication → Users)
     and, for production, gate Firestore writes to that UID — see
     /firestore.rules.
   - If Firebase is NOT configured (Demo Mode): there is no backend to
     authenticate against, so a per-session random passcode is generated
     at runtime and logged to the browser console. This intentionally
     avoids shipping a fixed password in the source for every visitor,
     while being clearly and honestly labeled as non-production.
════════════════════════════ */
let demoPasscode = null;
if (!CONFIGURED) {
  demoPasscode = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.log(
    `%cDemo Mode admin passcode (this session only): ${demoPasscode}`,
    "color:#C9A84C;font-weight:bold;font-size:12px;"
  );
  console.log(
    "%cThis is NOT a production login. Configure Firebase in firebase-config.js and deploy firestore.rules before launching publicly.",
    "color:#e08080;font-size:11px;"
  );
}

/**
 * Attempt an admin sign-in.
 * @returns {Promise<{ok:boolean, message?:string}>}
 */
window.__adminSignIn = async function (identifier, password) {
  if (CONFIGURED && auth) {
    try {
      await signInWithEmailAndPassword(auth, identifier, password);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: "Invalid email or password." };
    }
  }
  // Demo mode fallback
  if (password === demoPasscode) return { ok: true };
  return { ok: false, message: "Invalid credentials. Check the browser console for the Demo Mode passcode." };
};

window.__adminSignOut = async function () {
  if (CONFIGURED && auth) { try { await signOut(auth); } catch (e) {} }
};

window.__adminIsConfigured = CONFIGURED;

if (CONFIGURED && auth) {
  onAuthStateChanged(auth, user => {
    window.dispatchEvent(new CustomEvent("clem:admin-auth-changed", { detail: { signedIn: !!user } }));
  });
}

/* ════════════════════════════
   TESTIMONIES  (Create + Read + Update + Delete)
════════════════════════════ */
window._submitTestimony = async function (name, title, details) {
  const data = { name, title, details, status: "pending", createdAt: db ? serverTimestamp() : new Date().toISOString() };
  if (db) { try { const r = await addDoc(collection(db, "testimonies"), data); data.id = r.id; } catch (e) { console.error(e); } }
  addTestimonyRow(data);
  const ct = document.getElementById("stat-testimonies");
  if (ct) ct.textContent = parseInt(ct.textContent || 0) + 1;
};
window._approveTestimony = async function (id) {
  if (db && id) { try { await updateDoc(doc(db, "testimonies", id), { status: "approved" }); } catch (e) { console.error(e); } }
};
window._deleteTestimony = async function (id) {
  if (db && id) { try { await deleteDoc(doc(db, "testimonies", id)); } catch (e) { console.error(e); } }
};

function addTestimonyRow(data) {
  const tb = document.getElementById("admin-testimony-body");
  if (!tb) return;
  const tr = tb.insertRow(0);
  tr.setAttribute("data-id", data.id || "");
  tr.innerHTML = `<td>${escapeHTML(data.name)}</td><td>${escapeHTML(data.title)}</td><td>Today</td>
    <td><span class="status-badge status-pending">Pending</span></td>
    <td><button class="btn-approve" onclick="approveAdminRow(this,'testimonies','${data.id || ""}')">Approve</button>
        <button class="btn-delete"  onclick="deleteAdminRow(this,'testimonies','${data.id || ""}')">Delete</button></td>`;
}

/* Load approved testimonies onto public page */
async function loadTestimonies() {
  if (!db) return;
  try {
    const q = query(collection(db, "testimonies"), where("status", "==", "approved"), orderBy("createdAt", "desc"), limit(6));
    const snap = await getDocs(q);
    const grid = document.getElementById("testimonies-grid");
    if (!grid) return;
    snap.forEach(d => {
      const data = d.data();
      const card = document.createElement("div");
      card.className = "testimony-card";
      const initials = String(data.name || "").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
      card.innerHTML = `<div class="testimony-quote">"</div>
        <p class="testimony-text">${escapeHTML(data.details)}</p>
        <div class="testimony-author">
          <div class="testimony-avatar">${escapeHTML(initials)}</div>
          <div><div class="testimony-author-name">${escapeHTML(data.name)}</div>
               <div class="testimony-author-date">${escapeHTML(data.title)} · <span style="color:#16A34A">Verified</span></div></div>
        </div>`;
      grid.insertBefore(card, grid.firstChild);
    });
  } catch (e) { console.error(e); }
}
loadTestimonies();

/* ════════════════════════════
   PRAYER REQUESTS  (Create + Delete + Mark Prayed)
════════════════════════════ */
window._submitPrayer = async function (name, phone, email, request) {
  const data = { name, phone, email, request, prayed: false, createdAt: db ? serverTimestamp() : new Date().toISOString() };
  let id = "";
  if (db) { try { const r = await addDoc(collection(db, "prayerRequests"), data); id = r.id; } catch (e) { console.error(e); } }
  const tb = document.getElementById("admin-prayer-body");
  if (tb) {
    const tr = tb.insertRow(0);
    tr.setAttribute("data-id", id);
    tr.innerHTML = `<td>${escapeHTML(name)}</td><td>${escapeHTML(phone || "-")}</td><td>${escapeHTML(String(request).slice(0, 40))}...</td><td>Today</td>
      <td><button class="btn-approve" onclick="markPrayedFor(this)"><i class="fas fa-hands-praying"></i> Prayed</button>
          <button class="btn-delete"  onclick="deleteAdminRow(this,'prayerRequests','${id}')">Delete</button></td>`;
  }
  const ct = document.getElementById("stat-prayers");
  if (ct) ct.textContent = parseInt(ct.textContent || 0) + 1;
};
window._deletePrayer = async function (id) {
  if (db && id) { try { await deleteDoc(doc(db, "prayerRequests", id)); } catch (e) { console.error(e); } }
};

/* ════════════════════════════
   EVENTS  (Create + Read + Delete)
════════════════════════════ */
window._saveEvent = async function (data) {
  let id = "";
  if (db) { try { const r = await addDoc(collection(db, "events"), { ...data, createdAt: serverTimestamp() }); id = r.id; } catch (e) { console.error(e); } }
  data.id = id;
  appendEventToDOM(data);
  appendEventToAdminTable(data);
  const ct = document.getElementById("stat-events");
  if (ct) ct.textContent = parseInt(ct.textContent || 0) + 1;
};
window._deleteEvent = async function (id) {
  if (db && id) { try { await deleteDoc(doc(db, "events", id)); } catch (e) { console.error(e); } }
};

function appendEventToDOM(data) {
  const evMain = document.querySelector(".events-main");
  if (!evMain) return;
  const d = new Date(data.date);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("default", { month: "short" }).toUpperCase();
  const badgeMap = { worship: "badge-worship", conference: "badge-conference", outreach: "badge-outreach", youth: "badge-conference", special: "badge-worship", crusade: "badge-outreach", anniversary: "badge-worship" };
  const item = document.createElement("div");
  item.className = "event-item";
  item.setAttribute("data-event-id", data.id || "");
  item.innerHTML = `<div class="event-date-box"><div class="event-date-day">${day}</div><div class="event-date-mon">${mon}</div></div>
    <div class="event-meta">
      <div class="event-title">${escapeHTML(data.title)}</div>
      <div class="event-time-loc"><i class="far fa-clock"></i> ${fmtTime(data.time)}${data.location ? " &nbsp;·&nbsp; <i class='fas fa-map-marker-alt'></i> " + escapeHTML(data.location) : ""}</div>
      <span class="event-badge ${badgeMap[data.type] || "badge-worship"}">${cap(data.type)}</span>
    </div>`;
  evMain.prepend(item);
}
function appendEventToAdminTable(data) {
  const tb = document.getElementById("admin-events-body");
  if (!tb) return;
  const d = new Date(data.date);
  const tr = tb.insertRow(0);
  tr.setAttribute("data-id", data.id || "");
  tr.innerHTML = `<td>${escapeHTML(data.title)}</td><td>${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
    <td>${fmtTime(data.time)}</td><td><span class="event-badge badge-conference">${cap(data.type)}</span></td>
    <td><button class="btn-delete" onclick="deleteAdminRow(this,'events','${data.id || ""}')">Delete</button></td>`;
}

async function loadEvents() {
  if (!db) return;
  try {
    const q = query(collection(db, "events"), orderBy("date", "asc"), limit(20));
    const snap = await getDocs(q);
    snap.forEach(d => appendEventToDOM({ id: d.id, ...d.data() }));
  } catch (e) { console.error(e); }
}
loadEvents();

/* ════════════════════════════
   ANNOUNCEMENTS  (Create + Read + Update + Delete)
════════════════════════════ */
window._saveAnnouncement = async function (data) {
  let id = "";
  if (db) { try { const r = await addDoc(collection(db, "announcements"), { ...data, createdAt: serverTimestamp() }); id = r.id; } catch (e) { console.error(e); } }
  if (data.active) {
    const bt = document.querySelector("#announcement-banner .ann-text");
    if (bt) bt.innerHTML = `📢 <b>${escapeHTML(data.text)}</b>`;
    const ban = document.getElementById("announcement-banner");
    if (ban) ban.style.display = "flex";
  }
  const list = document.getElementById("ann-admin-list");
  if (list) {
    const item = document.createElement("div");
    item.className = "ann-list-item";
    item.setAttribute("data-id", id);
    item.innerHTML = `<div class="ann-status-dot ${data.active ? "active" : "inactive"}"></div>
      <div style="flex:1;"><div class="ann-list-text">${escapeHTML(data.text)}</div><div class="ann-list-date">Priority: ${cap(data.priority || "normal")}</div></div>
      <div class="ann-list-actions">
        <button class="btn-approve" onclick="toggleAnnItem(this)">Toggle</button>
        <button class="btn-delete"  onclick="deleteAdminRow(this,'announcements','${id}')">Delete</button>
      </div>`;
    list.prepend(item);
  }
};
window._toggleAnnouncement = async function (id, active) {
  if (db && id) { try { await updateDoc(doc(db, "announcements", id), { active }); } catch (e) { console.error(e); } }
};
window._deleteAnnouncement = async function (id) {
  if (db && id) { try { await deleteDoc(doc(db, "announcements", id)); } catch (e) { console.error(e); } }
};

async function loadAnnouncements() {
  if (!db) return;
  try {
    const q = query(collection(db, "announcements"), where("active", "==", true), orderBy("createdAt", "desc"), limit(1));
    const snap = await getDocs(q);
    snap.forEach(d => {
      const bt = document.querySelector("#announcement-banner .ann-text");
      if (bt) bt.innerHTML = `📢 <b>${escapeHTML(d.data().text)}</b>`;
    });
  } catch (e) { console.error(e); }
}
loadAnnouncements();

/* ════════════════════════════
   SERMONS  (Create + Read + Update + Delete)
════════════════════════════ */
window._saveSermon = async function (data) {
  let id = "";
  if (db) { try { const r = await addDoc(collection(db, "sermons"), { ...data, published: true, createdAt: serverTimestamp() }); id = r.id; } catch (e) { console.error(e); } }
  data.id = id;
  appendSermonToDOM(data);
  const tb = document.getElementById("admin-sermons-body");
  if (tb) {
    const tr = tb.insertRow(0);
    tr.setAttribute("data-id", id);
    tr.innerHTML = `<td>${escapeHTML(data.title)}</td><td>${escapeHTML(data.speaker)}</td><td>${escapeHTML(data.duration || "-")} mins</td><td>${escapeHTML(data.date)}</td>
      <td><button class="btn-approve" onclick="showToast('Sermon published!','success')">Publish</button>
          <button class="btn-delete" onclick="deleteAdminRow(this,'sermons','${id}')">Delete</button></td>`;
  }
  const ct = document.getElementById("stat-sermons");
  if (ct) ct.textContent = parseInt(ct.textContent || 0) + 1;
};
window._deleteSermon = async function (id) {
  if (db && id) { try { await deleteDoc(doc(db, "sermons", id)); } catch (e) { console.error(e); } }
};

function appendSermonToDOM(data) {
  const list = document.querySelector(".sermon-list");
  if (!list) return;
  const item = document.createElement("div");
  item.className = "sermon-item";
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  const safeTitle = escapeHTML(data.title);
  const safeSpeaker = escapeHTML(data.speaker);
  item.addEventListener("click", () => window.playSermon(data.title, data.speaker));
  item.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.playSermon(data.title, data.speaker); } });
  item.innerHTML = `<div class="sermon-thumb"><i class="fas fa-microphone-alt"></i></div>
    <div class="sermon-item-meta">
      <div class="sermon-item-title">${safeTitle}</div>
      <div class="sermon-item-details">
        <span><i class="fas fa-user"></i> ${escapeHTML(String(data.speaker || "").split(" ").pop())}</span>
        ${data.duration ? `<span><i class="far fa-clock"></i> ${escapeHTML(data.duration)} mins</span>` : ""}
        <span><i class="far fa-calendar"></i> ${escapeHTML(data.date)}</span>
      </div>
    </div>
    <button class="sermon-item-play" aria-label="Play ${safeTitle}"><i class="fas fa-play"></i></button>`;
  item.querySelector(".sermon-item-play").addEventListener("click", e => {
    e.stopPropagation();
    window.playSermon(data.title, data.speaker);
  });
  const uploadCard = list.querySelector(".sermon-upload-card");
  if (uploadCard) list.insertBefore(item, uploadCard); else list.appendChild(item);
}

async function loadSermons() {
  if (!db) return;
  try {
    const q = query(collection(db, "sermons"), where("published", "==", true), orderBy("createdAt", "desc"), limit(10));
    const snap = await getDocs(q);
    snap.forEach(d => appendSermonToDOM({ id: d.id, ...d.data() }));
  } catch (e) { console.error(e); }
}
loadSermons();

/* ════════════════════════════
   GALLERY  (Create + Read + Delete)
════════════════════════════ */
window._saveGalleryImages = async function (images) {
  for (const img of images) {
    if (db) { try { const r = await addDoc(collection(db, "gallery"), { ...img, createdAt: serverTimestamp() }); img.id = r.id; } catch (e) { console.error(e); } }
    appendGalleryItemToDOM(img);
  }
};
window._deleteGalleryItem = async function (id) {
  if (db && id) { try { await deleteDoc(doc(db, "gallery", id)); } catch (e) { console.error(e); } }
};

function appendGalleryItemToDOM(data) {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  const item = document.createElement("div");
  item.className = "gallery-item";
  item.setAttribute("data-category", data.category || "worship");
  item.setAttribute("data-id", data.id || "");
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.setAttribute("aria-label", `View photo: ${data.caption || cap(data.category)}`);
  if (data.url && data.url.startsWith("http")) {
    item.style.backgroundImage = `url(${JSON.stringify(data.url).slice(1, -1)})`;
    item.style.backgroundSize = "cover";
    item.style.backgroundPosition = "center";
  } else {
    item.innerHTML = `<div class="gallery-placeholder"><i class="fas fa-image"></i><span>${escapeHTML(cap(data.category))}</span></div>`;
  }
  const ov = document.createElement("div");
  ov.className = "gallery-overlay";
  ov.innerHTML = `<i class="fas fa-search-plus"></i><span>${escapeHTML(data.caption || cap(data.category))}</span>`;
  item.appendChild(ov);
  item.addEventListener("click", () => window.openLightbox());
  item.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.openLightbox(); } });
  grid.prepend(item);
  window.wireGalleryItems && window.wireGalleryItems();
}

async function loadGallery() {
  if (!db) return;
  try {
    const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"), limit(24));
    const snap = await getDocs(q);
    snap.forEach(d => appendGalleryItemToDOM({ id: d.id, ...d.data() }));
  } catch (e) { console.error(e); }
}
loadGallery();

/* ════════════════════════════
   GIVING  (Create + Read)
════════════════════════════ */
window._saveGiving = async function (data) {
  if (db) { try { await addDoc(collection(db, "giving"), { ...data, createdAt: serverTimestamp() }); } catch (e) { console.error(e); } }
  const tb = document.getElementById("admin-giving-body");
  if (tb) {
    if (tb.querySelector("td[colspan]")) tb.innerHTML = "";
    const tr = tb.insertRow(0);
    tr.innerHTML = `<td>${escapeHTML(data.name)}</td><td>₦${Number(data.amount).toLocaleString()}</td><td>${escapeHTML(data.purpose)}</td><td>Today</td>`;
  }
  const ct = document.getElementById("stat-giving");
  if (ct) ct.textContent = `₦${Number(data.amount).toLocaleString()}`;
};

/* ── Realtime listeners ── */
if (db) {
  try {
    onSnapshot(collection(db, "prayerRequests"), snap => { const el = document.getElementById("stat-prayers"); if (el) el.textContent = snap.size; });
    onSnapshot(collection(db, "testimonies"), snap => { const el = document.getElementById("stat-testimonies"); if (el) el.textContent = snap.size; });
    onSnapshot(collection(db, "events"), snap => { const el = document.getElementById("stat-events"); if (el) el.textContent = snap.size; });
    onSnapshot(collection(db, "sermons"), snap => { const el = document.getElementById("stat-sermons"); if (el) el.textContent = snap.size; });
  } catch (e) { console.error(e); }
}

/* ── Helpers (used inside module) ── */
function fmtTime(t) { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
