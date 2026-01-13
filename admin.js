document.addEventListener("DOMContentLoaded", () => {
  // =====================
  // 1) Supabase config
  // =====================
  const SUPABASE_URL = "https://fptldpkahsxifzxmzvjd.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_29Mtd0gHH03lSTbJF6YEww_kuRE-nHC";
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

  const filterAll = document.getElementById("filterAll");
  const filterPending = document.getElementById("filterPending");
  const filterDone = document.getElementById("filterDone");

  const sumPending = document.getElementById("sumPending");
  const sumDone = document.getElementById("sumDone");
  const sumTotal = document.getElementById("sumTotal");

  const toast = document.getElementById("toast");

  // =====================
  // 3) State
  // =====================
  let currentFilter = "all"; // all | pending | done

  // =====================
  // 4) Helpers
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

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso || "";
    }
  }

  function setFilterUI() {
    [filterAll, filterPending, filterDone].forEach(b => b.classList.remove("chipOn"));
    if (currentFilter === "all") filterAll.classList.add("chipOn");
    if (currentFilter === "pending") filterPending.classList.add("chipOn");
    if (currentFilter === "done") filterDone.classList.add("chipOn");
  }

  function showLogin() {
    loginCard.classList.remove("hidden");
    adminPanel.classList.add("hidden");
  }

  function showAdmin() {
    loginCard.classList.add("hidden");
    adminPanel.classList.remove("hidden");
  }

  // =====================
  // 5) Session check (auto show orders if already logged)
  // =====================
  async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
      showAdmin();
      await loadOrders();
    } else {
      showLogin();
    }
  }

  // =====================
  // 6) Login / Logout
  // =====================
  loginBtn.addEventListener("click", async () => {
    loginMsg.textContent = "Logging in...";
    loginBtn.classList.add("btnDisabled");

    try {
      const email = adminEmail.value.trim();
      const password = adminPassword.value;

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      loginMsg.textContent = "Login success ✅";
      showToast("Login ✅");

      showAdmin();
      await loadOrders();
    } catch (e) {
      loginMsg.textContent = "Login failed: " + (e?.message || "Unknown error");
      showToast("Login failed ❗");
    } finally {
      loginBtn.classList.remove("btnDisabled");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showToast("Logged out");
    showLogin();
  });

  // =====================
  // 7) Load orders
  // =====================
  async function fetchOrders() {
    // RLS requires you to be an ADMIN (in public.admins table)
    const { data, error } = await supabaseClient
      .from("Orders")
      .select("id, package, price, phone, contact_link, notes, receipt_url, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  function applyFilter(list) {
    if (currentFilter === "pending") return list.filter(x => x.status === "pending");
    if (currentFilter === "done") return list.filter(x => x.status === "done");
    return list;
  }

  async function loadOrders() {
    adminMsg.textContent = "Loading...";
    ordersList.innerHTML = "";

    try {
      const all = await fetchOrders();

      const pendingCount = all.filter(x => x.status === "pending").length;
      const doneCount = all.filter(x => x.status === "done").length;

      sumPending.textContent = pendingCount;
      sumDone.textContent = doneCount;
      sumTotal.textContent = all.length;

      const filtered = applyFilter(all);
      countText.textContent = `Total: ${filtered.length}`;

      if (filtered.length === 0) {
        ordersList.innerHTML = `<div class="helper">No orders</div>`;
        adminMsg.textContent = "";
        return;
      }

      ordersList.innerHTML = filtered.map(o => renderOrderCard(o)).join("");
      adminMsg.textContent = "";
      bindOrderActions();
    } catch (e) {
      console.error(e);
      adminMsg.textContent = "Error: " + (e?.message || "Unknown error") + " (Check: you added your user_id into public.admins table?)";
      showToast("Error ❗");
    }
  }

  function renderOrderCard(o) {
    const pkg = escapeHtml(o.package);
    const phone = escapeHtml(o.phone);
    const link = escapeHtml(o.contact_link);
    const notes = escapeHtml(o.notes || "");
    const status = escapeHtml(o.status);
    const date = escapeHtml(formatDate(o.created_at));
    const price = Number(o.price || 0).toLocaleString();

    const receiptUrl = o.receipt_url || "";
    const canView = receiptUrl ? `<a class="btn btnSmall" href="${receiptUrl}" target="_blank" rel="noreferrer">View receipt</a>` : "";

    return `
      <div class="orderCard" data-id="${o.id}">
        <div class="orderTop">
          <div class="orderTitle">${pkg} <span class="muted">(${price} MMK)</span></div>
          <div class="statusTag ${status === "done" ? "statusDone" : "statusPending"}">${status}</div>
        </div>

        <div class="orderMeta">
          <div><span class="muted">Date:</span> ${date}</div>
          <div><span class="muted">Phone:</span> ${phone}</div>
          <div><span class="muted">Contact:</span> ${link}</div>
          ${notes ? `<div><span class="muted">Notes:</span> ${notes}</div>` : ""}
        </div>

        <div class="orderActions">
          ${canView}
          <button class="btn btnSmall actDone" type="button">Mark done</button>
          <button class="btn btnSmall actPending" type="button">Mark pending</button>
          <button class="btn btnSmall btnDanger actDelete" type="button">Delete</button>
        </div>
      </div>
    `;
  }

  function bindOrderActions() {
    const cards = Array.from(document.querySelectorAll(".orderCard"));
    cards.forEach(card => {
      const id = card.getAttribute("data-id");
      const btnDone = card.querySelector(".actDone");
      const btnPending = card.querySelector(".actPending");
      const btnDelete = card.querySelector(".actDelete");

      btnDone.addEventListener("click", async () => {
        await updateStatus(id, "done");
      });

      btnPending.addEventListener("click", async () => {
        await updateStatus(id, "pending");
      });

      btnDelete.addEventListener("click", async () => {
        const ok = confirm("Delete this order? (cannot undo)");
        if (!ok) return;
        await deleteOrder(id);
      });
    });
  }

  async function updateStatus(id, status) {
    try {
      const { error } = await supabaseClient.from("Orders").update({ status }).eq("id", id);
      if (error) throw error;
      showToast("Updated ✅");
      await loadOrders();
    } catch (e) {
      console.error(e);
      showToast("Update failed ❗");
      adminMsg.textContent = "Error: " + (e?.message || "Unknown error");
    }
  }

  async function deleteOrder(id) {
    try {
      const { error } = await supabaseClient.from("Orders").delete().eq("id", id);
      if (error) throw error;
      showToast("Deleted ✅");
      await loadOrders();
    } catch (e) {
      console.error(e);
      showToast("Delete failed ❗");
      adminMsg.textContent = "Error: " + (e?.message || "Unknown error");
    }
  }

  // =====================
  // 8) Filter + Refresh
  // =====================
  filterAll.addEventListener("click", async () => {
    currentFilter = "all";
    setFilterUI();
    await loadOrders();
  });

  filterPending.addEventListener("click", async () => {
    currentFilter = "pending";
    setFilterUI();
    await loadOrders();
  });

  filterDone.addEventListener("click", async () => {
    currentFilter = "done";
    setFilterUI();
    await loadOrders();
  });

  refreshBtn.addEventListener("click", loadOrders);

  // init
  setFilterUI();
  checkSession();
});