const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));


/* =========================================================
   DATABASE / STORE
========================================================= */

function ensureStore() {

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {

    const initial = {

      products: [

        {
          id: "delta-basic",
          name: "DELTA Basic Key",
          price: 99,
          description: "Instant digital access key after admin verification.",
          badge: "POPULAR",
          stock: 10,
          active: true,
          keys: []
        },

        {
          id: "delta-pro",
          name: "DELTA Pro Key",
          price: 199,
          description: "Premium digital access key with priority verification.",
          badge: "PRO",
          stock: 10,
          active: true,
          keys: []
        },

        {
          id: "delta-ultra",
          name: "DELTA Ultra Key",
          price: 299,
          description: "Ultimate digital access key for advanced users.",
          badge: "ULTRA",
          stock: 10,
          active: true,
          keys: []
        }

      ],

      orders: []

    };

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(initial, null, 2)
    );
  }
}

ensureStore();


function readStore() {

  return JSON.parse(
    fs.readFileSync(DATA_FILE, "utf8")
  );

}


function writeStore(data) {

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2)
  );

}


/* =========================================================
   NORMALIZE OLD PRODUCTS
========================================================= */

function normalizeProduct(product) {

  if (!Array.isArray(product.keys)) {
    product.keys = [];
  }

  if (typeof product.active !== "boolean") {
    product.active = true;
  }

  if (!Number.isFinite(Number(product.stock))) {
    product.stock = product.keys.length;
  }

  product.stock = Math.max(
    0,
    Number(product.stock)
  );

  return product;
}


function normalizeStore(store) {

  if (!Array.isArray(store.products)) {
    store.products = [];
  }

  if (!Array.isArray(store.orders)) {
    store.orders = [];
  }

  store.products =
    store.products.map(normalizeProduct);

  return store;
}


/* =========================================================
   PUBLIC ORDER
========================================================= */

function publicOrder(order) {

  return {

    id: order.id,

    productId: order.productId,

    productName: order.productName,

    amount: order.amount,

    customerName: order.customerName,

    customerContact: order.customerContact,

    paymentReference: order.paymentReference,

    status: order.status,

    key:
      order.status === "approved"
        ? order.key
        : "",

    createdAt: order.createdAt,

    updatedAt: order.updatedAt

  };

}


/* =========================================================
   ADMIN AUTH
========================================================= */

function adminAuth(req, res, next) {

  const auth =
    req.headers.authorization || "";

  if (!auth.startsWith("Basic ")) {

    return res
      .status(401)
      .json({
        error: "Admin login required."
      });

  }

  let decoded = "";

  try {

    decoded =
      Buffer
        .from(auth.slice(6), "base64")
        .toString("utf8");

  } catch {

    return res
      .status(401)
      .json({
        error: "Invalid authentication."
      });

  }

  const split =
    decoded.indexOf(":");

  const user =
    split >= 0
      ? decoded.slice(0, split)
      : "";

  const pass =
    split >= 0
      ? decoded.slice(split + 1)
      : "";

  const expectedUser =
    process.env.ADMIN_USER || "admin";

  const expectedPass =
    process.env.ADMIN_PASSWORD ||
    "change-this-password";

  if (
    user !== expectedUser ||
    pass !== expectedPass
  ) {

    return res
      .status(401)
      .json({
        error:
          "Invalid admin username or password."
      });

  }

  next();

}


/* =========================================================
   PAGES
========================================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


app.get("/products", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "products.html"
    )
  );

});


app.get("/payment", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "payment.html"
    )
  );

});


app.get("/status", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "status.html"
    )
  );

});


app.get("/admin", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "admin.html"
    )
  );

});


/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      ok: true,

      app: "DELTA.KEYS",

      paymentMode:
        "manual-admin-approval"

    });

  }
);


/* =========================================================
   PUBLIC PRODUCTS
========================================================= */

app.get(
  "/api/products",
  (req, res) => {

    const store =
      normalizeStore(readStore());

    /*
      Only active products are shown
      on the customer storefront.
    */

    const products =
      store.products
        .filter(
          product =>
            product.active !== false
        )
        .map(product => ({

          id: product.id,

          name: product.name,

          price: product.price,

          description:
            product.description || "",

          badge:
            product.badge || "",

          stock:
            Number(product.stock || 0)

        }));

    res.json(products);

  }
);


/* =========================================================
   CREATE ORDER
========================================================= */

