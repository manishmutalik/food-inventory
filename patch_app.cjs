const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add customerName, customerPhone to Order
content = content.replace(
`interface Order {
  id: string;
  menuItemId: string;
  quantity: number;
  date: string; // YYYY-MM-DD
}`,
`export interface Order {
  id: string;
  menuItemId: string;
  quantity: number;
  date: string; // YYYY-MM-DD
  customerName?: string;
  customerPhone?: string;
}

export function getDefaultRecipeUnit(inventoryUnit: string | undefined): string {
  if (!inventoryUnit) return 'g';
  const u = inventoryUnit.toLowerCase();
  if (u === 'kg' || u === 'g') return 'g';
  if (u === 'l' || u === 'ml') return 'ml';
  return u;
}

export interface QuickIngredient {
  materialId: string;
  amount: number;
  unit: string;
  name?: string;
}`);

// 2. Add IngredientSelectorModal import
content = content.replace(
`import { Activity, Settings as SettingsIcon, LogOut, ChevronRight, ShoppingBag, Plus, Save, Trash2, Edit2, Search, X, Package, Check, RefreshCw, Smartphone, MonitorSmartphone, Store, Bell, AlertTriangle, Play, Sparkles, Mic, MicOff } from 'lucide-react';`,
`import { Activity, Settings as SettingsIcon, LogOut, ChevronRight, ShoppingBag, Plus, Save, Trash2, Edit2, Search, X, Package, Check, RefreshCw, Smartphone, MonitorSmartphone, Store, Bell, AlertTriangle, Play, Sparkles, Mic, MicOff } from 'lucide-react';
import { IngredientSelectorModal } from './components/IngredientSelectorModal';`
);

// 3. Add states for IngredientSelectorModal
content = content.replace(
`const [editableCostIds, setEditableCostIds] = useState<Set<string>>(new Set());`,
`const [editableCostIds, setEditableCostIds] = useState<Set<string>>(new Set());
  const [isIngredientSelectorOpen, setIsIngredientSelectorOpen] = useState(false);
  const [activeRecipeItemId, setActiveRecipeItemId] = useState<string | null>(null);`
);

// 4. Update importShopifyOrders map
content = content.replace(
`            newOrders.push({
              id: Math.random().toString(36).substr(2, 9),
              menuItemId: menuItem.id,
              quantity: li.quantity,
              date: orderDate
            });`,
`            newOrders.push({
              id: Math.random().toString(36).substr(2, 9),
              menuItemId: menuItem.id,
              quantity: li.quantity,
              date: orderDate,
              customerName: so.customer ? \`\${so.customer.first_name || ''} \${so.customer.last_name || ''}\`.trim() : '',
              customerPhone: so.customer?.phone || so.phone || ''
            });`
);

// 5. Update importOdooOrders map
content = content.replace(
`            newOrders.push({
              id: \`odoo-\${oo.id}-\${li.id}\`,
              menuItemId: menuItem.id,
              quantity: li.product_uom_qty,
              date: orderDate
            });`,
`            newOrders.push({
              id: \`odoo-\${oo.id}-\${li.id}\`,
              menuItemId: menuItem.id,
              quantity: li.product_uom_qty,
              date: orderDate,
              customerName: oo.partner_id ? oo.partner_id[1] : '',
              customerPhone: ''
            });`
);

// 6. Update addIngredientToRecipe
content = content.replace(
`  const addIngredientToRecipe = async (itemId: string, category: string = 'Raw Materials') => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const filteredMaterials = materials.filter(m => m.category === category);
    if (filteredMaterials.length === 0) {
      showAlert("No Materials", \`Please add some materials to the '\${category}' category first.\`);
      return;
    }
    const defaultMaterial = filteredMaterials[0];
    const item = menu.find(m => m.id === itemId);
    if (!item) return;
    
    const newRecipe = [...item.recipe, { materialId: defaultMaterial.id, amount: 0, unit: defaultMaterial.unit }];`,
`  const addIngredientToRecipe = async (itemId: string, category: string = 'Raw Materials') => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const filteredMaterials = materials.filter(m => m.category === category);
    if (filteredMaterials.length === 0) {
      showAlert("No Materials", \`Please add some materials to the '\${category}' category first.\`);
      return;
    }
    const defaultMaterial = filteredMaterials[0];
    const item = menu.find(m => m.id === itemId);
    if (!item) return;
    
    const newRecipe = [...item.recipe, { materialId: defaultMaterial.id, amount: 0, unit: getDefaultRecipeUnit(defaultMaterial.unit) }];`
);

// 7. Add addQuickIngredientsToRecipe right after
content = content.replace(
`    try {
      await setDoc(doc(db, 'users', userId, 'menu', itemId), { 
        ...item,
        recipe: newRecipe 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, \`users/\${userId}/menu/\${itemId}\`);
    }
  };

  const updateRecipeIngredient =`,
`    try {
      await setDoc(doc(db, 'users', userId, 'menu', itemId), { 
        ...item,
        recipe: newRecipe 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, \`users/\${userId}/menu/\${itemId}\`);
    }
  };

  const addQuickIngredientsToRecipe = async (itemId: string, quickIngredients: QuickIngredient[]) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const item = menu.find(m => m.id === itemId);
    if (!item) return;
    
    const newRecipe = [...item.recipe, ...quickIngredients];
    try {
      await setDoc(doc(db, 'users', userId, 'menu', itemId), { 
        ...item,
        recipe: newRecipe 
      }, { merge: true });
      showAlert("Success", \`Added \${quickIngredients.length} ingredients to recipe.\`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, \`users/\${userId}/menu/\${itemId}\`);
    }
  };

  const updateRecipeIngredient =`
);

