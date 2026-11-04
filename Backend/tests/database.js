const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const readProductionDbSettings = () => {
  const productionEnvPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(productionEnvPath)) throw new Error("Cannot independently compare test credentials without the backend environment file.");
  return dotenv.parse(fs.readFileSync(productionEnvPath));
};

const getTestConfig = (env = process.env, grantsProof = null) => {
  const required = ["TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASSWORD", "TEST_DB_NAME", "TEST_DB_GRANTS_FILE"];
  const missing = required.filter((key) => !env[key] || env[key].startsWith("REQUIRED_"));
  if (missing.length) throw new Error(`Missing dedicated test database settings: ${missing.join(", ")}`);
  if (env.TEST_DB_NAME !== "navkar_classes_test") throw new Error("Refusing database name other than navkar_classes_test.");
  if (!/^\d+$/.test(env.TEST_DB_PORT) || Number(env.TEST_DB_PORT) < 1 || Number(env.TEST_DB_PORT) > 65535) {
    throw new Error("TEST_DB_PORT must be a valid TCP port.");
  }
  if ((env.DB_USER && env.TEST_DB_USER === env.DB_USER) ||
      (env.DB_PASSWORD && env.TEST_DB_PASSWORD === env.DB_PASSWORD) ||
      (env.DB_NAME && env.TEST_DB_NAME === env.DB_NAME)) {
    throw new Error("Test credentials must not reuse production DB settings.");
  }
  const production = readProductionDbSettings();
  if (!production.DB_USER || !production.DB_NAME ||
      env.TEST_DB_USER === production.DB_USER ||
      env.TEST_DB_PASSWORD === (production.DB_PASSWORD || "") ||
      env.TEST_DB_NAME === production.DB_NAME) {
    throw new Error("Cannot verify dedicated test credentials are separate from production settings.");
  }
  if (!grantsProof) {
    const proofPath = path.resolve(__dirname, "..", env.TEST_DB_GRANTS_FILE);
    if (!proofPath.startsWith(`${__dirname}${path.sep}`) || !fs.existsSync(proofPath)) {
      throw new Error("A DBA-verified grants file inside Backend/tests is required before connecting.");
    }
    grantsProof = fs.readFileSync(proofPath, "utf8");
  }
  const proofRows = grantsProof.split(/\r?\n/).map((grant) => ({ grant })).filter(({ grant }) => /^GRANT\s/i.test(grant));
  assertTestGrants(proofRows, env.TEST_DB_USER);
  return {
    host: env.TEST_DB_HOST,
    port: Number(env.TEST_DB_PORT),
    user: env.TEST_DB_USER,
    password: env.TEST_DB_PASSWORD,
    database: "navkar_classes_test",
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0
  };
};

const assertTestGrants = (rows, expectedUser) => {
  const grants = rows.map((row) => String(Object.values(row)[0] || ""));
  if (!grants.length) throw new Error("Unable to verify test account grants.");
  for (const grant of grants) {
    const recipient = grant.match(/\bTO\s+'((?:''|[^'])+)'@/i)?.[1]?.replace(/''/g, "'");
    if (expectedUser && recipient !== expectedUser) throw new Error("Grant proof does not match TEST_DB_USER.");
    if (/^GRANT USAGE ON \*\.\*/i.test(grant)) continue;
    if (/^GRANT [A-Z ,]+ ON `?navkar_classes_test`?\.\* TO /i.test(grant) && !/WITH GRANT OPTION/i.test(grant)) continue;
    throw new Error("Test account has an unverified or broader-than-test database grant.");
  }
};

const createTestDatabase = (env = process.env) => mysql.createPool(getTestConfig(env));

const withTestConnection = async (callback, env = process.env) => {
  const pool = createTestDatabase(env);
  let connection;
  try {
    connection = await pool.getConnection();
    const [[identity]] = await connection.query("SELECT DATABASE() AS database_name");
    if (identity.database_name !== "navkar_classes_test") throw new Error("Connected database identity is not navkar_classes_test.");
    const [[account]] = await connection.query("SELECT CURRENT_USER() AS account_name");
    if (String(account.account_name).split("@")[0].replace(/[`']/g, "") !== env.TEST_DB_USER) {
      throw new Error("Connected MySQL account is not TEST_DB_USER.");
    }
    const [[roleState]] = await connection.query("SELECT CURRENT_ROLE() AS active_roles");
    if (roleState.active_roles && roleState.active_roles !== "NONE") throw new Error("Test account has active roles that cannot be safely scoped.");
    const [grants] = await connection.query("SHOW GRANTS FOR CURRENT_USER()");
    assertTestGrants(grants);
    const write = async (sql, params = []) => {
      const [[current]] = await connection.query("SELECT DATABASE() AS database_name");
      if (current.database_name !== "navkar_classes_test") throw new Error("Refusing write outside navkar_classes_test.");
      return connection.execute(sql, params);
    };
    const read = (sql, params = []) => connection.execute(sql, params);
    return await callback({ connection, read, write });
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
};

module.exports = { getTestConfig, assertTestGrants, withTestConnection };
