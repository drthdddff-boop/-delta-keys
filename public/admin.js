let credentials = null;
let storeData = null;

const $ = (id) => document.getElementById(id);

function authHeaders() {
  return {
    "Authorization": "Basic " + btoa(credentials.user + ":" + credentials.pass),
    "Content-Type": "application/json"
  };
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}


// =========================
// LOGIN
// =========================

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  credentials = {
    user: $("user").value.trim(),
    pass: $("pass").value
  };

  $("loginError").textContent = "";

  try {
    await loadDashboard();

    $("loginPanel").hidden = true;
    $("dashboard").hidden = false;

  } catch (error) {
    credentials = null;
    $("loginError").textContent = "Invalid username or password.";
  }
});


// =========================
// LOAD DASHBOARD
// =========================

async function loadDashboard() {
  storeData = await api("/api/admin/data");

  renderStats();
  renderProducts();
  renderOrders();
}


// =========================
// STATS
// =========================

function renderStats() {

  const products = storeData.products || [];
  const orders = storeData.orders || [];

  const active = products.filter(
    product => product.active !== false
  ).length;

  const stock = products.reduce(
    (total, product) =>
      total + Number(product.stock || 0),
    0
  );

  const pending = orders.filter(
    order => order.status === "pending"
  ).length;

  $("stats").innerHTML = `

    <div class="stat-card glass">
      <span>Products</span>
      <strong>${products.length}</strong>
    </div>

    <div class="stat-card glass">
      <span>Active Products</span>
      <strong>${active}</strong>
    </div>

    <div class="stat-card glass">
      <span>Total Stock</span>
      <strong>${stock}</strong>
    </div>

    <div class="stat-card glass">
      <span>Pending Orders</span>
      <strong>${pending}</strong>
    </div>

  `;
}


// =========================
// PRODUCTS
// =========================

function renderProducts() {

  const products = storeData.products || [];

  if (!products.length) {

    $("products").innerHTML = `
      <div class="empty">
        No products yet.
      </div>
    `;

    return;
  }

  $("products").innerHTML = products.map(product => {

    const stock = Number(
      product.stock || 0
    );

    const active =
      product.active !== false;

    return `

      <article class="admin-product glass">

        <div class="product-info">

          <div class="product-name">
            ${escapeHTML(product.name)}
          </div>

          <div class="product-details">

            ₹${Number(product.price || 0)}

            <span>•</span>

            Stock:
            <strong>${stock}</strong>

            <span>•</span>

            <span class="${active ? "status-active" : "status-off"}">
              ${active ? "Active" : "Disabled"}
            </span>

          </div>

        </div>

        <div class="product-actions">

          <button
            class="btn ghost"
            onclick="editProduct('${product.id}')">
            ✏️ Edit
          </button>

          <button
            class="btn danger"
            onclick="deleteProduct('${product.id}')">
            🗑️ Delete
          </button>

        </div>

      </article>

    `;

  }).join("");
}


// =========================
// ADD PRODUCT
// =========================

$("addProduct").addEventListener("click", () => {

  $("productModalTitle").textContent =
    "Add Product";

  $("productId").value = "";
  $("productName").value = "";
  $("productPrice").value = "";
  $("productStock").value = "0";
  $("productActive").checked = true;
  $("productKeys").value = "";

  $("productModal").hidden = false;

});


// =========================
// EDIT PRODUCT
// =========================

window.editProduct = function(id) {

  const product =
    storeData.products.find(
      item => item.id === id
    );

  if (!product) return;

  $("productModalTitle").textContent =
    "Edit Product";

  $("productId").value =
    product.id;

  $("productName").value =
    product.name || "";

  $("productPrice").value =
    product.price || 0;

  $("productStock").value =
    product.stock || 0;

  $("productActive").checked =
    product.active !== false;

  $("productKeys").value =
    (product.keys || []).join("\n");

  $("productModal").hidden = false;
};


// =========================
// SAVE PRODUCT
// =========================

