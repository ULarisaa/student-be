// database/queries/courses.js
const pool = require("../config/db");

async function getCoursesByTeacher(teacherId) {
  const query = 'SELECT id, name, description FROM public.courses WHERE teacher_id = $1';
  const values = [teacherId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
}

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

async function createCourse(teacherId, name, description) {
  const query = 'INSERT INTO public.courses (teacher_id, name, description) VALUES ($1, $2, $3) RETURNING id';
  const values = [teacherId, name, description];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
}

module.exports = {
  getCoursesByTeacher,
  getCourseById,
  createCourse
};
