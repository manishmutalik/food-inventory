const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// ── 1. Add ProductionRun import ──────────────────────────────────────────────
content = content.replace(
`import { IngredientSelectorModal } from './components/IngredientSelectorModal';`,
`import { IngredientSelectorModal } from './components/IngredientSelectorModal';
import { ProductionRunModal, ProductionRun, ProductionPurpose } from './components/ProductionRunModal';`
);

// ── 2. Add Factory icon import ───────────────────────────────────────────────
content = content.replace(
`  Loader2,
  Sparkles
} from 'lucide-react';`,
`  Loader2,
  Sparkles,
  Factory
} from 'lucide-react';`
);

// ── 3. Add finishedGoodsStock to MenuItem interface ──────────────────────────
content = content.replace(
`interface MenuItem {
  id: string;
  name: string;
  recipe: IngredientRequirement[];
  sellingPrice: number;
}`,
`interface MenuItem {
  id: string;
  name: string;
  recipe: IngredientRequirement[];
  sellingPrice: number;
  servings?: number;
  finishedGoodsStock?: number;
}`
);

// ── 4. Add productionRuns state after experiments state ──────────────────────
content = content.replace(
`  const [experiments, setExperiments] = useState<RecipeExperiment[]>([]);`,
`  const [experiments, setExperiments] = useState<RecipeExperiment[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [isProductionRunModalOpen, setIsProductionRunModalOpen] = useState(false);
  const [productionFilterRecipe, setProductionFilterRecipe] = useState('');
  const [productionFilterPurpose, setProductionFilterPurpose] = useState('');`
);

// ── 5. Add Firestore listener for productionRuns ─────────────────────────────
content = content.replace(
`    // Settings
    const unsubSettings = onSnapshot(doc(db, 'users', userId, 'settings', 'bakery')`,
`    // Production Runs
    const unsubProductionRuns = onSnapshot(collection(db, 'users', userId, 'productionRuns'), (snapshot) => {
      const runs = snapshot.docs.map(doc => doc.data() as ProductionRun);
      setProductionRuns(runs);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, \`users/\${userId}/productionRuns\`));

    // Settings
    const unsubSettings = onSnapshot(doc(db, 'users', userId, 'settings', 'bakery')`
);

// ── 6. Unsubscribe productionRuns on cleanup ─────────────────────────────────
content = content.replace(
`      unsubMaterials();
      unsubMenu();
      unsubOrders();
      unsubExperiments();
      unsubSettings();`,
`      unsubMaterials();
      unsubMenu();
      unsubOrders();
      unsubExperiments();
      unsubProductionRuns();
      unsubSettings();`
);

// ── 7. Add shared deductIngredients helper + logProductionRun function ───────
content = content.replace(
`  const addOrder = async () => {`,
`  // ─── Shared ingredient deduction helper ────────────────────────────────────
  const deductIngredients = async (
    userId: string,
    recipe: { materialId: string; amount: number; unit: string }[],
    multiplier: number
  ) => {
    for (const req of recipe) {
      const mat = materials.find(m => m.id === req.materialId);
      if (!mat) continue;
      const convertedAmt = convertAmount(req.amount, req.unit || 'g', mat.unit);
      const totalDeduction = convertedAmt * multiplier;
      const newStock = parseFloat((mat.initialStock - totalDeduction).toFixed(4));
      await setDoc(
        doc(db, 'users', userId, 'materials', mat.id),
        { ...mat, initialStock: newStock },
        { merge: true }
      );
    }
  };

  // ─── Log a production run ─────────────────────────────────────────────────
  const logProductionRun = async (
    runData: Omit<ProductionRun, 'id' | 'createdAt'>
  ) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const run: ProductionRun = { ...runData, id, createdAt: Date.now() };

    try {
      // 1. Deduct raw materials
      const item = menu.find(m => m.id === runData.recipeId);
      if (item) {
        await deductIngredients(userId, item.recipe, runData.quantityProduced);
      }

      // 2. Add finished goods (if purpose warrants it)
      const STOCK_PURPOSES: ProductionPurpose[] = ['customer_order', 'market_stock', 'other'];
      if (STOCK_PURPOSES.includes(runData.purpose)) {
        const effectiveYield = runData.quantityYield ?? runData.quantityProduced;
        const currentStock = item?.finishedGoodsStock ?? 0;
        await setDoc(
          doc(db, 'users', userId, 'menu', runData.recipeId),
          { finishedGoodsStock: currentStock + effectiveYield },
          { merge: true }
        );
      }

      // 3. Persist the run record
      await setDoc(doc(db, 'users', userId, 'productionRuns', id), run);

      showAlert('Production Run Logged', \`Recorded \${runData.quantityProduced} unit(s) of \${item?.name || 'recipe'}. Raw materials deducted.\`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, \`users/\${userId}/productionRuns/\${id}\`);
    }
  };

  const addOrder = async () => {`
);

