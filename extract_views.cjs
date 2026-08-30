const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

const tabs = [
  { name: 'InventoryView', key: 'inventory' },
  { name: 'MenuView', key: 'menu' },
  { name: 'OrdersView', key: 'orders' },
  { name: 'SettingsView', key: 'settings' },
  { name: 'ProductionView', key: 'production' },
  { name: 'ExperimentsView', key: 'experiments' },
  { name: 'SummaryView', key: 'summary' },
  { name: 'WastageView', key: 'wastage' }
];

// Re-order based on appearance in file
const markers = tabs.map(t => ({
  name: t.name,
  marker: `{activeTab === '${t.key}' && (`
}));

const positions = markers.map(m => ({
  name: m.name,
  pos: content.indexOf(m.marker)
})).filter(p => p.pos !== -1).sort((a, b) => a.pos - b.pos);

for (let i = 0; i < positions.length; i++) {
  const start = positions[i].pos;
  const end = (i < positions.length - 1) ? positions[i+1].pos : content.indexOf('</AnimatePresence>');
  const jsx = content.slice(start, end);
  fs.writeFileSync(path.join(__dirname, 'src', 'views', `${positions[i].name}.raw.tsx`), jsx);
  console.log(`Extracted raw JSX for ${positions[i].name}`);
}
