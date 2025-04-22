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

// Function to get a test by ID along with its questions
async function getTestById(testId) {
  const testQuery = 'SELECT * FROM public.tests WHERE id = $1';
  const testValues = [testId];

  try {
    const testResult = await pool.query(testQuery, testValues);
    const test = testResult.rows[0];

    if (!test) {
      throw new Error('Test not found');
    }

    // Fetch questions related to the test
    const questionsQuery = 'SELECT * FROM public.test_questions WHERE test_id = $1';
    const questionsResult = await pool.query(questionsQuery, [testId]);
    const questions = questionsResult.rows;

    return { test, questions };
  } catch (error) {
    console.error("Error fetching test and questions:", error);
    throw error;
  }
}


// This function creates the test (without questions)
async function createTest(courseId, name, startTime, duration) {
  const query = 'INSERT INTO public.tests (course_id, name, start_time, duration) VALUES ($1, $2, $3, $4) RETURNING id';
  const values = [courseId, name, startTime, duration];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating test:", error);
    throw error;
  }
}
// Example of how to create the question with 'category' and 'task'
async function createQuestion(testId, question) {
  const { type, question: task, expectedOutput, options, correctAnswers } = question;

  // Manually define category or fetch from somewhere
  const category = "coding";  // You could set a default or derive this dynamically

  // Log to verify data
  console.log("Creating question with data:", { category, task, expectedOutput, options, correctAnswers });

  const query = `
    INSERT INTO public.test_questions (test_id, category, task, expected_output, options, correct_answers)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  const values = [
    testId,
    category,
    task,
    expectedOutput,
    options,
    correctAnswers
  ];

  try {
    await pool.query(query, values);
    console.log("Question created successfully.");
  } catch (error) {
    console.error("Error creating question:", error);
    throw error;
  }
}



module.exports = {
  getTestsByCourse,
  getTestById,
  createTest,
   createQuestion
};
