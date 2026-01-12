// =====================
// 1) Supabase config
// =====================
const SUPABASE_URL = "https://fptldpkahsxifzxmzvjd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_29Mtd0gHH03lSTbJF6YEww_kuRE-nHC";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const receiptModal = document.getElementById("receiptModal");
const receiptImg = document.getElementById("receiptImg");
const receiptOpenNew = document.getElementById("receiptOpenNew");
const receiptCopyLink = document.getElementById("receiptCopyLink");
const receiptClose = document.getElementById("receiptClose");
const receiptCloseBtn = document.getElementById("receiptCloseBtn");

function openReceipt(url){
  if(!url) return alert("No receipt url");
  receiptImg.src = url;
  receiptOpenNew.href = url;
  receiptModal.style.display = "block";
}

function closeReceipt(){
  receiptImg.src = "";
  receiptOpenNew.href = "#";
  receiptModal.style.display = "none";
}

receiptClose.addEventListener("click", closeReceipt);
receiptCloseBtn.addEventListener("click", closeReceipt);

receiptCopyLink.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(receiptOpenNew.href);
    alert("Copied ✅");
  } catch {
    alert("Copy failed ❗");
  }
});
// =====================
// 2) UI elements
// =====================
const loginCard = document.getElementById("loginCard");
const adminPanel = document.getElementById("adminPanel");

const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");

const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

const ordersList = document.getElementById("ordersList");
const adminMsg = document.getElementById("adminMsg");
const countText = document.getElementById("countText");

const toast = document.getElementById("toast");

// =====================
// 3) Helpers
// =====================
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1200);
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtMMK(n) {
  const x = Number(n || 0);
  return x ? x.toLocaleString("en-US") + " MMK" : "-";
}

function fmtDate(d) {
  if (!d) return "-";
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function setLoggedInUI(isLoggedIn) {
  loginCard.style.display = isLoggedIn ? "none" : "block";
  adminPanel.style.display = isLoggedIn ? "block" : "none";
}

// =====================
// 4) Auth
// =====================
async function ensureSessionUI() {
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) {
    setLoggedInUI(true);
    await loadOrders();
  } else {
    setLoggedInUI(false);
  }
}

loginBtn.addEventListener("click", async () => {
  loginMsg.textContent = "";
  adminMsg.textContent = "";

  const email = (adminEmail.value || "").trim();
  const password = (adminPassword.value || "").trim();

  if (!email || !password) {
    loginMsg.textContent = "Please enter email + password.";
    return;
  }

  loginBtn.textContent = "Logging in…";
  loginBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    showToast("Logged in ✅");
    setLoggedInUI(true);
    await loadOrders();
  } catch (e) {
    loginMsg.textContent = "Login failed: " + (e.message || "Unknown error");
    showToast("Login error ❗");
  } finally {
    loginBtn.textContent = "Login";
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  ordersList.innerHTML = "";
  showToast("Logged out");
  setLoggedInUI(false);
});

// keep UI in sync
supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) setLoggedInUI(true);
  else setLoggedInUI(false);
});

// =====================
// 5) Orders CRUD
// =====================
async function loadOrders() {
  adminMsg.textContent = "Loading orders…";
  countText.textContent = "Loading…";
  ordersList.innerHTML = "";

  try {
    // RLS will allow ONLY admins (authenticated + in public.admins)
    const { data, error } = await supabaseClient
      .from("Orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = data || [];
    countText.textContent = `Total: ${rows.length}`;

    if (!rows.length) {
      adminMsg.textContent = "No orders yet.";
      return;
    }

    ordersList.innerHTML = rows.map(r => renderOrderCard(r)).join("");
    adminMsg.textContent = "";
    wireCardButtons();
  } catch (e) {
    adminMsg.textContent = "Error: " + (e.message || "Unknown error");
  }
}

function renderOrderCard(r) {
  const id = escapeHtml(r.id);
  const pkg = escapeHtml(r.package);
  const phone = escapeHtml(r.phone);
  const link = escapeHtml(r.contact_link);
  const notes = escapeHtml(r.notes);
  const price = fmtMMK(r.price);
  const status = escapeHtml(r.status || "pending");
  const created = escapeHtml(fmtDate(r.created_at));
  const receipt = escapeHtml(r.receipt_url || "");

  return `
  <div class="card" style="padding:14px" data-id="${id}">
    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px">
      <div>
        <div style="font-weight:800;font-size:18px">${pkg} <span style="opacity:.7;font-weight:600">(${price})</span></div>
        <div class="helper" style="margin-top:6px">
          <b>Status:</b> ${status} • <b>Date:</b> ${created}
        </div>
        <div class="helper" style="margin-top:6px"><b>Phone:</b> ${phone}</div>
        <div class="helper" style="margin-top:6px"><b>Contact:</b> ${link || "-"}</div>
        <div class="helper" style="margin-top:6px"><b>Notes:</b> ${notes || "-"}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;min-width:140px">
        ${receipt ? `
          <a class="btn btnGhost btnSmall" target="_blank" rel="noopener" href="${receipt}">View receipt</a>
        ` : `<div class="helper" style="opacity:.7">No receipt</div>`}

        <button class="btn btnSmall" data-action="done">Mark done</button>
        <button class="btn btnSmall" data-action="pending">Mark pending</button>
        <button class="btn btnSmall" data-action="delete" style="opacity:.95">Delete</button>
      </div>
    </div>
  </div>`;
}

function wireCardButtons() {
  document.querySelectorAll('[data-action="done"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest("[data-id]");
      const id = card.getAttribute("data-id");
      await updateStatus(id, "done");
    });
  });

  document.querySelectorAll('[data-action="pending"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest("[data-id]");
      const id = card.getAttribute("data-id");
      await updateStatus(id, "pending");
    });
  });

  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest("[data-id]");
      const id = card.getAttribute("data-id");
      const ok = confirm("Delete this order? (cannot undo)");
      if (!ok) return;
      await deleteOrder(id);
    });
  });
}

async function updateStatus(id, status) {
  adminMsg.textContent = "Updating…";
  try {
    const { error } = await supabaseClient
      .from("Orders")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
    showToast("Updated ✅");
    await loadOrders();
  } catch (e) {
    adminMsg.textContent = "Update error: " + (e.message || "Unknown error");
    showToast("Error ❗");
  }
}

async function deleteOrder(id) {
  adminMsg.textContent = "Deleting…";
  try {
    const { error } = await supabaseClient
      .from("Orders")
      .delete()
      .eq("id", id);

    if (error) throw error;
    showToast("Deleted ✅");
    await loadOrders();
  } catch (e) {
    adminMsg.textContent = "Delete error: " + (e.message || "Unknown error");
    showToast("Error ❗");
  }
}

refreshBtn.addEventListener("click", loadOrders);

// init
ensureSessionUI();