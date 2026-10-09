import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Package, 
  Printer, 
  Download, 
  RotateCcw, 
  Save, 
  User, 
  FileText, 
  Trash2, 
  Layers,
  ArrowLeft,
  CheckCircle2,
  Building,
  Scissors,
  Sparkles,
  Tag
} from 'lucide-react';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

export default function ParcelSlipConsole({
  invoices = [],
  allInvoices = [],
  ledgerEntries = [],
  _settings = {},
  systemMode = 'parcel_slip',
  onBackToHome
}) {
  // Direct live backend DB state fallback in case props are empty
  const [dbInvoices, setDbInvoices] = useState([]);
  const [dbLedger, setDbLedger] = useState([]);

  useEffect(() => {
    fetch('/api/data?mode=all')
      .then(res => res.json())
      .then(data => {
        if (data.allInvoices && data.allInvoices.length > 0) {
          setDbInvoices(data.allInvoices);
        } else if (data.invoices && data.invoices.length > 0) {
          setDbInvoices(data.invoices);
        }
        if (data.ledgerEntries && data.ledgerEntries.length > 0) {
          setDbLedger(data.ledgerEntries);
        }
      })
      .catch(() => {});
  }, []);

  // 1. Official Store Sender Profiles
  const SENDER_PRESETS = {
    ambekar: {
      id: 'ambekar',
      name: 'Ambekar Handloom House',
      addressLine1: '73, Laxmibai Marg, Maheshwar',
      cityState: 'Madhya Pradesh',
      pincode: '451224',
      phone: '9617444445',
      website: 'https://reotihandloom.com/',
      alternatePhone: '',
      tagline: 'Exclusive Maheshwari Sarees & Handloom',
      logo: '/logo_ambekar.jpg'
    },
    reoti: {
      id: 'reoti',
      name: 'Reoti Handloom',
      addressLine1: '73, Laxmibai Marg, Maheshwar',
      cityState: 'Madhya Pradesh',
      pincode: '451224',
      phone: '9617444445',
      website: 'https://reotihandloom.com/',
      alternatePhone: '',
      tagline: 'Pure Maheshwari & Chanderi Handlooms',
      logo: '/logo.jpg'
    }
  };

  // 2. Load persistent Sender settings
  const [activeSenderPreset, setActiveSenderPreset] = useState(() => {
    if (systemMode === 'reoti' || systemMode === 'reoti_cn') return 'reoti';
    if (systemMode === 'ambekar' || systemMode === 'ambekar_pn') return 'ambekar';
    try {
      const saved = localStorage.getItem('rh_parcel_sender_preset');
      if (saved && (saved === 'reoti' || saved === 'ambekar')) return saved;
      const savedObj = localStorage.getItem('rh_parcel_sender');
      if (savedObj) {
        const parsed = JSON.parse(savedObj);
        return parsed.name?.toLowerCase().includes('reoti') ? 'reoti' : 'ambekar';
      }
    } catch {
      // ignore
    }
    return 'ambekar';
  });

  const [senderProfile, setSenderProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('rh_parcel_sender');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.alternatePhone === '9995444444') {
          parsed.alternatePhone = '';
        }
        if (
          parsed.addressLine1?.includes('Mahatma Gandhi Marg') || 
          parsed.addressLine1?.includes('Main Market') ||
          !parsed.addressLine1?.includes('73, Laxmibai')
        ) {
          parsed.addressLine1 = '73, Laxmibai Marg, Maheshwar';
          parsed.cityState = 'Madhya Pradesh';
          parsed.pincode = '451224';
          localStorage.setItem('rh_parcel_sender', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return SENDER_PRESETS[activeSenderPreset] || SENDER_PRESETS.ambekar;
  });

  // Switch sender and persist
  const handleSelectSenderPreset = (presetKey) => {
    setActiveSenderPreset(presetKey);
    const preset = SENDER_PRESETS[presetKey] || SENDER_PRESETS.ambekar;
    setSenderProfile(preset);
    localStorage.setItem('rh_parcel_sender_preset', presetKey);
    localStorage.setItem('rh_parcel_sender', JSON.stringify(preset));
  };

  const handleSaveCustomSenderProfile = (updated) => {
    setSenderProfile(updated);
    localStorage.setItem('rh_parcel_sender', JSON.stringify(updated));
  };

  // Store Logo helper to ensure exact official logo is always resolved
  const currentStoreLogo = useMemo(() => {
    if (activeSenderPreset === 'ambekar' || senderProfile.name?.toLowerCase().includes('ambekar')) {
      return '/logo_ambekar.jpg';
    }
    return '/logo.jpg';
  }, [activeSenderPreset, senderProfile.name]);

  // 3. Recipient (Party / To) Details
  const [recipient, setRecipient] = useState({
    partyName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Madhya Pradesh',
    pincode: '',
    mobile: '',
    alternateMobile: '',
    orderRef: '',
    parcelWeight: '',
    itemDescription: 'Maheshwari Handloom Sarees / Suits',
    customNotes: ''
  });

  // 4. Print Layout & Design Styles
  const [layoutMode, setLayoutMode] = useState('duplex_2sheets'); // 'duplex_2sheets' | 'pages_3_full' | 'heritage_2sided_full' | 'slip_only' | 'half_with_thankyou' | 'half_a4' | 'double_a4'
  const [previewPageFilter, setPreviewPageFilter] = useState('all'); // 'all' | 'page1' | 'page2' | 'page3'
  const [fontSizeScale, setFontSizeScale] = useState('huge');
  const [showLogo, setShowLogo] = useState(true);
  const [showFragileBadge, setShowFragileBadge] = useState(true);

  // Active view tab: 'creator' | 'saved_addresses' | 'history'
  const [activeViewTab, setActiveViewTab] = useState('creator');

  // Customer suggestions dropdown states
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [partySourceFilter, setPartySourceFilter] = useState('all');

  // Address book saved in localStorage
  const [addressBook, setAddressBook] = useState(() => {
    try {
      const saved = localStorage.getItem('rh_parcel_address_book');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Print history saved in localStorage
  const [dispatchHistory, setDispatchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('rh_parcel_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const printAreaRef = useRef(null);

  // 5. Aggregate all unique customers/parties from Database (Invoices & Ledger)
  const allKnownParties = useMemo(() => {
    const partyMap = new Map();

    const addParty = (name, phone, address, src = 'Invoice', storeMode = 'reoti') => {
      const cleanName = (name || '').trim();
      const cleanPhone = (phone || '').trim();
      if (!cleanName && !cleanPhone) return;

      const key = cleanName ? cleanName.toLowerCase() : cleanPhone;
      
      let parsedCity = '';
      let parsedPincode = '';
      const rawAddr = (address || '').trim();

      const pinMatch = rawAddr.match(/\b\d{6}\b/);
      if (pinMatch) {
        parsedPincode = pinMatch[0];
      }

      if (!partyMap.has(key)) {
        partyMap.set(key, {
          partyName: cleanName,
          mobile: cleanPhone,
          address: rawAddr,
          pincode: parsedPincode,
          city: parsedCity,
          source: src,
          storeMode: storeMode
        });
      } else {
        const existing = partyMap.get(key);
        partyMap.set(key, {
          partyName: existing.partyName || cleanName,
          mobile: existing.mobile || cleanPhone,
          address: existing.address || rawAddr,
          pincode: existing.pincode || parsedPincode,
          city: existing.city || parsedCity,
          source: existing.source || src,
          storeMode: existing.storeMode || storeMode
        });
      }
    };

    (addressBook || []).forEach(item => {
      addParty(item.partyName, item.mobile, item.addressLine1 ? `${item.addressLine1} ${item.addressLine2 || ''} ${item.city || ''} ${item.pincode || ''}` : item.address, 'Address Book', 'saved');
    });

    const effectiveInvoices = (allInvoices && allInvoices.length > 0) ? allInvoices : (invoices && invoices.length > 0 ? invoices : dbInvoices);
    (effectiveInvoices || []).forEach(inv => {
      const isAmbekar = (inv.invoiceNo && inv.invoiceNo.startsWith('AH-')) || inv.storeMode === 'ambekar' || inv.storeMode === 'ambekar_pn';
      const modeStr = isAmbekar ? 'ambekar' : 'reoti';
      addParty(inv.customerName, inv.customerPhone, inv.customerAddress, `${isAmbekar ? 'Ambekar' : 'Reoti'} #${inv.invoiceNo}`, modeStr);
    });

    const effectiveLedger = (ledgerEntries && ledgerEntries.length > 0) ? ledgerEntries : dbLedger;
    (effectiveLedger || []).forEach(ent => {
      addParty(ent.partyName || ent.customerName, ent.customerPhone || ent.phone, ent.customerAddress || ent.address, 'Ledger', ent.storeMode || 'reoti');
    });

    return Array.from(partyMap.values());
  }, [invoices, allInvoices, ledgerEntries, dbInvoices, dbLedger, addressBook]);

  // Filtered party suggestions based on current Name input
  const nameSuggestions = useMemo(() => {
    let list = allKnownParties;
    if (partySourceFilter === 'reoti') {
      list = list.filter(p => p.storeMode === 'reoti' || p.source.toLowerCase().includes('reoti'));
    } else if (partySourceFilter === 'ambekar') {
      list = list.filter(p => p.storeMode === 'ambekar' || p.source.toLowerCase().includes('ambekar'));
    }

    if (!recipient.partyName || !recipient.partyName.trim()) {
      return list.slice(0, 8);
    }
    const q = recipient.partyName.trim().toLowerCase();
    return list.filter(p => 
      p.partyName?.toLowerCase().includes(q) || 
      p.mobile?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [allKnownParties, recipient.partyName, partySourceFilter]);

  // Filtered party suggestions based on current Phone input
  const phoneSuggestions = useMemo(() => {
    if (!recipient.mobile || !recipient.mobile.trim()) return [];
    const q = recipient.mobile.trim();
    return allKnownParties.filter(p => 
      p.mobile?.includes(q) ||
      p.partyName?.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 6);
  }, [allKnownParties, recipient.mobile]);

  // Auto-fill party details from database
  const handleSelectParty = (party) => {
    let addr1 = party.address || '';
    let cityName = party.city || '';
    let pin = party.pincode || '';

    if (addr1 && (!cityName || !pin)) {
      const parts = addr1.split(',').map(p => p.trim());
      const lastPart = parts[parts.length - 1];
      const pinMatch = lastPart ? lastPart.match(/\b\d{6}\b/) : null;
      if (pinMatch) {
        pin = pinMatch[0];
      }
    }

    setRecipient(prev => ({
      ...prev,
      partyName: party.partyName || prev.partyName,
      mobile: party.mobile || prev.mobile,
      addressLine1: addr1,
      city: cityName || prev.city,
      pincode: pin || prev.pincode
    }));

    setIsNameFocused(false);
    setIsPhoneFocused(false);
  };

  // Auto-match when typing in Party Name
  const handlePartyNameChange = (val) => {
    const cleanVal = val;
    let newRecip = { ...recipient, partyName: cleanVal };

    const valTrim = cleanVal.trim().toLowerCase();
    if (valTrim.length >= 2) {
      const match = allKnownParties.find(p => p.partyName && p.partyName.trim().toLowerCase() === valTrim);
      if (match) {
        let addr1 = match.address || '';
        let cityName = match.city || '';
        let pin = match.pincode || '';
        if (addr1 && (!cityName || !pin)) {
          const pinMatch = addr1.match(/\b\d{6}\b/);
          if (pinMatch) pin = pinMatch[0];
        }
        newRecip = {
          ...newRecip,
          mobile: match.mobile || newRecip.mobile,
          addressLine1: addr1 || newRecip.addressLine1,
          city: cityName || newRecip.city,
          pincode: pin || newRecip.pincode
        };
      }
    }

    setRecipient(newRecip);
  };

  // Auto-match when typing in Phone Number
  const handlePhoneChange = (val) => {
    const cleanVal = val;
    let newRecip = { ...recipient, mobile: cleanVal };

    const cleanTrim = cleanVal.trim();
    if (cleanTrim.length >= 5) {
      const match = allKnownParties.find(p => p.mobile && p.mobile.trim() === cleanTrim);
      if (match) {
        let addr1 = match.address || '';
        let pin = match.pincode || '';
        if (addr1 && !pin) {
          const pinMatch = addr1.match(/\b\d{6}\b/);
          if (pinMatch) pin = pinMatch[0];
        }
        newRecip = {
          ...newRecip,
          partyName: match.partyName || newRecip.partyName,
          addressLine1: addr1 || newRecip.addressLine1,
          city: match.city || newRecip.city,
          pincode: pin || newRecip.pincode
        };
      }
    }

    setRecipient(newRecip);
  };

  // Save current recipient to permanent address book
  const handleSaveToAddressBook = () => {
    if (!recipient.partyName.trim()) {
      alert('Please enter Party / Recipient Name to save.');
      return;
    }

    const newEntry = {
      id: 'addr_' + Date.now(),
      partyName: recipient.partyName.trim(),
      mobile: recipient.mobile.trim(),
      alternateMobile: recipient.alternateMobile.trim(),
      addressLine1: recipient.addressLine1.trim(),
      addressLine2: recipient.addressLine2.trim(),
      city: recipient.city.trim(),
      state: recipient.state.trim(),
      pincode: recipient.pincode.trim(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newEntry, ...addressBook.filter(a => a.partyName.toLowerCase() !== newEntry.partyName.toLowerCase())];
    setAddressBook(updated);
    localStorage.setItem('rh_parcel_address_book', JSON.stringify(updated));
    alert(`✅ Address for "${newEntry.partyName}" saved to Address Book!`);
  };

  // Delete from address book
  const handleDeleteAddressBookEntry = (id) => {
    const updated = addressBook.filter(a => a.id !== id);
    setAddressBook(updated);
    localStorage.setItem('rh_parcel_address_book', JSON.stringify(updated));
  };

  // Record dispatch in history
  const logDispatchHistory = () => {
    if (!recipient.partyName.trim()) return;

    const newLog = {
      id: 'disp_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      partyName: recipient.partyName.trim(),
      mobile: recipient.mobile.trim(),
      city: recipient.city.trim() || recipient.addressLine1.trim(),
      senderName: senderProfile.name,
      orderRef: recipient.orderRef.trim(),
      fullRecipient: { ...recipient }
    };

    const updated = [newLog, ...dispatchHistory.slice(0, 99)];
    setDispatchHistory(updated);
    localStorage.setItem('rh_parcel_history', JSON.stringify(updated));
  };

  // Clear Form
  const handleClearForm = () => {
    setRecipient({
      partyName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: 'Madhya Pradesh',
      pincode: '',
      mobile: '',
      alternateMobile: '',
      orderRef: '',
      parcelWeight: '',
      itemDescription: 'Maheshwari Handloom Sarees / Suits',
      customNotes: ''
    });
  };

  // Direct Browser Print Trigger (Current View)
  const handlePrint = () => {
    if (!recipient.partyName.trim()) {
      alert('Please fill recipient party name before printing.');
      return;
    }
    logDispatchHistory();
    window.print();
  };

  // Specific Print Mode Trigger with automatic layout selection
  const handlePrintWithMode = (mode, filter = 'all') => {
    if (!recipient.partyName.trim()) {
      alert('Please fill recipient party name before printing.');
      return;
    }
    logDispatchHistory();
    setLayoutMode(mode);
    setPreviewPageFilter(filter);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 1-Click Trigger: Auto 2-Sheet Duplex Package (Sheet 1: Slip alone, Sheet 2: Front & Back Leaflet)
  const handlePrintAutoDuplex = () => handlePrintWithMode('duplex_2sheets', 'all');

  // 1-Click Trigger: Sheet 1 Only (Parcel Slip - Single Sheet)
  const handlePrintSlipOnly = () => handlePrintWithMode('slip_only', 'page1');

  // 1-Click Trigger: Sheet 2 Only (2-Sided Heritage Leaflet - Front & Back)
  const handlePrintLeafletOnly = () => handlePrintWithMode('heritage_2sided_full', 'all');

  // PDF Export
  const handleDownloadPDF = () => {
    if (!recipient.partyName.trim()) {
      alert('Please fill recipient party name before downloading PDF.');
      return;
    }

    const element = document.getElementById('printable-parcel-slip-content');
    if (!element) return;

    logDispatchHistory();

    const opt = {
      margin: 0,
      filename: `Parcel_Package_${senderProfile.name.replace(/\s+/g, '_')}_${(recipient.partyName || 'Customer').replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2.0, 
        useCORS: true, 
        logging: false,
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  // ── 1. RENDER TOP PARCEL DISPATCH SLIP (PROMINENT SENDER BOX & BIG LOGO) ──
  const renderParcelSlipCard = (recipData) => {
    const isEmp = !recipData.partyName && !recipData.addressLine1;

    return (
      <div 
        className="parcel-slip-paper"
        style={{
          backgroundColor: '#faf6ed',
          color: '#1e293b',
          border: '3px solid #334155',
          borderRadius: '10px',
          padding: '16px 22px',
          fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif",
          boxSizing: 'border-box',
          position: 'relative',
          width: '100%',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pageBreakInside: 'avoid',
          margin: '0 auto',
          boxShadow: 'none',
          overflow: 'hidden'
        }}
      >
        {/* ── 4 ORNATE CORNER FLOURISHES (ROYAL HERITAGE BORDER ACCENTS) ── */}
        <svg style={{ position: 'absolute', top: '5px', left: '5px', width: '38px', height: '38px', pointerEvents: 'none', zIndex: 1, opacity: 0.7 }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.5" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', top: '5px', right: '5px', width: '38px', height: '38px', pointerEvents: 'none', zIndex: 1, opacity: 0.7, transform: 'scaleX(-1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.5" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '5px', left: '5px', width: '38px', height: '38px', pointerEvents: 'none', zIndex: 1, opacity: 0.7, transform: 'scaleY(-1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.5" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '5px', right: '5px', width: '38px', height: '38px', pointerEvents: 'none', zIndex: 1, opacity: 0.7, transform: 'scale(-1, -1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.5" fill="#b45309" />
        </svg>

        {/* ── INTRICATE ROYAL MAHESHWARI HANDLOOM MANDALA WATERMARK ── */}
        <svg 
          viewBox="0 0 300 300" 
          style={{
            position: 'absolute',
            right: '-30px',
            top: '32%',
            transform: 'translateY(-50%)',
            width: '280px',
            height: '280px',
            opacity: 0.16,
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          <circle cx="150" cy="150" r="140" stroke="#b45309" strokeWidth="2" fill="none" strokeDasharray="5 4" />
          <circle cx="150" cy="150" r="122" stroke="#b45309" strokeWidth="1.5" fill="none" />
          <circle cx="150" cy="150" r="96" stroke="#b45309" strokeWidth="2" fill="none" strokeDasharray="3 3" />
          <circle cx="150" cy="150" r="66" stroke="#b45309" strokeWidth="1.5" fill="none" />
          <circle cx="150" cy="150" r="36" stroke="#b45309" strokeWidth="2" fill="#b45309" fillOpacity="0.12" />
          {/* Radiating 12 Petals / Handloom Shuttles */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
            <g key={deg} transform={`rotate(${deg} 150 150)`}>
              <path d="M 150 50 C 136 90 142 120 150 150 C 158 120 164 90 150 50 Z" fill="#b45309" fillOpacity="0.25" stroke="#b45309" strokeWidth="1.2" />
              <path d="M 150 12 C 142 36 146 48 150 52 C 154 48 158 36 150 12 Z" fill="#b45309" fillOpacity="0.45" stroke="#b45309" strokeWidth="1.2" />
              <circle cx="150" cy="24" r="3" fill="#b45309" />
            </g>
          ))}
          <circle cx="150" cy="150" r="10" fill="#b45309" />
        </svg>

        {/* Fine Inner Accent Border Frame */}
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          right: '4px',
          bottom: '4px',
          border: '1.5px dashed #b45309',
          borderRadius: '7px',
          pointerEvents: 'none',
          opacity: 0.6
        }} />

        {/* ── TOP HEADER / WARM THANK YOU GREETING & FRAGILE BADGE ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1.5px solid #cbd5e1',
          paddingBottom: '8px',
          marginBottom: '8px',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          {/* Left: Deep Navy/Indigo Header Pill */}
          <div style={{
            backgroundColor: '#1e1b4b',
            color: '#fef3c7',
            padding: '6px 18px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '900',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <span>✦</span> THANK YOU FOR CHOOSING {senderProfile.name.toUpperCase()} <span>✦</span>
          </div>

          {/* Right: Fragile Warning Badge */}
          {showFragileBadge && (
            <div style={{
              backgroundColor: '#ffffff',
              color: '#dc2626',
              border: '1.5px dashed #dc2626',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '11.5px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ color: '#dc2626', fontSize: '13px' }}>⚠️</span> FRAGILE - HANDLE WITH CARE
            </div>
          )}
        </div>

        {/* ── SECTION 1: RECIPIENT ("TO / CONSIGNEE") ── */}
        <div style={{ position: 'relative', zIndex: 1, flexGrow: 1, marginBottom: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          
          {/* "TO / CONSIGNEE :" Ribbon with horizontal line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ 
              fontSize: '14.5px', 
              fontWeight: '900', 
              backgroundColor: '#1e1b4b',
              color: '#ffffff',
              padding: '3px 16px',
              borderRadius: '4px',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              DELIVER TO / SHIP TO :
            </span>
            <div style={{ flexGrow: 1, height: '1.5px', backgroundColor: '#94a3b8', opacity: 0.7 }} />
          </div>

          <div style={{ paddingLeft: '6px' }}>
            
            {/* 1. Customer Name (NAVY BLUE EXTRA BOLD UPPERCASE) */}
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '900', 
              color: '#1e1b4b', // Deep Navy Blue
              lineHeight: '1.15',
              letterSpacing: '0.6px',
              marginBottom: '4px',
              textTransform: 'uppercase'
            }}>
              {recipData.partyName || (isEmp ? <span style={{ color: '#1e1b4b', fontWeight: '900' }}>JAGDAMBA CREATION</span> : '')}
            </div>

            {/* 2. Delivery Address */}
            <div style={{ 
              fontSize: '17.5px', 
              fontWeight: '700', 
              color: '#1f2937', 
              lineHeight: '1.38',
              marginBottom: '4px'
            }}>
              {recipData.addressLine1 || (isEmp ? <span style={{ color: '#374151', fontStyle: 'normal', fontWeight: '700' }}>Shop No.01, Swami Shanti Prakash Shopping Center, Lohiya Market, Gandhinagar, Kolhapur-416119</span> : '')}
              {recipData.addressLine2 ? `, ${recipData.addressLine2}` : ''}
            </div>

            {/* 3. State & PINCODE Badge */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '17px', 
              fontWeight: '800', 
              color: '#111827', 
              marginTop: '4px',
              marginBottom: '6px'
            }}>
              <span>
                {[recipData.city, recipData.state].filter(Boolean).join(', ') || (isEmp ? 'Madhya Pradesh' : '')}
              </span>

              <span style={{
                backgroundColor: '#1e1b4b',
                color: '#ffffff',
                padding: '2px 10px',
                borderRadius: '4px',
                letterSpacing: '1px',
                fontSize: '16px',
                fontWeight: '900',
                display: 'inline-block'
              }}>
                PIN: {recipData.pincode || (isEmp ? '416119' : '')}
              </span>
            </div>

            {/* 4. Mobile Phone Bar (100% Guaranteed Crisp Capture in PDF & Print) */}
            {(recipData.mobile || isEmp) ? (
              <div style={{ 
                marginTop: '8px',
                display: 'inline-block',
                backgroundColor: '#1e1b4b',
                border: '2px solid #1e1b4b',
                borderRadius: '8px',
                padding: '4px 14px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                <span style={{
                  color: '#fef08a',
                  fontSize: '15px',
                  fontWeight: '900',
                  letterSpacing: '0.5px',
                  marginRight: '8px',
                  display: 'inline-block',
                  verticalAlign: 'middle'
                }}>
                  📞 MOB:
                </span>
                <span style={{
                  color: '#ffffff',
                  fontSize: '22px',
                  fontWeight: '900',
                  letterSpacing: '1px',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif"
                }}>
                  {recipData.mobile || (isEmp ? '8888991994' : '')}
                  {recipData.alternateMobile ? ` / ${recipData.alternateMobile}` : ''}
                </span>
              </div>
            ) : null}

          </div>
        </div>

        {/* ── MAHESHWAR HANDLOOM DISPATCH DIVIDER ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          borderTop: '1px solid #cbd5e1',
          margin: '6px 0 6px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <span style={{
            position: 'absolute',
            backgroundColor: '#faf7f0',
            padding: '0 10px',
            fontSize: '9.5px',
            fontWeight: '900',
            color: '#475569',
            letterSpacing: '1.5px',
            textTransform: 'uppercase'
          }}>
            + MAHESHWAR HANDLOOM DISPATCH +
          </span>
        </div>

        {/* ── SECTION 2: SENDER ("FROM / SENDER" - ENLARGED & PROMINENT) ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#f6f2e6',
          border: '1.5px solid #dcd3bf',
          borderRadius: '8px',
          padding: '10px 14px',
          overflow: 'hidden'
        }}>
          {/* Subtle Handloom Loom Watermark inside Sender Box */}
          <svg 
            viewBox="0 0 160 160" 
            style={{
              position: 'absolute',
              right: '80px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '130px',
              height: '130px',
              opacity: 0.13,
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            <circle cx="80" cy="80" r="70" stroke="#b45309" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
            <circle cx="80" cy="80" r="50" stroke="#b45309" strokeWidth="1" fill="none" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
              <g key={deg} transform={`rotate(${deg} 80 80)`}>
                <path d="M 80 15 C 72 40 76 60 80 80 C 84 60 88 40 80 15 Z" fill="#b45309" fillOpacity="0.3" stroke="#b45309" strokeWidth="1" />
              </g>
            ))}
          </svg>

          <div style={{ 
            position: 'relative',
            zIndex: 1,
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{ flex: 1 }}>
              {/* FROM Label */}
              <div style={{ 
                fontSize: '14.5px', 
                fontWeight: '900', 
                color: '#1e1b4b',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '2px',
                textDecoration: 'underline',
                textUnderlineOffset: '3px'
              }}>
                FROM / SENDER :
              </div>

              {/* Sender Store Name (BIGGER & BOLDER) */}
              <div style={{ 
                fontSize: '22px', 
                fontWeight: '900', 
                color: '#0f172a',
                letterSpacing: '0.4px',
                lineHeight: '1.2',
                marginBottom: '2px'
              }}>
                {senderProfile.name}
              </div>

              {/* Sender Address (BIGGER & CLEAR) */}
              <div style={{ 
                fontSize: '15.5px', 
                fontWeight: '700', 
                color: '#334155',
                lineHeight: '1.3'
              }}>
                {senderProfile.addressLine1 ? `${senderProfile.addressLine1}, ` : ''}{senderProfile.cityState ? `${senderProfile.cityState}` : 'Madhya Pradesh'} {senderProfile.pincode ? `${senderProfile.pincode}` : '451224'}
              </div>

              {/* Sender Phone & Website (BIGGER & BOLDER) */}
              <div style={{ 
                fontSize: '15px', 
                fontWeight: '900', 
                color: '#0f172a', 
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#b45309' }}>📞 Contact / Mob:</span>
                  <span style={{ fontWeight: '900', color: '#1e1b4b' }}>{senderProfile.phone}</span>
                  {senderProfile.alternatePhone && <span>, {senderProfile.alternatePhone}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#0369a1' }}>🌐 Website:</span>
                  <span style={{ fontWeight: '900', color: '#0369a1' }}>https://reotihandloom.com/</span>
                </div>
              </div>
            </div>

            {/* Official Store Logo Badge (ENLARGED TO 68px DIAMETER FOR CRISP VISIBILITY) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              <img 
                src={currentStoreLogo} 
                alt={senderProfile.name} 
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #b45309',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.2)'
                }} 
              />
              <span style={{
                fontSize: '9.5px',
                fontWeight: '900',
                color: '#1e1b4b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ★ AUTHENTIC ★
              </span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ITEM DESCRIPTION STRIP ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          marginTop: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: '800',
          color: '#475569'
        }}>
          <span>📦 {recipData.itemDescription || 'Maheshwari Handloom Sarees / Suits'}</span>
          {recipData.parcelWeight && <span>⚖️ Weight: {recipData.parcelWeight}</span>}
        </div>
      </div>
    );
  };

  // ── 2. RENDER BOTTOM "THANK YOU & HANDLOOM CARE NOTE" ──
  const renderThankYouInsertCard = (recipData) => {
    return (
      <div 
        className="thankyou-insert-card"
        style={{
          backgroundColor: '#faf6ed',
          color: '#1e293b',
          border: '2px solid #334155',
          borderRadius: '10px',
          padding: '16px 22px',
          fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif",
          boxSizing: 'border-box',
          position: 'relative',
          width: '100%',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pageBreakInside: 'avoid',
          margin: '0 auto',
          overflow: 'hidden'
        }}
      >
        {/* ── 4 ORNATE CORNER FLOURISHES (ROYAL HERITAGE BORDER ACCENTS) ── */}
        <svg style={{ position: 'absolute', top: '5px', left: '5px', width: '38px', height: '38px', pointerEvents: 'none', zIndex: 1, opacity: 0.7 }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.5" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', top: '5px', right: '5px', width: '38px', height: '38px', pointerEvents: 'none', zIndex: 1, opacity: 0.7, transform: 'scaleX(-1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.5" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '5px', left: '5px', width: '38px', height: '38px', pointerEvents: 'none', zIndex: 1, opacity: 0.7, transform: 'scaleY(-1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.5" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '5px', right: '5px', width: '38px', height: '38px', pointerEvents: 'none', zIndex: 1, opacity: 0.7, transform: 'scale(-1, -1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.5" fill="#b45309" />
        </svg>

        {/* ── DUAL SYMMETRICAL ROYAL MAHESHWARI HANDLOOM MOTIFS ── */}
        <svg 
          viewBox="0 0 240 240" 
          style={{
            position: 'absolute',
            left: '-25px',
            top: '48%',
            transform: 'translateY(-50%)',
            width: '210px',
            height: '210px',
            opacity: 0.15,
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          <circle cx="120" cy="120" r="105" stroke="#b45309" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
          <circle cx="120" cy="120" r="75" stroke="#b45309" strokeWidth="1" fill="none" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <g key={deg} transform={`rotate(${deg} 120 120)`}>
              <path d="M 120 20 C 108 55 112 85 120 120 C 128 85 132 55 120 20 Z" fill="#b45309" fillOpacity="0.25" stroke="#b45309" strokeWidth="1" />
            </g>
          ))}
        </svg>
        <svg 
          viewBox="0 0 240 240" 
          style={{
            position: 'absolute',
            right: '-25px',
            top: '48%',
            transform: 'translateY(-50%)',
            width: '210px',
            height: '210px',
            opacity: 0.15,
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          <circle cx="120" cy="120" r="105" stroke="#b45309" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
          <circle cx="120" cy="120" r="75" stroke="#b45309" strokeWidth="1" fill="none" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <g key={deg} transform={`rotate(${deg} 120 120)`}>
              <path d="M 120 20 C 108 55 112 85 120 120 C 128 85 132 55 120 20 Z" fill="#b45309" fillOpacity="0.25" stroke="#b45309" strokeWidth="1" />
            </g>
          ))}
        </svg>

        {/* 1. Header with Store Branding */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          borderBottom: '1.5px solid #cbd5e1',
          paddingBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img 
              src={currentStoreLogo} 
              alt={senderProfile.name} 
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid #b45309',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }} 
            />
            <div>
              <div style={{ fontSize: '21px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: '1.2' }}>
                {senderProfile.name}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginTop: '2px' }}>
                Pure Handwoven Maheshwari Sarees, Suits & Dupattas • <span style={{ color: '#0369a1', fontWeight: '800' }}>https://reotihandloom.com/</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Customer Gratitude Message & Care */}
        <div style={{ position: 'relative', zIndex: 1, margin: '8px 0', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          
          <div>
            <div style={{ 
              fontSize: '16.5px', 
              fontWeight: '900', 
              color: '#0f172a', 
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🌸 Dear <strong style={{ color: '#1e1b4b', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{recipData.partyName || 'Jagdamba Creation'}</strong>,</span>
            </div>

            <p style={{ 
              fontSize: '12.5px', 
              lineHeight: '1.48', 
              color: '#334155', 
              margin: '2px 0 8px 0',
              fontWeight: '600'
            }}>
              Heartfelt thank you for choosing <strong>{senderProfile.name}</strong>! We are delighted to send you this authentic parcel handcrafted by traditional master weavers of Maheshwar on handlooms. We hope these exquisite handloom weaves bring grace and joy to your collection.
            </p>
          </div>

          {/* 3. Handloom Wash & Care Instructions Grid */}
          <div style={{
            backgroundColor: '#f6f2e6',
            border: '1.5px solid #dcd3bf',
            borderRadius: '6px',
            padding: '9px 14px',
            marginBottom: '8px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🧺</span> HANDLOOM WASH & CARE INSTRUCTIONS:
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px', fontSize: '11.5px', fontWeight: '700', color: '#1f2937', lineHeight: '1.4' }}>
              <div>• <strong>Dry Clean:</strong> Recommended for the 1st wash.</div>
              <div>• <strong>Sunlight:</strong> Dry in shade, avoid direct harsh sun.</div>
              <div>• <strong>Ironing:</strong> Medium heat iron on the reverse side.</div>
              <div>• <strong>Storage:</strong> Wrap in pure cotton cloth/muslin bag.</div>
            </div>
          </div>

          {/* 4. THE 4 VISUAL CARE ICONS STRIP */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '10px 8px',
            textAlign: 'center'
          }}>
            {/* Column 1: Steam Iron */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H8l-4 4v5a2 2 0 0 0 2 2z"/>
                <path d="M8 7V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/>
                <line x1="8" y1="19" x2="8" y2="21"/>
                <line x1="12" y1="19" x2="12" y2="21"/>
                <line x1="16" y1="19" x2="16" y2="21"/>
              </svg>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#1e293b' }}>Steam iron on</div>
              <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '600' }}>reverse side.</div>
            </div>

            {/* Column 2: Dry Clean */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', borderLeft: '1px solid #e2e8f0' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
              </svg>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#1e293b' }}>Dry Cleaning</div>
              <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '600' }}>for the 1st wash.</div>
            </div>

            {/* Column 3: Sunlight */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', borderLeft: '1px solid #e2e8f0' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/>
                <path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/>
                <path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/>
                <path d="M20 12h2"/>
                <path d="m6.34 17.66-1.41 1.41"/>
                <path d="m19.07 4.93-1.41 1.41"/>
              </svg>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#1e293b' }}>Sunlight: Dry</div>
              <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '600' }}>in shade.</div>
            </div>

            {/* Column 4: Storage */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', borderLeft: '1px solid #e2e8f0' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M3 15h18"/>
              </svg>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#1e293b' }}>Storage: Wrap in</div>
              <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '600' }}>pure cotton cloth/bag.</div>
            </div>
          </div>
        </div>

        {/* 5. Bottom WhatsApp Helpline, Website & Authenticity Stamp */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          borderTop: '1.5px solid #cbd5e1',
          paddingTop: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>💬 WhatsApp / Helpline:</span>
                <span style={{ fontSize: '13.5px', backgroundColor: '#fef08a', padding: '2px 10px', border: '1.5px solid #1e1b4b', borderRadius: '4px', color: '#1e1b4b', fontWeight: '900' }}>
                  {senderProfile.phone}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0369a1' }}>
                <span>🌐 Website:</span>
                <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#0369a1' }}>https://reotihandloom.com/</span>
              </div>
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>
              {senderProfile.addressLine1 ? `${senderProfile.addressLine1}, ` : ''}{senderProfile.cityState || 'Madhya Pradesh'} {senderProfile.pincode || '451224'} • Share your feedback & photos with us!
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block',
              border: '1.5px dashed #b45309',
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: '900',
              textTransform: 'uppercase',
              color: '#b45309',
              backgroundColor: '#fffbeb'
            }}>
              ★ 100% GENUINE HANDLOOM ★
            </span>
          </div>
        </div>

      </div>
    );
  };

  // ── 3. RENDER FULL A4 PAGE: "THANK YOU FOR YOUR PURCHASE" INSERT LEAFLET FRONT (MAHESHWAR FORT SKETCH) ──
  const renderHeritageThankYouFront = (recipData) => {
    return (
      <div 
        className="full-a4-thankyou-front"
        style={{
          backgroundColor: '#faf6ed',
          color: '#1e293b',
          border: '3.5px double #b45309',
          borderRadius: '10px',
          padding: '24px 28px',
          fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif",
          boxSizing: 'border-box',
          position: 'relative',
          width: '100%',
          minHeight: '1040px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pageBreakInside: 'avoid',
          margin: '0 auto',
          overflow: 'hidden'
        }}
      >
        {/* ── 4 ORNATE CORNER FLOURISHES ── */}
        <svg style={{ position: 'absolute', top: '7px', left: '7px', width: '50px', height: '50px', pointerEvents: 'none', zIndex: 1, opacity: 0.8 }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.8" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', top: '7px', right: '7px', width: '50px', height: '50px', pointerEvents: 'none', zIndex: 1, opacity: 0.8, transform: 'scaleX(-1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.8" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '7px', left: '7px', width: '50px', height: '50px', pointerEvents: 'none', zIndex: 1, opacity: 0.8, transform: 'scaleY(-1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.8" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '7px', right: '7px', width: '50px', height: '50px', pointerEvents: 'none', zIndex: 1, opacity: 0.8, transform: 'scale(-1, -1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.8" fill="#b45309" />
        </svg>

        {/* Delicate Inner Dashed Gold Frame */}
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          right: '6px',
          bottom: '6px',
          border: '2px dashed #b45309',
          borderRadius: '8px',
          pointerEvents: 'none',
          opacity: 0.65
        }} />

        {/* ── 1. TOP HEADER & PROMINENT BRANDING ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f6f2e6',
          border: '2px solid #dcd3bf',
          borderRadius: '8px',
          padding: '12px 18px',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img 
              src={currentStoreLogo} 
              alt={senderProfile.name} 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #b45309',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 10px rgba(0,0,0,0.18)'
              }} 
            />
            <div>
              {/* BIG BRAND NAME */}
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: '1.1' }}>
                {senderProfile.name}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#b45309', marginTop: '3px' }}>
                Pure Maheshwari Handloom Sarees, Suits & Dupattas • Maheshwar (M.P.)
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#1e1b4b',
            color: '#fef3c7',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '900',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            boxShadow: '0 3px 8px rgba(0,0,0,0.2)'
          }}>
            ✦ AUTHENTIC HANDLOOM INSERT ✦
          </div>
        </div>

        {/* ── 2. CALLIGRAPHY TITLE & GRATITUDE MESSAGE (FULL SIZED & SPACIOUS) ── */}
        <div style={{ position: 'relative', zIndex: 1, margin: '14px 0', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          
          <div style={{ textAlign: 'center', margin: '4px 0 8px 0' }}>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '56px',
              fontWeight: '900',
              color: '#0f172a',
              lineHeight: '1.05',
              letterSpacing: '0.5px'
            }}>
              Thank You!
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '900',
              letterSpacing: '3px',
              color: '#b45309',
              textTransform: 'uppercase',
              marginTop: '4px'
            }}>
              FOR YOUR VALUED PURCHASE • WITH SINCERE GRATITUDE
            </div>
          </div>

          {/* Dynamic Patron Greeting */}
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e1b4b', margin: '6px 0 8px 0', textAlign: 'center' }}>
            🌸 Dear <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px', color: '#0f172a' }}>{recipData.partyName || 'Valued Handloom Patron'}</span>,
          </div>

          {/* Heartfelt Message */}
          <div style={{
            fontSize: '15px',
            lineHeight: '1.7',
            color: '#334155',
            textAlign: 'center',
            fontWeight: '600',
            maxWidth: '92%',
            margin: '0 auto 12px auto'
          }}>
            ✨ You didn't just make a purchase — you chose to keep a <strong style={{ color: '#b45309', fontWeight: '900', fontSize: '16px' }}>700-year-old art</strong> alive. Every thread in your parcel carries the dream, sweat, and soul of a master weaver sitting by the sacred banks of the <strong style={{ color: '#b45309', fontWeight: '900', fontSize: '16px' }}>Narmada in "Maheshwar"</strong>. Your choice creates a ripple — one that sustains weaver families, honors a timeless craft, and carries forward a legacy the world is only beginning to rediscover. <strong style={{ color: '#0f172a', fontWeight: '900', fontSize: '16px' }}>{senderProfile.name}</strong> is humbled and forever grateful to weave this journey with you. 🙏

          </div>

          {/* ── 3. LARGE MAHESHWAR FORT & GHATS ARCHITECTURAL SKETCH ILLUSTRATION (FULL CANVAS) ── */}
          <div style={{
            position: 'relative',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid #dcd3bf',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
            margin: '0 auto 10px auto',
            width: '100%',
            maxHeight: '360px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img 
              src="/maheshwar_fort_sketch.jpg" 
              alt="Maheshwar Fort Sketch" 
              style={{
                width: '100%',
                maxHeight: '320px',
                objectFit: 'contain',
                display: 'block'
              }} 
            />
            <div style={{
              backgroundColor: '#fbf8f1',
              width: '100%',
              padding: '6px 0',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: '900',
              color: '#78350f',
              letterSpacing: '1px',
              borderTop: '1.5px solid #e2e8f0',
              textTransform: 'uppercase'
            }}>
              ★ The Majestic Ahilya Fort & Sacred Narmada Ghats • Maheshwar (M.P.) ★
            </div>
          </div>

        </div>

        {/* ── 4. BOTTOM HIGH-CONTRAST HIGHLIGHTED WEBSITE & CONTACT PILLS ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          borderTop: '2px solid #cbd5e1',
          paddingTop: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {/* HIGHLIGHTED WEBSITE BADGE */}
              <span style={{
                backgroundColor: '#fef08a',
                color: '#1e1b4b',
                border: '2px solid #b45309',
                padding: '6px 18px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '900',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(180,83,9,0.2)'
              }}>
                🌐 Website: www.reotihandloom.com
              </span>

              {/* HIGHLIGHTED WHATSAPP BADGE */}
              <span style={{
                backgroundColor: '#dcfce7',
                color: '#14532d',
                border: '2px solid #16a34a',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '900',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                💬 WhatsApp / Helpline: {senderProfile.phone}
              </span>
            </div>
            
            <div style={{ fontSize: '12px', color: '#475569', fontWeight: '700' }}>
              📍 73, Laxmibai Marg, Maheshwar (Madhya Pradesh) - 451224
            </div>
          </div>

          <div style={{
            border: '2px dashed #b45309',
            backgroundColor: '#fffbeb',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '900',
            color: '#b45309',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}>
            ★ 100% PURE HANDWOVEN WEAVES ★
          </div>
        </div>

      </div>
    );
  };

  // ── 4. RENDER FULL A4 PAGE: "RAJMATA AHILYABAI HOLKAR & MAHESHWAR FORT HERITAGE TRIBUTE" (BACK SIDE) ──
  const renderAhilyaMaHeritageBack = (recipData) => {
    return (
      <div 
        className="full-a4-ahilyama-back"
        style={{
          backgroundColor: '#faf6ed',
          color: '#1e293b',
          border: '3.5px double #b45309',
          borderRadius: '10px',
          padding: '24px 28px',
          fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif",
          boxSizing: 'border-box',
          position: 'relative',
          width: '100%',
          minHeight: '1040px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pageBreakInside: 'avoid',
          margin: '0 auto',
          overflow: 'hidden'
        }}
      >
        {/* ── 4 ORNATE CORNER FLOURISHES ── */}
        <svg style={{ position: 'absolute', top: '7px', left: '7px', width: '50px', height: '50px', pointerEvents: 'none', zIndex: 1, opacity: 0.8 }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.8" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', top: '7px', right: '7px', width: '50px', height: '50px', pointerEvents: 'none', zIndex: 1, opacity: 0.8, transform: 'scaleX(-1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.8" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '7px', left: '7px', width: '50px', height: '50px', pointerEvents: 'none', zIndex: 1, opacity: 0.8, transform: 'scaleY(-1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.8" fill="#b45309" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '7px', right: '7px', width: '50px', height: '50px', pointerEvents: 'none', zIndex: 1, opacity: 0.8, transform: 'scale(-1, -1)' }} viewBox="0 0 40 40" fill="none" stroke="#b45309" strokeWidth="1.5">
          <path d="M 4 36 L 4 12 C 4 6 6 4 12 4 L 36 4" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 8 36 L 8 16 C 8 10 10 8 16 8 L 36 8" strokeWidth="1.2" opacity="0.6" />
          <path d="M 4 4 C 10 10 18 10 24 4 C 20 12 20 20 26 26 C 20 20 12 20 4 24 Z" fill="#b45309" fillOpacity="0.35" />
          <circle cx="12" cy="12" r="2.8" fill="#b45309" />
        </svg>

        {/* Inner Dashed Gold Accent Frame */}
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          right: '6px',
          bottom: '6px',
          border: '2px dashed #b45309',
          borderRadius: '8px',
          pointerEvents: 'none',
          opacity: 0.65
        }} />

        {/* ── 1. TOP ROYAL STORE HEADER & MAA AHILYA BANNER ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f6f2e6',
          border: '2px solid #dcd3bf',
          borderRadius: '8px',
          padding: '12px 18px',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img 
              src={currentStoreLogo} 
              alt={senderProfile.name} 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #b45309',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 10px rgba(0,0,0,0.18)'
              }} 
            />
            <div>
              {/* BIG BRAND NAME */}
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: '1.1' }}>
                {senderProfile.name}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#b45309', marginTop: '3px' }}>
                The Sacred Weaves of Maheshwar • 250+ Years Royal Living Tradition
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#1e1b4b',
            color: '#fef3c7',
            padding: '8px 18px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '900',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            boxShadow: '0 3px 8px rgba(0,0,0,0.2)'
          }}>
            ⚜️ HERITAGE OF RAJMATA AHILYABAI HOLKAR ⚜️
          </div>
        </div>

        {/* ── 2. TWO-COLUMN HERO SECTION: PORTRAIT (LEFT) + 4 EXPANDED CHRONICLE CARDS (RIGHT) ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '290px 1fr',
          gap: '20px',
          margin: '14px 0',
          alignItems: 'stretch',
          flexGrow: 1
        }}>
          
          {/* LEFT: RAJMATA AHILYABAI HOLKAR & FORT PORTRAIT (LARGE DISPLAY) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f2e6', border: '2px solid #dcd3bf', borderRadius: '10px', padding: '14px 10px' }}>
            <div style={{
              width: '265px',
              height: '355px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '3px solid #b45309',
              boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
              backgroundColor: '#ffffff'
            }}>
              <img 
                src="/ahilyabai_portrait.jpg" 
                alt="Rajmata Ahilyabai Holkar & Maheshwar Fort" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }} 
              />
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: '900',
              color: '#0f172a',
              marginTop: '10px',
              textAlign: 'center',
              lineHeight: '1.2'
            }}>
              Rajmata Devi Ahilyabai Holkar
            </div>
            <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#b45309', textAlign: 'center', marginTop: '2px' }}>
              (1725–1795) • Visionary Patron & Creator of Maheshwari Weaves
            </div>
            <div style={{
              backgroundColor: '#1e1b4b',
              color: '#fef3c7',
              padding: '3px 12px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '900',
              marginTop: '6px',
              letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}>
              ★ ORIGINATED ON THE BANKS OF NARMADA ★
            </div>
          </div>

          {/* RIGHT: 4 EXPANDED HERITAGE CHRONICLE CARDS (FILLING VERTICAL HEIGHT) */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
            
            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #dcd3bf',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#1e1b4b', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👑</span> 18th Century Royal Origin:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '600' }}>
                In the 18th century, the revered ruler Rajmata Ahilyabai Holkar invited master artisan weavers from Surat, Malwa, and Mandu to her capital Maheshwar, establishing the royal handloom weaving of silk-cotton <em>'Garbha Reshmi'</em> sarees for royal dignitaries.
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #dcd3bf',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#1e1b4b', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🏛️</span> Fort Architecture & Temple Motifs:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '600' }}>
                The iconic borders of Maheshwari sarees—<strong>Bugdi, Chatai, Chameli, Rui Phool, and Narmada Waves</strong>—are directly inspired by the stone carvings, temples, and chhatris of the majestic Maheshwar Fort.
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #dcd3bf',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#1e1b4b', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🧵</span> 100% Traditional Pit-Loom Craft:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '600' }}>
                Each garment is painstakingly handwoven on wooden pit-looms by generational artisan weaver families of Maheshwar with pure natural yarns, precision, and heartfelt devotion in every warp and weft.
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #dcd3bf',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#1e1b4b', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💎</span> Reversible Zari Border & Royal Grace:
              </div>
              <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '600' }}>
                The signature hallmark of Maheshwari weaving is its unique reversible border—wearable on either side—along with its lightweight, glossy texture, and regal elegance celebrated across generations.
              </div>
            </div>

          </div>

        </div>

        {/* ── 3. REOTI HANDLOOM MISSION / HERITAGE COMMITMENT BOX ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#f1f5f9',
          border: '1.5px solid #cbd5e1',
          borderRadius: '8px',
          padding: '10px 16px',
          margin: '4px 0 10px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '22px' }}>⚜️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '900', color: '#1e1b4b', marginBottom: '2px' }}>
              {senderProfile.name} — Authentic Heritage of Maheshwar Handloom
            </div>
            <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4', fontWeight: '600' }}>
              Reoti Handloom is committed to honoring this sacred 250+ year royal craft, providing direct livelihood to traditional master weavers of Maheshwar, and bringing 100% pure, authentic handwoven treasures directly from the looms to you.
            </div>
          </div>
        </div>

        {/* ── 4. BOTTOM HIGH-CONTRAST HIGHLIGHTED WEBSITE & CONTACT PILLS ── */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          borderTop: '2px solid #cbd5e1',
          paddingTop: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {/* HIGHLIGHTED WEBSITE BADGE */}
              <span style={{
                backgroundColor: '#fef08a',
                color: '#1e1b4b',
                border: '2px solid #b45309',
                padding: '6px 18px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '900',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(180,83,9,0.2)'
              }}>
                🌐 Website: www.reotihandloom.com
              </span>

              {/* HIGHLIGHTED WHATSAPP BADGE */}
              <span style={{
                backgroundColor: '#dcfce7',
                color: '#14532d',
                border: '2px solid #16a34a',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '900',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                💬 WhatsApp / Helpline: {senderProfile.phone}
              </span>
            </div>
            
            <div style={{ fontSize: '12px', color: '#475569', fontWeight: '700' }}>
              📍 73, Laxmibai Marg, Maheshwar (Madhya Pradesh) - 451224
            </div>
          </div>

          <div style={{
            border: '2px dashed #b45309',
            backgroundColor: '#fffbeb',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '900',
            color: '#b45309',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}>
            👑 DIRECT FROM WEAVERS OF MAHESHWAR 👑
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="parcel-slip-container" style={{ padding: '10px 0 40px 0' }}>
      
      {/* ── TOP HEADER / ACTION BAR ── */}
      <div className="d-flex justify-between align-center mb-4 flex-wrap gap-3 no-print" style={{
        background: 'var(--bg-card)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div className="d-flex align-center gap-3">
          <button 
            className="btn btn-secondary"
            onClick={onBackToHome}
            style={{ padding: '8px 14px', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={16} /> Home / Consoles
          </button>
          <div>
            <h2 className="brand-heading text-gold m-0" style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={24} style={{ color: 'var(--accent-gold)' }} />
              Parcel Dispatch Slip & Thank You Insert Generator
            </h2>
            <p className="text-muted m-0" style={{ fontSize: '0.85rem' }}>
              Sender: <strong style={{ color: activeSenderPreset === 'reoti' ? 'var(--accent-gold)' : '#f97316' }}>{senderProfile.name}</strong> • Database Parties: <strong style={{ color: 'var(--accent-emerald)' }}>{allKnownParties.length} loaded</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex align-center gap-2 flex-wrap">
          <button 
            className="btn btn-secondary"
            onClick={handleClearForm}
            title="Clear Form to create a new slip"
            style={{ fontSize: '0.85rem' }}
          >
            <RotateCcw size={14} /> New Slip
          </button>

          <button 
            className="btn btn-secondary"
            onClick={handleDownloadPDF}
            style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)' }}
            title="Download crisp PDF document"
          >
            <Download size={14} /> Save PDF
          </button>

          <button 
            className={`btn ${layoutMode === 'slip_only' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handlePrintSlipOnly}
            title="Print ONLY Page 1 (Parcel Dispatch Slip & Care Card on 1 Sheet)"
            style={{ fontSize: '0.86rem', fontWeight: '700' }}
          >
            <Tag size={15} /> 🏷️ 1. Print Slip (Sheet 1)
          </button>

          <button 
            className={`btn ${layoutMode === 'heritage_2sided_full' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handlePrintLeafletOnly}
            title="Print Page 2 (Thank You Front) & Page 3 (Maa Ahilya Back) as a 2-sided Leaflet"
            style={{ fontSize: '0.86rem', fontWeight: '700', color: layoutMode === 'heritage_2sided_full' ? '#ffffff' : 'var(--accent-gold)' }}
          >
            <Sparkles size={15} /> 🌸 2. Print 2-Sided Leaflet (Sheet 2)
          </button>

          <button 
            className={`btn ${layoutMode === 'duplex_2sheets' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handlePrintAutoDuplex}
            title="1-Click Auto Duplex Print: Sheet 1 = Slip alone, Sheet 2 = Front & Back Leaflet"
            style={{ 
              padding: '9px 18px', 
              fontSize: '0.92rem', 
              fontWeight: '800',
              boxShadow: layoutMode === 'duplex_2sheets' ? '0 4px 15px rgba(212, 175, 55, 0.35)' : 'none'
            }}
          >
            <Printer size={16} /> ⚡ Auto 2-Sheet Duplex Package
          </button>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="d-flex gap-2 mb-4 no-print" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button 
          className={`btn ${activeViewTab === 'creator' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveViewTab('creator')}
          style={{ fontSize: '0.9rem', fontWeight: '600' }}
        >
          <FileText size={16} /> Slip Creator & Print Preview
        </button>

        <button 
          className={`btn ${activeViewTab === 'saved_addresses' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveViewTab('saved_addresses')}
          style={{ fontSize: '0.9rem', fontWeight: '600' }}
        >
          <User size={16} /> Saved Address Book ({addressBook.length})
        </button>

        <button 
          className={`btn ${activeViewTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveViewTab('history')}
          style={{ fontSize: '0.9rem', fontWeight: '600' }}
        >
          <Layers size={16} /> Recent Dispatch History ({dispatchHistory.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: SLIP CREATOR & LIVE PREVIEW ───────────────────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeViewTab === 'creator' && (
        <div className="d-flex gap-4 flex-wrap" style={{ alignItems: 'flex-start' }}>
          
          {/* ── LEFT COLUMN: INPUT CONTROLS ── */}
          <div className="glass-card no-print" style={{
            flex: '1 1 440px',
            maxWidth: '520px',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}>
            
            {/* 1. SENDER SWITCHER (REOTI vs AMBEKAR) */}
            <div className="mb-4" style={{
              background: activeSenderPreset === 'reoti' ? 'rgba(212, 175, 55, 0.08)' : 'rgba(249, 115, 22, 0.08)',
              border: activeSenderPreset === 'reoti' ? '2px solid var(--accent-gold)' : '2px solid #ea580c',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              transition: 'all 0.3s ease'
            }}>
              <div className="d-flex justify-between align-center mb-3">
                <label style={{ fontSize: '0.88rem', fontWeight: '800', color: activeSenderPreset === 'reoti' ? 'var(--accent-gold)' : '#ea580c', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} /> Sender Profile ("From / Sender")
                </label>
                <span className="badge" style={{ fontSize: '0.72rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontWeight: '700' }}>
                  ✓ 1-Click Switch
                </span>
              </div>

              {/* TWO SENDER SELECTION CARDS */}
              <div className="d-flex gap-3 mb-3">
                
                {/* 1. REOTI HANDLOOM */}
                <div 
                  onClick={() => handleSelectSenderPreset('reoti')}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    border: activeSenderPreset === 'reoti' ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    background: activeSenderPreset === 'reoti' ? 'rgba(212, 175, 55, 0.18)' : 'var(--bg-input)',
                    boxShadow: activeSenderPreset === 'reoti' ? '0 4px 15px rgba(212, 175, 55, 0.25)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {activeSenderPreset === 'reoti' && (
                    <span style={{ position: 'absolute', top: '6px', right: '6px', color: 'var(--accent-gold)' }}>
                      <CheckCircle2 size={16} />
                    </span>
                  )}
                  <img 
                    src="/logo.jpg" 
                    alt="Reoti Handloom" 
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--accent-gold)',
                      marginBottom: '6px'
                    }} 
                  />
                  <span style={{ fontSize: '0.92rem', fontWeight: '800', color: activeSenderPreset === 'reoti' ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                    Reoti Handloom
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Maheshwar • 9617444445
                  </span>
                </div>

                {/* 2. AMBEKAR HANDLOOM */}
                <div 
                  onClick={() => handleSelectSenderPreset('ambekar')}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    border: activeSenderPreset === 'ambekar' ? '2px solid #ea580c' : '1px solid var(--border-color)',
                    background: activeSenderPreset === 'ambekar' ? 'rgba(249, 115, 22, 0.18)' : 'var(--bg-input)',
                    boxShadow: activeSenderPreset === 'ambekar' ? '0 4px 15px rgba(249, 115, 22, 0.25)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {activeSenderPreset === 'ambekar' && (
                    <span style={{ position: 'absolute', top: '6px', right: '6px', color: '#ea580c' }}>
                      <CheckCircle2 size={16} />
                    </span>
                  )}
                  <img 
                    src="/logo_ambekar.jpg" 
                    alt="Ambekar Handloom" 
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #ea580c',
                      marginBottom: '6px'
                    }} 
                  />
                  <span style={{ fontSize: '0.92rem', fontWeight: '800', color: activeSenderPreset === 'ambekar' ? '#ea580c' : 'var(--text-primary)' }}>
                    Ambekar Handloom
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Maheshwar • 9617444445
                  </span>
                </div>

              </div>

              {/* Editable sender inputs */}
              <div className="d-flex flex-column gap-2">
                <input 
                  type="text" 
                  value={senderProfile.name}
                  onChange={(e) => handleSaveCustomSenderProfile({ ...senderProfile, name: e.target.value })}
                  placeholder="Sender Shop Name"
                  style={{ fontSize: '0.9rem', fontWeight: '700' }}
                />
                <div className="d-flex gap-2">
                  <input 
                    type="text" 
                    value={senderProfile.cityState}
                    onChange={(e) => handleSaveCustomSenderProfile({ ...senderProfile, cityState: e.target.value })}
                    placeholder="Location (e.g. Maheshwar M.P.)"
                    style={{ flex: 2, fontSize: '0.85rem' }}
                  />
                  <input 
                    type="text" 
                    value={senderProfile.phone}
                    onChange={(e) => handleSaveCustomSenderProfile({ ...senderProfile, phone: e.target.value })}
                    placeholder="Sender Mobile No."
                    style={{ flex: 1.5, fontSize: '0.85rem', fontWeight: '700' }}
                  />
                </div>
              </div>
            </div>

            {/* 2. RECIPIENT ("SHIP TO / CONSIGNEE") FIELDS WITH REAL-TIME DATABASE AUTO-FILL */}
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-between align-center">
                <label style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  👤 Recipient Details ("Ship To / Consignee")
                </label>
                <button 
                  type="button" 
                  onClick={handleSaveToAddressBook}
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--accent-emerald)' }}
                >
                  <Save size={13} /> Save to Address Book
                </button>
              </div>

              {/* Store Filter Pills for Database matching */}
              <div className="d-flex gap-1" style={{ fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '4px', alignSelf: 'center' }}>Database Filter:</span>
                <button
                  type="button"
                  onClick={() => setPartySourceFilter('all')}
                  className={`btn ${partySourceFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  All ({allKnownParties.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPartySourceFilter('reoti')}
                  className={`btn ${partySourceFilter === 'reoti' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  Reoti
                </button>
                <button
                  type="button"
                  onClick={() => setPartySourceFilter('ambekar')}
                  className={`btn ${partySourceFilter === 'ambekar' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  Ambekar
                </button>
              </div>

              {/* Party Name Input with Inline Auto-Suggest & Datalist */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-gold)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Party / Customer Name (Type to Auto-Fill) <span style={{ color: '#ef4444' }}>*</span></span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>⚡ Database Connected</span>
                </label>
                
                <input 
                  type="text" 
                  list="parcel-customer-names-list"
                  value={recipient.partyName}
                  onChange={(e) => handlePartyNameChange(e.target.value)}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setTimeout(() => setIsNameFocused(false), 250)}
                  placeholder="Type name (e.g. Jagdamba Creation, Shilpa...)"
                  style={{ 
                    fontSize: '1.05rem', 
                    fontWeight: '800', 
                    letterSpacing: '0.3px',
                    borderColor: isNameFocused ? 'var(--accent-gold)' : ''
                  }}
                  autoComplete="off"
                />

                {/* Native Browser Datalist */}
                <datalist id="parcel-customer-names-list">
                  {allKnownParties.filter(c => c.partyName).map((c, i) => (
                    <option key={i} value={c.partyName}>
                      {c.mobile ? `Phone: ${c.mobile}` : ''} {c.address ? `| ${c.address}` : ''}
                    </option>
                  ))}
                </datalist>

                {/* Floating Suggestions Dropdown */}
                {isNameFocused && nameSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-sidebar)',
                    border: '2px solid var(--accent-gold)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    marginTop: '4px',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ padding: '6px 12px', background: 'rgba(212, 175, 55, 0.12)', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-color)' }}>
                      📋 Database Matches (Click to auto-fill address & phone):
                    </div>
                    {nameSuggestions.map((party, idx) => (
                      <div 
                        key={idx}
                        onMouseDown={() => handleSelectParty(party)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                          <div style={{ fontWeight: '800', fontSize: '0.98rem', color: 'var(--accent-gold)' }}>
                            {party.partyName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>
                            {party.address || 'No address saved'}
                          </div>
                        </div>
                        <div className="text-right" style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>📞 {party.mobile || 'No Phone'}</div>
                          <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                            {party.source}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Address Line 1 */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Full Delivery Address (Street / Area / Colony) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea 
                  rows={2}
                  value={recipient.addressLine1}
                  onChange={(e) => setRecipient({ ...recipient, addressLine1: e.target.value })}
                  placeholder="e.g. Shop No.01, Swami Shanti Prakash Shopping Center, Lohiya Market, Gandhinagar"
                  style={{ fontSize: '0.92rem', resize: 'vertical', fontWeight: '600' }}
                />
              </div>

              {/* City, State, Pincode in 1 Row */}
              <div className="d-flex gap-2">
                <div style={{ flex: 1.5 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>City</label>
                  <input 
                    type="text" 
                    value={recipient.city}
                    onChange={(e) => setRecipient({ ...recipient, city: e.target.value })}
                    placeholder="e.g. Kolhapur"
                    style={{ fontSize: '0.88rem', fontWeight: '600' }}
                  />
                </div>

                <div style={{ flex: 1.5 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>State</label>
                  <input 
                    type="text" 
                    value={recipient.state}
                    onChange={(e) => setRecipient({ ...recipient, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                    style={{ fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ flex: 1.2 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Pincode</label>
                  <input 
                    type="text" 
                    value={recipient.pincode}
                    onChange={(e) => setRecipient({ ...recipient, pincode: e.target.value })}
                    placeholder="e.g. 416119"
                    style={{ fontSize: '0.88rem', fontWeight: '700' }}
                  />
                </div>
              </div>

              {/* Mobile Number & Alternate Mobile with Phone Auto-Fill */}
              <div className="d-flex gap-2">
                <div style={{ flex: 1, position: 'relative' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>
                    Primary Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    list="parcel-customer-phones-list"
                    value={recipient.mobile}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setTimeout(() => setIsPhoneFocused(false), 250)}
                    placeholder="e.g. 8888991994"
                    style={{ fontSize: '0.95rem', fontWeight: '800' }}
                    autoComplete="off"
                  />

                  {/* Native Datalist for Phones */}
                  <datalist id="parcel-customer-phones-list">
                    {allKnownParties.filter(c => c.mobile).map((c, i) => (
                      <option key={i} value={c.mobile}>
                        {c.partyName ? `Name: ${c.partyName}` : ''} {c.address ? `| ${c.address}` : ''}
                      </option>
                    ))}
                  </datalist>

                  {/* Floating dropdown for Phone */}
                  {isPhoneFocused && phoneSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--bg-sidebar)',
                      border: '1px solid var(--accent-gold)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      marginTop: '4px',
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}>
                      {phoneSuggestions.map((party, idx) => (
                        <div 
                          key={idx}
                          onMouseDown={() => handleSelectParty(party)}
                          style={{
                            padding: '8px 10px',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ fontWeight: '700', color: 'var(--accent-gold)' }}>{party.mobile}</span> - {party.partyName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>
                    Alternate Phone (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={recipient.alternateMobile}
                    onChange={(e) => setRecipient({ ...recipient, alternateMobile: e.target.value })}
                    placeholder="e.g. 9822000000"
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Order Reference & Contents */}
              <div className="d-flex gap-2">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>
                    Invoice / Order Ref (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={recipient.orderRef}
                    onChange={(e) => setRecipient({ ...recipient, orderRef: e.target.value })}
                    placeholder="e.g. AH-2026-0045"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>
                    Parcel Contents
                  </label>
                  <input 
                    type="text" 
                    value={recipient.itemDescription}
                    onChange={(e) => setRecipient({ ...recipient, itemDescription: e.target.value })}
                    placeholder="e.g. Maheshwari Handloom Sarees / Suits"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

            </div>

            {/* 3. PRINT & SIZE CONFIGURATIONS */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-gold)', marginBottom: '8px', display: 'block' }}>
                ⚙️ Page Sizing & Print Modes
              </label>

              {/* Size Buttons */}
              <div className="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => { setLayoutMode('duplex_2sheets'); setPreviewPageFilter('all'); }}
                  className={`btn ${layoutMode === 'duplex_2sheets' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: '1 1 100%', fontSize: '0.85rem', padding: '9px 8px', fontWeight: '800' }}
                >
                  ⚡ Auto 2-Sheet Duplex (Sheet 1: Slip alone • Sheet 2: Front & Back Leaflet)
                </button>

                <button
                  type="button"
                  onClick={() => { setLayoutMode('slip_only'); setPreviewPageFilter('page1'); }}
                  className={`btn ${layoutMode === 'slip_only' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: '1 1 48%', fontSize: '0.82rem', padding: '8px 8px', fontWeight: '700' }}
                >
                  🏷️ Sheet 1 Only (Slip + Care)
                </button>

                <button
                  type="button"
                  onClick={() => { setLayoutMode('heritage_2sided_full'); setPreviewPageFilter('all'); }}
                  className={`btn ${layoutMode === 'heritage_2sided_full' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: '1 1 48%', fontSize: '0.82rem', padding: '8px 8px', fontWeight: '800', color: layoutMode === 'heritage_2sided_full' ? '#ffffff' : 'var(--accent-gold)' }}
                >
                  🌸 Sheet 2 (2-Sided Leaflet)
                </button>

                <button
                  type="button"
                  onClick={() => { setLayoutMode('pages_3_full'); setPreviewPageFilter('all'); }}
                  className={`btn ${layoutMode === 'pages_3_full' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: '1 1 100%', fontSize: '0.80rem', padding: '7px 8px' }}
                >
                  🌟 3 Sequential Pages (Page 1: Slip + Page 2: Thank You + Page 3: Maa Ahilya)
                </button>

                <button
                  type="button"
                  onClick={() => { setLayoutMode('half_with_thankyou'); setPreviewPageFilter('page1'); }}
                  className={`btn ${layoutMode === 'half_with_thankyou' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: '1 1 100%', fontSize: '0.78rem', padding: '7px 6px' }}
                >
                  📄 1 A4 Sheet: Top Slip + Bottom Care Card
                </button>

                <button
                  type="button"
                  onClick={() => { setLayoutMode('half_a4'); setPreviewPageFilter('page1'); }}
                  className={`btn ${layoutMode === 'half_a4' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: '1 1 48%', fontSize: '0.76rem', padding: '6px 4px' }}
                >
                  <Scissors size={13} style={{ marginRight: '4px' }} /> Top Slip Only (Half A4)
                </button>

                <button
                  type="button"
                  onClick={() => { setLayoutMode('double_a4'); setPreviewPageFilter('page1'); }}
                  className={`btn ${layoutMode === 'double_a4' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: '1 1 48%', fontSize: '0.76rem', padding: '6px 4px' }}
                >
                  📄 2 Slips on 1 A4
                </button>
              </div>

              {/* Toggles */}
              <div className="d-flex flex-wrap gap-3" style={{ fontSize: '0.8rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} style={{ width: 'auto' }} />
                  Store Logo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showFragileBadge} onChange={(e) => setShowFragileBadge(e.target.checked)} style={{ width: 'auto' }} />
                  Fragile Badge
                </label>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: REAL-TIME PRINT PREVIEW SHEET ── */}
          <div style={{ flex: '1 1 540px', minWidth: '320px' }}>
            
            {/* Preview Page Filter Tabs */}
            <div className="d-flex justify-between align-center mb-2 no-print flex-wrap gap-2">
              <div className="d-flex gap-1 flex-wrap">
                <button 
                  type="button" 
                  onClick={() => setPreviewPageFilter('all')}
                  className={`btn ${previewPageFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  📑 All Pages
                </button>
                {layoutMode !== 'heritage_2sided_full' && (
                  <button 
                    type="button" 
                    onClick={() => setPreviewPageFilter('page1')}
                    className={`btn ${previewPageFilter === 'page1' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  >
                    🏷️ Sheet 1 (Parcel Slip)
                  </button>
                )}
                {(layoutMode === 'duplex_2sheets' || layoutMode === 'pages_3_full' || layoutMode === 'heritage_2sided_full') && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => setPreviewPageFilter('page2')}
                      className={`btn ${previewPageFilter === 'page2' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      🌸 Sheet 2 Front (Thank You)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPreviewPageFilter('page3')}
                      className={`btn ${previewPageFilter === 'page3' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      👑 Sheet 2 Back (Maa Ahilya)
                    </button>
                  </>
                )}
              </div>

              <span style={{ fontSize: '0.75rem', color: activeSenderPreset === 'reoti' ? 'var(--accent-gold)' : '#ea580c', fontWeight: '700' }}>
                From: {senderProfile.name}
              </span>
            </div>

            {/* Printable Container in Clean White/Neutral Paper Desk Framing */}
            <div 
              id="printable-parcel-slip-content" 
              ref={printAreaRef}
              style={{
                backgroundColor: '#f1f5f9', // Clean light desk background
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                boxSizing: 'border-box',
                maxWidth: '740px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              {/* ────────────────────────────────────────────────── */}
              {/* ── SHEET 1: PARCEL DISPATCH SLIP SHEET ──────────── */}
              {/* ────────────────────────────────────────────────── */}
              {layoutMode !== 'heritage_2sided_full' && (previewPageFilter === 'all' || previewPageFilter === 'page1') && (
                <div 
                  className="parcel-slip-wrapper-sheet parcel-slip-page-1"
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top Half: Parcel Address Slip */}
                  {renderParcelSlipCard(recipient)}

                  {/* Middle Divider & Bottom Half: Customer Thank You & Care Note */}
                  {(layoutMode === 'duplex_2sheets' || layoutMode === 'half_with_thankyou' || layoutMode === 'pages_3_full' || layoutMode === 'slip_only') && (
                    <>
                      {/* Scissor Cut Guideline */}
                      <div 
                        className="scissor-cut-divider"
                        style={{
                          margin: '10px 0',
                          borderTop: '1.5px dashed #475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          backgroundColor: '#faf6ed'
                        }}
                      >
                        <span style={{
                          backgroundColor: '#faf6ed',
                          padding: '0 12px',
                          fontSize: '11px',
                          fontWeight: '900',
                          color: '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '-8px',
                          letterSpacing: '0.4px'
                        }}>
                          ✂️ CUT HERE ✂️ (Top: Paste on Outer Parcel • Bottom: Insert Inside Parcel)
                        </span>
                      </div>

                      {/* Bottom Half: Thank You & Care Insert Card */}
                      {renderThankYouInsertCard(recipient)}
                    </>
                  )}

                  {/* Second Slip if 2-up Double Slip layout selected */}
                  {layoutMode === 'double_a4' && (
                    <>
                      <div 
                        className="scissor-cut-divider"
                        style={{
                          margin: '10px 0',
                          borderTop: '1.5px dashed #000000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          backgroundColor: '#faf6ed'
                        }}
                      >
                        <span style={{
                          backgroundColor: '#faf6ed',
                          padding: '0 12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#000000',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '-8px'
                        }}>
                          ✂️ CUT ALONG DOTTED LINE ✂️
                        </span>
                      </div>

                      {renderParcelSlipCard(recipient)}
                    </>
                  )}

                  {/* Single Half-A4 Cut Guide when printing ONLY 1 slip */}
                  {layoutMode === 'half_a4' && (
                    <div className="no-print-screen scissor-cut-divider" style={{
                      marginTop: '20px',
                      borderTop: '2px dashed #666666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      backgroundColor: '#faf6ed'
                    }}>
                      <span style={{
                        backgroundColor: '#faf6ed',
                        padding: '0 10px',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#666666',
                        marginTop: '-9px'
                      }}>
                        ✂️ CUT HERE & PASTE TOP HALF ON PARCEL ✂️
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* ── SHEET 1 BACK: BLANK SPACER (FOR 2-SHEET AUTO DUPLEX) ────── */}
              {/* ───────────────────────────────────────────────────────────── */}
              {layoutMode === 'duplex_2sheets' && previewPageFilter === 'all' && (
                <div 
                  className="parcel-slip-wrapper-sheet duplex-blank-spacer"
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '24px 16px',
                    borderRadius: '8px',
                    border: '1.5px dashed #cbd5e1',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div className="no-print" style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    margin: 'auto',
                    maxWidth: '480px'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                      📄 Sheet 1 Back Side (Blank Spacer for 2-Sided Duplex Printers)
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                      This blank page ensures that <strong>Sheet 1 (Parcel Slip)</strong> prints as a single sheet, while <strong>Sheet 2</strong> prints <strong>Thank You (Front)</strong> and <strong>Maa Ahilya (Back)</strong> on a separate 2-sided paper!
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────── */}
              {/* ── VISUAL SEPARATOR: SHEET 2 (FRONT SIDE) ──────── */}
              {/* ────────────────────────────────────────────────── */}
              {(layoutMode === 'duplex_2sheets' || layoutMode === 'pages_3_full') && previewPageFilter === 'all' && (
                <div className="no-print text-center py-2" style={{ borderTop: '2px dashed rgba(212, 175, 55, 0.4)', borderBottom: '2px dashed rgba(212, 175, 55, 0.4)', margin: '4px 0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-gold)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    ✦ SHEET 2 (FRONT SIDE): FULL A4 THANK YOU LEAFLET ✦
                  </span>
                </div>
              )}

              {/* ────────────────────────────────────────────────── */}
              {/* ── SHEET 2 FRONT: FULL A4 THANK YOU LEAFLET ────── */}
              {/* ────────────────────────────────────────────────── */}
              {(layoutMode === 'duplex_2sheets' || layoutMode === 'pages_3_full' || layoutMode === 'heritage_2sided_full') && (previewPageFilter === 'all' || previewPageFilter === 'page2') && (
                <div 
                  className="parcel-slip-wrapper-sheet parcel-slip-page-2"
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                  }}
                >
                  {renderHeritageThankYouFront(recipient)}
                </div>
              )}

              {/* ────────────────────────────────────────────────── */}
              {/* ── VISUAL SEPARATOR: SHEET 2 (BACK SIDE) ───────── */}
              {/* ────────────────────────────────────────────────── */}
              {(layoutMode === 'duplex_2sheets' || layoutMode === 'pages_3_full' || layoutMode === 'heritage_2sided_full') && previewPageFilter === 'all' && (
                <div className="no-print text-center py-2" style={{ borderTop: '2px dashed rgba(212, 175, 55, 0.4)', borderBottom: '2px dashed rgba(212, 175, 55, 0.4)', margin: '4px 0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-gold)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    ✦ SHEET 2 (BACK SIDE): FULL A4 MAA AHILYA & MAHESHWAR FORT HERITAGE ✦
                  </span>
                </div>
              )}

              {/* ────────────────────────────────────────────────── */}
              {/* ── SHEET 2 BACK: FULL A4 MAA AHILYA & FORT ─────── */}
              {/* ────────────────────────────────────────────────── */}
              {(layoutMode === 'duplex_2sheets' || layoutMode === 'pages_3_full' || layoutMode === 'heritage_2sided_full') && (previewPageFilter === 'all' || previewPageFilter === 'page3') && (
                <div 
                  className="parcel-slip-wrapper-sheet parcel-slip-page-3"
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                  }}
                >
                  {renderAhilyaMaHeritageBack(recipient)}
                </div>
              )}

            </div>

            {/* Bottom Quick Print Action Bar */}
            <div className="text-center mt-4 no-print d-flex justify-center gap-2 flex-wrap">
              <button 
                className="btn btn-secondary"
                onClick={handlePrintSlipOnly}
                style={{ padding: '12px 20px', fontSize: '0.95rem', fontWeight: '800' }}
              >
                🏷️ 1. Print Slip (Sheet 1)
              </button>

              <button 
                className="btn btn-secondary"
                onClick={handlePrintLeafletOnly}
                style={{ padding: '12px 20px', fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-gold)' }}
              >
                🌸 2. Print 2-Sided Leaflet (Sheet 2 Front & Back)
              </button>

              <button 
                className="btn btn-primary"
                onClick={handlePrintAutoDuplex}
                style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: '800' }}
              >
                <Printer size={18} /> ⚡ Auto 2-Sheet Duplex Package
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: SAVED ADDRESS BOOK ─────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeViewTab === 'saved_addresses' && (
        <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div className="d-flex justify-between align-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-gold m-0" style={{ fontSize: '1.3rem' }}>Permanent Party Address Directory</h3>
              <p className="text-muted m-0" style={{ fontSize: '0.85rem' }}>Saved customer & party addresses ready for instant 1-click parcel slip printing</p>
            </div>
          </div>

          {addressBook.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <User size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>No addresses saved in address book yet.</p>
              <p style={{ fontSize: '0.85rem' }}>You can create a slip and click "Save to Address Book", or use party suggestions from existing invoices!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '10px' }}>Party Name</th>
                    <th style={{ padding: '10px' }}>Delivery Address</th>
                    <th style={{ padding: '10px' }}>City / State</th>
                    <th style={{ padding: '10px' }}>Mobile Number</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {addressBook.map((addr) => (
                    <tr key={addr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                        {addr.partyName}
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '0.88rem' }}>
                        {addr.addressLine1} {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '0.85rem' }}>
                        {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                        {addr.mobile}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div className="d-flex gap-2 justify-end">
                          <button 
                            className="btn btn-primary"
                            onClick={() => {
                              setRecipient(prev => ({
                                ...prev,
                                partyName: addr.partyName,
                                addressLine1: addr.addressLine1 || '',
                                addressLine2: addr.addressLine2 || '',
                                city: addr.city || '',
                                state: addr.state || 'Madhya Pradesh',
                                pincode: addr.pincode || '',
                                mobile: addr.mobile || '',
                                alternateMobile: addr.alternateMobile || ''
                              }));
                              setActiveViewTab('creator');
                            }}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            <Printer size={14} /> Use & Print
                          </button>
                          <button 
                            className="btn btn-danger"
                            onClick={() => handleDeleteAddressBookEntry(addr.id)}
                            style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                            title="Delete address"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: DISPATCH HISTORY ───────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeViewTab === 'history' && (
        <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div className="d-flex justify-between align-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-gold m-0" style={{ fontSize: '1.3rem' }}>Recent Parcel Dispatches</h3>
              <p className="text-muted m-0" style={{ fontSize: '0.85rem' }}>Log of generated and printed shipping labels</p>
            </div>
          </div>

          {dispatchHistory.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>No dispatch history logged yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '10px' }}>Date & Time</th>
                    <th style={{ padding: '10px' }}>Party Name</th>
                    <th style={{ padding: '10px' }}>Destination</th>
                    <th style={{ padding: '10px' }}>Mobile</th>
                    <th style={{ padding: '10px' }}>Sender</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchHistory.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {item.date} {item.time}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                        {item.partyName}
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '0.88rem' }}>
                        {item.city}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                        {item.mobile}
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '0.85rem' }}>
                        {item.senderName}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => {
                            if (item.fullRecipient) {
                              setRecipient(item.fullRecipient);
                              setActiveViewTab('creator');
                            }
                          }}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          <RotateCcw size={14} /> Re-print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BROWSER PRINT STYLES (FULL A4 ROYAL COVERAGE & EXACT SAGE FRAMING) ── */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-parcel-slip-content,
          #printable-parcel-slip-content * {
            visibility: visible !important;
          }
          #printable-parcel-slip-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            display: block !important;
          }
          .parcel-slip-wrapper-sheet {
            height: 290mm !important;
            min-height: 290mm !important;
            max-height: 290mm !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 0 !important;
            margin: 0 0 0 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .parcel-slip-wrapper-sheet:last-of-type,
          .parcel-slip-page-3 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .duplex-blank-spacer {
            height: 290mm !important;
            min-height: 290mm !important;
            max-height: 290mm !important;
            width: 100% !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            visibility: hidden !important;
          }
          .full-a4-thankyou-front,
          .full-a4-ahilyama-back {
            height: 285mm !important;
            min-height: 285mm !important;
            max-height: 285mm !important;
            box-sizing: border-box !important;
            background-color: #faf6ed !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 7mm 9mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .parcel-slip-paper,
          .thankyou-insert-card {
            height: 139mm !important;
            min-height: 139mm !important;
            max-height: 139mm !important;
            box-sizing: border-box !important;
            background-color: #faf6ed !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .scissor-cut-divider {
            height: 6mm !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 3.5mm;
          }
        }
      `}</style>

    </div>
  );
}
