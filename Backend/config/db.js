const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const database = process.env.DB_NAME || "navkar_classes";

const pool = mysql.createPool({
  ...dbConfig,
  database
});

const connectDB = async () => {
  const connection = await mysql.createConnection(dbConfig);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await connection.end();

  // Create standards
  await pool.query(`
    CREATE TABLE IF NOT EXISTS standards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create batches
  await pool.query(`
    CREATE TABLE IF NOT EXISTS batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      standard_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
      UNIQUE KEY unique_batch_per_std (name, standard_id)
    )
  `);

  // Create subjects
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      standard_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
      UNIQUE KEY unique_subject_per_std (name, standard_id)
    )
  `);

  // Create teachers
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      mobile VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create users (students / admins)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      parent_name VARCHAR(100) NULL,
      mobile VARCHAR(20) NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(100) NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'staff', 'student') NOT NULL DEFAULT 'student',
      address TEXT NULL,
      course VARCHAR(100) NULL,
      assigned_batch VARCHAR(100) NULL,
      standard_id INT NULL,
      batch_id INT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at DATETIME NULL,
      last_logout_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE SET NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    )
  `);

  // Migrate columns if table already existed
  const addColumns = [
    "ALTER TABLE users MODIFY COLUMN mobile VARCHAR(20) NULL",
    "ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL UNIQUE",
    "ALTER TABLE users ADD COLUMN address TEXT NULL",
    "ALTER TABLE users ADD COLUMN course VARCHAR(100) NULL",
    "ALTER TABLE users ADD COLUMN assigned_batch VARCHAR(100) NULL",
    "ALTER TABLE users ADD COLUMN standard_id INT NULL",
    "ALTER TABLE users ADD COLUMN batch_id INT NULL",
    "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'staff', 'student') NOT NULL DEFAULT 'student'",
    "ALTER TABLE users ADD CONSTRAINT fk_users_standard FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE SET NULL",
    "ALTER TABLE users ADD CONSTRAINT fk_users_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL"
  ];

  for (const q of addColumns) {
    try {
      await pool.query(q);
    } catch (err) {}
  }

  // Student records are linked to users, which remain the login/session table.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      parent_name VARCHAR(100) NULL,
      mobile VARCHAR(20) NULL,
      address TEXT NULL,
      course VARCHAR(100) NULL,
      assigned_batch VARCHAR(100) NULL,
      standard_id INT NULL,
      batch_id INT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at DATETIME NULL,
      last_logout_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE SET NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    )
  `);

  // Move legacy student profile/academic data out of users into linked student rows.
  await pool.query(`
    INSERT INTO students (
      user_id, name, parent_name, mobile, address, course, assigned_batch,
      standard_id, batch_id, is_active, last_login_at, last_logout_at
    )
    SELECT
      u.id, u.name, u.parent_name, u.mobile, u.address, u.course, u.assigned_batch,
      u.standard_id, u.batch_id, u.is_active, u.last_login_at, u.last_logout_at
    FROM users u
    LEFT JOIN students st ON st.user_id = u.id
    WHERE u.role = 'student' AND st.id IS NULL
  `);

  // Create timetable
  await pool.query(`
    CREATE TABLE IF NOT EXISTS timetable (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      day VARCHAR(20) NOT NULL,
      subject_id INT NOT NULL,
      teacher_id INT NOT NULL,
      time_slot VARCHAR(100) NOT NULL,
      room VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    )
  `);

  // Create materials
  await pool.query(`
    CREATE TABLE IF NOT EXISTS materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      subject_id INT NOT NULL,
      batch_id INT NOT NULL,
      file_path VARCHAR(555) NOT NULL,
      file_type VARCHAR(10) NOT NULL,
      file_size VARCHAR(50) NOT NULL,
      uploaded_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create tests
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subject_id INT NOT NULL,
      batch_id INT NOT NULL,
      instructions TEXT NULL,
      total_marks INT NOT NULL,
      file_path VARCHAR(555) NULL,
      created_by INT NOT NULL,
      test_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create test submissions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      test_id INT NOT NULL,
      student_id INT NOT NULL,
      score VARCHAR(50) NOT NULL,
      status ENUM('Graded', 'Ungraded') NOT NULL DEFAULT 'Ungraded',
      submitted_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_student_test (student_id, test_id)
    )
  `);

  // Create attendance
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      student_id INT NOT NULL,
      date DATE NOT NULL,
      status ENUM('Present', 'Absent', 'Late') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_student_date (student_id, date)
    )
  `);

  try {
    await pool.query("ALTER TABLE attendance MODIFY COLUMN status ENUM('Present', 'Absent', 'Late') NOT NULL");
  } catch (err) {}

  // Create fee records
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fee_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      paid_date DATE NOT NULL,
      payment_mode VARCHAR(50) NOT NULL,
      reference_no VARCHAR(100) NULL,
      status ENUM('Paid', 'Pending') NOT NULL DEFAULT 'Paid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log("MySQL connected and schema initialized");
};

module.exports = { connectDB, pool };
