// ─── Imports ──────────────────────────────────────────────────────────────────
// React core, UI icon library, Firebase auth/Firestore, animation, AI, charting
import * as React from 'react';
import { useState, useEffect, useMemo, Component } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Package, 
  Utensils, 
  ClipboardList, 
  Calculator,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Check,
  Info,
  Database,
  RefreshCw,
  Copy,
  DollarSign,
  Globe,
  Calendar,
  Filter,
  ArrowLeft,
  ArrowRight,
  Clock,
  Settings,
  Settings2,
  Layers,
  UserCog,
  Puzzle,
  User as UserIcon,
  LogOut,
  Image,
  Palette,
  Store,
  Mail,
  Phone,
  MapPin,
  UserCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  ShoppingBag,
  BarChart3,
  Edit2,
  LogIn,
  FlaskConical,
  Sparkles,
  Factory,
  Download,
  Upload,
  X
} from 'lucide-react';
import Papa from 'papaparse';
import { IngredientSelectorModal } from './components/IngredientSelectorModal';
import { ProductionRunModal, ProductionRun, ProductionPurpose } from './components/ProductionRunModal';
import { motion, AnimatePresence } from 'motion/react';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  collection, 
  doc, 
  setDoc, 
  addDoc,
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch
} from './firebase';

// ─── Error Handling ───────────────────────────────────────────────────────────

/**
 * Enumerates the type of Firestore operation being performed.
 * Used by `handleFirestoreError` to enrich error logs.
 */
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Structured error payload captured when a Firestore operation fails.
 * Includes the raw error message, operation type, collection path,
 * and a snapshot of the currently authenticated user's state.
 */
interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/**
 * Centralised Firestore error handler.
 *
 * Serialises the error together with current auth context into a
 * `FirestoreErrorInfo` JSON blob, logs it to the console, then
 * re-throws so that the `ErrorBoundary` can surface it to the user.
 *
 * @param error        - The raw caught error value.
 * @param operationType - The CRUD operation that failed (see `OperationType`).
 * @param path         - The Firestore document/collection path being accessed, or null.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

/**
 * Top-level React error boundary that wraps `BakeryApp`.
 *
 * Catches any uncaught render-time errors (including re-thrown errors from
 * `handleFirestoreError`) and renders a friendly error card with a
 * "Reload Application" button instead of a blank screen.
 *
 * Error messages are expected to be JSON-serialised `FirestoreErrorInfo`
 * strings; if parsing fails, the raw message is displayed.
 */
class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo);
        if (parsed.error) displayMessage = `Database Error: ${parsed.error}`;
      } catch (e) {
        displayMessage = this.state.errorInfo;
      }

      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] shadow-xl border border-stone-200 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">Application Error</h2>
            <p className="text-stone-600 mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Type Definitions ─────────────────────────────────────────────────────────

/**
 * A raw ingredient or packaging material tracked in inventory.
 *
 * `initialStock` represents the current on-hand quantity (updated on restock
 * and decremented by `deductIngredients`).
 * `threshold` is a percentage (0–100) of initialStock below which a low-stock
 * alert is triggered.
 */
export interface InventoryBatch {
  id: string;
  originalQuantity: number;
  remainingQuantity: number;
  expiryDate: string; // YYYY-MM-DD
  costPerUnit: number;
  dateAdded: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  initialStock: number; // Sum of all batch remaining quantities
  batches?: InventoryBatch[];
  costPerUnit: number;
  category: string;
  threshold?: number;
  dateAdded: string;
  expiryDate?: string; // YYYY-MM-DD — expiry of the current/latest stock batch
  gstRate?: number;
}

export interface WastageLog {
  id: string;
  type: 'material' | 'recipe';
  itemId: string;
  quantity: number;
  cost: number;
  date: string;
  reason: string;
}

/**
 * A single ingredient line in a recipe — how much of a `RawMaterial` is
 * needed per unit produced, expressed in the recipe's chosen unit.
 */
interface IngredientRequirement {
  materialId: string;
  amount: number;
  unit: string;
}

/**
 * A sellable product defined by its recipe and selling price.
 *
 * `finishedGoodsStock` tracks pre-baked units available for immediate sale,
 * populated by production runs and decremented on order fulfilment.
 */
interface MenuItem {
  id: string;
  name: string;
  recipe: IngredientRequirement[];
  sellingPrice: number;
  servings?: number;
  finishedGoodsStock?: number;
  shelfLifeDays?: number;
  emoji?: string;
}

/**
 * A sales order for a single menu item on a specific date.
 * Exported so that sibling components (e.g. ProductionRunModal) can import it.
 */
export interface Order {
  id: string;
  menuItemId: string;
  quantity: number;
  date: string; // YYYY-MM-DD
  customerName?: string;
  customerPhone?: string;
}

/**
 * Returns the default recipe unit for a given inventory unit.
 *
 * Weight-based materials (kg/g) default to 'g'; volume-based (l/ml) default
 * to 'ml'; all other units are passed through unchanged.
 *
 * @param inventoryUnit - The unit string stored on a `RawMaterial`.
 * @returns The recommended recipe-level unit string.
 */
export function getDefaultRecipeUnit(inventoryUnit: string | undefined): string {
  if (!inventoryUnit) return 'g';
  const u = inventoryUnit.toLowerCase();
  if (u === 'kg' || u === 'g') return 'g';
  if (u === 'l' || u === 'ml') return 'ml';
  return u;
}

/**
 * A lightweight ingredient descriptor used by the IngredientSelectorModal
 * to batch-add multiple ingredients to a recipe in one action.
 */
export interface QuickIngredient {
  materialId: string;
  amount: number;
  unit: string;
  name?: string;
}

/**
 * A recipe R&D session that consumes raw materials but produces no sellable goods.
 * Experiment costs are tracked separately from order expenses in financial reports.
 */
interface RecipeExperiment {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  materials: IngredientRequirement[];
  notes?: string;
}

/**
 * User-configurable bakery profile settings persisted to Firestore at
 * `users/{userId}/settings/bakery`.
 */
interface BakerySettings {
  name: string;
  logo: string;
  primaryColor: string;
  address: string;
  phone: string;
  email: string;
}

/**
 * Minimal representation of the signed-in Firebase user surfaced to the UI.
 */
interface AppUser {
  email: string;
  name: string;
}

// ─── Seed / Initial Data ─────────────────────────────────────────────────────────
// Displayed before Firestore data loads (unauthenticated / first-run state).

// ─── Seed Wastage Logs (Demo / first-run placeholder) ───────────────────────
const INITIAL_WASTAGE_LOGS: WastageLog[] = [
  // Raw-material wastages (quantities in the material's native unit)
  // Butter: 0.5 kg × ₹500/kg = ₹250
  { id: 'wl1', type: 'material', itemId: '3', quantity: 0.5, cost: 250, date: '2026-06-10', reason: 'Butter exceeded use-by date — batch discarded' },
  // Flour: 0.8 kg × ₹45/kg = ₹36
  { id: 'wl2', type: 'material', itemId: '1', quantity: 0.8, cost: 36, date: '2026-06-13', reason: 'Flour contaminated with moisture — disposal required' },
  // Milk: 0.6 l × ₹60/l = ₹36
  { id: 'wl3', type: 'material', itemId: '5', quantity: 0.6, cost: 36, date: '2026-06-15', reason: 'Whole milk souring detected — full batch discarded' },
  // Eggs: 6 pcs × ₹8/pc = ₹48
  { id: 'wl4', type: 'material', itemId: '4', quantity: 6, cost: 48, date: '2026-06-17', reason: 'Cracked eggs during storage — unusable' },
  // Sugar: 0.3 kg × ₹42/kg = ₹12.60
  { id: 'wl5', type: 'material', itemId: '2', quantity: 0.3, cost: 12.60, date: '2026-06-19', reason: 'Sugar hardened into clumps due to humidity' },
  // Yeast: 50 g × ₹0.80/g = ₹40
  { id: 'wl6', type: 'material', itemId: '6', quantity: 50, cost: 40, date: '2026-06-21', reason: 'Yeast expired — failed activation test' },
  // Finished-goods wastages
  // Croissant material cost ≈ (0.25×45 + 0.025×42 + 0.125×500 + 0.05×60 + 7×0.80) = 11.25+1.05+62.50+3+5.60 = ₹83.40 → ×8 = ₹667
  { id: 'wl7', type: 'recipe', itemId: 'm1', quantity: 8, cost: 667, date: '2026-06-12', reason: 'Croissants unsold by end-of-day — past safe window' },
  // Muffin material cost ≈ (0.2×45 + 0.15×42 + 0.1×500 + 2×8 + 0.1×60) = 9+6.30+50+16+6 = ₹87.30 → ×12 = ₹1047.60
  { id: 'wl8', type: 'recipe', itemId: 'm2', quantity: 12, cost: 1047.60, date: '2026-06-16', reason: 'Muffin batch over-proofed — texture failure, not saleable' },
  // Croissant ×5 = ₹417
  { id: 'wl9', type: 'recipe', itemId: 'm1', quantity: 5, cost: 417, date: '2026-06-20', reason: 'Overnight croissants not sold — discarded at opening' },
];
const INITIAL_MATERIALS: RawMaterial[] = [
  // Flour: 10 kg on hand, costs ₹45/kg, alert when below 2 kg
  { id: '1', name: 'All-Purpose Flour', unit: 'kg', initialStock: 10, costPerUnit: 45, category: 'Raw Materials', threshold: 2, dateAdded: '2026-01-01' },
  // Sugar: 5 kg, ₹42/kg, alert at 1 kg
  { id: '2', name: 'Granulated Sugar', unit: 'kg', initialStock: 5, costPerUnit: 42, category: 'Raw Materials', threshold: 1, dateAdded: '2026-01-02' },
  // Butter: 2 kg, ₹500/kg, alert at 0.5 kg
  { id: '3', name: 'Unsalted Butter', unit: 'kg', initialStock: 2, costPerUnit: 500, category: 'Raw Materials', threshold: 0.5, dateAdded: '2026-01-03' },
  // Eggs: 60 pcs, ₹8/pc, alert at 12
  { id: '4', name: 'Large Eggs', unit: 'pcs', initialStock: 60, costPerUnit: 8, category: 'Raw Materials', threshold: 12, dateAdded: '2026-01-04' },
  // Milk: 3 l, ₹60/l, alert at 0.5 l
  { id: '5', name: 'Whole Milk', unit: 'l', initialStock: 3, costPerUnit: 60, category: 'Raw Materials', threshold: 0.5, dateAdded: '2026-01-05' },
  // Yeast: 500 g, ₹0.80/g (₹800/kg), alert at 50 g
  { id: '6', name: 'Active Dry Yeast', unit: 'g', initialStock: 500, costPerUnit: 0.80, category: 'Raw Materials', threshold: 50, dateAdded: '2026-01-06' },
  // Packaging Box: 100 pcs, ₹12/pc, alert at 20
  { id: '7', name: 'Packaging Box', unit: 'pcs', initialStock: 100, costPerUnit: 12, category: 'Packaging Materials', threshold: 20, dateAdded: '2026-01-07' },
  // Greaseproof Paper: 200 pcs, ₹0.50/pc, alert at 50
  { id: '8', name: 'Greaseproof Paper', unit: 'pcs', initialStock: 200, costPerUnit: 0.50, category: 'Packaging Materials', threshold: 50, dateAdded: '2026-01-08' },
];

const INITIAL_MENU: MenuItem[] = [
  { 
    id: 'm1', 
    name: 'Classic Croissant', 
    sellingPrice: 4.50,
    recipe: [
      { materialId: '1', amount: 0.25, unit: 'kg' },  // 250g Flour
      { materialId: '2', amount: 0.025, unit: 'kg' }, // 25g Sugar
      { materialId: '3', amount: 0.125, unit: 'kg' }, // 125g Butter
      { materialId: '5', amount: 0.05, unit: 'l' },   // 50ml Milk
      { materialId: '6', amount: 7, unit: 'g' },      // 7g Yeast
    ] 
  },
  { 
    id: 'm2', 
    name: 'Chocolate Muffin', 
    sellingPrice: 3.75,
    recipe: [
      { materialId: '1', amount: 0.2, unit: 'kg' },   // 200g Flour
      { materialId: '2', amount: 0.15, unit: 'kg' },  // 150g Sugar
      { materialId: '3', amount: 0.1, unit: 'kg' },   // 100g Butter
      { materialId: '4', amount: 2, unit: 'pcs' },
      { materialId: '5', amount: 0.1, unit: 'l' },    // 100ml Milk
    ] 
  }
];

// ─── Unit Conversion Utilities ───────────────────────────────────────────────────

/**
 * Nested lookup table for converting between supported measurement units.
 * Outer key: source unit; inner key: target unit; value: multiplication factor.
 * Units outside these families (e.g. custom strings) are passed through unchanged.
 */
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  g: { g: 1, kg: 0.001 },
  kg: { g: 1000, kg: 1 },
  ml: { ml: 1, l: 0.001 },
  l: { ml: 1000, l: 1 },
  pcs: { pcs: 1 }
};

/**
 * Converts a numeric amount from one measurement unit to another using
 * `UNIT_CONVERSIONS`. If the conversion factor is not found (unknown unit
 * pair), the original amount is returned unmodified.
 *
 * @param amount   - The quantity to convert.
 * @param fromUnit - The unit the amount is currently expressed in.
 * @param toUnit   - The target unit to convert into.
 * @returns The converted amount, or `amount` unchanged if conversion is unknown.
 */
function convertAmount(amount: number, fromUnit: string, toUnit: string): number {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return amount;
  const conversion = UNIT_CONVERSIONS[fromUnit]?.[toUnit];
  return conversion !== undefined ? amount * conversion : amount;
}

/** Supported display currencies. The first entry (USD) is the default. */
const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'INR', symbol: '₹' },
  { code: 'CAD', symbol: 'CA$' },
  { code: 'AUD', symbol: 'A$' },
];

// ─── Root Component ─────────────────────────────────────────────────────────────

