const express = require("express");
const router = express.Router();
const testSubmissionsQueries = require("../database/testSubmissions");
const authenticateToken = require('../functions/authTokens');


router.post("/", authenticateToken, async (req, res) => {
  const { test_id, user_id, status } = req.body;

  try {
    const submission = await testSubmissionsQueries.createSubmission({ test_id, user_id, status });
    res.status(201).json(submission);
  } catch (error) {
    console.error("Error creating submission:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/", authenticateToken, async (req, res) => {
  try {
    const submissions = await testSubmissionsQueries.getAllSubmissions();
    res.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/:submissionId/answers", authenticateToken, async (req, res) => {
  const { submissionId } = req.params;

  try {
    const answers = await testSubmissionsQueries.getAnswersBySubmissionId(submissionId);
    res.json(answers);
  } catch (error) {
    console.error("Error fetching answers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/:submissionId/answers", authenticateToken, async (req, res) => {
  const { submissionId } = req.params;
  const { question_id, answer, answer_time, typing_speed } = req.body;

  try {
    const savedAnswer = await testSubmissionsQueries.insertAnswer({
      submissionId,
      question_id,
      answer,
      answer_time,
      typing_speed
    });

    res.status(201).json(savedAnswer);
  } catch (error) {
    console.error("Error saving answer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/:submissionId/answers/bulk", authenticateToken, async (req, res) => {
  const { submissionId } = req.params;
  const answers = req.body.answers;

  try {
    const savedAnswers = await testSubmissionsQueries.insertMultipleAnswers(submissionId, answers);
    res.status(201).json(savedAnswers);
  } catch (error) {
    console.error("Error saving bulk answers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/:testId/submit", authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const userId = req.user.id;

  const {
    responses,
    submission_time,
    copy_paste_attempts,
    exit_fullscreen_count,
    mouse_leave_count,
  } = req.body;

  try {
    const submission = await testSubmissionsQueries.createSubmission({
      test_id: testId,
      user_id: userId,
      status: "submitted",
      submission_time,
      copy_paste_attempts,
      exit_fullscreen_count,
      mouse_leave_count,
    });

    const responsesArray = Array.isArray(responses) ? responses : Object.values(responses);

    const formattedAnswers = responsesArray.map(r => ({
      question_id: r.question_id,
      answer: r.answer,
      answer_time: r.answer_time,
      typing_speed: r.typing_speed,
      idle_time: r.idle_time,
      tests_passed: r.tests_passed ?? null,
      tests_total: r.tests_total ?? null,
      test_results: r.test_results ? JSON.stringify(r.test_results) : null,
    }));

    await testSubmissionsQueries.insertMultipleAnswers(submission.id, formattedAnswers);

    res.status(200).json({ message: "Test submitted successfully." });
  } catch (error) {
    console.error("Error submitting test:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/submission", authenticateToken, async (req, res) => {
  let { test_id, user_id } = req.query;


  test_id = parseInt(test_id);
  user_id = parseInt(user_id);

  if (isNaN(test_id) || isNaN(user_id)) {
    return res.status(400).json({ error: "Invalid or missing test_id or user_id in query parameters." });
  }

  try {
    const submission = await testSubmissionsQueries.getSubmissionByTestAndUser(test_id, user_id);

    if (!submission) {
      return res.status(404).json({ error: "Submission not found." });
    }

    res.json(submission);
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:submissionId/answers", authenticateToken, async (req, res) => {
  const { submissionId } = req.params;

  try {
    const answers = await testSubmissionsQueries.getAnswersBySubmissionId(submissionId);

    res.json(answers);
  } catch (error) {
    console.error("Error fetching answers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/submission/save-grade", authenticateToken, async (req, res) => {
  const { submissionId, grade, questionGrades } = req.body;

  try {

    await testSubmissionsQueries.saveSubmissionGrade(submissionId, grade);


    for (const [questionId, questionGrade] of Object.entries(questionGrades)) {
      await testSubmissionsQueries.saveQuestionGrade(submissionId, questionId, questionGrade);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Eroare la salvarea notei:", err);
    res.status(500).json({ error: "Eroare internă la salvare" });
  }
});

router.post("/:testSubmissionId/save-snapshot", authenticateToken, async (req, res) => {
  const userId = req.user.id; 
  const { questionId, code } = req.body;

  if (!userId || !questionId || !code) {
    return res.status(400).json({ error: "Lipsite date obligatorii" });
  }

  try {
    await testSubmissionsQueries.saveCodeSnapshot(userId, questionId, code);
    res.json({ success: true });
  } catch (err) {
    console.error("Eroare la salvarea snapshot-ului:", err);
    res.status(500).json({ error: "Eroare internă la salvare" });
  }
});



router.get('/:testId/snapshots', authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const { questionId, studentId } = req.query;

  if (!questionId || !studentId) {
    return res.status(400).json({ error: "questionId and studentId are required" });
  }

  try {
    const snapshots = await testSubmissionsQueries.getSnapshots(testId, questionId, studentId);
    res.json(snapshots);
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete('/:testId/delete-all-snapshots', authenticateToken, async (req, res) => {
  try {
    await testSubmissionsQueries.deleteAllSnapshotsForTest(req.params.testId);
    res.status(200).json({ message: 'All snapshots deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete snapshots.' });
  }
});




module.exports = router;
