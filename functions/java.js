const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Extras numele clasei publice, fallback la "Main"
function extractClassName(code) {
  const match = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match ? match[1] : "Main";
}

async function runJavaCode(code, inputData = "") {
  const className = extractClassName(code);
  const id = uuidv4(); // generăm un ID unic pentru fiecare rulare
  const tempDir = path.join(__dirname, "tmp", id);
  const javaFile = path.join(tempDir, `${className}.java`);

  try {
    // Creează folderul temporar
    fs.mkdirSync(tempDir, { recursive: true });

    // Scrie codul în fișierul Java
    fs.writeFileSync(javaFile, code);

    // Compilează codul
    await new Promise((resolve, reject) => {
      exec(`javac ${className}.java`, { cwd: tempDir, timeout: 5000 }, (err, stdout, stderr) => {
        if (err || stderr) return reject(stderr || err.message);
        resolve(stdout);
      });
    });

    // Rulează codul cu input de la utilizator
    const output = await new Promise((resolve, reject) => {
     const process = exec(`java ${className}`, { cwd: tempDir, timeout: 5000 }, (err, stdout, stderr) => {
        if (err || stderr) return reject(stderr || err.message);
        resolve(stdout);
      });

      // Trimite input prin stdin
      if (inputData) {
        process.stdin.write(inputData);
      }
      process.stdin.end();
    });

    // Șterge folderul temporar și fișierele
    fs.rmSync(tempDir, { recursive: true, force: true });

    return { output };
  } catch (err) {
    // Dacă apare o eroare, tot ștergem folderul
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}

    return { error: err.toString() };
  }
}

module.exports = { runJavaCode };
