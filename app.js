
/* =========================================================
   KELOMPOK 4 - SMART DOOR DASHBOARD
   Firebase Realtime Database
   ========================================================= */

// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyDEpx3No8-YoD5OzKcd4yeMLJZH6ha66LI",
  authDomain: "smart-door-mpp-kel4-xi-titl-1.firebaseapp.com",
  databaseURL: "https://smart-door-mpp-kel4-xi-titl-1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-door-mpp-kel4-xi-titl-1",
  storageBucket: "smart-door-mpp-kel4-xi-titl-1.firebasestorage.app",
  messagingSenderId: "157521729698",
  appId: "1:157521729698:web:38f819d3a5940c0de5dffb"
};

// ================= FIREBASE LIBRARY =================
const FIREBASE_VERSION = "10.12.2";
const FIREBASE_BASE =
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Gagal memuat: " + src));
    document.head.appendChild(script);
  });
}

// ================= HELPER =================
const $ = (id) => document.getElementById(id);

const state = {
  status: null,
  logs: [],
  users: [],
  lastBeat: 0,
  db: null
};

function safeText(value, fallback = "--") {
  return value === undefined || value === null || value === ""
    ? fallback
    : String(value);
}

// ================= CONNECTION STATUS =================
function setConnection(online) {
  const label = online ? "ESP32 Terhubung" : "Menunggu ESP32";

  if ($("sideConnection")) {
    $("sideConnection").textContent = label;
  }

  if ($("connectionPill")) {
    const span = $("connectionPill").querySelector("span");
    const dot = $("connectionPill").querySelector(".status-dot");

    if (span) {
      span.textContent = online ? "ESP32 Online" : "Menunggu ESP32";
    }

    if (dot) dot.classList.toggle("online", online);
  }

  if ($("sideDot")) {
    $("sideDot").classList.toggle("online", online);
  }

  if ($("deviceStatus")) {
    $("deviceStatus").textContent = online ? "Online" : "Offline";
  }

  if ($("deviceDetail")) {
    $("deviceDetail").textContent = online
      ? "Terhubung ke dashboard"
      : "Belum ada koneksi";
  }

  if ($("espTiny")) {
    $("espTiny").textContent = online ? "ONLINE" : "OFFLINE";
    $("espTiny").classList.toggle("neutral", !online);
  }

  if ($("detailConnection")) {
    $("detailConnection").textContent = online ? "Online" : "Offline";
  }
}

// ================= STATUS DOOR =================
function renderStatus(data) {
  state.status = data;

  const isAlive =
    Boolean(data.heartbeat) &&
    (Date.now() - state.lastBeat < 15000);

  setConnection(isAlive);

  const doorVal = safeText(data.door, "--").toUpperCase();

  if ($("doorStatus")) {
    $("doorStatus").textContent = doorVal;
  }

  if ($("doorDetail")) {
    if (doorVal === "UNLOCKED") {
      $("doorDetail").textContent = "Akses terbuka";
    } else if (doorVal === "LOCKED") {
      $("doorDetail").textContent = "Pengunci aktif";
    } else {
      $("doorDetail").textContent = "Menunggu data perangkat";
    }
  }

  if ($("ipAddress")) {
    $("ipAddress").textContent =
      "IP: " + safeText(data.ip, "belum tersedia");
  }

  if ($("detailIP")) {
    $("detailIP").textContent = safeText(data.ip);
  }

  if ($("lastResponse")) {
    $("lastResponse").textContent =
      new Date().toLocaleTimeString("id-ID");
  }
}

// ================= HTML SECURITY HELPER =================
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// ================= LOGS =================
function renderLogs(logs) {
  state.logs = Array.isArray(logs) ? logs : [];

  if ($("todayCount")) {
    $("todayCount").textContent = state.logs.length;
  }

  if ($("todayDetail")) {
    $("todayDetail").textContent = "Total event tercatat";
  }

  const recent = state.logs.slice(0, 5);

  const makeRows = (items, includeUid) => {
    if (!items.length) {
      return `<tr>
        <td colspan="${includeUid ? 4 : 3}" class="empty-state">
          Belum ada data dari ESP32.
        </td>
      </tr>`;
    }

    return items.map((item) => {
      const granted =
        String(item.result || "").toUpperCase() === "GRANTED";

      return `<tr>
        <td>${escapeHTML(safeText(item.event, "RFID Access"))}</td>
        ${includeUid
          ? `<td>${escapeHTML(safeText(item.uid))}</td>`
          : ""}
        <td>${escapeHTML(safeText(item.time))}</td>
        <td>
          <span class="result ${granted ? "granted" : "denied"}">
            ${granted ? "GRANTED" : "DENIED"}
          </span>
        </td>
      </tr>`;
    }).join("");
  };

  if ($("recentRows")) {
    $("recentRows").innerHTML = makeRows(recent, false);
  }

  if ($("historyRows")) {
    $("historyRows").innerHTML = makeRows(state.logs, true);
  }
}

