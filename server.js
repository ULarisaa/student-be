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
const assignmentRoutes = require("./routes/assignments");
const testSubmissionsRoutes = require("./routes/testSubmissionsRoutes");
const cookieParser = require('cookie-parser');



const pool = require("./config/db"); // your pg Pool

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

// app.post("/run-java", async (req, res) => {
//   const { code, testId, caseIndex, qIdx } = req.body;

//   // Ensure code, testId, caseIndex, and qIdx are provided
//   if (!code || !testId || caseIndex === undefined || qIdx === undefined) {
//     return res.status(400).json({ error: "code, testId, caseIndex, and qIdx are required" });
//   }

//   try {
//     // Fetch the correct sample input based on testId, qIdx, and caseIndex
//     const sampleInput = await getSampleInputFromDB(testId, qIdx, caseIndex);
//     if (sampleInput === null) {
//       return res.status(400).json({ error: "No sample input found for this testId, qIdx, and caseIndex" });
//     }

//     // Run the Java code with the sample input
//     const result = await runJavaCode(code, sampleInput);
//     if (result.error) {
//       return res.status(500).json({ error: result.error });
//     }

//     // Send the output back to the client
//     res.json({ output: result.output });
//   } catch (err) {
//     console.error("run-java error:", err);
//     res.status(500).json({ error: "internal server error" });
//   }
// });

app.post("/run-java", async (req, res) => {
  const { code, input } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const result = await runJavaCode(code, input || "");
    // result already has shape { output: "...", error: "..." }
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
