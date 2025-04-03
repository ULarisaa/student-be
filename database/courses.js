const pool = require("../config/db");

// Get courses by teacher
async function getCoursesByTeacher(teacherId) {
  const query = 'SELECT id, name, description, semester, is_active FROM public.courses WHERE teacher_id = $1';
  const values = [teacherId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
}

// Get a specific course by its ID
async function getCourseById(courseId) {
  const query = 'SELECT * FROM public.courses WHERE id = $1';
  const values = [courseId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error fetching course:", error);
    throw error;
  }
}

async function createCourse(teacherId, name, description, semester, isActive) {
  const query = `
    INSERT INTO public.courses (teacher_id, name, description, semester, is_active)
    VALUES ($1, $2, $3, $4, $5) RETURNING id
  `;
  const values = [teacherId, name, description, semester, isActive];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
}


// Update an existing course
async function updateCourse(courseId, name, description, semester, isActive) {
  const query = `
    UPDATE public.courses
    SET name = $1, description = $2, semester = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, name, description, semester, is_active, created_at, updated_at
  `;
  const values = [name, description, semester, isActive, courseId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Returns the updated course
  } catch (error) {
    console.error("Error updating course:", error);
    throw error;
  }
}

// Delete a course
async function deleteCourse(courseId) {
  const query = 'DELETE FROM public.courses WHERE id = $1 RETURNING id';
  const values = [courseId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Returns the deleted course info
  } catch (error) {
    console.error("Error deleting course:", error);
    throw error;
  }
}

// Fetch all available courses (active or open for enrollment)
async function getAvailableCourses() {
  const query = 'SELECT id, name, description, semester, is_active FROM public.courses WHERE is_active = true';  // Example for active courses
  try {
    const result = await pool.query(query);
    console.log(result);
    return result.rows;  // Return the available courses
  } catch (error) {
    console.error("Error fetching available courses:", error);
    throw error;
  }
}

// Get all non-available courses (inactive)
async function getNotAvailableCourses() {
  const query = 'SELECT id, name, description, semester, is_active FROM public.courses WHERE is_active = false';
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching non-available courses:", error);
    throw error;
  }
}

module.exports = {
  getCoursesByTeacher,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getAvailableCourses,     // Added this function
  getNotAvailableCourses,  // Added this function
};
