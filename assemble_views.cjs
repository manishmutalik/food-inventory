const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'src', 'views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.raw.tsx'));

const iconImports = `import { 
  Plus, Trash2, ChevronRight, ChevronDown, Package, Utensils, ClipboardList, Calculator,
  Save, RotateCcw, AlertCircle, CheckCircle2, Check, Info, Database, RefreshCw, Copy,
  DollarSign, Globe, Calendar, Filter, ArrowLeft, ArrowRight, Clock, Settings, Settings2,
  Layers, UserCog, Puzzle, User as UserIcon, LogOut, Image, Palette, Store, Mail, Phone,
  MapPin, UserCircle, TrendingUp, TrendingDown, Activity, ShoppingBag, BarChart3, Edit2,
  LogIn, FlaskConical, Sparkles, Factory, Download, Upload, X
} from 'lucide-react';`;

const header = `import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
${iconImports}
import { AppViewProps } from '../types';
import { IngredientSelectorModal } from '../components/IngredientSelectorModal';
import { ProductionRunModal } from '../components/ProductionRunModal';
import { CURRENCIES, INITIAL_MATERIALS } from '../utils/constants';

`;

for (const file of files) {
  const viewName = file.replace('.raw.tsx', '');
  let rawJsx = fs.readFileSync(path.join(viewsDir, file), 'utf8');

  // Remove the wrapper: e.g. `{activeTab === 'inventory' && (` and the trailing `)}`
  const firstParenIndex = rawJsx.indexOf('(');
  if (firstParenIndex !== -1 && rawJsx.trim().startsWith('{activeTab')) {
    let unclosed = 1;
    let endIndex = -1;
    for (let i = firstParenIndex + 1; i < rawJsx.length; i++) {
      if (rawJsx[i] === '(') unclosed++;
      else if (rawJsx[i] === ')') unclosed--;
      
      if (unclosed === 0) {
        endIndex = i;
        break;
      }
    }
    if (endIndex !== -1) {
      rawJsx = rawJsx.slice(firstParenIndex + 1, endIndex);
    }
  }

  // Very last step: wrap in component
  const content = `${header}
export const ${viewName}: React.FC<AppViewProps> = (props) => {
  // Destructure all props to make variables available in the scope
  const {
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
  } = props;

  return (
    ${rawJsx.trim()}
  );
};
`;
  
  fs.writeFileSync(path.join(viewsDir, `${viewName}.tsx`), content);
  fs.unlinkSync(path.join(viewsDir, file)); // delete raw
  console.log(`Created ${viewName}.tsx`);
}
