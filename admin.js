const SUPABASE_URL = "https://fptldpkahsxifzxmzvjd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_29Mtd0gHH03lSTbJF6YEww_kuRE-nHC";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI
const authBox = document.getElementById("authBox");
const panel = document.getElementById("panel");
const authStatus = document.getElementById("authStatus");

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const ordersEl = document.getElementById("orders");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");

let cache = [];

loginBtn.addEventListener("click", async () => {
  try {
    authStatus.textContent = "Logging in...";
    const email = emailEl.value.trim();
    const password = passEl.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    authStatus.textContent = "✅ Logged in";
    await refresh();
  } catch (e) {
    console.error(e);
    authStatus.textContent = "❌ " + (e?.message || "Login failed");
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  cache = [];
  render([]);
  showAuth();
});

refreshBtn.addEventListener("click", refresh);

searchEl.addEventListener("input", () => {
  const q = searchEl.value.trim().toLowerCase();
  const filtered = cache.filter(o =>
    (o.phone || "").toLowerCase().includes(q) ||
    (o.package || "").toLowerCase().includes(q)
  );
  render(filtered);
});

async function refresh() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return showAuth();

  showPanel();

  const { data, error } = await supabase
    .from("Orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // If policies are correct, non-admin users will see policy error / empty
    authStatus.textContent = "❌ " + (error.message || "Cannot fetch orders");
    render([]);
    return;
  }

  cache = data || [];
  render(cache);
}

function render(list) {
  ordersEl.innerHTML = "";
  emptyEl.classList.toggle("hidden", list.length !== 0);

  list.forEach(o => {
    const item = document.createElement("div");
    item.className = "orderItem";

    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString() : "-";

    item.innerHTML = `
      <div class="orderTop">
        <div>
          <div class="orderTitle">${escapeHtml(o.package || "-")}</div>
          <div class="orderSub">📞 ${escapeHtml(o.phone || "-")} • ${escapeHtml(dateStr)}</div>
        </div>
        <button class="copyMini" data-copy="${escapeHtml(o.phone || "")}">Copy Phone</button>
      </div>

      ${o.notes ? `<div class="orderNotes">${escapeHtml(o.notes)}</div>` : ""}

      ${o.receipt_url ? `
        <div class="orderReceipt">
          <img src="${escapeHtml(o.receipt_url)}" alt="receipt" />
          <a class="linkBtn small" target="_blank" rel="noreferrer" href="${escapeHtml(o.receipt_url)}">Open</a>
        </div>
      ` : `<div class="orderNotes muted">No receipt URL</div>`}
    `;

    item.querySelector('[data-copy]')?.addEventListener("click", async (e) => {
      const txt = e.currentTarget.getAttribute("data-copy") || "";
      if (!txt) return;
      await navigator.clipboard.writeText(txt);
      authStatus.textContent = "Copied phone ✅";
      setTimeout(() => (authStatus.textContent = ""), 1500);
    });

    ordersEl.appendChild(item);
  });
}

function showAuth() {
  authBox.classList.remove("hidden");
  panel.classList.add("hidden");
}

function showPanel() {
  authBox.classList.add("hidden");
  panel.classList.remove("hidden");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// On load: check session
(async function init() {
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    showPanel();
    await refresh();
  } else {
    showAuth();
  }
})();