// ================= USERS =================
function renderUsers(users) {
  state.users = Array.isArray(users) ? users : [];

  if ($("userCount")) {
    $("userCount").textContent = state.users.length;
  }

  if (!$("userRows")) return;

  $("userRows").innerHTML = state.users.length
    ? state.users.map((user, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(safeText(user.label, "User"))}</td>
        <td>${escapeHTML(safeText(user.uid))}</td>
        <td>
          <span class="result ${user.active !== false ? "granted" : "denied"}">
            ${user.active !== false ? "ACTIVE" : "INACTIVE"}
          </span>
        </td>
      </tr>
    `).join("")
    : `<tr>
        <td colspan="4" class="empty-state">
          Belum ada data pengguna dari ESP32.
        </td>
      </tr>`;
}

// ================= NAVIGATION =================
function showPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === pageName);
  });

  const page = $("page-" + pageName);
  if (page) page.classList.add("active");

  const activeLink = document.querySelector(
    `.nav-link[data-page="${pageName}"]`
  );

  if ($("breadcrumbPage")) {
    $("breadcrumbPage").textContent = activeLink
      ? activeLink.textContent.trim()
      : "Overview";
  }

  if ($("sidebar")) {
    $("sidebar").classList.remove("open");
  }
}

// ================= NAV EVENT =================
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    showPage(link.dataset.page);
  });
});

document.querySelectorAll("[data-goto]").forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.goto);
  });
});

if ($("menuButton")) {
  $("menuButton").addEventListener("click", () => {
    if ($("sidebar")) {
      $("sidebar").classList.toggle("open");
    }
  });
}

// ================= DATE =================
if ($("currentDate")) {
  $("currentDate").textContent = new Date().toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

if ($("footerYear")) {
  $("footerYear").textContent = new Date().getFullYear();
}

// Initial state
setConnection(false);

// ================= START DASHBOARD =================
async function startDashboard() {
  try {
    console.log("Memuat Firebase...");

    // Load Firebase SDK
    await loadScript(FIREBASE_BASE + "firebase-app-compat.js");
    await loadScript(FIREBASE_BASE + "firebase-database-compat.js");

    console.log("Firebase library berhasil dimuat.");

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.database();
    state.db = db;

    console.log("Firebase berhasil diinisialisasi.");

    // ================= STATUS LISTENER =================
    db.ref("status").on(
      "value",
      (snapshot) => {
        const data = snapshot.val();

        console.log("Data status:", data);

        if (data) {
          if (data.heartbeat) {
            state.lastBeat = Date.now();
          }

          renderStatus(data);
        } else {
          state.lastBeat = 0;
          setConnection(false);
        }
      },
      (error) => {
        console.error("Status Firebase error:", error);
        setConnection(false);
      }
    );

    // ================= LOGS LISTENER =================
    db.ref("logs").on(
      "value",
      (snapshot) => {
        const raw = snapshot.val();
        const list = raw ? Object.values(raw).reverse() : [];

        console.log("Data logs:", list);
        renderLogs(list);
      },
      (error) => {
        console.error("Logs Firebase error:", error);
      }
    );

    // ================= USERS LISTENER =================
    db.ref("users").on(
      "value",
      (snapshot) => {
        const raw = snapshot.val();
        const list = raw ? Object.values(raw) : [];

        console.log("Data users:", list);
        renderUsers(list);
      },
      (error) => {
        console.error("Users Firebase error:", error);
      }
    );

    // ================= HEARTBEAT CHECK =================
    setInterval(() => {
      if (
        state.lastBeat > 0 &&
        Date.now() - state.lastBeat > 15000
      ) {
        setConnection(false);
      }
    }, 3000);

  } catch (error) {
    console.error("Firebase gagal dijalankan:", error);
    setConnection(false);
  }
}

// Start
startDashboard();

