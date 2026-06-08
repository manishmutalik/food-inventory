const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
`  const [inventorySortOrder, setInventorySortOrder] = useState<'asc' | 'desc'>('asc');`,
`  const [inventorySortOrder, setInventorySortOrder] = useState<'asc' | 'desc'>('asc');
  const [isIngredientSelectorOpen, setIsIngredientSelectorOpen] = useState(false);
  const [activeRecipeItemId, setActiveRecipeItemId] = useState<string | null>(null);`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Added states.');
