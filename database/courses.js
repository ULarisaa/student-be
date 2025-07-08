const db = require("../config/db");

// Get courses by teacher
async function getCoursesByTeacher(teacherId) {
  const query = `
    SELECT 
      c.id, 
      c.name, 
      c.description, 
      c.semester, 
      c.is_active,
      COUNT(CASE WHEN e.status = 'approved' THEN 1 END) AS enrolled_count,
      COUNT(CASE WHEN e.status = 'pending' THEN 1 END) AS pending_count
    FROM public.courses c
    LEFT JOIN public.enrollments e ON c.id = e.course_id
    WHERE c.teacher_id = $1
    GROUP BY c.id
    ORDER BY c.id;
  `;
  const values = [teacherId];

  try {
    const result = await db.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Error fetching courses with student counts:", error);
    throw error;
  }
}

// Get a specific course by its ID
async function getCourseById(courseId) {
  const query = `
    SELECT 
      c.id,
      c.name,
      c.description,
      c.semester,
      c.is_active,
      u.first_name || ' ' || u.last_name AS teacher_name,
      u.email AS teacher_email  -- Added the teacher's email
    FROM public.courses c
    JOIN public."user" u ON c.teacher_id = u.id
    WHERE c.id = $1
  `;
  const values = [courseId];

  try {
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error("Course not found");
    }
    return result.rows[0]; // Return course with teacher's name and email
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
    const result = await db.query(query, values);
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
    const result = await db.query(query, values);
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
    const result = await db.query(query, values);
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
    const result = await db.query(query);
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
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching non-available courses:", error);
    throw error;
  }
}

async function getApprovedEnrolledStudentsWithSubmissions(courseId) {
  const query = `
    SELECT 
      u.id AS student_id,
      u.first_name,
      u.last_name,
      u.email,
      e.enrollment_date,
      s.id AS submission_id,
      s.assignment_id,
      s.submitted_at,
      s.text_answer,
      s.grade,
      s.status AS submission_status,
      s.last_modified
    FROM enrollments e
    JOIN "user" u ON e.student_id = u.id
    LEFT JOIN assignment_submissions s ON s.user_id = u.id
    WHERE e.course_id = $1
      AND e.status = 'approved'
      AND LOWER(u.role) = 'student'
    ORDER BY u.last_name, u.first_name, s.submitted_at;
  `;

  const { rows } = await db.query(query, [courseId]);

  const studentMap = new Map();

  for (const row of rows) {
    const studentId = row.student_id;

    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        id: studentId,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        enrollmentDate: row.enrollment_date,
        submissions: [],
      });
    }

    if (row.submission_id) {
      studentMap.get(studentId).submissions.push({
        id: row.submission_id,
        assignmentId: row.assignment_id,
        submittedAt: row.submitted_at,
        textAnswer: row.text_answer,
        grade: row.grade,
        status: row.submission_status,
        lastModified: row.last_modified,
      });
    }
  }

  return Array.from(studentMap.values());
}
async function getApprovedEnrolledStudentsWithTestSubmissions(courseId) {
  const query = `
    SELECT
      u.id AS student_id,
      u.first_name,
      u.last_name,
      u.email,
      e.enrollment_date,
      t.id AS test_id,
      t.name AS test_name,
      t.start_time,
      t.duration,
      t.end_time,
      ts.id AS test_submission_id,
      ts.status AS submission_status,
      ts.grade,
      ts.submission_time,
      tq.id AS question_id,
      tq.task AS question_text
    FROM enrollments e
    JOIN "user" u ON e.student_id = u.id
    LEFT JOIN test_submissions ts ON ts.user_id = u.id
    LEFT JOIN tests t ON t.id = ts.test_id AND t.course_id = $1
    LEFT JOIN test_questions tq ON tq.test_id = t.id
    WHERE e.course_id = $1
      AND e.status = 'approved'
      AND LOWER(u.role) = 'student'
    ORDER BY u.last_name, u.first_name, t.start_time, tq.id;
  `;

  const { rows } = await db.query(query, [courseId]);

  const snapshotQuery = `
    SELECT cs.user_id, cs.question_id
    FROM coding_snapshots cs
    JOIN test_questions tq ON tq.id = cs.question_id
    JOIN tests t ON t.id = tq.test_id
    WHERE t.course_id = $1
  `;
  const { rows: snapshotRows } = await db.query(snapshotQuery, [courseId]);

  const snapshotsMap = new Map();
  snapshotRows.forEach(({ user_id, question_id }) => {
    snapshotsMap.set(`${user_id}-${question_id}`, true);
  });

  const studentMap = new Map();

  for (const row of rows) {
    const studentId = row.student_id;

    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        id: studentId,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        enrollmentDate: row.enrollment_date,
        testStatuses: [],
      });
    }

    if (row.test_id) {
      let testObj = studentMap.get(studentId).testStatuses.find(t => t.testId === row.test_id);

      if (!testObj) {
        testObj = {
          testId: row.test_id,
          testName: row.test_name,
          startTime: row.start_time,
          duration: row.duration,
          endTime: row.end_time,
          submission: row.test_submission_id
            ? {
                id: row.test_submission_id,
                status: row.submission_status,
                grade: row.grade,
                submittedAt: row.submission_time,
              }
            : null,
          questions: [],
          hasAnySnapshots: false, // nou
        };
        studentMap.get(studentId).testStatuses.push(testObj);
      }

      if (row.question_id) {
        const hasSnapshot = snapshotsMap.has(`${studentId}-${row.question_id}`);
        testObj.questions.push({
          questionId: row.question_id,
          questionText: row.question_text,
          hasSnapshot,
        });

        if (hasSnapshot) {
          testObj.hasAnySnapshots = true; // dacă e măcar un snapshot, punem true
        }
      }
    }
  }

  return Array.from(studentMap.values());
}



