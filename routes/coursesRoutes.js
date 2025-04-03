const express = require("express");
const courseQueries = require("../database/courses");
const authenticateToken = require('../functions/authTokens'); // Middleware to authenticate the token
const router = express.Router();
// Get all available courses (active or open for enrollment)
router.get("/available", async (req, res) => {
  try {
    // Fetching all courses that are active or open for enrollment (assuming you want courses that are 'active')
    const courses = await courseQueries.getAvailableCourses(); 
    console.log(courses);  // Log the courses to the console for debugging
    res.json(courses);  // Return the available courses as JSON response
  } catch (error) {
    console.error("Error fetching available courses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all courses that are NOT available (inactive or not open for enrollment)
router.get("/all", authenticateToken, async (req, res) => {
  try {
    // Assuming getNotAvailableCourses() will return courses that are inactive or not open for enrollment
    const courses = await courseQueries.getNotAvailableCourses(); 
    res.json(courses);
  } catch (error) {
    console.error("Error fetching non-available courses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all courses for the logged-in teacher (existing route)
router.get("/", authenticateToken, async (req, res) => {
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
router.get("/:courseId", authenticateToken, async (req, res) => {
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

router.post("/", authenticateToken, async (req, res) => {
  const { name, description, semester, isActive } = req.body;  // Make sure isActive is here
  const teacherId = req.user.id; // Teacher ID from the JWT token
  console.log("Received data:", { name, description, semester, isActive });  // Log the received data
  try {
    const courseId = await courseQueries.createCourse(teacherId, name, description, semester, isActive);
    res.status(201).json({ id: courseId });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Update a course
router.put("/:courseId", authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { name, description, semester, is_active } = req.body;
  try {
    const updatedCourse = await courseQueries.updateCourse(courseId, name, description, semester, is_active);
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
router.delete("/:courseId", authenticateToken, async (req, res) => {
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
