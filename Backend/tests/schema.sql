-- Schema-only snapshot of CREATE TABLE definitions in config/db.js.
-- Intentionally excludes CREATE DATABASE, ALTER, INSERT, UPDATE, DELETE and cleanup.

CREATE TABLE standards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  standard_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
  UNIQUE KEY unique_batch_per_std (name, standard_id)
);

CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  standard_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
  UNIQUE KEY unique_subject_per_std (name, standard_id)
);

CREATE TABLE teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mobile VARCHAR(20) NULL,
  password VARCHAR(255) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
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
  total_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  standard_id INT NULL,
  batch_id INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  last_logout_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE SET NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

CREATE TABLE students (
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
  total_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE SET NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

CREATE TABLE timetable (
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
);

CREATE TABLE materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  subject_id INT NOT NULL,
  batch_id INT NOT NULL,
  file_path VARCHAR(555) NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size VARCHAR(50) NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by_teacher_id INT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subject_id INT NOT NULL,
  batch_id INT NOT NULL,
  instructions TEXT NULL,
  total_marks INT NOT NULL,
  file_path VARCHAR(555) NULL,
  created_by INT NULL,
  test_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_teacher_id INT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE test_submissions (
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
);

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  student_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('Present', 'Absent', 'Late') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_date (student_id, date)
);

CREATE TABLE fee_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid_date DATE NOT NULL,
  payment_mode VARCHAR(50) NOT NULL,
  reference_no VARCHAR(100) NULL,
  status ENUM('Paid', 'Pending') NOT NULL DEFAULT 'Paid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NULL,
  type VARCHAR(50) NOT NULL,
  role ENUM('admin', 'staff', 'student', 'teacher') NOT NULL,
  user_id INT NULL,
  reference_id INT NULL,
  unique_key VARCHAR(255) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_notification_key (unique_key),
  INDEX idx_notifications_audience (role, user_id, created_at)
);

CREATE TABLE notification_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_notification_read (notification_id, user_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(255) NULL,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  student_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Created',
  method VARCHAR(50) NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
