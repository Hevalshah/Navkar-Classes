const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

const sanitizeInput = (obj) => {
  if (!obj) return obj;
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === "object") {
      sanitizeInput(obj[key]);
    }
  }
  return obj;
};

const xssProtection = (req, res, next) => {
  if (req.body) sanitizeInput(req.body);
  if (req.query) sanitizeInput(req.query);
  if (req.params) sanitizeInput(req.params);
  next();
};

const errorMiddleware = (err, req, res, next) => {
  console.error("API Error: ", err.stack || err.message || err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack
  });
};

module.exports = {
  xssProtection,
  errorMiddleware
};
