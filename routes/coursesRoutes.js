const express = require("express");
const courseQueries = require("../database/courses");
const assignmentQueries = require("../database/assignments");
const testQueries = require("../database/tests");
const enrollmentQueries= require("../database/enrollment");
const authenticateToken = require('../functions/authTokens'); 
const router = express.Router();

const multer = require("multer");


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });




router.get("/", authenticateToken, async (req, res) => {
  const teacherId = req.user.id; 
  try {
    const courses = await courseQueries.getCoursesByTeacher(teacherId);
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


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
  const { name, description, semester, isActive } = req.body;  
  const teacherId = req.user.id; 
  console.log("Received data:", { name, description, semester, isActive });  
  try {
    const courseId = await courseQueries.createCourse(teacherId, name, description, semester, isActive);
    res.status(201).json({ id: courseId });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});




router.get("/:courseId/full", authenticateToken, async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await courseQueries.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

 
    const [assignments, tests, enrolledStudents, postsCount, materialsCount] = await Promise.all([
      assignmentQueries.getAssignmentsByCourse(courseId),
      testQueries.getTestsByCourse(courseId),
      enrollmentQueries.getApprovedEnrolledStudents(courseId),
      courseQueries.getPostsCountByCourse(courseId),
      courseQueries.getMaterialsCountByCourse(courseId)
    ]);

    res.json({
      course,
      assignments,
      tests,
      enrolledStudents,
      postsCount,
      materialsCount,
    });
  } catch (error) {
    console.error("Error fetching full course data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:courseId/students-with-submissions", authenticateToken, async (req, res) => {
  const { courseId } = req.params;

  try {
    const studentsWithSubmissions = await courseQueries.getApprovedEnrolledStudentsWithSubmissions(courseId);

    res.json({ students: studentsWithSubmissions });
  } catch (error) {
    console.error("Error fetching students with submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:courseId/students-with-test-submissions", authenticateToken, async (req, res) => {
  const { courseId } = req.params;

  try {
    const studentsWithTestSubmissions =
      await courseQueries.getApprovedEnrolledStudentsWithTestSubmissions(courseId);

    res.json({ students: studentsWithTestSubmissions });
  } catch (error) {
    console.error("Error fetching students with test submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/:courseId/submissions/status", authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    const statuses = await courseQueries.getUserSubmissionsStatus(courseId, userId);
    res.json(statuses);
  } catch (error) {
    console.error("Error fetching submissions status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post(
  '/:courseId/upload-materials',
  authenticateToken,
  upload.array('materials'),
  async (req, res) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    const title = req.body.title;

    if (!title || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const uploadedIds = [];

      for (const file of req.files) {
        const materialId = await courseQueries.createMaterial(
  courseId,
  title,
  file.originalname,
  file.size,
  file.buffer,
  userId,          
  file.mimetype     
);

        uploadedIds.push(materialId);
      }

      res.status(201).json({ message: 'Materials uploaded', ids: uploadedIds });
    } catch (error) {
      console.error('Error uploading material:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


router.get("/:courseId/materials", authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  try {
    const materials = await courseQueries.getMaterialsByCourse(courseId);
    res.json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/materials/:materialId", authenticateToken, async (req, res) => {
  const { materialId } = req.params;
  try {
    const deleted = await courseQueries.deleteMaterial(materialId);
    if (!deleted) {
      return res.status(404).json({ error: "Material not found" });
    }
    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get('/materials/:id/download', authenticateToken, async (req, res) => {
  const materialId = req.params.id;

  try {
    const material = await courseQueries.getMaterialById(materialId); 

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.setHeader('Content-Type', material.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(material.file_name)}"`
    );
    res.send(material.file_data);
  } catch (error) {
    console.error('Error fetching course material:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/posts', authenticateToken, async (req, res) => {
 const { course_id, title, content, allowComments } = req.body;

  const user_id = req.user.id;

  try {
    const post = await courseQueries.createPost(course_id, user_id, title, content, allowComments);
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/:courseId/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await courseQueries.getPostsByCourse(req.params.courseId);

 
    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        const comments = await courseQueries.getCommentsByPost(post.id);
        return {
          ...post,
          comments, 
        };
      })
    );

    res.json(postsWithComments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const post = await courseQueries.getPostById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let comments = [];
    if (post.allow_comments) {
      comments = await getCommentsByPost(req.params.postId);
    }
    res.json({ post, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/posts/comment', authenticateToken, async (req, res) => {
  const { post_id, comment_text } = req.body;
  const user_id = req.user.id;

  if (!post_id || !comment_text?.trim()) {
    return res.status(400).json({ error: "post_id and comment_text are required." });
  }

  try {
    const allow = await courseQueries.checkAllowComments(post_id);
    if (!allow) {
      return res.status(403).json({ error: "Comments are disabled for this post." });
    }

    const newComment = await courseQueries.createComment(post_id, user_id, comment_text.trim());
    const authorName = await courseQueries.getUserFullNameById(user_id);

  const commentWithAuthor = {
  ...newComment,
  full_name: authorName || "Anonymous", 
};

    res.status(201).json(commentWithAuthor);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});


router.get('/:courseId/students-with-grades', authenticateToken, async (req, res) => {
  const { courseId } = req.params;

  try {
    const data = await courseQueries.getStudentsWithGrades(courseId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching students with grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = router;
