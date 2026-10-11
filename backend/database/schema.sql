CREATE DATABASE IF NOT EXISTS expense_voucher_db;
USE expense_voucher_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('employee', 'director', 'accounts') NOT NULL,
  employee_code VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voucher_number VARCHAR(30) NULL UNIQUE,
  user_id INT NOT NULL,
  voucher_date DATE NOT NULL,
  expense_date DATE NULL,
  department VARCHAR(100) NULL,
  expense_title VARCHAR(200) NULL,
  expense_category VARCHAR(50) NULL,
  expense_description TEXT NULL,
  amount DECIMAL(10,2) NULL,
  status ENUM('draft', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
  employee_signature VARCHAR(255) NULL,
  director_signature VARCHAR(255) NULL,
  approved_by INT NULL,
  approval_date DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);