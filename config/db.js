require('dotenv').config(); 

const { Pool } = require('pg'); 


const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,  
  user: process.env.DB_USER || 'db_user', 
  password: process.env.DB_PASSWORD || 'db_password', 
  database: process.env.DB_NAME || 'institutional_db', 
});


const query = (text, params) => {
  return pool.query(text, params);  
};


pool.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => {
    console.error('Error connecting to the database', err);
    process.exit(1); 
  });

module.exports = { query, pool };
