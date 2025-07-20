const express = require("express");
const cors = require("cors");
require('dotenv').config();
const { sendEmail } = require('./functions/emailService');
const authenticateToken = require('./functions/authTokens');
const { runJavaCode } = require("./functions/javaDocker");
const userRoutes = require("./routes/userRoutes");
const coursesRoutes = require("./routes/coursesRoutes");
const testsRoutes = require("./routes/testsRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const assignmentRoutes = require("./routes/assignmentsRoutes");
const testSubmissionsRoutes = require("./routes/testSubmissionsRoutes");
const cookieParser = require('cookie-parser');



const pool = require("./config/db"); 

const app = express();
const port = 5000;

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());


app.use("/user", userRoutes);
app.use("/course", coursesRoutes);
app.use("/test", testsRoutes);
app.use("/enroll", enrollmentRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/testSubmissions", testSubmissionsRoutes);


app.post("/run-java", async (req, res) => {
  const { code, input } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const result = await runJavaCode(code, input || "");

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    console.log(result);
    res.json({ output: result });
  } catch (err) {
    console.error("run-java error:", err);
    res.status(500).json({ error: err.toString() });
  }
});



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
