const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD =
process.env.ADMIN_PASSWORD || "change-this-password";

/* =========================================================
BASIC SETUP
========================================================= */

if (!fs.existsSync(DATA_DIR)) {
fs.mkdirSync(DATA_DIR, { recursive: true });
}

function makeId(prefix) {
return (
prefix +
"_" +
crypto.randomBytes(8).toString("hex")
);
}

function defaultStore() {
return {
products: [
{
id: "product_demo",
name: "Digital Key",
price: 99,
description: "Instant digital key after approval.",
badge: "DIGITAL",
active: true,
stock: 0,
keys: []
}
],
orders: []
};
}

function readStore() {
try {
if (!fs.existsSync(STORE_FILE)) {
const store = defaultStore();
fs.writeFileSync(
STORE_FILE,
JSON.stringify(store, null, 2)
);
return store;
}

const raw = fs.readFileSync(STORE_FILE, "utf8");

if (!raw.trim()) {
  return defaultStore();
}

return JSON.parse(raw);

} catch (error) {
console.error("STORE READ ERROR:", error);
return defaultStore();
}
}

function writeStore(store) {
fs.writeFileSync(
STORE_FILE,
JSON.stringify(store, null, 2)
);
}

function normalizeProduct(product) {
if (!product || typeof product !== "object") {
return null;
}

if (!Array.isArray(product.keys)) {
product.keys = [];
}

product.active =
product.active !== false;

product.stock =
Math.max(
0,
Number(product.stock || 0)
);

if (product.keys.length > 0) {
product.stock = product.keys.length;
}

return product;
}

function normalizeStore(store) {
if (!store || typeof store !== "object") {
store = defaultStore();
}

if (!Array.isArray(store.products)) {
store.products = [];
}

if (!Array.isArray(store.orders)) {
store.orders = [];
}

store.products =
store.products
.map(normalizeProduct)
.filter(Boolean);

return store;
}

/* =========================================================
EXPRESS
========================================================= */

app.use(express.json());

app.use(
express.urlencoded({
extended: true
})
);

app.use(
express.static(PUBLIC_DIR)
);

/* =========================================================
ADMIN AUTH
========================================================= */

function adminAuth(req, res, next) {
const header =
req.headers.authorization || "";

if (!header.startsWith("Basic ")) {
res.setHeader(
"WWW-Authenticate",
'Basic realm="DELTA.KEYS Admin"'
);

return res.status(401).json({
  error: "Admin authentication required."
});

}

const encoded =
header.slice("Basic ".length);

let decoded = "";

try {
decoded =
Buffer.from(
encoded,
"base64"
).toString("utf8");
} catch (error) {
return res.status(401).json({
error: "Invalid authentication."
});
}

const separator =
decoded.indexOf(":");

if (separator === -1) {
return res.status(401).json({
error: "Invalid authentication."
});
}

const username =
decoded.slice(0, separator);

const password =
decoded.slice(separator + 1);

if (
username !== ADMIN_USER ||
password !== ADMIN_PASSWORD
) {
return res.status(401).json({
error: "Invalid admin username or password."
});
}

next();
}

/* =========================================================
PUBLIC PRODUCTS
========================================================= */

app.get(
"/api/products",
(req, res) => {

const store =
  normalizeStore(readStore());

const products =
  store.products
    .filter(product => product.active)
    .map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description || "",
      badge: product.badge || "DIGITAL",
      stock: Number(product.stock || 0)
    }));

res.json({
  products
});

}
);

/* =========================================================
CREATE ORDER
========================================================= */

app.post(
"/api/orders",
(req, res) => {

const store =
  normalizeStore(readStore());

const {
  productId,
  customerName,
  customerContact,
  paymentReference
} = req.body || {};

if (!productId) {
  return res.status(400).json({
    error: "Product is required."
  });
}

const product =
  store.products.find(
    p => p.id === productId
  );

if (!product) {
  return res.status(404).json({
    error: "Product not found."
  });
}

if (!product.active) {
  return res.status(400).json({
    error: "This product is currently unavailable."
  });
}

if (
  Number(product.stock || 0) <= 0
) {
  return res.status(400).json({
    error: "This product is out of stock."
  });
}

if (
  !customerName ||
  !customerContact
) {
  return res.status(400).json({
    error: "Customer name and contact are required."
  });
}

if (!paymentReference) {
  return res.status(400).json({
    error: "Payment reference is required."
  });
}

const order = {
  id: makeId("order"),
  productId: product.id,
  productName: product.name,
  price: Number(product.price || 0),
  customerName:
    String(customerName).trim(),
  customerContact:
    String(customerContact).trim(),
  paymentReference:
    String(paymentReference).trim(),
  status: "pending",
  key: "",
  createdAt:
    new Date().toISOString(),
  updatedAt:
    new Date().toISOString()
};

store.orders.unshift(order);

writeStore(store);

res.status(201).json({
  order: publicOrder(order)
});

}
);

/* =========================================================
PUBLIC ORDER STATUS
========================================================= */

function publicOrder(order) {
return {
id: order.id,
productId: order.productId,
productName: order.productName,
price: order.price,
customerName: order.customerName,
status: order.status,
key:
order.status === "approved"
? order.key
: "",
createdAt: order.createdAt,
updatedAt: order.updatedAt
};
}

