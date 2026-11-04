const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.test") });
const { withTestConnection } = require("./database");
const { compareSchema } = require("./schemaDiff");

const initializeSchema = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8").replace(/^--.*$/gm, "");
  const statements = schema.split(";").map((statement) => statement.trim()).filter(Boolean);
  if (!statements.length || statements.some((sql) => !/^CREATE\s+TABLE\b/i.test(sql))) {
    throw new Error("Schema file must contain CREATE TABLE statements only.");
  }
  await withTestConnection(async ({ read, write }) => {
    const [existing] = await read(
      "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
    );
    if (existing.length) throw new Error("Refusing schema initialization: test database is not empty.");
    for (const statement of statements) await write(statement);
    await compareSchema(read, schema);
  });
};

if (require.main === module) {
  initializeSchema().then(() => {
    console.log("Test schema created in navkar_classes_test.");
  }).catch((error) => {
    console.error(`Test schema setup stopped: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { initializeSchema };
