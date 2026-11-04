const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authMiddleware");
const { insertNotification } = require("./notificationRoutes");

const notifyAllTeachers = async ({ message, type, referenceId, uniqueKeyPrefix }) => {
  await insertNotification({
    title:   message,
    message,
    type,
    role:    "teacher",
    userId:  null,
    referenceId,
    uniqueKey: `teacher:all:${uniqueKeyPrefix}:${referenceId}`
  });
};

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpay = razorpayKeyId && razorpayKeySecret
  ? new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret })
  : null;

const verifyHexSignature = (payload, signature, secret) => {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};

const rupeesToPaise = (amount) => {
  const match = String(amount ?? "").trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return NaN;
  return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
};

const storedAmountMatches = (storedAmount, providerAmount, currency) =>
  String(currency || "").toUpperCase() === "INR" &&
  Number.isSafeInteger(Number(providerAmount)) &&
  Number(providerAmount) === rupeesToPaise(storedAmount);

const providerAmountsMatch = (orderAmountPaise, paymentAmountPaise, currency) =>
  String(currency || "").toUpperCase() === "INR" &&
  Number.isSafeInteger(Number(orderAmountPaise)) &&
  Number(orderAmountPaise) > 0 &&
  Number.isSafeInteger(Number(paymentAmountPaise)) &&
  Number(paymentAmountPaise) > 0 &&
  Number(orderAmountPaise) === Number(paymentAmountPaise);

