const fs = require('fs');
const c = fs.readFileSync('src/App.tsx', 'utf8');
const apStart = c.indexOf("{activeTab === 'inventory' && (");
console.log(c.slice(apStart - 200, apStart));
