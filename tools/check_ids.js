const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');

const regex = /getElementById\((["'])(.*?)\1\)/g;
let match;
const missing = new Set();
while ((match = regex.exec(app)) !== null) {
  const id = match[2];
  if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) {
    missing.add(id);
  }
}
console.log('MISSING IDs:', Array.from(missing));
