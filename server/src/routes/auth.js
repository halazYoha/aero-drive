import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Helper: Sign a JWT token for a user
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Middleware: Verify bearer JWT token from request headers
export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No valid session token provided.' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
};

// 1. POST /api/auth/register — Create a new user account
router.post('/register', async (req, res) => {
  const { full_name, email, password, role } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    // Check for duplicate email
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password with salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password, role)
       VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role`,
      [full_name, email, hashedPassword, role || 'client']
    );

    const user = newUser.rows[0];
    const token = signToken(user);
    console.log(`✅ Registered new user: ${email} (${user.role})`);

    res.status(201).json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// 2. POST /api/auth/login — Authenticate and return a token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    console.log(`🔓 Login successful: ${email} (${user.role})`);

    res.status(200).json({ 
      token, 
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
});

// 3. GET /api/auth/me — Verify token & return current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({ error: 'Server error retrieving user profile.' });
  }
});

export default router;
