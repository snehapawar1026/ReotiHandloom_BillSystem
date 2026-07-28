import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Layers, 
  TrendingUp, 
  Settings, 
  Sun, 
  Moon, 
  History, 
  FileText,
  ArrowLeft,
  BookOpen
} from 'lucide-react';

import { 
  INITIAL_PRODUCTS, 
  DEFAULT_SETTINGS, 
  INITIAL_INVOICES 
} from './constants';

import { 
  generateInvoiceNum 
} from './utils';

// Import subcomponents
import PosConsole from './components/PosConsole';
import InvoiceList from './components/InvoiceList';
import InventoryManager from './components/InventoryManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SettingsPanel from './components/SettingsPanel';
import PrintInvoiceModal from './components/PrintInvoiceModal';
import PartyLedgerConsole from './components/PartyLedgerConsole';

import './App.css';

export default function App() {
  // 1. Core database states synced with localStorage and SQLite DB API
  const [systemMode, setSystemMode] = useState(() => {
    return localStorage.getItem('rh_system_mode') || null;
  });

  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [dbStatus, setDbStatus] = useState('Connecting...');


  // UI management states
  const [activeTab, setActiveTab] = useState('pos');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('rh_theme');
    return saved || 'dark';
  });

  // Invoice creator form state
  const [currentInvoice, setCurrentInvoice] = useState(null);
  
  // Invoice selected for displaying printing template
  const [invoiceToView, setInvoiceToView] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 2. Load and Sync states with Backend Database & localStorage when systemMode changes
  useEffect(() => {
    if (systemMode) {
      localStorage.setItem('rh_system_mode', systemMode);
    } else {
      localStorage.removeItem('rh_system_mode');
      return;
    }

    // Load initial fallback from localStorage
    const getSettingsKey = (mode) => {
      if (mode === 'reoti') return 'rh_settings';
      if (mode === 'reoti_cn') return 'rh_cn_settings';
      if (mode === 'ambekar_pn') return 'ah_pn_settings';
      return 'ah_settings';
    };

    const savedSettingsStr = localStorage.getItem(getSettingsKey(systemMode));
    let loadedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : (systemMode === 'reoti' ? DEFAULT_SETTINGS : (systemMode === 'reoti_cn' ? {
      ...DEFAULT_SETTINGS,
      invoicePrefix: 'RH-CN-2026-',
      startingInvoiceNo: 1
    } : (systemMode === 'ambekar_pn' ? {
      ...DEFAULT_SETTINGS,
      shopName: 'Ambekar Handloom House',
      shopGSTIN: '',
      invoicePrefix: 'AH-PN-2026-',
      startingInvoiceNo: 1,
      bankName: 'HDFC Bank',
      bankAccountNo: '50100394215668',
      bankIFSC: 'HDFC0002116',
      bankBranch: 'Maheshwar',
      accountHolderName: 'Shivam Ambekar',
      termsConditions: '1. Goods once purchased cannot be returned without prior inspection.\n2. All disputes are subject to Maheshwar jurisdiction.'
    } : {
      ...DEFAULT_SETTINGS,
      shopName: 'Ambekar Handloom House',
      shopGSTIN: '',
      invoicePrefix: 'AH-2026-',
      startingInvoiceNo: 73,
      bankName: 'HDFC Bank',
      bankAccountNo: '50100394215668',
      bankIFSC: 'HDFC0002116',
      bankBranch: 'Maheshwar',
      accountHolderName: 'Shivam Ambekar',
      termsConditions: '1. Goods once sold cannot be taken back.\n2. All disputes are subject to Maheshwar jurisdiction.'
    })));

    if (systemMode === 'reoti' || systemMode === 'reoti_cn') {
      loadedSettings = {
        ...loadedSettings,
        accountHolderName: 'Reoti Handloom',
        bankName: 'HDFC',
        bankAccountNo: '99954444444445',
        bankIFSC: 'HDFC0002089',
        bankBranch: 'Maheshwar Branch'
      };
    }

    if (systemMode === 'ambekar' || systemMode === 'ambekar_pn') {
      loadedSettings = { ...loadedSettings, shopGSTIN: '' };
      if (systemMode === 'ambekar_pn' && (!loadedSettings.invoicePrefix || loadedSettings.invoicePrefix === 'RH-2026-')) {
        loadedSettings = { ...loadedSettings, startingInvoiceNo: 1, invoicePrefix: 'AH-PN-2026-' };
      } else if (systemMode === 'ambekar' && (!loadedSettings.startingInvoiceNo || loadedSettings.startingInvoiceNo === 293)) {
        loadedSettings = { ...loadedSettings, startingInvoiceNo: 73, invoicePrefix: 'AH-2026-' };
      }
      if (!loadedSettings.shopName || loadedSettings.shopName === 'Ambekar Handloom') {
        loadedSettings = { ...loadedSettings, shopName: 'Ambekar Handloom House' };
      }
      if (loadedSettings.bankAccountNo === '99954444444445' || !loadedSettings.bankAccountNo || loadedSettings.accountHolderName.includes('Saving')) {
        loadedSettings = {
          ...loadedSettings,
          bankName: 'HDFC Bank',
          bankAccountNo: '50100394215668',
          bankIFSC: 'HDFC0002116',
          bankBranch: 'Maheshwar',
          accountHolderName: 'Shivam Ambekar'
        };
      }
    }

    // Products catalog: reoti_cn shares inventory with reoti, ambekar_pn shares inventory with ambekar
    const getProductsKey = (mode) => ((mode === 'ambekar' || mode === 'ambekar_pn') ? 'ah_products' : 'rh_products');
    const savedProductsStr = localStorage.getItem(getProductsKey(systemMode));
    let loadedProducts = savedProductsStr ? JSON.parse(savedProductsStr) : INITIAL_PRODUCTS;

    const getInvoicesKey = (mode) => {
      if (mode === 'reoti') return 'rh_invoices';
      if (mode === 'reoti_cn') return 'rh_cn_invoices';
      if (mode === 'ambekar_pn') return 'ah_pn_invoices';
      return 'ah_invoices';
    };
    const savedInvoicesStr = localStorage.getItem(getInvoicesKey(systemMode));
    let loadedInvoices = savedInvoicesStr ? JSON.parse(savedInvoicesStr) : [];
    loadedInvoices = loadedInvoices.filter(inv => !['RH-2026-0001', 'RH-2026-0002', 'RH-2026-0003'].includes(inv.invoiceNo));

    const getLedgerKey = (mode) => `rh_ledger_${mode}`;
    const savedLedgerStr = localStorage.getItem(getLedgerKey(systemMode));
    let loadedLedger = savedLedgerStr ? JSON.parse(savedLedgerStr) : [];

    const jayshreeDefaults = [
      { id: 'ledg_jayshree_1', partyName: 'Jayshree', date: '2025-01-14', vchType: 'Payment', vchNo: '233', particulars: 'SBI - CC-42476655602', debit: 241427, credit: 0, drCr: 'Dr' },
      { id: 'ledg_jayshree_2', partyName: 'Jayshree', date: '2025-02-03', vchType: 'Payment', vchNo: '234', particulars: 'SBI - CC-42476655602', debit: 290877, credit: 0, drCr: 'Dr' },
      { id: 'ledg_jayshree_3', partyName: 'Jayshree', date: '2025-04-17', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 50000, drCr: 'Cr' },
      { id: 'ledg_jayshree_4', partyName: 'Jayshree', date: '2025-04-19', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 100000, drCr: 'Cr' },
      { id: 'ledg_jayshree_5', partyName: 'Jayshree', date: '2025-06-16', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 50000, drCr: 'Cr' },
      { id: 'ledg_jayshree_6', partyName: 'Jayshree', date: '2025-07-15', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 41427, drCr: 'Cr' },
      { id: 'ledg_jayshree_7', partyName: 'Jayshree', date: '2025-08-26', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 90000, drCr: 'Cr' },
      { id: 'ledg_jayshree_8', partyName: 'Jayshree', date: '2025-10-14', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 100000, drCr: 'Cr' },
      { id: 'ledg_jayshree_9', partyName: 'Jayshree', date: '2025-10-22', vchType: 'Payment', vchNo: '258', particulars: 'SBI - CC-42476655602', debit: 137037, credit: 0, drCr: 'Dr' },
      { id: 'ledg_jayshree_10', partyName: 'Jayshree', date: '2025-11-01', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 50000, drCr: 'Cr' },
      { id: 'ledg_jayshree_11', partyName: 'Jayshree', date: '2025-11-10', vchType: 'Payment', vchNo: '261', particulars: 'SBI - CC-42476655602', debit: 176077, credit: 0, drCr: 'Dr' },
      { id: 'ledg_jayshree_12', partyName: 'Jayshree', date: '2025-11-22', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 50000, drCr: 'Cr' },
      { id: 'ledg_jayshree_13', partyName: 'Jayshree', date: '2025-12-30', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 50000, drCr: 'Cr' },
      { id: 'ledg_jayshree_14', partyName: 'Jayshree', date: '2026-02-10', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 50000, drCr: 'Cr' },
      { id: 'ledg_jayshree_15', partyName: 'Jayshree', date: '2026-03-28', vchType: 'Payment', vchNo: '', particulars: 'SBI - CC-42476655602', debit: 0, credit: 120000, drCr: 'Cr' }
    ];

    const mergeJayshree = (list) => {
      const map = new Map();
      if (systemMode === 'reoti') {
        jayshreeDefaults.forEach(item => map.set(item.id, item));
      }
      (list || []).forEach(item => map.set(item.id, item));
      return Array.from(map.values());
    };

    const finalLoadedLedger = mergeJayshree(loadedLedger);

    setSettings(loadedSettings);
    setInventory(loadedProducts);
    setInvoices(loadedInvoices);
    setLedgerEntries(finalLoadedLedger);

    // Fetch live data from backend database API
    setDbStatus('Syncing with DB...');
    fetch(`/api/data?mode=${systemMode}`)
      .then(res => res.json())
      .then(data => {
        const rawDbInvoices = (data.invoices || []).filter(inv => !['RH-2026-0001', 'RH-2026-0002', 'RH-2026-0003'].includes(inv.invoiceNo));
        const dbInvoices = rawDbInvoices.length > 0 ? rawDbInvoices : loadedInvoices;
        const dbInventory = data.inventory && data.inventory.length > 0 ? data.inventory : loadedProducts;
        let dbSettings = data.settings || loadedSettings;
        if ((systemMode === 'ambekar' || systemMode === 'ambekar_pn') && (!dbSettings.shopName || dbSettings.shopName === 'Ambekar Handloom')) {
          dbSettings = { ...dbSettings, shopName: 'Ambekar Handloom House' };
        }

        const rawDbLedger = data.ledgerEntries && data.ledgerEntries.length > 0 ? data.ledgerEntries : finalLoadedLedger;
        const finalDbLedger = mergeJayshree(rawDbLedger);

        setInvoices(dbInvoices);
        setInventory(dbInventory);
        setSettings(dbSettings);
        setLedgerEntries(finalDbLedger);
        setDbStatus('🟢 MySQL/SQLite Database Synced');




        // Seed backend DB if backend DB has 0 invoices
        if ((!data.invoices || data.invoices.length === 0) && dbInvoices.length > 0) {
          fetch('/api/sync-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: systemMode, invoices: dbInvoices, inventory: dbInventory, settings: dbSettings })
          }).catch(console.error);
        }
      })
      .catch(err => {
        console.warn('Backend API offline, fallback to localStorage:', err);
        setDbStatus('🟠 Offline Mode (localStorage)');
      });

    setCurrentInvoice(null);
  }, [systemMode]);

  // 3. Sync states back to active localStorage keys as double-backup
  useEffect(() => {
    if (!systemMode) return;
    const invKey = systemMode === 'reoti' ? 'rh_invoices' : (systemMode === 'reoti_cn' ? 'rh_cn_invoices' : (systemMode === 'ambekar_pn' ? 'ah_pn_invoices' : 'ah_invoices'));
    localStorage.setItem(invKey, JSON.stringify(invoices));
  }, [invoices, systemMode]);

  useEffect(() => {
    if (!systemMode) return;
    const prodKey = (systemMode === 'ambekar' || systemMode === 'ambekar_pn') ? 'ah_products' : 'rh_products';
    localStorage.setItem(prodKey, JSON.stringify(inventory));
  }, [inventory, systemMode]);

  useEffect(() => {
    if (!systemMode) return;
    const setKey = systemMode === 'reoti' ? 'rh_settings' : (systemMode === 'reoti_cn' ? 'rh_cn_settings' : (systemMode === 'ambekar_pn' ? 'ah_pn_settings' : 'ah_settings'));
    localStorage.setItem(setKey, JSON.stringify(settings));
  }, [settings, systemMode]);

  useEffect(() => {
    if (!systemMode) return;
    const ledgerKey = `rh_ledger_${systemMode}`;
    localStorage.setItem(ledgerKey, JSON.stringify(ledgerEntries));
  }, [ledgerEntries, systemMode]);

  useEffect(() => {
    localStorage.setItem('rh_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


  // 4. Initialize and Auto-Increment current invoice details
  const handleCreateNewBlankInvoice = (customInvoices = null, customSettings = null, preserveFormDetails = false) => {
    const list = customInvoices || invoices;
    const sett = customSettings || settings;
    const defaultPrefix = systemMode === 'ambekar_pn' ? 'AH-PN-2026-' : (systemMode === 'ambekar' ? 'AH-2026-' : (systemMode === 'reoti_cn' ? 'RH-CN-2026-' : 'RH-2026-'));
    const defaultStartNo = systemMode === 'ambekar_pn' ? 1 : (systemMode === 'ambekar' ? 73 : (systemMode === 'reoti_cn' ? 1 : 293));
    const prefix = sett?.invoicePrefix || defaultPrefix;
    const startNo = sett?.startingInvoiceNo || defaultStartNo;

    const today = new Date().toISOString().split('T')[0];
    const nextNo = generateInvoiceNum(prefix, list, startNo);

    if (preserveFormDetails && currentInvoice) {
      setCurrentInvoice(prev => ({
        ...prev,
        invoiceNo: nextNo
      }));
    } else {
      setCurrentInvoice({
        invoiceNo: nextNo,
        date: today,
        isCreditNote: systemMode === 'reoti_cn',
        isPurchaseNote: systemMode === 'ambekar_pn',
        originalInvoiceNo: '',
        originalInvoiceDate: '',
        reasonForCN: 'Sales Return',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        customerGSTIN: '',
        items: [],
        courierCharges: 0,
        invoiceGstRate: 5,
        paymentMode: 'Cash',
        paymentStatus: 'Paid',
        remarks: '',
        isInterState: false,
        isEditing: false,
        bankDetails: `${sett?.bankName || ''}, A/C: ${sett?.bankAccountNo || ''}, IFSC: ${sett?.bankIFSC || ''}`
      });
    }
  };

  useEffect(() => {
    if (!systemMode || !settings) return;

    // Check if user is currently creating a new bill (not editing an existing saved bill)
    if (!currentInvoice || !currentInvoice.isEditing) {
      const hasUserData = currentInvoice && (
        (Array.isArray(currentInvoice.items) && currentInvoice.items.length > 0) ||
        (currentInvoice.customerName && currentInvoice.customerName.trim() !== '')
      );
      handleCreateNewBlankInvoice(invoices, settings, hasUserData);
    }
  }, [systemMode, invoices, settings]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // 4. Save/Commit invoice handler with Database Persistence
  const handleSaveInvoice = (savedInvoice, shouldPrintImmediate = false) => {
    const exists = invoices.some(inv => inv.invoiceNo === savedInvoice.invoiceNo);
    
    let updatedInvoices;
    if (exists) {
      updatedInvoices = invoices.map(inv => 
        inv.invoiceNo === savedInvoice.invoiceNo ? savedInvoice : inv
      );
    } else {
      updatedInvoices = [savedInvoice, ...invoices];
    }

    // Restock items if Credit Note or Purchase Note, or deduct stock if Tax/Retail Invoice
    const isCN = savedInvoice.isCreditNote || systemMode === 'reoti_cn';
    const isPN = savedInvoice.isPurchaseNote || systemMode === 'ambekar_pn';
    const updatedInventory = inventory.map(product => {
      const itemLine = savedInvoice.items.find(it => it.productId === product.id);
      if (itemLine) {
        const qtyVal = parseFloat(itemLine.qty) || 0;
        return {
          ...product,
          stock: (isCN || isPN) ? product.stock + qtyVal : Math.max(0, product.stock - qtyVal)
        };
      }
      return product;
    });

    setInvoices(updatedInvoices);
    setInventory(updatedInventory);

    // Save to Database via Backend API
    fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: systemMode, invoice: savedInvoice })
    }).then(() => {
      // Sync shared product inventory
      const prodMode = (systemMode === 'ambekar' || systemMode === 'ambekar_pn') ? 'ambekar' : 'reoti';
      fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: prodMode, inventory: updatedInventory })
      });
      setDbStatus('🟢 MySQL/SQLite Database Synced');
    }).catch(err => {
      console.error('Failed to sync invoice with backend DB:', err);
    });

    if (shouldPrintImmediate) {
      setInvoiceToView(savedInvoice);
      setIsPrintModalOpen(true);
    } else {
      const docLabel = isPN ? 'Purchase Note' : (isCN ? 'Credit Note' : 'Bill');
      alert(`${docLabel} #${savedInvoice.invoiceNo} saved permanently to Database & Ledger!`);
    }

    handleCreateNewBlankInvoice(updatedInvoices, settings, false);
  };

  const handleClearInvoice = () => {
    if (window.confirm("Are you sure you want to clear this active billing sheet?")) {
      handleCreateNewBlankInvoice(invoices, settings, false);
    }
  };

  const handleDeleteInvoice = (invoiceNo) => {
    const updated = invoices.filter(inv => inv.invoiceNo !== invoiceNo);
    setInvoices(updated);

    fetch('/api/invoices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: systemMode, invoiceNo })
    }).catch(console.error);

    if (!currentInvoice || !currentInvoice.isEditing) {
      handleCreateNewBlankInvoice(updated, settings, false);
    }
  };

  const handleEditInvoice = (invoice) => {
    setCurrentInvoice({ ...invoice, isEditing: true });
    setActiveTab('pos');
  };

  // 5. Settings Save handler
  const handleSaveSettings = (updatedSettings) => {
    setSettings(updatedSettings);

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: systemMode, settings: updatedSettings })
    }).catch(console.error);

    handleCreateNewBlankInvoice(invoices, updatedSettings, false);
  };

  // 6. Products DB modifications
  const syncInventoryToDb = (newInv) => {
    const prodMode = systemMode === 'ambekar' ? 'ambekar' : 'reoti';
    fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: prodMode, inventory: newInv })
    }).catch(console.error);
  };

  const handleAddProduct = (newProd) => {
    setInventory(prev => {
      const updated = [newProd, ...prev];
      syncInventoryToDb(updated);
      return updated;
    });
  };

  const handleUpdateProduct = (id, updatedProd) => {
    setInventory(prev => {
      const updated = prev.map(p => p.id === id ? updatedProd : p);
      syncInventoryToDb(updated);
      return updated;
    });
  };

  const handleDeleteProduct = (id) => {
    setInventory(prev => {
      const updated = prev.filter(p => p.id !== id);
      syncInventoryToDb(updated);
      return updated;
    });
  };

  // Ledger Voucher handlers
  const handleSaveLedgerEntry = (newEntry) => {
    setLedgerEntries(prev => {
      const updated = [newEntry, ...prev.filter(e => e.id !== newEntry.id)];
      const ledgerKey = `rh_ledger_${systemMode}`;
      localStorage.setItem(ledgerKey, JSON.stringify(updated));
      return updated;
    });

    fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: systemMode, entry: newEntry })
    }).then(() => {
      setDbStatus('🟢 MySQL/SQLite Database Synced');
      alert(`✅ Ledger Voucher for "${newEntry.partyName}" saved permanently to Database & Ledger!`);
    }).catch(err => {
      console.error('Ledger sync error:', err);
    });
  };

  const handleDeleteLedgerEntry = (id) => {
    setLedgerEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      const ledgerKey = `rh_ledger_${systemMode}`;
      localStorage.setItem(ledgerKey, JSON.stringify(updated));
      return updated;
    });

    fetch('/api/ledger', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: systemMode, id })
    }).then(() => {
      setDbStatus('🟢 MySQL/SQLite Database Synced');
      alert("✅ Voucher deleted from Database.");
    }).catch(console.error);
  };


  if (!systemMode) {

    return (
      <div className="home-container d-flex flex-column align-center justify-center w-full" style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        padding: '60px 20px',
        fontFamily: 'var(--font-ui)',
        boxSizing: 'border-box'
      }}>
        <div className="text-center mb-5" style={{ maxWidth: '850px' }}>
          <h1 className="brand-heading text-gold mb-2" style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--accent-gold)' }}>
            Handloom Billing Console
          </h1>
          <p className="text-muted" style={{ fontSize: '1.15rem' }}>
            Welcome to the unified handloom digital ledger management system. Select a console below to begin billing or credit note operations.
          </p>
        </div>

        <div className="d-flex gap-4 flex-wrap justify-center w-full" style={{ maxWidth: '1280px', marginTop: '20px' }}>
          {/* Card 1: Reoti Handloom (Tax Invoice) */}
          <div 
            className="glass-card d-flex flex-column align-center justify-between" 
            style={{
              width: '275px',
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-sidebar)',
              boxShadow: 'var(--shadow-md)',
              transition: 'all 0.3s ease',
              minHeight: '440px',
              boxSizing: 'border-box'
            }} 
            onClick={() => setSystemMode('reoti')}
          >
            <div className="d-flex flex-column align-center">
              <img src="/logo.jpg" alt="Reoti Handloom" style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--accent-gold)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                marginBottom: '16px'
              }} />
              <h2 className="brand-heading text-gold mb-2" style={{ fontSize: '1.45rem', color: 'var(--accent-gold)' }}>Reoti Handloom</h2>
              <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(217, 119, 6, 0.15)', color: 'var(--accent-gold)', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                GST REGISTERED
              </span>
              <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: '1.4', marginTop: '14px' }}>
                Complete POS ledger with automated tax calculations (CGST/SGST @ 2.5%, IGST @ 5%), invoice generation, and tax breakdown table.
              </p>
            </div>
            <button className="btn btn-primary w-full mt-4" style={{ padding: '12px', fontWeight: '600' }}>
              Launch Reoti Billing
            </button>
          </div>

          {/* Card 2: Reoti Credit Note Console */}
          <div 
            className="glass-card d-flex flex-column align-center justify-between" 
            style={{
              width: '275px',
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-sidebar)',
              boxShadow: '0 4px 20px rgba(239,68,68,0.15)',
              transition: 'all 0.3s ease',
              minHeight: '440px',
              boxSizing: 'border-box'
            }} 
            onClick={() => setSystemMode('reoti_cn')}
          >
            <div className="d-flex flex-column align-center">
              <div style={{ position: 'relative' }}>
                <img src="/logo.jpg" alt="Reoti Credit Note" style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #ef4444',
                  boxShadow: '0 4px 15px rgba(239,68,68,0.2)',
                  marginBottom: '16px'
                }} />
                <span style={{
                  position: 'absolute',
                  bottom: '18px',
                  right: '0',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>
                  CN
                </span>
              </div>
              <h2 className="brand-heading text-gold mb-2" style={{ fontSize: '1.45rem', color: '#f87171' }}>Reoti Credit Note</h2>
              <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                GST REGISTERED - CREDIT NOTE
              </span>
              <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: '1.4', marginTop: '14px' }}>
                Complete POS ledger for Credit Notes with automated tax calculations (CGST/SGST @ 2.5%, IGST @ 5%), original invoice reference, and tax breakdown table.
              </p>
            </div>
            <button className="btn btn-rose w-full mt-4" style={{ padding: '12px', fontWeight: '600', backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
              Launch Credit Note Console
            </button>
          </div>

          {/* Card 3: Ambekar Handloom Billing */}
          <div 
            className="glass-card d-flex flex-column align-center justify-between" 
            style={{
              width: '275px',
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-sidebar)',
              boxShadow: 'var(--shadow-md)',
              transition: 'all 0.3s ease',
              minHeight: '440px',
              boxSizing: 'border-box'
            }} 
            onClick={() => setSystemMode('ambekar')}
          >
            <div className="d-flex flex-column align-center">
              <img src="/logo_ambekar.jpg" alt="Ambekar Handloom House" style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #b45309',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                marginBottom: '16px'
              }} />
              <h2 className="brand-heading text-gold mb-2" style={{ fontSize: '1.45rem', color: '#b45309' }}>Ambekar Handloom House</h2>
              <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#dc2626', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                WITHOUT GST - SALES BILL
              </span>
              <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: '1.4', marginTop: '14px' }}>
                Retail billing system without tax computations. Generates retail invoices directly with pre-tax subtotals, custom items, and ledger logs.
              </p>
            </div>
            <button className="btn btn-primary w-full mt-4" style={{ padding: '12px', backgroundColor: '#b45309', borderColor: '#b45309', color: '#fff', fontWeight: '600' }}>
              Launch Ambekar Billing
            </button>
          </div>

          {/* Card 4: Ambekar Purchase Note (Without GST) */}
          <div 
            className="glass-card d-flex flex-column align-center justify-between" 
            style={{
              width: '275px',
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid #8b5cf6',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-sidebar)',
              boxShadow: '0 4px 20px rgba(139,92,246,0.15)',
              transition: 'all 0.3s ease',
              minHeight: '440px',
              boxSizing: 'border-box'
            }} 
            onClick={() => setSystemMode('ambekar_pn')}
          >
            <div className="d-flex flex-column align-center">
              <div style={{ position: 'relative' }}>
                <img src="/logo_ambekar.jpg" alt="Ambekar Purchase Note" style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #8b5cf6',
                  boxShadow: '0 4px 15px rgba(139,92,246,0.25)',
                  marginBottom: '16px'
                }} />
                <span style={{
                  position: 'absolute',
                  bottom: '18px',
                  right: '0',
                  backgroundColor: '#8b5cf6',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>
                  PN
                </span>
              </div>
              <h2 className="brand-heading text-gold mb-2" style={{ fontSize: '1.45rem', color: '#a855f7' }}>Ambekar Purchase Note</h2>
              <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                WITHOUT GST - PURCHASE NOTE
              </span>
              <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: '1.4', marginTop: '14px' }}>
                Record inward purchases from weavers and suppliers, auto-add stock to inventory, and issue purchase notes / vouchers (खरीद नोट).
              </p>
            </div>
            <button className="btn w-full mt-4" style={{ padding: '12px', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', color: '#fff', fontWeight: '600' }}>
              Launch Purchase Note Console
            </button>
          </div>
        </div>

        <div className="text-muted mt-5" style={{ fontSize: '0.9rem' }}>
          Crafted with care for Maheshwar handloom weavers. © 2026.
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* Sidebar Controls Panel */}
      <aside className="sidebar no-print">
        <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => setSystemMode(null)}>
          <img src={(systemMode === 'ambekar' || systemMode === 'ambekar_pn') ? '/logo_ambekar.jpg' : '/logo.jpg'} alt="Store Logo" style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            objectFit: 'cover',
            border: systemMode === 'reoti_cn' ? '2px solid #ef4444' : (systemMode === 'ambekar_pn' ? '2px solid #8b5cf6' : 'none')
          }} />
          <div>
            <h1 className="brand-heading" style={{ fontSize: '1.2rem', lineHeight: '1.1' }}>
              {(systemMode === 'ambekar' || systemMode === 'ambekar_pn') ? 'अम्बेकर' : 'रेवती'}
            </h1>
            <span style={{ fontSize: '0.7rem', color: systemMode === 'reoti_cn' ? '#f87171' : (systemMode === 'ambekar_pn' ? '#a855f7' : 'var(--text-muted)'), letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: (systemMode === 'reoti_cn' || systemMode === 'ambekar_pn') ? 'bold' : 'normal' }}>
              {systemMode === 'reoti' ? 'Reoti Handloom' : (systemMode === 'reoti_cn' ? 'Reoti Credit Note' : (systemMode === 'ambekar_pn' ? 'Ambekar Purchase Note' : 'Ambekar Handloom'))}
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ul className="nav-menu">
            <li>
              <button 
                className="nav-item w-full"
                onClick={() => setSystemMode(null)}
                style={{ background: 'none', border: 'none', textAlign: 'left', color: 'var(--accent-rose)', fontWeight: 'bold' }}
              >
                <ArrowLeft size={18} /> Switch Store / Home
              </button>
            </li>
            <li style={{ borderBottom: '1px solid var(--border-color)', margin: '4px 0 8px 0', paddingBottom: '4px' }}></li>
            <li>
              <button 
                className={`nav-item w-full ${activeTab === 'pos' ? 'active' : ''}`}
                onClick={() => setActiveTab('pos')}
                style={{ background: 'none', border: 'none', textAlign: 'left' }}
              >
                <Receipt size={18} /> {systemMode === 'reoti_cn' ? 'Credit Note Console' : (systemMode === 'ambekar_pn' ? 'Purchase Note Console' : 'POS Console')}
              </button>
            </li>
            <li>
              <button 
                className={`nav-item w-full ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
                style={{ background: 'none', border: 'none', textAlign: 'left' }}
              >
                <History size={18} /> {systemMode === 'reoti_cn' ? 'Credit Note Ledger' : (systemMode === 'ambekar_pn' ? 'Purchase Ledger' : 'Bill Ledger')}
              </button>
            </li>
            <li>
              <button 
                className={`nav-item w-full ${activeTab === 'ledger' ? 'active' : ''}`}
                onClick={() => setActiveTab('ledger')}
                style={{ background: 'none', border: 'none', textAlign: 'left' }}
              >
                <BookOpen size={18} /> Party Ledger / खाता बही
              </button>
            </li>

            <li>
              <button 
                className={`nav-item w-full ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
                style={{ background: 'none', border: 'none', textAlign: 'left' }}
              >
                <Layers size={18} /> Stock Catalog
              </button>
            </li>
            <li>
              <button 
                className={`nav-item w-full ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
                style={{ background: 'none', border: 'none', textAlign: 'left' }}
              >
                <TrendingUp size={18} /> Analytics Reports
              </button>
            </li>
            <li>
              <button 
                className={`nav-item w-full ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
                style={{ background: 'none', border: 'none', textAlign: 'left' }}
              >
                <Settings size={18} /> Printer Settings
              </button>
            </li>
          </ul>

          {/* Theme toggler at footer */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button 
              className="btn btn-secondary w-full" 
              onClick={toggleTheme}
              style={{ fontSize: '0.85rem' }}
            >
              {theme === 'dark' ? (
                <><Sun size={16} /> Light Counter Desk Mode</>
              ) : (
                <><Moon size={16} /> Dark Showroom Mode</>
              )}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main workspace container */}
      <main className="main-content">
        
        {/* Workspace Title Header card */}
        <header className="d-flex justify-between align-center border-bottom pb-3 no-print" style={{ marginBottom: '10px' }}>
          <div>
            <h1 className="brand-heading text-gold" style={{ fontSize: '1.8rem', fontWeight: '700' }}>
              {activeTab === 'pos' && (systemMode === 'reoti_cn' ? 'Create Credit Note (GST Return)' : (systemMode === 'ambekar_pn' ? 'Create Purchase Note (Non-GST)' : 'Create Sale Invoices'))}
              {activeTab === 'invoices' && (systemMode === 'reoti_cn' ? 'Credit Notes Archive Ledger' : (systemMode === 'ambekar_pn' ? 'Purchase Notes Archive Ledger' : 'Invoices Archive Ledger'))}
              {activeTab === 'ledger' && 'Party Ledger Statement (खाता बही)'}
              {activeTab === 'inventory' && 'Handloom Stock Warehouse'}
              {activeTab === 'analytics' && 'Operational reports & Trends'}
              {activeTab === 'settings' && 'Configure Business Profile'}
            </h1>

            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Logged in: Admin counter desk | Current local workspace: <strong style={{ color: systemMode === 'reoti_cn' ? '#f87171' : (systemMode === 'ambekar_pn' ? '#a855f7' : 'var(--text-gold)') }}>{systemMode === 'reoti' ? 'Reoti Handloom (Invoice)' : (systemMode === 'reoti_cn' ? 'Reoti Credit Note Console' : (systemMode === 'ambekar_pn' ? 'Ambekar Purchase Note Console' : 'Ambekar Handloom House'))}</strong>
            </p>
          </div>
          
          <div className="text-right d-flex flex-column align-end">
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
              {settings.shopName} {systemMode === 'reoti_cn' && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>(Credit Note Desk)</span>}
              {systemMode === 'ambekar_pn' && <span style={{ color: '#a855f7', fontSize: '0.8rem' }}>(Purchase Note Desk)</span>}
            </span>
            <span style={{ fontSize: '0.75rem', color: dbStatus.includes('🟢') ? 'var(--accent-emerald, #10b981)' : '#f59e0b', fontWeight: '600', marginTop: '2px' }}>
              {dbStatus}
            </span>
            {settings.shopGSTIN ? (
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                GSTIN: <span style={{ textTransform: 'uppercase' }}>{settings.shopGSTIN}</span>
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: systemMode === 'ambekar_pn' ? '#8b5cf6' : '#dc2626' }}>
                {systemMode === 'ambekar_pn' ? 'Non-GST purchase note console' : 'Non-GST billing console'}
              </span>
            )}
          </div>
        </header>

        {/* Dynamic Panels */}
        <div style={{ flexGrow: 1 }} className="no-print">
          {activeTab === 'pos' && (
            <PosConsole 
              inventory={inventory}
              currentInvoice={currentInvoice}
              settings={settings}
              onSaveInvoice={handleSaveInvoice}
              onClearInvoice={handleClearInvoice}
              onUpdateCurrentInvoice={setCurrentInvoice}
              hasGST={systemMode === 'reoti' || systemMode === 'reoti_cn'}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceList 
              invoices={invoices}
              onSelectInvoice={(inv) => {
                setInvoiceToView(inv);
                setIsPrintModalOpen(true);
              }}
              onEditInvoice={handleEditInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onSaveInvoice={handleSaveInvoice}
            />
          )}

          {activeTab === 'ledger' && (
            <PartyLedgerConsole 
              invoices={invoices}
              ledgerEntries={ledgerEntries}
              settings={settings}
              systemMode={systemMode}
              onSaveLedgerEntry={handleSaveLedgerEntry}
              onDeleteLedgerEntry={handleDeleteLedgerEntry}
            />
          )}


          {activeTab === 'inventory' && (
            <InventoryManager 
              inventory={inventory}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard 
              invoices={invoices}
              inventory={inventory}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel 
              settings={settings}
              onSave={handleSaveSettings}
            />
          )}
        </div>

        {/* Printable modal scheduler */}
        <PrintInvoiceModal 
          isOpen={isPrintModalOpen}
          invoice={invoiceToView}
          settings={settings}
          onClose={() => {
            setIsPrintModalOpen(false);
            setInvoiceToView(null);
          }}
          hasGST={systemMode === 'reoti' || systemMode === 'reoti_cn'}
        />
      </main>

    </div>
  );
}
