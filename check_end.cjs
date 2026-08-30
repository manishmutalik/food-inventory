const fs = require('fs');
const c = fs.readFileSync('src/App.tsx', 'utf8');
const wStart = c.indexOf("{activeTab === 'wastage' && (");
const nextCode = c.slice(wStart, wStart + 8000);
console.log(nextCode.substring(nextCode.lastIndexOf('</motion.div>'), nextCode.lastIndexOf('</motion.div>') + 200));