async function getUserSubmissionsStatus(courseId, userId) {
  const assignmentStatusQuery = `
    SELECT 
      a.id, a.title,
      COALESCE(s.status, 'not_submitted') AS status,
      s.grade
    FROM assignments a
    LEFT JOIN assignment_submissions s
      ON s.assignment_id = a.id AND s.user_id = $2
    WHERE a.course_id = $1;
  `;

  const testStatusQuery = `
    SELECT 
      t.id, t.name,
      COALESCE(s.status, 'not_submitted') AS status,
      s.grade
    FROM tests t
    LEFT JOIN test_submissions s
      ON s.test_id = t.id AND s.user_id = $2
    WHERE t.course_id = $1;
  `;

  const assignments = await db.query(assignmentStatusQuery, [courseId, userId]);
  const tests = await db.query(testStatusQuery, [courseId, userId]);

  return {
    assignments: assignments.rows,
    tests: tests.rows,
  };
}


async function createMaterial(courseId, title, filename, filesize, fileData, uploadedBy, mimeType) {
  const result = await db.query(
    `INSERT INTO course_materials 
      (course_id, title, filename, filesize, file_data, uploaded_by, mime_type) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [courseId, title, filename, filesize, fileData, uploadedBy, mimeType]
  );
  return result.rows[0].id;
}



async function getMaterialsByCourse(courseId) {
  const result = await db.query(
    `SELECT id, course_id, title, filename, filesize, uploaded_at, uploaded_by
     FROM course_materials
     WHERE course_id = $1
     ORDER BY uploaded_at DESC`,
    [courseId]
  );
  return result.rows;
}

async function deleteMaterial(materialId) {
  const result = await db.query(
    `DELETE FROM course_materials WHERE id = $1 RETURNING id`,
    [materialId]
  );
  return result.rowCount > 0;
}
async function getMaterialById(materialId) {
  const result = await db.query(
    `SELECT id, course_id, title, filename as file_name, filesize, file_data, uploaded_by, mime_type 
     FROM course_materials WHERE id = $1`,
    [materialId]
  );
  return result.rows[0];
}

async function createPost(course_id, user_id, title, content, allow_comments = true) {
  const result = await db.query(
    `INSERT INTO course_posts (course_id, user_id, title, content, allow_comments) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [course_id, user_id, title, content, allow_comments]
  );
  return result.rows[0];
}

