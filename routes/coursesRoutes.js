const express = require("express");
const courseQueries = require("../database/courses");
const authenticateToken = require('../functions/authTokens'); // Import the authenticateToken middleware
const router = express.Router();

// Get all courses for the logged-in teacher
router.get("/", authenticateToken, async (req, res) => {  // Use authenticateToken here
  const teacherId = req.user.id; // Teacher ID from the JWT token
  try {
    const courses = await courseQueries.getCoursesByTeacher(teacherId);
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a specific course by its ID
router.get("/:courseId", authenticateToken, async (req, res) => {  // Use authenticateToken here
  const { courseId } = req.params;
  try {
    const course = await courseQueries.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new course for the logged-in teacher
router.post("/", authenticateToken, async (req, res) => {  // Use authenticateToken here
  const { name, description } = req.body;
  const teacherId = req.user.id; // Teacher ID from the JWT token
  try {
    const courseId = await courseQueries.createCourse(teacherId, name, description);
    res.status(201).json({ id: courseId });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a course
router.put("/:courseId", authenticateToken, async (req, res) => {  // Use authenticateToken here
  const { courseId } = req.params;
  const { name, description } = req.body;
  try {
    const updatedCourse = await courseQueries.updateCourse(courseId, name, description);
    if (!updatedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json({ message: "Course updated successfully", course: updatedCourse });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a course
router.delete("/:courseId", authenticateToken, async (req, res) => {  // Use authenticateToken here
  const { courseId } = req.params;
  try {
    const deletedCourse = await courseQueries.deleteCourse(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
