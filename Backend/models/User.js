const { pool } = require("../config/db");

const mapUser = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    _id: row.id,
    studentId: row.student_id,
    name: row.profile_name || row.name,
    parentName: row.profile_parent_name || row.parent_name,
    mobile: row.profile_mobile || row.mobile,
    email: row.email,
    username: row.username,
    password: row.password,
    role: row.role,
    address: row.profile_address || row.address,
    course: row.profile_course || row.course,
    assignedBatch: row.profile_assigned_batch || row.assigned_batch,
    standardId: row.profile_standard_id || row.standard_id,
    batchId: row.profile_batch_id || row.batch_id,
    isActive: Boolean(row.profile_is_active ?? row.is_active),
    standardName: row.standard_name,
    batchName: row.batch_name,
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

const SELECT_USER_QUERY = `
  SELECT u.*,
         st.id AS student_id,
         st.name AS profile_name,
         st.parent_name AS profile_parent_name,
         st.mobile AS profile_mobile,
         st.address AS profile_address,
         st.course AS profile_course,
         st.assigned_batch AS profile_assigned_batch,
         st.standard_id AS profile_standard_id,
         st.batch_id AS profile_batch_id,
         st.is_active AS profile_is_active,
         s.name AS standard_name,
         b.name AS batch_name
  FROM users u
  LEFT JOIN students st ON st.user_id = u.id
  LEFT JOIN standards s ON st.standard_id = s.id
  LEFT JOIN batches b ON st.batch_id = b.id
`;

const findByEmail = async (email) => {
  const [rows] = await pool.execute(`${SELECT_USER_QUERY} WHERE u.email = ? LIMIT 1`, [email]);
  return mapUser(rows[0]);
};

const findByUsername = async (username) => {
  const [rows] = await pool.execute(`${SELECT_USER_QUERY} WHERE u.username = ? LIMIT 1`, [username]);
  return mapUser(rows[0]);
};

const findByEmailAndRole = async (emailOrUsername, role) => {
  const [rows] = await pool.execute(
    `${SELECT_USER_QUERY}
     WHERE (u.email = ? OR u.username = ?)
       AND u.role = ?
       AND u.is_active = TRUE
       AND (u.role <> 'student' OR st.is_active = TRUE)
     LIMIT 1`,
    [emailOrUsername, emailOrUsername, role]
  );
  return mapUser(rows[0]);
};

const findById = async (id) => {
  const [rows] = await pool.execute(`${SELECT_USER_QUERY} WHERE u.id = ? LIMIT 1`, [id]);
  return mapUser(rows[0]);
};

const findActiveById = async (id) => {
  const [rows] = await pool.execute(
    `${SELECT_USER_QUERY}
     WHERE u.id = ?
       AND u.is_active = TRUE
       AND (u.role <> 'student' OR st.is_active = TRUE)
     LIMIT 1`,
    [id]
  );
  return mapUser(rows[0]);
};

const create = async ({ name, parentName, mobile, email, username, password, role = "student", address, course, assignedBatch, standardId, batchId }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO users (name, email, username, password, role)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, username || null, password, role]
    );

    if (role === "student") {
      await connection.execute(
        `INSERT INTO students (
           user_id, name, parent_name, mobile, address, course,
           assigned_batch, standard_id, batch_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          name,
          parentName || null,
          mobile || null,
          address || null,
          course || null,
          assignedBatch || null,
          standardId || null,
          batchId || null
        ]
      );
    }

    await connection.commit();
    return findById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateProfile = async (id, { name, mobile, parentName, email, address, username }) => {
  await pool.execute(
    `UPDATE users 
     SET name = ?, email = ?, username = ?
     WHERE id = ?`,
    [name, email, username || null, id]
  );
  await pool.execute(
    `UPDATE students
     SET name = ?, mobile = ?, parent_name = ?, address = ?
     WHERE user_id = ?`,
    [name, mobile || null, parentName || null, address || null, id]
  );
  return findById(id);
};

const updateLastLogin = async (id) => {
  await pool.execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [id]);
  await pool.execute("UPDATE students SET last_login_at = NOW() WHERE user_id = ?", [id]);
};

const updateLastLogout = async (id) => {
  await pool.execute("UPDATE users SET last_logout_at = NOW() WHERE id = ?", [id]);
  await pool.execute("UPDATE students SET last_logout_at = NOW() WHERE user_id = ?", [id]);
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
  updateProfile,
  deleteAll,
  findByEmail,
  findByUsername,
  findByEmailAndRole,
  findById,
  findActiveById,
  insertMany,
  publicUser,
  updateLastLogin,
  updateLastLogout
};
