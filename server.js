// server.js

const express = require('express');
const cors = require('cors');
const { runJavaCode } = require('./functions/java');
const userRoutes = require('./routes/userRoutes');
const coursesRoutes = require('./routes/coursesRoutes');
const testsRoutes = require('./routes/testsRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const app = express();
const port = 5000;

// Enable CORS
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Use user routes for authentication
app.use('/user', userRoutes);
app.use('/course', coursesRoutes);
app.use('/test', testsRoutes);
app.use('/enroll', enrollmentRoutes);

// POST /run-java (Java code execution route)
app.post('/run-java', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    // Run the Java code
    const result = await runJavaCode(code);

    if (result.error) {
        return res.status(500).json({ error: result.error });
    }

    res.json({ output: result.output });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
