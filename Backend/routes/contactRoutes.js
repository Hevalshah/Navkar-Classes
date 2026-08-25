const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { sendNotification } = require("../services/notificationService");

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: parseInt(process.env.SMTP_PORT, 10) === 465,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, "") : "",
  officeEmail: process.env.OFFICE_EMAIL
});

const createContactTransporter = () => {
  const smtpConfig = getSmtpConfig();

  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });
};

router.post("/", async (req, res, next) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Unable to send enquiry. Please try again later." });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Unable to send enquiry. Please try again later." });
  }

  try {
    const smtpConfig = getSmtpConfig();
    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.pass || !smtpConfig.officeEmail) {
      console.error("Contact enquiry email is not configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and OFFICE_EMAIL.");
      return res.status(500).json({ success: false, message: "Unable to send enquiry. Please try again later." });
    }

    // Nodemailer configuration
    const transporter = createContactTransporter();

    const mailOptions = {
      from: `"Navkar Classes Website" <${smtpConfig.user}>`,
      to: smtpConfig.officeEmail,
      replyTo: `"${name}" <${email}>`,
      subject: "New Website Enquiry - Navkar Classes",
      text: `Visitor Name: ${name}\n\nVisitor Email: ${email}\n\nMessage/Query:\n${message}`
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Send WhatsApp/SMS alert
    const alertMessage = `New Website Inquiry\n\nName: ${name}\n\nEmail: ${email}\n\nMessage: ${message}`;
    await sendNotification(alertMessage);

    res.status(200).json({ success: true, message: "Enquiry sent successfully." });
  } catch (err) {
    console.error("Contact enquiry email failed:", err);
    res.status(500).json({ success: false, message: "Unable to send enquiry. Please try again later." });
  }
});

router.verifySmtpConnection = async () => {
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.pass || !smtpConfig.officeEmail) {
    console.warn("[Warning] Contact SMTP verification skipped because email configuration is incomplete.");
    return;
  }

  try {
    await createContactTransporter().verify();
    console.log(`Contact SMTP connection verified for ${smtpConfig.user}.`);
  } catch (err) {
    console.error("Contact SMTP verification failed. Check Gmail username, App Password, host, port, secure setting, and Backend/.env loading.");
    console.error(err.message);
  }
};

module.exports = router;
