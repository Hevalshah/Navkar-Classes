const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { getTestConfig, assertTestGrants } = require("./database");
const { expectedSchema, normalizeDefault } = require("./schemaDiff");

const dedicatedEnv = {
  TEST_DB_HOST: "127.0.0.1",
  TEST_DB_PORT: "3306",
  TEST_DB_USER: "navkar_test_only",
  TEST_DB_PASSWORD: "synthetic-test-password",
  TEST_DB_NAME: "navkar_classes_test",
  TEST_DB_GRANTS_FILE: "tests/test-grants.txt"
};
const grantProof = [
  "GRANT USAGE ON *.* TO 'navkar_test_only'@'localhost'",
  "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON `navkar_classes_test`.* TO 'navkar_test_only'@'localhost'"
].join("\n");

test("requires dedicated credentials and exact test database name", () => {
  assert.throws(() => getTestConfig({}), /dedicated test database settings/);
  assert.throws(() => getTestConfig({ ...dedicatedEnv, TEST_DB_NAME: "navkar_classes" }), /Refusing database name/);
  assert.equal(getTestConfig(dedicatedEnv, grantProof).database, "navkar_classes_test");
});

test("never falls back to production DB settings", () => {
  assert.throws(() => getTestConfig({ ...dedicatedEnv, TEST_DB_USER: "prod_user", DB_USER: "prod_user" }, grantProof), /must not reuse production/);
});

test("rejects broad database grants", () => {
  assert.doesNotThrow(() => assertTestGrants([
    { grant: "GRANT USAGE ON *.* TO 'navkar_test_only'@'localhost'" },
    { grant: "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON `navkar_classes_test`.* TO 'navkar_test_only'@'localhost'" }
  ], "navkar_test_only"));
  assert.throws(() => assertTestGrants([
    { grant: "GRANT ALL PRIVILEGES ON *.* TO 'navkar_test_only'@'localhost'" }
  ], "navkar_test_only"), /broader-than-test/);
});

test("schema setup contains CREATE TABLE only", () => {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8").replace(/^--.*$/gm, "");
  const statements = schema.split(";").map((sql) => sql.trim()).filter(Boolean);
  assert.equal(statements.length, 15);
  for (const statement of statements) assert.match(statement, /^CREATE\s+TABLE\b/i);
  assert.doesNotMatch(schema, /^\s*(?:ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE\s+TABLE|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/im);
  assert.equal(expectedSchema(schema).size, 15);
});

test("schema comparison normalizes absent and NULL defaults consistently", () => {
  assert.equal(normalizeDefault(null, "varchar(20)"), null);
  assert.equal(normalizeDefault(undefined, "varchar(20)"), null);
  assert.equal(normalizeDefault("", "varchar(20)"), null);
});

test("schema comparison equates numeric DECIMAL defaults but preserves differences", () => {
  assert.equal(normalizeDefault("0", "decimal(10,2)"), normalizeDefault("0.00", "decimal(10,2)"));
  assert.equal(normalizeDefault("1.20", "decimal(10,2)"), normalizeDefault("1.2", "decimal(10,2)"));
  assert.notEqual(normalizeDefault("0.01", "decimal(10,2)"), normalizeDefault("0.02", "decimal(10,2)"));
  assert.notEqual(normalizeDefault("0", "varchar(20)"), normalizeDefault("0.00", "varchar(20)"));
});