app.post(
  "/api/orders",
  (req, res) => {

    const {

      productId,

      customerName,

      customerContact,

      paymentReference

    } = req.body || {};

    const store =
      normalizeStore(readStore());

    const product =
      store.products.find(
        p => p.id === productId
      );


    if (!product) {

      return res
        .status(400)
        .json({
          error:
            "Product not found."
        });

    }


    if (product.active === false) {

      return res
        .status(400)
        .json({
          error:
            "This product is currently unavailable."
        });

    }


    if (
      !String(customerName || "").trim() ||
      !String(customerContact || "").trim() ||
      !String(paymentReference || "").trim()
    ) {

      return res
        .status(400)
        .json({
          error:
            "Please complete all required fields."
        });

    }


    /*
      Do not allow orders when
      the configured stock is zero.
    */

    if (
      Number(product.stock || 0) <= 0
    ) {

      return res
        .status(400)
        .json({
          error:
            "This product is currently out of stock."
        });

    }


    const now =
      new Date().toISOString();


    const order = {

      id:
        "DK-" +
        crypto
          .randomBytes(4)
          .toString("hex")
          .toUpperCase(),

      productId:
        product.id,

      productName:
        product.name,

      amount:
        product.price,

      customerName:
        String(customerName).trim(),

      customerContact:
        String(customerContact).trim(),

      paymentReference:
        String(paymentReference).trim(),

      status:
        "pending",

      key:
        "",

      createdAt:
        now,

      updatedAt:
        now

    };


    store.orders.unshift(order);

    writeStore(store);


    res.status(201).json({

      order:
        publicOrder(order)

    });

  }
);


/* =========================================================
   CUSTOMER ORDER STATUS
========================================================= */

app.get(
  "/api/orders/:id",
  (req, res) => {

    const store =
      normalizeStore(readStore());

    const order =
      store.orders.find(
        o =>
          o.id === req.params.id
      );


    if (!order) {

      return res
        .status(404)
        .json({
          error:
            "Order not found."
        });

    }


    res.json({

      order:
        publicOrder(order)

    });

  }
);


/* =========================================================
   ADMIN DATA
========================================================= */

app.get(
  "/api/admin/data",
  adminAuth,
  (req, res) => {

    const store =
      normalizeStore(readStore());

    writeStore(store);

    res.json({

      products:
        store.products,

      orders:
        store.orders.map(
          order => ({ ...order })
        )

    });

  }
);


/* =========================================================
   ADMIN — UPDATE ORDER
========================================================= */

app.put(
  "/api/admin/orders/:id",
  adminAuth,
  (req, res) => {

    const store =
      normalizeStore(readStore());

    const order =
      store.orders.find(
        o =>
          o.id === req.params.id
      );


    if (!order) {

      return res
        .status(404)
        .json({
          error:
            "Order not found."
        });

    }


    const {

      status,

      key,

      customerName,

      customerContact

    } = req.body || {};


    if (
      status &&
      ![
        "pending",
        "approved",
        "rejected"
      ].includes(status)
    ) {

      return res
        .status(400)
        .json({
          error:
            "Invalid status."
        });

    }


    if (
      typeof customerName === "string"
    ) {

      order.customerName =
        customerName.trim();

    }


    if (
      typeof customerContact === "string"
    ) {

      order.customerContact =
        customerContact.trim();

    }


    if (typeof key === "string") {

      order.key =
        key.trim();

    }


    /*
      APPROVAL
    */

    if (status === "approved") {

      if (
        !String(order.key || "").trim()
      ) {

        return res
          .status(400)
          .json({
            error:
              "Enter a customer key before approving."
          });

      }


      const product =
        store.products.find(
          p =>
            p.id === order.productId
        );


      if (!product) {

        return res
          .status(400)
          .json({
            error:
              "The product for this order no longer exists."
          });

      }


      /*
        Prevent the same order
        from consuming stock twice.
      */

      if (order.status !== "approved") {

        if (
          Number(product.stock || 0) <= 0
        ) {

          return res
            .status(400)
            .json({
              error:
                "No stock remaining for this product."
            });

        }


        /*
          If the product has an inventory
          of digital keys, remove the
          delivered key from the inventory.
        */

        if (
          Array.isArray(product.keys) &&
          product.keys.length > 0
        ) {

          const keyIndex =
            product.keys.indexOf(
              order.key
            );


          if (keyIndex >= 0) {

            product.keys.splice(
              keyIndex,
              1
            );

          }

        }


        product.stock =
          Math.max(
            0,
            Number(product.stock || 0) - 1
          );

      }

    }


    /*
      If an approved order is changed
      back to pending/rejected, restore
      one stock unit.
    */

    if (
      order.status === "approved" &&
      status &&
      status !== "approved"
    ) {

      const product =
        store.products.find(
          p =>
            p.id === order.productId
        );


      if (product) {

        product.stock =
          Number(product.stock || 0) + 1;

      }

    }


    if (status) {

      order.status =
        status;

    }


    order.updatedAt =
      new Date().toISOString();


    writeStore(store);


    res.json({

      order:
        publicOrder(order)

    });

  }
);


/* =========================================================
   ADMIN — UPDATE PRODUCT
========================================================= */

app.put(
  "/api/admin/products/:id",
  adminAuth,
  (req, res) => {

    const store =
      normalizeStore(readStore());

    const product =
      store.products.find(
        p =>
          p
