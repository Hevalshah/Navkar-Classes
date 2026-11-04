const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return "Password must be between 8 and 128 characters.";
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Password must include uppercase, lowercase, numeric, and special characters.";
  }
  return null;
};

module.exports = { validatePassword };
