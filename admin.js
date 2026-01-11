const SUPABASE_URL = "https://fptldpkahsxifzxmzvjd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_29Mtd0gHH03lSTbJF6YEww_kuRE-nHC";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI
const loginCard = document.getElementById("loginCard");
const dashCard = document.getElementById("dashCard");

const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginStatus = document.getElementById("loginStatus");

const refreshBtn = document.getElementById("refreshBtn");
const ordersBody = document.getElementById("ordersBody");
const adminMsg = document.getElementById("adminMsg");
const meLabel = document.getElementById("meLabel");

const toast = document.getElementById("toast");

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 1200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied ✅");
  } catch {
    showToast("Copy failed");
  }
}

// ====== Auth session check ======
async function loadSession() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data?.session;
  if (session) {
    loginCard.style.display = "none";
    dashCard.style.display = "block";
    logoutBtn.style.display = "inline-block";
    meLabel.textContent = `Signed in: ${session.user.email}`;
    await loadOrders();
  } else {
    loginCard.style.display = "block";
    dashCard.style.display = "none";
    logoutBtn.style.display = "none";
  }
}

loginBtn.addEventListener("click", async () => {
  const email = (adminEmail.value || "").trim();
  const password = adminPassword.value || "";

  // ✅ မင်းလိုချင်တဲ့ hard-coded credential ကိုစစ်ပေးမယ်
  // (UI ထဲမှာ default ထည့်ထားပြီးသား)
  if (email !== "wunnaaung27277@gmail.com" || password !== "212026") {
    loginStatus.textContent = "❌ Email or password wrong";
    return;
  }

  loginStatus.textContent = "Logging in...";
  loginBtn.disabled = true;

  try {
    // ✅ Supabase Auth login
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    loginStatus.textContent = "✅ Login success";
    await loadSession();
  } catch (e) {
    console.error(e);
    loginStatus.textContent =
      "❌ Login failed. Supabase Auth → Users မှာ ဒီ user create မထားသေးလား စစ်ပါ။ (" + (e.message || "") + ")";
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  adminMsg.textContent = "";
  await loadSession();
});

refreshBtn.addEventListener("click", loadOrders);

// ====== Orders fetch (requires SELECT policy for authenticated) ======
async function loadOrders() {
  adminMsg.textContent = "Loading...";
  ordersBody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

  try {
    const { data, error } = await supabaseClient
      .from("Orders")
      .select("created_at, package, phone, contact_link, receipt_url, notes")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    if (!data || data.length === 0) {
      ordersBody.innerHTML = `<tr><td colspan="6">No orders yet</td></tr>`;
      adminMsg.textContent = "No data";
      return;
    }

    ordersBody.innerHTML = "";
    data.forEach(row => {
      const created = row.created_at ? new Date(row.created_at).toLocaleString() : "-";
      const link = row.contact_link ? `<a class="pill" href="${row.contact_link}" target="_blank" rel="noreferrer">Open</a>` : "-";
      const receipt = row.receipt_url ? `<a class="pill" href="${row.receipt_url}" target="_blank" rel="noreferrer">View</a>` : "-";
      const notes = row.notes ? row.notes : "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${created}</td>
        <td><span class="pill">${row.package || "-"}</span></td>
        <td>${row.phone || "-"}</td>
        <td>${link}</td>
        <td>${receipt}</td>
        <td>${notes}</td>
      `;
      ordersBody.appendChild(tr);
    });

    adminMsg.textContent = `Loaded ${data.length} orders ✅`;
  } catch (e) {
    console.error(e);
    ordersBody.innerHTML = `<tr><td colspan="6">Error: ${(e.message || "unknown")}</td></tr>`;
    adminMsg.textContent =
      "❗ SELECT မရရင် RLS policy ကို authenticated only ပြောင်းထားပြီး login မဝင်နိုင်တာ ဖြစ်နိုင်ပါတယ်။";
  }
}

// init
loadSession();