const express = require("express");
const testQueries = require("../database/tests");
const router = express.Router();
const { runJavaCode } = require("../functions/java");
const {arraysEqual}= require("../functions/arraysEqual");
const authenticateToken = require('../functions/authTokens');


// Get all tests by course
router.get("/:courseId/tests", authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  try {
    const tests = await testQueries.getTestsByCourse(courseId);
    res.json(tests);
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a specific test by its ID
router.get("/:testId", authenticateToken, async (req, res) => {
  const { testId } = req.params;
  try {
    const test = await testQueries.getTestById(testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }
    res.json(test);
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new test for a course
router.post("/:courseId/create", authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { name, startTime, endTime, duration, questions, allowSwitch, start_grade } = req.body;

  if (!name || !startTime || !endTime || duration == null || !questions || questions.length === 0) {
    return res.status(400).json({
      error: "Please provide all required fields including at least one question."
    });
  }

  try {
    const testId = await testQueries.createTest(courseId, name, startTime, endTime, duration, allowSwitch, start_grade);
    await Promise.all(
      questions.map((question) => testQueries.createQuestion(testId, question))
    );

    res.status(201).json({ id: testId, message: "Test created successfully" });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit code for a specific question in a test
router.post("/:testId/question/:questionId/submitq", authenticateToken, async (req, res) => {
  const { testId, questionId } = req.params;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const question = await testQueries.getQuestionById(questionId);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    if (question.test_id !== Number(testId)) {
      return res.status(400).json({ error: "Question does not belong to the specified test" });
    }

    const inputs = question.sample_input;
    const expectedOutputs = question.expected_output;

    if (inputs.length === 0 || expectedOutputs.length === 0) {
      return res.status(400).json({ error: "No test cases found for this question" });
    }

    const results = [];
    let allPassed = true;

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const expected = expectedOutputs[i];

      const result = await runJavaCode(code, input);

      if (result.error) {
        allPassed = false;
        results.push({ input, expected, output: result.error, passed: false });
      } else {
        const outputTrimmed = result.output.trim();
        const expectedTrimmed = expected.trim();

        const passed = outputTrimmed === expectedTrimmed;
        if (!passed) allPassed = false;

        results.push({ input, expected, output: result.output, passed });
      }
    }

    return res.json({
      success: true,
      passed: allPassed,
      tests_passed: results.filter(r => r.passed).length,
      tests_total: results.length,
      results,
    });

  } catch (error) {
    console.error("Error submitting code:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Submit final test answers
router.post("/:testId/submit", authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const { responses } = req.body;

  if (!responses) {
    return res.status(400).json({ error: "Responses are required" });
  }

  try {
    // TODO: Save student responses in DB
    res.status(200).json({ message: "Test submitted successfully" });
  } catch (error) {
    console.error("Error submitting test:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get('/:testId/evaluate', authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const userId = req.user.id;

  try {
    const { test } = await testQueries.getTestById(testId);
    if (!test) return res.status(404).json({ error: "Test not found" });

    const submission = await testQueries.getSubmissionByTestAndUser(testId, userId);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    const answers = await testQueries.getAnswersBySubmissionId(submission.id);
    const questions = await testQueries.getQuestionsByTestId(testId);

    let totalScore = Number(test.start_grade) || 0;

    let maxScore = 0;

    for (const question of questions) {
      const studentAnswer = answers.find(ans => Number(ans.question_id) === Number(question.id));
      const { category, correct_answers, points } = question;
      const pts = points || 1;

      maxScore += pts;

      if (!studentAnswer) {
        // Nu are răspuns, nota 0
        continue;
      }

      let expectedGradeForQuestion = 0;

      if (category === "multiple_choice") {
        try {
          if (!correct_answers || (typeof correct_answers === "string" && correct_answers.trim() === "")) {
            // nu putem evalua corect, nota 0
            expectedGradeForQuestion = 0;
          } else if (!studentAnswer.answer || (typeof studentAnswer.answer === "string" && studentAnswer.answer.trim() === "")) {
            expectedGradeForQuestion = 0;
          } else {
            const parsedCorrect = typeof correct_answers === "string" ? JSON.parse(correct_answers) : correct_answers;
            const parsedStudent = typeof studentAnswer.answer === "string" ? JSON.parse(studentAnswer.answer) : studentAnswer.answer;

            if (!Array.isArray(parsedCorrect) || !Array.isArray(parsedStudent)) {
              expectedGradeForQuestion = 0;
            } else if (parsedCorrect.length !== parsedStudent.length) {
              expectedGradeForQuestion = 0;
            } else {
              let hasWrong = false;
              let correctTrue = 0;
              let totalTrue = parsedCorrect.filter(x => x === true).length;

              for (let i = 0; i < parsedCorrect.length; i++) {
                if (parsedStudent[i] === true && parsedCorrect[i] === false) {
                  hasWrong = true;
                  break;
                }
                if (parsedStudent[i] === true && parsedCorrect[i] === true) {
                  correctTrue++;
                }
              }

              expectedGradeForQuestion = hasWrong ? 0 : pts * (correctTrue / totalTrue);
            }
          }
        } catch (err) {
          console.warn("Failed to parse multiple_choice answer", err);
          expectedGradeForQuestion = 0;
        }
      } 
      else if (category === "java" || category === "java_code" || category === "coding") {
        const passed = studentAnswer.tests_passed || 0;
        const total = studentAnswer.tests_total || 0;
        if (total > 0) {
          expectedGradeForQuestion = pts * (passed / total);
        } else {
          expectedGradeForQuestion = 0;
        }
      }
      else if (category === "free_answer") {
        // Free answer: nu se calculează automat, punctaj 0
        expectedGradeForQuestion = 0;
      }
      else {
        // Alte categorii necunoscute: punctaj 0
        expectedGradeForQuestion = 0;
      }

      totalScore += expectedGradeForQuestion;

      await testQueries.updateExpectedGradeForAnswer(studentAnswer.id, expectedGradeForQuestion);
    }

    const questionCategories = new Set(questions.map(q => q.category));

    res.json({ 
      expectedGrade: totalScore.toFixed(2),
      questionCategories: Array.from(questionCategories) 
    });

  } catch (error) {
    console.error("Evaluation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get only questions for a specific test by testId
router.get("/:testId/questions", authenticateToken, async (req, res) => {
  const { testId } = req.params;

  try {
    const questionsResult = await testQueries.getQuestionsByTestId(testId);

    if (!questionsResult) {
      return res.status(404).json({ error: "Questions not found" });
    }

    res.json(questionsResult);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;
