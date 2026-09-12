let credentials = null;
let storeData = null;

const $ = (id) => document.getElementById(id);

function authHeaders() {
  if (!credentials) return {};

  return {
    Authorization:
      "Basic " +
      btoa(credentials.user + ":" + credentials.pass),
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

  const user = $("user").value.trim();
  const pass = $("pass").value;

  credentials = {
    user,
    pass
  };

  $("loginError").textContent = "";

  try {
    await loadDashboard();

    $("loginPanel").hidden = true;
    $("dashboard").hidden = false;

  } catch (error) {

    credentials = null;

    $("loginError").textContent =
      "Invalid username or password.";

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
      <span>Active</span>
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

    $("products").innerHTML =
      "<p>No products yet.</p>";

    return;
  }

  $("products").innerHTML = products.map(product => {

    const stock = Number(product.stock || 0);

    return `

      <div class="admin-card glass">

        <div>

          <h3>${escapeHTML(product.name)}</h3>

          <p>
            ₹${Number(product.price || 0).toFixed(2)}
          </p>

          <p>
            Stock:
            <strong>${stock}</strong>
          </p>

          <p>
            Status:
            ${
              product.active === false
                ? "Inactive"
                : "Active"
            }
          </p>

        </div>

        <div class="admin-actions">

          <button
            onclick="editProduct('${product.id}')"
          >
            Edit
          </button>

          <button
            onclick="deleteProduct('${product.id}')"
          >
            Delete
          </button>

        </div>

      </div>

    `;

  }).join("");

}


// =========================
// ADD PRODUCT
// =========================

$("addProduct").onclick = () => {

  $("productModalTitle").textContent =
    "Add Product";

  $("productId").value = "";
  $("productName").value = "";
  $("productPrice").value = "";
  $("productDescription").value = "";
  $("productBadge").value = "";
  $("productStock").value = "0";
  $("productActive").checked = true;
  $("productKeys").value = "";

  $("productModal").hidden = false;

};


// =========================
// EDIT PRODUCT
// =========================

window.editProduct = function(id) {

  const product =
    (storeData.products || []).find(
      item => item.id === id
    );

  if (!product) return;

  $("productModalTitle").textContent =
    "Edit Product";

  $("productId").value = product.id;
  $("productName").value = product.name || "";
  $("productPrice").value = product.price || 0;
  $("productDescription").value =
    product.description || "";
  $("productBadge").value =
    product.badge || "";
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

    const id = $("productId").value;

    const keys = $("productKeys").value
      .split("\n")
      .map(key => key.trim())
      .filter(Boolean);

    const body = {

      name: $("productName").value.trim(),

      price: Number(
        $("productPrice").value || 0
      ),

      description:
        $("productDescription").value.trim(),

      badge:
        $("productBadge").value.trim(),

      stock: Number(
        $("productStock").value || 0
      ),

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
            body: JSON.stringify(body)
          }
        );

      } else {

        await api(
          "/api/admin/products",
          {
            method: "POST",
            body: JSON.stringify(body)
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

  if (!confirm("Delete this product?")) {
    return;
  }

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

  const orders = storeData.orders || [];

  if (!orders.length) {

    $("orders").innerHTML =
      "<p>No orders yet.</p>";

    return;
  }

  $("orders").innerHTML = orders.map(order => {

    const product =
      (storeData.products || []).find(
        item => item.id === order.productId
      );

    return `

      <div class="admin-card glass">

        <div>

          <h3>
            ${escapeHTML(
              product?.name || "Unknown Product"
            )}
          </h3>

          <p>
            Order ID:
            ${escapeHTML(order.id)}
          </p>

          <p>
            Customer:
            ${escapeHTML(order.customerName || "")}
          </p>

          <p>
            Payment Reference:
            ${escapeHTML(order.paymentReference || "")}
          </p>

          <p>
            Status:
            <strong>
              ${escapeHTML(order.status || "")}
            </strong>
          </p>

          ${
            order.key
              ? `
                <p>
                  Delivered Key:
                  <strong>${escapeHTML(order.key)}</strong>
                </p>
              `
              : ""
          }

        </div>

        <div class="admin-actions">

          ${
            order.status === "pending"
              ? `
                <button
                  onclick="approveOrder('${order.id}')"
                >
                  Approve
                </button>

                <button
                  onclick="rejectOrder('${order.id}')"
                >
                  Reject
                </button>
              `
              : ""
          }

        </div>

      </div>

    `;

  }).join("");

}


// =========================
// APPROVE ORDER
// =========================

window.approveOrder = async function(id) {

  if (!confirm("Approve this order?")) {
    return;
  }

  try {

    await api(
      "/api/admin/orders/" +
      encodeURIComponent(id),
      {
        method: "PUT",
        body: JSON.stringify({
          status: "approved"
        })
      }
    );

    await loadDashboard();

  } catch (error) {

    alert(error.message);

  }

};


// =========================
// REJECT ORDER
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
  storeData = null;

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
