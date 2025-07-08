const express = require("express");
const multer = require("multer");
const assignmentQueries = require("../database/assignments");
const authenticateToken = require("../functions/authTokens");

const router = express.Router();

// Set up multer to store files in memory as buffer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
  "/:courseId/create",
  authenticateToken,
  upload.array("attachments"), // handle multiple attachments
  async (req, res) => {
    const { courseId } = req.params;
    const {
      title,
      description,
      dueDate,
      answerType,
      allowedFileTypes,
      maxFileSize,
      maxFiles,
    } = req.body;

    if (!title || !dueDate || !answerType) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    try {
      // Convert uploaded files to [{ buffer, mimetype, originalname }] format
      const attachments = req.files?.map((file) => ({
        data: file.buffer,
        mimetype: file.mimetype,
        name: file.originalname,
      })) || [];

      const newAssignment = await assignmentQueries.createAssignment(
        courseId,
        title,
        description,
        dueDate,
        answerType,
        allowedFileTypes,
        maxFileSize,
        maxFiles,
        attachments // pass full array of files
      );

      res
        .status(201)
        .json({ message: "Assignment created successfully", assignment: newAssignment });
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get all assignments for a course
router.get("/:courseId", authenticateToken, async (req, res) => {
  const { courseId } = req.params;

  try {
    const assignments = await assignmentQueries.getAssignmentsByCourse(courseId);
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assignment/:assignmentId", authenticateToken, async (req, res) => {
  const { assignmentId } = req.params;

  try {
    const assignment = await assignmentQueries.getAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json(assignment);
  } catch (error) {
    console.error("Error fetching assignment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/attachments/:id', authenticateToken, async (req, res) => {
  const attachmentId = req.params.id;

  try {
    const attachment = await assignmentQueries.getAttachmentById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.file_name)}"`
    );
    res.send(attachment.file_data);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.post(
  '/:assignmentId/submit-file',
  authenticateToken,
  upload.array('files'),
  async (req, res) => {
    const assignmentId = req.params.assignmentId;
    const userId = req.user.id;

    // Extrage lista de existingFileIds din form-data
    let existingFileIds = [];
    if (req.body.existingFileIds) {
      try {
        existingFileIds = JSON.parse(req.body.existingFileIds);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid existingFileIds format' });
      }
    }

    try {
      // Șterge fișierele care nu sunt în existingFileIds pentru acest user + assignment
      await assignmentQueries.deleteFilesNotInList({
        assignmentId,
        userId,
        keepFileIds: existingFileIds,
      });

      // Salvează noile fișiere uploadate
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await assignmentQueries.saveFileSubmission({
            assignmentId,
            userId,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            fileData: file.buffer,
          });
        }
      }

      // Returnează lista actualizată de fișiere
      const updatedFiles = await assignmentQueries.getUserFiles({ assignmentId, userId });

      res.status(201).json({ message: 'Files updated successfully', updatedFiles });
    } catch (error) {
      console.error('Error updating files:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);



// Submit text answer for an assignment
router.post(
  '/:assignmentId/submit-text',
  authenticateToken,
  express.json(),
  async (req, res) => {
    const assignmentId = req.params.assignmentId;
    const userId = req.user.id;
    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer text is required' });
    }

    try {
      await assignmentQueries.saveTextSubmission({
        assignmentId,
        userId,
        answer: answer.trim(),
      });
      res.status(201).json({ message: 'Answer submitted successfully' });
    } catch (error) {
      console.error('Error submitting text:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
// Get comments for an assignment
router.get('/:assignmentId/comments', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const comments = await assignmentQueries.getCommentsByAssignment(assignmentId);
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a comment
router.post('/:assignmentId/comments', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;  // assuming authenticateToken sets req.user
    const { comment } = req.body;
console.log(userId);
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const newComment = await assignmentQueries.addAssignmentComment({ assignmentId, userId, comment: comment.trim() });
    const author = `${req.user.first_name} ${req.user.last_name}`;
    console.log(author);
    res.status(201).json({
      id: newComment.id,
      comment_text: newComment.comment_text,
      created_at: newComment.created_at,
      author_name: author,
    });
  } catch (err) {
    console.error('Error submitting comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get(
  '/assignment/:assignmentId/submission',
  authenticateToken,
  async (req, res) => {
    const assignmentId = req.params.assignmentId;
    const userId = req.user.id; 

    try {
      const submission = await assignmentQueries.getSubmissionByAssignmentAndUser(assignmentId, userId);

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      res.json(submission);
    } catch (error) {
      console.error('Error fetching submission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
router.get(
  '/:assignmentId/submission/:studentId',
  authenticateToken,  // dacă vrei să ceri autentificare
  async (req, res) => {
    const { assignmentId, studentId } = req.params;

    try {
      const submission = await assignmentQueries.getSubmissionByAssignmentAndUser(assignmentId, studentId);

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      res.json(submission);
    } catch (error) {
      console.error('Error fetching submission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
router.post('/grade-assignment/:submissionId', authenticateToken, async (req, res) => {
  const { submissionId } = req.params;
  const { grade, feedback } = req.body;
   console.log('submissionId:', submissionId); // Add this debug line

  try {
    const updatedSubmission = await assignmentQueries.gradeAssignment(submissionId, grade, feedback);

    if (!updatedSubmission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({
      message: 'Grade and feedback submitted successfully',
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Error grading assignment:', error);
    res.status(500).json({ message: 'Failed to submit grade and feedback' });
  }
});

router.get('/submission-files/:id', authenticateToken, async (req, res) => {
  const fileId = req.params.id;

  try {
    const file = await assignmentQueries.getSubmissionFileById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.file_name)}"`
    );
    res.send(file.file_data);
  } catch (error) {
    console.error('Error fetching submission file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete("/:assignmentId/delete-submission", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { assignmentId } = req.params;

  try {
    await assignmentQueries.deleteEntireSubmission({ assignmentId, userId });
    res.status(200).json({ message: "Submission deleted successfully." });
  } catch (error) {
    console.error("Error deleting submission:", error);
    res.status(500).json({ error: "Could not delete submission." });
  }
});



module.exports = router;
