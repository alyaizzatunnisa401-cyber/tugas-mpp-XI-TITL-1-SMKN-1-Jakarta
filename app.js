// KELOMPOK 4 - Smart Door Frontend Dashboard (Firebase Realtime Database)
const firebaseConfig = {
  apiKey: "API_KEY_KAMU",
  authDomain: "smart-door-mpp-kel4-xi-titl-1.firebaseapp.com",
  databaseURL: "https://smart-door-mpp-kel4-xi-titl-1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-door-mpp-kel4-xi-titl-1",
  storageBucket: "smart-door-mpp-kel4-xi-titl-1.firebasestorage.app",
  messagingSenderId: "157521729698",
  appId: "1:157521729698:web:38f819d3a5940c0de5dffb"
};
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const $ = (id) => document.getElementById(id);
const state = { status: null, logs: [], users: [], lastBeat: 0 };

function setConnection(online) {
  const label = online ? "ESP32 Terhubung" : "Menunggu ESP32";
  if ($("sideConnection")) $("sideConnection").textContent = label;
  if ($("connectionPill")) {
    $("connectionPill").querySelector("span").textContent = online ? "ESP32 Online" : "Menunggu ESP32";
    $("connectionPill").querySelector(".status-dot").classList.toggle("online", online);
  }
  if ($("sideDot")) $("sideDot").classList.toggle("online", online);
  if ($("deviceStatus")) $("deviceStatus").textContent = online ? "Online" : "Offline";
  if ($("deviceDetail")) $("deviceDetail").textContent = online ? "Terhubung ke dashboard" : "Belum ada koneksi";
  if ($("espTiny")) {
    $("espTiny").textContent = online ? "ONLINE" : "OFFLINE";
    $("espTiny").classList.toggle("neutral", !online);
  }
  if ($("detailConnection")) $("detailConnection").textContent = online ? "Online" : "Offline";
}

function safeText(value, fallback = "--") {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function renderStatus(data) {
  state.status = data;
  const isAlive = data.heartbeat && (Date.now() - state.lastBeat < 15000);
  setConnection(Boolean(isAlive));

  const doorVal = safeText(data.door, "--").toUpperCase();
  if ($("doorStatus")) $("doorStatus").textContent = doorVal;
  if ($("doorDetail")) {
    $("doorDetail").textContent = doorVal === "UNLOCKED"
      ? "Akses terbuka"
      : doorVal === "LOCKED"
      ? "Pengunci aktif"
      : "Menunggu data perangkat";
  }

  if ($("ipAddress")) $("ipAddress").textContent = "IP: " + safeText(data.ip, "belum tersedia");
  if ($("detailIP")) $("detailIP").textContent = safeText(data.ip);
  if ($("lastResponse")) $("lastResponse").textContent = new Date().toLocaleTimeString("id-ID");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderLogs(logs) {
  state.logs = Array.isArray(logs) ? logs : [];
  if ($("todayCount")) $("todayCount").textContent = state.logs.length;
  if ($("todayDetail")) $("todayDetail").textContent = "Total event tercatat";

  const recent = state.logs.slice(0, 5);
  const makeRows = (items, includeUid) => items.length ? items.map(item => {
    const granted = String(item.result).toUpperCase() === "GRANTED";
    return `<tr>
      <td>${escapeHTML(safeText(item.event, "RFID Access"))}</td>
      ${includeUid ? `<td>${escapeHTML(safeText(item.uid))}</td>` : ""}
      <td>${escapeHTML(safeText(item.time))}</td>
      <td><span class="result ${granted ? "granted" : "denied"}">${granted ? "GRANTED" : "DENIED"}</span></td>
    </tr>`;
  }).join("") : `<tr><td colspan="${includeUid ? 4 : 3}" class="empty-state">Belum ada data dari ESP32.</td></tr>`;

  if ($("recentRows")) $("recentRows").innerHTML = makeRows(recent, false);
  if ($("historyRows")) $("historyRows").innerHTML = makeRows(state.logs, true);
}

function renderUsers(users) {
  state.users = Array.isArray(users) ? users : [];
  if ($("userCount")) $("userCount").textContent = state.users.length;

  if ($("userRows")) {
    $("userRows").innerHTML = state.users.length ? state.users.map((user, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(safeText(user.label, "User"))}</td>
        <td>${escapeHTML(safeText(user.uid))}</td>
        <td><span class="result ${user.active !== false ? "granted" : "denied"}">${user.active !== false ? "ACTIVE" : "INACTIVE"}</span></td>
      </tr>`).join("") : `<tr><td colspan="4" class="empty-state">Belum ada data pengguna dari ESP32.</td></tr>`;
  }
}

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === pageName));
  const page = $("page-" + pageName);
  if (page) page.classList.add("active");
  const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
  if ($("breadcrumbPage")) $("breadcrumbPage").textContent = activeLink ? activeLink.textContent.trim() : "Overview";
  if ($("sidebar")) $("sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => showPage(link.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.goto)));
if ($("menuButton")) $("menuButton").addEventListener("click", () => $("sidebar").classList.toggle("open"));

if ($("currentDate")) {
  $("currentDate").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}
if ($("footerYear")) $("footerYear").textContent = new Date().getFullYear();
setConnection(false);

async function startDashboard() {
  const base = "https://gstatic.com";
  await loadScript(base + "firebase-app-compat.js");
  await loadScript(base + "firebase-database-compat.js");

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  db.ref("status").on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (data.heartbeat) state.lastBeat = Date.now();
      renderStatus(data);
    } else {
      setConnection(false);
    }
  });

  db.ref("logs").on("value", (snapshot) => {
    const raw = snapshot.val();
    const list = raw ? Object.values(raw).reverse() : [];
    renderLogs(list);
  });

  db.ref("users").on("value", (snapshot) => {
    const raw = snapshot.val();
    const list = raw ? Object.values(raw) : [];
    renderUsers(list);
  });

  setInterval(() => {
    if (state.lastBeat > 0 && (Date.now() - state.lastBeat > 15000)) {
      setConnection(false);
    }
  }, 3000);
}

startDashboard();
