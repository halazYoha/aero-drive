import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// 1. GET /api/cars - Get all cars with dynamic search filters
router.get('/', async (req, res) => {
  try {
    const { make, body_style, fuel_type, min_price, max_price } = req.query;

    let queryText = `
      SELECT cars.*, 
             specifications.engine, 
             specifications.horsepower, 
             specifications.acceleration, 
             specifications.top_speed, 
             specifications.drivetrain
      FROM cars
      LEFT JOIN specifications ON cars.id = specifications.car_id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;

    // Dynamically build parameterized SQL to secure database against SQL injection
    if (make) {
      queryText += ` AND LOWER(cars.make) = LOWER($${paramIndex})`;
      queryParams.push(make);
      paramIndex++;
    }

    if (body_style) {
      queryText += ` AND LOWER(cars.body_style) = LOWER($${paramIndex})`;
      queryParams.push(body_style);
      paramIndex++;
    }

    if (fuel_type) {
      queryText += ` AND LOWER(cars.fuel_type) = LOWER($${paramIndex})`;
      queryParams.push(fuel_type);
      paramIndex++;
    }

    if (min_price) {
      queryText += ` AND cars.price >= $${paramIndex}`;
      queryParams.push(parseFloat(min_price));
      paramIndex++;
    }

    if (max_price) {
      queryText += ` AND cars.price <= $${paramIndex}`;
      queryParams.push(parseFloat(max_price));
      paramIndex++;
    }

    // Order catalog from premium highest price down to lowest
    queryText += ' ORDER BY cars.price DESC';

    const result = await pool.query(queryText, queryParams);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching cars:', error);
    res.status(500).json({ error: 'Server error while retrieving vehicle catalog.' });
  }
});

// 2. GET /api/cars/:id - Get detailed vehicle specs & catalog information
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Relational INNER JOIN between 'cars' and 'specifications' tables
    const queryText = `
      SELECT cars.*, 
             specifications.engine, 
             specifications.horsepower, 
             specifications.acceleration, 
             specifications.top_speed, 
             specifications.drivetrain
      FROM cars
      INNER JOIN specifications ON cars.id = specifications.car_id
      WHERE cars.id = $1
    `;

    const result = await pool.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car listing not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching car details:', error);
    res.status(500).json({ error: 'Server error while retrieving vehicle details.' });
  }
});

// 3. POST /api/cars - Insert a new vehicle listing with specifications (Admin only, wrapped in transaction)
router.post('/', async (req, res) => {
  const {
    make, model, year, price, mileage, fuel_type, transmission, body_style, image_url,
    engine, horsepower, acceleration, top_speed, drivetrain
  } = req.body;

  // Basic validation
  if (!make || !model || !year || !price || !mileage || !fuel_type || !transmission || !body_style || !image_url) {
    return res.status(400).json({ error: 'All core vehicle fields are required.' });
  }

  const client = await pool.connect();
  try {
    // Start transactional block
    await client.query('BEGIN');

    // Insert into cars table
    const carInsertQuery = `
      INSERT INTO cars (make, model, year, price, mileage, fuel_type, transmission, body_style, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const carResult = await client.query(carInsertQuery, [
      make, model, parseInt(year), parseFloat(price), parseInt(mileage), fuel_type, transmission, body_style, image_url
    ]);

    const carId = carResult.rows[0].id;

    // Insert into specifications table (default values if empty)
    const specInsertQuery = `
      INSERT INTO specifications (car_id, engine, horsepower, acceleration, top_speed, drivetrain)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await client.query(specInsertQuery, [
      carId,
      engine || '2.0L Turbocharged 4-Cylinder',
      parseInt(horsepower) || 250,
      acceleration || '6.5s (0-100 km/h)',
      top_speed || '210 km/h',
      drivetrain || 'Front-Wheel Drive (FWD)'
    ]);

    // Commit transaction
    await client.query('COMMIT');
    console.log(`🚗 Admin added new vehicle: ${make} ${model} (ID: ${carId})`);
    res.status(201).json({ message: 'Vehicle and specs added successfully!', carId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding vehicle listing:', error);
    res.status(500).json({ error: 'Server error while creating vehicle listing.' });
  } finally {
    client.release();
  }
});

// 4. DELETE /api/cars/:id - Delete a vehicle listing
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM cars WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle listing not found.' });
    }
    console.log(`🗑️ Deleted vehicle listing ID: ${id}`);
    res.status(200).json({ message: 'Vehicle listing deleted successfully!' });
  } catch (error) {
    console.error('❌ Error deleting vehicle:', error);
    res.status(500).json({ error: 'Server error while deleting vehicle listing.' });
  }
});

// 5. PATCH /api/cars/:id - Quick update for a vehicle listing (like price or status)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { price, status } = req.body;

  if (price === undefined && status === undefined) {
    return res.status(400).json({ error: 'Please provide price or status to update.' });
  }

  try {
    let queryText = 'UPDATE cars SET';
    const params = [];
    let index = 1;

    if (price !== undefined) {
      queryText += ` price = $${index},`;
      params.push(parseFloat(price));
      index++;
    }

    if (status !== undefined) {
      queryText += ` status = $${index},`;
      params.push(status);
      index++;
    }

    // Remove trailing comma and add WHERE clause
    queryText = queryText.slice(0, -1) + ` WHERE id = $${index} RETURNING *`;
    params.push(id);

    const result = await pool.query(queryText, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle listing not found.' });
    }

    console.log(`✏️ Updated vehicle listing ID: ${id}`);
    res.status(200).json({ message: 'Vehicle updated successfully!', car: result.rows[0] });
  } catch (error) {
    console.error('❌ Error updating vehicle:', error);
    res.status(500).json({ error: 'Server error while updating vehicle details.' });
  }
});

export default router;
