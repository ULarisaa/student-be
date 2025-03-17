// database/queries/tests.js
const pool = require("../config/db");

async function getTestsByCourse(courseId) {
  const query = 'SELECT * FROM public.tests WHERE course_id = $1';
  const values = [courseId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Error fetching tests:", error);
    throw error;
  }
}

async function getTestById(testId) {
  const query = 'SELECT * FROM public.tests WHERE id = $1';
  const values = [testId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error fetching test:", error);
    throw error;
  }
}

async function createTest(courseId, name, startTime, duration, category) {
  const query = 'INSERT INTO public.tests (course_id, name, start_time, duration, category) VALUES ($1, $2, $3, $4, $5) RETURNING id';
  const values = [courseId, name, startTime, duration, category];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating test:", error);
    throw error;
  }
}

module.exports = {
  getTestsByCourse,
  getTestById,
  createTest
};
