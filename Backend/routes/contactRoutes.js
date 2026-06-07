const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { sendNotification } = require("../services/notificationService");

router.post("/", async (req, res, next) => {
  const { name, email, message } = req.body;

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    // Nodemailer configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.mailtrap.io",
      port: parseInt(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: "info@navkarclasses.com",
      subject: "New Website Contact Inquiry",
      text: `Name: ${name}\n\nEmail: ${email}\n\nMessage:\n${message}`
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Send WhatsApp/SMS alert
    const alertMessage = `New Website Inquiry\n\nName: ${name}\n\nEmail: ${email}\n\nMessage: ${message}`;
    await sendNotification(alertMessage);

    res.status(200).json({ message: "Message sent successfully." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
