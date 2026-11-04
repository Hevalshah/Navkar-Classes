const resolveTeacher = async (pool, user) => {
  if (!user || user.role !== "teacher") return null;
  const [[teacher]] = await pool.execute(
    "SELECT id, name FROM teachers WHERE id = ? AND status = 'Active' LIMIT 1",
    [user.id]
  );
  return teacher || null;
};

module.exports = { resolveTeacher };
