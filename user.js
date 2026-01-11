const packagesEl = document.getElementById("packages");
const pkgCards = [...document.querySelectorAll(".pkg")];
const receiptEl = document.getElementById("receipt");
const fileInfo = document.getElementById("fileInfo");
const confirmBtn = document.getElementById("confirmBtn");
const msg = document.getElementById("msg");
const phoneEl = document.getElementById("phone");
const notesEl = document.getElementById("notes");

let selectedPackage = pkgCards[0].dataset.value;
let receiptSelected = false;

// Package selection
pkgCards.forEach(card => {
  card.addEventListener("click", () => {
    pkgCards.forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    selectedPackage = card.dataset.value;
  });
});

// Receipt upload required -> enable confirm
receiptEl.addEventListener("change", () => {
  const file = receiptEl.files?.[0];
  receiptSelected = !!file;
  fileInfo.innerHTML = file
    ? `<small>Selected: <b>${file.name}</b></small>`
    : `<small>No file selected</small>`;

  confirmBtn.disabled = !receiptSelected;
});

function showMessage(type, text){
  msg.style.display = "block";
  msg.className = `alert ${type}`;
  msg.textContent = text;
}

function getOrders(){
  return JSON.parse(localStorage.getItem("orders") || "[]");
}
function saveOrders(list){
  localStorage.setItem("orders", JSON.stringify(list));
}

confirmBtn.addEventListener("click", () => {
  const phone = phoneEl.value.trim();

  if (!phone) return showMessage("error", "Phone number is required.");
  if (!receiptSelected) return showMessage("error", "Receipt upload is required.");

  const file = receiptEl.files[0];

  // Demo: store only filename (NOT the image) for simplicity.
  // Real system: upload file to server/storage.
  const order = {
    id: crypto.randomUUID(),
    package: selectedPackage,
    phone,
    notes: notesEl.value.trim(),
    receiptFileName: file.name,
    createdAt: new Date().toISOString()
  };

  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  phoneEl.value = "";
  notesEl.value = "";
  receiptEl.value = "";
  receiptSelected = false;
  confirmBtn.disabled = true;
  fileInfo.innerHTML = `<small>No file selected</small>`;

  showMessage("success", `Order placed successfully. Package: ${order.package}`);
});