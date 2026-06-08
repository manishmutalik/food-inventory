const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add Quick Add button before mapped category buttons
content = content.replace(
`                              <div className="flex items-center gap-3">
                                {categories.map(cat => (
                                  <button `,
`                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => {
                                    setActiveRecipeItemId(item.id);
                                    setIsIngredientSelectorOpen(true);
                                  }}
                                  className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-primary/20 hover:bg-primary/20 transition-all shadow-sm active:scale-95"
                                >
                                  <Sparkles size={14} />
                                  Quick Add
                                </button>
                                {categories.map(cat => (
                                  <button `
);

fs.writeFileSync('src/App.tsx', content);
console.log('Restored Quick Add Button successfully.');