/**
 * Public default export.
 * Thin wrapper that provides `ErrorBoundary` protection around the entire
 * bakery management application.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <BakeryApp />
    </ErrorBoundary>
  );
}

// ─── BakeryApp — Main Application Component ────────────────────────────────────
// All application state, Firestore listeners, business logic, and JSX live here.
function BakeryApp() {
  // ── Core Data State ─────────────────────────────────────────────────────────
  // Initialised with seed data; overwritten by Firestore onSnapshot listeners
  // once the user authenticates.
  const [materials, setMaterials] = useState<RawMaterial[]>(INITIAL_MATERIALS);
  const [categories, setCategories] = useState<string[]>(['Raw Materials', 'Packaging Materials']);
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [orders, setOrders] = useState<Order[]>([]);
  const [experiments, setExperiments] = useState<RecipeExperiment[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [wastageLogs, setWastageLogs] = useState<WastageLog[]>(INITIAL_WASTAGE_LOGS);
  const [isProductionRunModalOpen, setIsProductionRunModalOpen] = useState(false);
  const [productionFilterRecipe, setProductionFilterRecipe] = useState('');
  const [productionFilterPurpose, setProductionFilterPurpose] = useState('');
  // ── UI / Navigation State ─────────────────────────────────────────────────────
  // Active tab is persisted to localStorage so the user returns to the same view.
  const [activeTab, setActiveTab] = useState<'inventory' | 'menu' | 'orders' | 'experiments' | 'production' | 'summary' | 'settings' | 'wastage'>(() => {
    return (localStorage.getItem('activeTab') as any) || 'inventory';
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'bakery' | 'integrations' | 'customisation' | 'account' | 'categories'>('bakery');
  // ── Date & Filtering State ────────────────────────────────────────────────────
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [summaryRange, setSummaryRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [summaryDateStart, setSummaryDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [summaryDateEnd, setSummaryDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  // Orders tab date-range filter (defaults to last 7 days)
  const [orderFilterStart, setOrderFilterStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0];
  });
  const [orderFilterEnd, setOrderFilterEnd] = useState(new Date().toISOString().split('T')[0]);
  // Add Order modal state
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  interface OrderLineItem { menuItemId: string; quantity: number; }
  const [modalOrderDate, setModalOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalCustomerName, setModalCustomerName] = useState('');
  const [modalCustomerPhone, setModalCustomerPhone] = useState('');
  const [modalLineItems, setModalLineItems] = useState<OrderLineItem[]>([{ menuItemId: '', quantity: 1 }]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [summaryRefDate, setSummaryRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [inventorySortBy, setInventorySortBy] = useState<'name' | 'stock' | 'cost' | 'date'>('name');
  const [inventorySortOrder, setInventorySortOrder] = useState<'asc' | 'desc'>('asc');
  const [isIngredientSelectorOpen, setIsIngredientSelectorOpen] = useState(false);
  const [activeRecipeItemId, setActiveRecipeItemId] = useState<string | null>(null);
  // ── Bakery Settings State ────────────────────────────────────────────────────
  // Persisted to Firestore at `users/{userId}/settings/bakery`.
  const [settings, setSettings] = useState<BakerySettings>({
    name: 'My Bakery',
    logo: '',
    primaryColor: '#10b981',
    address: '',
    phone: '',
    email: ''
  });
  // ── Authentication State ─────────────────────────────────────────────────────
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'google'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  // ── Modal / Notification State ──────────────────────────────────────────────────
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    type: 'alert' | 'confirm';
  }>({ show: false, title: '', message: '', type: 'alert' });
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'low-stock' }[]>([]);
  // Tracks the previous count of low-stock items to detect newly-triggered alerts.
  const prevLowStockCount = React.useRef(0);

  // ── Integration Status State ──────────────────────────────────────────────────
  // Shopify Integration State
  const [shopifyStatus, setShopifyStatus] = useState<{ connected: boolean, shop: string | null }>({ connected: false, shop: null });
  const [shopifyShopInput, setShopifyShopInput] = useState('');
  const [isConnectingShopify, setIsConnectingShopify] = useState(false);
  const [isImportingShopify, setIsImportingShopify] = useState(false);
  const [shopifyClientId, setShopifyClientId] = useState('');
  const [shopifyClientSecret, setShopifyClientSecret] = useState('');
  const [shopifyConfig, setShopifyConfig] = useState({ hasEnvCredentials: false });
  
  // Odoo Integration State
  const [odooStatus, setOdooStatus] = useState<{ connected: boolean, url: string | null }>({ connected: false, url: null });
  const [odooUrlInput, setOdooUrlInput] = useState('');
  const [odooDbInput, setOdooDbInput] = useState('');
  const [odooUsernameInput, setOdooUsernameInput] = useState('');
  const [odooPasswordInput, setOdooPasswordInput] = useState('');
  const [isConnectingOdoo, setIsConnectingOdoo] = useState(false);
  const [isImportingOdoo, setIsImportingOdoo] = useState(false);

  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [isExpiredAlertDismissed, setIsExpiredAlertDismissed] = useState(false);

  // ── Integration Bootstrap ─────────────────────────────────────────────────────
  // Polls /api/shopify/status and /api/odoo/status once on mount to hydrate
  // connection state before the user visits the Integrations settings panel.
  useEffect(() => {
    fetch('/api/shopify/status')
      .then(res => res.json())
      .then(data => {
        setShopifyStatus(data);
        if (data.hasEnvCredentials !== undefined) {
          setShopifyConfig({ hasEnvCredentials: data.hasEnvCredentials });
        }
      })
      .catch(err => console.error('Failed to fetch Shopify status', err));

    fetch('/api/odoo/status')
      .then(res => res.json())
      .then(data => setOdooStatus(data))
      .catch(err => console.error('Failed to fetch Odoo status', err));
  }, []);

  // ─── Firebase Auth ───────────────────────────────────────────────────────────

  // Subscribes to Firebase Auth state changes. Sets `user` and `isAuthReady`
  // so the rest of the app knows whether Firestore listeners can safely attach.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Bakery Owner'
        });
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Initiates a Google OAuth popup sign-in flow.
   * On success, `onAuthStateChanged` above updates `user` state automatically.
   * Errors are surfaced to the user via `authError` state.
   */
  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
      setAuthError('Google login failed. Please try again.');
    }
  };

  /**
   * Handles email/password sign-in or account creation.
   *
   * - In 'signup' mode: creates the Firebase user and updates their display name.
   * - In 'login' mode: signs in with existing credentials.
   * Firebase-specific error codes are translated into human-readable messages.
   *
   * @param e - The form submit event (prevents page reload).
   */
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Email auth failed', error);
      let message = 'Authentication failed. Please check your credentials.';
      if (error.code === 'auth/email-already-in-use') message = 'Email already in use.';
      if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      if (error.code === 'auth/weak-password') message = 'Password is too weak.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') message = 'Invalid email or password.';
      setAuthError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  /**
   * Seeds realistic demo data for a newly created demo user in Firestore.
   * Sets up settings, materials, menu items, sales orders, production runs, and R&D sessions.
   * Uses a single atomic writeBatch to ensure all writes complete together.
   * Default currency is set to INR (Indian Rupee, code: 'INR', symbol: '₹').
   */
  const seedDemoData = async (userId: string) => {
    const getPastDateStr = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    // 1. Settings Document
    const demoSettings = {
      name: "BetterEat Bakery (Demo)",
      logo: "",
      primaryColor: "#10b981",
      address: "123 Sourdough Lane, Bakerstown",
      phone: "555-0199",
      email: `${userId}@demo.bettereat.com`,
      currency: { code: 'INR', symbol: '₹' }, // default currency is INR
      categories: ["Raw Materials", "Packaging Materials"]
    };

    // 2. Materials
    const materialsToSeed = [
      { id: 'm_flour', name: 'All-Purpose Flour', unit: 'g', initialStock: 50000, costPerUnit: 0.002, category: 'Raw Materials', threshold: 20, dateAdded: getPastDateStr(30) },
      { id: 'm_sugar', name: 'Granulated Sugar', unit: 'g', initialStock: 25000, costPerUnit: 0.0015, category: 'Raw Materials', threshold: 20, dateAdded: getPastDateStr(30) },
      { id: 'm_butter', name: 'Unsalted Butter', unit: 'g', initialStock: 10000, costPerUnit: 0.012, category: 'Raw Materials', threshold: 20, dateAdded: getPastDateStr(30) },
      { id: 'm_eggs', name: 'Large Eggs', unit: 'pcs', initialStock: 150, costPerUnit: 0.25, category: 'Raw Materials', threshold: 20, dateAdded: getPastDateStr(30) },
      { id: 'm_milk', name: 'Whole Milk', unit: 'ml', initialStock: 20000, costPerUnit: 0.0012, category: 'Raw Materials', threshold: 20, dateAdded: getPastDateStr(30) },
      { id: 'm_yeast', name: 'Active Dry Yeast', unit: 'g', initialStock: 2000, costPerUnit: 0.05, category: 'Raw Materials', threshold: 20, dateAdded: getPastDateStr(30) },
      { id: 'm_chips', name: 'Chocolate Chips', unit: 'g', initialStock: 8000, costPerUnit: 0.008, category: 'Raw Materials', threshold: 20, dateAdded: getPastDateStr(30) },
      { id: 'm_box', name: 'Packaging Box', unit: 'pcs', initialStock: 300, costPerUnit: 0.50, category: 'Packaging Materials', threshold: 20, dateAdded: getPastDateStr(30) },
    ];

    // 3. Menu Items (with recipes matching the material IDs)
    const menuToSeed = [
      {
        id: 'menu_croissant',
        name: 'Classic Croissant',
        sellingPrice: 4.50,
        emoji: '🥐',
        finishedGoodsStock: 25,
        recipe: [
          { materialId: 'm_flour', amount: 150, unit: 'g' },
          { materialId: 'm_sugar', amount: 15, unit: 'g' },
          { materialId: 'm_butter', amount: 75, unit: 'g' },
          { materialId: 'm_milk', amount: 50, unit: 'ml' },
          { materialId: 'm_yeast', amount: 5, unit: 'g' },
        ]
      },
      {
        id: 'menu_muffin',
        name: 'Chocolate Muffin',
        sellingPrice: 3.75,
        emoji: '🧁',
        finishedGoodsStock: 15,
        recipe: [
          { materialId: 'm_flour', amount: 120, unit: 'g' },
          { materialId: 'm_sugar', amount: 80, unit: 'g' },
          { materialId: 'm_butter', amount: 50, unit: 'g' },
          { materialId: 'm_eggs', amount: 1, unit: 'pcs' },
          { materialId: 'm_milk', amount: 60, unit: 'ml' },
          { materialId: 'm_chips', amount: 40, unit: 'g' },
        ]
      },
      {
        id: 'menu_sourdough',
        name: 'Sourdough Loaf',
        sellingPrice: 6.00,
        emoji: '🍞',
        finishedGoodsStock: 10,
        recipe: [
          { materialId: 'm_flour', amount: 500, unit: 'g' },
          { materialId: 'm_yeast', amount: 10, unit: 'g' },
        ]
      }
    ];

    // 4. Orders
    const ordersToSeed = [
      // Today (Day 0)
      { id: 'ord_1', menuItemId: 'menu_croissant', quantity: 8, date: getPastDateStr(0), customerName: 'John Smith', customerPhone: '555-0101' },
      { id: 'ord_2', menuItemId: 'menu_muffin', quantity: 12, date: getPastDateStr(0), customerName: 'Alice Green', customerPhone: '555-0102' },
      { id: 'ord_3', menuItemId: 'menu_sourdough', quantity: 4, date: getPastDateStr(0), customerName: 'Robert Vance', customerPhone: '555-0103' },
      // Yesterday (Day 1)
      { id: 'ord_4', menuItemId: 'menu_croissant', quantity: 15, date: getPastDateStr(1), customerName: 'Cafe Central', customerPhone: '555-0201' },
      { id: 'ord_5', menuItemId: 'menu_muffin', quantity: 8, date: getPastDateStr(1), customerName: 'David Lee', customerPhone: '555-0202' },
      { id: 'ord_6', menuItemId: 'menu_sourdough', quantity: 6, date: getPastDateStr(1), customerName: 'Emily Davis', customerPhone: '555-0203' },
      // Day 2
      { id: 'ord_7', menuItemId: 'menu_croissant', quantity: 6, date: getPastDateStr(2), customerName: 'Local Inn', customerPhone: '555-0301' },
      { id: 'ord_8', menuItemId: 'menu_muffin', quantity: 10, date: getPastDateStr(2), customerName: 'Bake Fanatic', customerPhone: '555-0302' },
      // Day 3
      { id: 'ord_9', menuItemId: 'menu_sourdough', quantity: 8, date: getPastDateStr(3), customerName: 'George Miller', customerPhone: '555-0401' },
      { id: 'ord_10', menuItemId: 'menu_croissant', quantity: 12, date: getPastDateStr(3), customerName: 'Sarah Connor', customerPhone: '555-0402' },
      // Day 4
      { id: 'ord_11', menuItemId: 'menu_muffin', quantity: 14, date: getPastDateStr(4), customerName: 'Kevin Hart', customerPhone: '555-0501' },
      { id: 'ord_12', menuItemId: 'menu_croissant', quantity: 5, date: getPastDateStr(4), customerName: 'Office Gathering', customerPhone: '555-0502' },
      // Day 5
      { id: 'ord_13', menuItemId: 'menu_sourdough', quantity: 10, date: getPastDateStr(5), customerName: 'Daily Grind', customerPhone: '555-0601' },
      { id: 'ord_14', menuItemId: 'menu_croissant', quantity: 10, date: getPastDateStr(5), customerName: 'Hotel Continental', customerPhone: '555-0602' },
      // Day 6
      { id: 'ord_15', menuItemId: 'menu_muffin', quantity: 15, date: getPastDateStr(6), customerName: 'School Event', customerPhone: '555-0701' },
      { id: 'ord_16', menuItemId: 'menu_sourdough', quantity: 5, date: getPastDateStr(6), customerName: 'Community Center', customerPhone: '555-0702' }
    ];

    // 5. Production Runs
    const productionRunsToSeed = [
      { id: 'run_1', recipeId: 'menu_croissant', quantityProduced: 30, remainingQuantity: 0, date: getPastDateStr(6), expiryDate: getPastDateStr(4), purpose: 'market_stock', costTotal: 30 * 83.40, createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000 },
      { id: 'run_2', recipeId: 'menu_muffin', quantityProduced: 30, remainingQuantity: 0, date: getPastDateStr(6), expiryDate: getPastDateStr(3), purpose: 'market_stock', costTotal: 30 * 87.30, createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000 },
      { id: 'run_3', recipeId: 'menu_sourdough', quantityProduced: 15, remainingQuantity: 0, date: getPastDateStr(6), expiryDate: getPastDateStr(4), purpose: 'market_stock', costTotal: 15 * 60.00, createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000 },
      { id: 'run_4', recipeId: 'menu_croissant', quantityProduced: 20, remainingQuantity: 5, date: getPastDateStr(4), expiryDate: getPastDateStr(2), purpose: 'market_stock', costTotal: 20 * 83.40, createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
      { id: 'run_5', recipeId: 'menu_muffin', quantityProduced: 20, remainingQuantity: 10, date: getPastDateStr(4), expiryDate: getPastDateStr(1), purpose: 'market_stock', costTotal: 20 * 87.30, createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
      { id: 'run_6', recipeId: 'menu_sourdough', quantityProduced: 15, remainingQuantity: 5, date: getPastDateStr(4), expiryDate: getPastDateStr(2), purpose: 'market_stock', costTotal: 15 * 60.00, createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
      { id: 'run_7', recipeId: 'menu_croissant', quantityProduced: 25, remainingQuantity: 25, date: getPastDateStr(1), expiryDate: getPastDateStr(-1), purpose: 'customer_order', costTotal: 25 * 83.40, createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000 },
      { id: 'run_8', recipeId: 'menu_muffin', quantityProduced: 25, remainingQuantity: 25, date: getPastDateStr(2), expiryDate: getPastDateStr(-1), purpose: 'market_stock', costTotal: 25 * 87.30, createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
      { id: 'run_9', recipeId: 'menu_sourdough', quantityProduced: 15, remainingQuantity: 15, date: getPastDateStr(2), expiryDate: getPastDateStr(0), purpose: 'market_stock', costTotal: 15 * 60.00, createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000 }
    ];

    // 6. Recipe R&D Session (Experiments)
    const experimentsToSeed = [
      {
        id: 'exp_1',
        name: 'Gluten-Free Croissant Attempt',
        date: getPastDateStr(2),
        materials: [
          { materialId: 'm_flour', amount: 200, unit: 'g' },
          { materialId: 'm_sugar', amount: 20, unit: 'g' },
          { materialId: 'm_butter', amount: 80, unit: 'g' }
        ],
        notes: 'Tried replacing AP Flour with almond flour. Dough was too crumbly, did not rise well. Tastes good but texture is off.'
      }
    ];

    const batch = writeBatch(db);

    // Write settings
    batch.set(doc(db, 'users', userId, 'settings', 'bakery'), demoSettings);

    // Write materials
    materialsToSeed.forEach(mat => {
      batch.set(doc(db, 'users', userId, 'materials', mat.id), mat);
    });

    // Write menu items
    menuToSeed.forEach(item => {
      batch.set(doc(db, 'users', userId, 'menu', item.id), item);
    });

    // Write orders
    ordersToSeed.forEach(order => {
      batch.set(doc(db, 'users', userId, 'orders', order.id), order);
    });

    // Write production runs
    productionRunsToSeed.forEach(run => {
      batch.set(doc(db, 'users', userId, 'productionRuns', run.id), run);
    });

    // Write experiments
    experimentsToSeed.forEach(exp => {
      batch.set(doc(db, 'users', userId, 'experiments', exp.id), exp);
    });

    await batch.commit();
  };

  /**
   * Generates a unique temporary email and logs in as a demo user.
   * Once authenticated, seeds the Firestore space with rich mock data.
   */
  const handleDemoLogin = async () => {
    setAuthError(null);
    setIsDemoLoading(true);
    try {
      const demoEmail = `demo_${Date.now()}_${Math.floor(Math.random() * 10000)}@bettereat.com`;
      const demoPassword = `DemoPassword123!`;
      const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
      
      // Set the display name to "Demo Owner"
      await updateProfile(userCredential.user, { displayName: 'Demo Owner' });
      
      // Seed the database for this new UID
      await seedDemoData(userCredential.user.uid);
    } catch (error: any) {
      console.error('Demo login failed', error);
      setAuthError('Failed to initialize demo sandbox. Please try again.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  /**
   * Signs the current Firebase user out.
   * `onAuthStateChanged` will set `user` to null, unmounting the main app UI.
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // ─── Firebase Realtime Listeners (onSnapshot) ─────────────────────────────────

  // Attaches onSnapshot listeners to all user-scoped Firestore sub-collections
  // once auth is confirmed. Re-runs whenever `user` changes (login / logout).
  // All listeners are unsubscribed on cleanup to prevent memory leaks.
  useEffect(() => {
    if (!isAuthReady || !auth.currentUser) return;

    const userId = auth.currentUser.uid;

    // Materials — `users/{userId}/materials`
    const unsubMaterials = onSnapshot(collection(db, 'users', userId, 'materials'), (snapshot) => {
      const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RawMaterial));
      setMaterials(mats);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/materials`));

    // Menu items — `users/{userId}/menu`
    const unsubMenu = onSnapshot(collection(db, 'users', userId, 'menu'), (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, recipe: data.recipe || [] } as MenuItem;
      });
      setMenu(items);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/menu`));

    // Sales orders — `users/{userId}/orders`
    const unsubOrders = onSnapshot(collection(db, 'users', userId, 'orders'), (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ords);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/orders`));

    // Recipe experiments — `users/{userId}/experiments`
    const unsubExperiments = onSnapshot(collection(db, 'users', userId, 'experiments'), (snapshot) => {
      const exps = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, materials: data.materials || [] } as RecipeExperiment;
      });
      setExperiments(exps);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/experiments`));

    // Production baking runs — `users/{userId}/productionRuns`
    const unsubProductionRuns = onSnapshot(collection(db, 'users', userId, 'productionRuns'), (snapshot) => {
      const runs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionRun));
      setProductionRuns(runs);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/productionRuns`));

    // Bakery profile settings — `users/{userId}/settings/bakery` (single doc)
    const unsubSettings = onSnapshot(doc(db, 'users', userId, 'settings', 'bakery'), (docSnap) => {
      // Skip if the change is local and still pending to avoid jumpy inputs
      if (docSnap.metadata.hasPendingWrites) return;
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          name: data.name ?? 'My Bakery',
          logo: data.logo ?? '',
          primaryColor: data.primaryColor ?? '#10b981',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? ''
        });
        if (data.categories) setCategories(data.categories);
        if (data.currency) setCurrency(data.currency);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/bakery`));

    // Wastage Logs — `users/{userId}/wastageLogs`
    const unsubWastageLogs = onSnapshot(collection(db, 'users', userId, 'wastageLogs'), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WastageLog));
      setWastageLogs(logs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/wastageLogs`));

    return () => {
      unsubMaterials();
      unsubMenu();
      unsubOrders();
      unsubExperiments();
      unsubProductionRuns();
      unsubSettings();
      unsubWastageLogs();
    };
  }, [isAuthReady, user]);

  // ─── Shopify Integration ────────────────────────────────────────────────────────

  // Listens for the OAuth callback message posted by the Shopify auth popup.
  // On SHOPIFY_AUTH_SUCCESS, refreshes the stored connection status.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SHOPIFY_AUTH_SUCCESS') {
        fetch('/api/shopify/status')
          .then(res => res.json())
          .then(data => setShopifyStatus(data));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /**
   * Starts the Shopify OAuth flow by opening a popup to the server-side
   * `/api/auth/shopify` endpoint.
   *
   * If the app has no env-level credentials (SHOPIFY_CLIENT_ID etc.), the user
   * must supply their own API Key and Secret via the UI inputs.
   * A polling interval monitors the popup until it closes, then refreshes status.
   */
  const connectShopify = async () => {
    if (!shopifyShopInput) {
      showAlert("Missing Shop Name", "Please enter your Shopify shop name first.");
      return;
    }

    // Clean the shop name: remove protocol and trailing slashes
    let shop = shopifyShopInput.trim()
      .replace('https://', '')
      .replace('http://', '')
      .replace(/\/$/, '');
    
    // If they just put the subdomain, we'll handle it on the server, 
    // but let's keep it as is if it has dots (like my-shop.myshopify.com)
    
    setIsConnectingShopify(true);

    try {
      let url = `/api/auth/shopify?shop=${encodeURIComponent(shop)}`;
      if (!shopifyConfig.hasEnvCredentials) {
        if (!shopifyClientId || !shopifyClientSecret) {
          showAlert("Missing Credentials", "Please enter your Shopify API Key and Secret.");
          setIsConnectingShopify(false);
          return;
        }
        url += `&clientId=${encodeURIComponent(shopifyClientId)}&clientSecret=${encodeURIComponent(shopifyClientSecret)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to start connection");
      }
      
      const data = await res.json();
      if (data.url) {
        // Open the popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url, 
          'shopify_auth', 
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );

        if (!popup) {
          showAlert("Popup Blocked", "Please allow popups for this site to connect your Shopify store.");
          setIsConnectingShopify(false);
          return;
        }

        // Check if popup is closed
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            setIsConnectingShopify(false);
            // Refresh status just in case
            fetch('/api/shopify/status')
              .then(res => res.json())
              .then(data => setShopifyStatus(data));
          }
        }, 1000);
      }
    } catch (err: any) {
      showAlert("Connection Error", err.message || "Failed to start Shopify connection.");
      setIsConnectingShopify(false);
    }
  };

  /**
   * Calls the server-side disconnect endpoint to revoke the stored Shopify token,
   * then resets local connection state.
   */
  const disconnectShopify = async () => {
    try {
      await fetch('/api/shopify/disconnect', { method: 'POST' });
      setShopifyStatus({ connected: false, shop: null });
    } catch (err) {
      showAlert("Error", "Failed to disconnect Shopify.");
    }
  };

  // ─── Odoo Integration ──────────────────────────────────────────────────────────

  /**
   * Authenticates against the Odoo JSON-RPC API via the server proxy.
   * Credentials are forwarded to `/api/odoo/connect` and stored server-side;
   * this app only tracks connected/disconnected status.
   */
  const connectOdoo = async () => {
    if (!odooUrlInput || !odooDbInput || !odooUsernameInput || !odooPasswordInput) {
      showAlert("Missing Information", "Please fill in all Odoo connection details.");
      return;
    }

    setIsConnectingOdoo(true);
    try {
      const res = await fetch('/api/odoo/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: odooUrlInput,
          db: odooDbInput,
          username: odooUsernameInput,
          password: odooPasswordInput
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to connect to Odoo");
      }

      const data = await res.json();
      setOdooStatus({ connected: true, url: odooUrlInput });
      showAlert("Success", "Odoo connected successfully!");
    } catch (err: any) {
      showAlert("Connection Error", err.message);
    } finally {
      setIsConnectingOdoo(false);
    }
  };

  /**
   * Calls the server-side disconnect endpoint to clear the stored Odoo session,
   * then resets local connection state.
   */
  const disconnectOdoo = async () => {
    try {
      await fetch('/api/odoo/disconnect', { method: 'POST' });
      setOdooStatus({ connected: false, url: null });
    } catch (err) {
      showAlert("Error", "Failed to disconnect Odoo.");
    }
  };

  /**
   * Fetches orders from Shopify for `orderDate`, matches line items to the local
   * menu by exact name (case-insensitive), and writes matched orders to Firestore
   * at `users/{userId}/orders`. Unmatched items are reported in an alert.
   */
  const importShopifyOrders = async () => {
    if (!shopifyStatus.connected) {
      showAlert("Not Connected", "Please connect your Shopify store in Settings first.");
      return;
    }

    setIsImportingShopify(true);
    try {
      const res = await fetch(`/api/shopify/orders?date=${orderDate}`);
      const shopifyOrders = await res.json();

      if (shopifyOrders.error) {
        throw new Error(shopifyOrders.error);
      }

      if (shopifyOrders.length === 0) {
        showAlert("No Orders", `No Shopify orders found for ${orderDate}.`);
        setIsImportingShopify(false);
        return;
      }

      // Map Shopify line items to local menu items
      const newOrders: Order[] = [];
      let matchedCount = 0;
      let unmatchedItems: string[] = [];

      shopifyOrders.forEach((so: any) => {
        so.line_items.forEach((li: any) => {
          const menuItem = menu.find(m => m.name.toLowerCase() === li.title.toLowerCase());
          if (menuItem) {
            newOrders.push({
              id: Math.random().toString(36).substr(2, 9),
              menuItemId: menuItem.id,
              quantity: li.quantity,
              date: orderDate,
              customerName: so.customer ? `${so.customer.first_name || ''} ${so.customer.last_name || ''}`.trim() : '',
              customerPhone: so.customer?.phone || so.phone || ''
            });
            matchedCount++;
          } else {
            unmatchedItems.push(li.title);
          }
        });
      });

      if (newOrders.length > 0) {
        if (!auth.currentUser) return;
        const userId = auth.currentUser.uid;
        for (const order of newOrders) {
          await setDoc(doc(db, 'users', userId, 'orders', order.id), order);
        }
        showAlert("Import Successful", `Imported ${matchedCount} items from ${shopifyOrders.length} Shopify orders.`);
      } else {
        const uniqueUnmatched = Array.from(new Set(unmatchedItems));
        showAlert("Import Result", `Found ${shopifyOrders.length} orders, but none of the items matched your local menu names. Unmatched items: ${uniqueUnmatched.slice(0, 5).join(', ')}${uniqueUnmatched.length > 5 ? '...' : ''}`);
      }
    } catch (err: any) {
      showAlert("Import Error", err.message || "Failed to import orders from Shopify.");
    } finally {
      setIsImportingShopify(false);
    }
  };

  /**
   * Fetches sale orders from Odoo for `orderDate` via `/api/odoo/orders`.
   * Odoo's `product_id` field is a tuple `[id, name]`; the name is matched
   * against local menu items. Matched orders are written to Firestore.
   */
  const importOdooOrders = async () => {
    if (!odooStatus.connected) {
      showAlert("Not Connected", "Please connect your Odoo instance in Settings first.");
      return;
    }

    setIsImportingOdoo(true);
    try {
      const res = await fetch(`/api/odoo/orders?date=${orderDate}`);
      const odooOrders = await res.json();

      if (odooOrders.error) {
        throw new Error(odooOrders.error);
      }

      if (odooOrders.length === 0) {
        showAlert("No Orders", `No Odoo orders found for ${orderDate}.`);
        return;
      }

      const newOrders: Order[] = [];
      let matchedCount = 0;
      let unmatchedItems: string[] = [];

      odooOrders.forEach((oo: any) => {
        oo.line_items.forEach((li: any) => {
          // Odoo product_id is [id, name]
          const productName = li.product_id[1];
          const menuItem = menu.find(m => m.name.toLowerCase() === productName.toLowerCase());

          if (menuItem) {
            newOrders.push({
              id: `odoo-${oo.id}-${li.id}`,
              menuItemId: menuItem.id,
              quantity: li.product_uom_qty,
              date: orderDate,
              customerName: oo.partner_id ? oo.partner_id[1] : '',
              customerPhone: ''
            });
            matchedCount++;
          } else {
            if (!unmatchedItems.includes(productName)) {
              unmatchedItems.push(productName);
            }
          }
        });
      });

      if (newOrders.length > 0) {
        if (!auth.currentUser) return;
        const userId = auth.currentUser.uid;
        try {
          for (const order of newOrders) {
            await setDoc(doc(db, 'users', userId, 'orders', order.id), order);
          }
          
          let msg = `Successfully imported ${matchedCount} items from ${odooOrders.length} Odoo orders.`;
          if (unmatchedItems.length > 0) {
            msg += `\n\nNote: Some items were skipped because they don't match your menu: ${unmatchedItems.join(', ')}`;
          }
          showAlert("Import Complete", msg);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}/orders`);
        }
      } else {
        showAlert("Import Failed", "No items in the Odoo orders matched your menu items.");
      }
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to import Odoo orders.");
    } finally {
      setIsImportingOdoo(false);
    }
  };

  // ─── UI Helpers & Settings Persistence ─────────────────────────────────────────

  /**
   * Displays a non-interactive informational modal.
   * @param title   - Modal heading.
   * @param message - Body text to display.
   */
  const showAlert = (title: string, message: string) => {
    setModalConfig({ show: true, title, message, type: 'alert' });
  };

  /**
   * Displays a confirmation modal with Cancel / Confirm actions.
   * @param title     - Modal heading.
   * @param message   - Body text to display.
   * @param onConfirm - Callback invoked when the user clicks the confirm button.
   */
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ show: true, title, message, onConfirm, type: 'confirm' });
  };

  // Applies the primary theme colour to the CSS custom property so all
  // Tailwind `text-primary` / `bg-primary` classes update instantly.
  // Persistence
  useEffect(() => {
    // Update theme color dynamically
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
  }, [settings.primaryColor]);

  /**
   * Persists bakery profile settings to Firestore (`users/{userId}/settings/bakery`).
   * Uses `merge: true` so individual fields can be updated without overwriting others.
   * Errors are passed through `handleFirestoreError`.
   *
   * @param newSettings - The full `BakerySettings` object to persist.
   */
  const saveBakerySettings = async (newSettings: BakerySettings) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'settings', 'bakery'), newSettings, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/bakery`);
    }
  };

  // Debounce: waits 1 second after the last settings change before writing to
  // Firestore, preventing excessive writes during rapid typing.
  // Dependency: `settings` object and `isAuthReady` flag.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthReady && auth.currentUser) {
        saveBakerySettings(settings);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings, isAuthReady]);

  /**
   * Patches a single field in the local settings state.
   * The debounced effect above will sync the change to Firestore after 1 s.
   *
   * @param field - Key of the `BakerySettings` field to update.
   * @param value - New string value.
   */
  const updateSettingsField = (field: keyof BakerySettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Updates the active display currency both locally and in Firestore
   * (`users/{userId}/settings/bakery`), so the choice persists across sessions.
   *
   * @param newCurrency - The currency object to apply (from `CURRENCIES`).
   */
  const updateCurrency = async (newCurrency: typeof CURRENCIES[0]) => {
    setCurrency(newCurrency);
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'settings', 'bakery'), { currency: newCurrency }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/bakery`);
    }
  };

  // ─── Calculations & Derived State (useMemo) ───────────────────────────────────────────

  // Orders and production runs filtered to the currently selected summary date range.
  // Depended on by financials, chartData, and the Summary tab tables.
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      return order.date >= summaryDateStart && order.date <= summaryDateEnd;
    });
  }, [orders, summaryDateStart, summaryDateEnd]);

  const filteredProductionRuns = useMemo(() => {
    return productionRuns.filter(r => r.date >= summaryDateStart && r.date <= summaryDateEnd);
  }, [productionRuns, summaryDateStart, summaryDateEnd]);

  // Sum of `costTotal` across all production runs in the selected period.
  const totalProductionCost = useMemo(() => {
    return filteredProductionRuns.reduce((sum, r) => sum + (r.costTotal || 0), 0);
  }, [filteredProductionRuns]);

  // Aggregated material usage across ALL orders and experiments (not range-filtered).
  // Used to compute remaining inventory displayed on the Inventory tab.
  const inventoryUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    
    orders.forEach(order => {
      const item = menu.find(m => m.id === order.menuItemId);
      if (item) {
        item.recipe.forEach(req => {
          const mat = materials.find(m => m.id === req.materialId);
          if (mat) {
            const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
            usage[req.materialId] = (usage[req.materialId] || 0) + (convertedAmount * order.quantity);
          }
        });
      }
    });

    experiments.forEach(exp => {
      exp.materials.forEach(req => {
        const mat = materials.find(m => m.id === req.materialId);
        if (mat) {
          const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
          usage[req.materialId] = (usage[req.materialId] || 0) + convertedAmount;
        }
      });
    });

    return usage;
  }, [orders, menu, materials, experiments]);

  // Aggregated material usage filtered to the summary date range.
  // Used by the inventory usage table in the Summary tab.
  const summaryInventoryUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    
    filteredOrders.forEach(order => {
      const item = menu.find(m => m.id === order.menuItemId);
      if (item) {
        item.recipe.forEach(req => {
          const mat = materials.find(m => m.id === req.materialId);
          if (mat) {
            const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
            usage[req.materialId] = (usage[req.materialId] || 0) + (convertedAmount * order.quantity);
          }
        });
      }
    });

    const rangeExperiments = experiments.filter(e => e.date >= summaryDateStart && e.date <= summaryDateEnd);
    rangeExperiments.forEach(exp => {
      exp.materials.forEach(req => {
        const mat = materials.find(m => m.id === req.materialId);
        if (mat) {
          const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
          usage[req.materialId] = (usage[req.materialId] || 0) + convertedAmount;
        }
      });
    });

    return usage;
  }, [filteredOrders, menu, materials, experiments, summaryDateStart, summaryDateEnd]);

  // Current on-hand stock after deducting all recorded usage.
  // `remaining` is displayed as the live stock level on the Inventory tab.
  const remainingInventory = useMemo(() => {
    return materials.map(mat => {
      const used = inventoryUsage[mat.id] || 0;
      return {
        ...mat,
        used: parseFloat(used.toFixed(2)),
        remaining: parseFloat((mat.initialStock - used).toFixed(2)),
        threshold: mat.threshold || 0
      };
    });
  }, [materials, inventoryUsage]);

  // `remainingInventory` sorted by the user's chosen column and direction.
  const sortedRemainingInventory = useMemo(() => {
    return [...remainingInventory].sort((a, b) => {
      let comparison = 0;
      switch (inventorySortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'stock':
          comparison = a.remaining - b.remaining;
          break;
        case 'cost':
          comparison = a.costPerUnit - b.costPerUnit;
          break;
        case 'date':
          comparison = (a.dateAdded || '').localeCompare(b.dateAdded || '');
          break;
      }
      return inventorySortOrder === 'asc' ? comparison : -comparison;
    });
  }, [remainingInventory, inventorySortBy, inventorySortOrder]);

  // Items whose remaining stock is at or below their percentage-based threshold.
  // Drives the header alert badge and the notification toasts.
  const lowStockItems = useMemo(() => {
    return remainingInventory.filter(item => {
      // Only alert when a threshold has been explicitly set (> 0)
      // to avoid false alerts on newly added items with 0 stock.
      return (item.threshold ?? 0) > 0 && item.remaining <= item.threshold!;
    });
  }, [remainingInventory]);

  // Low-stock notification effect: fires a toast whenever a new item crosses the
  // threshold (comparing current count to the previous render's count via ref).
  // Toasts auto-dismiss after 5 seconds.
  useEffect(() => {
    if (lowStockItems.length > prevLowStockCount.current) {
      setIsAlertDismissed(false);
      const newItem = lowStockItems[lowStockItems.length - 1];
      const newNotification = {
        id: Math.random().toString(36).substr(2, 9),
        message: `Low stock alert: ${newItem.name} is down to ${newItem.remaining} ${newItem.unit}`,
        type: 'low-stock' as const
      };
      setNotifications(prev => [...prev, newNotification]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    }
    prevLowStockCount.current = lowStockItems.length;
  }, [lowStockItems]);

  /**
   * Computes income, ingredient expenses (orders + experiments), and profit
   * for orders and experiments that fall within [start, end].
   *
   * Income    = sum of (sellingPrice × quantity) across matching orders.
   * Expenses  = sum of (materialCostPerUnit × usedAmount) for both orders and R&D.
   * Profit    = income − expenses.
   *
   * This function is called both inline (for the financials memo) and
   * per-data-point inside `chartData` to avoid repeated filter logic.
   *
   * @param start - ISO date string for the range start (inclusive).
   * @param end   - ISO date string for the range end (inclusive).
   */
  const getFinancialsForRange = (start: string, end: string) => {
    const rangeOrders = orders.filter(o => o.date >= start && o.date <= end);
    const rangeExperiments = experiments.filter(e => e.date >= start && e.date <= end);
    const usage: Record<string, number> = {};
    const expUsage: Record<string, number> = {};
    
    rangeOrders.forEach(order => {
      const item = menu.find(m => m.id === order.menuItemId);
      if (item) {
        item.recipe.forEach(req => {
          const mat = materials.find(m => m.id === req.materialId);
          if (mat) {
            const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
            usage[req.materialId] = (usage[req.materialId] || 0) + (convertedAmount * order.quantity);
          }
        });
      }
    });

    rangeExperiments.forEach(exp => {
      exp.materials.forEach(req => {
        const mat = materials.find(m => m.id === req.materialId);
        if (mat) {
          const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
          expUsage[req.materialId] = (expUsage[req.materialId] || 0) + convertedAmount;
        }
      });
    });

    const income = rangeOrders.reduce((acc, order) => {
      const item = menu.find(m => m.id === order.menuItemId);
      return acc + (item ? (item.sellingPrice || 0) * order.quantity : 0);
    }, 0);

    const orderExpenses = materials.reduce((acc, mat) => {
      const used = usage[mat.id] || 0;
      return acc + (used * (mat.costPerUnit || 0));
    }, 0);

    const experimentExpenses = materials.reduce((acc, mat) => {
      const used = expUsage[mat.id] || 0;
      return acc + (used * (mat.costPerUnit || 0));
    }, 0);

    const expenses = orderExpenses + experimentExpenses;

    return { income, expenses, orderExpenses, experimentExpenses, profit: income - orderExpenses };
  };

  // Round-to-2-decimal wrapper around `getFinancialsForRange` for the summary period.
  // Re-computed when date bounds, orders, experiments, menu prices, or material costs change.
  const financials = useMemo(() => {
    const fins = getFinancialsForRange(summaryDateStart, summaryDateEnd);
    return { 
      income: parseFloat(fins.income.toFixed(2)), 
      expenses: parseFloat(fins.expenses.toFixed(2)), 
      orderExpenses: parseFloat(fins.orderExpenses.toFixed(2)),
      experimentExpenses: parseFloat(fins.experimentExpenses.toFixed(2)),
      profit: parseFloat(fins.profit.toFixed(2)) 
    };
  }, [summaryDateStart, summaryDateEnd, orders, experiments, menu, materials]);

  // Data points for the Recharts AreaChart.
  // Shape adapts based on summaryRange: daily→7 days, weekly→5 weeks, monthly→6 months.
  // Custom range shows per-day if ≤ 14 days, otherwise shows two aggregate points.
  const chartData = useMemo(() => {
    const data = [];
    const refDate = new Date(summaryRefDate);
    
    if (summaryRange === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(refDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const fins = getFinancialsForRange(dateStr, dateStr);
        data.push({ 
          name: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }), 
          income: fins.income,
          expenses: fins.expenses,
          profit: fins.profit
        });
      }
    } else if (summaryRange === 'weekly') {
      // Last 5 weeks
      for (let i = 4; i >= 0; i--) {
        const start = new Date(refDate);
        start.setDate(refDate.getDate() - refDate.getDay() - (i * 7));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        const fins = getFinancialsForRange(startStr, endStr);
        data.push({ 
          name: `W${start.getDate()}/${start.getMonth() + 1}`, 
          income: fins.income,
          expenses: fins.expenses,
          profit: fins.profit
        });
      }
    } else if (summaryRange === 'monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
        const startStr = d.toISOString().split('T')[0];
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const endStr = end.toISOString().split('T')[0];
        const fins = getFinancialsForRange(startStr, endStr);
        data.push({ 
          name: d.toLocaleDateString('default', { month: 'short' }), 
          income: fins.income,
          expenses: fins.expenses,
          profit: fins.profit
        });
      }
    } else {
      // Custom range - just show start and end if long, or daily if short
      const start = new Date(summaryDateStart);
      const end = new Date(summaryDateEnd);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 14) {
        for (let i = 0; i <= diffDays; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const fins = getFinancialsForRange(dateStr, dateStr);
          data.push({ 
            name: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }), 
            income: fins.income,
            expenses: fins.expenses,
            profit: fins.profit
          });
        }
      } else {
        // Just show summary
        data.push({ name: 'Period Start', income: 0, expenses: 0, profit: 0 });
        const fins = getFinancialsForRange(summaryDateStart, summaryDateEnd);
        data.push({ name: 'Period Total', income: fins.income, expenses: fins.expenses, profit: fins.profit });
      }
    }
    return data;
  }, [orders, menu, materials, summaryRange, summaryRefDate, summaryDateStart, summaryDateEnd]);

  /**
   * Provides visual "refresh" feedback by updating `lastSynced`.
   * Because all data is sourced from `onSnapshot` listeners, no actual
   * re-fetch is needed — this simply reassures the user the data is current.
   */
  const refreshData = async () => {
    setIsRefreshing(true);
    // Since we use onSnapshot, data is already real-time.
    // This button provides visual feedback and ensures the UI is fresh.
    setLastSynced(new Date());
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // ─── Material (Inventory) CRUD Handlers ───────────────────────────────────────────────

  /**
   * Adds a new blank `RawMaterial` document to Firestore (`users/{userId}/materials/{id}`).
   *
   * @param category - The category string to assign, defaults to 'Raw Materials'.
   */
  const addMaterial = async (category: string = 'Raw Materials') => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newMat: RawMaterial = {
      id,
      name: `New ${category} Item`,
      unit: 'g',
      initialStock: 0,
      costPerUnit: 0,
      category,
      threshold: 0,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    try {
      await setDoc(doc(db, 'users', userId, 'materials', id), newMat);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/materials/${id}`);
    }
  };

  /**
   * Submits the Add Material modal form, creating a new material with all fields.
   */
  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !addMatName.trim()) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newMat: RawMaterial = {
      id,
      name: addMatName.trim(),
      unit: addMatUnit,
      initialStock: parseFloat(addMatStock) || 0,
      costPerUnit: parseFloat(addMatCost) || 0,
      category: addMaterialCategory,
      threshold: parseFloat(addMatThreshold) || 0,
      dateAdded: new Date().toISOString().split('T')[0],
      ...(addMatExpiry ? { expiryDate: addMatExpiry } : {}),
    };
    try {
      await setDoc(doc(db, 'users', userId, 'materials', id), newMat);
      setShowAddMaterialModal(false);
      setAddMatName('');
      setAddMatUnit('g');
      setAddMatStock('');
      setAddMatCost('');
      setAddMatThreshold('');
      setAddMatExpiry('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/materials/${id}`);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Name,Unit,Initial Stock,Cost,Threshold\nFlour,kg,100,2.5,20\nSugar,kg,50,1.2,10";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Bakery_RawMaterials_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>, targetCategory: string) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    const userId = auth.currentUser.uid;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          let count = 0;

          results.data.forEach((row: any) => {
            const name = row['Name']?.trim();
            if (!name) return; // Skip invalid rows

            const id = Math.random().toString(36).substr(2, 9);
            const newMat: RawMaterial = {
              id,
              name,
              unit: row['Unit']?.trim() || 'g',
              initialStock: parseFloat(row['Initial Stock']) || 0,
              costPerUnit: parseFloat(row['Cost']) || 0,
              category: targetCategory,
              threshold: parseFloat(row['Threshold']) || 0,
              dateAdded: new Date().toISOString().split('T')[0]
            };

            const docRef = doc(db, 'users', userId, 'materials', id);
            batch.set(docRef, newMat);
            count++;
          });

          if (count > 0) {
            await batch.commit();
            showAlert('Success', `Imported ${count} items from CSV.`);
          } else {
            showAlert('Warning', 'No valid items found in the CSV. Make sure you have a "Name" column.');
          }
        } catch (err: any) {
          showAlert('Error', `Failed to import CSV: ${err.message}`);
        }
        
        // Reset file input
        e.target.value = '';
      }
    });
  };

  /**
   * Adds a new named category to the local list and persists it to Firestore.
   * Skips blank strings and duplicates (case-sensitive).
   *
   * @param name - Display label for the new category.
   */
  const addCategory = async (name: string) => {
    if (!name || categories.includes(name) || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const newCategories = [...categories, name];
    try {
      await setDoc(doc(db, 'users', userId, 'settings', 'bakery'), { categories: newCategories }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/bakery`);
    }
  };

  /**
   * Removes a category from the list and persists the change to Firestore.
   *
   * @param name - Display label of the category to remove.
   */
  const deleteCategory = async (name: string) => {
    if (name === 'Raw Materials') {
      showAlert("Cannot Delete", "Cannot delete the default 'Raw Materials' category.");
      return;
    }
    showConfirm(
      "Delete Category",
      `Are you sure you want to delete the '${name}' category? All materials in this category will be moved to 'Raw Materials'.`,
      async () => {
        if (!auth.currentUser) return;
        const userId = auth.currentUser.uid;
        const newCategories = categories.filter(c => c !== name);
        try {
          // Update materials in this category
          const matsToUpdate = materials.filter(m => m.category === name);
          for (const mat of matsToUpdate) {
            await setDoc(doc(db, 'users', userId, 'materials', mat.id), { 
              ...mat,
              category: 'Raw Materials' 
            }, { merge: true });
          }
          await setDoc(doc(db, 'users', userId, 'settings', 'bakery'), { categories: newCategories }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/bakery`);
        }
      }
    );
  };

  /**
   * Partially updates a material document in Firestore via `setDoc` with `merge: true`.
   *
   * @param id    - Firestore document ID of the material to update.
   * @param field - Field key on `RawMaterial` to change.
   * @param value - New value for the field.
   */
  const updateMaterial = async (id: string, field: keyof RawMaterial, value: any) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const mat = materials.find(m => m.id === id);
    try {
      if (mat) {
        await setDoc(doc(db, 'users', userId, 'materials', id), { 
          ...mat,
          [field]: value 
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', userId, 'materials', id), { [field]: value }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/materials/${id}`);
    }
  };

  /**
   * Atomically updates multiple fields on a material in a single Firestore write.
   * Use this instead of calling updateMaterial() multiple times, which causes
   * race conditions (each call spreads the stale mat object, overwriting each other).
   *
   * @param id     - Firestore document ID of the material to update.
   * @param fields - Partial object of fields to merge.
   */
  const patchMaterial = async (id: string, fields: Partial<RawMaterial>) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const mat = materials.find(m => m.id === id);
    try {
      await setDoc(
        doc(db, 'users', userId, 'materials', id),
        mat ? { ...mat, ...fields } : fields,
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/materials/${id}`);
    }
  };

  // ─── Restock Modal State ────────────────────────────────────────────────────────
  // State for the Restock Material modal, declared here so it can share scope
  // with the materials array and update Material handler.
  type DiscardTarget = { id: string; name: string; type: 'material' | 'recipe'; batchId?: string; maxQty: number; unit: string; costPerUnit: number };
  const [discardTarget, setDiscardTarget] = useState<DiscardTarget | null>(null);
  const [discardQty, setDiscardQty] = useState('');
  const [discardReason, setDiscardReason] = useState('');

  const handleDiscard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !discardTarget || !discardQty) return;
    const qty = Number(discardQty);
    if (qty <= 0) return;

    try {
      const userId = auth.currentUser.uid;
      const totalCost = qty * discardTarget.costPerUnit;
      
      const batchOp = writeBatch(db);
      
      const logId = 'waste_' + Date.now();
      batchOp.set(doc(db, 'users', userId, 'wastageLogs', logId), {
        id: logId,
        type: discardTarget.type,
        itemId: discardTarget.id,
        quantity: qty,
        cost: totalCost,
        date: new Date().toISOString().split('T')[0],
        reason: discardReason || 'Discarded'
      });
      
      if (discardTarget.type === 'material') {
        const mat = materials.find(m => m.id === discardTarget.id);
        if (mat) {
           let amountToDeduct = qty;
           const newBatches = Array.isArray(mat.batches) ? [...mat.batches].map(b => ({...b})) : [];
           
           if (discardTarget.batchId) {
             const b = newBatches.find(x => x.id === discardTarget.batchId);
             if (b) b.remainingQuantity = Math.max(0, b.remainingQuantity - amountToDeduct);
           } else {
             newBatches.sort((a,b) => a.expiryDate.localeCompare(b.expiryDate));
             for (const b of newBatches) {
               if (amountToDeduct <= 0) break;
               if (b.remainingQuantity >= amountToDeduct) {
                 b.remainingQuantity -= amountToDeduct;
                 amountToDeduct = 0;
               } else {
                 amountToDeduct -= b.remainingQuantity;
                 b.remainingQuantity = 0;
               }
             }
           }
           
           const newStock = parseFloat((mat.initialStock - qty).toFixed(4));
           batchOp.set(doc(db, 'users', userId, 'materials', mat.id), {
             initialStock: newStock,
             batches: newBatches
           }, { merge: true });
        }
      } else {
         const menuIt = menu.find(m => m.id === discardTarget.id);
         if (menuIt) {
            batchOp.set(doc(db, 'users', userId, 'menu', menuIt.id), {
              finishedGoodsStock: Math.max(0, (menuIt.finishedGoodsStock || 0) - qty)
            }, { merge: true });
         }
      }
      
      await batchOp.commit();
      
      setDiscardTarget(null);
      setDiscardQty('');
      setDiscardReason('');
      toast.success('Wastage logged successfully');
    } catch(err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser?.uid}/wastageLogs`);
    }
  };

  const [restockMaterial, setRestockMaterial] = useState<RawMaterial | null>(null);
  const [restockQty, setRestockQty] = useState<string>('');
  const [restockBaseTotal, setRestockBaseTotal] = useState<string>('');
  const [restockExpiryDate, setRestockExpiryDate] = useState<string>('');

  // Add Material modal state
  const [showAddMaterialModal, setShowAddMaterialModal] = useState<boolean>(false);
  const [addMaterialCategory, setAddMaterialCategory] = useState<string>('Raw Materials');
  const [addMatName, setAddMatName] = useState<string>('');
  const [addMatUnit, setAddMatUnit] = useState<string>('g');
  const [addMatStock, setAddMatStock] = useState<string>('');
  const [addMatCost, setAddMatCost] = useState<string>('');
  const [addMatThreshold, setAddMatThreshold] = useState<string>('');
  const [addMatExpiry, setAddMatExpiry] = useState<string>('');

  /**
   * Processes a material restock and recalculates its Moving Average Cost (MAC).
   * 
   * MAC Formula:
   * 1. Calculate current total value = current stock × current cost
   * 2. Add new batch cost (`restockBaseTotal`) to total value
   * 3. Divide by the new total stock amount
   * 
   * @param e - Form event (prevents page reload)
   */
  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockMaterial || !auth.currentUser || !restockQty || !restockBaseTotal) return;
    try {
      const qty = Number(restockQty);
      const baseTotal = Number(restockBaseTotal);
      if (qty <= 0) return;
      
      const newStock = (restockMaterial.initialStock || 0) + qty;
      const oldTotalValue = (restockMaterial.initialStock || 0) * (restockMaterial.costPerUnit || 0);
      const newMAC = newStock > 0 ? (oldTotalValue + baseTotal) / newStock : 0;
      
      const userId = auth.currentUser.uid;
      const restockUpdate: Record<string, any> = {
        initialStock: newStock,
        costPerUnit: Number(newMAC.toFixed(2))
      };
      if (restockExpiryDate) {
        restockUpdate.expiryDate = restockExpiryDate;
      }
      await setDoc(doc(db, 'users', userId, 'materials', restockMaterial.id), restockUpdate, { merge: true });
      
      setRestockMaterial(null);
      setRestockQty('');
      setRestockBaseTotal('');
      setRestockExpiryDate('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}/materials/${restockMaterial.id}`);
    }
  };

  /**
   * Deletes a material document from Firestore after user confirmation.
   * Uses `showConfirm` to prevent accidental deletion.
   *
   * @param id - The Firestore document ID of the material to delete.
   */
  const deleteMaterial = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'materials', id));
      // Also clean up recipes
      const itemsToUpdate = menu.filter(item => item.recipe.some(r => r.materialId === id));
      for (const item of itemsToUpdate) {
        const newRecipe = item.recipe.filter(r => r.materialId !== id);
        await setDoc(doc(db, 'users', userId, 'menu', item.id), { 
          ...item,
          recipe: newRecipe 
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/materials/${id}`);
    }
  };

  // ─── Menu Item Handlers ──────────────────────────────────────────────────────────

  /**
   * Creates a new blank menu item in Firestore (`users/{userId}/menu/{id}`).
   * The new item starts with an empty recipe and zero selling price;
   * the user edits it inline in the Menu tab.
   */
  const addMenuItem = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newItem: MenuItem = {
      id,
      name: 'New Menu Item',
      sellingPrice: 0,
      recipe: [],
      emoji: '🧁'
    };
    try {
      await setDoc(doc(db, 'users', userId, 'menu', id), newItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/menu/${id}`);
    }
  };

  /**
   * Updates the `name` field of a menu item in Firestore, spreading the
   * existing item data to prevent accidentally wiping recipe/price fields.
   *
   * @param id   - Firestore document ID of the menu item.
   * @param name - New display name.
   */
  const updateMenuItem = async (id: string, name: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const item = menu.find(m => m.id === id);
    try {
      if (item) {
        await setDoc(doc(db, 'users', userId, 'menu', id), { 
          ...item,
          name 
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', userId, 'menu', id), { name }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/menu/${id}`);
    }
  };

  /**
   * Generically updates any single field on a menu item document.
   * Spreads the existing item to avoid clobbering other fields.
   *
   * @param id    - Firestore document ID of the menu item.
   * @param field - The `MenuItem` field key to update.
   * @param value - New value for the field.
   */
  const updateMenuItemField = async (id: string, field: keyof MenuItem, value: any) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const item = menu.find(m => m.id === id);
    try {
      if (item) {
        await setDoc(doc(db, 'users', userId, 'menu', id), { 
          ...item,
          [field]: value 
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', userId, 'menu', id), { [field]: value }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/menu/${id}`);
    }
  };

  /**
   * Deletes a menu item and all associated sales orders from Firestore.
   * Cascading order deletion prevents orphaned records.
   *
   * @param id - Firestore document ID of the menu item to delete.
   */
  const deleteMenuItem = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'menu', id));
      // Clean up orders
      const ordersToDelete = orders.filter(o => o.menuItemId === id);
      for (const order of ordersToDelete) {
        await deleteDoc(doc(db, 'users', userId, 'orders', order.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/menu/${id}`);
    }
  };

  /**
   * Resets `finishedGoodsStock` to 0 for a menu item after user confirmation.
   * Used from the Production Log tab when pre-baked goods have been sold or discarded.
   *
   * @param id - Firestore document ID of the menu item.
   */
  const clearFinishedGoodsStock = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    if (window.confirm('Are you sure you want to clear the stock for this finished good?')) {
      try {
        await setDoc(doc(db, 'users', userId, 'menu', id), { finishedGoodsStock: 0 }, { merge: true });
        showAlert('Success', 'Finished goods stock cleared.');
      } catch (err: any) {
        console.error('clearFinishedGoodsStock error:', err);
        showAlert('Error', `Failed to clear stock: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  // ─── Recipe Experiment Handlers ───────────────────────────────────────────────────

  /**
   * Creates a new recipe experiment document in Firestore for the currently
   * selected `orderDate`. The experiment starts with no materials assigned.
   */
  const addExperiment = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newExp: RecipeExperiment = {
      id,
      name: 'New Experiment',
      date: new Date().toISOString().split('T')[0],
      materials: []
    };
    try {
      await setDoc(doc(db, 'users', userId, 'experiments', id), newExp);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/experiments/${id}`);
    }
  };

  const updateExperiment = async (id: string, field: keyof RecipeExperiment, value: any) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const exp = experiments.find(e => e.id === id);
    try {
      if (exp) {
        await setDoc(doc(db, 'users', userId, 'experiments', id), { 
          ...exp,
          [field]: value 
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', userId, 'experiments', id), { [field]: value }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/experiments/${id}`);
    }
  };

  /**
   * Removes an experiment document from Firestore.
   *
   * @param id - Firestore document ID of the experiment to delete.
   */
  const deleteExperiment = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'experiments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/experiments/${id}`);
    }
  };

  const addMaterialToExperiment = async (expId: string, materialId: string) => {
    const exp = experiments.find(e => e.id === expId);
    if (!exp || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;

    if (exp.materials.some(m => m.materialId === materialId)) return;

    const newMaterials = [...exp.materials, { materialId, amount: 0, unit: mat.unit }];
    try {
      await setDoc(doc(db, 'users', userId, 'experiments', expId), { 
        ...exp,
        materials: newMaterials 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/experiments/${expId}`);
    }
  };

  const removeMaterialFromExperiment = async (expId: string, materialId: string) => {
    const exp = experiments.find(e => e.id === expId);
    if (!exp || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const newMaterials = exp.materials.filter(m => m.materialId !== materialId);
    try {
      await setDoc(doc(db, 'users', userId, 'experiments', expId), { 
        ...exp,
        materials: newMaterials 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/experiments/${expId}`);
    }
  };


  /**
   * Updates the required amount of a specific material in an experiment.
   * Spreads existing data to prevent data loss on other materials.
   *
   * @param expId      - Firestore document ID of the experiment.
   * @param materialId - ID of the raw material to update.
   * @param amount     - New quantity for the specified material.
   */
  const updateExperimentMaterial = async (expId: string, materialId: string, amount: number) => {
    const exp = experiments.find(e => e.id === expId);
    if (!exp || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const newMaterials = exp.materials.map(m => m.materialId === materialId ? { ...m, amount } : m);
    try {
      await setDoc(doc(db, 'users', userId, 'experiments', expId), { 
        ...exp,
        materials: newMaterials 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/experiments/${expId}`);
    }
  };

  /**
   * Duplicates an existing menu item with a "(Copy)" suffix on the name.
   * The new item gets a freshly generated ID and deeply copies the recipe array.
   *
   * @param item - The original `MenuItem` object to copy.
   */
  const copyMenuItem = async (item: MenuItem) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newItem: MenuItem = {
      ...item,
      id,
      name: `${item.name} (Copy)`,
      recipe: item.recipe.map(r => ({ ...r }))
    };
    try {
      await setDoc(doc(db, 'users', userId, 'menu', id), newItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/menu/${id}`);
    }
  };

  /**
   * Adds a new blank ingredient requirement to a recipe.
   * Defaults to the first material found in the specified category,
   * setting its unit to the default recipe unit for that material.
   *
   * @param itemId   - Firestore document ID of the menu item (recipe) to modify.
   * @param category - Category to select a default material from.
   */
  const addIngredientToRecipe = async (itemId: string, category: string = 'Raw Materials') => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const filteredMaterials = materials.filter(m => m.category === category);
    if (filteredMaterials.length === 0) {
      showAlert("No Materials", `Please add some materials to the '${category}' category first.`);
      return;
    }
    const defaultMaterial = filteredMaterials[0];
    const item = menu.find(m => m.id === itemId);
    if (!item) return;
    
    const newRecipe = [...item.recipe, { materialId: defaultMaterial.id, amount: 0, unit: getDefaultRecipeUnit(defaultMaterial.unit) }];
    try {
      await setDoc(doc(db, 'users', userId, 'menu', itemId), { 
        ...item,
        recipe: newRecipe 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/menu/${itemId}`);
    }
  };

  /**
   * Appends multiple ingredients from the Quick Select modal into a recipe.
   *
   * @param itemId           - Firestore document ID of the menu item (recipe) to modify.
   * @param quickIngredients - Array of ingredient requirements to append.
   */
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
      showAlert("Success", `Added ${quickIngredients.length} ingredients to recipe.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/menu/${itemId}`);
    }
  };

  // ─── Recipe Ingredient Handlers ───────────────────────────────────────────────────

  /**
   * When the material selection changes on an ingredient row, automatically
   * updates the `unit` field to the default recipe unit for the new material
   * so the user doesn't have to manually fix the unit every time.
   */
  const updateRecipeIngredient = async (itemId: string, index: number, field: keyof IngredientRequirement, value: string | number) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const item = menu.find(m => m.id === itemId);
    if (!item) return;

    const newRecipe = [...item.recipe];
    const updatedIngredient = { ...newRecipe[index], [field]: value };
    
    if (field === 'materialId') {
      const newMat = materials.find(m => m.id === value);
      if (newMat) {
        updatedIngredient.unit = getDefaultRecipeUnit(newMat.unit);
      }
    }
    
    newRecipe[index] = updatedIngredient;
    try {
      await setDoc(doc(db, 'users', userId, 'menu', itemId), { 
        ...item,
        recipe: newRecipe 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/menu/${itemId}`);
    }
  };

  /**
   * Removes an ingredient from a recipe by its index.
   *
   * @param itemId - Firestore document ID of the menu item (recipe) to modify.
   * @param index  - Index of the ingredient in the recipe array to remove.
   */
  const removeIngredientFromRecipe = async (itemId: string, index: number) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const item = menu.find(m => m.id === itemId);
    if (!item) return;

    const newRecipe = [...item.recipe];
    newRecipe.splice(index, 1);
    try {
      await setDoc(doc(db, 'users', userId, 'menu', itemId), { 
        ...item,
        recipe: newRecipe 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/menu/${itemId}`);
    }
  };

  // ─── Inventory Deduction Helper ────────────────────────────────────────────────────

  /**
   * Deducts (or restores) ingredients for a recipe batch from inventory.
   *
   * For each recipe ingredient, the required amount is converted to the material's
   * native unit via `convertAmount` and multiplied by `multiplier`.
   *
   * **Key trick**: Pass a **negative** multiplier (e.g. `-quantity`) to undo a
   * previous deduction — this is how production run deletion restores stock:
   *   `addDeductionsToBatch(batch, userId, recipe, -quantity)`
   *
   * When `batch` is provided, writes are added to the batch (caller must commit).
   * When `batch` is omitted, writes are executed immediately (legacy behaviour).
   *
   * @param userId     - The authenticated user's UID (Firestore path prefix).
   * @param recipe     - Array of ingredient requirements to process.
   * @param multiplier - Number of units produced (positive) or reversed (negative).
   * @param batch      - Optional WriteBatch to add operations to for atomic commits.
   */
  // ─── Shared ingredient deduction helper ────────────────────────────────────
  const deductIngredients = async (
    userId: string,
    recipe: { materialId: string; amount: number; unit: string }[],
    multiplier: number,
    batch?: ReturnType<typeof writeBatch>
  ) => {
    for (const req of recipe) {
      const mat = materials.find(m => m.id === req.materialId);
      if (!mat) continue;
      const convertedAmt = convertAmount(req.amount, req.unit || 'g', mat.unit);
      const totalDeduction = convertedAmt * multiplier;
      const newStock = parseFloat((mat.initialStock - totalDeduction).toFixed(4));
      const matRef = doc(db, 'users', userId, 'materials', mat.id);
      if (batch) {
        batch.set(matRef, { ...mat, initialStock: newStock }, { merge: true });
      } else {
        await setDoc(matRef, { ...mat, initialStock: newStock }, { merge: true });
      }
    }
  };

  // ─── Production Run Handlers ────────────────────────────────────────────────────────

  /**
   * Records a production baking run in Firestore using an atomic `writeBatch`.
   * All operations either succeed together or fail together — no partial writes:
   *  1. Deducts raw materials from inventory.
   *  2. Increments `finishedGoodsStock` on the menu item (if purpose allows).
   *  3. Writes the run document to `users/{userId}/productionRuns/{id}`.
   *
   * @param runData - All run fields except auto-generated `id` and `createdAt`.
   */
  const logProductionRun = async (
    runData: Omit<ProductionRun, 'id' | 'createdAt'>
  ) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);

    // Firestore does not accept `undefined` — build object only with defined fields
    const recipeItem = menu.find(m => m.id === runData.recipeId);
    let expiryDate = undefined;
    if (recipeItem?.shelfLifeDays) {
       const d = new Date(runData.date);
       d.setDate(d.getDate() + recipeItem.shelfLifeDays);
       expiryDate = d.toISOString().split('T')[0];
    }
    const yieldAmt = runData.quantityYield ?? runData.quantityProduced;
    const run: Record<string, any> = {
      id,
      recipeId: runData.recipeId,
      quantityProduced: runData.quantityProduced,
      remainingQuantity: yieldAmt,
      ...(expiryDate && { expiryDate }),
      date: runData.date,
      purpose: runData.purpose,
      costTotal: runData.costTotal,
      createdAt: Date.now(),
    };
    if (runData.quantityYield !== undefined) run.quantityYield = runData.quantityYield;
    if (runData.notes) run.notes = runData.notes;

    try {
      const batch = writeBatch(db);

      // 1. Deduct raw materials (added to batch, not committed yet)
      const item = menu.find(m => m.id === runData.recipeId);
      if (item) {
        await deductIngredients(userId, item.recipe, runData.quantityProduced, batch);
      }

      // 2. Add finished goods (if purpose warrants it)
      const STOCK_PURPOSES: ProductionPurpose[] = ['customer_order', 'market_stock', 'other'];
      if (STOCK_PURPOSES.includes(runData.purpose)) {
        const effectiveYield = runData.quantityYield ?? runData.quantityProduced;
        const currentStock = item?.finishedGoodsStock ?? 0;
        batch.set(
          doc(db, 'users', userId, 'menu', runData.recipeId),
          { finishedGoodsStock: currentStock + effectiveYield },
          { merge: true }
        );
      }

      // 3. Persist the run record
      batch.set(doc(db, 'users', userId, 'productionRuns', id), run);

      // Commit all writes atomically
      await batch.commit();

      showAlert('Production Run Logged', `Recorded ${runData.quantityProduced} unit(s) of ${item?.name || 'recipe'}. Raw materials deducted.`);
    } catch (err: any) {
      console.error('logProductionRun error:', err);
      showAlert('Error', `Failed to log production run: ${err?.message || 'Unknown error'}`);
      throw err; // re-throw so modal catch block handles isSaving reset
    }
  };

  /**
   * Deletes a production run after confirmation using an atomic `writeBatch`,
   * then reverses its inventory effects. All-or-nothing:
   *  1. Restores raw materials using `deductIngredients` with a negative multiplier.
   *  2. Decrements `finishedGoodsStock` (clamped to 0) on the menu item.
   *  3. Deletes the run document from Firestore.
   *
   * @param runId - Firestore document ID of the production run to delete.
   */
  const deleteProductionRun = async (runId: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const run = productionRuns.find(r => r.id === runId);
    if (!run) return;

    if (window.confirm('Are you sure you want to delete this production run? This will restore raw materials and deduct finished goods stock.')) {
      try {
        const batch = writeBatch(db);

        // 1. Restore raw materials (added to batch)
        const item = menu.find(m => m.id === run.recipeId);
        if (item) {
          await deductIngredients(userId, item.recipe, -run.quantityProduced, batch);

          // 2. Deduct finished goods (if applicable)
          const STOCK_PURPOSES: ProductionPurpose[] = ['customer_order', 'market_stock', 'other'];
          if (STOCK_PURPOSES.includes(run.purpose)) {
            const effectiveYield = run.quantityYield ?? run.quantityProduced;
            const currentStock = item.finishedGoodsStock ?? 0;
            batch.set(
              doc(db, 'users', userId, 'menu', run.recipeId),
              { finishedGoodsStock: Math.max(0, currentStock - effectiveYield) },
              { merge: true }
            );
          }
        }

        // 3. Delete the run record
        batch.delete(doc(db, 'users', userId, 'productionRuns', runId));

        // Commit all writes atomically
        await batch.commit();

        showAlert('Success', 'Production run deleted and inventory restored.');
      } catch (err: any) {
        console.error('deleteProductionRun error:', err);
        showAlert('Error', `Failed to delete production run: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  // ─── Order Handlers ──────────────────────────────────────────────────────────────

  /**
   * Adds a blank order for `orderDate`, defaulting to the first menu item.
   * The user edits the item and quantity inline on the Orders tab.
   */
  const addOrder = async () => {
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
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/orders/${id}`);
    }
  };

  /**
   * Handles inventory deduction when an order is marked as fulfilled.
   * Uses `writeBatch` for atomic multi-doc writes.
   *
   * Priority logic:
   *  - If `finishedGoodsStock === 0`: deducts raw materials directly.
   *  - If stock >= order.quantity: deducts from finished goods only.
   *  - Partial stock: asks the user whether to use raw materials for the full order.
   *
   * @param order - The order being fulfilled.
   */
  // Called when an order quantity is finalised — deducts finished goods OR raw materials
  const fulfillOrder = async (order: Order) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const item = menu.find(m => m.id === order.menuItemId);
    if (!item) return;

    const stock = item.finishedGoodsStock ?? 0;

    if (stock === 0) {
      // No finished goods: deduct raw materials atomically
      const batch = writeBatch(db);
      await deductIngredients(userId, item.recipe, order.quantity, batch);
      await batch.commit();
    } else if (stock >= order.quantity) {
      // Enough stock: deduct finished goods only, and apply FIFO logic to ProductionRuns
      const batch = writeBatch(db);
      
      // FIFO logic
      let remainingToDeduct = order.quantity;
      const relevantRuns = productionRuns
        .filter(r => r.recipeId === item.id && (r.remainingQuantity ?? 0) > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      
      for (const run of relevantRuns) {
        if (remainingToDeduct <= 0) break;
        const available = run.remainingQuantity ?? 0;
        const deduct = Math.min(available, remainingToDeduct);
        batch.set(
          doc(db, 'users', userId, 'productionRuns', run.id),
          { remainingQuantity: available - deduct },
          { merge: true }
        );
        remainingToDeduct -= deduct;
      }
      
      batch.set(
        doc(db, 'users', userId, 'menu', item.id),
        { finishedGoodsStock: stock - order.quantity },
        { merge: true }
      );
      await batch.commit();
    } else {
      // Partial: show choice
      const choice = window.confirm(
        `Only ${stock} unit(s) of "${item.name}" in finished stock, but order is for ${order.quantity}.\n\nClick OK to use raw materials for the full order.\nClick Cancel to log a production run first.`
      );
      if (choice) {
        // Deduct raw materials AND clear finished goods atomically
        const batch = writeBatch(db);
        await deductIngredients(userId, item.recipe, order.quantity, batch);
        batch.set(
          doc(db, 'users', userId, 'menu', item.id),
          { finishedGoodsStock: 0 },
          { merge: true }
        );
        await batch.commit();
      }
      // If user cancelled, do nothing — they'll log a run first
    }
  };

  const updateOrder = async (id: string, field: keyof Order, value: string | number) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const order = orders.find(o => o.id === id);
    try {
      if (order) {
        await setDoc(doc(db, 'users', userId, 'orders', id), { 
          ...order,
          [field]: value 
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', userId, 'orders', id), { [field]: value }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/orders/${id}`);
    }
  };

  /**
   * Deletes an order document from Firestore.
   * Note: Raw material stock is NOT automatically restored on delete;
   * use `fulfillOrder` with a negative quantity adjustment if needed.
   *
   * @param id - Firestore document ID of the order to delete.
   */
  const deleteOrder = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'orders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/orders/${id}`);
    }
  };

  /**
   * Bulk-deletes all orders for the currently selected `orderDate` after confirmation.
   * Does not restore inventory for fulfilled orders.
   */
  const resetOrders = () => {
    showConfirm(
      "Reset Orders",
      `Are you sure you want to reset all orders for ${orderDate}?`,
      async () => {
        if (!auth.currentUser) return;
        const userId = auth.currentUser.uid;
        const ordersToDelete = orders.filter(o => o.date === orderDate);
        try {
          for (const order of ordersToDelete) {
            await deleteDoc(doc(db, 'users', userId, 'orders', order.id));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${userId}/orders`);
        }
      }
    );
  };

  // ─── Summary / Financial Helpers ─────────────────────────────────────────────────────

  /**
   * Computes `summaryDateStart` / `summaryDateEnd` from the selected
   * `summaryRange` and `refDate`. For 'custom', bounds are set manually.
   *
   * @param range   - The time window to apply.
   * @param refDate - The anchor date (defaults to `summaryRefDate`).
   */
  const handleRangeChange = (range: 'daily' | 'weekly' | 'monthly' | 'custom', refDate: string = summaryRefDate) => {
    setSummaryRange(range);
    const today = new Date(refDate);
    let start = new Date(today);
    let end = new Date(today);

    if (range === 'daily') {
      // already set to today
    } else if (range === 'weekly') {
      // Start of week (Sunday)
      start.setDate(today.getDate() - today.getDay());
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (range === 'monthly') {
      // Start of month
      start.setDate(1);
      // End of month
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    setSummaryDateStart(start.toISOString().split('T')[0]);
    setSummaryDateEnd(end.toISOString().split('T')[0]);
  };

  // Re-compute date bounds whenever the user changes the range or navigates pages.
  // Dependency: `summaryRefDate`, `summaryRange`.
  useEffect(() => {
    if (summaryRange !== 'custom') {
      handleRangeChange(summaryRange, summaryRefDate);
    }
  }, [summaryRefDate, summaryRange]);

  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  
  // ─── Computed Values (useMemo) ──────────────────────────────────────────────────────
  const expiredBatches = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return productionRuns.filter(r => 
      (r.remainingQuantity ?? 0) > 0 && r.expiryDate && r.expiryDate <= today
    );
  }, [productionRuns]);

  const handleDiscardBatch = async (batch: ProductionRun) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const qty = batch.remainingQuantity ?? 0;
    if (qty <= 0) return;

    // We prorate the historic cost based on the quantity being discarded vs produced
    const originalQty = batch.quantityYield ?? batch.quantityProduced;
    const proratedCost = originalQty > 0 ? (batch.costTotal * (qty / originalQty)) : 0;

    const recipe = menu.find(m => m.id === batch.recipeId);
    
    try {
      const batchOp = writeBatch(db);
      
      const logId = 'waste_' + Date.now();
      batchOp.set(doc(db, 'users', userId, 'wastageLogs', logId), {
        id: logId,
        type: 'recipe',
        itemId: batch.recipeId,
        quantity: qty,
        cost: proratedCost,
        date: new Date().toISOString().split('T')[0],
        reason: 'Expired'
      });
      
      // Update the production run remaining quantity
      batchOp.set(
        doc(db, 'users', userId, 'productionRuns', batch.id),
        { remainingQuantity: 0 },
        { merge: true }
      );
      
      // Also deduct from global finishedGoodsStock if present
      if (recipe && (recipe.finishedGoodsStock ?? 0) > 0) {
        batchOp.set(
          doc(db, 'users', userId, 'menu', recipe.id),
          { finishedGoodsStock: Math.max(0, (recipe.finishedGoodsStock ?? 0) - qty) },
          { merge: true }
        );
      }
      
      await batchOp.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/wastageLogs (batch discard)`);
    }
  };

  // Aggregated income/expenses/profit for the currently selected date range.
  // Re-computed whenever orders, menu prices, materials costs, or date bounds change.
  const summaryFinancials = useMemo(() => getFinancialsForRange(summaryDateStart, summaryDateEnd), [summaryDateStart, summaryDateEnd, orders, menu, materials]);
  // Count and average value of orders within the selected period.
  const activeOrdersCount = useMemo(() => orders.filter(o => o.date >= summaryDateStart && o.date <= summaryDateEnd).length, [orders, summaryDateStart, summaryDateEnd]);
  const averageOrderValue = useMemo(() => activeOrdersCount > 0 ? summaryFinancials.income / activeOrdersCount : 0, [summaryFinancials.income, activeOrdersCount]);

  /** Triggers a 2-second success animation without writing to Firestore. */
  const saveDay = () => {
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 2000);
  };

  /**
   * Saves the full settings object (profile, categories, currency) in one
   * Firestore write to `users/{userId}/settings/bakery`, then shows a
   * brief success banner via `showSaveFeedback`.
   */
  const saveSettings = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'settings', 'bakery'), {
        ...settings,
        categories,
        currency
      }, { merge: true });
      setShowSaveFeedback(true);
      setTimeout(() => setShowSaveFeedback(false), 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/bakery`);
    }
  };

  // ─── Render Helpers ──────────────────────────────────────────────────────────────

  /**
   * Renders a styled tab navigation button.
   * Uses Framer Motion's `layoutId="activeTab"` to animate the active underline
   * sliding between tabs.
   */
  const SidebarTabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold transition-all group ${
        activeTab === id 
          ? 'bg-amber-50 text-amber-600 shadow-sm border border-amber-100/50' 
          : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
      }`}
    >
      <Icon size={20} className={`transition-transform duration-300 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span>{label}</span>
      {id === 'inventory' && lowStockItems.length > 0 && !isAlertDismissed && (
        <span className="absolute right-4 w-2 h-2 bg-rose-500 rounded-full" />
      )}
      {activeTab === id && (
        <motion.div 
          layoutId="activeSidebarTab"
          className="absolute left-0 w-1 h-8 bg-amber-500 rounded-r-full"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );

  const BottomNavButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center gap-1 flex-1 min-w-0 px-1 py-2 rounded-xl transition-all relative ${
        activeTab === id 
          ? 'text-amber-600' 
          : 'text-stone-400 hover:text-stone-600'
      }`}
    >
      <div className="relative">
        <Icon size={22} className={`transition-transform duration-300 ${activeTab === id ? '-translate-y-1' : ''}`} />
        {id === 'inventory' && lowStockItems.length > 0 && !isAlertDismissed && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
        )}
      </div>
      <span className="text-[10px] font-bold tracking-wide">{label}</span>
      {activeTab === id && (
        <motion.div 
          layoutId="activeBottomTab"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-amber-500 rounded-b-full"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );

  // ─── Render Gate: Loading ──────────────────────────────────────────────────────
  // Shows a spinner while Firebase Auth resolves the session on first load.
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium font-sans italic">Initializing Bakery...</p>
        </div>
      </div>
    );
  }

  // ─── Render Gate: Authentication ───────────────────────────────────────────────────
  // If auth is ready but no user is signed in, render the login / sign-up card.
  // Supports Google OAuth popup and email/password auth modes.
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200 shadow-xl max-w-md w-full"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary p-4 rounded-xl text-white mb-4 shadow-lg shadow-primary/20">
              <Utensils size={32} />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 font-sans">Bakery Manager</h2>
            <p className="text-stone-500 text-sm text-center mt-2 font-sans italic">Manage your bakery inventory and recipes securely in the cloud.</p>
          </div>

          {authError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl text-center font-medium">
              {authError}
            </div>
          )}

          {authMode === 'google' ? (
            <div className="space-y-4">
              <button 
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold py-3 rounded-xl shadow-sm transition-all transform active:scale-[0.98]"
              >
                <Globe size={20} className="text-primary" />
                Sign in with Google
              </button>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-stone-400 font-bold tracking-widest">Or</span>
                </div>
              </div>

              <button 
                onClick={() => setAuthMode('login')}
                className="w-full flex items-center justify-center gap-3 bg-stone-800 hover:bg-stone-900 text-white font-bold py-3 rounded-xl shadow-sm transition-all transform active:scale-[0.98]"
              >
                <Mail size={20} />
                Sign in with Email
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-stone-400 font-bold tracking-widest">Or</span>
                </div>
              </div>

              <button 
                onClick={handleDemoLogin}
                disabled={isAuthenticating || isDemoLoading}
                className="w-full flex items-center justify-center gap-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold py-3 rounded-xl shadow-sm transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <Sparkles size={20} className={`text-amber-600 ${isDemoLoading ? 'animate-spin' : 'animate-pulse'}`} />
                {isDemoLoading ? 'Generating Demo Sandbox...' : 'Explore Demo Sandbox'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="John Doe"
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="bakery@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Password</label>
                <input 
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {isAuthenticating ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              </button>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setAuthMode('google');
                    setAuthError(null);
                  }}
                  className="text-xs text-stone-400 font-medium hover:text-stone-600"
                >
                  Back to options
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-8 pt-6 border-t border-stone-100 text-center">
            <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">BetterEat Bakery</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const StatCard = ({ label, value, icon: Icon, color, trend, subtext }: { label: string, value: string, icon: any, color: string, trend?: { value: string, up: boolean }, subtext?: string }) => (
    <div className="bg-white p-6 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm bento-item flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${color} shadow-lg shadow-current/10`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend.up ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{label}</h3>
        <div className="text-2xl font-sans font-bold text-stone-900">{value}</div>
        {subtext && <p className="text-[10px] text-stone-400 mt-1 font-medium font-sans italic">{subtext}</p>}
      </div>
    </div>
  );

  // ─── Main Application Render ──────────────────────────────────────────────────────
  // The primary UI layout, containing the top navigation header and the tabbed
  // main content area wrapped in an AnimatePresence for smooth transitions.

  return (
    <div className="min-h-screen bg-surface text-stone-900 font-sans flex flex-col md:flex-row-reverse pb-20 md:pb-0">
      
      {/* Desktop Right Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-l border-stone-200/50 bg-white/80 backdrop-blur-md sticky top-0 h-screen overflow-y-auto shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] pt-6 z-40">
        {menu.length > 0 && (activeTab === 'summary' || activeTab === 'production') && (
          <div className="px-6 mb-8">
            <button 
              onClick={() => setIsProductionRunModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 font-bold"
            >
              <Factory size={20} />
              New Production Run
            </button>
          </div>
        )}
        
        <div className="px-4 flex-1">
          <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2 mb-3">Menu</h2>
          <nav className="flex flex-col gap-1 relative">
            <SidebarTabButton id="summary" label="Dashboard" icon={Calculator} />
            <SidebarTabButton id="inventory" label="Inventory" icon={Package} />
            <SidebarTabButton id="orders" label="Orders" icon={ClipboardList} />
            <SidebarTabButton id="production" label="Production" icon={Factory} />
            <SidebarTabButton id="menu" label="Recipes" icon={Utensils} />
            <SidebarTabButton id="experiments" label="R&D" icon={FlaskConical} />
            <SidebarTabButton id="wastage" label="Wastage" icon={Trash2} />
          </nav>
        </div>

        <div className="p-4 mt-auto border-t border-stone-200/50">
          <SidebarTabButton id="settings" label="Settings" icon={Settings} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/50 sticky top-0 z-30">
        {/* Notifications */}
        <div className="fixed top-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="bg-stone-900/90 backdrop-blur-md text-white px-4 sm:px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-auto border border-white/10 max-w-[calc(100vw-2rem)] sm:max-w-md w-full"
              >
                <div className="bg-rose-500 p-1.5 rounded-lg shadow-lg shadow-rose-500/20">
                  <AlertCircle size={16} />
                </div>
                <span className="text-sm font-medium">{n.message}</span>
                <button 
                  onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                  className="ml-2 text-stone-400 hover:text-white transition-colors"
                >
                  <Plus size={16} className="rotate-45" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {settings.logo ? (
                <div className="relative group shrink-0">
                  <img src={settings.logo} alt="Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-stone-100 shadow-sm transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />
                </div>
              ) : (
                <div className="bg-primary p-2 sm:p-3 rounded-xl text-white shadow-lg shadow-primary/20 shrink-0">
                  <Utensils size={24} className="sm:w-[28px] sm:h-[28px]" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-sans font-bold tracking-tight text-stone-900 leading-tight truncate">{settings.name || 'Bakery Tracker'}</h1>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Live Dashboard</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6 min-w-0 shrink">
                            {expiredBatches.length > 0 && !isExpiredAlertDismissed && (
                <div className="relative group shrink-0 z-50">
                  <button 
                    className="relative p-2 sm:p-2.5 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all shadow-sm shadow-rose-500/5"
                  >
                    <AlertCircle size={20} className="sm:w-[22px] sm:h-[22px] group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {expiredBatches.length}
                    </span>
                  </button>
                  <div className="absolute top-full right-0 sm:-left-32 mt-2 w-64 bg-white border border-stone-200 shadow-xl rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none group-hover:pointer-events-auto origin-top-right sm:origin-top scale-95 group-hover:scale-100">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-stone-100">
                      <span className="text-xs font-bold text-rose-600">Expired Batches</span>
                      <button onClick={() => setIsExpiredAlertDismissed(true)} className="text-[10px] text-stone-400 hover:text-stone-600">Dismiss</button>
                    </div>
                    <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {expiredBatches.map(batch => {
                        const recipe = menu.find(m => m.id === batch.recipeId);
                        return (
                          <li key={batch.id} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-stone-700 truncate pr-2">{recipe?.name || 'Unknown'}</span>
                            <span className="text-rose-500 font-medium whitespace-nowrap bg-rose-50 px-1.5 py-0.5 rounded">
                              Qty: {batch.remainingQuantity}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <button 
                      onMouseDown={() => { setActiveTab('menu'); setIsExpiredAlertDismissed(true); }}
                      onClick={() => { setActiveTab('menu'); setIsExpiredAlertDismissed(true); }}
                      className="mt-3 w-full block text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary-dark transition-colors text-center"
                    >
                      View & Discard
                    </button>
                  </div>
                </div>
              )}
              {lowStockItems.length > 0 && !isAlertDismissed && (
                <div className="relative group shrink-0 z-50">
                  <button 
                    className="relative p-2 sm:p-2.5 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all shadow-sm shadow-rose-500/5"
                  >
                    <AlertCircle size={20} className="sm:w-[22px] sm:h-[22px] group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {lowStockItems.length}
                    </span>
                  </button>
                  <div className="absolute top-full right-0 sm:-left-32 mt-2 w-64 bg-white border border-stone-200 shadow-xl rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none group-hover:pointer-events-auto origin-top-right sm:origin-top scale-95 group-hover:scale-100">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-stone-100">
                      <span className="text-xs font-bold text-rose-600">Low Stock Alerts</span>
                      <button onClick={() => setIsAlertDismissed(true)} className="text-[10px] text-stone-400 hover:text-stone-600">Dismiss</button>
                    </div>
                    <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {lowStockItems.map(item => (
                        <li key={item.id} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-stone-700 truncate pr-2">{item.name}</span>
                          <span className="text-rose-500 font-medium whitespace-nowrap bg-rose-50 px-1.5 py-0.5 rounded">
                            {item.initialStock} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button 
                      onMouseDown={() => { setActiveTab('inventory'); setIsAlertDismissed(true); }}
                      onClick={() => { setActiveTab('inventory'); setIsAlertDismissed(true); }}
                      className="mt-3 w-full block text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary-dark transition-colors text-center"
                    >
                      View Inventory
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-2 bg-stone-50 border border-stone-200 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 shrink-0">
                  <Globe size={14} className="text-stone-400 hidden sm:block" />
                  <select 
                    value={currency.code}
                    onChange={(e) => {
                      const selected = CURRENCIES.find(c => c.code === e.target.value);
                      if (selected) updateCurrency(selected);
                    }}
                    className="bg-transparent border-none focus:ring-0 text-xs font-bold text-stone-600 cursor-pointer appearance-none pr-4 max-w-[60px] sm:max-w-none text-ellipsis"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-6 border-l border-stone-200 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-stone-800 leading-none mb-1 font-sans">{user?.name}</div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{user?.email}</div>
                </div>
                <div className="relative group">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-sm">
                    {user?.name?.charAt(0) || 'B'}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-white text-stone-400 hover:text-rose-600 border border-stone-200 rounded-lg transition-all shadow-sm hover:shadow-md"
                    title="Log Out"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-3 py-8 sm:px-4 lg:px-6">
        <AnimatePresence mode="wait">
          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {/* Low Stock Alerts */}
              {lowStockItems.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-rose-50 border border-rose-100 rounded-[10px] sm:rounded-[15px] p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 text-rose-600">
                    <AlertCircle size={24} />
                    <h3 className="font-bold uppercase tracking-widest text-[10px]">Critical Stock Alerts</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="bg-white/80 backdrop-blur-sm border border-rose-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-1">{item.name}</div>
                          <div className="text-2xl font-mono font-bold text-rose-600">
                            {item.remaining} <span className="text-xs font-normal text-rose-400">{item.unit}</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-rose-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-rose-400">
                          <span>Threshold: {item.threshold} {item.unit}</span>
                          <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Low Stock</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Sorting & Refresh Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200/50 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-stone-600">
                    <Filter size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Sort Inventory</span>
                  </div>
                  <div className="h-4 w-px bg-stone-200 hidden sm:block" />
                  <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-primary' : ''} />
                    <span>Last Synced: {lastSynced.toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm hover:bg-stone-100 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    <span className="font-medium uppercase tracking-wider text-[10px]">Refresh</span>
                  </button>
                  <select 
                    value={inventorySortBy}
                    onChange={(e) => setInventorySortBy(e.target.value as any)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="name">Name</option>
                    <option value="stock">Current Stock</option>
                    <option value="cost">Cost per Unit</option>
                    <option value="date">Date Added</option>
                  </select>
                  <button 
                    onClick={() => setInventorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm hover:bg-stone-100 transition-colors"
                  >
                    <TrendingUp size={16} className={inventorySortOrder === 'desc' ? 'rotate-180' : ''} />
                    <span className="hidden sm:inline font-medium uppercase tracking-wider text-[10px]">
                      {inventorySortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Material Sections */}
              {categories.map(category => (
                <div key={category} className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                    <div>
                      <h2 className="text-2xl font-sans font-bold text-stone-800">{category}</h2>
                      <p className="text-stone-500 text-sm font-sans italic">Track stock levels and costs for {category.toLowerCase()}.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownloadTemplate()}
                        className="hidden md:flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                        title="Download CSV Template"
                      >
                        <Download size={16} />
                        Template
                      </button>
                      <label className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 transform active:scale-95 cursor-pointer">
                        <Upload size={16} />
                        <span className="hidden sm:inline">Import CSV</span>
                        <input 
                          type="file" 
                          accept=".csv" 
                          className="hidden" 
                          onChange={(e) => handleImportCSV(e, category)} 
                        />
                      </label>
                      <button 
                        onClick={() => { setAddMaterialCategory(category); setShowAddMaterialModal(true); }}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
                      >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Add Item</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50/50 border-b border-stone-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest w-56 min-w-[14rem]">Material Name</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Unit</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Current Stock</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest" title="Alert when current stock drops below this amount">Threshold (Alert)</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Cost / Unit</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest" title="Expiry date of the current stock batch">Expiry Date</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {sortedRemainingInventory.filter(m => m.category === category).map((mat) => {
                          const isLowStock = (mat.threshold ?? 0) > 0 && mat.remaining <= mat.threshold!;
                          
                          return (
                            <tr key={mat.id} className={`hover:bg-stone-50/30 transition-colors ${isLowStock ? 'bg-rose-50/20' : ''}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {isLowStock && <AlertCircle size={14} className="text-rose-500" />}
                                  <input 
                                    type="text" 
                                    value={mat.name || ''}
                                    onChange={(e) => updateMaterial(mat.id, 'name', e.target.value)}
                                    className={`w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm font-sans ${isLowStock ? 'text-rose-700' : 'text-stone-700'}`}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={mat.unit || 'g'}
                                  onChange={(e) => {
                                    const fromUnit = mat.unit || 'g';
                                    const toUnit = e.target.value;
                                    if (fromUnit === toUnit) return;
                                    const factor = UNIT_CONVERSIONS[fromUnit]?.[toUnit];
                                    if (factor !== undefined) {
                                      // Convert stock: e.g. 10 kg * 1000 = 10000 g
                                      const newStock = parseFloat((mat.initialStock * factor).toFixed(6));
                                      // Cost inverts: e.g. 45/kg / 1000 = 0.045/g
                                      const newCost = parseFloat((mat.costPerUnit / factor).toFixed(6));
                                      // Threshold also converts like stock
                                      const newThreshold = mat.threshold !== undefined ? parseFloat((mat.threshold * factor).toFixed(6)) : undefined;
                                      
                                      // Single atomic write — no race condition
                                      patchMaterial(mat.id, {
                                        unit: toUnit,
                                        initialStock: newStock,
                                        costPerUnit: newCost,
                                        ...(newThreshold !== undefined && { threshold: newThreshold })
                                      });
                                    } else {
                                      // Incompatible unit family (e.g. kg to pcs): only relabel
                                      patchMaterial(mat.id, { unit: toUnit });
                                    }
                                  }}
                                  className="bg-stone-100/50 border-none rounded-lg px-2 py-1 text-[10px] font-bold text-stone-500 focus:ring-2 focus:ring-primary/20 uppercase tracking-wider"
                                >
                                  <option value="g">g</option>
                                  <option value="kg">kg</option>
                                  <option value="ml">ml</option>
                                  <option value="l">l</option>
                                  <option value="pcs">pcs</option>
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <input 
                                  type="number" 
                                  value={mat.initialStock ?? 0}
                                  onChange={(e) => updateMaterial(mat.id, 'initialStock', parseFloat(e.target.value) || 0)}
                                  className="w-28 bg-stone-50/50 border border-stone-100 rounded-xl px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="number" 
                                    value={mat.threshold ?? 0}
                                    onChange={(e) => updateMaterial(mat.id, 'threshold', parseFloat(e.target.value) || 0)}
                                    className={`w-20 border rounded-xl px-2 py-1.5 text-sm font-mono focus:ring-2 outline-none text-right transition-all ${isLowStock ? 'bg-rose-50/50 border-rose-100 focus:ring-rose-500' : 'bg-stone-50/50 border-stone-100 focus:ring-primary/20'}`}
                                    placeholder="5"
                                    title={`Alert when stock drops below this amount of ${mat.unit}`}
                                  />
                                  <span className="text-stone-400 text-[10px] font-bold">{mat.unit}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-stone-400 text-xs font-bold">{currency.symbol}</span>
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={mat.costPerUnit != null ? +(mat.costPerUnit.toPrecision(4)) : 0}
                                    onChange={(e) => updateMaterial(mat.id, 'costPerUnit', parseFloat(e.target.value) || 0)}
                                    className="w-24 bg-stone-50/50 border border-stone-100 rounded-xl px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {(() => {
                                  const today = new Date();
                                  today.setHours(0,0,0,0);
                                  const expDate = mat.expiryDate ? new Date(mat.expiryDate) : null;
                                  if (expDate) expDate.setHours(0,0,0,0);
                                  const daysLeft = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / 86400000) : null;
                                  const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
                                  const isExpired = daysLeft !== null && daysLeft < 0;
                                  return (
                                    <div className="flex flex-col gap-1">
                                      <input
                                        type="date"
                                        value={mat.expiryDate || ''}
                                        onChange={(e) => updateMaterial(mat.id, 'expiryDate', e.target.value)}
                                        className={`w-36 border rounded-xl px-2 py-1.5 text-xs font-mono focus:ring-2 outline-none transition-all ${
                                          isExpired
                                            ? 'bg-rose-50 border-rose-300 text-rose-700 focus:ring-rose-400'
                                            : isExpiringSoon
                                            ? 'bg-amber-50 border-amber-300 text-amber-700 focus:ring-amber-400'
                                            : 'bg-stone-50/50 border-stone-100 text-stone-600 focus:ring-primary/20'
                                        }`}
                                        title="Expiry date of current stock batch"
                                      />
                                      {isExpired && <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Expired</span>}
                                      {!isExpired && isExpiringSoon && <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">{daysLeft}d left</span>}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => { setRestockMaterial(mat); setRestockExpiryDate(mat.expiryDate || ''); }}
                                    className="flex items-center gap-1 text-emerald-500 hover:text-emerald-600 transition-colors px-2 py-1.5 hover:bg-emerald-50 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                                    title="Restock this item"
                                  >
                                    <Plus size={16} />
                                    <span className="hidden sm:inline">Restock</span>
                                  </button>
                                  <button 
                                    onClick={() => deleteMaterial(mat.id)}
                                    className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"
                                    title="Delete Material"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {materials.filter(m => m.category === category).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-stone-400 font-sans italic">
                              No materials added to {category} yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              ))}

              {/* Missing Categories Section */}
              {sortedRemainingInventory.filter(m => !categories.includes(m.category)).length > 0 && (
                <div className="space-y-6 mt-12">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-sans font-bold text-stone-800">Uncategorized Items</h2>
                      <p className="text-stone-500 text-sm font-sans italic">These items have categories that are not in your master list.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px] text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50/50 border-b border-stone-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Material Name</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Category</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {sortedRemainingInventory.filter(m => !categories.includes(m.category)).map((mat) => (
                          <tr key={mat.id} className="hover:bg-stone-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-stone-700 font-sans">{mat.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-stone-100 text-stone-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                {mat.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => updateMaterial(mat.id, 'category', 'Raw Materials')}
                                className="text-primary hover:text-primary-dark text-[10px] font-bold uppercase tracking-widest"
                              >
                                Move to Raw Materials
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-sans font-bold text-stone-800">Menu & Recipes</h2>
                  <p className="text-stone-500 text-sm font-sans italic">Define how much of each material is used per item.</p>
                </div>
                <button 
                  onClick={addMenuItem}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
                >
                  <Plus size={18} />
                  Add Menu Item
                </button>
              </div>

              <div className="grid gap-6">
                {menu.map((item) => (
                  <div key={item.id} className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div className="px-6 py-5 bg-stone-50/50 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl shrink-0 overflow-hidden cursor-text hover:bg-primary/20 transition-colors">
                          <input 
                            type="text"
                            maxLength={2}
                            value={item.emoji || ''}
                            onChange={(e) => updateMenuItemField(item.id, 'emoji', e.target.value)}
                            className="absolute inset-0 w-full h-full text-center bg-transparent outline-none z-10 cursor-text"
                          />
                          {!item.emoji && <Utensils size={24} className="opacity-50 absolute pointer-events-none" />}
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={item.name || ''}
                            onChange={(e) => updateMenuItem(item.id, e.target.value)}
                            className="bg-transparent border-none focus:ring-0 font-sans font-bold text-stone-800 text-xl p-0 w-full"
                            placeholder="Item Name"
                          />
                          <div className="flex items-center gap-3 mt-1">
                            {(() => {
                              const cost = item.recipe.reduce((total, req) => {
                                const mat = materials.find(m => m.id === req.materialId);
                                if (!mat) return total;
                                const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
                                return total + (convertedAmount * (mat.costPerUnit || 0));
                              }, 0);
                              const margin = item.sellingPrice > 0 ? ((item.sellingPrice - cost) / item.sellingPrice) * 100 : 0;
                              
                              return (
                                <>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                    Cost: {currency.symbol}{cost.toFixed(2)}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${margin >= 60 ? 'bg-emerald-50 text-emerald-600' : margin >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {item.sellingPrice < cost ? `LOSS (${margin.toFixed(0)}%)` : `${margin.toFixed(0)}% Margin`}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-2 shadow-sm">
                              <span className="text-stone-400 text-sm font-bold">{currency.symbol}</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={item.sellingPrice ?? 0}
                                onChange={(e) => updateMenuItemField(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                                className="w-16 bg-transparent border-none focus:ring-0 text-lg font-bold text-stone-700 p-0"
                                placeholder="Price"
                              />
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Sale</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm" title="Shelf Life (Days)">
                              <input 
                                type="number" 
                                value={item.shelfLifeDays || ''}
                                onChange={(e) => updateMenuItemField(item.id, 'shelfLifeDays', parseInt(e.target.value) || undefined)}
                                className="w-8 bg-transparent border-none focus:ring-0 text-lg font-bold text-stone-700 p-0 text-center"
                                placeholder="-"
                              />
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Days</span>
                            </div>
                          </div>
                          {(() => {
                            const cost = item.recipe.reduce((total, req) => {
                              const mat = materials.find(m => m.id === req.materialId);
                              if (!mat) return total;
                              const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
                              return total + (convertedAmount * (mat.costPerUnit || 0));
                            }, 0);
                            const suggested = cost * 3.5;
                            
                            return (
                              <button 
                                onClick={() => updateMenuItemField(item.id, 'sellingPrice', parseFloat(suggested.toFixed(2)))}
                                className="text-[9px] font-bold text-primary uppercase tracking-widest hover:text-primary-dark transition-colors"
                                title="Apply 3.5x markup suggestion"
                              >
                                Suggest: {currency.symbol}{suggested.toFixed(2)}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:border-l border-stone-200 md:pl-4 md:ml-4">
                        <button 
                          onClick={() => setExpandedRecipeId(expandedRecipeId === item.id ? null : item.id)}
                          title={expandedRecipeId === item.id ? "Close Editor" : "Edit Recipe"}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                            expandedRecipeId === item.id 
                              ? 'bg-stone-800 text-white shadow-lg' 
                              : 'bg-white text-stone-600 border border-stone-200 hover:border-primary hover:text-primary shadow-sm'
                          }`}
                        >
                          {expandedRecipeId === item.id ? <Check size={16} /> : <Edit2 size={16} />}
                          <span>{expandedRecipeId === item.id ? "Done" : "Recipe"}</span>
                        </button>
                        <button 
                          onClick={() => copyMenuItem(item)}
                          title="Duplicate Recipe"
                          className="text-stone-400 hover:text-emerald-600 transition-colors p-2 hover:bg-emerald-50 rounded-xl"
                        >
                          <Copy size={18} />
                        </button>
                        <button 
                          onClick={() => deleteMenuItem(item.id)}
                          title="Delete Recipe"
                          className="text-stone-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedRecipeId === item.id && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden bg-stone-50/30"
                        >
                          <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 border-t border-stone-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-stone-100">
                                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Recipe Cost</h4>
                                  <div className="flex items-center gap-1.5 text-primary">
                                    <span className="text-sm font-bold">{currency.symbol}</span>
                                    <span className="text-xl font-mono font-bold">
                                      {item.recipe.reduce((total, req) => {
                                        const mat = materials.find(m => m.id === req.materialId);
                                        if (!mat) return total;
                                        const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat.unit);
                                        return total + (convertedAmount * (mat.costPerUnit || 0));
                                      }, 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
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
                                  <button 
                                    key={cat}
                                    onClick={() => addIngredientToRecipe(item.id, cat)}
                                    className="flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-700 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-stone-200 transition-all shadow-sm active:scale-95"
                                  >
                                    <Plus size={14} className="text-primary" />
                                    Add {cat}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-8">
                              {/* Ingredients Section */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                    <Utensils size={14} className="text-primary" />
                                    <span>Ingredients</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                                    {item.recipe.filter(req => materials.find(m => m.id === req.materialId)?.category !== 'Packaging Materials').length} Items
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {item.recipe.map((req, idx) => {
                                    const mat = materials.find(m => m.id === req.materialId);
                                    if (mat?.category === 'Packaging Materials') return null;
                                    
                                    const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat?.unit || 'g');
                                    const ingredientCost = convertedAmount * (mat?.costPerUnit || 0);
                                    
                                    return (
                                      <div key={idx} className="group flex items-center gap-3 bg-white p-4 rounded-xl border border-stone-100 shadow-sm transition-all hover:border-primary/20">
                                        <div className="flex-1">
                                          <select 
                                            value={req.materialId || ''}
                                            onChange={(e) => updateRecipeIngredient(item.id, idx, 'materialId', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-700 p-0"
                                          >
                                            {categories.filter(c => c !== 'Packaging Materials').map(cat => (
                                              <optgroup key={cat} label={cat}>
                                                {materials.filter(m => m.category === cat).map(m => (
                                                  <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                              </optgroup>
                                            ))}
                                          </select>
                                          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                                            Cost: {currency.symbol}{ingredientCost.toFixed(2)}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-2 py-1">
                                          <input 
                                            type="number" 
                                            value={req.amount ?? 0}
                                            onChange={(e) => updateRecipeIngredient(item.id, idx, 'amount', parseFloat(e.target.value) || 0)}
                                            className="w-16 bg-transparent border-none focus:ring-0 text-sm font-mono font-bold text-stone-700 p-1 text-right"
                                          />
                                          <select 
                                            value={req.unit || 'g'}
                                            onChange={(e) => updateRecipeIngredient(item.id, idx, 'unit', e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-[10px] font-bold text-stone-400 uppercase tracking-widest p-0"
                                          >
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="ml">ml</option>
                                            <option value="l">l</option>
                                            <option value="pcs">pcs</option>
                                          </select>
                                        </div>
                                        <button 
                                          onClick={() => removeIngredientFromRecipe(item.id, idx)}
                                          className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {item.recipe.filter(req => materials.find(m => m.id === req.materialId)?.category !== 'Packaging Materials').length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-[10px] sm:rounded-[15px] text-stone-400 text-[10px] uppercase font-bold tracking-widest bg-white/50">
                                      No ingredients added
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Packaging Section */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                    <Package size={14} className="text-primary" />
                                    <span>Packaging</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                                    {item.recipe.filter(req => materials.find(m => m.id === req.materialId)?.category === 'Packaging Materials').length} Items
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {item.recipe.map((req, idx) => {
                                    const mat = materials.find(m => m.id === req.materialId);
                                    if (mat?.category !== 'Packaging Materials') return null;
                                    
                                    const convertedAmount = convertAmount(req.amount, req.unit || 'g', mat?.unit || 'g');
                                    const ingredientCost = convertedAmount * (mat?.costPerUnit || 0);
                                    
                                    return (
                                      <div key={idx} className="group flex items-center gap-3 bg-white p-4 rounded-xl border border-stone-100 shadow-sm transition-all hover:border-primary/20">
                                        <div className="flex-1">
                                          <select 
                                            value={req.materialId || ''}
                                            onChange={(e) => updateRecipeIngredient(item.id, idx, 'materialId', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-700 p-0"
                                          >
                                            <optgroup label="Packaging Materials">
                                              {materials.filter(m => m.category === 'Packaging Materials').map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                              ))}
                                            </optgroup>
                                          </select>
                                          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                                            Cost: {currency.symbol}{ingredientCost.toFixed(2)}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-2 py-1">
                                          <input 
                                            type="number" 
                                            value={req.amount ?? 0}
                                            onChange={(e) => updateRecipeIngredient(item.id, idx, 'amount', parseFloat(e.target.value) || 0)}
                                            className="w-16 bg-transparent border-none focus:ring-0 text-sm font-mono font-bold text-stone-700 p-1 text-right"
                                          />
                                          <select 
                                            value={req.unit || 'pcs'}
                                            onChange={(e) => updateRecipeIngredient(item.id, idx, 'unit', e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-[10px] font-bold text-stone-400 uppercase tracking-widest p-0"
                                          >
                                            <option value="pcs">pcs</option>
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="ml">ml</option>
                                            <option value="l">l</option>
                                          </select>
                                        </div>
                                        <button 
                                          onClick={() => removeIngredientFromRecipe(item.id, idx)}
                                          className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {item.recipe.filter(req => materials.find(m => m.id === req.materialId)?.category === 'Packaging Materials').length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-[10px] sm:rounded-[15px] text-stone-400 text-[10px] uppercase font-bold tracking-widest bg-white/50">
                                      No packaging added
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pb-20"
            >
              {/* Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                  <h2 className="text-3xl font-sans font-bold text-stone-800">Order History</h2>
                  <p className="text-stone-500 text-sm italic font-sans">Browse and manage all customer orders by date range.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  {/* Date range pickers */}
                  <div className="flex flex-wrap items-center gap-2 bg-white border border-stone-200/50 rounded-xl px-3 py-2 shadow-sm">
                    <Calendar size={15} className="text-primary shrink-0" />
                    <input
                      type="date"
                      value={orderFilterStart}
                      onChange={(e) => setOrderFilterStart(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-700 p-0 cursor-pointer w-28 sm:w-32"
                    />
                    <span className="text-stone-300 font-bold text-xs">→</span>
                    <input
                      type="date"
                      value={orderFilterEnd}
                      onChange={(e) => setOrderFilterEnd(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-700 p-0 cursor-pointer w-28 sm:w-32"
                    />
                  </div>

                  {/* Quick range shortcuts */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: 'Today', days: 0 },
                      { label: '7 Days', days: 6 },
                      { label: '30 Days', days: 29 },
                    ].map(({ label, days }) => (
                      <button
                        key={label}
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(end.getDate() - days);
                          setOrderFilterStart(start.toISOString().split('T')[0]);
                          setOrderFilterEnd(end.toISOString().split('T')[0]);
                        }}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="h-8 w-px bg-stone-200 hidden lg:block" />

                  {/* Add Order Button */}
                  <button
                    onClick={() => {
                      setModalOrderDate(new Date().toISOString().split('T')[0]);
                      setModalCustomerName('');
                      setModalCustomerPhone('');
                      setModalLineItems([{ menuItemId: menu[0]?.id || '', quantity: 1 }]);
                      setIsAddOrderModalOpen(true);
                    }}
                    disabled={menu.length === 0}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95 disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Add Order
                  </button>

                  {shopifyStatus.connected && (
                    <button
                      onClick={importShopifyOrders}
                      disabled={isImportingShopify}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg transform active:scale-95 ${
                        isImportingShopify
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                          : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'
                      }`}
                    >
                      <Globe size={18} className={isImportingShopify ? 'animate-spin' : ''} />
                      {isImportingShopify ? 'Importing...' : 'Shopify Import'}
                    </button>
                  )}
                  {odooStatus.connected && (
                    <button
                      onClick={importOdooOrders}
                      disabled={isImportingOdoo}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg transform active:scale-95 ${
                        isImportingOdoo
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                          : 'bg-stone-800 hover:bg-stone-900 text-white shadow-stone-200'
                      }`}
                    >
                      <Database size={18} className={isImportingOdoo ? 'animate-spin' : ''} />
                      {isImportingOdoo ? 'Importing...' : 'Odoo Import'}
                    </button>
                  )}
                </div>
              </div>

              {/* Summary bar */}
              {(() => {
                const rangeOrders = orders.filter(o => o.date >= orderFilterStart && o.date <= orderFilterEnd);
                const totalItems = rangeOrders.reduce((s, o) => s + o.quantity, 0);
                return rangeOrders.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white border border-stone-200/50 rounded-xl px-5 py-3 shadow-sm flex items-center gap-3">
                      <ShoppingBag size={16} className="text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Orders</span>
                      <span className="text-lg font-bold text-stone-800">{rangeOrders.length}</span>
                    </div>
                    <div className="bg-white border border-stone-200/50 rounded-xl px-5 py-3 shadow-sm flex items-center gap-3">
                      <Package size={16} className="text-emerald-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Items Sold</span>
                      <span className="text-lg font-bold text-stone-800">{totalItems}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Orders table */}
              <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden">
                {(() => {
                  const rangeOrders = orders
                    .filter(o => o.date >= orderFilterStart && o.date <= orderFilterEnd)
                    .sort((a, b) => b.date.localeCompare(a.date));

                  if (rangeOrders.length === 0) {
                    return (
                      <div className="text-center py-20 px-8">
                        <div className="w-20 h-20 bg-stone-50 rounded-[10px] sm:rounded-[15px] shadow-sm border border-stone-100 flex items-center justify-center mx-auto mb-6 text-stone-200">
                          <ClipboardList size={40} />
                        </div>
                        <h3 className="text-xl font-sans font-bold text-stone-800 mb-2">No orders in this range</h3>
                        <p className="text-stone-500 text-sm mb-8 italic font-sans">Try changing the date range or add a new order.</p>
                        <button
                          onClick={() => {
                            setModalOrderDate(new Date().toISOString().split('T')[0]);
                            setModalCustomerName('');
                            setModalCustomerPhone('');
                            setModalLineItems([{ menuItemId: menu[0]?.id || '', quantity: 1 }]);
                            setIsAddOrderModalOpen(true);
                          }}
                          disabled={menu.length === 0}
                          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95 disabled:opacity-50"
                        >
                          <Plus size={18} />
                          Log First Sale
                        </button>
                      </div>
                    );
                  }

                  // Group by date descending
                  const byDate: Record<string, Order[]> = {};
                  rangeOrders.forEach(o => {
                    if (!byDate[o.date]) byDate[o.date] = [];
                    byDate[o.date].push(o);
                  });

                  return (
                    <div className="divide-y divide-stone-50">
                      {Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map(date => (
                        <div key={date}>
                          {/* Date group header */}
                          <div className="px-4 sm:px-8 py-3 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-primary" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-stone-400">
                              {byDate[date].length} order{byDate[date].length !== 1 ? 's' : ''} · {byDate[date].reduce((s, o) => s + o.quantity, 0)} items
                            </span>
                          </div>
                          {/* Column headers — desktop only */}
                          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 sm:px-8 pt-3 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                            <div className="col-span-4">Item Sold</div>
                            <div className="col-span-2">Qty</div>
                            <div className="col-span-3">Customer</div>
                            <div className="col-span-2">Phone</div>
                            <div className="col-span-1 text-right">Del</div>
                          </div>
                          <div className="px-3 sm:px-8 pb-4 space-y-2">
                            {byDate[date].map(order => (
                              <div key={order.id} className="group p-3 bg-stone-50/50 rounded-xl border border-stone-100 hover:border-primary/20 transition-all">
                                {/* Mobile: stacked card layout */}
                                <div className="flex flex-col gap-2 sm:hidden">
                                  <select
                                    value={order.menuItemId || ''}
                                    onChange={(e) => updateOrder(order.id, 'menuItemId', e.target.value)}
                                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm"
                                  >
                                    <option value="" disabled>Select Item</option>
                                    {menu.map(m => <option key={m.id} value={m.id}>{m.emoji ? `${m.emoji} ` : ''}{m.name}</option>)}
                                  </select>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number" min="1"
                                      value={order.quantity ?? 0}
                                      onChange={(e) => updateOrder(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                      className="w-20 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 outline-none shadow-sm text-center"
                                    />
                                    <div className="flex-1 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-500 overflow-hidden text-ellipsis whitespace-nowrap flex items-center justify-between">
                                      <span>{order.customerName || <span className="text-stone-300 italic">No name</span>}</span>
                                      {order.customerPhone && <span className="text-stone-400 text-xs font-normal shrink-0">({order.customerPhone})</span>}
                                    </div>
                                    <button
                                      onClick={() => deleteOrder(order.id)}
                                      className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                                      title="Delete Order"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                                {/* Desktop: grid row layout */}
                                <div className="hidden sm:grid grid-cols-12 items-center gap-4">
                                  <div className="col-span-4">
                                    <select
                                      value={order.menuItemId || ''}
                                      onChange={(e) => updateOrder(order.id, 'menuItemId', e.target.value)}
                                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm transition-all"
                                    >
                                      <option value="" disabled>Select Item</option>
                                      {menu.map(m => <option key={m.id} value={m.id}>{m.emoji ? `${m.emoji} ` : ''}{m.name}</option>)}
                                    </select>
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number" min="1"
                                      value={order.quantity ?? 0}
                                      onChange={(e) => updateOrder(order.id, 'quantity', parseInt(e.target.value) || 0)}
                                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm transition-all"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <div className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 overflow-hidden text-ellipsis whitespace-nowrap">
                                      {order.customerName || <span className="text-stone-300 italic">No name</span>}
                                    </div>
                                  </div>
                                  <div className="col-span-2">
                                    <div className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 overflow-hidden text-ellipsis whitespace-nowrap">
                                      {order.customerPhone || <span className="text-stone-300 italic">No phone</span>}
                                    </div>
                                  </div>
                                  <div className="col-span-1 flex justify-end">
                                    <button
                                      onClick={() => deleteOrder(order.id)}
                                      className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100"
                                      title="Delete Order"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* Add Order Modal */}
          <AnimatePresence>
            {isAddOrderModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={(e) => { if (e.target === e.currentTarget) setIsAddOrderModalOpen(false); }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="bg-white rounded-[10px] sm:rounded-[15px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-stone-100">
                    <div>
                      <h3 className="text-xl font-bold text-stone-800 font-sans">New Order</h3>
                      <p className="text-stone-400 text-xs mt-0.5">Add one or more items for a customer</p>
                    </div>
                    <button
                      onClick={() => setIsAddOrderModalOpen(false)}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-6">
                    {/* Date */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Order Date</label>
                      <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                        <Calendar size={16} className="text-primary shrink-0" />
                        <input
                          type="date"
                          value={modalOrderDate}
                          onChange={(e) => setModalOrderDate(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-700 p-0 w-full"
                        />
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Customer Name</label>
                        <input
                          type="text"
                          placeholder="e.g. John Smith"
                          value={modalCustomerName}
                          onChange={(e) => setModalCustomerName(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Phone</label>
                        <input
                          type="text"
                          placeholder="e.g. 555-0100"
                          value={modalCustomerPhone}
                          onChange={(e) => setModalCustomerPhone(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Items Ordered</label>
                        <button
                          onClick={() => setModalLineItems(prev => [...prev, { menuItemId: menu[0]?.id || '', quantity: 1 }])}
                          className="flex items-center gap-1.5 text-primary hover:text-primary-dark text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                          <Plus size={14} /> Add Item
                        </button>
                      </div>

                      <div className="space-y-2">
                        {modalLineItems.map((line, idx) => {
                          const selectedItem = menu.find(m => m.id === line.menuItemId);
                          return (
                            <div key={idx} className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl p-3">
                              <select
                                value={line.menuItemId}
                                onChange={(e) => setModalLineItems(prev => prev.map((l, i) => i === idx ? { ...l, menuItemId: e.target.value } : l))}
                                className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                              >
                                <option value="" disabled>Select item…</option>
                                {menu.map(m => <option key={m.id} value={m.id}>{m.emoji ? `${m.emoji} ` : ''}{m.name}</option>)}
                              </select>
                              <input
                                type="number" min="1"
                                value={line.quantity}
                                onChange={(e) => setModalLineItems(prev => prev.map((l, i) => i === idx ? { ...l, quantity: parseInt(e.target.value) || 1 } : l))}
                                className="w-20 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center transition-all"
                              />
                              {selectedItem && (
                                <span className="text-[10px] font-bold text-stone-400 shrink-0">
                                  {currency.symbol}{(selectedItem.sellingPrice * line.quantity).toFixed(2)}
                                </span>
                              )}
                              {modalLineItems.length > 1 && (
                                <button
                                  onClick={() => setModalLineItems(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                                >
                                  <X size={15} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Order total */}
                      {modalLineItems.some(l => l.menuItemId) && (
                        <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Order Total</span>
                          <span className="text-lg font-bold text-stone-800">
                            {currency.symbol}{modalLineItems.reduce((sum, line) => {
                              const item = menu.find(m => m.id === line.menuItemId);
                              return sum + (item ? item.sellingPrice * line.quantity : 0);
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-4 sm:px-8 pb-6 sm:pb-8 flex gap-3">
                    <button
                      onClick={() => setIsAddOrderModalOpen(false)}
                      className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isSavingOrder || modalLineItems.some(l => !l.menuItemId)}
                      onClick={async () => {
                        if (!auth.currentUser) return;
                        const validLines = modalLineItems.filter(l => l.menuItemId && l.quantity > 0);
                        if (validLines.length === 0) return;
                        setIsSavingOrder(true);
                        try {
                          const userId = auth.currentUser.uid;
                          for (const line of validLines) {
                            const id = Math.random().toString(36).substr(2, 9);
                            const newOrder: Order = {
                              id,
                              menuItemId: line.menuItemId,
                              quantity: line.quantity,
                              date: modalOrderDate,
                              customerName: modalCustomerName || undefined,
                              customerPhone: modalCustomerPhone || undefined,
                            };
                            await setDoc(doc(db, 'users', userId, 'orders', id), newOrder);
                          }
                          // Expand the date range to include the new order date if outside current range
                          if (modalOrderDate < orderFilterStart) setOrderFilterStart(modalOrderDate);
                          if (modalOrderDate > orderFilterEnd) setOrderFilterEnd(modalOrderDate);
                          setIsAddOrderModalOpen(false);
                        } catch (err) {
                          handleFirestoreError(err, OperationType.WRITE, 'orders');
                        } finally {
                          setIsSavingOrder(false);
                        }
                      }}
                      className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                    >
                      {isSavingOrder ? 'Saving…' : `Save ${modalLineItems.filter(l => l.menuItemId).length > 1 ? `${modalLineItems.filter(l => l.menuItemId).length} Items` : 'Order'}`}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pb-20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-sans font-bold text-stone-800">Settings</h2>
                  <p className="text-stone-500 text-sm italic font-sans">Manage your bakery profile, integrations, and preferences.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <select 
                      value={activeSettingsTab}
                      onChange={(e) => setActiveSettingsTab(e.target.value as any)}
                      className="appearance-none bg-white border border-stone-200 rounded-xl px-6 py-3 pr-12 text-sm font-bold uppercase tracking-widest text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm cursor-pointer hover:border-primary/30 w-full sm:w-auto"
                    >
                      <option value="bakery">Bakery Settings</option>
                      <option value="integrations">Integrations</option>
                      <option value="customisation">App Customisation</option>
                      <option value="account">User Account</option>
                      <option value="categories">Inventory Categories</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                  <button 
                    onClick={saveSettings}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 transform active:scale-95 w-full sm:w-auto"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                </div>
              </div>

              {showSaveFeedback && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700 shadow-sm"
                >
                  <CheckCircle2 size={20} />
                  <p className="text-sm font-bold uppercase tracking-widest">Settings saved successfully!</p>
                </motion.div>
              )}

              <div className="grid grid-cols-1 gap-8">
                {/* Bakery Settings Section */}
                {activeSettingsTab === 'bakery' && (
                  <div className="bg-white p-4 sm:p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Settings2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">Bakery Profile</h3>
                        <p className="text-[10px] text-stone-400 font-sans italic">Identity and contact information</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Bakery Name</label>
                        <input 
                          type="text" 
                          value={settings.name}
                          onChange={(e) => updateSettingsField('name', e.target.value)}
                          className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans text-lg"
                          placeholder="The Sourdough Loft"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <input 
                          type="text" 
                          value={settings.phone}
                          onChange={(e) => updateSettingsField('phone', e.target.value)}
                          className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans text-lg"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Address</label>
                        <input 
                          type="text" 
                          value={settings.address}
                          onChange={(e) => updateSettingsField('address', e.target.value)}
                          className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans text-lg"
                          placeholder="123 Flour St, Bread City"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Integrations Section */}
                {activeSettingsTab === 'integrations' && (
                  <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Puzzle size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">Integrations</h3>
                        <p className="text-[10px] text-stone-400 font-sans italic">Connect your tools</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className={`p-6 rounded-[10px] sm:rounded-[15px] border transition-all duration-300 ${shopifyStatus.connected ? 'bg-emerald-50/30 border-emerald-100 shadow-sm shadow-emerald-500/5' : 'bg-stone-50/50 border-stone-100'}`}>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-300 ${shopifyStatus.connected ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-stone-100 text-stone-600'}`}>
                              <Store size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-sans font-bold text-stone-800">Shopify Store</h4>
                                {shopifyStatus.connected && (
                                  <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/10">
                                    <Check size={10} />
                                    Connected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 font-sans italic mt-0.5">
                                {shopifyStatus.connected ? `Linked to ${shopifyStatus.shop}.myshopify.com` : 'Sync your online orders automatically'}
                              </p>
                            </div>
                          </div>
                          {shopifyStatus.connected && (
                            <button 
                              onClick={disconnectShopify}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors group"
                            >
                              <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                              Disconnect
                            </button>
                          )}
                        </div>

                        {!shopifyStatus.connected ? (
                          <div className="space-y-5">
                            {!shopifyConfig.hasEnvCredentials && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white border border-stone-200/60 rounded-xl shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                <div className="col-span-full mb-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle size={14} className="text-primary" />
                                    <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">API Credentials Required</p>
                                  </div>
                                  <p className="text-[10px] text-stone-400 font-sans italic">Find these in your Shopify Partner Dashboard under App Setup.</p>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">API Key</label>
                                  <input 
                                    type="text" 
                                    value={shopifyClientId}
                                    onChange={(e) => setShopifyClientId(e.target.value)}
                                    placeholder="e.g. 8a2f..."
                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">API Secret Key</label>
                                  <input 
                                    type="password" 
                                    value={shopifyClientSecret}
                                    onChange={(e) => setShopifyClientSecret(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                              <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl px-4 py-3 shadow-sm flex-1 group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                <Globe size={16} className="text-stone-300 group-focus-within:text-primary transition-colors" />
                                <input 
                                  type="text" 
                                  value={shopifyShopInput}
                                  onChange={(e) => setShopifyShopInput(e.target.value)}
                                  placeholder="your-bakery-name"
                                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-stone-700 p-0 placeholder:text-stone-300"
                                />
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">.myshopify.com</span>
                              </div>
                              <button 
                                onClick={connectShopify}
                                disabled={isConnectingShopify}
                                className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 transform active:scale-95 ${isConnectingShopify ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isConnectingShopify ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Connecting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Globe size={18} />
                                    <span>Connect Store</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-100/50">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-800">Connection Active</p>
                              <p className="text-[10px] text-emerald-600/70 font-sans italic">Your orders are being synced automatically.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`p-6 rounded-[10px] sm:rounded-[15px] border transition-all duration-300 ${odooStatus.connected ? 'bg-emerald-50/30 border-emerald-100 shadow-sm shadow-emerald-500/5' : 'bg-stone-50/50 border-stone-100'}`}>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-300 ${odooStatus.connected ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-stone-100 text-stone-600'}`}>
                              <Database size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-sans font-bold text-stone-800">Odoo eCommerce</h4>
                                {odooStatus.connected && (
                                  <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/10">
                                    <Check size={10} />
                                    Connected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 font-sans italic mt-0.5">
                                {odooStatus.connected ? `Linked to ${odooStatus.url}` : 'Sync your Odoo website orders'}
                              </p>
                            </div>
                          </div>
                          {odooStatus.connected && (
                            <button 
                              onClick={disconnectOdoo}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors group"
                            >
                              <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                              Disconnect
                            </button>
                          )}
                        </div>

                        {!odooStatus.connected ? (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white border border-stone-200/60 rounded-xl shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                              <div className="col-span-full mb-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertCircle size={14} className="text-primary" />
                                  <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">Odoo API Credentials</p>
                                </div>
                                <p className="text-[10px] text-stone-400 font-sans italic">Enter your Odoo instance details to sync orders.</p>
                              </div>
                              <div className="space-y-1.5 sm:col-span-2">
                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Instance URL</label>
                                <input 
                                  type="text" 
                                  value={odooUrlInput}
                                  onChange={(e) => setOdooUrlInput(e.target.value)}
                                  placeholder="https://your-bakery.odoo.com"
                                  className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Database Name</label>
                                <input 
                                  type="text" 
                                  value={odooDbInput}
                                  onChange={(e) => setOdooDbInput(e.target.value)}
                                  placeholder="e.g. bakery-db"
                                  className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Username / Email</label>
                                <input 
                                  type="text" 
                                  value={odooUsernameInput}
                                  onChange={(e) => setOdooUsernameInput(e.target.value)}
                                  placeholder="admin@example.com"
                                  className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                              </div>
                              <div className="space-y-1.5 sm:col-span-2">
                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Password / API Key</label>
                                <input 
                                  type="password" 
                                  value={odooPasswordInput}
                                  onChange={(e) => setOdooPasswordInput(e.target.value)}
                                  placeholder="••••••••••••"
                                  className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                              </div>
                            </div>

                            <button 
                              onClick={connectOdoo}
                              disabled={isConnectingOdoo}
                              className={`w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-stone-200 transform active:scale-95 ${isConnectingOdoo ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isConnectingOdoo ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Connecting...</span>
                                </>
                              ) : (
                                <>
                                  <Database size={18} />
                                  <span>Connect Odoo</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-100/50">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-800">Connection Active</p>
                              <p className="text-[10px] text-emerald-600/70 font-sans italic">Your Odoo orders are ready to be synced.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-5 bg-amber-50/30 rounded-xl border border-amber-100/50 space-y-3">
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertCircle size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Setup Instructions</span>
                        </div>
                        <p className="text-[10px] text-amber-800/70 leading-relaxed font-sans italic">
                          1. Enter your shop subdomain (e.g. <b>my-bakery</b>). <br/>
                          2. In your Shopify Partner Dashboard, set the <b>Allowed redirection URL</b> to:
                        </p>
                        <div className="relative group">
                          <code className="block p-2.5 bg-white border border-amber-100 rounded-xl text-[10px] text-amber-900 font-mono break-all select-all shadow-sm">
                            {window.location.origin}/api/auth/shopify/callback
                          </code>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/auth/shopify/callback`);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-amber-400 hover:text-amber-600 transition-colors"
                            title="Copy to clipboard"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* App Customisation Section */}
                {activeSettingsTab === 'customisation' && (
                  <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Palette size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">App Customisation</h3>
                        <p className="text-[10px] text-stone-400 font-sans italic">Personalise your workspace</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Theme Colour</label>
                        <div className="flex flex-wrap gap-3">
                          {['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#BC8F8F', '#A0522D', '#2D2D2D'].map(color => (
                            <button
                              key={color}
                              onClick={() => updateSettingsField('primaryColor', color)}
                              className={`w-10 h-10 rounded-full border-4 transition-all transform hover:scale-110 shadow-sm ${
                                settings.primaryColor === color ? 'border-white ring-2 ring-primary scale-110 shadow-md' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <div className="relative group">
                            <input 
                              type="color" 
                              value={settings.primaryColor}
                              onChange={(e) => updateSettingsField('primaryColor', e.target.value)}
                              className="w-10 h-10 rounded-full border-none p-0 overflow-hidden cursor-pointer shadow-sm hover:scale-110 transition-transform"
                            />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Custom Color
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Bakery Logo</label>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center overflow-hidden shadow-inner">
                            {settings.logo ? (
                              <img src={settings.logo} alt="Logo Preview" className="w-full h-full object-cover" />
                            ) : (
                              <Image size={32} className="text-stone-300" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-600 px-5 py-2.5 rounded-xl text-xs font-bold transition-all inline-block shadow-sm">
                              Upload Logo
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      updateSettingsField('logo', reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            {settings.logo && (
                              <button 
                                onClick={() => updateSettingsField('logo', '')}
                                className="ml-3 text-rose-500 text-xs font-bold hover:underline"
                              >
                                Remove
                              </button>
                            )}
                            <p className="text-[10px] text-stone-400 font-sans italic">Recommended: Square SVG or PNG</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Account Section */}
                {activeSettingsTab === 'account' && (
                  <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <UserCog size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">User Account</h3>
                        <p className="text-[10px] text-stone-400 font-sans italic">Manage your profile and access</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center text-center space-y-6 py-4">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-md">
                        <UserIcon size={48} />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800 font-sans text-2xl">{user?.name}</h4>
                        <p className="text-sm text-stone-500 font-sans italic">{user?.email}</p>
                      </div>
                      <div className="bg-primary/10 text-primary px-6 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        Master Baker
                      </div>
                      
                      <div className="w-full max-w-md pt-6 border-t border-stone-100 space-y-4">
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm shadow-rose-500/5"
                        >
                          <LogOut size={16} />
                          Sign Out of BakeryApp
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory Categories Section */}
                {activeSettingsTab === 'categories' && (
                  <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Layers size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">Inventory Categories</h3>
                        <p className="text-[10px] text-stone-400 font-sans italic">Organize your materials by category</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-sm font-sans text-stone-800 italic">Add or remove categories to better organize your inventory.</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            placeholder="New category..."
                            id="new-category-input-settings"
                            className="flex-1 sm:w-48 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addCategory(e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById('new-category-input-settings') as HTMLInputElement;
                              addCategory(input.value);
                              input.value = '';
                            }}
                            className="bg-primary text-white p-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-primary/20"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {categories.map(cat => (
                          <div key={cat} className="flex items-center gap-3 bg-stone-50 px-5 py-3 rounded-xl border border-stone-200 group transition-all hover:border-primary/30 hover:bg-white hover:shadow-sm">
                            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">{cat}</span>
                            {cat !== 'Raw Materials' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCategory(cat);
                                }}
                                className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title={`Delete ${cat}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {/* Production Log Tab */}
          {activeTab === 'production' && (
            <motion.div
              key="production"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pb-20"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h2 className="text-3xl font-sans font-bold text-stone-800">Production Log</h2>
                  <p className="text-stone-500 text-sm italic font-sans">Record baking sessions and manage finished goods stock.</p>
                </div>
                <button
                  onClick={() => setIsProductionRunModalOpen(true)}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-amber-200 active:scale-95"
                >
                  <Factory size={16} />
                  Log Production Run
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Runs</div>
                  <div className="text-3xl font-bold font-sans text-stone-800">{productionRuns.length}</div>
                  <div className="text-xs text-stone-500 mt-1">All time</div>
                </div>
                <div className="bg-white p-6 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Units Baked</div>
                  <div className="text-3xl font-bold font-sans text-stone-800">
                    {productionRuns.reduce((s, r) => s + r.quantityProduced, 0)}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">All time</div>
                </div>
                <div className="bg-white p-6 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Prod. Cost</div>
                  <div className="text-3xl font-bold font-sans text-stone-800">
                    {currency.symbol}{productionRuns.reduce((s, r) => s + (r.costTotal || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">All time</div>
                </div>
              </div>

              {/* Finished Goods Stock */}
              {menu.some(m => (m.finishedGoodsStock ?? 0) > 0) && (
                <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden">
                  <div className="px-4 sm:px-8 py-5 border-b border-stone-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Package size={18} />
                    </div>
                    <h3 className="text-base font-bold text-stone-800">Finished Goods In Stock</h3>
                  </div>
                  <div className="px-4 sm:px-8 py-5 flex flex-wrap gap-3">
                    {menu.filter(m => (m.finishedGoodsStock ?? 0) > 0).map(item => (
                      <div key={item.id} className="flex items-center gap-2 bg-stone-50 border border-stone-100 rounded-xl pl-4 pr-2 py-1.5">
                        <span className="text-sm font-bold text-stone-700">{item.name}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(item.finishedGoodsStock ?? 0) <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.finishedGoodsStock} units
                        </span>
                        <button
                          onClick={() => clearFinishedGoodsStock(item.id)}
                          className="p-1.5 ml-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                          title="Clear Stock"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={productionFilterRecipe}
                  onChange={e => setProductionFilterRecipe(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-stone-600 outline-none focus:ring-2 focus:ring-amber-400/30"
                >
                  <option value="">All Recipes</option>
                  {menu.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select
                  value={productionFilterPurpose}
                  onChange={e => setProductionFilterPurpose(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-stone-600 outline-none focus:ring-2 focus:ring-amber-400/30"
                >
                  <option value="">All Purposes</option>
                  <option value="market_stock">🛒 Market Stock</option>
                  <option value="customer_order">📦 Customer Order</option>
                  <option value="sampling">🎁 Sampling</option>
                  <option value="personal_use">🏠 Personal Use</option>
                  <option value="other">✳️ Other</option>
                </select>
              </div>

              {/* Runs List */}
              {(() => {
                const PURPOSE_LABELS: Record<string, string> = {
                  market_stock: '🛒 Market Stock',
                  customer_order: '📦 Customer Order',
                  sampling: '🎁 Sampling',
                  personal_use: '🏠 Personal Use',
                  other: '✳️ Other',
                };
                const PURPOSE_COLORS: Record<string, string> = {
                  market_stock: 'bg-blue-50 text-blue-700',
                  customer_order: 'bg-emerald-50 text-emerald-700',
                  sampling: 'bg-purple-50 text-purple-700',
                  personal_use: 'bg-stone-100 text-stone-600',
                  other: 'bg-amber-50 text-amber-700',
                };
                const filtered = [...productionRuns]
                  .filter(r => (!productionFilterRecipe || r.recipeId === productionFilterRecipe) && (!productionFilterPurpose || r.purpose === productionFilterPurpose))
                  .sort((a, b) => b.createdAt - a.createdAt);

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm p-16 text-center">
                      <div className="w-16 h-16 rounded-[10px] sm:rounded-[15px] bg-amber-50 flex items-center justify-center text-amber-400 mx-auto mb-4">
                        <Factory size={32} />
                      </div>
                      <h3 className="text-lg font-sans font-bold text-stone-700 mb-2">No production runs yet</h3>
                      <p className="text-sm text-stone-400 font-sans italic">Log a baking session to start tracking finished goods.</p>
                    </div>
                  );
                }

                return (
                  <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-stone-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Recipe</th>
                          <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Purpose</th>
                          <th className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Produced</th>
                          <th className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Sellable</th>
                          <th className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Cost</th>
                          <th className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filtered.map(run => {
                          const recipe = menu.find(m => m.id === run.recipeId);
                          const sellable = run.quantityYield ?? run.quantityProduced;
                          const waste = run.quantityProduced - sellable;
                          return (
                            <tr key={run.id} className="hover:bg-stone-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm text-stone-600">{new Date(run.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-sm font-bold text-stone-800">{recipe?.name || 'Unknown'}</td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${PURPOSE_COLORS[run.purpose] || 'bg-stone-100 text-stone-600'}`}>
                                  {PURPOSE_LABELS[run.purpose] || run.purpose}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-bold text-stone-700">{run.quantityProduced}</td>
                              <td className="px-6 py-4 text-right text-sm text-stone-600">
                                {sellable}
                                {waste > 0 && <span className="text-xs text-amber-500 ml-1">(-{waste} waste)</span>}
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-bold text-stone-900 font-sans">{currency.symbol}{(run.costTotal || 0).toFixed(2)}</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => deleteProductionRun(run.id)}
                                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                  title="Delete Production Run"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* R&D Tab */}
          {activeTab === 'experiments' && (
            <motion.div
              key="experiments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pb-20"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                  <h2 className="text-3xl font-sans font-bold text-stone-800">R&D</h2>
                  <p className="text-stone-500 text-sm italic font-sans">Log your daily experiments and track material usage.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  
                  <button 
                    onClick={addExperiment}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
                  >
                    <Plus size={18} />
                    New R&D Session
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {[...experiments].sort((a,b) => b.date.localeCompare(a.date)).map((exp) => (
                  <div key={exp.id} className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 max-w-md">
                        <input 
                          type="text" 
                          value={exp.name}
                          onChange={(e) => updateExperiment(exp.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-2xl font-sans font-bold text-stone-800 p-0"
                          placeholder="Experiment Name"
                        />
                        <textarea 
                          value={exp.notes || ''}
                          onChange={(e) => updateExperiment(exp.id, 'notes', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm text-stone-500 italic font-sans p-0 mt-1 resize-none h-12"
                          placeholder="Add notes about this experiment..."
                        />
                      </div>
                      <button 
                        onClick={() => deleteExperiment(exp.id)}
                        className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Materials Used</h4>
                        <div className="flex items-center gap-2">
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                addMaterialToExperiment(exp.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1 text-xs font-bold text-stone-600 outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">+ Add Material</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exp.materials.map((req, idx) => {
                          const mat = materials.find(m => m.id === req.materialId);
                          return (
                            <div key={idx} className="flex items-center gap-3 bg-stone-50/50 p-4 rounded-xl border border-stone-100 group">
                              <div className="flex-1">
                                <div className="text-[10px] font-bold text-stone-800 uppercase tracking-widest truncate">{mat?.name || 'Unknown'}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <input 
                                    type="number" 
                                    value={req.amount}
                                    onChange={(e) => updateExperimentMaterial(exp.id, req.materialId, parseFloat(e.target.value) || 0)}
                                    className="w-20 bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm font-mono font-bold text-stone-700 outline-none focus:ring-2 focus:ring-primary/20"
                                  />
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{req.unit}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => removeMaterialFromExperiment(exp.id, req.materialId)}
                                className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {experiments.filter(e => e.date === orderDate).length === 0 && (
                  <div className="text-center py-20 bg-white rounded-[10px] sm:rounded-[15px] border-2 border-dashed border-stone-100">
                    <div className="w-20 h-20 bg-stone-50 rounded-[10px] sm:rounded-[15px] shadow-sm border border-stone-100 flex items-center justify-center mx-auto mb-6 text-stone-200">
                      <FlaskConical size={40} />
                    </div>
                    <h3 className="text-xl font-sans font-bold text-stone-800 mb-2">No R&D sessions logged</h3>
                    <p className="text-stone-500 text-sm mb-8 italic font-sans">Track your R&D and recipe testing costs.</p>
                    <button 
                      onClick={addExperiment}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
                    >
                      <Plus size={18} />
                      Log First R&D Session
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pb-20"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h2 className="text-3xl font-sans font-bold text-stone-800">Performance Summary</h2>
                  <p className="text-stone-500 text-sm italic font-sans">Financials and inventory usage for the selected period.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 bg-stone-100/50 p-1 rounded-xl border border-stone-200/50">
                  {(['daily', 'weekly', 'monthly', 'custom'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => handleRangeChange(range)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                        summaryRange === range 
                          ? 'bg-white text-primary shadow-sm' 
                          : 'text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {(materials.length === 0 || menu.length === 0 || orders.length === 0) && (
                <div className="bg-white p-6 md:p-8 rounded-[10px] sm:rounded-[15px] border border-amber-200/50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-16 -mt-16 z-0" />
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-stone-800 mb-2">Welcome to BetterEat Bakery! 🍞</h3>
                    <p className="text-stone-500 text-sm mb-8">Let's get your bakery set up in 3 simple steps:</p>
                    
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${materials.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                          {materials.length > 0 ? '✓' : '1'}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-stone-700">Add Materials</div>
                          <div className="text-xs text-stone-500">Add ingredients to your stock (Stock tab)</div>
                        </div>
                        {materials.length === 0 && <button onClick={() => setActiveTab('inventory')} className="text-xs uppercase font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors">Go</button>}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${menu.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                          {menu.length > 0 ? '✓' : '2'}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-stone-700">Build Recipes</div>
                          <div className="text-xs text-stone-500">Create products with costs attached (Recipes tab)</div>
                        </div>
                        {menu.length === 0 && materials.length > 0 && <button onClick={() => setActiveTab('menu')} className="text-xs uppercase font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors">Go</button>}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${orders.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                          {orders.length > 0 ? '✓' : '3'}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-stone-700">Log an Order</div>
                          <div className="text-xs text-stone-500">Record a sale to track your profit (Orders tab)</div>
                        </div>
                        {orders.length === 0 && menu.length > 0 && <button onClick={() => setActiveTab('orders')} className="text-xs uppercase font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors">Go</button>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {summaryRange !== 'custom' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm">
                  <div className="flex items-center gap-3 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
                    <Clock size={16} className="text-primary/40" />
                    <span>Period: <span className="text-stone-600">{summaryDateStart}</span> to <span className="text-stone-600">{summaryDateEnd}</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-stone-50 border border-stone-100 rounded-xl p-1">
                      <button 
                        onClick={() => {
                          const d = new Date(summaryRefDate);
                          if (summaryRange === 'daily') d.setDate(d.getDate() - 1);
                          else if (summaryRange === 'weekly') d.setDate(d.getDate() - 7);
                          else if (summaryRange === 'monthly') d.setMonth(d.getMonth() - 1);
                          setSummaryRefDate(d.toISOString().split('T')[0]);
                        }}
                        className="p-2 text-stone-400 hover:text-primary hover:bg-white rounded-lg transition-all shadow-sm"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div className="flex items-center gap-2 px-3">
                        <Calendar size={14} className="text-primary/40" />
                        <input 
                          type="date" 
                          value={summaryRefDate}
                          onChange={(e) => setSummaryRefDate(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-700 p-0 cursor-pointer"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const d = new Date(summaryRefDate);
                          if (summaryRange === 'daily') d.setDate(d.getDate() + 1);
                          else if (summaryRange === 'weekly') d.setDate(d.getDate() + 7);
                          else if (summaryRange === 'monthly') d.setMonth(d.getMonth() + 1);
                          setSummaryRefDate(d.toISOString().split('T')[0]);
                        }}
                        className="p-2 text-stone-400 hover:text-primary hover:bg-white rounded-lg transition-all shadow-sm"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => setSummaryRefDate(new Date().toISOString().split('T')[0])}
                      className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary-dark transition-colors px-2"
                    >
                      Today
                    </button>
                  </div>
                </div>
              )}

              {summaryRange === 'custom' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-wrap items-center gap-3 sm:gap-6 bg-white p-5 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">From</span>
                    <input 
                      type="date" 
                      value={summaryDateStart}
                      onChange={(e) => setSummaryDateStart(e.target.value)}
                      className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">To</span>
                    <input 
                      type="date" 
                      value={summaryDateEnd}
                      onChange={(e) => setSummaryDateEnd(e.target.value)}
                      className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {/* Charts Section */}
              <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-stone-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-600">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-sans font-bold text-stone-800">Financial Trends</h3>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mt-0.5">Revenue vs Expenses vs Profitability</p>
                    </div>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  {chartData.every(d => d.income === 0 && d.expenses === 0 && d.profit === 0) ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-stone-400 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                      <Calculator size={48} className="mb-4 text-stone-200" />
                      <p className="font-sans italic">No financial data for this period.</p>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5E3C" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#8B5E3C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 700 }}
                        dy={15}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 700 }}
                        tickFormatter={(value) => `${currency.symbol}${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '24px', 
                          border: '1px solid #f5f5f4',
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '16px'
                        }}
                        itemStyle={{ padding: '4px 0' }}
                        cursor={{ stroke: '#e7e5e4', strokeWidth: 2 }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        height={48}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#78716c' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stroke="#10b981" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorIncome)" 
                        name="Income"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#f43f5e" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorExpenses)" 
                        name="Expenses"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#8B5E3C" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorProfit)" 
                        name="Profit"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm group hover:shadow-md transition-all">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Total Income</div>
                  <div className="text-4xl font-sans font-bold text-emerald-600">{currency.symbol}{financials.income}</div>
                  <div className="text-[10px] text-stone-400 mt-2 uppercase font-bold tracking-wider">From {filteredOrders.reduce((acc, o) => acc + o.quantity, 0)} items sold</div>
                </div>
                <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm group hover:shadow-md transition-all">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Cost of Goods Sold</div>
                  <div className="text-4xl font-sans font-bold text-rose-600">{currency.symbol}{financials.orderExpenses.toFixed(2)}</div>
                  <div className="text-[10px] text-stone-400 mt-2 uppercase font-bold tracking-wider">
                    Cost of fulfilled orders
                  </div>
                </div>
                <div className="bg-amber-50 p-8 rounded-[10px] sm:rounded-[15px] border border-amber-100 shadow-sm group hover:shadow-md transition-all">
                  <div className="text-amber-600/70 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Factory size={11} /> Production Cost
                  </div>
                  <div className="text-4xl font-sans font-bold text-amber-700">{currency.symbol}{totalProductionCost.toFixed(2)}</div>
                  <div className="text-[10px] text-amber-500 mt-2 uppercase font-bold tracking-wider">
                    {filteredProductionRuns.length} run{filteredProductionRuns.length !== 1 ? 's' : ''} in period
                  </div>
                </div>
                <div className="bg-primary/5 p-8 rounded-[10px] sm:rounded-[15px] border border-primary/20 shadow-lg shadow-primary/5 group hover:shadow-primary/10 transition-all">
                  <div className="text-primary/60 text-[10px] font-bold uppercase tracking-widest mb-3">Net Profit</div>
                  <div className="text-4xl font-sans font-bold text-primary">{currency.symbol}{financials.profit.toFixed(2)}</div>
                  <div className="text-[10px] text-primary/40 mt-2 uppercase font-bold tracking-wider">
                    {financials.income > 0 ? `${((financials.profit / financials.income) * 100).toFixed(1)}% margin` : 'No sales yet'}
                    {financials.experimentExpenses > 0 && <span className="block mt-1">Operating Exp: {currency.symbol}{financials.experimentExpenses.toFixed(2)} R&amp;D</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Orders in Period</div>
                  <div className="text-4xl font-sans font-bold text-stone-800">{filteredOrders.length}</div>
                  <div className="text-[10px] text-stone-400 mt-2 uppercase font-bold tracking-wider">{filteredOrders.reduce((acc, o) => acc + o.quantity, 0)} items sold</div>
                </div>
                <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Items on Menu</div>
                  <div className="text-4xl font-sans font-bold text-stone-800">{menu.length}</div>
                </div>
                <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Dates with Data</div>
                  <div className="text-4xl font-sans font-bold text-stone-800">
                    {[...new Set(orders.map(o => o.date))].length}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50/50 border-b border-stone-100">
                      <th className="px-8 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Material</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Initial Stock</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Used in Period</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Current Stock</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {(['raw', 'packaging'] as const).map((cat) => {
                      const categoryItems = remainingInventory.filter(i => i.category === cat);
                      if (categoryItems.length === 0) return null;

                      return (
                        <React.Fragment key={cat}>
                          <tr className="bg-stone-50/30">
                            <td colSpan={5} className="px-8 py-3 text-[10px] font-bold text-primary/60 uppercase tracking-widest bg-primary/5">
                              {cat === 'raw' ? 'Raw Materials' : 'Packaging Materials'}
                            </td>
                          </tr>
                          {categoryItems.map((item) => {
                            const isLow = item.currentStock <= (item.minStock || 0);
                            return (
                              <tr key={item.id} className="group hover:bg-stone-50/50 transition-colors">
                                <td className="px-8 py-5">
                                  <div className="font-sans font-bold text-stone-800">{item.name}</div>
                                  <div className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">{item.unit}</div>
                                </td>
                                <td className="px-8 py-5 font-mono text-sm text-stone-600">
                                  {item.initialStock.toFixed(2)}
                                </td>
                                <td className="px-8 py-5 font-mono text-sm text-stone-600">
                                  {item.usedInPeriod.toFixed(2)}
                                </td>
                                <td className="px-8 py-5">
                                  <div className={`font-mono text-sm font-bold ${isLow ? 'text-rose-600' : 'text-stone-800'}`}>
                                    {item.currentStock.toFixed(2)}
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                  {isLow ? (
                                    <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-rose-100">
                                      <AlertCircle size={10} />
                                      Low Stock
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-100">
                                      <Check size={10} />
                                      Healthy
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Wastage Tab ─────────────────────────────────────────────── */}
          {activeTab === 'wastage' && (
            <motion.div
              key="wastage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Wastage Log</h1>
                <p className="text-stone-500 text-sm font-sans italic mt-1">Track and review all discarded raw materials and finished goods.</p>
              </div>

              {/* Summary Cards */}
              {(() => {
                const matLogs = wastageLogs.filter(w => w.type === "material");
                const recLogs = wastageLogs.filter(w => w.type === "recipe");
                const totalCost = wastageLogs.reduce((s, w) => s + (w.cost || 0), 0);
                const matCost  = matLogs.reduce((s, w) => s + (w.cost || 0), 0);
                const recCost  = recLogs.reduce((s, w) => s + (w.cost || 0), 0);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm p-6 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Wastage Cost</span>
                      <span className="text-3xl font-mono font-bold text-rose-600">{currency.symbol}{totalCost.toFixed(2)}</span>
                      <span className="text-xs text-stone-400">{wastageLogs.length} discard event{wastageLogs.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm p-6 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Raw Material Wastage</span>
                      <span className="text-3xl font-mono font-bold text-amber-600">{currency.symbol}{matCost.toFixed(2)}</span>
                      <span className="text-xs text-stone-400">{matLogs.length} event{matLogs.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm p-6 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Finished Goods Wastage</span>
                      <span className="text-3xl font-mono font-bold text-purple-600">{currency.symbol}{recCost.toFixed(2)}</span>
                      <span className="text-xs text-stone-400">{recLogs.length} event{recLogs.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Log Table */}
              <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                  <h2 className="font-bold text-stone-700 uppercase tracking-widest text-[10px]">All Discard Events</h2>
                  <span className="text-[10px] text-stone-400 font-mono">{wastageLogs.length} records</span>
                </div>
                {wastageLogs.length === 0 ? (
                  <div className="px-6 py-16 text-center text-stone-400 font-sans italic text-sm">
                    No wastage events recorded yet. Use the Discard button on inventory items or production runs.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[640px]">
                      <thead>
                        <tr className="bg-stone-50/50 border-b border-stone-100">
                          <th className="px-6 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Type</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Item</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Qty Discarded</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Cost</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {[...wastageLogs].sort((a, b) => b.date.localeCompare(a.date)).map(log => {
                          const isMat = log.type === "material";
                          const mat = isMat ? materials.find(m => m.id === log.itemId) : null;
                          const rec = !isMat ? menu.find(m => m.id === log.itemId) : null;
                          const itemName = mat?.name ?? rec?.name ?? log.itemId;
                          const unit = mat?.unit ?? (rec ? "pcs" : "");
                          return (
                            <tr key={log.id} className="hover:bg-stone-50/30 transition-colors">
                              <td className="px-6 py-4 text-sm font-mono text-stone-500">{log.date}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isMat ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>
                                  {isMat ? "Raw Material" : "Finished Good"}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-stone-800 text-sm">{itemName}</td>
                              <td className="px-6 py-4 font-mono text-stone-600 text-sm">{log.quantity} {unit}</td>
                              <td className="px-6 py-4 font-mono font-bold text-rose-600 text-sm">{currency.symbol}{(log.cost || 0).toFixed(2)}</td>
                              <td className="px-6 py-4 text-stone-500 text-xs font-sans italic max-w-xs">{log.reason || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Per-Item Breakdown */}
              {wastageLogs.length > 0 && (() => {
                const byItem: Record<string, { name: string; type: string; totalQty: number; totalCost: number; unit: string; events: number }> = {};
                wastageLogs.forEach(log => {
                  const isMat = log.type === "material";
                  const mat = isMat ? materials.find(m => m.id === log.itemId) : null;
                  const rec = !isMat ? menu.find(m => m.id === log.itemId) : null;
                  const name = mat?.name ?? rec?.name ?? log.itemId;
                  const unit = mat?.unit ?? (rec ? "pcs" : "");
                  if (!byItem[log.itemId]) byItem[log.itemId] = { name, type: log.type, totalQty: 0, totalCost: 0, unit, events: 0 };
                  byItem[log.itemId].totalQty += log.quantity;
                  byItem[log.itemId].totalCost += log.cost || 0;
                  byItem[log.itemId].events++;
                });
                const sorted = Object.values(byItem).sort((a, b) => b.totalCost - a.totalCost);
                return (
                  <div className="bg-white rounded-[10px] sm:rounded-[15px] border border-stone-200/50 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-100">
                      <h2 className="font-bold text-stone-700 uppercase tracking-widest text-[10px]">Wastage by Item (All Time)</h2>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {sorted.map(item => (
                        <div key={item.name} className="px-6 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`shrink-0 w-2 h-2 rounded-full ${item.type === "material" ? "bg-amber-400" : "bg-purple-400"}`} />
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-stone-800 truncate">{item.name}</div>
                              <div className="text-[10px] text-stone-400 uppercase tracking-wider">{item.type === "material" ? "Raw Material" : "Finished Good"} · {item.events} event{item.events !== 1 ? "s" : ""}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <div className="text-[10px] text-stone-400 uppercase tracking-wider">Qty</div>
                              <div className="font-mono font-bold text-stone-700 text-sm">{item.totalQty.toFixed(item.type === "recipe" ? 0 : 0)} {item.unit}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-stone-400 uppercase tracking-wider">Cost Lost</div>
                              <div className="font-mono font-bold text-rose-600 text-sm">{currency.symbol}{item.totalCost.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8 border-t border-stone-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 text-stone-400">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
              <Database size={14} />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Data Storage</div>
              <div className="text-xs font-medium text-stone-600">Secure Cloud Storage</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-stone-400">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
              <RefreshCw size={14} />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Sync Status</div>
              <div className="text-xs font-medium text-stone-600 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real-time Active
              </div>
            </div>
          </div>
        </div>
      </footer>


      {/* Custom Modal */}
      <AnimatePresence>
        <ProductionRunModal
          isOpen={isProductionRunModalOpen}
          onClose={() => setIsProductionRunModalOpen(false)}
          menu={menu}
          materials={materials}
          onSave={logProductionRun}
          currency={currency}
        />
        <IngredientSelectorModal
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

        {/* Discard Modal */}
      <AnimatePresence>
        {discardTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              onClick={() => setDiscardTarget(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[10px] sm:rounded-[15px] shadow-2xl overflow-y-auto max-h-[90vh] border border-stone-200/50"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center mb-6">
                  <Trash2 size={32} className="text-rose-500" />
                </div>
                <h3 className="text-2xl font-bold text-stone-800 mb-2">Discard {discardTarget.name}</h3>
                <p className="text-stone-500 text-sm font-sans italic mb-6">
                  Log wasted stock and track cost. Max: {discardTarget.maxQty} {discardTarget.unit}
                </p>

                <form onSubmit={handleDiscard}>
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Quantity to Discard ({discardTarget.unit})</label>
                      <input
                        type="number"
                        step="0.01"
                        max={discardTarget.maxQty}
                        required
                        value={discardQty}
                        onChange={(e) => setDiscardQty(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Reason</label>
                      <input
                        type="text"
                        required
                        value={discardReason}
                        onChange={(e) => setDiscardReason(e.target.value)}
                        placeholder="e.g. Expired, Spilled, Burnt"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDiscardTarget(null)}
                      className="flex-1 px-6 py-4 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-50 transition-colors uppercase tracking-widest border border-stone-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors uppercase tracking-widest shadow-lg shadow-rose-500/20"
                    >
                      Confirm Discard
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restock Modal */}

      {/* Add Material Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setShowAddMaterialModal(false)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg bg-white rounded-[10px] sm:rounded-[15px] shadow-2xl overflow-y-auto max-h-[90vh] border border-stone-200/50"
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Plus size={32} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-stone-800 mb-1">Add New Item</h3>
              <p className="text-stone-400 text-sm font-sans italic mb-6">Adding to <span className="font-bold text-stone-600">{addMaterialCategory}</span></p>

              <form onSubmit={handleAddMaterialSubmit}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Item Name *</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={addMatName}
                      onChange={(e) => setAddMatName(e.target.value)}
                      placeholder="e.g. All-Purpose Flour"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Unit</label>
                      <select
                        value={addMatUnit}
                        onChange={(e) => setAddMatUnit(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                      >
                        <option value="g">g (grams)</option>
                        <option value="kg">kg (kilograms)</option>
                        <option value="ml">ml (millilitres)</option>
                        <option value="l">l (litres)</option>
                        <option value="pcs">pcs (pieces)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Initial Stock</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={addMatStock}
                        onChange={(e) => setAddMatStock(e.target.value)}
                        placeholder="0"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-mono font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Cost per Unit ({currency.symbol})</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={addMatCost}
                        onChange={(e) => setAddMatCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-mono font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Low Stock Alert ({addMatUnit})</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={addMatThreshold}
                        onChange={(e) => setAddMatThreshold(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-mono font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Expiry Date (optional)</label>
                    <input
                      type="date"
                      value={addMatExpiry}
                      onChange={(e) => setAddMatExpiry(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 font-mono focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddMaterialModal(false)}
                    className="flex-1 px-6 py-4 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-50 transition-colors uppercase tracking-widest border border-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!addMatName.trim()}
                    className="flex-1 px-6 py-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-colors uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

        {restockMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              onClick={() => setRestockMaterial(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[10px] sm:rounded-[15px] shadow-2xl overflow-y-auto max-h-[90vh] border border-stone-200/50"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center mb-6">
                  <Plus size={32} className="text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-stone-800 mb-2">Restock {restockMaterial.name}</h3>
                <p className="text-stone-500 text-sm font-sans italic mb-6">
                  Current Stock: {restockMaterial.initialStock} {restockMaterial.unit}
                </p>

                <form onSubmit={handleRestock}>
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Quantity Added ({restockMaterial.unit})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Total Base Price Paid</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={restockBaseTotal}
                        onChange={(e) => setRestockBaseTotal(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Expiry Date of This Batch</label>
                      <input
                        type="date"
                        value={restockExpiryDate}
                        onChange={(e) => setRestockExpiryDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-8">
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">GST ({restockMaterial.gstRate ?? 5}%)</span>
                      <span className="text-sm font-mono font-bold text-stone-700">
                        {currency.symbol}{restockBaseTotal ? (Number(restockBaseTotal) * ((restockMaterial.gstRate ?? 5) / 100)).toFixed(2) : '0.00'}
                      </span>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Total Paid</span>
                      <span className="text-lg font-mono font-bold text-emerald-700">
                        {currency.symbol}{restockBaseTotal ? (Number(restockBaseTotal) * (1 + ((restockMaterial.gstRate ?? 5) / 100))).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRestockMaterial(null)}
                      className="flex-1 px-6 py-4 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-50 transition-colors uppercase tracking-widest border border-stone-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!restockQty || !restockBaseTotal}
                      className="flex-1 px-6 py-4 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors uppercase tracking-widest disabled:opacity-50"
                    >
                      Confirm Restock
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {modalConfig.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[10px] sm:rounded-[15px] shadow-2xl border border-stone-200 w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className={`w-16 h-16 rounded-xl mx-auto mb-6 flex items-center justify-center ${
                  modalConfig.type === 'confirm' ? 'bg-rose-50 text-rose-500' : 'bg-primary/10 text-primary'
                }`}>
                  {modalConfig.type === 'confirm' ? <AlertCircle size={32} /> : <CheckCircle2 size={32} />}
                </div>
                <h3 className="text-lg font-bold text-stone-800 mb-2">{modalConfig.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed font-sans italic">{modalConfig.message}</p>
              </div>
              <div className="flex border-t border-stone-100">
                {modalConfig.type === 'confirm' && (
                  <button
                    onClick={() => setModalConfig({ ...modalConfig, show: false })}
                    className="flex-1 px-6 py-4 text-[10px] font-bold text-stone-400 hover:bg-stone-50 transition-colors border-r border-stone-100 uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    setModalConfig({ ...modalConfig, show: false });
                  }}
                  className={`flex-1 px-6 py-4 text-[10px] font-bold transition-colors hover:bg-stone-50 uppercase tracking-widest ${
                    modalConfig.type === 'confirm' ? 'text-rose-600' : 'text-primary'
                  }`}
                >
                  {modalConfig.type === 'confirm' ? 'Delete' : 'OK'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div> {/* End flex-1 min-w-0 main content area */}

      {/* Mobile Bottom Navigation & Floating Action */}
      <div className="md:hidden">
        {/* Floating Action Button - Positioned above the nav */}
        {menu.length > 0 && (activeTab === 'summary' || activeTab === 'production') && (
          <div className="fixed bottom-24 right-4 z-50">
            <button 
              onClick={() => setIsProductionRunModalOpen(true)}
              className="w-14 h-14 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 transition-transform active:scale-95 border-2 border-white"
            >
              <Factory size={24} />
            </button>
          </div>
        )}

        {/* Scrollable Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200/50 z-50 flex items-center pb-[env(safe-area-inset-bottom,8px)] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
          <BottomNavButton id="summary" label="Home" icon={Calculator} />
          <BottomNavButton id="inventory" label="Stock" icon={Package} />
          <BottomNavButton id="orders" label="Orders" icon={ClipboardList} />
          <BottomNavButton id="production" label="Runs" icon={Factory} />
          <BottomNavButton id="menu" label="Recipes" icon={Utensils} />
          <BottomNavButton id="experiments" label="R&D" icon={FlaskConical} />
          <BottomNavButton id="wastage" label="Waste" icon={Trash2} />
          <BottomNavButton id="settings" label="More" icon={Settings} />
        </nav>
      </div>

    </div>
  );
}
