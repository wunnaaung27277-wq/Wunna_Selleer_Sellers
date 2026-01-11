// ====== Demo credentials (Change these) ======
const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

// Elements
const loginCard = document.getElementById("loginCard");
const ordersCard = document.getElementById("ordersCard");

const userEl = document.getElementById("user");
const passEl = document.getElementById("pass");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");

const tbody = document.getElementById("tbody");
const empty = document.getElementById("empty");

const refreshBtn = document.getElementById("refreshBtn");
const clearBtn = document.getElementById("clearBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Helpers
function setMsg(type, text){
  loginMsg.style.display = "block";
  loginMsg.className = `msg ${type}`;
  loginMsg.textContent = text;
}

function getOrders(){
  return JSON.parse(localStorage.getItem("orders") || "[]");
}

function setLoggedIn(val){
  localStorage.setItem("adminLoggedIn", val ? "1" : "0");
}

function isLoggedIn(){
  return localStorage.getItem("adminLoggedIn") === "1";
}

function showOrdersUI(){
  loginCard.style.display = "none";
  ordersCard.style.display = "block";
  renderOrders();
}

function showLoginUI(){
  ordersCard.style.display = "none";
  loginCard.style.display = "block";
}

function renderOrders(){
  const orders = getOrders();
  tbody.innerHTML = "";

  if (!orders.length){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  for (const o of orders){
    const tr = document.createElement("tr");

    const date = new Date(o.createdAt).toLocaleString();
    tr.innerHTML = `
      <td style="padding:10px; border-bottom:1px solid rgba(255,255,255,.08)">${date}</td>
      <td style="padding:10px; border-bottom:1px solid rgba(255,255,255,.08)">${o.package || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid rgba(255,255,255,.08)">${o.phone || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid rgba(255,255,255,.08)">${o.receiptFileName || "-"}</td>
      <td style="padding:10px; border-bottom:1px solid rgba(255,255,255,.08)">${o.notes || "-"}</td>
    `;
    tbody.appendChild(tr);
  }
}

// Events
loginBtn.addEventListener("click", () => {
  const u = userEl.value.trim();
  const p = passEl.value;

  if (u === ADMIN_USER && p === ADMIN_PASS){
    setLoggedIn(true);
    setMsg("ok", "Login successful.");
    showOrdersUI();
  } else {
    setMsg("err", "Invalid username or password.");
  }
});

refreshBtn.addEventListener("click", renderOrders);

clearBtn.addEventListener("click", () => {
  localStorage.removeItem("orders");
  renderOrders();
});

logoutBtn.addEventListener("click", () => {
  setLoggedIn(false);
  showLoginUI();
  setMsg("ok", "Logged out.");
});

// Auto-login if already logged in on this device
if (isLoggedIn()){
  showOrdersUI();
} else {
  showLoginUI();
}