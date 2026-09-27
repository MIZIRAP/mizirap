const fs = require('fs');
const js = fs.readFileSync('ai-chat.js', 'utf8');
// Evaluate the relevant parts
let chatHistory = [];
const text = 'merhaba';
chatHistory.push({ role: 'user', parts: [{ text }] });
const trimmedHistory = chatHistory.slice(-10);
const payload = {
    system_instruction: { parts: { text: 'dummy' } },
    contents: trimmedHistory,
    tools: [] // mock
};
console.log(JSON.stringify(payload));
