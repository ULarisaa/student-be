const db = require("../config/db");

async function getTestsByCourse(courseId) {
  const query = 'SELECT * FROM public.tests WHERE course_id = $1';
  const values = [courseId];

  try {
    const result = await db.query(query, values);
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
    const testResult = await db.query(testQuery, testValues);
    const test = testResult.rows[0];

    if (!test) {
      throw new Error('Test not found');
    }

    // Fetch questions related to the test
    const questionsQuery = 'SELECT * FROM public.test_questions WHERE test_id = $1';
const questionsResult = await db.query(questionsQuery, [testId]);
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

async function createTest(courseId, name, startTime, endTime, duration, allowSwitch, startGrade) {
  const query = `
    INSERT INTO public.tests (course_id, name, start_time, end_time, duration, allow_switch, start_grade)
    VALUES ($1, $2, $3, $4, $5::interval, $6, $7)
    RETURNING id
  `;

  // Transformă durata din număr în interval string
  const durationInterval = `${duration} minutes`;

  const values = [courseId, name, startTime, endTime, durationInterval, allowSwitch, startGrade];

  try {
    const result = await db.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating test:", error);
    throw error;
  }
}

async function createQuestion(testId, question) {
  const {
    type,
    question: task,
    options = [],
    correctAnswers = [],
    testCases = [],
    timeLimit = null,
    points = null
  } = question;

  const sampleInput = type === "coding" ? testCases.map(tc => tc.input) : null;
  const expectedOutput = type === "coding" ? testCases.map(tc => tc.output) : null;

  // Dacă e multiple_choice sau true_false, corectAnswers trebuie să fie array de booleani
  const correctAnswersMapped =
    (type === "multiple_choice" || type === "true_false")
      ? correctAnswers.map(a => !!a) // forțează boolean
      : correctAnswers;

  const query = `
    INSERT INTO public.test_questions (
      test_id, category, task,
      expected_output, sample_input,
      options, correct_answers,
      time_limit, points
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;

  const values = [
    testId,
    type,
    task,
    expectedOutput,
    sampleInput,
    options,
    correctAnswersMapped,
    timeLimit,
    points
  ];

  try {
    await db.query(query, values);
    console.log("Question created successfully.");
  } catch (error) {
    console.error("Error creating question:", error);
    throw error;
  }
}

async function getQuestionById(questionId) {
  const query = 'SELECT * FROM public.test_questions WHERE id = $1';
  const values = [questionId];

  try {
    const result = await db.query(query, values);
    if (result.rows.length === 0) return null;

    const question = result.rows[0];
    
    // sample_input și expected_output sunt deja array-uri (probabil stocate ca array în PostgreSQL)
    question.sample_input = Array.isArray(question.sample_input) ? question.sample_input : [];
    question.expected_output = Array.isArray(question.expected_output) ? question.expected_output : [];

    return question;
  } catch (error) {
    console.error("Error fetching question by ID:", error);
    throw error;
  }
}
async function getQuestionDetails(questionId) {
  const result = await db.query(
    'SELECT category, correct_answers FROM test_questions WHERE id = $1',
    [questionId]
  );

  return result.rows[0] || null;
}
async function getQuestionsByTestId(testId) {
  const query = 'SELECT * FROM public.test_questions WHERE test_id = $1';
  const values = [testId];

  try {
    const result = await db.query(query, values);
    return result.rows.map(q => ({
      ...q,
      sample_input: Array.isArray(q.sample_input) ? q.sample_input : [],
      expected_output: Array.isArray(q.expected_output) ? q.expected_output : [],
      // Adaugă și parsarea corect_answers dacă e string JSON, dacă vrei
    }));
  } catch (error) {
    console.error("Error fetching questions by testId:", error);
    throw error;
  }
}

async function getSubmissionByTestAndUser(testId, userId) {
  const res = await db.query(
    'SELECT * FROM test_submissions WHERE test_id = $1 AND user_id = $2',
    [testId, userId]
  );
  return res.rows[0] || null; // first row or null if none found
}

async function getAnswersBySubmissionId(submissionId) {
  const res = await db.query(
    'SELECT * FROM test_submissions_answers WHERE test_submission_id = $1',
    [submissionId]
  );
  return res.rows;  // pg returnează datele în rows
}

async function updateExpectedGradeForAnswer(answerId, expectedGrade) {
  const query = `
    UPDATE test_submissions_answers
    SET expected_grade = $1
    WHERE id = $2
  `;
  await db.query(query, [expectedGrade, answerId]);
}


module.exports = {
  getTestsByCourse,
  getTestById,
  createTest,
  createQuestion,
  getQuestionById, 
  getQuestionDetails, 
  getQuestionsByTestId, 
  getSubmissionByTestAndUser,
  getAnswersBySubmissionId,
  updateExpectedGradeForAnswer
};
