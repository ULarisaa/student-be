const db = require('./../config/db'); // Assume you're using pg-db for PostgreSQL connection
const bcrypt = require('bcrypt');

async function getUserByEmail(email) {
    const query = 'SELECT first_name, last_name, email, password, role, id FROM public."user" WHERE email = $1';
    const values = [email];
  
    try {
      const result = await db.query(query, values);
      if (result.rows.length > 0) {
        return result.rows[0]; // Return the first matching user
      }
      return null; // No user found
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

// Function to compare the input password with the stored hashed password
async function validatePassword(inputPassword, storedPassword) {
  try {
    const isMatch = await bcrypt.compare(inputPassword, storedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error validating password:', error);
    throw error; // Rethrow error to be handled in the route
  }
}

async function hashPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  }
  
  // Function to create a new user (including first name and last name)
  async function createUser(firstName, lastName, email, password, role) {
    const hashedPassword = await hashPassword(password);
    const query = 'INSERT INTO public."user" (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5)';
    const values = [firstName, lastName, email, hashedPassword, role];
  
    try {
      await db.query(query, values);
      console.log(`User created with email: ${email}`);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; // Rethrow error for handling in route
    }
  }
async function updateUserPassword(email, hashedPassword) {
  const query = 'UPDATE public."user" SET password = $1 WHERE email = $2';
  const values = [hashedPassword, email];

  try {
    await db.query(query, values);
    console.log(`Password updated for user: ${email}`);
  } catch (error) {
    console.error('Error updating user password:', error);
    throw error;
  }
}

async function sendResetPasswordEmail(toEmail, resetLink) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Resetare parolă - YourAppName",
    html: `
      <p>Bună,</p>
      <p>Ai cerut resetarea parolei. Apasă pe link-ul de mai jos pentru a-ți seta o parolă nouă:</p>
      <a href="${resetLink}">Resetează parola</a>
      <p>Dacă nu ai cerut acest lucru, ignoră acest email.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
}


module.exports = {
  getUserByEmail,
  validatePassword,
  createUser,
  updateUserPassword, 
  hashPassword,
  sendResetPasswordEmail
};

