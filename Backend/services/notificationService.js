const twilio = require("twilio");

const sendSMSViaTwilio = async (message) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.TWILIO_TO_NUMBER || process.env.MANAGEMENT_NUMBER;

  if (!sid || !authToken || !from || !to) {
    console.warn("Twilio configuration is missing. SMS not sent.");
    return false;
  }

  const client = twilio(sid, authToken);
  const res = await client.messages.create({
    body: message,
    from: from,
    to: to
  });
  console.log("Twilio SMS sent successfully: ", res.sid);
  return true;
};

const sendWhatsAppViaCloudAPI = async (message) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = process.env.WHATSAPP_TO_NUMBER || process.env.MANAGEMENT_NUMBER;

  if (!token || !phoneId || !to) {
    console.warn("WhatsApp Cloud API configuration is missing. WhatsApp message not sent.");
    return false;
  }

  // Send WhatsApp text message using the Cloud API
  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: {
        preview_url: false,
        body: message
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(errorData)}`);
  }

  console.log("WhatsApp Cloud API message sent successfully");
  return true;
};

const sendNotification = async (message) => {
  const provider = (process.env.NOTIFICATION_PROVIDER || "").toLowerCase();
  
  let twilioSuccess = false;
  let whatsappSuccess = false;

  if (provider === "twilio" || provider === "all") {
    try {
      twilioSuccess = await sendSMSViaTwilio(message);
    } catch (err) {
      console.error("Failed to send Twilio SMS:", err);
    }
  }

  if (provider === "whatsapp" || provider === "all") {
    try {
      whatsappSuccess = await sendWhatsAppViaCloudAPI(message);
    } catch (err) {
      console.error("Failed to send WhatsApp message:", err);
    }
  }

  // Default fallback logging if no provider is active or credentials missing
  if (!twilioSuccess && !whatsappSuccess) {
    console.log("[Notification Service Stub] Alert sent to management number:\n", message);
  }

  return { twilioSuccess, whatsappSuccess };
};

module.exports = {
  sendNotification,
  sendSMSViaTwilio,
  sendWhatsAppViaCloudAPI
};
