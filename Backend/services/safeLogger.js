const logSafeError = (context, error) => {
  console.error(context, {
    name: error?.name || "Error",
    code: error?.code
  });
};

module.exports = { logSafeError };
