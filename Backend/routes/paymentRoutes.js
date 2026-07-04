const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authMiddleware");
const { insertNotification } = require("./notificationRoutes");

// Instantiate Razorpay client
// Using fallback credentials for clean boot if not defined in .env yet
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret
});

// ===============================
// CREATE PAYMENT ORDER
// ===============================
router.post("/create-order", authMiddleware, authorizeRoles("student"), async (req, res, next) => {
  try {
    // 1. Fetch total fee from students table
    const [studentRows] = await pool.execute(
      "SELECT total_fee FROM students WHERE user_id = ? LIMIT 1",
      [req.user.id]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student record not found." });
    }
    const totalFee = parseFloat(studentRows[0].total_fee || 0);

    // 2. Fetch sum of already paid fees
    const [paidRows] = await pool.execute(
      "SELECT SUM(amount) AS total_paid FROM fee_records WHERE student_id = ? AND status = 'Paid'",
      [req.user.id]
    );
    const totalPaid = parseFloat(paidRows[0].total_paid || 0);

    // 3. Calculate remaining payable balance
    const remainingAmount = Math.max(0, totalFee - totalPaid);
    if (remainingAmount <= 0) {
      return res.status(400).json({ message: "Your fees are already fully paid." });
    }

    // 4. Create Razorpay order
    const options = {
      amount: Math.round(remainingAmount * 100), // in paise
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
router.post("/verify", authMiddleware, async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Payment details and signature are required." });
  }

  try {
    // 1. Verify Razorpay signature
    const hmac = crypto.createHmac("sha256", razorpayKeySecret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed. Invalid signature." });
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

    // 3. Update payment status to Success
    await pool.execute(
      "UPDATE payments SET payment_id = ?, status = 'Success', method = ? WHERE order_id = ?",
      [razorpay_payment_id, method || "Razorpay", razorpay_order_id]
    );

    // 4. Double check if fee_record is already created (idempotency)
    const [fees] = await pool.execute(
      "SELECT id FROM fee_records WHERE reference_no = ? LIMIT 1",
      [razorpay_payment_id]
    );

    if (fees.length === 0) {
      // 5. Insert success record in fee_records
      const [feeResult] = await pool.execute(
        `INSERT INTO fee_records (student_id, amount, paid_date, payment_mode, reference_no, status)
         VALUES (?, ?, CURDATE(), 'Razorpay', ?, 'Paid')`,
        [paymentRecord.student_id, paymentRecord.amount, razorpay_payment_id]
      );
      const feeId = feeResult.insertId;
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
      await insertNotification({
        title:   teacherMessage,
        message: teacherMessage,
        type:    "fee",
        role:    "teacher",
        referenceId: feeId,
        uniqueKey: `teacher:fee-collected:${feeId}`
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

  if (!signature || !webhookSecret) {
    return res.status(400).json({ message: "Missing signature or secret configuration." });
  }

  try {
    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      return res.status(400).json({ message: "Signature verification failed." });
    }

    const event = req.body.event;
    if (event === "order.paid") {
      const orderId = req.body.payload.order.entity.id;
      const paymentId = req.body.payload.payment.entity.id;
      const method = req.body.payload.payment.entity.method;

      const [payments] = await pool.execute(
        "SELECT * FROM payments WHERE order_id = ? LIMIT 1",
        [orderId]
      );

      if (payments.length > 0) {
        const paymentRecord = payments[0];

        // Update Payment Table status
        await pool.execute(
          "UPDATE payments SET payment_id = ?, status = 'Success', method = ? WHERE order_id = ?",
          [paymentId, method, orderId]
        );

        // Insert Fee Record
        const [fees] = await pool.execute(
          "SELECT id FROM fee_records WHERE reference_no = ? LIMIT 1",
          [paymentId]
        );

        if (fees.length === 0) {
          await pool.execute(
            `INSERT INTO fee_records (student_id, amount, paid_date, payment_mode, reference_no, status) 
             VALUES (?, ?, CURDATE(), 'Razorpay', ?, 'Paid')`,
            [paymentRecord.student_id, paymentRecord.amount, paymentId]
          );
        }
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
