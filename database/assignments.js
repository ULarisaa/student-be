const db = require("../config/db");



async function createAssignment(courseId, title, description, dueDate, answerType, allowedFileTypes, maxFileSize, maxFiles, attachments) {
  // Insert assignment, fără tranzacție
  const assignmentInsertText = `
    INSERT INTO assignments (course_id, title, description, due_date, answer_type, allowed_file_types, max_file_size, max_files)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `;

  const res = await db.query(assignmentInsertText, [
    courseId,
    title,
    description,
    dueDate,
    answerType,
    allowedFileTypes,
    maxFileSize,
    maxFiles,
  ]);

  const assignmentId = res.rows[0].id;

  // Insert attachments (fără tranzacție)
  for (const file of attachments) {
    await db.query(
      `INSERT INTO assignment_attachments (assignment_id, file_data, file_name, mime_type) VALUES ($1, $2, $3, $4)`,
      [assignmentId, file.data, file.name, file.mimetype]
    );
  }

  return { id: assignmentId, courseId, title, description, dueDate, answerType, allowedFileTypes, maxFileSize, maxFiles };
}

async function getAttachmentById(id) {
  const res = await db.query(
    'SELECT file_data, file_name, mime_type FROM assignment_attachments WHERE id = $1',
    [id]
  );
  return res.rows[0];
}
async function getSubmissionFileById(id) {
  const res = await db.query(
    'SELECT id, submission_id, file_data, file_name, mime_type, file_size, uploaded_at FROM assignment_submission_files WHERE id = $1',
    [id]
  );
  return res.rows[0];
}




