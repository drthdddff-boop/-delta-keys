<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DELTA.KEYS — Admin</title>
  <link rel="stylesheet" href="/styles.css">
</head>

<body>

  <div class="page-bg"></div>

  <main class="container">

    <!-- LOGIN -->
    <section id="loginPanel" class="glass admin-login">

      <h1>DELTA.KEYS</h1>
      <p>Admin Dashboard</p>

      <form id="loginForm">

        <input
          id="user"
          type="text"
          placeholder="Username"
          autocomplete="username"
          required
        >

        <input
          id="pass"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          required
        >

        <button type="submit">
          Login
        </button>

        <div id="loginError"></div>

      </form>

    </section>


    <!-- DASHBOARD -->
    <section id="dashboard" hidden>

      <div class="admin-header glass">

        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage products, stock and orders.</p>
        </div>

        <button id="logout">
          Logout
        </button>

      </div>


      <!-- STATS -->
      <div id="stats" class="stats-grid"></div>


      <!-- PRODUCTS -->
      <section class="glass admin-section">

        <div class="section-header">

          <div>
            <h2>Products & Stock</h2>
            <p>Manage your digital products.</p>
          </div>

          <button id="addProduct">
            + Add Product
          </button>

        </div>

        <div id="products"></div>

      </section>


      <!-- ORDERS -->
      <section class="glass admin-section">

        <div class="section-header">

          <div>
            <h2>Orders</h2>
            <p>Approve or reject customer payments.</p>
          </div>

        </div>

        <div id="orders"></div>

      </section>

    </section>

  </main>


  <!-- PRODUCT MODAL -->
  <div id="productModal" class="modal" hidden>

    <div class="modal-box glass">

      <h2 id="productModalTitle">
        Add Product
      </h2>

      <form id="productForm">

        <input type="hidden" id="productId">

        <label>
          Product Name
        </label>

        <input
          id="productName"
          type="text"
          required
        >

        <label>
          Price
        </label>

        <input
          id="productPrice"
          type="number"
          min="0"
          step="0.01"
          required
        >

        <label>
          Description
        </label>

        <textarea
          id="productDescription"
          rows="3"
        ></textarea>

        <label>
          Badge
        </label>

        <input
          id="productBadge"
          type="text"
          placeholder="Popular"
        >

        <label>
          Stock
        </label>

        <input
          id="productStock"
          type="number"
          min="0"
          step="1"
          required
        >

        <label class="checkbox-row">

          <input
            id="productActive"
            type="checkbox"
            checked
          >

          Active Product

        </label>

        <label>
          Digital Keys
        </label>

        <textarea
          id="productKeys"
          rows="8"
          placeholder="Enter one key per line"
        ></textarea>


        <div class="modal-actions">

          <button
            type="button"
            id="cancelProduct"
          >
            Cancel
          </button>

          <button type="submit">
            Save Product
          </button>

        </div>

      </form>

      <button
        id="closeProductModal"
        class="modal-close"
        type="button"
      >
        ×
      </button>

    </div>

  </div>


  <script src="/admin.js"></script>

</body>
</html>