// ── 8. Update addOrder to check finished goods stock ─────────────────────────
content = content.replace(
`  const addOrder = async () => {
    if (menu.length === 0 || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newOrder: Order = {
      id,
      menuItemId: menu[0].id,
      quantity: 1,
      date: orderDate
    };
    try {
      await setDoc(doc(db, 'users', userId, 'orders', id), newOrder);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, \`users/\${userId}/orders/\${id}\`);
    }
  };`,
`  const addOrder = async () => {
    if (menu.length === 0 || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newOrder: Order = {
      id,
      menuItemId: menu[0].id,
      quantity: 1,
      date: orderDate
    };
    try {
      await setDoc(doc(db, 'users', userId, 'orders', id), newOrder);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, \`users/\${userId}/orders/\${id}\`);
    }
  };

  // Called when an order quantity is finalised — deducts finished goods OR raw materials
  const fulfillOrder = async (order: Order) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const item = menu.find(m => m.id === order.menuItemId);
    if (!item) return;

    const stock = item.finishedGoodsStock ?? 0;

    if (stock === 0) {
      // No finished goods: legacy raw-material deduction
      await deductIngredients(userId, item.recipe, order.quantity);
    } else if (stock >= order.quantity) {
      // Enough stock: deduct finished goods only
      await setDoc(
        doc(db, 'users', userId, 'menu', item.id),
        { finishedGoodsStock: stock - order.quantity },
        { merge: true }
      );
    } else {
      // Partial: show choice
      const choice = window.confirm(
        \`Only \${stock} unit(s) of "\${item.name}" in finished stock, but order is for \${order.quantity}.\\n\\nClick OK to use raw materials for the full order.\\nClick Cancel to log a production run first.\`
      );
      if (choice) {
        await deductIngredients(userId, item.recipe, order.quantity);
        // Clear finished goods
        await setDoc(
          doc(db, 'users', userId, 'menu', item.id),
          { finishedGoodsStock: 0 },
          { merge: true }
        );
      }
      // If user cancelled, do nothing — they'll log a run first
    }
  };`
);

// ── 9. Add tab button for Production Log ─────────────────────────────────────
content = content.replace(
`            <TabButton id="experiments" label="Experiments" icon={FlaskConical} />`,
`            <TabButton id="production" label="Production" icon={Factory} />
            <TabButton id="experiments" label="Experiments" icon={FlaskConical} />`
);

// ── 10. Update activeTab type to include 'production' ────────────────────────
content = content.replace(
`  const [activeTab, setActiveTab] = useState<'inventory' | 'menu' | 'orders' | 'experiments' | 'summary' | 'settings'>(() => {`,
`  const [activeTab, setActiveTab] = useState<'inventory' | 'menu' | 'orders' | 'experiments' | 'production' | 'summary' | 'settings'>(() => {`
);

// ── 11. Add production cost aggregation to summary memos ─────────────────────
// Find and patch the filteredOrders useMemo to also cover production runs
content = content.replace(
`  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      return order.date >= summaryDateStart && order.date <= summaryDateEnd;
    });
  }, [orders, summaryDateStart, summaryDateEnd]);`,
`  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      return order.date >= summaryDateStart && order.date <= summaryDateEnd;
    });
  }, [orders, summaryDateStart, summaryDateEnd]);

  const filteredProductionRuns = useMemo(() => {
    return productionRuns.filter(r => r.date >= summaryDateStart && r.date <= summaryDateEnd);
  }, [productionRuns, summaryDateStart, summaryDateEnd]);

  const totalProductionCost = useMemo(() => {
    return filteredProductionRuns.reduce((sum, r) => sum + (r.costTotal || 0), 0);
  }, [filteredProductionRuns]);`
);

// ── 12. Add "In Stock" chip to recipe list ────────────────────────────────────
// Find the recipe list item where name is shown and add chip
content = content.replace(
`                            <h3 className="text-lg font-bold text-stone-800 font-serif">{item.name}</h3>`,
`                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-bold text-stone-800 font-serif">{item.name}</h3>
                              {item.finishedGoodsStock !== undefined && item.finishedGoodsStock > 0 && (
                                <span className={\`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full \${item.finishedGoodsStock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}\`}>
                                  In Stock: {item.finishedGoodsStock}
                                </span>
                              )}
                              {item.finishedGoodsStock === 0 && (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-rose-100 text-rose-600">
                                  Out of Stock
                                </span>
                              )}
                            </div>`
);

// ── 13. Add Production Run Modal render ───────────────────────────────────────
content = content.replace(
`      <IngredientSelectorModal
        isOpen={isIngredientSelectorOpen}`,
`      <ProductionRunModal
        isOpen={isProductionRunModalOpen}
        onClose={() => setIsProductionRunModalOpen(false)}
        menu={menu}
        materials={materials}
        onSave={logProductionRun}
        currency={currency}
      />
      <IngredientSelectorModal
        isOpen={isIngredientSelectorOpen}`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Phase 1+2+3 patched successfully.');
