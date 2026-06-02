import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create a new connection pool to PostgreSQL using our .env variables
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  ssl: { rejectUnauthorized: false }
});

// Log confirmation when connected successfully
pool.on('connect', () => {
  console.log('⚡ Connected to the AeroDrive PostgreSQL database successfully!');
});

// Handle errors gracefully on idle database connections
pool.on('error', (err) => {
  console.error('❌ Unexpected database error on idle client:', err);
});

export default pool;
