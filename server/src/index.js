import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import carsRouter from './routes/cars.js';
import bookingsRouter from './routes/bookings.js';
import authRouter from './routes/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser middleware
app.use(cors());
app.use(express.json());

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/cars', carsRouter);
app.use('/api/bookings', bookingsRouter);

// API Heartbeat/Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'AeroDrive Backend API is running successfully!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start listening for requests
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 AeroDrive Server listening on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});