app.get(
"/api/orders/:id",
(req, res) => {

const store =
  normalizeStore(readStore());

const order =
  store.orders.find(
    o => o.id === req.params.id
  );

if (!order) {
  return res.status(404).json({
    error: "Order not found."
  });
}

res.json({
  order: publicOrder(order)
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

res.json({
  products: store.products,
  orders: store.orders
});

}
);

/* =========================================================
ADMIN UPDATE ORDER
========================================================= */

app.put(
"/api/admin/orders/:id",
adminAuth,
(req, res) => {

const store =
  normalizeStore(readStore());

const order =
  store.orders.find(
    o => o.id === req.params.id
  );

if (!order) {
  return res.status(404).json({
    error: "Order not found."
  });
}

const status =
  req.body &&
  req.body.status
    ? String(req.body.status)
    : "";

const newKey =
  req.body &&
  req.body.key !== undefined
    ? String(req.body.key)
    : "";

const allowedStatuses = [
  "pending",
  "approved",
  "rejected"
];

if (
  status &&
  !allowedStatuses.includes(status)
) {
  return res.status(400).json({
    error: "Invalid order status."
  });
}

/* -----------------------------------------------------
   APPROVE ORDER
----------------------------------------------------- */

if (
  status === "approved" &&
  order.status !== "approved"
) {

  const product =
    store.products.find(
      p =>
        p.id === order.productId
    );

  if (!product) {
    return res.status(400).json({
      error: "Product no longer exists."
    });
  }

  if (
    Number(product.stock || 0) <= 0
  ) {
    return res.status(400).json({
      error: "Product is out of stock."
    });
  }

  let deliveryKey =
    newKey.trim();

  /* ---------------------------------------------------
     USE FIRST DIGITAL KEY AUTOMATICALLY
  --------------------------------------------------- */

  if (
    !deliveryKey &&
    Array.isArray(product.keys) &&
    product.keys.length > 0
  ) {
    deliveryKey =
      String(
        product.keys.shift()
      ).trim();
  }

  /*
    A key can be manually entered by admin.
    If no key inventory exists, approval
    can still work with the manually entered key.
  */

  if (!deliveryKey) {
    return res.status(400).json({
      error:
        "Enter a digital key or add keys to this product first."
    });
  }

  order.key = deliveryKey;

  product.stock =
    Math.max(
      0,
      Number(product.stock || 0) - 1
    );
}

/* -----------------------------------------------------
   RESTORE STOCK WHEN APPROVED ORDER
   IS CHANGED BACK
----------------------------------------------------- */

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
  order.status = status;
}

if (
  req.body &&
  req.body.key !== undefined &&
  status !== "approved"
) {
  order.key =
    newKey.trim();
}

order.updatedAt =
  new Date().toISOString();

writeStore(store);

res.json({
  order
});

}
);

/* =========================================================
ADMIN UPDATE PRODUCT
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
      p.id === req.params.id
  );

if (!product) {
  return res.status(404).json({
    error: "Product not found."
  });
}

const body =
  req.body || {};

if (
  body.name !== undefined
) {
  product.name =
    String(body.name).trim();
}

if (
  body.price !== undefined
) {
  product.price =
    Number(body.price || 0);
}

if (
  body.description !== undefined
) {
  product.description =
    String(body.description);
}

if (
  body.badge !== undefined
) {
  product.badge =
    String(body.badge);
}

if (
  body.active !== undefined
) {
  product.active =
    body.active === true ||
    body.active === "true";
}

if (
  Array.isArray(body.keys)
) {
  product.keys =
    body.keys
      .map(k => String(k).trim())
      .filter(Boolean);

  product.stock =
    product.keys.length;
} else if (
  body.stock !== undefined
) {
  product.stock =
    Math.max(
      0,
      Number(body.stock || 0)
    );
}

normalizeProduct(product);

writeStore(store);

res.json({
  product
});

}
);

/* =========================================================
ADMIN CREATE PRODUCT
========================================================= */

app.post(
"/api/admin/products",
adminAuth,
(req, res) => {

const store =
  normalizeStore(readStore());

const body =
  req.body || {};

const keys =
  Array.isArray(body.keys)
    ? body.keys
        .map(k => String(k).trim())
        .filter(Boolean)
    : [];

const product = {
  id: makeId("product"),
  name:
    String(
      body.name || "New Product"
    ).trim(),
  price:
    Number(body.price || 0),
  description:
    String(
      body.description || ""
    ),
  badge:
    String(
      body.badge || "DIGITAL"
    ),
  active:
    body.active !== false &&
    body.active !== "false",
  stock:
    keys.length > 0
      ? keys.length
      : Math.max(
          0,
          Number(body.stock || 0)
        ),
  keys
};

store.products.push(product);

writeStore(store);

res.status(201).json({
  product
});

}
);

/* =========================================================
ADMIN DELETE PRODUCT
========================================================= */

app.delete(
"/api/admin/products/:id",
adminAuth,
(req, res) => {

const store =
  normalizeStore(readStore());

const index =
  store.products.findIndex(
    p =>
      p.id === req.params.id
  );

if (index === -1) {
  return res.status(404).json({
    error: "Product not found."
  });
}

store.products.splice(
  index,
  1
);

writeStore(store);

res.json({
  success: true
});

}
);

/* =========================================================
HEALTH CHECK
========================================================= */

app.get(
"/api/health",
(req, res) => {
res.json({
ok: true,
service: "DELTA.KEYS"
});
}
);

/* =========================================================
HTML FALLBACK
========================================================= */

app.get(
"/",
(req, res) => {
res.sendFile(
path.join(
PUBLIC_DIR,
"index.html"
)
);
}
);

/* =========================================================
ERROR HANDLER
========================================================= */

app.use(
(err, req, res, next) => {

console.error(
  "SERVER ERROR:",
  err
);

res.status(500).json({
  error:
    "Internal server error."
});

}
);

/* =========================================================
START
========================================================= */

app.listen(
PORT,
"0.0.0.0",
() => {
console.log(
"DELTA.KEYS server running on port ${PORT}"
);
}
);
