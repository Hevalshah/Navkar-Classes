-- Explicit test-database-only migration; apply only through the guarded test harness.
-- Retains legacy user ownership, allowing teacher-authored rows to use teacher IDs.
ALTER TABLE materials
  MODIFY uploaded_by INT NULL,
  ADD COLUMN uploaded_by_teacher_id INT NULL,
  ADD CONSTRAINT fk_materials_teacher_owner
    FOREIGN KEY (uploaded_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

ALTER TABLE tests
  MODIFY created_by INT NULL,
  ADD COLUMN created_by_teacher_id INT NULL,
  ADD CONSTRAINT fk_tests_teacher_owner
    FOREIGN KEY (created_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
