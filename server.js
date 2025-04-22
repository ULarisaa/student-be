const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const { exec } = require("child_process");
const fs = require("fs");
const userRoutes = require("./routes/userRoutes");
const coursesRoutes = require("./routes/coursesRoutes");
const testsRoutes = require("./routes/testsRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");

const app = express();
const port = 5000;

// Enable CORS
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Use user routes for authentication
app.use("/user", userRoutes);
app.use("/course", coursesRoutes);
app.use("/test", testsRoutes);
app.use("/enroll", enrollmentRoutes);

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  let currentProcess = null;

  ws.on("message", (message) => {
    try {
      const { code, input, index } = JSON.parse(message);  // Include index to handle different responses

      console.log("Received code:", code);
      console.log("Received input:", input);

      // Extract the class name from the Java code (assumes it's the first public class)
      const classNameMatch = code.match(/public class (\w+)/);
      if (!classNameMatch) {
        ws.send(JSON.stringify({ error: "No public class found in the Java code." }));
        return;
      }
      const className = classNameMatch[1];

      // Create the correct file name based on the class name
      const fileName = `./${className}.java`;
      fs.writeFileSync(fileName, code);

      // Compile the Java code
      exec(`javac ${fileName}`, (err, stdout, stderr) => {
        if (err) {
          console.error("Error compiling Java code:", stderr); // Log compilation error
          ws.send(JSON.stringify({ error: stderr }));
          return;
        }

        console.log("Java code compiled successfully.");

        // Run the Java program
        currentProcess = exec(`java ${className}`, (err, stdout, stderr) => {
          if (err) {
            console.error("Error running Java code:", stderr); // Log runtime error
            ws.send(JSON.stringify({ error: stderr }));
            return;
          }

          console.log("Java code output:", stdout);

          // Send the output to the client
          ws.send(JSON.stringify({ output: stdout, index }));
        });

        // Send input to the Java process if it's provided
        if (input) {
          console.log("Sending input to Java program:", input);
          currentProcess.stdin.write(input + "\n"); // Send the input to the program
        }
      });
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      ws.send(JSON.stringify({ error: "Internal server error" }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    if (currentProcess) {
      currentProcess.kill(); // Ensure to kill any remaining processes
    }
  });
});

// Upgrade HTTP request to WebSocket connection
app.server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Handle WebSocket upgrade
app.server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// POST /run-java (Java code execution route)
app.post("/run-java", async (req, res) => {
  const { code, input } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  const result = await runJavaCode(code, input || "");

  if (result.error) {
    return res.status(500).json({ error: result.error });
  }

  res.json({ output: result.output });
});

module.exports = app;
