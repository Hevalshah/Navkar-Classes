const { pool } = require("../config/db");

const mapUser = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    parentName: row.parent_name,
    mobile: row.mobile,
    email: row.email,
    password: row.password,
    role: row.role,
    lastLoginAt: row.last_login_at,
    lastLogoutAt: row.last_logout_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const publicUser = (user) => {
  if (!user) return null;

  const { password, ...safeUser } = user;
  return safeUser;
};

const findByEmail = async (email) => {
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  return mapUser(rows[0]);
};

const findByEmailAndRole = async (email, role) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ? AND role = ? LIMIT 1",
    [email, role]
  );
  return mapUser(rows[0]);
};

const findById = async (id) => {
  const [rows] = await pool.execute("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return mapUser(rows[0]);
};

const create = async ({ name, parentName, mobile, email, password, role = "student" }) => {
  const [result] = await pool.execute(
    `INSERT INTO users (name, parent_name, mobile, email, password, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, parentName || null, mobile, email, password, role]
  );

  return findById(result.insertId);
};

const updateLastLogin = async (id) => {
  await pool.execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [id]);
};

const updateLastLogout = async (id) => {
  await pool.execute("UPDATE users SET last_logout_at = NOW() WHERE id = ?", [id]);
};

const deleteAll = async () => {
  await pool.execute("DELETE FROM users");
};

const insertMany = async (users) => {
  for (const user of users) {
    await create(user);
  }
};

module.exports = {
  create,
  deleteAll,
  findByEmail,
  findByEmailAndRole,
  findById,
  insertMany,
  publicUser,
  updateLastLogin,
  updateLastLogout
};
