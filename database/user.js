const db = require('./../config/db'); 
const bcrypt = require('bcrypt');
async function getUserByEmail(email) {
  const query = `
    SELECT first_name, last_name, email, password, role, id, first_login
    FROM public."user"
    WHERE email = $1
  `;
  const values = [email];

  try {
    const result = await db.query(query, values);
    if (result.rows.length > 0) {
      return result.rows[0]; 
    }
    return null; 
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}


async function validatePassword(inputPassword, storedPassword) {
  try {
    const isMatch = await bcrypt.compare(inputPassword, storedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error validating password:', error);
    throw error; 
  }
}

async function hashPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  }
  

  async function createUser(firstName, lastName, email, password, role) {
    const hashedPassword = await hashPassword(password);
    const query = 'INSERT INTO public."user" (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5)';
    const values = [firstName, lastName, email, hashedPassword, role];
  
    try {
      await db.query(query, values);
      console.log(`User created with email: ${email}`);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; 
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



async function updateFirstLoginFlag(email, flag) {
  await db.query(
    'UPDATE public."user" SET first_login = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
    [flag, email]
  );
}


module.exports = {
  getUserByEmail,
  validatePassword,
  createUser,
  updateUserPassword, 
  hashPassword,
  sendResetPasswordEmail, 
  updateFirstLoginFlag
};

