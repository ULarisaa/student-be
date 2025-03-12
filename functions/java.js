// functions/javaExecution.js

const fs = require('fs');
const { exec } = require('child_process');

// Function to write Java code to a file
function writeJavaCodeToFile(code, filename = 'Main.java') {
    try {
        fs.writeFileSync(filename, code);
        return null;  // No error
    } catch (err) {
        return 'Error writing code to file: ' + err.message;
    }
}

// Function to compile Java code
function compileJavaCode(filename = 'Main.java') {
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

// Function to execute compiled Java program
function executeJavaCode(filename = 'Main') {
    return new Promise((resolve, reject) => {
        exec(`java ${filename}`, (execError, execStdout, execStderr) => {
            if (execError) {
                reject(`Runtime Error: ${execStderr}`);
            } else {
                resolve(execStdout);
            }
        });
    });
}

// Utility function to run the entire Java code execution process
async function runJavaCode(code) {
    const filename = 'Main.java';

    // Write Java code to file
    const writeError = writeJavaCodeToFile(code, filename);
    if (writeError) {
        return { error: writeError };
    }

    try {
        // Compile the Java code
        await compileJavaCode(filename);

        // Execute the Java code
        const output = await executeJavaCode('Main');
        return { output };  // Return the output of the Java program
    } catch (err) {
        return { error: err };
    }
}

module
