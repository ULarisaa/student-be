const express = require("express");
const testQueries = require("../database/tests");
const router = express.Router();

// Get all tests by course
router.get("/:courseId/tests", async (req, res) => {
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
router.get("/test/:testId", async (req, res) => {
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

// Create a new test for a specific course
router.post("/:courseId/tests", async (req, res) => {
  const { courseId } = req.params;
  const { name, startTime, duration, category, questions } = req.body; // Assuming you are adding questions to the test

  // Validate input data
  if (!name || !startTime || !duration || !category || !questions || questions.length === 0) {
    return res.status(400).json({ error: "Please provide all required fields including at least one question." });
  }

  try {
    const testId = await testQueries.createTest(courseId, name, startTime, duration, category, questions);
    res.status(201).json({ id: testId, message: "Test created successfully" });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update an existing test (e.g., updating the status or details of a test)
router.put("/:testId", async (req, res) => {
  const { testId } = req.params;
  const { name, startTime, duration, category, questions } = req.body; 

  try {
    const updatedTest = await testQueries.updateTest(testId, name, startTime, duration, category, questions);
    if (!updatedTest) {
      return res.status(404).json({ error: "Test not found" });
    }
    res.json({ message: "Test updated successfully", test: updatedTest });
  } catch (error) {
    console.error("Error updating test:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
