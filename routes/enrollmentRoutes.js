const express = require("express");
const enrollmentQueries = require("../database/enrollment");
const authenticateToken = require('../functions/authTokens'); // Middleware to authenticate the token
const router = express.Router();

// Student enrolls in a course
router.post("/", authenticateToken, async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user.id; // Get the student ID from the JWT token
  
  try {
    // Check if the student is already enrolled in the course
    const existingEnrollment = await enrollmentQueries.getEnrollment(studentId, courseId);
    if (existingEnrollment) {
      return res.status(400).json({ error: "Already enrolled in this course" });
    }

    // Enroll the student with status 'pending'
    const enrollmentId = await enrollmentQueries.createEnrollment(studentId, courseId);
    res.status(201).json({ id: enrollmentId, status: 'pending' });
  } catch (error) {
    console.error("Error enrolling in course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Teacher approves or denies enrollment
router.put("/:enrollmentId", authenticateToken, async (req, res) => {
  const { enrollmentId } = req.params;
  const { status } = req.body; // 'approved' or 'denied'
  const teacherId = req.user.id; // Get the teacher ID from the JWT token
  
  try {
    // Check if the teacher is authorized to approve/deny this course
    const enrollment = await enrollmentQueries.getEnrollmentById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    const course = await enrollmentQueries.getCourseById(enrollment.course_id);
    if (course.teacher_id !== teacherId) {
      return res.status(403).json({ error: "You are not the teacher of this course" });
    }

    // Update the enrollment status to 'approved' or 'denied'
    const updatedEnrollment = await enrollmentQueries.updateEnrollmentStatus(enrollmentId, status);
    res.json(updatedEnrollment);
  } catch (error) {
    console.error("Error updating enrollment status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all pending enrollments (for the teacher to view)
router.get("/pending", authenticateToken, async (req, res) => {
  const teacherId = req.user.id; // Get the teacher ID from the JWT token
  
  try {
    const pendingEnrollments = await enrollmentQueries.getPendingEnrollments(teacherId);
    res.json(pendingEnrollments);
  } catch (error) {
    console.error("Error fetching pending enrollments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