async function getAssignmentsByCourse(courseId) {
  const query = `
    SELECT * FROM assignments
    WHERE course_id = $1
    ORDER BY due_date ASC;
  `;
  const result = await db.query(query, [courseId]);
  return result.rows;
}
async function getAssignmentById(assignmentId) {
  // 1. Obține assignment
  const assignmentQuery = `
    SELECT * FROM assignments
    WHERE id = $1;
  `;
  const assignmentResult = await db.query(assignmentQuery, [assignmentId]);
  const assignment = assignmentResult.rows[0];

  if (!assignment) return null;

  // 2. Obține atașamentele assignment-ului
  const attachmentsQuery = `
    SELECT * FROM assignment_attachments
    WHERE assignment_id = $1;
  `;
  const attachmentsResult = await db.query(attachmentsQuery, [assignmentId]);
  const attachments = attachmentsResult.rows;

  // 3. Returnează un obiect combinat
  return {
    ...assignment,
    attachments
  };
}
async function saveFileSubmission({ assignmentId, userId, fileName, mimeType, fileSize, fileData }) {
  // 1. Check if user already has a submission for this assignment
  const res = await db.query(
    `SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND user_id = $2`,
    [assignmentId, userId]
  );

  let submissionId;

  if (res.rows.length === 0) {
    const insertSub = await db.query(
      `INSERT INTO assignment_submissions (assignment_id, user_id, status, submitted_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [assignmentId, userId, 'submitted']
    );
    submissionId = insertSub.rows[0].id;
  } else {
    submissionId = res.rows[0].id;
    await db.query(
      `UPDATE assignment_submissions 
       SET status = $1, submitted_at = NOW() 
       WHERE id = $2`,
      ['submitted', submissionId]
    );
  }

  // Save file
  await db.query(
    `INSERT INTO assignment_submission_files 
     (submission_id, file_name, mime_type, file_size, file_data, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [submissionId, fileName, mimeType, fileSize, fileData]
  );

  return submissionId;
}



// Save a text answer submission (in assignment_submissions)
async function saveTextSubmission({ assignmentId, userId, answer }) {
  // Check if submission exists
  let res = await db.query(
    `SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND user_id = $2`,
    [assignmentId, userId]
  );

  if (res.rows.length === 0) {
    // Insert new submission
    await db.query(
      `INSERT INTO assignment_submissions (assignment_id, user_id, text_answer, status, submitted_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [assignmentId, userId, answer, 'submitted']
    );
  } else {
    // Update existing submission
    const submissionId = res.rows[0].id;
    await db.query(
      `UPDATE assignment_submissions SET text_answer = $1, status = $2, submitted_at = NOW() WHERE id = $3`,
      [answer, 'submitted', submissionId]
    );
  }
}


// Get comments for an assignment, ordered by creation time asc
async function getCommentsByAssignment(assignmentId) {
  const result = await db.query(
    `SELECT ac.id, ac.comment_text, ac.created_at, u.first_name, u.last_name
     FROM assignments_comments ac
     JOIN "user" u ON ac.user_id = u.id
     WHERE ac.assignment_id = $1
     ORDER BY ac.created_at ASC`,
    [assignmentId]
  );
  return result.rows.map(row => ({
    id: row.id,
    comment_text: row.comment_text,
    created_at: row.created_at,
    author_name: `${row.first_name} ${row.last_name}`
  }));
}

async function addAssignmentComment({ assignmentId, userId, comment }) {
  const result = await db.query(
    `INSERT INTO assignments_comments (assignment_id, user_id, comment_text, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, comment_text, created_at`,
    [assignmentId, userId, comment]
  );
  return result.rows[0];
}
async function getSubmissionByAssignmentAndUser(assignmentId, userId) {
  const res = await db.query(
    `SELECT s.id as submission_id, s.status, s.submitted_at, s.grade, s.feedback, s.last_modified,
            f.id as file_id, f.file_name, f.mime_type, f.file_size, f.uploaded_at
     FROM assignment_submissions s
     LEFT JOIN assignment_submission_files f ON f.submission_id = s.id
     WHERE s.assignment_id = $1 AND s.user_id = $2`,
    [assignmentId, userId]
  );

  if (res.rows.length === 0) {
    return null; // no submission found
  }

  // Organize files by submission
  const submission = {
    submissionId: res.rows[0].submission_id,
    status: res.rows[0].status,
    submittedAt: res.rows[0].submitted_at,
    grade: res.rows[0].grade,
    feedback: res.rows[0].feedback,       // adăugat aici
    lastModified: res.rows[0].last_modified,
    files: [],
  };

  for (const row of res.rows) {
    if (row.file_id) {
      submission.files.push({
        id: row.file_id,
        file_name: row.file_name,
        mime_type: row.mime_type,
        file_size: row.file_size,
        uploaded_at: row.uploaded_at,
      });
    }
  }

  return submission;
}



async function gradeAssignment(submissionId, grade, feedback) {
  const result = await db.query(
    `
    UPDATE assignment_submissions
    SET grade = $1,
        feedback = $2,
        status = 'graded',
        last_modified = NOW()
    WHERE id = $3
    RETURNING *;
    `,
    [grade, feedback, submissionId]
  );
  return result.rows[0]; // null dacă nu a fost găsit
}

async function deleteFilesNotInList({ assignmentId, userId, keepFileIds }) {
  // Găsește submission_id pentru user + assignment
  const res = await db.query(
    `SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND user_id = $2`,
    [assignmentId, userId]
  );

  if (res.rows.length === 0) {
    // Nu e nimic de șters
    return;
  }

  const submissionId = res.rows[0].id;

  // Dacă nu există fișiere de păstrat, șterge tot
  if (!keepFileIds || keepFileIds.length === 0) {
    await db.query(
      `DELETE FROM assignment_submission_files WHERE submission_id = $1`,
      [submissionId]
    );
    return;
  }

  // Construiește parametrizat lista de id-uri
  const placeholders = keepFileIds.map((_, i) => `$${i + 2}`).join(', ');

  const query = `
    DELETE FROM assignment_submission_files
    WHERE submission_id = $1 AND id NOT IN (${placeholders})
  `;

  const params = [submissionId, ...keepFileIds];

  await db.query(query, params);
}

async function getUserFiles({ assignmentId, userId }) {
  const res = await db.query(
    `
    SELECT f.id, f.file_name, f.mime_type, f.file_size, f.uploaded_at
    FROM assignment_submission_files f
    JOIN assignment_submissions s ON f.submission_id = s.id
    WHERE s.assignment_id = $1 AND s.user_id = $2
    ORDER BY f.uploaded_at DESC
    `,
    [assignmentId, userId]
  );

  return res.rows;
}
async function deleteEntireSubmission({ assignmentId, userId }) {
  const res = await db.query(
    `SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND user_id = $2`,
    [assignmentId, userId]
  );

  if (res.rows.length === 0) return;

  const submissionId = res.rows[0].id;

  // Șterge fișierele
  await db.query(`DELETE FROM assignment_submission_files WHERE submission_id = $1`, [submissionId]);

  // Șterge submisia
  await db.query(`DELETE FROM assignment_submissions WHERE id = $1`, [submissionId]);
}

module.exports = {
  createAssignment,
  getAssignmentsByCourse,
  getAssignmentById, 
  getAttachmentById,
  saveFileSubmission,
  saveTextSubmission,
  addAssignmentComment,
  getCommentsByAssignment,
getSubmissionByAssignmentAndUser,
 gradeAssignment,
 getSubmissionFileById, 
 deleteFilesNotInList, 
 getUserFiles, 
 deleteEntireSubmission

};
