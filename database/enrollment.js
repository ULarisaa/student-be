const pool = require("../config/db");

// Check if a student is already enrolled in a specific course
async function getEnrollment(studentId, courseId) {
  const query = 'SELECT * FROM public.enrollments WHERE student_id = $1 AND course_id = $2';
  const values = [studentId, courseId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the enrollment if it exists
  } catch (error) {
    console.error("Error checking enrollment:", error);
    throw error;
  }
}

// Create a new enrollment record (status is 'pending' by default)
async function createEnrollment(studentId, courseId) {
  const query = `
    INSERT INTO public.enrollments (student_id, course_id, status)
    VALUES ($1, $2, 'pending') RETURNING id
  `;
  const values = [studentId, courseId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating enrollment:", error);
    throw error;
  }
}

// Get enrollment by ID (useful for teacher to approve/deny)
async function getEnrollmentById(enrollmentId) {
  const query = 'SELECT * FROM public.enrollments WHERE id = $1';
  const values = [enrollmentId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the enrollment if it exists
  } catch (error) {
    console.error("Error fetching enrollment by ID:", error);
    throw error;
  }
}

// Update the status of the enrollment (e.g., 'approved' or 'denied')
async function updateEnrollmentStatus(enrollmentId, status) {
  const query = `
    UPDATE public.enrollments
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 RETURNING id, status
  `;
  const values = [status, enrollmentId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated enrollment
  } catch (error) {
    console.error("Error updating enrollment status:", error);
    throw error;
  }
}

// Get all pending enrollments for a specific teacher
async function getPendingEnrollments(teacherId) {
  const query = `
    SELECT e.id, e.student_id, e.course_id, e.status, c.name AS course_name
    FROM public.enrollments e
    JOIN public.courses c ON e.course_id = c.id
    WHERE c.teacher_id = $1 AND e.status = 'pending'
  `;
  const values = [teacherId];

  try {
    const result = await pool.query(query, values);
    return result.rows; // Return all pending enrollments for the teacher
  } catch (error) {
    console.error("Error fetching pending enrollments:", error);
    throw error;
  }
}

// Get course details by course ID
async function getCourseById(courseId) {
  const query = 'SELECT * FROM public.courses WHERE id = $1';
  const values = [courseId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the course details
  } catch (error) {
    console.error("Error fetching course:", error);
    throw error;
  }
}

module.exports = {
  getEnrollment,
  createEnrollment,
  getEnrollmentById,
  updateEnrollmentStatus,
  getPendingEnrollments,
  getCourseById,
};
