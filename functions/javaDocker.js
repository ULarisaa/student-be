const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");

async function runJavaCode(code, inputData = "") {
  const id = uuidv4();
  const tempDir = path.join(__dirname, "tmp", id);
  const javaFilePath = path.join(tempDir, "Main.java");

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(javaFilePath, code);

    // Ajustează path-ul pentru Docker pe Windows
    const tempDirUnix = tempDir.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (match, driveLetter) => `/${driveLetter.toLowerCase()}`);

   const dockerArgs = [
  "run",
  "--rm",
  "-i",
  "-m", "256m",
  "--cpus=0.5",
  "-v", `${tempDirUnix}:/code`,
  "-w", "/code",
  "java-sandbox"
];




    return await new Promise((resolve, reject) => {
      const proc = spawn("docker", dockerArgs, { timeout: 7000 });

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

      proc.on("close", (code) => {
        // Șterge folderul temporar după execuție
        fs.rmSync(tempDir, { recursive: true, force: true });

        if (code !== 0) {
          reject(error || `Process exited with code ${code}`);
        } else {
          resolve(output);
        }
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
