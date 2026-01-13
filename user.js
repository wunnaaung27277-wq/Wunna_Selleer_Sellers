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
  const pkgCards = Array.from(document.querySelectorAll(".pkg"));
  const pkgHint = document.getElementById("pkgHint");

  const phoneEl = document.getElementById("phone");
  const contactLinkEl = document.getElementById("contactLink");
  const notesEl = document.getElementById("notes");

  const receiptEl = document.getElementById("receipt");
  const thumbEl = document.getElementById("thumb");
  const fileLabel = document.getElementById("fileLabel");
  const uploadStatus = document.getElementById("uploadStatus");

  const confirmBtn = document.getElementById("confirmBtn");
  const goAdminBtn = document.getElementById("goAdminBtn");

  const kpayName = document.getElementById("kpayName");
  const kpayNo = document.getElementById("kpayNo");
  const copyNameBtn = document.getElementById("copyNameBtn");
  const copyNoBtn = document.getElementById("copyNoBtn");

  const toast = document.getElementById("toast");

  // =====================
  // 3) State
  // =====================
  let selectedPackage = null;
  let selectedPrice = 0;
  let selectedFile = null;
  let previewURL = null;

  // =====================
  // 4) Helpers
  // =====================
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1200);
  }

  function normalizePhone(p) {
    return (p || "").replace(/\s+/g, "");
  }

  function isValidContactLink(v) {
    const s = (v || "").trim();
    if (!s) return false;

    if (/^@\w{3,}$/.test(s)) return true; // @username
    if (/^\+?\d{7,15}$/.test(s.replace(/\s+/g, ""))) return true; // phone-like
    if (/^https?:\/\//i.test(s)) return true; // url
    if (/t\.me\/|facebook\.com\/|fb\.com\//i.test(s)) return true; // raw patterns

    return false;
  }

  function setConfirmEnabled(enabled) {
    if (enabled) confirmBtn.classList.remove("btnDisabled");
    else confirmBtn.classList.add("btnDisabled");
  }

  function validateForm() {
    const phoneOk = normalizePhone(phoneEl.value).length >= 9;
    const pkgOk = !!selectedPackage;
    const fileOk = !!selectedFile;
    const linkOk = isValidContactLink(contactLinkEl.value);

    setConfirmEnabled(pkgOk && phoneOk && fileOk && linkOk);
  }

  // =====================
  // 5) Copy-only fields
  // =====================
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied ✅");
    } catch {
      const tmp = document.createElement("textarea");
      tmp.value = text;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      tmp.remove();
      showToast("Copied ✅");
    }
  }

  copyNameBtn.addEventListener("click", () => copyText(kpayName.value));
  copyNoBtn.addEventListener("click", () => copyText(kpayNo.value));

  // =====================
  // 6) Package select (click + touch)
  // =====================
  function onPickPackage(card) {
    pkgCards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");

    selectedPackage = card.dataset.package || null;
    selectedPrice = Number(card.dataset.price || 0);

    pkgHint.classList.add("open");
    setTimeout(() => pkgHint.classList.remove("open"), 1200);

    validateForm();
  }

  pkgCards.forEach(card => {
    card.addEventListener("click", () => onPickPackage(card));
    card.addEventListener("touchstart", () => onPickPackage(card), { passive: true });
  });

  // =====================
  // 7) Receipt upload preview thumbnail
  // =====================
  function handleReceiptChange() {
    const file = receiptEl.files && receiptEl.files[0];
    selectedFile = file || null;

    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = null;

    if (!file) {
      thumbEl.innerHTML = `<span class="mini muted">No preview</span>`;
      uploadStatus.textContent = "No file selected";
      fileLabel.textContent = "PNG/JPG recommended";
      validateForm();
      return;
    }

    fileLabel.textContent = file.name;
    uploadStatus.textContent = "Preview ready ✅";

    previewURL = URL.createObjectURL(file);
    thumbEl.innerHTML = "";
    const img = document.createElement("img");
    img.src = previewURL;
    img.alt = "Receipt preview";
    thumbEl.appendChild(img);

    validateForm();
  }

  receiptEl.addEventListener("change", handleReceiptChange);
  receiptEl.addEventListener("input", handleReceiptChange);

  // =====================
  // 8) Submit (upload + insert)
  // =====================
  async function uploadReceiptToSupabase(file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `receipts/${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;

    const { error: upErr } = await supabaseClient
      .storage
      .from("receipts")              // ✅ bucket name MUST be "receipts"
      .upload(path, file, { upsert: false });

    if (upErr) throw new Error("Receipt upload failed: " + upErr.message);

    const { data } = supabaseClient.storage.from("receipts").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Failed to get public URL");

    return data.publicUrl;
  }

  async function insertOrder(row) {
    const { error } = await supabaseClient.from("Orders").insert(row);
    if (error) throw new Error("Insert failed: " + error.message);
  }

  confirmBtn.addEventListener("click", async () => {
    validateForm();
    if (confirmBtn.classList.contains("btnDisabled")) {
      showToast("Fill required fields ❗");
      return;
    }

    confirmBtn.textContent = "Saving...";
    confirmBtn.classList.add("btnDisabled");

    try {
      uploadStatus.textContent = "Uploading receipt...";
      const receiptUrl = await uploadReceiptToSupabase(selectedFile);

      uploadStatus.textContent = "Saving order...";
      const row = {
        package: selectedPackage,
        price: selectedPrice,
        phone: normalizePhone(phoneEl.value),
        contact_link: (contactLinkEl.value || "").trim(),
        notes: (notesEl.value || "").trim(),
        receipt_url: receiptUrl,
        status: "pending"
      };

      await insertOrder(row);

      uploadStatus.textContent = "Done ✅ Order submitted";
      showToast("Submitted ✅");

      // reset UI
      // location.reload();
    } catch (e) {
      console.error(e);
      uploadStatus.textContent = "Error: " + (e.message || "Unknown error");
      showToast("Error ❗");
    } finally {
      confirmBtn.textContent = "Confirm";
      validateForm();
    }
  });

  // =====================
  // 9) Go admin
  // =====================
  goAdminBtn.addEventListener("click", () => {
    location.href = "./admin.html";
  });

  // Live validation
  phoneEl.addEventListener("input", validateForm);
  contactLinkEl.addEventListener("input", validateForm);

  // Fix: footer overlay touch issue + confirm initial state
  validateForm();
});