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
  
  // Validate status value
  if (!['approved', 'denied'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

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

// Get all pending enrollments (for the teacher to view), either all or for a specific course
router.get("/pending", authenticateToken, async (req, res) => {
  const teacherId = req.user.id; // Get the teacher ID from the JWT token
  const courseId = req.query.courseId; // Get the courseId from query parameters, if provided
  
  try {
    let pendingEnrollments;
    if (courseId) {
      // Fetch pending enrollments for a specific course
      pendingEnrollments = await enrollmentQueries.getPendingEnrollmentsByCourse(teacherId, courseId);
    } else {
      // Fetch all pending enrollments for the teacher's courses
      pendingEnrollments = await enrollmentQueries.getPendingEnrollments(teacherId);
    }

    res.json(pendingEnrollments);
  } catch (error) {
    console.error("Error fetching pending enrollments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all approved enrollments for a student
router.get("/approved", authenticateToken, async (req, res) => {
  const studentId = req.user.id; // Get the student ID from the JWT token
  
  try {
    // Fetch all approved enrollments for the student
    const approvedEnrollments = await enrollmentQueries.getApprovedEnrollmentsForStudent(studentId);

    if (approvedEnrollments.length === 0) {
      return res.status(404).json({ error: "No approved enrollments found for this student" });
    }

    res.json(approvedEnrollments);
  } catch (error) {
    console.error("Error fetching approved enrollments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all enrollments (any status) for the logged-in student, including status
router.get("/status", authenticateToken, async (req, res) => {
  const studentId = req.user.id;

  try {
    const enrollments = await enrollmentQueries.getCoursesWithStatus(studentId);

    if (enrollments.length === 0) {
      return res.status(404).json({ message: "No enrollment requests found" });
    }

    res.json(enrollments);
  } catch (error) {
    console.error("Error fetching enrollments with status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;
