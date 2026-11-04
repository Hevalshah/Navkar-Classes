const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

if (process.env.ALLOW_SCHEMA_DATA_MAINTENANCE !== "YES") {
  console.error("Refusing database maintenance. Set ALLOW_SCHEMA_DATA_MAINTENANCE=YES only after explicit review and approval.");
  process.exit(1);
}

const { initializeSchemaAndLegacyData } = require("../config/db");
const { logSafeError } = require("../services/safeLogger");

initializeSchemaAndLegacyData()
  .then(() => process.exit(0))
  .catch((error) => {
    logSafeError("Database maintenance failed", error);
    process.exit(1);
  });
