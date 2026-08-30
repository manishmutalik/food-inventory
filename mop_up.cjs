const fs = require('fs');

let types = fs.readFileSync('src/types/index.ts', 'utf8');
types = types.replace('} = props;', `isRefreshing: boolean;
  lastSynced: string;
  handleDownloadTemplate: () => void;
  handleImportCSV: (e: any) => void;
  setAddMaterialCategory: (c: string) => void;
  setShowAddMaterialModal: (b: boolean) => void;
}
`);
fs.writeFileSync('src/types/index.ts', types);

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace('  const appProps = {', `  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date().toISOString());
  const handleDownloadTemplate = () => {};
  const handleImportCSV = (e: any) => {};
  const [addMaterialCategory, setAddMaterialCategory] = useState('');
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);

  const appProps: any = {
    isRefreshing, lastSynced, handleDownloadTemplate, handleImportCSV, setAddMaterialCategory, setShowAddMaterialModal,`);
fs.writeFileSync('src/App.tsx', app);

let err = fs.readFileSync('src/utils/errorHandling.tsx', 'utf8');
err = `import { AlertCircle } from 'lucide-react';\n` + err;
fs.writeFileSync('src/utils/errorHandling.tsx', err);

fs.rmSync('src/App_old.tsx', { force: true });

let inv = fs.readFileSync('src/views/InventoryView.tsx', 'utf8');
inv = inv.replace("import { CURRENCIES, INITIAL_MATERIALS } from '../utils/constants';", "import { CURRENCIES, INITIAL_MATERIALS } from '../App';\nimport { UNIT_CONVERSIONS } from '../App';");
// Also add these to App.tsx exports
inv = inv.replace("const {", "const { isRefreshing, lastSynced, handleDownloadTemplate, handleImportCSV, setAddMaterialCategory, setShowAddMaterialModal,");
fs.writeFileSync('src/views/InventoryView.tsx', inv);

let exp = fs.readFileSync('src/views/ExperimentsView.tsx', 'utf8');
exp = exp.replace("import { CURRENCIES, INITIAL_MATERIALS } from '../utils/constants';", "import { CURRENCIES, INITIAL_MATERIALS } from '../App';");
fs.writeFileSync('src/views/ExperimentsView.tsx', exp);

app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace('const INITIAL_MATERIALS', 'export const INITIAL_MATERIALS');
app = app.replace('const CURRENCIES =', 'export const CURRENCIES =');
app = app.replace('const UNIT_CONVERSIONS', 'export const UNIT_CONVERSIONS');
fs.writeFileSync('src/App.tsx', app);

console.log("Mop up complete!");
