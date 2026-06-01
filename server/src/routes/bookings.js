import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// 1. GET /api/bookings - Load all booking leads from PostgreSQL with relational client/car details
router.get('/', async (req, res) => {
  try {
    const queryText = `
      SELECT bookings.id,
             bookings.booking_date::TEXT as booking_date,
             bookings.time_slot,
             bookings.status,
             users.full_name as name,
             users.email,
             cars.make as car_make,
             cars.model as car_model,
             CONCAT(cars.make, ' ', cars.model) as car
      FROM bookings
      INNER JOIN users ON bookings.user_id = users.id
      INNER JOIN cars ON bookings.car_id = cars.id
      ORDER BY bookings.booking_date DESC, bookings.id DESC
    `;

    const result = await pool.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({ error: 'Server error while retrieving bookings logs.' });
  }
});

// 2. POST /api/bookings - Schedule a new test drive with scheduling conflict checks
router.post('/', async (req, res) => {
  const { name, email, car_id, booking_date, time_slot } = req.body;

  // Basic payload validation
  if (!name || !email || !car_id || !booking_date || !time_slot) {
    return res.status(400).json({ error: 'Missing required booking parameters.' });
  }

  try {
    // A. Dynamic Double-Booking Validation Check
    const conflictCheck = await pool.query(
      `SELECT * FROM bookings 
       WHERE car_id = $1 AND booking_date = $2 AND time_slot = $3 AND status != 'cancelled'`,
      [car_id, booking_date, time_slot]
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'This specific vehicle is already reserved for a test drive at this date and time slot.' 
      });
    }

    // B. Find or create the client user in the database
    let userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
    } else {
      // User doesn't exist, create a client profile automatically with default credentials
      const newUser = await pool.query(
        `INSERT INTO users (email, password, full_name, role) 
         VALUES ($1, $2, $3, 'client') RETURNING id`,
        [email, 'defaultpassword123', name]
      );
      userId = newUser.rows[0].id;
      console.log(`👥 Registered new client profile: ${email}`);
    }

    // C. Write the booking to the database
    const bookingResult = await pool.query(
      `INSERT INTO bookings (user_id, car_id, booking_date, time_slot, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [userId, car_id, booking_date, time_slot]
    );

    console.log(`📅 Created booking ID ${bookingResult.rows[0].id} for client: ${email}`);
    res.status(201).json({
      message: 'Booking created successfully!',
      booking: bookingResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    res.status(500).json({ error: 'Server error while scheduling test drive.' });
  }
});

// 3. PATCH /api/bookings/:id - Update booking status (e.g. approved, cancelled, completed)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status parameter is required.' });
  }

  // Validate allowed status types
  const allowedStatuses = ['pending', 'approved', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid booking status provided.' });
  }

  try {
    const queryText = `
      UPDATE bookings 
      SET status = $1 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await pool.query(queryText, [status.toLowerCase(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    console.log(`🔄 Updated Booking ID ${id} status to: ${status}`);
    res.status(200).json({
      message: 'Booking status updated successfully!',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    res.status(500).json({ error: 'Server error while updating booking status.' });
  }
});

export default router;
