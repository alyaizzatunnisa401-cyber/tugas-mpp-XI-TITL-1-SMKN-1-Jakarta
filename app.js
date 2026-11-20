// NEXUS ACCESS - Frontend dashboard
// API contract yang diharapkan dari firmware ESP32:
// GET /api/status -> { online:true, door:"LOCKED"|"UNLOCKED", ip:"192.168.x.x", userCount:2, todayCount:4 }
// GET /api/logs   -> [{ event:"RFID", uid:"01 02 03 04", result:"GRANTED"|"DENIED", time:"08:15:32" }]
// GET /api/users  -> [{ label:"User 1", uid:"01 02 03 04", active:true }]
//
// Untuk preview tanpa ESP32, dashboard akan menampilkan status menunggu perangkat.

const API_BASE = ""; // Kosongkan jika halaman disajikan langsung oleh ESP32.
const POLL_INTERVAL = 3000;

const $ = (id) => document.getElementById(id);
const state = { status: null, logs: [], users: [], lastSeen: null };

function setConnection(online) {
  const label = online ? "ESP32 Terhubung" : "Menunggu ESP32";
  $("sideConnection").textContent = label;
  $("connectionPill").querySelector("span").textContent = online ? "ESP32 Online" : "Menunggu ESP32";
  $("sideDot").classList.toggle("online", online);
  $("connectionPill").querySelector(".status-dot").classList.toggle("online", online);
  $("deviceStatus").textContent = online ? "Online" : "Offline";
  $("deviceDetail").textContent = online ? "Terhubung ke dashboard" : "Belum ada koneksi";
  $("espTiny").textContent = online ? "ONLINE" : "OFFLINE";
  $("espTiny").classList.toggle("neutral", !online);
  $("detailConnection").textContent = online ? "Online" : "Offline";
}

function safeText(value, fallback = "--") {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function renderStatus(data) {
  state.status = data;
  const online = data.online === true;
  setConnection(online);
  $("doorStatus").textContent = safeText(data.door, "--").toUpperCase();
  $("doorDetail").textContent = data.door === "UNLOCKED" ? "Akses terbuka" : data.door === "LOCKED" ? "Pengunci aktif" : "Menunggu data perangkat";
  $("userCount").textContent = safeText(data.userCount);
  $("todayCount").textContent = safeText(data.todayCount);
  $("todayDetail").textContent = "Total event hari ini";
  $("ipAddress").textContent = "IP: " + safeText(data.ip, "belum tersedia");
  $("detailIP").textContent = safeText(data.ip);
  $("lastResponse").textContent = new Date().toLocaleTimeString("id-ID");
  $("footerYear").textContent = new Date().getFullYear();
}

function renderLogs(logs) {
  state.logs = Array.isArray(logs) ? logs : [];
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
  $("recentRows").innerHTML = makeRows(recent, false);
  $("historyRows").innerHTML = makeRows(state.logs, true);
}

function renderUsers(users) {
  state.users = Array.isArray(users) ? users : [];
  $("userRows").innerHTML = state.users.length ? state.users.map((user, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHTML(safeText(user.label, "User"))}</td>
      <td>${escapeHTML(safeText(user.uid))}</td>
      <td><span class="result ${user.active ? "granted" : "denied"}">${user.active ? "ACTIVE" : "INACTIVE"}</span></td>
    </tr>`).join("") : `<tr><td colspan="4" class="empty-state">Belum ada data pengguna dari ESP32.</td></tr>`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function fetchJSON(path) {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function refreshDashboard() {
  try {
    const [status, logs, users] = await Promise.all([
      fetchJSON("/api/status"),
      fetchJSON("/api/logs"),
      fetchJSON("/api/users")
    ]);
    renderStatus(status);
    renderLogs(logs);
    renderUsers(users);
    state.lastSeen = Date.now();
  } catch (error) {
    setConnection(false);
    // Jangan tampilkan pop-up berulang saat ESP32 belum terhubung.
    console.info("ESP32 API belum tersedia:", error.message);
  }
}

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === pageName));
  const page = $("page-" + pageName);
  if (page) page.classList.add("active");
  const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
  $("breadcrumbPage").textContent = activeLink ? activeLink.textContent.trim() : "Overview";
  $("sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => showPage(link.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.goto)));
$("menuButton").addEventListener("click", () => $("sidebar").classList.toggle("open"));

$("currentDate").textContent = new Date().toLocaleDateString("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});
$("footerYear").textContent = new Date().getFullYear();
setConnection(false);
refreshDashboard();
setInterval(refreshDashboard, POLL_INTERVAL);
