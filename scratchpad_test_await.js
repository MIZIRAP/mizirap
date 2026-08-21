const fs = require('fs');
const content = fs.readFileSync('/Users/boratektas/Desktop/mizirap/workout.js', 'utf8');
const lines = content.split('\n');

let inFunction = false;
let isAsync = false;
let funcName = '';

for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    if (line.match(/function\s+(\w+)/)) {
        inFunction = true;
        isAsync = line.includes('async');
        funcName = line.match(/function\s+(\w+)/)[1];
    }
    
    if (inFunction && !isAsync && line.includes('await ')) {
        console.log(`SyntaxError: await used in non-async function ${funcName} on line ${i+1}`);
    }
    
    // basic block checking isn't perfect, but let's just grep
}
