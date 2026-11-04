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
  const statusCode = err.statusCode || err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : (res.statusCode === 200 ? 500 : res.statusCode));
  if (process.env.NODE_ENV === "production") {
    console.error("API error", {
      name: err.name,
      code: err.code,
      method: req.method,
      path: req.path
    });
  } else {
    console.error("API error:", err.stack || err.message || err);
  }
  res.status(statusCode).json({
    message: process.env.NODE_ENV === "production"
      ? (statusCode >= 500 ? "An unexpected server error occurred." : "The request could not be processed.")
      : (err.message || "Internal Server Error"),
    ...(process.env.NODE_ENV === "production" ? {} : { stack: err.stack })
  });
};

module.exports = {
  xssProtection,
  errorMiddleware
};
