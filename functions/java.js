const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Extract the public class name from the code
function extractClassName(code) {
  const match = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match ? match[1] : "Main"; // Fallback to Main if no match found
}

// Write Java code to file
function writeJavaCodeToFile(code, filename) {
  try {
    fs.writeFileSync(filename, code);
    return null;  // No error
  } catch (err) {
    return 'Error writing code to file: ' + err.message;
  }
}

// Compile Java code
function compileJavaCode(filename) {
  const command = `javac ${filename}`;
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (stderr) {
        reject(`Compiler Error: ${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Run Java code with input
function executeJavaCodeWithInput(className, inputData) {
  return new Promise((resolve, reject) => {
    const process = exec(`java ${className}`, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });

    // Write input to process stdin
    if (inputData) {
      process.stdin.write(inputData);
    }
    process.stdin.end();
  });
}

// Run Java code
async function runJavaCode(code, inputData = "") {
  const className = extractClassName(code);
  const filename = `${className}.java`;

  const writeError = writeJavaCodeToFile(code, filename);
  if (writeError) return { error: writeError };

  try {
    await compileJavaCode(filename);
    const output = await executeJavaCodeWithInput(className, inputData);
    return { output };
  } catch (err) {
    return { error: err };
  }
}

module.exports = { runJavaCode };
