import bcrypt from 'bcryptjs';
import pool from './db.js';

const createAdmin = async () => {
  try {
    const email = 'admin@aerodrive.com';
    const password = 'admin123';
    const fullName = 'Admin User';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Insert admin user
    const result = await pool.query(
      'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password = $2, role = $4 RETURNING *',
      [email, hashedPassword, fullName, 'admin']
    );
    
    console.log('✅ Admin user created/updated successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();
