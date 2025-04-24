const express = require("express");
const cors = require("cors");
const { runJavaCode } = require("./functions/java");
const userRoutes = require("./routes/userRoutes");
const coursesRoutes = require("./routes/coursesRoutes");
const testsRoutes = require("./routes/testsRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const pool = require("./config/db"); // your pg Pool

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);
app.use("/course", coursesRoutes);
app.use("/test", testsRoutes);
app.use("/enroll", enrollmentRoutes);

// Endpoint to run Java code
app.post("/run-java", async (req, res) => {
  const { code, testId, caseIndex } = req.body;

  // Ensure code, testId, and caseIndex are provided
  if (!code || !testId || caseIndex === undefined) {
    return res.status(400).json({ error: "code, testId, and caseIndex are required" });
  }

  try {
    // Fetch the correct sample input based on testId and caseIndex
    const sampleInput = await getSampleInputFromDB(testId, caseIndex);
    if (sampleInput === null) {
      return res.status(400).json({ error: "No sample input found for this testId and caseIndex" });
    }

    // Run the Java code with the sample input
    const result = await runJavaCode(code, sampleInput);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    // Send the output back to the client
    res.json({ output: result.output });
  } catch (err) {
    console.error("run-java error:", err);
    res.status(500).json({ error: "internal server error" });
  }
});

// Function to fetch sample input from database
async function getSampleInputFromDB(testId, caseIndex) {
  console.log("Fetching sample input for testId:", testId, "and caseIndex:", caseIndex); // Log the testId and caseIndex being fetched

  const sql = `
    SELECT sample_input
      FROM public.test_questions
     WHERE test_id = $1
  `;

  try {
    // Execute the query to fetch sample_input
    const { rows } = await pool.query(sql, [testId]);

    // Log the raw rows data returned by the query
    console.log("Query result rows:", rows);

    // Check if the sample_input exists and if caseIndex is within bounds
    if (!rows.length || !rows[0].sample_input || caseIndex >= rows[0].sample_input.length || caseIndex < 0) {
      console.log("No valid sample input found for testId:", testId, "or caseIndex:", caseIndex);
      return null;
    }

    // Log and return the specific sample input for the requested caseIndex
    console.log("Sample input found:", rows[0].sample_input[caseIndex]);
    return rows[0].sample_input[caseIndex];
  } catch (err) {
    // Catch and log any database errors
    console.error("Error querying database for sample input:", err);
    throw err; // Rethrow the error for higher-level handling
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