$("productForm").addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const id =
      $("productId").value;

    const keys =
      $("productKeys").value
        .split("\n")
        .map(key => key.trim())
        .filter(Boolean);

    const product = {

      name:
        $("productName").value.trim(),

      price:
        Number($("productPrice").value),

      stock:
        keys.length > 0
          ? keys.length
          : Number($("productStock").value),

      active:
        $("productActive").checked,

      keys

    };

    try {

      if (id) {

        await api(
          "/api/admin/products/" +
          encodeURIComponent(id),
          {
            method: "PUT",
            body: JSON.stringify(product)
          }
        );

      } else {

        await api(
          "/api/admin/products",
          {
            method: "POST",
            body: JSON.stringify(product)
          }
        );

      }

      $("productModal").hidden = true;

      await loadDashboard();

    } catch (error) {

      alert(error.message);

    }

  }
);


// =========================
// DELETE PRODUCT
// =========================

window.deleteProduct = async function(id) {

  const product =
    storeData.products.find(
      item => item.id === id
    );

  if (!product) return;

  const confirmed =
    confirm(
      `Delete "${product.name}"?`
    );

  if (!confirmed) return;

  try {

    await api(
      "/api/admin/products/" +
      encodeURIComponent(id),
      {
        method: "DELETE"
      }
    );

    await loadDashboard();

  } catch (error) {

    alert(error.message);

  }

};


// =========================
// ORDERS
// =========================

function renderOrders() {

  const orders =
    storeData.orders || [];

  if (!orders.length) {

    $("orders").innerHTML = `
      <div class="empty">
        No customer orders yet.
      </div>
    `;

    return;
  }

  $("orders").innerHTML =
    orders.map(order => `

      <article class="order-card glass">

        <div>

          <strong>
            ${escapeHTML(order.productName)}
          </strong>

          <p class="muted">
            Customer:
            ${escapeHTML(order.customerName)}
          </p>

          <p class="muted">
            Contact:
            ${escapeHTML(order.customerContact)}
          </p>

          <p class="muted">
            Payment reference:
            ${escapeHTML(order.paymentReference || "—")}
          </p>

          <p class="muted">
            Order ID:
            ${escapeHTML(order.id)}
          </p>

        </div>

        <span class="order-status ${order.status}">
          ${escapeHTML(order.status)}
        </span>

        <div class="order-actions">

          <input
            id="key-${order.id}"
            value="${escapeHTML(order.key || "")}"
            placeholder="Enter digital key">

          <button
            class="btn primary"
            onclick="approveOrder('${order.id}')">
            ✓ Approve
          </button>

          <button
            class="btn danger"
            onclick="rejectOrder('${order.id}')">
            Reject
          </button>

        </div>

      </article>

    `).join("");
}


// =========================
// APPROVE
// =========================

window.approveOrder = async function(id) {

  const keyInput =
    document.getElementById(
      "key-" + id
    );

  const key =
    keyInput ? keyInput.value.trim() : "";

  if (!key) {

    alert(
      "Enter the customer's digital key before approving."
    );

    return;
  }

  try {

    await api(
      "/api/admin/orders/" +
      encodeURIComponent(id),
      {
        method: "PUT",
        body: JSON.stringify({
          status: "approved",
          key
        })
      }
    );

    await loadDashboard();

  } catch (error) {

    alert(error.message);

  }

};


// =========================
// REJECT
// =========================

window.rejectOrder = async function(id) {

  if (!confirm("Reject this order?")) {
    return;
  }

  try {

    await api(
      "/api/admin/orders/" +
      encodeURIComponent(id),
      {
        method: "PUT",
        body: JSON.stringify({
          status: "rejected",
          key: ""
        })
      }
    );

    await loadDashboard();

  } catch (error) {

    alert(error.message);

  }

};


// =========================
// CLOSE MODAL
// =========================

$("closeProductModal").onclick = () => {
  $("productModal").hidden = true;
};

$("cancelProduct").onclick = () => {
  $("productModal").hidden = true;
};


// =========================
// LOGOUT
// =========================

$("logout").onclick = () => {

  credentials = null;

  $("dashboard").hidden = true;
  $("loginPanel").hidden = false;

  $("pass").value = "";

};


// =========================
// ESCAPE HTML
// =========================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
