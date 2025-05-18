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
const questions = questionsResult.rows.map((q) => ({
  ...q,
  sample_input: Array.isArray(q.sample_input) ? q.sample_input : [],
  expected_output: Array.isArray(q.expected_output) ? q.expected_output : [],
}));


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
async function createQuestion(testId, question) {
  const { type, question: task, options, correctAnswers, testCases } = question;

  const category = "coding";  // Customize this if needed

  // Extract sampleInput and expectedOutput from the testCases array
  const sampleInput = testCases.map(testCase => testCase.input);
  const expectedOutput = testCases.map(testCase => testCase.output);

  // Ensure the correctAnswers are boolean values and map them correctly
  const correctAnswersMapped = correctAnswers.map(answer => answer === true);

  console.log("Creating question with data:", {
    category,
    task,
    expectedOutput,
    sampleInput,
    options,
    correctAnswersMapped
  });

  const query = `
    INSERT INTO public.test_questions (test_id, category, task, expected_output, sample_input, options, correct_answers)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  const values = [
    testId,
    category,
    task,
    expectedOutput,  // Array of expected outputs from testCases
    sampleInput,     // Array of inputs from testCases
    options,         // Directly use options
    correctAnswersMapped // Array of boolean values (correctAnswers)
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
