const fs = require('fs');

const missingProps = `
  patchMaterial: any;
  setRestockExpiryDate: any;
  shopifyStatus: any;
  importShopifyOrders: any;
  isImportingShopify: any;
  odooStatus: any;
  importOdooOrders: any;
  isImportingOdoo: any;
`;

// 1. Fix types/index.ts
let types = fs.readFileSync('src/types/index.ts', 'utf8');
types = types.replace('} = props;', missingProps + '\n} = props;');
types = types.replace(/}\s*$/, missingProps + '\n}');
fs.writeFileSync('src/types/index.ts', types);

// 2. Fix App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace('const appProps: any = {', `const appProps: any = { patchMaterial: ()=>{}, setRestockExpiryDate: ()=>{}, shopifyStatus: {}, importShopifyOrders: ()=>{}, isImportingShopify: false, odooStatus: {}, importOdooOrders: ()=>{}, isImportingOdoo: false,`);
fs.writeFileSync('src/App.tsx', app);

// 3. Fix Views imports
const views = fs.readdirSync('src/views');
for (const v of views) {
  let c = fs.readFileSync('src/views/' + v, 'utf8');
  c = c.replace("import { CURRENCIES, INITIAL_MATERIALS } from '../utils/constants';", "import { CURRENCIES, INITIAL_MATERIALS } from '../App';\nimport { UNIT_CONVERSIONS } from '../App';");
  c = c.replace('const {', 'const { patchMaterial, setRestockExpiryDate, shopifyStatus, importShopifyOrders, isImportingShopify, odooStatus, importOdooOrders, isImportingOdoo,');
  fs.writeFileSync('src/views/' + v, c);
}

console.log("Mole whacked!");
