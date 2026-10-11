require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

async function seed() {
  const hash = await bcrypt.hash('password123', 10);

  const users = [
    ['Rahul Sharma', 'employee@abc.com', hash, 'employee', 'EMP001'],
    ['Priya Mehta', 'employee2@abc.com', hash, 'employee', 'EMP002'],
    ['Anil Kapoor', 'director@abc.com', hash, 'director', null],
    ['Sneha Iyer', 'accounts@abc.com', hash, 'accounts', null],
  ];

  for (const u of users) {
    await pool.query(
      'INSERT IGNORE INTO users (name, email, password_hash, role, employee_code) VALUES (?, ?, ?, ?, ?)',
      u
    );
  }

  console.log('Users seeded');
  process.exit();
}

seed();