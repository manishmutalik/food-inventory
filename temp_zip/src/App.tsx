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
  Mic,
  MicOff,
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
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
  limit 
} from './firebase';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-200 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">Application Error</h2>
            <p className="text-stone-600 mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
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

// --- Types ---

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  initialStock: number;
  costPerUnit: number;
  category: string;
  threshold?: number;
  dateAdded: string;
}

interface IngredientRequirement {
  materialId: string;
  amount: number;
  unit: string;
}

interface MenuItem {
  id: string;
  name: string;
  recipe: IngredientRequirement[];
  sellingPrice: number;
}

interface Order {
  id: string;
  menuItemId: string;
  quantity: number;
  date: string; // YYYY-MM-DD
}

interface RecipeExperiment {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  materials: IngredientRequirement[];
  notes?: string;
}

interface BakerySettings {
  name: string;
  logo: string;
  primaryColor: string;
  address: string;
  phone: string;
  email: string;
}

interface AppUser {
  email: string;
  name: string;
}

// --- Initial Data ---

const INITIAL_MATERIALS: RawMaterial[] = [
  { id: '1', name: 'All-Purpose Flour', unit: 'g', initialStock: 10000, costPerUnit: 0.002, category: 'Raw Materials', threshold: 20, dateAdded: '2026-01-01' },
  { id: '2', name: 'Granulated Sugar', unit: 'g', initialStock: 5000, costPerUnit: 0.0015, category: 'Raw Materials', threshold: 20, dateAdded: '2026-01-02' },
  { id: '3', name: 'Unsalted Butter', unit: 'g', initialStock: 2000, costPerUnit: 0.012, category: 'Raw Materials', threshold: 20, dateAdded: '2026-01-03' },
  { id: '4', name: 'Large Eggs', unit: 'pcs', initialStock: 60, costPerUnit: 0.25, category: 'Raw Materials', threshold: 20, dateAdded: '2026-01-04' },
  { id: '5', name: 'Whole Milk', unit: 'ml', initialStock: 3000, costPerUnit: 0.0012, category: 'Raw Materials', threshold: 20, dateAdded: '2026-01-05' },
  { id: '6', name: 'Active Dry Yeast', unit: 'g', initialStock: 500, costPerUnit: 0.05, category: 'Raw Materials', threshold: 20, dateAdded: '2026-01-06' },
  { id: '7', name: 'Packaging Box', unit: 'pcs', initialStock: 100, costPerUnit: 0.50, category: 'Packaging Materials', threshold: 20, dateAdded: '2026-01-07' },
  { id: '8', name: 'Greaseproof Paper', unit: 'pcs', initialStock: 200, costPerUnit: 0.05, category: 'Packaging Materials', threshold: 20, dateAdded: '2026-01-08' },
];

const INITIAL_MENU: MenuItem[] = [
  { 
    id: 'm1', 
    name: 'Classic Croissant', 
    sellingPrice: 4.50,
    recipe: [
      { materialId: '1', amount: 250, unit: 'g' }, // Flour
      { materialId: '2', amount: 25, unit: 'g' },  // Sugar
      { materialId: '3', amount: 125, unit: 'g' }, // Butter
      { materialId: '5', amount: 50, unit: 'ml' },  // Milk
      { materialId: '6', amount: 7, unit: 'g' },   // Yeast
    ] 
  },
  { 
    id: 'm2', 
    name: 'Chocolate Muffin', 
    sellingPrice: 3.75,
    recipe: [
      { materialId: '1', amount: 200, unit: 'g' },
      { materialId: '2', amount: 150, unit: 'g' },
      { materialId: '3', amount: 100, unit: 'g' },
      { materialId: '4', amount: 2, unit: 'pcs' },
      { materialId: '5', amount: 100, unit: 'ml' },
    ] 
  }
];

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  g: { g: 1, kg: 0.001 },
  kg: { g: 1000, kg: 1 },
  ml: { ml: 1, l: 0.001 },
  l: { ml: 1000, l: 1 },
  pcs: { pcs: 1 }
};

function convertAmount(amount: number, fromUnit: string, toUnit: string): number {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return amount;
  const conversion = UNIT_CONVERSIONS[fromUnit]?.[toUnit];
  return conversion !== undefined ? amount * conversion : amount;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'INR', symbol: '₹' },
  { code: 'CAD', symbol: 'CA$' },
  { code: 'AUD', symbol: 'A$' },
];

// --- Main Component ---

export default function App() {
  return (
    <ErrorBoundary>
      <BakeryApp />
    </ErrorBoundary>
  );
}

