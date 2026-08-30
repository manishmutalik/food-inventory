const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

const importStatement = `import { InventoryView } from './views/InventoryView';
import { MenuView } from './views/MenuView';
import { OrdersView } from './views/OrdersView';
import { ProductionView } from './views/ProductionView';
import { ExperimentsView } from './views/ExperimentsView';
import { SummaryView } from './views/SummaryView';
import { WastageView } from './views/WastageView';
import { SettingsView } from './views/SettingsView';
`;

const propsObj = `
  const appProps = {
    materials, setMaterials, categories, setCategories, menu, setMenu, orders, setOrders,
    experiments, setExperiments, productionRuns, setProductionRuns, wastageLogs, setWastageLogs,
    isProductionRunModalOpen, setIsProductionRunModalOpen, productionFilterRecipe, setProductionFilterRecipe,
    productionFilterPurpose, setProductionFilterPurpose, activeTab, setActiveTab, activeSettingsTab,
    setActiveSettingsTab, currency, setCurrency, summaryRange, setSummaryRange, summaryDateStart,
    setSummaryDateStart, summaryDateEnd, setSummaryDateEnd, orderDate, setOrderDate, orderFilterStart,
    setOrderFilterStart, orderFilterEnd, setOrderFilterEnd, isAddOrderModalOpen, setIsAddOrderModalOpen,
    modalOrderDate, setModalOrderDate, modalCustomerName, setModalCustomerName, modalCustomerPhone,
    setModalCustomerPhone, modalLineItems, setModalLineItems, isSavingOrder, setIsSavingOrder,
    summaryRefDate, setSummaryRefDate, expandedRecipeId, setExpandedRecipeId, inventorySortBy,
    setInventorySortBy, inventorySortOrder, setInventorySortOrder, isIngredientSelectorOpen,
    setIsIngredientSelectorOpen, activeRecipeItemId, setActiveRecipeItemId, settings, setSettings,
    user, isAlertDismissed, setIsAlertDismissed, isExpiredAlertDismissed, setIsExpiredAlertDismissed,
    inventoryUsage, summaryInventoryUsage, remainingInventory, sortedRemainingInventory, lowStockItems,
    summaryFinancials, activeOrdersCount, averageOrderValue, financials, chartData, handleRangeChange,
    refreshData, addMaterial, addCategory, deleteCategory, updateMaterial, deleteMaterial,
    addMenuItem, updateMenuItem, updateMenuItemField, deleteMenuItem, clearFinishedGoodsStock,
    addExperiment, updateExperiment, deleteExperiment, addMaterialToExperiment, updateExperimentMaterial,
    removeMaterialFromExperiment, processVoiceCommand, startListening, copyMenuItem, addIngredientToRecipe,
    addQuickIngredientsToRecipe, updateRecipeIngredient, removeIngredientFromRecipe, logProductionRun,
    deleteProductionRun, handleDiscardBatch, addOrder, updateOrder, deleteOrder, resetOrders, saveSettings,
    handleRestock, isRestockModalOpen, setIsRestockModalOpen, restockMaterial, setRestockMaterial,
    restockQuantity, setRestockQuantity, restockCost, setRestockCost, showSaveFeedback, saveDay,
    updateCurrency, handleLogout, isListening, transcript, convertAmount
  };
`;

const viewsJSX = `
          <AnimatePresence mode="wait">
            {activeTab === 'inventory' && <InventoryView key="inventory" {...appProps} />}
            {activeTab === 'menu' && <MenuView key="menu" {...appProps} />}
            {activeTab === 'orders' && <OrdersView key="orders" {...appProps} />}
            {activeTab === 'production' && <ProductionView key="production" {...appProps} />}
            {activeTab === 'experiments' && <ExperimentsView key="experiments" {...appProps} />}
            {activeTab === 'summary' && <SummaryView key="summary" {...appProps} />}
            {activeTab === 'wastage' && <WastageView key="wastage" {...appProps} />}
            {activeTab === 'settings' && <SettingsView key="settings" {...appProps} />}
          </AnimatePresence>
`;

// Insert imports
content = content.replace("import Papa from 'papaparse';", "import Papa from 'papaparse';\n" + importStatement);

// Insert propsObj right before return (
const returnIdx = content.lastIndexOf('return (');
if (returnIdx !== -1) {
  content = content.slice(0, returnIdx) + propsObj + '\n  ' + content.slice(returnIdx);
}

// Replace AnimatePresence block
const apStart = content.lastIndexOf('<AnimatePresence mode="wait">');
const apEnd = content.indexOf('</AnimatePresence>', apStart) + '</AnimatePresence>'.length;

if (apStart !== -1 && apEnd !== -1) {
  content = content.slice(0, apStart) + viewsJSX.trim() + content.slice(apEnd);
}

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx updated to use View components');
