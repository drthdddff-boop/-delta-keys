# DELTA.KEYS — Admin Approval Edition

Features:
- Modern dark/glass UI with floating animated background
- Separate Home, Products, Payment, Status/Key and Admin pages
- No Razorpay
- Customer selects a product, enters payment reference, then sees "Waiting for verification"
- Admin login
- Admin can approve/reject orders
- Admin can edit the customer's delivered key before approval
- Customer can copy the approved key
- Orders and keys are stored in `data/store.json`

## Railway variables

Set:
- ADMIN_USER=admin
- ADMIN_PASSWORD=your-own-password

No Razorpay variables are needed.

## Local run

npm install
npm start