function BakeryApp() {
  const [materials, setMaterials] = useState<RawMaterial[]>(INITIAL_MATERIALS);
  const [categories, setCategories] = useState<string[]>(['Raw Materials', 'Packaging Materials']);
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [orders, setOrders] = useState<Order[]>([]);
  const [experiments, setExperiments] = useState<RecipeExperiment[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'menu' | 'orders' | 'experiments' | 'summary' | 'settings'>('inventory');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'bakery' | 'integrations' | 'customisation' | 'account' | 'categories'>('bakery');
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [summaryRange, setSummaryRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [summaryDateStart, setSummaryDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [summaryDateEnd, setSummaryDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaryRefDate, setSummaryRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [inventorySortBy, setInventorySortBy] = useState<'name' | 'stock' | 'cost' | 'date'>('name');
  const [inventorySortOrder, setInventorySortOrder] = useState<'asc' | 'desc'>('asc');
  const [settings, setSettings] = useState<BakerySettings>({
    name: 'My Bakery',
    logo: '',
    primaryColor: '#10b981',
    address: '',
    phone: '',
    email: ''
  });
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'google'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    type: 'alert' | 'confirm';
  }>({ show: false, title: '', message: '', type: 'alert' });
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'low-stock' }[]>([]);
  const prevLowStockCount = React.useRef(0);

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

  // Voice Assistant State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
  const [voiceMessage, setVoiceMessage] = useState('');
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Shopify and Odoo status on mount
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

  // --- Firebase Auth ---

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

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
      setAuthError('Google login failed. Please try again.');
    }
  };

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // --- Firebase Listeners ---

  useEffect(() => {
    if (!isAuthReady || !auth.currentUser) return;

    const userId = auth.currentUser.uid;

    // Materials
    const unsubMaterials = onSnapshot(collection(db, 'users', userId, 'materials'), (snapshot) => {
      const mats = snapshot.docs.map(doc => doc.data() as RawMaterial);
      setMaterials(mats);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/materials`));

    // Menu
    const unsubMenu = onSnapshot(collection(db, 'users', userId, 'menu'), (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as MenuItem);
      setMenu(items);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/menu`));

    // Orders
    const unsubOrders = onSnapshot(collection(db, 'users', userId, 'orders'), (snapshot) => {
      const ords = snapshot.docs.map(doc => doc.data() as Order);
      setOrders(ords);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/orders`));

    // Experiments
    const unsubExperiments = onSnapshot(collection(db, 'users', userId, 'experiments'), (snapshot) => {
      const exps = snapshot.docs.map(doc => doc.data() as RecipeExperiment);
      setExperiments(exps);
      setLastSynced(new Date());
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/experiments`));

    // Settings
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

    return () => {
      unsubMaterials();
      unsubMenu();
      unsubOrders();
      unsubExperiments();
      unsubSettings();
    };
  }, [isAuthReady, user]);

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

  const disconnectShopify = async () => {
    try {
      await fetch('/api/shopify/disconnect', { method: 'POST' });
      setShopifyStatus({ connected: false, shop: null });
    } catch (err) {
      showAlert("Error", "Failed to disconnect Shopify.");
    }
  };

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

  const disconnectOdoo = async () => {
    try {
      await fetch('/api/odoo/disconnect', { method: 'POST' });
      setOdooStatus({ connected: false, url: null });
    } catch (err) {
      showAlert("Error", "Failed to disconnect Odoo.");
    }
  };

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
              date: orderDate
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
              date: orderDate
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

  const showAlert = (title: string, message: string) => {
    setModalConfig({ show: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ show: true, title, message, onConfirm, type: 'confirm' });
  };

  // Persistence
  useEffect(() => {
    // Update theme color dynamically
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
  }, [settings.primaryColor]);

  const saveBakerySettings = async (newSettings: BakerySettings) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'settings', 'bakery'), newSettings, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/bakery`);
    }
  };

  // Debounced save for settings to prevent too many writes and jumpy inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthReady && auth.currentUser) {
        saveBakerySettings(settings);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings, isAuthReady]);

  const updateSettingsField = (field: keyof BakerySettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

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

  // --- Calculations ---

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      return order.date >= summaryDateStart && order.date <= summaryDateEnd;
    });
  }, [orders, summaryDateStart, summaryDateEnd]);

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

  const lowStockItems = useMemo(() => {
    return remainingInventory.filter(item => {
      const absoluteThreshold = (item.initialStock * (item.threshold || 0)) / 100;
      return item.remaining <= absoluteThreshold;
    });
  }, [remainingInventory]);

  useEffect(() => {
    if (lowStockItems.length > prevLowStockCount.current) {
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

    return { income, expenses, orderExpenses, experimentExpenses, profit: income - expenses };
  };

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

  const refreshData = async () => {
    setIsRefreshing(true);
    // Since we use onSnapshot, data is already real-time.
    // This button provides visual feedback and ensures the UI is fresh.
    setLastSynced(new Date());
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // --- Handlers ---

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

  const updateMaterial = async (id: string, field: keyof RawMaterial, value: string | number) => {
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

  const addMenuItem = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newItem: MenuItem = {
      id,
      name: 'New Menu Item',
      sellingPrice: 0,
      recipe: []
    };
    try {
      await setDoc(doc(db, 'users', userId, 'menu', id), newItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/menu/${id}`);
    }
  };

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

  const addExperiment = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const id = Math.random().toString(36).substr(2, 9);
    const newExp: RecipeExperiment = {
      id,
      name: 'New Experiment',
      date: orderDate,
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

  // Voice Assistant Logic
  const processVoiceCommand = async (transcript: string) => {
    setVoiceStatus('processing');
    setVoiceMessage('Interpreting your command...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Interpret this voice command for a bakery management app: "${transcript}".
        
        Available actions:
        1. add_order: Add a new order. Requires items (name and quantity).
        2. add_experiment: Add a new recipe experiment. Requires name and materials (name and amount).
        3. update_inventory: Update stock levels. Requires material name and amount to add/remove.
        
        Current context:
        - Menu items: ${menu.map(m => `${m.name} [ID: ${m.id}]`).join(', ')}
        - Inventory materials: ${materials.map(m => `${m.name} [ID: ${m.id}]`).join(', ')}
        - Current date: ${orderDate}
        
        Return a JSON object with:
        {
          "action": "add_order" | "add_experiment" | "update_inventory" | "unknown",
          "data": {
            "items": [{"id": "item_id", "quantity": number}], // for add_order
            "materials": [{"id": "material_id", "amount": number}], // for add_experiment
            "name": "experiment_name", // for add_experiment
            "materialId": "material_id", // for update_inventory
            "amount": number, // for update_inventory
            "type": "add" | "remove" // for update_inventory
          },
          "feedback": "A friendly message confirming what you're doing"
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING },
              data: { type: Type.OBJECT },
              feedback: { type: Type.STRING }
            },
            required: ["action", "feedback"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setVoiceMessage(result.feedback);

      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      if (result.action === 'add_order' && result.data?.items) {
        const items = result.data.items.map((item: any) => {
          const menuItem = menu.find(m => m.id === item.id) || 
                           menu.find(m => m.name.toLowerCase().includes(String(item.name || '').toLowerCase()));
          return {
            menuItemId: menuItem?.id || '',
            quantity: Number(item.quantity) || 1
          };
        }).filter((i: any) => i.menuItemId);

        if (items.length > 0) {
          try {
            for (const item of items) {
              const id = Math.random().toString(36).substr(2, 9);
              await setDoc(doc(db, `users/${userId}/orders`, id), {
                id,
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                date: orderDate
              });
            }
            setVoiceStatus('success');
            setActiveTab('orders');
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${userId}/orders`);
          }
        } else {
          setVoiceStatus('error');
          setVoiceMessage("I couldn't find those items in your menu.");
        }
      } else if (result.action === 'add_experiment' && result.data) {
        const expMaterials = (result.data.materials || []).map((m: any) => {
          const mat = materials.find(mat => mat.id === m.id) ||
                      materials.find(mat => mat.name.toLowerCase().includes(String(m.name || '').toLowerCase()));
          return {
            materialId: mat?.id || '',
            amount: Number(m.amount) || 0,
            unit: mat?.unit || 'g'
          };
        }).filter((m: any) => m.materialId);

        if (expMaterials.length > 0) {
          try {
            const id = Math.random().toString(36).substr(2, 9);
            await setDoc(doc(db, `users/${userId}/experiments`, id), {
              id,
              name: result.data.name || 'New Experiment',
              date: orderDate,
              materials: expMaterials,
              notes: 'Added via voice command'
            });
            setVoiceStatus('success');
            setActiveTab('experiments');
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${userId}/experiments`);
          }
        } else {
          setVoiceStatus('error');
          setVoiceMessage("I couldn't find those materials in your inventory.");
        }
      } else if (result.action === 'update_inventory' && result.data) {
        const matId = result.data.materialId;
        const targetName = result.data.name || '';
        const mat = materials.find(m => m.id === matId) ||
                    materials.find(m => m.name.toLowerCase().includes(targetName.toLowerCase()));
        
        if (mat) {
          try {
            const amount = Number(result.data.amount) || 0;
            const currentStock = Number(mat.initialStock) || 0;
            const newInitialStock = result.data.type === 'remove' 
              ? Math.max(0, currentStock - amount)
              : currentStock + amount;
            
            if (isNaN(newInitialStock)) {
              throw new Error("Invalid stock calculation");
            }

            await setDoc(doc(db, `users/${userId}/materials`, mat.id), {
              ...mat,
              initialStock: newInitialStock
            }, { merge: true });
            setVoiceStatus('success');
            setActiveTab('inventory');
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/materials/${mat.id}`);
          }
        } else {
          setVoiceStatus('error');
          setVoiceMessage(`I couldn't find "${targetName || 'that material'}" in your inventory.`);
        }
      } else {
        setVoiceStatus('error');
        setVoiceMessage(result.feedback || "I'm not sure how to help with that yet.");
      }

      setTimeout(() => {
        setVoiceStatus('idle');
        setIsVoiceActive(false);
      }, 3000);

    } catch (error) {
      console.error('Voice processing error:', error);
      setVoiceStatus('error');
      setVoiceMessage("Something went wrong processing your request.");
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceStatus('listening');
      setVoiceMessage('Listening for your command...');
      setIsVoiceActive(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      processVoiceCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      setVoiceStatus('error');
      setVoiceMessage('Error recognizing speech. Please try again.');
      setTimeout(() => setVoiceStatus('idle'), 3000);
    };

    recognition.start();
  };

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
    
    const newRecipe = [...item.recipe, { materialId: defaultMaterial.id, amount: 0, unit: defaultMaterial.unit }];
    try {
      await setDoc(doc(db, 'users', userId, 'menu', itemId), { 
        ...item,
        recipe: newRecipe 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/menu/${itemId}`);
    }
  };

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
        updatedIngredient.unit = newMat.unit;
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

  const deleteOrder = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'orders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/orders/${id}`);
    }
  };

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

  useEffect(() => {
    if (summaryRange !== 'custom') {
      handleRangeChange(summaryRange, summaryRefDate);
    }
  }, [summaryRefDate, summaryRange]);

  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  
  const summaryFinancials = useMemo(() => getFinancialsForRange(summaryDateStart, summaryDateEnd), [summaryDateStart, summaryDateEnd, orders, menu, materials]);
  const activeOrdersCount = useMemo(() => orders.filter(o => o.date >= summaryDateStart && o.date <= summaryDateEnd).length, [orders, summaryDateStart, summaryDateEnd]);
  const averageOrderValue = useMemo(() => activeOrdersCount > 0 ? summaryFinancials.income / activeOrdersCount : 0, [summaryFinancials.income, activeOrdersCount]);

  const saveDay = () => {
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 2000);
  };

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

  // --- Render Helpers ---

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative group ${
        activeTab === id 
          ? 'text-primary' 
          : 'text-stone-400 hover:text-stone-600'
      }`}
    >
      <Icon size={18} className={`transition-transform duration-300 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="hidden sm:inline uppercase tracking-widest text-[10px]">{label}</span>
      {activeTab === id && (
        <motion.div 
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium font-serif italic">Initializing Bakery...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-xl max-w-md w-full"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary p-4 rounded-2xl text-white mb-4 shadow-lg shadow-primary/20">
              <Utensils size={32} />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 font-serif">Bakery Manager</h2>
            <p className="text-stone-500 text-sm text-center mt-2 font-serif italic">Manage your bakery inventory and recipes securely in the cloud.</p>
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
                  Back to Google login
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-8 pt-6 border-t border-stone-100 text-center">
            <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Powered by Firebase</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const StatCard = ({ label, value, icon: Icon, color, trend, subtext }: { label: string, value: string, icon: any, color: string, trend?: { value: string, up: boolean }, subtext?: string }) => (
    <div className="bg-white p-6 rounded-3xl border border-stone-200/50 shadow-sm bento-item flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/10`}>
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
        <div className="text-2xl font-serif font-bold text-stone-900">{value}</div>
        {subtext && <p className="text-[10px] text-stone-400 mt-1 font-medium font-serif italic">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface text-stone-900 font-sans">
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
                className="bg-stone-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto border border-white/10"
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
            <div className="flex items-center gap-4">
              {settings.logo ? (
                <div className="relative group">
                  <img src={settings.logo} alt="Logo" className="w-12 h-12 rounded-2xl object-cover border-2 border-stone-100 shadow-sm transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5" />
                </div>
              ) : (
                <div className="bg-primary p-3 rounded-2xl text-white shadow-lg shadow-primary/20">
                  <Utensils size={28} />
                </div>
              )}
              <div>
                <h1 className="text-xl font-serif font-bold tracking-tight text-stone-900 leading-tight">{settings.name || 'Bakery Tracker'}</h1>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Live Dashboard</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-4">
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5">
                  <Globe size={14} className="text-stone-400" />
                  <select 
                    value={currency.code}
                    onChange={(e) => {
                      const selected = CURRENCIES.find(c => c.code === e.target.value);
                      if (selected) updateCurrency(selected);
                    }}
                    className="bg-transparent border-none focus:ring-0 text-xs font-bold text-stone-600 cursor-pointer appearance-none pr-4"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              {lowStockItems.length > 0 && (
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className="relative p-2.5 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all shadow-sm shadow-rose-500/5 group"
                  title={`${lowStockItems.length} items low on stock`}
                >
                  <AlertCircle size={22} className="group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {lowStockItems.length}
                  </span>
                </button>
              )}
              
              <div className="flex items-center gap-3 pl-6 border-l border-stone-200">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-stone-800 leading-none mb-1 font-serif">{user?.name}</div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{user?.email}</div>
                </div>
                <div className="relative group">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-sm">
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
          
          <nav className="flex -mb-px overflow-x-auto no-scrollbar gap-2">
            <TabButton id="inventory" label="Inventory" icon={Package} />
            <TabButton id="menu" label="Recipes" icon={Utensils} />
            <TabButton id="orders" label="Daily Orders" icon={ClipboardList} />
            <TabButton id="experiments" label="Experiments" icon={FlaskConical} />
            <TabButton id="summary" label="Summary" icon={Calculator} />
            <TabButton id="settings" label="Settings" icon={Settings} />
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
                  className="bg-rose-50 border border-rose-100 rounded-3xl p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 text-rose-600">
                    <AlertCircle size={24} />
                    <h3 className="font-bold uppercase tracking-widest text-[10px]">Critical Stock Alerts</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="bg-white/80 backdrop-blur-sm border border-rose-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-1">{item.name}</div>
                          <div className="text-2xl font-mono font-bold text-rose-600">
                            {item.remaining} <span className="text-xs font-normal text-rose-400">{item.unit}</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-rose-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-rose-400">
                          <span>Threshold: {item.threshold}%</span>
                          <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Low Stock</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Sorting & Refresh Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/50 shadow-sm">
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
                <div className="flex items-center gap-3">
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
                    <span className="font-medium uppercase tracking-wider text-[10px]">
                      {inventorySortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Material Sections */}
              {categories.map(category => (
                <div key={category} className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-stone-800">{category}</h2>
                      <p className="text-stone-500 text-sm font-serif italic">Track stock levels and costs for {category.toLowerCase()}.</p>
                    </div>
                    <button 
                      onClick={() => addMaterial(category)}
                      className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
                    >
                      <Plus size={18} />
                      Add {category} Item
                    </button>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-stone-200/50 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50/50 border-b border-stone-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Material Name</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Unit</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Morning Stock</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Threshold</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Cost / Unit</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {sortedRemainingInventory.filter(m => m.category === category).map((mat) => {
                          const isLowStock = mat.remaining <= ((mat.initialStock * (mat.threshold || 0)) / 100);
                          
                          return (
                            <tr key={mat.id} className={`hover:bg-stone-50/30 transition-colors ${isLowStock ? 'bg-rose-50/20' : ''}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {isLowStock && <AlertCircle size={14} className="text-rose-500" />}
                                  <input 
                                    type="text" 
                                    value={mat.name || ''}
                                    onChange={(e) => updateMaterial(mat.id, 'name', e.target.value)}
                                    className={`w-full bg-transparent border-none focus:ring-0 font-bold p-0 text-sm font-serif ${isLowStock ? 'text-rose-700' : 'text-stone-700'}`}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  value={mat.unit || 'g'}
                                  onChange={(e) => updateMaterial(mat.id, 'unit', e.target.value)}
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
                                    className={`w-16 border rounded-xl px-2 py-1.5 text-sm font-mono focus:ring-2 outline-none text-right transition-all ${isLowStock ? 'bg-rose-50/50 border-rose-100 focus:ring-rose-500' : 'bg-stone-50/50 border-stone-100 focus:ring-primary/20'}`}
                                    placeholder="20"
                                  />
                                  <span className="text-stone-400 text-[10px] font-bold">%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-stone-400 text-xs font-bold">{currency.symbol}</span>
                                  <input 
                                    type="number" 
                                    step="0.0001"
                                    value={mat.costPerUnit ?? 0}
                                    onChange={(e) => updateMaterial(mat.id, 'costPerUnit', parseFloat(e.target.value) || 0)}
                                    className="w-24 bg-stone-50/50 border border-stone-100 rounded-xl px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => deleteMaterial(mat.id)}
                                  className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {materials.filter(m => m.category === category).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-stone-400 font-serif italic">
                              No materials added to {category} yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Missing Categories Section */}
              {sortedRemainingInventory.filter(m => !categories.includes(m.category)).length > 0 && (
                <div className="space-y-6 mt-12">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-stone-800">Uncategorized Items</h2>
                      <p className="text-stone-500 text-sm font-serif italic">These items have categories that are not in your master list.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-stone-200/50 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
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
                              <span className="text-sm font-bold text-stone-700 font-serif">{mat.name}</span>
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
                  <h2 className="text-3xl font-serif font-bold text-stone-800">Menu & Recipes</h2>
                  <p className="text-stone-500 text-sm font-serif italic">Define how much of each material is used per item.</p>
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
                  <div key={item.id} className="bg-white rounded-3xl border border-stone-200/50 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div className="px-6 py-5 bg-stone-50/50 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <Utensils size={24} />
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={item.name || ''}
                            onChange={(e) => updateMenuItem(item.id, e.target.value)}
                            className="bg-transparent border-none focus:ring-0 font-serif font-bold text-stone-800 text-xl p-0 w-full"
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
                                    {margin.toFixed(0)}% Margin
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-2 shadow-sm">
                            <span className="text-stone-400 text-sm font-bold">{currency.symbol}</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.sellingPrice ?? 0}
                              onChange={(e) => updateMenuItemField(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                              className="w-20 bg-transparent border-none focus:ring-0 text-lg font-bold text-stone-700 p-0"
                              placeholder="Price"
                            />
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Sale</span>
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
                      <div className="flex items-center gap-2 border-l border-stone-200 pl-4 ml-4">
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
                          <div className="p-8 space-y-8 border-t border-stone-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100">
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
                              <div className="flex items-center gap-3">
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
                                      <div key={idx} className="group flex items-center gap-3 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm transition-all hover:border-primary/20">
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
                                          className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {item.recipe.filter(req => materials.find(m => m.id === req.materialId)?.category !== 'Packaging Materials').length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-3xl text-stone-400 text-[10px] uppercase font-bold tracking-widest bg-white/50">
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
                                      <div key={idx} className="group flex items-center gap-3 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm transition-all hover:border-primary/20">
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
                                          className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {item.recipe.filter(req => materials.find(m => m.id === req.materialId)?.category === 'Packaging Materials').length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-3xl text-stone-400 text-[10px] uppercase font-bold tracking-widest bg-white/50">
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
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-stone-800">Order History</h2>
                  <p className="text-stone-500 text-sm italic font-serif">Log items sold by date to calculate usage.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  <div className="flex items-center gap-2 bg-white border border-stone-200/50 rounded-2xl p-1.5 shadow-sm">
                    <button 
                      onClick={() => {
                        const d = new Date(orderDate);
                        d.setDate(d.getDate() - 1);
                        setOrderDate(d.toISOString().split('T')[0]);
                      }}
                      className="p-2 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3 px-3 border-x border-stone-100">
                      <Calendar size={16} className="text-primary" />
                      <input 
                        type="date" 
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-700 p-0 cursor-pointer"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const d = new Date(orderDate);
                        d.setDate(d.getDate() + 1);
                        setOrderDate(d.toISOString().split('T')[0]);
                      }}
                      className="p-2 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={resetOrders}
                      className="flex items-center gap-2 text-stone-500 hover:text-stone-800 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-stone-100"
                    >
                      <RotateCcw size={18} />
                      Today
                    </button>
                    <button 
                      onClick={saveDay}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg transform active:scale-95 ${
                        showSaveFeedback 
                          ? 'bg-emerald-500 text-white shadow-emerald-200' 
                          : 'bg-stone-800 hover:bg-stone-900 text-white shadow-stone-200'
                      }`}
                    >
                      {showSaveFeedback ? <CheckCircle2 size={18} /> : <Save size={18} />}
                      {showSaveFeedback ? 'Saved!' : 'Save Day'}
                    </button>
                  </div>

                  <div className="h-8 w-px bg-stone-200 hidden lg:block mx-2" />

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={addOrder}
                      className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
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
              </div>

              <div className="bg-white rounded-[2.5rem] border border-stone-200/50 shadow-sm overflow-hidden">
                <div className="p-8 space-y-4">
                  <div className="grid grid-cols-12 gap-4 px-4 pb-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    <div className="col-span-7">Item Sold</div>
                    <div className="col-span-3">Quantity</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <div className="space-y-3">
                    {orders.filter(o => o.date === orderDate).map((order) => (
                      <div key={order.id} className="grid grid-cols-12 items-center gap-4 p-4 bg-stone-50/50 rounded-2xl border border-stone-100 transition-all hover:border-primary/20 group">
                        <div className="col-span-7">
                          <select 
                            value={order.menuItemId || ''}
                            onChange={(e) => updateOrder(order.id, 'menuItemId', e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm transition-all"
                          >
                            <option value="" disabled>Select Menu Item</option>
                            {menu.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="number" 
                            value={order.quantity ?? 0}
                            min="1"
                            onChange={(e) => updateOrder(order.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm transition-all"
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          <button 
                            onClick={() => deleteOrder(order.id)}
                            className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {orders.filter(o => o.date === orderDate).length === 0 && (
                    <div className="text-center py-20 bg-stone-50/30 rounded-[2.5rem] border-2 border-dashed border-stone-100">
                      <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-stone-100 flex items-center justify-center mx-auto mb-6 text-stone-200">
                        <ClipboardList size={40} />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-stone-800 mb-2">No orders logged yet</h3>
                      <p className="text-stone-500 text-sm mb-8 italic font-serif">Start logging your sales for {new Date(orderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                      <button 
                        onClick={addOrder}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
                      >
                        <Plus size={18} />
                        Log First Sale
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

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
                  <h2 className="text-3xl font-serif font-bold text-stone-800">Settings</h2>
                  <p className="text-stone-500 text-sm italic font-serif">Manage your bakery profile, integrations, and preferences.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <select 
                      value={activeSettingsTab}
                      onChange={(e) => setActiveSettingsTab(e.target.value as any)}
                      className="appearance-none bg-white border border-stone-200 rounded-2xl px-6 py-3 pr-12 text-sm font-bold uppercase tracking-widest text-stone-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm cursor-pointer hover:border-primary/30"
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
                    className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/20 transform active:scale-95"
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
                  className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 shadow-sm"
                >
                  <CheckCircle2 size={20} />
                  <p className="text-sm font-bold uppercase tracking-widest">Settings saved successfully!</p>
                </motion.div>
              )}

              <div className="grid grid-cols-1 gap-8">
                {/* Bakery Settings Section */}
                {activeSettingsTab === 'bakery' && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Settings2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">Bakery Profile</h3>
                        <p className="text-[10px] text-stone-400 font-serif italic">Identity and contact information</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Bakery Name</label>
                        <input 
                          type="text" 
                          value={settings.name}
                          onChange={(e) => updateSettingsField('name', e.target.value)}
                          className="w-full bg-stone-50/50 border border-stone-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-serif text-lg"
                          placeholder="The Sourdough Loft"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <input 
                          type="text" 
                          value={settings.phone}
                          onChange={(e) => updateSettingsField('phone', e.target.value)}
                          className="w-full bg-stone-50/50 border border-stone-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-serif text-lg"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Address</label>
                        <input 
                          type="text" 
                          value={settings.address}
                          onChange={(e) => updateSettingsField('address', e.target.value)}
                          className="w-full bg-stone-50/50 border border-stone-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-serif text-lg"
                          placeholder="123 Flour St, Bread City"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Integrations Section */}
                {activeSettingsTab === 'integrations' && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Puzzle size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">Integrations</h3>
                        <p className="text-[10px] text-stone-400 font-serif italic">Connect your tools</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className={`p-6 rounded-3xl border transition-all duration-300 ${shopifyStatus.connected ? 'bg-emerald-50/30 border-emerald-100 shadow-sm shadow-emerald-500/5' : 'bg-stone-50/50 border-stone-100'}`}>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors duration-300 ${shopifyStatus.connected ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-stone-100 text-stone-600'}`}>
                              <Store size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-serif font-bold text-stone-800">Shopify Store</h4>
                                {shopifyStatus.connected && (
                                  <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/10">
                                    <Check size={10} />
                                    Connected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 font-serif italic mt-0.5">
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white border border-stone-200/60 rounded-2xl shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                <div className="col-span-full mb-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle size={14} className="text-primary" />
                                    <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">API Credentials Required</p>
                                  </div>
                                  <p className="text-[10px] text-stone-400 font-serif italic">Find these in your Shopify Partner Dashboard under App Setup.</p>
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
                              <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm flex-1 group focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
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
                                className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/20 transform active:scale-95 ${isConnectingShopify ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-100/50">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-800">Connection Active</p>
                              <p className="text-[10px] text-emerald-600/70 font-serif italic">Your orders are being synced automatically.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`p-6 rounded-3xl border transition-all duration-300 ${odooStatus.connected ? 'bg-emerald-50/30 border-emerald-100 shadow-sm shadow-emerald-500/5' : 'bg-stone-50/50 border-stone-100'}`}>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors duration-300 ${odooStatus.connected ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-stone-100 text-stone-600'}`}>
                              <Database size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-serif font-bold text-stone-800">Odoo eCommerce</h4>
                                {odooStatus.connected && (
                                  <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/10">
                                    <Check size={10} />
                                    Connected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 font-serif italic mt-0.5">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white border border-stone-200/60 rounded-2xl shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                              <div className="col-span-full mb-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertCircle size={14} className="text-primary" />
                                  <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">Odoo API Credentials</p>
                                </div>
                                <p className="text-[10px] text-stone-400 font-serif italic">Enter your Odoo instance details to sync orders.</p>
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
                              className={`w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-stone-200 transform active:scale-95 ${isConnectingOdoo ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-100/50">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-800">Connection Active</p>
                              <p className="text-[10px] text-emerald-600/70 font-serif italic">Your Odoo orders are ready to be synced.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-5 bg-amber-50/30 rounded-2xl border border-amber-100/50 space-y-3">
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertCircle size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Setup Instructions</span>
                        </div>
                        <p className="text-[10px] text-amber-800/70 leading-relaxed font-serif italic">
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
                  <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Palette size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">App Customisation</h3>
                        <p className="text-[10px] text-stone-400 font-serif italic">Personalise your workspace</p>
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
                          <div className="w-24 h-24 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center overflow-hidden shadow-inner">
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
                            <p className="text-[10px] text-stone-400 font-serif italic">Recommended: Square SVG or PNG</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Account Section */}
                {activeSettingsTab === 'account' && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <UserCog size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">User Account</h3>
                        <p className="text-[10px] text-stone-400 font-serif italic">Manage your profile and access</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center text-center space-y-6 py-4">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-md">
                        <UserIcon size={48} />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800 font-serif text-2xl">{user?.name}</h4>
                        <p className="text-sm text-stone-500 font-serif italic">{user?.email}</p>
                      </div>
                      <div className="bg-primary/10 text-primary px-6 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        Master Baker
                      </div>
                      
                      <div className="w-full max-w-md pt-6 border-t border-stone-100 space-y-4">
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm shadow-rose-500/5"
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
                  <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200/50 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Layers size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 uppercase tracking-widest text-[10px]">Inventory Categories</h3>
                        <p className="text-[10px] text-stone-400 font-serif italic">Organize your materials by category</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-sm font-serif text-stone-800 italic">Add or remove categories to better organize your inventory.</p>
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
                          <div key={cat} className="flex items-center gap-3 bg-stone-50 px-5 py-3 rounded-2xl border border-stone-200 group transition-all hover:border-primary/30 hover:bg-white hover:shadow-sm">
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
          {/* Experiments Tab */}
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
                  <h2 className="text-3xl font-serif font-bold text-stone-800">Recipe Experiments</h2>
                  <p className="text-stone-500 text-sm italic font-serif">Log your daily experiments and track material usage.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  <div className="flex items-center gap-2 bg-white border border-stone-200/50 rounded-2xl p-1.5 shadow-sm">
                    <button 
                      onClick={() => {
                        const d = new Date(orderDate);
                        d.setDate(d.getDate() - 1);
                        setOrderDate(d.toISOString().split('T')[0]);
                      }}
                      className="p-2 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3 px-3 border-x border-stone-100">
                      <Calendar size={16} className="text-primary" />
                      <input 
                        type="date" 
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-700 p-0 cursor-pointer"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const d = new Date(orderDate);
                        d.setDate(d.getDate() + 1);
                        setOrderDate(d.toISOString().split('T')[0]);
                      }}
                      className="p-2 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={addExperiment}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
                  >
                    <Plus size={18} />
                    New Experiment
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {experiments.filter(e => e.date === orderDate).map((exp) => (
                  <div key={exp.id} className="bg-white rounded-[2.5rem] border border-stone-200/50 shadow-sm overflow-hidden p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 max-w-md">
                        <input 
                          type="text" 
                          value={exp.name}
                          onChange={(e) => updateExperiment(exp.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-2xl font-serif font-bold text-stone-800 p-0"
                          placeholder="Experiment Name"
                        />
                        <textarea 
                          value={exp.notes || ''}
                          onChange={(e) => updateExperiment(exp.id, 'notes', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm text-stone-500 italic font-serif p-0 mt-1 resize-none h-12"
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
                            <div key={idx} className="flex items-center gap-3 bg-stone-50/50 p-4 rounded-2xl border border-stone-100 group">
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
                                className="text-stone-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100"
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
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-stone-100">
                    <div className="w-20 h-20 bg-stone-50 rounded-3xl shadow-sm border border-stone-100 flex items-center justify-center mx-auto mb-6 text-stone-200">
                      <FlaskConical size={40} />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-stone-800 mb-2">No experiments logged for this day</h3>
                    <p className="text-stone-500 text-sm mb-8 italic font-serif">Track your R&D and recipe testing costs.</p>
                    <button 
                      onClick={addExperiment}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 transform active:scale-95"
                    >
                      <Plus size={18} />
                      Log First Experiment
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
                  <h2 className="text-3xl font-serif font-bold text-stone-800">Performance Summary</h2>
                  <p className="text-stone-500 text-sm italic font-serif">Financials and inventory usage for the selected period.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 bg-stone-100/50 p-1 rounded-2xl border border-stone-200/50">
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

              {summaryRange !== 'custom' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-stone-200/50 shadow-sm">
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
                  className="flex items-center gap-6 bg-white p-5 rounded-[2rem] border border-stone-200/50 shadow-sm"
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
              <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200/50 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-stone-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-600">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-stone-800">Financial Trends</h3>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mt-0.5">Revenue vs Expenses vs Profitability</p>
                    </div>
                  </div>
                </div>

                <div className="h-[350px] w-full">
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm group hover:shadow-md transition-all">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Total Income</div>
                  <div className="text-4xl font-serif font-bold text-emerald-600">{currency.symbol}{financials.income}</div>
                  <div className="text-[10px] text-stone-400 mt-2 uppercase font-bold tracking-wider">From {filteredOrders.reduce((acc, o) => acc + o.quantity, 0)} items sold</div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm group hover:shadow-md transition-all">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Total Expenses</div>
                  <div className="text-4xl font-serif font-bold text-rose-600">{currency.symbol}{financials.expenses}</div>
                  <div className="text-[10px] text-stone-400 mt-2 uppercase font-bold tracking-wider">
                    {currency.symbol}{financials.orderExpenses} Orders + {currency.symbol}{financials.experimentExpenses} Experiments
                  </div>
                </div>
                <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/20 shadow-lg shadow-primary/5 group hover:shadow-primary/10 transition-all">
                  <div className="text-primary/60 text-[10px] font-bold uppercase tracking-widest mb-3">Net Profit</div>
                  <div className="text-4xl font-serif font-bold text-primary">{currency.symbol}{financials.profit}</div>
                  <div className="text-[10px] text-primary/40 mt-2 uppercase font-bold tracking-wider">
                    {financials.income > 0 ? `${((financials.profit / financials.income) * 100).toFixed(1)}% margin` : 'No sales yet'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Orders in Period</div>
                  <div className="text-4xl font-serif font-bold text-stone-800">{filteredOrders.reduce((acc, o) => acc + o.quantity, 0)}</div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Items on Menu</div>
                  <div className="text-4xl font-serif font-bold text-stone-800">{menu.length}</div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm">
                  <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">Dates with Data</div>
                  <div className="text-4xl font-serif font-bold text-stone-800">
                    {[...new Set(orders.map(o => o.date))].length}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-stone-200/50 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
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
                                  <div className="font-serif font-bold text-stone-800">{item.name}</div>
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
              <div className="text-xs font-medium text-stone-600">Firebase Cloud Firestore</div>
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

      {/* Voice Assistant Floating Button */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
        <AnimatePresence>
          {isVoiceActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xl max-w-xs w-72"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  voiceStatus === 'listening' ? 'bg-rose-500 animate-pulse' :
                  voiceStatus === 'processing' ? 'bg-primary animate-spin' :
                  voiceStatus === 'success' ? 'bg-emerald-500' :
                  'bg-stone-300'
                }`} />
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  {voiceStatus === 'listening' ? 'Listening...' :
                   voiceStatus === 'processing' ? 'Processing...' :
                   voiceStatus === 'success' ? 'Done!' :
                   voiceStatus === 'error' ? 'Error' : 'Voice Assistant'}
                </span>
              </div>
              <p className="text-sm font-serif italic text-stone-600 leading-relaxed">
                {voiceMessage || 'Try saying "Add 5 croissants to today\'s orders" or "Record an experiment for Sourdough"'}
              </p>
              {voiceStatus === 'processing' && (
                <div className="mt-4 flex justify-center">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={startListening}
          disabled={voiceStatus === 'processing'}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${
            voiceStatus === 'listening' 
              ? 'bg-rose-500 text-white animate-pulse' 
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          {voiceStatus === 'listening' ? <MicOff size={24} /> : <Mic size={24} />}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
        </button>
      </div>

      {/* Custom Modal */}
      <AnimatePresence>
        {modalConfig.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-stone-200 w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${
                  modalConfig.type === 'confirm' ? 'bg-rose-50 text-rose-500' : 'bg-primary/10 text-primary'
                }`}>
                  {modalConfig.type === 'confirm' ? <AlertCircle size={32} /> : <CheckCircle2 size={32} />}
                </div>
                <h3 className="text-lg font-bold text-stone-800 mb-2">{modalConfig.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed font-serif italic">{modalConfig.message}</p>
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
    </div>
  );
}
