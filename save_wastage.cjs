const fs = require('fs');
const c = fs.readFileSync('src/App.tsx', 'utf8');
const wStart = c.indexOf("{activeTab === 'wastage' && (");
const nextCode = c.slice(wStart, wStart + 8000);
const wEnd = nextCode.lastIndexOf('</motion.div>') + '</motion.div>'.length;
fs.writeFileSync('src/views/WastageView.raw.tsx', nextCode.slice(0, wEnd));
console.log('Saved raw WastageView');