// 8. Update updateRecipeIngredient unit
content = content.replace(
`    if (field === 'materialId') {
      const newMat = materials.find(m => m.id === value);
      if (newMat) {
        updatedIngredient.unit = newMat.unit;
      }
    }`,
`    if (field === 'materialId') {
      const newMat = materials.find(m => m.id === value);
      if (newMat) {
        updatedIngredient.unit = getDefaultRecipeUnit(newMat.unit);
      }
    }`
);

// 9. Remove Servings UI
content = content.replace(
`                                </div>
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100">
                                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Servings</h4>
                                  <ServingsInput
                                    value={item.servings ?? 1}
                                    onChange={(num) => updateMenuItemField(item.id, 'servings', num)}
                                    className="w-16 bg-stone-50 border border-stone-150 rounded-xl px-2 py-1 text-sm font-mono font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 outline-none mt-0.5"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">`,
`                                </div>
                              </div>
                              <div className="flex items-center gap-3">`
);

content = content.replace(
`                              <div className="bg-stone-50 p-6 border-t border-stone-100 flex-1">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                                    <Activity size={16} className="text-primary" />
                                    Nutrition Profile
                                  </h4>
                                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Per Serving ({servings} serving{servings > 1 ? 's' : ''}/recipe)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{(calories / servings).toFixed(0)}</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Calories</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{(protein / servings).toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Protein</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{(carbs / servings).toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Carbs</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{(fat / servings).toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Fat</div>
                                  </div>
                                </div>
                                
                                {sugar > 0 && (
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-sm font-bold text-stone-600">Includes {(sugar / servings).toFixed(1)}g Sugar</div>
                                  </div>
                                )}
                              </div>`,
`                              <div className="bg-stone-50 p-6 border-t border-stone-100 flex-1">
                                <h4 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                                  <Activity size={16} className="text-primary" />
                                  Nutrition Profile
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{calories.toFixed(0)}</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Calories</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{protein.toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Protein</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{carbs.toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Carbs</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{fat.toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Fat</div>
                                  </div>
                                </div>
                                
                                {sugar > 0 && (
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-sm font-bold text-stone-600">Includes {sugar.toFixed(1)}g Sugar</div>
                                  </div>
                                )}
                              </div>`
);


// 10. Add Quick Add Button
content = content.replace(
`                                <div className="flex gap-2">
                                  <button
                                    onClick={() => addIngredientToRecipe(item.id)}
                                    className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors flex items-center gap-1"
                                  >
                                    <Plus size={12} />
                                    Add Manual
                                  </button>
                                </div>`,
`                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setActiveRecipeItemId(item.id);
                                      setIsIngredientSelectorOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors flex items-center gap-1"
                                  >
                                    <Sparkles size={12} />
                                    Quick Add
                                  </button>
                                  <button
                                    onClick={() => addIngredientToRecipe(item.id)}
                                    className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors flex items-center gap-1"
                                  >
                                    <Plus size={12} />
                                    Add Manual
                                  </button>
                                </div>`
);

// 11. Add IngredientSelectorModal to render
content = content.replace(
`      {modalConfig.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">`,
`      <IngredientSelectorModal
        isOpen={isIngredientSelectorOpen}
        onClose={() => {
          setIsIngredientSelectorOpen(false);
          setActiveRecipeItemId(null);
        }}
        materials={materials}
        categories={categories}
        onAddSelected={(ingredients) => {
          if (activeRecipeItemId) {
            addQuickIngredientsToRecipe(activeRecipeItemId, ingredients);
          }
        }}
      />
      {modalConfig.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">`
);

// 12. Fix Order table UI to show customer name and phone
content = content.replace(
`                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Item</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Qty</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredOrders.map(order => {
                      const item = menu.find(m => m.id === order.menuItemId);
                      const basePrice = (item?.sellingPrice || 0) * order.quantity;
                      const withGst = settings.hasGstNumber ? basePrice * 1.05 : basePrice;
                      
                      return (
                        <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-stone-500">{order.id}</td>
                          <td className="px-6 py-4 text-sm text-stone-600">{new Date(order.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-stone-800">{item?.name || 'Unknown Item'}</div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-stone-700">{order.quantity}</td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-stone-900 font-serif">
                            {currency.symbol}{withGst.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>`,
`                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Customer</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Item</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Qty</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredOrders.map(order => {
                      const item = menu.find(m => m.id === order.menuItemId);
                      const basePrice = (item?.sellingPrice || 0) * order.quantity;
                      const withGst = settings.hasGstNumber ? basePrice * 1.05 : basePrice;
                      
                      return (
                        <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-stone-500">{order.id}</td>
                          <td className="px-6 py-4 text-sm text-stone-600">{new Date(order.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-stone-800">{order.customerName || '-'}</div>
                            {order.customerPhone && <div className="text-xs text-stone-500">{order.customerPhone}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-stone-800">{item?.name || 'Unknown Item'}</div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-stone-700">{order.quantity}</td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-stone-900 font-serif">
                            {currency.symbol}{withGst.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched App.tsx successfully.');
