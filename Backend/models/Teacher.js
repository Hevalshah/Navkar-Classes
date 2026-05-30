const { pool } = require("../config/db");

const mapTeacher = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    _id: row.id, // For UI compatibility
    name: row.name,
    fullName: row.name, // Compatibility with fullName
    email: row.email,
    mobile: row.mobile,
    password: row.password,
    status: row.status,
    role: "teacher", // Fixed role string
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const publicTeacher = (teacher) => {
  if (!teacher) return null;
  const { password, ...safeTeacher } = teacher;
  return safeTeacher;
};

const findByEmail = async (email) => {
  const [rows] = await pool.execute("SELECT * FROM teachers WHERE email = ? LIMIT 1", [email]);
  return mapTeacher(rows[0]);
};

const findById = async (id) => {
  const [rows] = await pool.execute("SELECT * FROM teachers WHERE id = ? LIMIT 1", [id]);
  return mapTeacher(rows[0]);
};

const findAll = async () => {
  const [rows] = await pool.execute("SELECT * FROM teachers ORDER BY id DESC");
  return rows.map(mapTeacher);
};

const create = async ({ name, email, mobile, password, status = "Active" }) => {
  const [result] = await pool.execute(
    "INSERT INTO teachers (name, email, mobile, password, status) VALUES (?, ?, ?, ?, ?)",
    [name, email, mobile, password, status]
  );
  return findById(result.insertId);
};

const update = async (id, { name, email, mobile, password, status }) => {
  if (password) {
    await pool.execute(
      "UPDATE teachers SET name = ?, email = ?, mobile = ?, password = ?, status = ? WHERE id = ?",
      [name, email, mobile, password, status, id]
    );
  } else {
    await pool.execute(
      "UPDATE teachers SET name = ?, email = ?, mobile = ?, status = ? WHERE id = ?",
      [name, email, mobile, status, id]
    );
  }
  return findById(id);
};

const remove = async (id) => {
  await pool.execute("DELETE FROM teachers WHERE id = ?", [id]);
};

module.exports = {
  create,
  update,
  remove,
  findByEmail,
  findById,
  findAll,
  publicTeacher,
  mapTeacher
};
