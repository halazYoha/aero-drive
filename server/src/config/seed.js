import pool from './db.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  try {
    console.log('=========================================');
    console.log('🔄 Starting AeroDrive database migration & seeding...');
    console.log('=========================================');

    // 1. Clean existing tables safely in reverse dependency order
    await pool.query('DROP TABLE IF EXISTS bookings CASCADE;');
    await pool.query('DROP TABLE IF EXISTS specifications CASCADE;');
    await pool.query('DROP TABLE IF EXISTS cars CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    console.log('🧹 Cleaned existing tables (if any).');

    // 2. Create Users Table
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client' CHECK (role IN ('client', 'admin'))
      );
    `);
    console.log('👥 Created "users" table.');

    // 3. Create Cars Table
    await pool.query(`
      CREATE TABLE cars (
        id SERIAL PRIMARY KEY,
        make VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        mileage INTEGER NOT NULL,
        fuel_type VARCHAR(50) NOT NULL,
        transmission VARCHAR(50) NOT NULL,
        body_style VARCHAR(50) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'sold'))
      );
    `);
    console.log('🚗 Created "cars" table.');

    // 4. Create Specifications Table (1-to-1 relationship with cars)
    await pool.query(`
      CREATE TABLE specifications (
        car_id INTEGER PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
        engine VARCHAR(100) NOT NULL,
        horsepower INTEGER NOT NULL,
        acceleration VARCHAR(50) NOT NULL,
        top_speed VARCHAR(50) NOT NULL,
        drivetrain VARCHAR(100) NOT NULL
      );
    `);
    console.log('⚙️ Created "specifications" table.');

    // 5. Create Bookings Table
    await pool.query(`
      CREATE TABLE bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL CHECK (time_slot IN ('morning', 'afternoon')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled'))
      );
    `);
    console.log('📅 Created "bookings" table.');

    // 6. Insert User Accounts (with bcrypt hashed passwords)
    const adminHash = await bcrypt.hash('admin123', 12);
    const clientHash = await bcrypt.hash('client123', 12);
    await pool.query(`
      INSERT INTO users (email, password, full_name, role) VALUES
      ('admin@aerodrive.com', '${adminHash}', 'Alex Mercer', 'admin'),
      ('client@example.com', '${clientHash}', 'Jane Doe', 'client');
    `);
    console.log('✅ Seeded Client & Dealer Admin user accounts.');

    // 7. Insert Vehicle Showroom Fleet
    const cars = [
      {
        make: 'Porsche',
        model: '911 GT3 RS',
        year: 2024,
        price: 223800.00,
        mileage: 120,
        fuel_type: 'Petrol',
        transmission: 'Automatic (PDK)',
        body_style: 'Coupe',
        image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
        specs: {
          engine: '4.0L Naturally Aspirated Boxer-6',
          horsepower: 518,
          acceleration: '3.2s (0-100 km/h)',
          top_speed: '296 km/h',
          drivetrain: 'Rear-Wheel Drive (RWD)'
        }
      },
      {
        make: 'Tesla',
        model: 'Model S Plaid',
        year: 2024,
        price: 89990.00,
        mileage: 1500,
        fuel_type: 'Electric',
        transmission: 'Automatic (Single Speed)',
        body_style: 'Sedan',
        image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80',
        specs: {
          engine: 'Tri-Motor AWD Electric Setup',
          horsepower: 1020,
          acceleration: '2.1s (0-100 km/h)',
          top_speed: '322 km/h',
          drivetrain: 'All-Wheel Drive (AWD)'
        }
      },
      {
        make: 'Audi',
        model: 'RS e-tron GT',
        year: 2023,
        price: 147500.00,
        mileage: 800,
        fuel_type: 'Electric',
        transmission: 'Automatic',
        body_style: 'Coupe',
        image_url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80',
        specs: {
          engine: 'Dual Electric Motor Setup',
          horsepower: 637,
          acceleration: '3.1s (0-100 km/h)',
          top_speed: '250 km/h',
          drivetrain: 'quattro All-Wheel Drive'
        }
      },
      {
        make: 'BMW',
        model: 'M4 Competition',
        year: 2024,
        price: 82200.00,
        mileage: 240,
        fuel_type: 'Petrol',
        transmission: 'Automatic (8-Speed)',
        body_style: 'Coupe',
        image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
        specs: {
          engine: '3.0L Twin-Turbo Inline-6',
          horsepower: 503,
          acceleration: '3.4s (0-100 km/h)',
          top_speed: '290 km/h',
          drivetrain: 'xDrive All-Wheel Drive'
        }
      },
      {
        make: 'Mercedes-Benz',
        model: 'AMG GT R',
        year: 2023,
        price: 165600.00,
        mileage: 1800,
        fuel_type: 'Petrol',
        transmission: 'Automatic (7-Speed)',
        body_style: 'Coupe',
        image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80',
        specs: {
          engine: '4.0L Twin-Turbo V8',
          horsepower: 577,
          acceleration: '3.6s (0-100 km/h)',
          top_speed: '318 km/h',
          drivetrain: 'Rear-Wheel Drive (RWD)'
        }
      },
      {
        make: 'Land Rover',
        model: 'Range Rover Sport',
        year: 2024,
        price: 118000.00,
        mileage: 450,
        fuel_type: 'Hybrid (PHEV)',
        transmission: 'Automatic',
        body_style: 'SUV',
        image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
        specs: {
          engine: '3.0L Turbocharged 6-Cylinder & Motor',
          horsepower: 434,
          acceleration: '5.5s (0-100 km/h)',
          top_speed: '225 km/h',
          drivetrain: 'AWD Terrain Response 2'
        }
      }
    ];

    for (const car of cars) {
      const carInsert = await pool.query(
        `INSERT INTO cars (make, model, year, price, mileage, fuel_type, transmission, body_style, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;`,
        [car.make, car.model, car.year, car.price, car.mileage, car.fuel_type, car.transmission, car.body_style, car.image_url]
      );
      
      const carId = carInsert.rows[0].id;
      
      await pool.query(
        `INSERT INTO specifications (car_id, engine, horsepower, acceleration, top_speed, drivetrain)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [carId, car.specs.engine, car.specs.horsepower, car.specs.acceleration, car.specs.top_speed, car.specs.drivetrain]
      );
    }

    console.log('🚗 Seeded car listings & specs successfully.');
    console.log('🌱 AeroDrive Database Migration & Seeding Completed successfully!');
    console.log('=========================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
