const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");

async function runJavaCode(code, inputData = "") {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { error: "Java code is empty or invalid." };
  }

  const id = uuidv4();
  const tempDir = path.join(__dirname, "tmp", id);
  const javaFilePath = path.join(tempDir, "Main.java");

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(javaFilePath, code);

    if (!fs.existsSync(javaFilePath)) {
      return { error: "Failed to write Main.java." };
    }

    const tempDirUnix = tempDir.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (match, driveLetter) => `/${driveLetter.toLowerCase()}`);
    const dockerArgs = [
      "run",
      "--rm",
      "-i",
      "-m", "512m",
      "--cpus=0.5",
      "-v", `${tempDirUnix}:/code`,
      "-w", "/code",
      "java-sandbox"
    ];

    return await new Promise((resolve, reject) => {
      const proc = spawn("docker", dockerArgs, { timeout: 30000 });

      let output = "";
      let error = "";

      proc.stdout.on("data", (data) => {
        output += data.toString();
      });

      proc.stderr.on("data", (data) => {
        error += data.toString();
      });

      proc.on("error", (err) => {
        reject(err);
      });

      proc.on("close", (code, signal) => {
        setTimeout(() => {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (err) {
            console.error("Error while deleting temp folder:", err);
          }

          if (code === null) {
            return reject(`Process exited with null code (signal: ${signal || "none"})`);
          }

          if (code !== 0) {
            reject(error || `Process exited with code ${code}`);
          } else {
            resolve(output);
          }
        }, 100);
      });

      if (inputData) {
        if (!inputData.endsWith('\n')) {
          inputData += '\n';
        }
        proc.stdin.write(inputData);
      }

      proc.stdin.end();
    });
  } catch (err) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}

    return { error: err.toString() };
  }
}

module.exports = { runJavaCode };
