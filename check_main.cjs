const fs = require('fs');
const c = fs.readFileSync('src/App.tsx', 'utf8');
const apStart = c.indexOf('<AnimatePresence mode="wait">');
const mainEnd = c.indexOf('</main>', apStart);
console.log(c.slice(mainEnd - 200, mainEnd + 10));
