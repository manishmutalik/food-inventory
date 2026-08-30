const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
let typesContent = fs.readFileSync(typesPath, 'utf8');

const appProps = `
export interface AppViewProps {
  materials: RawMaterial[];
  setMaterials: (m: RawMaterial[]) => void;
  categories: string[];
  setCategories: (c: string[]) => void;
  menu: MenuItem[];
  setMenu: (m: MenuItem[]) => void;
  orders: Order[];
  setOrders: (o: Order[]) => void;
  experiments: RecipeExperiment[];
  setExperiments: (e: RecipeExperiment[]) => void;
  productionRuns: ProductionRun[];
  setProductionRuns: (p: ProductionRun[]) => void;
  wastageLogs: WastageLog[];
  setWastageLogs: (w: WastageLog[]) => void;
  
  isProductionRunModalOpen: boolean;
  setIsProductionRunModalOpen: (b: boolean) => void;
  productionFilterRecipe: string;
  setProductionFilterRecipe: (s: string) => void;
  productionFilterPurpose: string;
  setProductionFilterPurpose: (s: string) => void;
  
  activeTab: string;
  setActiveTab: (t: any) => void;
  activeSettingsTab: string;
  setActiveSettingsTab: (t: any) => void;
  
  currency: any;
  setCurrency: (c: any) => void;
  summaryRange: string;
  setSummaryRange: (s: string) => void;
  summaryDateStart: string;
  setSummaryDateStart: (s: string) => void;
  summaryDateEnd: string;
  setSummaryDateEnd: (s: string) => void;
  
  orderDate: string;
  setOrderDate: (s: string) => void;
  orderFilterStart: string;
  setOrderFilterStart: (s: string) => void;
  orderFilterEnd: string;
  setOrderFilterEnd: (s: string) => void;
  
  isAddOrderModalOpen: boolean;
  setIsAddOrderModalOpen: (b: boolean) => void;
  modalOrderDate: string;
  setModalOrderDate: (s: string) => void;
  modalCustomerName: string;
  setModalCustomerName: (s: string) => void;
  modalCustomerPhone: string;
  setModalCustomerPhone: (s: string) => void;
  modalLineItems: any[];
  setModalLineItems: (l: any[]) => void;
  isSavingOrder: boolean;
  setIsSavingOrder: (b: boolean) => void;
  
  summaryRefDate: string;
  setSummaryRefDate: (s: string) => void;
  expandedRecipeId: string | null;
  setExpandedRecipeId: (id: string | null) => void;
  inventorySortBy: string;
  setInventorySortBy: (s: string) => void;
  inventorySortOrder: string;
  setInventorySortOrder: (s: string) => void;
  isIngredientSelectorOpen: boolean;
  setIsIngredientSelectorOpen: (b: boolean) => void;
  activeRecipeItemId: string | null;
  setActiveRecipeItemId: (id: string | null) => void;
  
  settings: BakerySettings;
  setSettings: (s: BakerySettings) => void;
  
  user: any;
  
  isAlertDismissed: boolean;
  setIsAlertDismissed: (b: boolean) => void;
  isExpiredAlertDismissed: boolean;
  setIsExpiredAlertDismissed: (b: boolean) => void;

  inventoryUsage: any;
  summaryInventoryUsage: any;
  remainingInventory: any;
  sortedRemainingInventory: any;
  lowStockItems: any[];
  summaryFinancials: any;
  activeOrdersCount: number;
  averageOrderValue: number;
  financials: any;
  chartData: any[];

  handleRangeChange: (r: any, d?: any) => void;
  refreshData: () => void;
  addMaterial: (m: any) => void;
  addCategory: (c: string) => void;
  deleteCategory: (c: string) => void;
  updateMaterial: (id: string, f: string, v: any) => void;
  deleteMaterial: (id: string) => void;
  addMenuItem: () => void;
  updateMenuItem: (id: string, m: any) => void;
  updateMenuItemField: (id: string, f: string, v: any) => void;
  deleteMenuItem: (id: string) => void;
  clearFinishedGoodsStock: (id: string) => void;
  addExperiment: () => void;
  updateExperiment: (id: string, f: string, v: any) => void;
  deleteExperiment: (id: string) => void;
  addMaterialToExperiment: (id: string) => void;
  updateExperimentMaterial: (id: string, mId: string, f: string, v: any) => void;
  removeMaterialFromExperiment: (id: string, mId: string) => void;
  processVoiceCommand: (t: string) => void;
  startListening: () => void;
  copyMenuItem: (id: string) => void;
  addIngredientToRecipe: (id: string) => void;
  addQuickIngredientsToRecipe: (id: string, q: any[]) => void;
  updateRecipeIngredient: (id: string, i: number, f: string, v: any) => void;
  removeIngredientFromRecipe: (id: string, i: number) => void;
  logProductionRun: (r: any) => void;
  deleteProductionRun: (id: string) => void;
  handleDiscardBatch: (b: any) => void;
  addOrder: (o: any) => void;
  updateOrder: (id: string, f: string, v: any) => void;
  deleteOrder: (id: string) => void;
  resetOrders: () => void;
  saveSettings: () => void;
  handleRestock: (m: any, qty: number, cost: number) => void;
  isRestockModalOpen: boolean;
  setIsRestockModalOpen: (b: boolean) => void;
  restockMaterial: any;
  setRestockMaterial: (m: any) => void;
  restockQuantity: string;
  setRestockQuantity: (s: string) => void;
  restockCost: string;
  setRestockCost: (s: string) => void;

  showSaveFeedback: boolean;
  saveDay: () => void;
  updateCurrency: (c: any) => void;
  handleLogout: () => void;
  
  isListening: boolean;
  transcript: string;
  convertAmount: (a: number, f: string, t: string) => number;
}
`;

fs.writeFileSync(typesPath, typesContent + appProps);
console.log('AppViewProps added to types/index.ts');
