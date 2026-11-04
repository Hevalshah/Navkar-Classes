const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { withTestConnection } = require("../database");
const { compareSchema } = require("../schemaDiff");

dotenv.config({ path: path.join(__dirname, "..", ".env.test") });
const schemaPath = path.join(__dirname, "..", "schema.sql");
const finalSnapshot = fs.readFileSync(schemaPath, "utf8");
const baselineSnapshot = finalSnapshot
  .replace("  uploaded_by INT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  uploaded_by_teacher_id INT NULL,", "  uploaded_by INT NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,")
  .replace(",\n  FOREIGN KEY (uploaded_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL", "")
  .replace("  created_by INT NULL,\n  test_date DATE NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  created_by_teacher_id INT NULL,", "  created_by INT NOT NULL,\n  test_date DATE NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,")
  .replace(",\n  FOREIGN KEY (created_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL", "");
const migrationSql = fs.readFileSync(path.join(__dirname, "teacher-ownership.sql"), "utf8");
const statements = migrationSql.replace(/^--.*$/gm, "").split(";").map((sql) => sql.trim()).filter(Boolean);
const applying = process.argv.includes("--apply");

const readColumns = async (read, table) => {
  const [rows] = await read(
    "SELECT COLUMN_NAME AS name, IS_NULLABLE AS nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
    [table]
  );
  return new Map(rows.map((row) => [row.name, row.nullable]));
};

(async () => {
  await withTestConnection(async ({ read, write }) => {
    const columns = {
      materials: await readColumns(read, "materials"),
      tests: await readColumns(read, "tests")
    };
    const materialDone = columns.materials.has("uploaded_by_teacher_id");
    const testDone = columns.tests.has("created_by_teacher_id");
    if (materialDone && testDone) {
      for (const table of ["materials", "tests"]) {
        const [actualColumns] = await read("SELECT COLUMN_NAME AS name, IS_NULLABLE AS nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ORDINAL_POSITION", [table]);
        console.log(`${table} columns: ${actualColumns.map((item) => `${item.name}:${item.nullable}`).join(",")}`);
      }
      await compareSchema(read, finalSnapshot);
      console.log("PASS: navkar_classes_test identity, grants, and migrated schema verified.");
      console.log("Teacher ownership migration is already applied; no changes made.");
      return;
    }
    if (materialDone || testDone) throw new Error("Unexpected partial teacher ownership migration; refusing to continue.");
    await compareSchema(read, baselineSnapshot);
    console.log("PASS: navkar_classes_test identity, grants, and existing schema verified.");
    if (!applying) {
      console.log("READ-ONLY PREFLIGHT: ready; no schema changes made. Re-run with --apply to apply the reviewed migration.");
      return;
    }
    if (statements.length !== 2 || statements.some((sql) => !/^ALTER TABLE (materials|tests)\b/i.test(sql))) {
      throw new Error("Migration contains an unexpected operation; refusing to apply.");
    }
    for (const sql of statements) await write(sql);
    console.log("APPLIED: teacher ownership schema migration in navkar_classes_test.");
  });
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
