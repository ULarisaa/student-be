require('dotenv').config(); // Load environment variables from .env file

const { Pool } = require('pg'); // Import PostgreSQL Pool from 'pg'

// Create a connection pool to PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,  // Default PostgreSQL port
  user: process.env.DB_USER || 'your_db_user', 
  password: process.env.DB_PASSWORD || 'your_db_password', 
  database: process.env.DB_NAME || 'institutional_db', 
});

// Function to query the database
const query = (text, params) => {
  return pool.query(text, params);  // Executes a query and returns a promise
};

// Optional: Check the connection when the app starts to ensure it's working
pool.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => {
    console.error('Error connecting to the database', err);
    process.exit(1); // Exit the application if connection fails
  });

module.exports = { query, pool };
