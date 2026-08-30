const fs = require('fs');
let c = fs.readFileSync('src/views/WastageView.tsx', 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('src/views/WastageView.tsx', c);
