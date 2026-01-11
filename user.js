// ===== Supabase config =====
const SUPABASE_URL = "https://fptldpkahsxifzxmzvjd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_29Mtd0gHH03lSTbJF6YEww_kuRE-nHC";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== UI elements =====
const confirmBtn = document.getElementById("confirmBtn");
const statusEl = document.getElementById("status");
const receiptInput = document.getElementById("receipt");
const previewBox = document.getElementById("previewBox");
const previewImg = document.getElementById("previewImg");
const previewName = document.getElementById("previewName");
const removeReceiptBtn = document.getElementById("removeReceipt");
const phoneEl = document.getElementById("phone");
const notesEl = document.getElementById("notes");

let selectedPackage = document.querySelector('input[name="package"]:checked').value;
let selectedFile = null;

// ===== Copy helpers =====
document.querySelectorAll("[data-copy]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const sel = btn.getAttribute("data-copy");
    const el = document.querySelector(sel);
    if (!el) return;
    await navigator.clipboard.writeText(el.value);
    toast("Copied!");
  });
});

document.querySelectorAll("[data-copy-text]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const txt = btn.getAttribute("data-copy-text");
    await navigator.clipboard.writeText(txt);
    toast("Copied!");
  });
});

// ===== Package select animation =====
document.querySelectorAll(".pkg").forEach(pkg => {
  pkg.addEventListener("click", () => {
    document.querySelectorAll(".pkg").forEach(p => p.classList.remove("active"));
    pkg.classList.add("active");
    const radio = pkg.querySelector('input[type="radio"]');
    radio.checked = true;
    selectedPackage = radio.value;
  });
});

// ===== Receipt preview + required confirm =====
receiptInput.addEventListener("change", () => {
  const file = receiptInput.files?.[0];
  selectedFile = file || null;

  if (!selectedFile) {
    previewBox.classList.add("hidden");
    confirmBtn.disabled = true;
    return;
  }

  previewBox.classList.remove("hidden");
  previewName.textContent = `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;

  const url = URL.createObjectURL(selectedFile);
  previewImg.src = url;

  confirmBtn.disabled = false; // required action done
});

removeReceiptBtn.addEventListener("click", () => {
  receiptInput.value = "";
  selectedFile = null;
  previewBox.classList.add("hidden");
  confirmBtn.disabled = true;
  toast("Removed receipt");
});

// ===== Confirm submit =====
confirmBtn.addEventListener("click", async () => {
  try {
    setBusy(true);
    statusEl.textContent = "Uploading receipt...";

    const phone = phoneEl.value.trim();
    if (!phone) throw new Error("Please enter a phone number.");
    if (!selectedFile) throw new Error("Receipt upload is required.");

    // 1) Upload to storage bucket "receipts"
    const ext = (selectedFile.name.split(".").pop() || "jpg").toLowerCase();
    const filePath = `receipts/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase
      .storage
      .from("receipts")
      .upload(filePath, selectedFile, { upsert: false });

    if (uploadErr) throw uploadErr;

    // 2) Get public URL (works because you made read policy)
    const { data: publicData } = supabase
      .storage
      .from("receipts")
      .getPublicUrl(filePath);

    const receipt_url = publicData.publicUrl;

    statusEl.textContent = "Saving order...";

    // 3) Insert to Orders table
    const payload = {
      package: selectedPackage,
      phone,
      receipt_url,
      created_at: new Date().toISOString(),
      notes: notesEl.value.trim() || null
    };

    const { error: insertErr } = await supabase
      .from("Orders")
      .insert(payload);

    if (insertErr) throw insertErr;

    toast("✅ Order placed successfully!");
    statusEl.textContent = "Order saved ✅";

    // Reset
    phoneEl.value = "";
    notesEl.value = "";
    receiptInput.value = "";
    selectedFile = null;
    previewBox.classList.add("hidden");
    confirmBtn.disabled = true;
  } catch (e) {
    console.error(e);
    statusEl.textContent = "";
    toast("❌ " + (e?.message || "Something went wrong"));
  } finally {
    setBusy(false);
  }
});

function setBusy(isBusy) {
  confirmBtn.disabled = isBusy || !selectedFile;
  confirmBtn.classList.toggle("loading", isBusy);
}

function toast(msg) {
  statusEl.textContent = msg;
  setTimeout(() => {
    if (statusEl.textContent === msg) statusEl.textContent = "";
  }, 3000);
}

// ===== KPay logo animation (subtle pulse) =====
const kpayLogo = document.getElementById("kpayLogo");
if (kpayLogo) {
  setInterval(() => kpayLogo.classList.toggle("pulse"), 1200);
}