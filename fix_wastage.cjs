const fs = require('fs');
const c = fs.readFileSync('src/App_old.tsx', 'utf8');
const wStart = c.indexOf("{activeTab === 'wastage' && (");
if (wStart === -1) {
  console.log("NOT FOUND");
} else {
  const nextCode = c.slice(wStart, wStart + 8000);
  const wEnd = nextCode.lastIndexOf('</motion.div>') + '</motion.div>'.length;
  fs.writeFileSync('src/views/WastageView.tsx', `import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  Plus, Trash2, ChevronRight, ChevronDown, Package, Utensils, ClipboardList, Calculator,
  Save, RotateCcw, AlertCircle, CheckCircle2, Check, Info, Database, RefreshCw, Copy,
  DollarSign, Globe, Calendar, Filter, ArrowLeft, ArrowRight, Clock, Settings, Settings2,
  Layers, UserCog, Puzzle, User as UserIcon, LogOut, Image, Palette, Store, Mail, Phone,
  MapPin, UserCircle, TrendingUp, TrendingDown, Activity, ShoppingBag, BarChart3, Edit2,
  LogIn, FlaskConical, Sparkles, Factory, Download, Upload, X
} from 'lucide-react';
import { AppViewProps } from '../types';

export const WastageView: React.FC<AppViewProps> = (props) => {
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
    ${nextCode.slice("{activeTab === 'wastage' && (".length, wEnd)}
  );
};
`);
  console.log("WastageView.tsx fixed!");
}
