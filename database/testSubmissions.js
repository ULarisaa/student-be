const db = require("../config/db");


async function createSubmission({
  test_id,
  user_id,
  status,
  submission_time,
  copy_paste_attempts,
  exit_fullscreen_count,
  mouse_leave_count,
}) {
  const existing = await db.query(
    `SELECT id FROM test_submissions WHERE test_id = $1 AND user_id = $2`,
    [test_id, user_id]
  );

  if (existing.rows.length > 0) {
    const result = await db.query(
      `UPDATE test_submissions
       SET status = $3,
           submission_time = $4,
           copy_paste_attempts = $5,
           exit_fullscreen_count = $6,
           mouse_leave_count = $7
       WHERE test_id = $1 AND user_id = $2
       RETURNING *`,
      [
        test_id,
        user_id,
        status,
        submission_time,
        copy_paste_attempts,
        exit_fullscreen_count,
        mouse_leave_count,
      ]
    );
    return result.rows[0];
  } else {
    const result = await db.query(
      `INSERT INTO test_submissions 
        (test_id, user_id, status, submission_time, copy_paste_attempts, exit_fullscreen_count, mouse_leave_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        test_id,
        user_id,
        status,
        submission_time,
        copy_paste_attempts,
        exit_fullscreen_count,
        mouse_leave_count,
      ]
    );
    return result.rows[0];
  }
}


async function getAllSubmissions() {
  const query = `
    SELECT 
      id, test_id, user_id, submission_time, status, grade, 
      copy_paste_attempts, exit_fullscreen_count, mouse_leave_count
    FROM test_submissions;
  `;
  const { rows } = await db.query(query);
  return rows;
}


async function getAnswersBySubmissionId(submissionId) {
  const query = `
    SELECT id, test_submission_id, question_id, answer, answer_time, typing_speed, created_at
    FROM test_submissions_answers
    WHERE test_submission_id = $1;
  `;
  const values = [submissionId];
  const { rows } = await db.query(query, values);
  return rows;
}

async function insertAnswer({ submissionId, question_id, answer, answer_time, typing_speed, idle_time, tests_passed, tests_total, test_results }) {
  const query = `
    INSERT INTO test_submissions_answers 
      (test_submission_id, question_id, answer, answer_time, typing_speed, idle_time, tests_passed, tests_total, test_results)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  const values = [submissionId, question_id, answer, answer_time, typing_speed, idle_time, tests_passed ?? null, tests_total ?? null, test_results ?? null];
  const { rows } = await db.query(query, values);
  return rows[0];
}

async function insertMultipleAnswers(submissionId, answers) {
  const values = [];
  const allValues = [];

  answers.forEach((a, i) => {

    values.push(`($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`);
    allValues.push(
      submissionId,
      a.question_id,
      a.answer,
      a.answer_time,
      a.typing_speed,
      a.idle_time,
      a.tests_passed ?? null,
      a.tests_total ?? null,
      a.test_results ?? null
    );
  });

  const query = `
    INSERT INTO test_submissions_answers (
      test_submission_id,
      question_id,
      answer,
      answer_time,
      typing_speed,
      idle_time,
      tests_passed,
      tests_total,
      test_results
    ) VALUES ${values.join(',')}
  `;

  await db.query(query, allValues);
}


async function getSubmissionByTestAndUser(testId, userId) {
  const res = await db.query(
    `
    SELECT 
      ts.*, 
      u.first_name, 
      u.last_name 
    FROM test_submissions ts
    JOIN "user" u ON ts.user_id = u.id
    WHERE ts.test_id = $1 AND ts.user_id = $2
    `,
    [testId, userId]
  );
  return res.rows[0] || null;
}

async function getAnswersBySubmissionId(submissionId) {
  const res = await db.query(
    `
    SELECT 
      tsa.*, 
      q.task, 
      q.category, 
      q.points
    FROM test_submissions_answers tsa
    JOIN test_questions q ON tsa.question_id = q.id
    WHERE tsa.test_submission_id = $1
    ORDER BY tsa.question_id
    `,
    [submissionId]
  );
  return res.rows;
}

async function saveSubmissionGrade(submissionId, grade) {
  await db.query(
    `UPDATE test_submissions SET grade = $1, status = 'graded' WHERE id = $2`,
    [grade, submissionId]
  );
}


async function saveQuestionGrade(submissionId, questionId, grade) {
  await db.query(
    `UPDATE test_submissions_answers
     SET grade = $1
     WHERE test_submission_id = $2 AND question_id = $3`,
    [grade, submissionId, questionId]
  );
}

async function saveCodeSnapshot(userId, questionId, code) {

  await db.query(
    `INSERT INTO coding_snapshots (user_id, question_id, snapshot_time, code)
     VALUES ($1, $2, NOW(), $3)`,
    [userId, questionId, code]
  );
}

async function getSnapshots(testId, questionId, studentId) {
  const query = `
    SELECT cs.id, cs.user_id, cs.question_id, cs.snapshot_time AS timestamp, cs.code
    FROM coding_snapshots cs
    JOIN test_questions tq ON cs.question_id = tq.id
    WHERE cs.user_id = $1
      AND cs.question_id = $2
      AND tq.test_id = $3
    ORDER BY cs.snapshot_time ASC;
  `;
  
  const values = [studentId, questionId, testId];
  const { rows } = await db.query(query, values);
  return rows;
}
async function deleteAllSnapshotsForTest(testId) {
  try {
    await db.query('BEGIN');


    const deleteSnapshotsQuery = `
      DELETE FROM public.coding_snapshots
      WHERE question_id IN (
        SELECT id FROM public.test_questions WHERE test_id = $1
      );
    `;
    await db.query(deleteSnapshotsQuery, [testId]);

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}



module.exports = {
  createSubmission,
  getAllSubmissions,
  getAnswersBySubmissionId,
  insertAnswer,
  insertMultipleAnswers,
  getSubmissionByTestAndUser, 
  getAnswersBySubmissionId, 
  saveSubmissionGrade, 
  saveQuestionGrade, 
  saveCodeSnapshot, 
  getSnapshots, 
  deleteAllSnapshotsForTest
};
