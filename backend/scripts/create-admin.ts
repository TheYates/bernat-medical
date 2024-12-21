import bcrypt from 'bcrypt';
import { pool } from '../src/db';

async function createAdmin() {
  try {
    // Delete existing admin if exists
    await pool.execute('DELETE FROM users WHERE username = ?', ['admin']);

    // Create admin user
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new admin
    await pool.execute(
      'INSERT INTO users (username, password, full_name, role, access) VALUES (?, ?, ?, ?, ?)',
      [
        'admin',
        hashedPassword,
        'System Administrator',
        'admin',
        JSON.stringify(['appointments', 'records', 'settings'])
      ]
    );

    console.log('Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Hashed password:', hashedPassword);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    process.exit(0);
  }
}

createAdmin(); 