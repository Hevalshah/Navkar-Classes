require("dotenv").config({ path: require("path").join(__dirname, ".env.test") });
const { withTestConnection, assertTestGrants } = require("./database");

const cleanupFixtures = () => withTestConnection(async ({ connection, read }) => {
  const verifyBeforeDelete = async () => {
    const [[identity]] = await connection.query("SELECT DATABASE() AS database_name");
    if (identity.database_name !== "navkar_classes_test") throw new Error("Cleanup refused outside navkar_classes_test.");
    const [[roleState]] = await connection.query("SELECT CURRENT_ROLE() AS active_roles");
    if (roleState.active_roles && roleState.active_roles !== "NONE") throw new Error("Cleanup refused with active database roles.");
    const [grants] = await connection.query("SHOW GRANTS FOR CURRENT_USER()");
    assertTestGrants(grants, process.env.TEST_DB_USER);
  };
  const exactOne = async (sql, params, label) => {
    const [rows] = await read(sql, params);
    if (rows.length !== 1) throw new Error(`Cleanup stopped: expected one ${label}, found ${rows.length}.`);
    return rows[0];
  };
  const ensureNoRows = async (sql, params, label) => {
    const [rows] = await read(sql, params);
    if (rows.length) throw new Error(`Cleanup stopped: unexpected dependent rows in ${label}.`);
  };
  const remove = async (label, sql, params) => {
    await verifyBeforeDelete();
    const [result] = await connection.execute(sql, params);
    if (result.affectedRows !== 1) throw new Error(`Cleanup stopped: expected to remove one ${label}.`);
  };

  const standard = await exactOne("SELECT id FROM standards WHERE name = ?", ["Synthetic Standard"], "synthetic standard");
  const batch = await exactOne("SELECT id FROM batches WHERE name = ? AND standard_id = ?", ["Synthetic Batch", standard.id], "synthetic batch");
  const subject = await exactOne("SELECT id FROM subjects WHERE name = ? AND standard_id = ?", ["Synthetic Subject", standard.id], "synthetic subject");
  const admin = await exactOne("SELECT id FROM users WHERE email = ? AND role = 'admin'", ["admin.test@example.invalid"], "synthetic admin");
  const student = await exactOne("SELECT id FROM users WHERE email = ? AND role = 'student'", ["student.test@example.invalid"], "synthetic student");
  const teacher = await exactOne("SELECT id FROM teachers WHERE email = ?", ["teacher.test@example.invalid"], "synthetic teacher");
  const studentProfile = await exactOne("SELECT id FROM students WHERE user_id = ?", [student.id], "synthetic student profile");
  const timetable = await exactOne("SELECT id FROM timetable WHERE batch_id = ? AND subject_id = ? AND teacher_id = ? AND day = 'Monday' AND time_slot = '09:00-10:00' AND room = 'Test Room'", [batch.id, subject.id, teacher.id], "synthetic timetable row");
  const payment = await exactOne("SELECT id FROM payments WHERE order_id = ? AND student_id = ?", ["order_test_synthetic_001", student.id], "synthetic payment");

  await ensureNoRows("SELECT id FROM materials WHERE batch_id = ? OR subject_id = ? OR uploaded_by IN (?, ?) OR uploaded_by_teacher_id = ?", [batch.id, subject.id, admin.id, student.id, teacher.id], "materials");
  await ensureNoRows("SELECT id FROM tests WHERE batch_id = ? OR subject_id = ? OR created_by IN (?, ?) OR created_by_teacher_id = ?", [batch.id, subject.id, admin.id, student.id, teacher.id], "tests");
  await ensureNoRows("SELECT id FROM attendance WHERE batch_id = ? OR student_id IN (?, ?)", [batch.id, admin.id, student.id], "attendance");
  await ensureNoRows("SELECT id FROM test_submissions WHERE student_id IN (?, ?)", [admin.id, student.id], "test_submissions");
  await ensureNoRows("SELECT id FROM fee_records WHERE student_id IN (?, ?)", [admin.id, student.id], "fee_records");

  await connection.beginTransaction();
  try {
    await remove("timetable fixture", "DELETE FROM timetable WHERE id = ? AND batch_id = ? AND subject_id = ? AND teacher_id = ?", [timetable.id, batch.id, subject.id, teacher.id]);
    await remove("payment fixture", "DELETE FROM payments WHERE id = ? AND order_id = ? AND student_id = ?", [payment.id, "order_test_synthetic_001", student.id]);
    await remove("student profile fixture", "DELETE FROM students WHERE id = ? AND user_id = ?", [studentProfile.id, student.id]);
    await remove("student user fixture", "DELETE FROM users WHERE id = ? AND email = ? AND role = 'student'", [student.id, "student.test@example.invalid"]);
    await remove("admin user fixture", "DELETE FROM users WHERE id = ? AND email = ? AND role = 'admin'", [admin.id, "admin.test@example.invalid"]);
    await remove("teacher fixture", "DELETE FROM teachers WHERE id = ? AND email = ?", [teacher.id, "teacher.test@example.invalid"]);
    await remove("subject fixture", "DELETE FROM subjects WHERE id = ? AND name = ? AND standard_id = ?", [subject.id, "Synthetic Subject", standard.id]);
    await remove("batch fixture", "DELETE FROM batches WHERE id = ? AND name = ? AND standard_id = ?", [batch.id, "Synthetic Batch", standard.id]);
    await remove("standard fixture", "DELETE FROM standards WHERE id = ? AND name = ?", [standard.id, "Synthetic Standard"]);
    await connection.commit();
    return 9;
  } catch (error) {
    await connection.rollback();
    throw error;
  }
});

if (require.main === module) {
  cleanupFixtures().then((count) => console.log(`Prepared cleanup completed for ${count} synthetic fixture records.`))
    .catch((error) => { console.error(`Fixture cleanup stopped: ${error.message}`); process.exitCode = 1; });
}

module.exports = { cleanupFixtures };
