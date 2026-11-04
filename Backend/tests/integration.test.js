const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { withTestConnection, getTestConfig } = require("./database");

dotenv.config({ path: path.join(__dirname, ".env.test"), quiet: true });
const testConfig = getTestConfig();
const isolatedEnv = Object.fromEntries([
  "TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASSWORD", "TEST_DB_NAME", "TEST_DB_GRANTS_FILE"
].map((key) => [key, process.env[key]]));
// Route modules use the application's DB_* names. Populate them only from the
// already-validated, dedicated test configuration; never load the app server.
process.env.DB_HOST = testConfig.host;
process.env.DB_PORT = String(testConfig.port);
process.env.DB_USER = testConfig.user;
process.env.DB_PASSWORD = testConfig.password;
process.env.DB_NAME = testConfig.database;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-only-access-secret";
process.env.JWT_REFRESH_SECRET = "integration-only-refresh-secret";
process.env.RAZORPAY_KEY_ID = "rzp_test_mock_only";
process.env.RAZORPAY_KEY_SECRET = "integration-only-razorpay-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "integration-only-webhook-secret";

let providerOrder;
let providerPayment;
let mockCreatedOrderId;
let createdOrderOptions;
class MockRazorpay {
  constructor() {
    this.orders = {
      fetch: async () => ({ ...providerOrder }),
      create: async (options) => { createdOrderOptions = { ...options }; return { id: mockCreatedOrderId }; }
    };
    this.payments = { fetch: async () => ({ ...providerPayment }) };
  }
}
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "razorpay") return MockRazorpay;
  return originalLoad.call(this, request, parent, isMain);
};
const authRoutes = require("../routes/authRoutes");
const materialRoutes = require("../routes/materialRoutes");
const testRoutes = require("../routes/testRoutes");
const attendanceRoutes = require("../routes/attendanceRoutes");
const adminRoutes = require("../routes/adminRoutes");
const feeRoutes = require("../routes/feeRoutes");
const paymentRoutes = require("../routes/paymentRoutes");
Module._load = originalLoad;
const { pool: appPool } = require("../config/db");
const { createUpload, verifyUploadedFile } = require("../middleware/uploadValidation");

const accessToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "5m" });
const signature = (message, secret) => crypto.createHmac("sha256", secret).update(message).digest("hex");
const request = (base, route, token, options = {}) => fetch(`${base}${route}`, {
  ...options,
  headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
});
const guardedWrite = (sql, params = []) => withTestConnection(({ write }) => write(sql, params), isolatedEnv);
const guardedRead = (sql, params = []) => withTestConnection(({ read }) => read(sql, params), isolatedEnv);
const guardedDelete = (sql, params = []) => withTestConnection(async ({ connection }) => {
  const [[identity]] = await connection.query("SELECT DATABASE() AS database_name");
  if (identity.database_name !== "navkar_classes_test") throw new Error("Test cleanup refused outside navkar_classes_test.");
  const [[account]] = await connection.query("SELECT CURRENT_USER() AS account_name");
  if (String(account.account_name).split("@")[0].replace(/[`']/g, "") !== process.env.TEST_DB_USER) throw new Error("Test cleanup refused for a different MySQL account.");
  const [grants] = await connection.query("SHOW GRANTS FOR CURRENT_USER()");
  require("./database").assertTestGrants(grants);
  return connection.execute(sql, params);
}, isolatedEnv);

test("isolated backend integration suite", async (t) => {
  const fixture = await withTestConnection(async ({ read }) => {
    const [[admin]] = await read("SELECT id FROM users WHERE email = ? AND role = 'admin'", ["admin.test@example.invalid"]);
    const [[student]] = await read("SELECT user_id AS id, batch_id, standard_id FROM students WHERE user_id = (SELECT id FROM users WHERE email = ?)", ["student.test@example.invalid"]);
    const [[teacher]] = await read("SELECT id FROM teachers WHERE email = ? AND status = 'Active'", ["teacher.test@example.invalid"]);
    const [[subject]] = await read("SELECT id FROM subjects WHERE name = 'Synthetic Subject' LIMIT 1");
    const [[payment]] = await read("SELECT order_id, student_id, amount, status FROM payments WHERE order_id = ?", ["order_test_synthetic_001"]);
    if (!admin || !student || !teacher || !subject || !payment || Number(payment.student_id) !== Number(student.id) || payment.status !== "Created" || Number(payment.amount) !== 100) {
      throw new Error("Required synthetic fixtures are missing or changed; refusing integration tests.");
    }
    return { adminId: admin.id, studentId: student.id, batchId: student.batch_id, standardId: student.standard_id, teacherId: teacher.id, subjectId: subject.id, paymentOrder: payment.order_id };
  }, isolatedEnv);

  const runId = crypto.randomBytes(8).toString("hex");
  const altBatchName = `Integration Batch ${runId}`;
  const materialPath = `${runId}.pdf`;
  const altMaterialPath = `alt-${runId}.pdf`;
  const testFilePath = `${runId}.pdf`;
  const altTestFilePath = `alt-${runId}.pdf`;
  const collisionEmail = `identity-collision-${runId}@example.invalid`;
  const uploadDir = path.join(__dirname, "..", "uploads");
  const testUploadDir = path.join(uploadDir, "tests");
  const materialIds = [];
  const testIds = [];
  const uploadedMaterialFiles = [];
  const uploadedTestFiles = [];
  const attendanceDates = [`2098-01-01`, `2098-01-02`];
  const feeReference = `integration-fee-${runId}`;
  const paymentId = `pay_mock_${runId}`;
  let altBatchId;
  let collisionTeacherId;
  let collisionUserId;
  let syntheticStudentId;
  let syntheticStudentEmail;
  let feeId;
  let server;
  let base;
  let multerTemp;

  await fs.promises.writeFile(path.join(uploadDir, materialPath), Buffer.from("%PDF-1.4\nSynthetic integration preview\n"));
  await fs.promises.writeFile(path.join(uploadDir, altMaterialPath), Buffer.from("%PDF-1.4\nSynthetic denied preview\n"));
  await fs.promises.mkdir(testUploadDir, { recursive: true });
  await fs.promises.writeFile(path.join(testUploadDir, testFilePath), Buffer.from("%PDF-1.4\nSynthetic test preview\n"));
  await fs.promises.writeFile(path.join(testUploadDir, altTestFilePath), Buffer.from("%PDF-1.4\nSynthetic denied test preview\n"));
  try {
    const [collisionTeacher] = await guardedWrite(
      "INSERT INTO teachers (name, email, mobile, password, status) VALUES (?, ?, ?, ?, 'Active')",
      [`Synthetic Collision Teacher ${runId}`, collisionEmail, "0000000001", "unused-test-password"]
    );
    collisionTeacherId = collisionTeacher.insertId;
    const [collisionUser] = await guardedWrite(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'student')",
      [`Synthetic Collision User ${runId}`, collisionEmail, "unused-test-password"]
    );
    collisionUserId = collisionUser.insertId;

    syntheticStudentEmail = `teacher-access-student-${runId}@example.invalid`;
    const [syntheticStudent] = await guardedWrite(
      "INSERT INTO users (name, email, password, role, standard_id, batch_id) VALUES (?, ?, ?, 'student', ?, ?)",
      [`Synthetic Cross-Batch Student ${runId}`, syntheticStudentEmail, "unused-test-password", fixture.standardId, altBatchId || fixture.batchId]
    );
    syntheticStudentId = syntheticStudent.insertId;

    const [batchResult] = await guardedWrite("INSERT INTO batches (name, standard_id) SELECT ?, standard_id FROM students WHERE user_id = ?", [altBatchName, fixture.studentId]);
    altBatchId = batchResult.insertId;
    await guardedWrite("UPDATE users SET batch_id = ? WHERE id = ?", [altBatchId, syntheticStudentId]);
    await guardedWrite("INSERT INTO students (user_id, name, standard_id, batch_id) VALUES (?, ?, ?, ?)", [syntheticStudentId, `Synthetic Cross-Batch Student ${runId}`, fixture.standardId, altBatchId]);
    const [materialResult] = await guardedWrite(
      "INSERT INTO materials (title, description, subject_id, batch_id, file_path, file_type, file_size, uploaded_by) VALUES (?, NULL, (SELECT id FROM subjects WHERE name = 'Synthetic Subject' LIMIT 1), ?, ?, 'pdf', 'test', ?)",
      [`Integration Material ${runId}`, altBatchId, altMaterialPath, fixture.adminId]
    );
    materialIds.push(materialResult.insertId);
    const [emailCollisionMaterial] = await guardedWrite(
      "INSERT INTO materials (title, description, subject_id, batch_id, file_path, file_type, file_size, uploaded_by) VALUES (?, NULL, (SELECT id FROM subjects WHERE name = 'Synthetic Subject' LIMIT 1), ?, ?, 'pdf', 'test', ?)",
      [`Integration Material Email Collision ${runId}`, altBatchId, altMaterialPath, collisionUserId]
    );
    materialIds.push(emailCollisionMaterial.insertId);
    const [authorizedMaterialResult] = await guardedWrite(
      "INSERT INTO materials (title, description, subject_id, batch_id, file_path, file_type, file_size, uploaded_by) VALUES (?, NULL, (SELECT id FROM subjects WHERE name = 'Synthetic Subject' LIMIT 1), ?, ?, 'pdf', 'test', ?)",
      [`Integration Material ${runId} Allowed`, fixture.batchId, materialPath, fixture.studentId]
    );
    materialIds.push(authorizedMaterialResult.insertId);
    const [testResult] = await guardedWrite(
      "INSERT INTO tests (title, subject_id, batch_id, instructions, total_marks, file_path, created_by, test_date) VALUES (?, (SELECT id FROM subjects WHERE name = 'Synthetic Subject' LIMIT 1), ?, 'integration', 100, ?, ?, '2098-01-01')",
      [`Integration Test ${runId}`, fixture.batchId, testFilePath, fixture.adminId]
    );
    testIds.push(testResult.insertId);
    const [otherTestResult] = await guardedWrite(
      "INSERT INTO tests (title, subject_id, batch_id, instructions, total_marks, file_path, created_by, test_date) VALUES (?, (SELECT id FROM subjects WHERE name = 'Synthetic Subject' LIMIT 1), ?, 'integration', 100, ?, ?, '2098-01-01')",
      [`Integration Test Other Batch ${runId}`, altBatchId, altTestFilePath, fixture.adminId]
    );
    testIds.push(otherTestResult.insertId);
    const [emailCollisionTest] = await guardedWrite(
      "INSERT INTO tests (title, subject_id, batch_id, instructions, total_marks, file_path, created_by, test_date) VALUES (?, (SELECT id FROM subjects WHERE name = 'Synthetic Subject' LIMIT 1), ?, 'integration', 100, ?, ?, '2098-01-01')",
      [`Integration Test Email Collision ${runId}`, altBatchId, altTestFilePath, collisionUserId]
    );
    testIds.push(emailCollisionTest.insertId);

    const app = express();
    app.use("/api/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }));
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/materials", materialRoutes);
    app.use("/api/tests", testRoutes);
    app.use("/api/attendance", attendanceRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/fees", feeRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    base = `http://127.0.0.1:${server.address().port}`;

    const studentToken = accessToken(fixture.studentId, "student");
    const adminToken = accessToken(fixture.adminId, "admin");
    const teacherToken = accessToken(fixture.teacherId, "teacher");

    await t.test("authentication, JWT and role denial", async () => {
      assert.equal((await request(base, "/api/fees", studentToken)).status, 200);
      assert.equal((await request(base, "/api/fees", "invalid.token.value")).status, 401);
      assert.equal((await request(base, "/api/attendance/submit", studentToken, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: fixture.batchId, date: "2098-01-01", attendanceData: [] }) })).status, 403);
    });

    await t.test("teacher profile updates use teachers.id despite numeric ID collision", async () => {
      assert.equal(fixture.teacherId, fixture.adminId, "fixture must collide teacher and users IDs");
      const [[adminBefore]] = await guardedRead("SELECT name FROM users WHERE id = ?", [fixture.adminId]);
      const [[teacherBefore]] = await guardedRead("SELECT name, email, mobile FROM teachers WHERE id = ?", [fixture.teacherId]);
      const update = await request(base, "/api/auth/update-profile", teacherToken, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Synthetic Teacher Updated ${runId}`, email: teacherBefore.email, mobile: teacherBefore.mobile })
      });
      assert.equal(update.status, 200);
      const [[adminAfter]] = await guardedRead("SELECT name FROM users WHERE id = ?", [fixture.adminId]);
      const [[teacherAfter]] = await guardedRead("SELECT name FROM teachers WHERE id = ?", [fixture.teacherId]);
      assert.equal(adminAfter.name, adminBefore.name);
      assert.equal(teacherAfter.name, `Synthetic Teacher Updated ${runId}`);
      await guardedWrite("UPDATE teachers SET name = ? WHERE id = ?", [teacherBefore.name, fixture.teacherId]);
    });

    await t.test("creates a decimal INR price as integer paise once", async () => {
      const [[before]] = await guardedRead("SELECT total_fee FROM students WHERE user_id = ?", [fixture.studentId]);
      const [[paid]] = await guardedRead("SELECT COALESCE(SUM(amount), 0) AS total_paid FROM fee_records WHERE student_id = ? AND status = 'Paid'", [fixture.studentId]);
      const totalFee = ((Math.round(Number(paid.total_paid) * 100) + 12025) / 100).toFixed(2);
      mockCreatedOrderId = `order_create_mock_${runId}`;
      createdOrderOptions = null;
      await guardedWrite("UPDATE students SET total_fee = ? WHERE user_id = ?", [totalFee, fixture.studentId]);
      try {
        const response = await request(base, "/api/payments/create-order", studentToken, { method: "POST" });
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(createdOrderOptions.amount, 12025);
        assert.equal(body.amount, 120.25);
        assert.equal(body.currency, "INR");
        const [stored] = await guardedRead("SELECT amount FROM payments WHERE order_id = ?", [mockCreatedOrderId]);
        assert.equal(Number(stored[0]?.amount), 120.25);
      } finally {
        await guardedDelete("DELETE FROM payments WHERE order_id = ? AND student_id = ?", [mockCreatedOrderId, fixture.studentId]);
        await guardedWrite("UPDATE students SET total_fee = ? WHERE user_id = ?", [before.total_fee, fixture.studentId]);
      }
    });

    await t.test("upload content validation and protected file access", async () => {
      multerTemp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "navkar-upload-test-"));
      const uploadApp = express();
      const upload = createUpload({ destination: multerTemp, extensions: [".pdf"], maxBytes: 1024 * 1024 });
      uploadApp.post("/upload", upload.single("file"), verifyUploadedFile([".pdf"]), (req, res) => res.sendStatus(201));
      const uploadServer = uploadApp.listen(0, "127.0.0.1");
      await new Promise((resolve) => uploadServer.once("listening", resolve));
      const uploadBase = `http://127.0.0.1:${uploadServer.address().port}`;
      try {
        const valid = new FormData();
        valid.append("file", new Blob(["%PDF-1.4\nvalid"], { type: "application/pdf" }), "valid.pdf");
        assert.equal((await fetch(`${uploadBase}/upload`, { method: "POST", body: valid })).status, 201);
        const spoofed = new FormData();
        spoofed.append("file", new Blob(["not a pdf"], { type: "application/pdf" }), "spoof.pdf");
        assert.equal((await fetch(`${uploadBase}/upload`, { method: "POST", body: spoofed })).status, 400);
        const executable = new FormData();
        executable.append("file", new Blob(["MZ"], { type: "application/octet-stream" }), "bad.exe");
        assert.equal((await fetch(`${uploadBase}/upload`, { method: "POST", body: executable })).status, 400);
      } finally {
        uploadServer.closeAllConnections();
        await new Promise((resolve) => uploadServer.close(resolve));
      }
      assert.equal((await request(base, `/api/materials/view/${materialIds[2]}`, studentToken)).status, 200);
      assert.equal((await request(base, `/api/materials/view/${materialIds[0]}`, studentToken)).status, 403);
      assert.equal((await request(base, `/api/materials/view/${materialIds[0]}`, teacherToken)).status, 200, "teacher can access any batch");
      assert.equal((await request(base, `/api/materials/view/${materialIds[2]}`, teacherToken)).status, 200);
      assert.equal(fixture.teacherId, fixture.adminId, "fixture must exercise colliding teacher and users-table IDs");
      assert.equal((await request(base, `/api/materials/view/${materialIds[0]}`, teacherToken)).status, 200, "active teachers have global material access by policy");
      assert.equal((await request(base, `/api/tests/view/${testIds[0]}`, teacherToken)).status, 200, "assigned-batch teacher access must work");
      assert.equal((await request(base, `/api/tests/view/${testIds[1]}`, teacherToken)).status, 200, "teacher can access test in another batch");
      const identityCollisionToken = accessToken(collisionTeacherId, "teacher");
      const duplicateEmails = await guardedRead(
        "SELECT (SELECT COUNT(*) FROM teachers WHERE email = ?) AS teacher_count, (SELECT COUNT(*) FROM users WHERE email = ?) AS user_count",
        [collisionEmail, collisionEmail]
      );
      assert.equal(Number(duplicateEmails[0][0].teacher_count), 1);
      assert.equal(Number(duplicateEmails[0][0].user_count), 1, "cross-table email duplicates are an explicit regression case");
      assert.equal((await request(base, `/api/materials/view/${materialIds[1]}`, identityCollisionToken)).status, 200, "active teacher access does not depend on matching email");
      assert.equal((await request(base, `/api/tests/view/${testIds[2]}`, identityCollisionToken)).status, 200, "active teacher access does not depend on matching email");
      const identityTests = await (await request(base, "/api/tests", identityCollisionToken)).json();
      assert.equal(identityTests.some((row) => Number(row.id) === Number(testIds[2])), true);
      assert.equal(identityTests.some((row) => Number(row.id) === Number(testIds[1])), true, "second active teacher sees tests across batches");
      const adminTests = await (await request(base, "/api/tests", adminToken)).json();
      assert.equal(adminTests.some((row) => Number(row.id) === Number(testIds[1])), true, "admin retains access to all tests");
      const adminMaterials = await (await request(base, "/api/materials", adminToken)).json();
      assert.equal(adminMaterials.some((row) => Number(row.id) === Number(materialIds[1])), true, "admin retains access to all materials");
      const teacherTests = await (await request(base, "/api/tests", teacherToken)).json();
      assert.equal(teacherTests.some((row) => Number(row.id) === Number(testIds[0])), true);
      assert.equal(teacherTests.some((row) => Number(row.id) === Number(testIds[1])), true);
      assert.equal(teacherTests.some((row) => Number(row.id) === Number(testIds[2])), true);

      const materialUpload = new FormData();
      materialUpload.append("title", `Teacher Material ${runId}`);
      materialUpload.append("subjectId", String(fixture.subjectId));
      materialUpload.append("batchId", String(altBatchId));
      materialUpload.append("file", new Blob(["%PDF-1.4\nteacher upload"], { type: "application/pdf" }), "rejected.pdf");
      const createdMaterial = await request(base, "/api/materials", teacherToken, { method: "POST", body: materialUpload });
      assert.equal(createdMaterial.status, 201);
      const createdMaterialId = (await createdMaterial.json()).id;
      materialIds.push(createdMaterialId);
      const [[materialOwner]] = await guardedRead("SELECT uploaded_by, uploaded_by_teacher_id, file_path FROM materials WHERE id = ?", [createdMaterialId]);
      assert.equal(materialOwner.uploaded_by, null);
      assert.equal(Number(materialOwner.uploaded_by_teacher_id), Number(fixture.teacherId));
      uploadedMaterialFiles.push(materialOwner.file_path);
      const materialEdit = await request(base, `/api/materials/${createdMaterialId}`, identityCollisionToken, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Teacher Material Edited ${runId}`, subjectId: fixture.subjectId, batchId: altBatchId })
      });
      assert.equal(materialEdit.status, 200);
      assert.equal((await request(base, `/api/materials/view/${createdMaterialId}`, identityCollisionToken)).status, 200);
      assert.equal((await request(base, `/api/materials/${createdMaterialId}`, teacherToken, { method: "DELETE" })).status, 200);

      const testUpload = new FormData();
      testUpload.append("title", `Teacher Test ${runId}`);
      testUpload.append("subjectId", String(fixture.subjectId));
      testUpload.append("batchId", String(altBatchId));
      testUpload.append("totalMarks", "10");
      testUpload.append("testDate", "2098-01-04");
      testUpload.append("file", new Blob(["%PDF-1.4\nteacher test"], { type: "application/pdf" }), "teacher-test.pdf");
      const createdTest = await request(base, "/api/tests", teacherToken, { method: "POST", body: testUpload });
      assert.equal(createdTest.status, 201);
      const createdTestId = (await createdTest.json()).id;
      testIds.push(createdTestId);
      const [[testOwner]] = await guardedRead("SELECT created_by, created_by_teacher_id, file_path FROM tests WHERE id = ?", [createdTestId]);
      assert.equal(testOwner.created_by, null);
      assert.equal(Number(testOwner.created_by_teacher_id), Number(fixture.teacherId));
      uploadedTestFiles.push(testOwner.file_path);
      assert.equal((await request(base, `/api/tests/view/${createdTestId}`, identityCollisionToken)).status, 200);
      const testEdit = new FormData();
      testEdit.append("title", `Teacher Test Edited ${runId}`);
      testEdit.append("subjectId", String(fixture.subjectId));
      testEdit.append("batchId", String(altBatchId));
      testEdit.append("totalMarks", "20");
      testEdit.append("testDate", "2098-01-04");
      testEdit.append("instructions", "edited by another active teacher");
      const edited = await request(base, `/api/tests/${createdTestId}`, identityCollisionToken, { method: "PUT", body: testEdit });
      assert.equal(edited.status, 200);
      assert.equal((await request(base, `/api/tests/${createdTestId}`, teacherToken, { method: "DELETE" })).status, 200);

      const [legacyOwners] = await guardedRead("SELECT COUNT(*) AS count FROM materials WHERE id IN (?, ?) AND uploaded_by = ? AND uploaded_by_teacher_id IS NULL", [materialIds[0], materialIds[1], fixture.adminId]);
      const [legacyTestOwners] = await guardedRead("SELECT COUNT(*) AS count FROM tests WHERE id IN (?, ?, ?) AND created_by = ? AND created_by_teacher_id IS NULL", [testIds[0], testIds[1], testIds[2], fixture.adminId]);
      assert.equal(Number(legacyOwners[0].count), 1, "existing admin-owned material remains user-owned");
      assert.equal(Number(legacyTestOwners[0].count), 2, "existing admin-owned tests retain ownership");
    });

    await t.test("teachers manage attendance across batches but only for enrolled students", async () => {
      assert.equal((await request(base, `/api/attendance/students/${altBatchId}`, teacherToken)).status, 200);
      const unrelatedStudent = await request(base, "/api/attendance/submit", teacherToken, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: fixture.batchId, date: "2098-01-03", attendanceData: [{ studentId: 2147483000, status: "Present" }] })
      });
      assert.equal(unrelatedStudent.status, 403);
      const allowedStudents = await request(base, `/api/attendance/students/${fixture.batchId}`, teacherToken);
      assert.equal(allowedStudents.status, 200);
      assert.equal((await allowedStudents.json()).some((row) => Number(row.id) === Number(fixture.studentId)), true);
      const allowedAttendance = await request(base, "/api/attendance/submit", teacherToken, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: fixture.batchId, date: "2098-01-03", attendanceData: [{ studentId: fixture.studentId, status: "Present" }] })
      });
      assert.equal(allowedAttendance.status, 200);
      const otherBatchAttendance = await request(base, "/api/attendance/submit", teacherToken, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: altBatchId, date: "2098-01-04", attendanceData: [{ studentId: syntheticStudentId, status: "Present" }] })
      });
      assert.equal(otherBatchAttendance.status, 200);
      assert.equal((await request(base, `/api/attendance/history?batchId=${altBatchId}`, accessToken(collisionTeacherId, "teacher"))).status, 200);
    });

    await t.test("attendance insert and partial-failure rollback", async () => {
      const created = await request(base, "/api/attendance/submit", adminToken, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: fixture.batchId, date: attendanceDates[0], attendanceData: [{ studentId: fixture.studentId, status: "Present" }] })
      });
      assert.equal(created.status, 200);
      const [saved] = await guardedRead("SELECT status FROM attendance WHERE student_id = ? AND date = ?", [fixture.studentId, attendanceDates[0]]);
      assert.equal(saved[0]?.status, "Present");
      const rolledBack = await request(base, "/api/attendance/submit", adminToken, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: fixture.batchId, date: attendanceDates[1], attendanceData: [{ studentId: fixture.studentId, status: "Present" }, { studentId: 2147483000, status: "Absent" }] })
      });
      assert.equal(rolledBack.status, 500);
      const [partial] = await guardedRead("SELECT id FROM attendance WHERE student_id = ? AND date = ?", [fixture.studentId, attendanceDates[1]]);
      assert.equal(partial.length, 0);
    });

    await t.test("fee authorization, creation and failed-write consistency", async () => {
      assert.equal((await request(base, "/api/fees/pay", accessToken(fixture.studentId, "student"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: fixture.studentId, amount: 5 }) })).status, 403);
      const teacherToken = accessToken(fixture.teacherId, "teacher");
      assert.equal((await request(base, "/api/fees", teacherToken)).status, 200);
      assert.equal((await request(base, "/api/fees/pay", teacherToken, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: fixture.studentId, amount: 5 }) })).status, 403);
      const created = await request(base, "/api/fees/pay", adminToken, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: fixture.studentId, amount: 5, paymentMode: "Integration", referenceNo: feeReference })
      });
      assert.equal(created.status, 201);
      feeId = (await created.json()).id;
      const [saved] = await guardedRead("SELECT amount FROM fee_records WHERE id = ? AND reference_no = ?", [feeId, feeReference]);
      assert.equal(Number(saved[0]?.amount), 5);
      const failed = await request(base, "/api/fees/pay", adminToken, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: 2147483000, amount: 5, paymentMode: "Integration", referenceNo: `${feeReference}-invalid` })
      });
      assert.equal(failed.status, 500);
      const [partial] = await guardedRead("SELECT id FROM fee_records WHERE reference_no = ?", [`${feeReference}-invalid`]);
      assert.equal(partial.length, 0);
    });

    const orderId = fixture.paymentOrder;
    providerOrder = { id: orderId, amount: 10000, currency: "INR" };
    providerPayment = { id: paymentId, order_id: orderId, amount: 10000, currency: "INR", status: "captured", method: "card" };
    const verify = (payment, sig) => request(base, "/api/payments/verify", studentToken, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: payment, razorpay_signature: sig || signature(`${orderId}|${payment}`, process.env.RAZORPAY_KEY_SECRET), method: "card" })
    });
    const makeWebhook = (order, payment, sig) => {
      const body = Buffer.from(JSON.stringify({ event: "order.paid", payload: { order: { entity: order }, payment: { entity: payment } } }));
      return request(base, "/api/payments/webhook", null, {
        method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": sig || signature(body, process.env.RAZORPAY_WEBHOOK_SECRET) }, body
      });
    };

    await t.test("Razorpay verify rejects invalid signature, amount and currency", async () => {
      assert.equal((await verify(paymentId, "bad-signature")).status, 400);
      providerPayment = { ...providerPayment, amount: 9999 };
      assert.equal((await verify(paymentId)).status, 400);
      providerOrder = { ...providerOrder, amount: 20000 };
      providerPayment = { ...providerPayment, amount: 20000, currency: "INR" };
      assert.equal((await verify(paymentId)).status, 400);
      providerOrder = { ...providerOrder, amount: 10000 };
      providerPayment = { ...providerPayment, amount: 10000, currency: "USD" };
      assert.equal((await verify(paymentId)).status, 400);
      providerPayment = { ...providerPayment, currency: "INR" };
    });

    await t.test("valid Razorpay verify, duplicate and replay", async () => {
      const response = await verify(paymentId);
      assert.equal(response.status, 200, await response.text());
      assert.equal((await verify(paymentId)).status, 200);
      assert.equal((await verify(`replay_${paymentId}`)).status, 409);
      const [fees] = await guardedRead("SELECT id FROM fee_records WHERE reference_no = ?", [paymentId]);
      assert.equal(fees.length, 1);
    });

    await t.test("Razorpay webhook rejects invalid signature, amount and currency", async () => {
      const webhookPayment = { ...providerPayment, id: paymentId };
      assert.equal((await makeWebhook(providerOrder, webhookPayment, "bad-signature")).status, 400);
      assert.equal((await makeWebhook({ ...providerOrder, amount: 9900 }, webhookPayment)).status, 400);
      assert.equal((await makeWebhook(providerOrder, { ...webhookPayment, currency: "USD" })).status, 400);
      assert.equal((await makeWebhook({ ...providerOrder, amount: 20000 }, { ...webhookPayment, amount: 20000 })).status, 400);
    });

    await t.test("valid Razorpay webhook, duplicate and replay", async () => {
      const webhookPayment = { ...providerPayment, id: paymentId };
      const accepted = await makeWebhook(providerOrder, webhookPayment);
      assert.equal(accepted.status, 200, await accepted.text());
      assert.equal((await makeWebhook(providerOrder, webhookPayment)).status, 200);
      assert.equal((await makeWebhook(providerOrder, { ...webhookPayment, id: `replay_${paymentId}` })).status, 409);
      const [fees] = await guardedRead("SELECT id FROM fee_records WHERE reference_no = ?", [paymentId]);
      assert.equal(fees.length, 1);
    });

    await t.test("teacher batch authorization and grading", async () => {
      const grade = (testId, score) => request(base, "/api/tests/grade", teacherToken, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, studentId: fixture.studentId, score })
      });
      assert.equal((await grade(testIds[0], 85)).status, 200);
      const [graded] = await guardedRead("SELECT score, status FROM test_submissions WHERE test_id = ? AND student_id = ?", [testIds[0], fixture.studentId]);
      assert.equal(Number(graded[0]?.score), 85);
      assert.equal(graded[0]?.status, "Graded");
      assert.equal((await grade(testIds[1], 85)).status, 400, "teacher global access still requires the student to belong to that test batch");
      assert.equal((await grade(testIds[0], 101)).status, 400);
      const otherBatchGrade = await request(base, "/api/tests/grade", accessToken(collisionTeacherId, "teacher"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId: testIds[1], studentId: syntheticStudentId, score: 75 })
      });
      assert.equal(otherBatchGrade.status, 200);
      const otherBatchSubmissions = await request(base, `/api/tests/${testIds[1]}/submissions`, accessToken(collisionTeacherId, "teacher"));
      assert.equal(otherBatchSubmissions.status, 200);
      assert.equal((await otherBatchSubmissions.json()).some((row) => Number(row.studentId) === Number(syntheticStudentId)), true);
    });

    await t.test("only admins can change student enrollment or delete student accounts", async () => {
      const teacherDetails = await request(base, `/api/admin/students/${syntheticStudentId}`, teacherToken, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Teacher Edited Student ${runId}`, email: syntheticStudentEmail, mobile: "0000000002", standardId: fixture.standardId, batchId: altBatchId, isActive: true })
      });
      assert.equal(teacherDetails.status, 200, "teachers may edit permitted student details");
      const teacherChange = await request(base, `/api/admin/students/${syntheticStudentId}`, teacherToken, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Synthetic Cross-Batch Student ${runId}`, email: syntheticStudentEmail, standardId: fixture.standardId, batchId: fixture.batchId, isActive: true })
      });
      assert.equal(teacherChange.status, 403);
      assert.equal((await request(base, `/api/admin/students/${syntheticStudentId}`, teacherToken, { method: "DELETE" })).status, 403);
      const adminChange = await request(base, `/api/admin/students/${syntheticStudentId}`, adminToken, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Synthetic Cross-Batch Student ${runId}`, email: syntheticStudentEmail, standardId: fixture.standardId, batchId: fixture.batchId, isActive: true })
      });
      assert.equal(adminChange.status, 200);
      assert.equal((await request(base, `/api/admin/students/${syntheticStudentId}`, adminToken, { method: "DELETE" })).status, 200);
      syntheticStudentId = null;
    });
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    const allAttendanceDates = [...attendanceDates, "2098-01-03", "2098-01-04"];
    const attendanceKeys = [fixture.studentId, syntheticStudentId].filter(Boolean).flatMap((studentId) => allAttendanceDates.map((date) => `student:${studentId}:attendance:${date}`));
    const [attendanceNotifications] = attendanceKeys.length
      ? await guardedRead(`SELECT id FROM notifications WHERE unique_key IN (${attendanceKeys.map(() => "?").join(",")})`, attendanceKeys)
      : [[]];
    for (const { id } of attendanceNotifications) await guardedDelete("DELETE FROM notification_reads WHERE notification_id = ?", [id]);
    if (attendanceKeys.length) await guardedDelete(`DELETE FROM notifications WHERE unique_key IN (${attendanceKeys.map(() => "?").join(",")})`, attendanceKeys);
    await guardedDelete("DELETE FROM attendance WHERE student_id = ? AND date IN (?, ?, ?)", [fixture.studentId, ...allAttendanceDates]);

    const [feeRows] = await guardedRead("SELECT id, reference_no FROM fee_records WHERE reference_no = ? OR reference_no = ?", [feeReference, paymentId]);
    for (const row of feeRows) {
      const keys = [
        `student:${fixture.studentId}:fee-paid:${row.id}`, `teacher:all:fee-collected:${row.id}`,
        `admin:fee-collected:${row.id}`, `staff:fee-collected:${row.id}`,
        `student:${fixture.studentId}:fee-paid:${row.id}`
      ];
      const [rows] = await guardedRead("SELECT id FROM notifications WHERE unique_key IN (?, ?, ?, ?)", [keys[0], keys[1], keys[2], keys[3]]);
      for (const { id } of rows) await guardedDelete("DELETE FROM notification_reads WHERE notification_id = ?", [id]);
      await guardedDelete("DELETE FROM notifications WHERE unique_key IN (?, ?, ?, ?)", [keys[0], keys[1], keys[2], keys[3]]);
      await guardedDelete("DELETE FROM fee_records WHERE id = ? AND reference_no = ?", [row.id, row.reference_no]);
    }
    await guardedWrite("UPDATE payments SET payment_id = NULL, status = 'Created', method = NULL WHERE order_id = ? AND student_id = ?", [fixture.paymentOrder, fixture.studentId]);

    for (const testId of testIds) {
      const recipientIds = [fixture.studentId, syntheticStudentId].filter(Boolean);
      const [rows] = recipientIds.length
        ? await guardedRead(`SELECT id FROM notifications WHERE type = 'test' AND role = 'student' AND user_id IN (${recipientIds.map(() => "?").join(",")}) AND reference_id = ?`, [...recipientIds, testId])
        : [[]];
      for (const { id } of rows) await guardedDelete("DELETE FROM notification_reads WHERE notification_id = ?", [id]);
      if (recipientIds.length) await guardedDelete(`DELETE FROM notifications WHERE type = 'test' AND role = 'student' AND user_id IN (${recipientIds.map(() => "?").join(",")}) AND reference_id = ?`, [...recipientIds, testId]);
      const [allTestNotes] = await guardedRead("SELECT id FROM notifications WHERE type = 'test' AND reference_id = ?", [testId]);
      for (const { id } of allTestNotes) await guardedDelete("DELETE FROM notification_reads WHERE notification_id = ?", [id]);
      await guardedDelete("DELETE FROM notifications WHERE type = 'test' AND reference_id = ?", [testId]);
      await guardedDelete("DELETE FROM test_submissions WHERE test_id = ? AND student_id = ?", [testId, fixture.studentId]);
      if (syntheticStudentId) await guardedDelete("DELETE FROM test_submissions WHERE test_id = ? AND student_id = ?", [testId, syntheticStudentId]);
      await guardedDelete("DELETE FROM tests WHERE id = ? AND title LIKE ?", [testId, `%${runId}%`]);
    }
    for (const materialId of materialIds) {
      const [notes] = await guardedRead("SELECT id FROM notifications WHERE type = 'material' AND reference_id = ?", [materialId]);
      for (const { id } of notes) await guardedDelete("DELETE FROM notification_reads WHERE notification_id = ?", [id]);
      await guardedDelete("DELETE FROM notifications WHERE type = 'material' AND reference_id = ?", [materialId]);
      await guardedDelete("DELETE FROM materials WHERE id = ? AND title LIKE ?", [materialId, `%${runId}%`]);
    }
    if (altBatchId) await guardedDelete("DELETE FROM batches WHERE id = ? AND name = ?", [altBatchId, altBatchName]);
    if (collisionUserId) await guardedDelete("DELETE FROM users WHERE id = ? AND email = ? AND role = 'student'", [collisionUserId, collisionEmail]);
    if (collisionTeacherId) await guardedDelete("DELETE FROM teachers WHERE id = ? AND email = ? AND name = ?", [collisionTeacherId, collisionEmail, `Synthetic Collision Teacher ${runId}`]);
    for (const file of [materialPath, altMaterialPath, ...uploadedMaterialFiles]) if (file) await fs.promises.unlink(path.join(uploadDir, file)).catch(() => {});
    for (const file of [testFilePath, altTestFilePath, ...uploadedTestFiles]) if (file) await fs.promises.unlink(path.join(testUploadDir, file)).catch(() => {});
    if (syntheticStudentId) await guardedDelete("DELETE FROM users WHERE id = ? AND email = ? AND role = 'student'", [syntheticStudentId, syntheticStudentEmail]);
    if (multerTemp) await fs.promises.rm(multerTemp, { recursive: true, force: true });
    await appPool.end();
  }
});
