const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");


function extractClassName(code) {
  const match = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match ? match[1] : "Main";
}

async function runJavaCode(code, inputData = "") {
  const className = extractClassName(code);
  const id = uuidv4(); 
  const tempDir = path.join(__dirname, "tmp", id);
  const javaFile = path.join(tempDir, `${className}.java`);

  try {

    fs.mkdirSync(tempDir, { recursive: true });


    fs.writeFileSync(javaFile, code);


    await new Promise((resolve, reject) => {
      exec(`javac ${className}.java`, { cwd: tempDir, timeout: 5000 }, (err, stdout, stderr) => {
        if (err || stderr) return reject(stderr || err.message);
        resolve(stdout);
      });
    });


    const output = await new Promise((resolve, reject) => {
     const process = exec(`java ${className}`, { cwd: tempDir, timeout: 5000 }, (err, stdout, stderr) => {
        if (err || stderr) return reject(stderr || err.message);
        resolve(stdout);
      });

      if (inputData) {
        process.stdin.write(inputData);
      }
      process.stdin.end();
    });


    fs.rmSync(tempDir, { recursive: true, force: true });

    return { output };
  } catch (err) {

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}

    return { error: err.toString() };
  }
}

module.exports = { runJavaCode };