const recordSuccessfulPayment = async ({ orderId, paymentId, method, amount, currency }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [payments] = await connection.execute(
      "SELECT * FROM payments WHERE order_id = ? LIMIT 1 FOR UPDATE", [orderId]
    );
    if (!payments.length) throw Object.assign(new Error("Payment order details not found."), { status: 404 });
    const row = payments[0];
    if (!storedAmountMatches(row.amount, amount, currency)) {
      throw Object.assign(new Error("Payment amount or currency does not match the order."), { status: 400 });
    }
    if (row.status === "Success") {
      if (row.payment_id !== paymentId) throw Object.assign(new Error("Payment order was already completed."), { status: 409 });
      await connection.commit();
      return false;
    }
    await connection.execute(
      "UPDATE payments SET payment_id = ?, status = 'Success', method = ? WHERE order_id = ?",
      [paymentId, method || "Razorpay", orderId]
    );
    const [fees] = await connection.execute(
      "SELECT id FROM fee_records WHERE reference_no = ? LIMIT 1 FOR UPDATE", [paymentId]
    );
    if (!fees.length) {
      await connection.execute(
        `INSERT INTO fee_records (student_id, amount, paid_date, payment_mode, reference_no, status)
         VALUES (?, ?, CURDATE(), 'Razorpay', ?, 'Paid')`,
        [row.student_id, row.amount, paymentId]
      );
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ===============================
// CREATE PAYMENT ORDER
// ===============================
router.post("/create-order", authMiddleware, authorizeRoles("student"), async (req, res, next) => {
  if (!razorpay) return res.status(503).json({ message: "Online payments are not configured." });
  try {
    // 1. Fetch total fee from students table
    const [studentRows] = await pool.execute(
      "SELECT total_fee FROM students WHERE user_id = ? LIMIT 1",
      [req.user.id]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student record not found." });
    }
    const totalFeePaise = rupeesToPaise(studentRows[0].total_fee || 0);

    // 2. Fetch sum of already paid fees
    const [paidRows] = await pool.execute(
      "SELECT SUM(amount) AS total_paid FROM fee_records WHERE student_id = ? AND status = 'Paid'",
      [req.user.id]
    );
    const totalPaidPaise = rupeesToPaise(paidRows[0].total_paid || 0);

    // 3. Calculate remaining payable balance
    const remainingPaise = Math.max(0, totalFeePaise - totalPaidPaise);
    if (!Number.isSafeInteger(remainingPaise)) throw new Error("Stored fee amount is invalid.");
    const remainingAmount = remainingPaise / 100;
    if (remainingPaise <= 0) {
      return res.status(400).json({ message: "Your fees are already fully paid." });
    }

    // 4. Create Razorpay order
    const options = {
      amount: remainingPaise, // Razorpay expects paise; database values remain rupees.
      currency: "INR",
      receipt: `receipt_${req.user.id}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // 5. Store payment intent in payments table
    await pool.execute(
      "INSERT INTO payments (order_id, student_id, amount, status) VALUES (?, ?, ?, 'Created')",
      [order.id, req.user.id, remainingAmount]
    );

    res.json({
      keyId: razorpayKeyId,
      orderId: order.id,
      amount: remainingAmount,
      currency: "INR"
    });
  } catch (err) {
    next(err);
  }
});

// ===============================
// VERIFY PAYMENT SIGNATURE
// ===============================
router.post("/verify", authMiddleware, authorizeRoles("student"), async (req, res, next) => {
  if (!razorpay) return res.status(503).json({ message: "Online payments are not configured." });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Payment details and signature are required." });
  }

  try {
    // 1. Verify Razorpay signature
    if (!verifyHexSignature(Buffer.from(`${razorpay_order_id}|${razorpay_payment_id}`), razorpay_signature, razorpayKeySecret)) {
      return res.status(400).json({ message: "Payment verification failed. Invalid signature." });
    }

    // Confirm the provider's order and payment amounts/currency against our
    // persisted intent before recording any payment.
    const [providerOrder, providerPayment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id)
    ]);
    if (providerOrder.id !== razorpay_order_id || providerPayment.order_id !== razorpay_order_id ||
        providerPayment.status !== "captured" ||
        !providerAmountsMatch(providerOrder.amount, providerPayment.amount, providerPayment.currency) ||
        String(providerOrder.currency).toUpperCase() !== String(providerPayment.currency).toUpperCase()) {
      return res.status(400).json({ message: "Payment amount, currency, or provider details do not match." });
    }

    // 2. Fetch original payment record
    const [payments] = await pool.execute(
      "SELECT * FROM payments WHERE order_id = ? LIMIT 1",
      [razorpay_order_id]
    );
    if (payments.length === 0) {
      return res.status(404).json({ message: "Payment order details not found." });
    }
    const paymentRecord = payments[0];
    if (Number(paymentRecord.student_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const newlyRecorded = await recordSuccessfulPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      method: method || providerPayment.method || "Razorpay",
      amount: providerPayment.amount,
      currency: providerPayment.currency
    });

    // Notifications remain best-effort and follow the committed payment.
    const [fees] = await pool.execute("SELECT id FROM fee_records WHERE reference_no = ? LIMIT 1", [razorpay_payment_id]);
    if (newlyRecorded && fees.length) {
      const feeId = fees[0].id;
      const amtDisplay = `₹${Number(paymentRecord.amount).toLocaleString("en-IN")}`;

      // Fetch student name
      let studentName = "Student";
      try {
        const [[stu]] = await pool.execute("SELECT name FROM students WHERE user_id = ? LIMIT 1", [paymentRecord.student_id]);
        if (stu) studentName = stu.name;
      } catch (_) {}

      await insertNotification({
        title:   "Fee paid successfully",
        message: `Fees paid successfully: ${amtDisplay}`,
        type:    "fee",
        role:    "student",
        userId:  paymentRecord.student_id,
        referenceId: feeId,
        uniqueKey: `student:${paymentRecord.student_id}:fee-paid:${feeId}`
      });
      await insertNotification({
        title:   "Fee Payment Recorded",
        message: `${studentName} paid ${amtDisplay} via Razorpay.`,
        type:    "fee",
        role:    "admin",
        referenceId: feeId,
        uniqueKey: `admin:fee-collected:${feeId}`
      });
      await insertNotification({
        title:   "Fee Payment Recorded",
        message: `${studentName} paid ${amtDisplay} via Razorpay.`,
        type:    "fee",
        role:    "staff",
        referenceId: feeId,
        uniqueKey: `staff:fee-collected:${feeId}`
      });
      const teacherMessage = `${studentName} paid ${amtDisplay} via Razorpay`;
      await notifyAllTeachers({
        message: teacherMessage,
        type: "fee",
        referenceId: feeId,
        uniqueKeyPrefix: "fee-collected"
      });
    }

    res.json({ message: "Payment verified and recorded successfully." });
  } catch (err) {
    next(err);
  }
});

// ===============================
// RAZORPAY WEBHOOK SUPPORT
// ===============================
router.post("/webhook", async (req, res, next) => {
  const signature = req.headers["x-razorpay-signature"];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret || !Buffer.isBuffer(req.body)) {
    return res.status(400).json({ message: "Missing signature or secret configuration." });
  }

  try {
    if (!verifyHexSignature(req.body, signature, webhookSecret)) {
      return res.status(400).json({ message: "Signature verification failed." });
    }

    let payload;
    try { payload = JSON.parse(req.body.toString("utf8")); }
    catch { return res.status(400).json({ message: "Invalid webhook payload." }); }
    const event = payload.event;
    if (event === "order.paid") {
      const order = payload.payload?.order?.entity;
      const payment = payload.payload?.payment?.entity;
      if (!order?.id || !payment?.id || payment.order_id !== order.id || payment.status !== "captured" || !Number.isInteger(Number(payment.amount))) {
        return res.status(400).json({ message: "Invalid payment event." });
      }
      if (!providerAmountsMatch(order.amount, payment.amount, payment.currency) ||
          String(order.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
        return res.status(400).json({ message: "Payment amount or currency does not match the order." });
      }
      await recordSuccessfulPayment({
        orderId: order.id, paymentId: payment.id, method: payment.method,
        amount: payment.amount, currency: payment.currency
      });
    }

    res.json({ status: "ok" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