async function getPostsByCourse(courseId) {
  const result = await db.query(
    `SELECT 
        cp.*, 
        u.first_name, 
        u.last_name
     FROM course_posts cp
     JOIN "user" u ON u.id = cp.user_id
     WHERE cp.course_id = $1
     ORDER BY cp.created_at DESC`,
    [courseId]
  );

  return result.rows.map(row => ({
    ...row,
    author_name: `${row.first_name} ${row.last_name}`,
  }));
}


async function getPostById(postId) {
  const result = await db.query(
    `SELECT * FROM course_posts WHERE id = $1`,
    [postId]
  );
  return result.rows[0] || null;
}

async function checkAllowComments(postId) {
  const result = await db.query(
    `SELECT allow_comments FROM course_posts WHERE id = $1`,
    [postId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].allow_comments;
}

async function createComment(post_id, user_id, comment_text) {
  const result = await db.query(
    `INSERT INTO posts_comments (post_id, user_id, comment_text) VALUES ($1, $2, $3) RETURNING *`,
    [post_id, user_id, comment_text]
  );
  return result.rows[0];
}
async function getCommentsByPost(postId) {
  const result = await db.query(
    `SELECT pc.*, u.first_name || ' ' || u.last_name AS full_name
     FROM posts_comments pc 
     JOIN "user" u ON pc.user_id = u.id 
     WHERE pc.post_id = $1 
     ORDER BY pc.created_at ASC`,
    [postId]
  );
  return result.rows;
}


async function getUserFullNameById(userId) {
  const result = await db.query(
    `SELECT first_name, last_name FROM "user" WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];
  if (!user) return null;

  return `${user.first_name} ${user.last_name}`;
}
async function getPostsCountByCourse(courseId) {
  const query = `SELECT COUNT(*) FROM course_posts WHERE course_id = $1`;
  const { rows } = await db.query(query, [courseId]);
  return parseInt(rows[0].count, 10);
}

async function getMaterialsCountByCourse(courseId) {
  const query = `
    SELECT COUNT(DISTINCT title || '|' || uploaded_at) AS count
    FROM course_materials
    WHERE course_id = $1
  `;
  const { rows } = await db.query(query, [courseId]);
  return parseInt(rows[0].count, 10);
}

async function getStudentsWithGrades(courseId) {
  const query = `
    SELECT 
        ts.id,
        'test' AS type,
        ts.test_id AS item_id,
        t.name AS name,
        ts.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        ts.submission_time AS submitted_at,
        ts.status,
        ts.grade,
        CONCAT('/test-report/', ts.test_id) AS link
    FROM public.test_submissions ts
    JOIN public.tests t ON ts.test_id = t.id
    JOIN public.user u ON ts.user_id = u.id
    WHERE t.course_id = $1 AND u.role = 'Student'

    UNION ALL

    SELECT 
        asub.id,
        'assignment' AS type,
        asub.assignment_id AS item_id,
        a.title AS name,
        asub.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        asub.submitted_at,
        asub.status,
        asub.grade,
        CONCAT('/assignment-submission/', asub.assignment_id) AS link
    FROM public.assignment_submissions asub
    JOIN public.assignments a ON asub.assignment_id = a.id
    JOIN public.user u ON asub.user_id = u.id
    WHERE a.course_id = $1 AND u.role = 'Student'

    ORDER BY submitted_at DESC;
  `;

  const result = await db.query(query, [courseId]);

  const grouped = new Map();

  for (const row of result.rows) {
    const { user_id, user_name, ...submission } = row;
    if (!grouped.has(user_id)) {
      grouped.set(user_id, {
        user_id,
        user_name,
        submissions: []
      });
    }
    grouped.get(user_id).submissions.push(submission);
  }

  return Array.from(grouped.values());
}



module.exports = {
  getCoursesByTeacher,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getAvailableCourses,    
  getNotAvailableCourses, 
  getApprovedEnrolledStudentsWithSubmissions,
  getUserSubmissionsStatus,
  getApprovedEnrolledStudentsWithTestSubmissions,
  createMaterial,
  getMaterialsByCourse, 
  deleteMaterial, 
  getMaterialById,
  createPost,
  getPostsByCourse,
  getPostById,
  checkAllowComments,
  createComment,
  getCommentsByPost, 
  getUserFullNameById,
  getPostsCountByCourse,
  getMaterialsCountByCourse,
  getStudentsWithGrades
};
