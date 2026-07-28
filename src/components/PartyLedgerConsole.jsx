import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Printer, 
  Download, 
  Trash2, 
  Calendar, 
  User, 
  MapPin, 
  Phone,
  Mail,
  Building
} from 'lucide-react';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

// Helper to format date strings to DD-MMM-YY format e.g., 8-Jul-24 or 08-Jul-2024
const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

export default function PartyLedgerConsole({ 
  invoices = [], 
  ledgerEntries = [], 
  settings = {}, 
  systemMode = 'reoti',
  onSaveLedgerEntry, 
  onDeleteLedgerEntry 
}) {
  // Extract all unique party names from invoices and ledger entries
  const existingParties = useMemo(() => {
    const set = new Set();
    invoices.forEach(inv => {
      if (inv.customerName && inv.customerName.trim()) {
        set.add(inv.customerName.trim());
      }
    });
    ledgerEntries.forEach(ent => {
      if (ent.partyName && ent.partyName.trim()) {
        set.add(ent.partyName.trim());
      }
    });
    return Array.from(set).sort();
  }, [invoices, ledgerEntries]);

  // Selected party state
  const [selectedParty, setSelectedParty] = useState(existingParties[0] || 'Samasta');
  const [partyAddress, setPartyAddress] = useState('No-29, C.P.Ramaswamy Road, Alwarpet, Chennai-18.');
  
  // Date range filters
  const [fromDate, setFromDate] = useState('2024-04-01');
  const [toDate, setToDate] = useState('2026-03-31');

  // New Voucher entry modal/form state
  const [isAddingVoucher, setIsAddingVoucher] = useState(false);
  const [newVoucher, setNewVoucher] = useState({
    date: new Date().toISOString().split('T')[0],
    vchType: 'Payment',
    vchNo: '',
    particulars: 'SBI - CC-42476655602',
    debit: '',
    credit: '',
    drCr: 'Cr'
  });

  // Auto-sync Party Address from existing invoices if available
  useMemo(() => {
    if (selectedParty) {
      const match = invoices.find(inv => inv.customerName && inv.customerName.trim().toLowerCase() === selectedParty.trim().toLowerCase() && inv.customerAddress);
      if (match && match.customerAddress) {
        setPartyAddress(match.customerAddress);
      }
    }
  }, [selectedParty, invoices]);

  // Combine invoices and manual ledger entries for selected party
  const partyTransactions = useMemo(() => {
    if (!selectedParty) return [];

    const partyNorm = selectedParty.trim().toLowerCase();
    const list = [];

    // 1. Convert Invoices to Ledger Vouchers
    invoices.forEach(inv => {
      if (inv.customerName && inv.customerName.trim().toLowerCase() === partyNorm) {
        const isCN = inv.isCreditNote || (inv.invoiceNo && inv.invoiceNo.includes('CN')) || systemMode === 'reoti_cn';
        const isPN = inv.isPurchaseNote || (inv.invoiceNo && inv.invoiceNo.includes('PN')) || systemMode === 'ambekar_pn';
        
        let vchType = 'Purchase';
        let drCr = 'Dr';
        let debit = 0;
        let credit = 0;
        const total = parseFloat(inv.grandTotal) || 0;

        if (isCN) {
          vchType = 'Credit Note';
          drCr = 'Cr';
          debit = total;
        } else if (isPN) {
          vchType = 'Purchase Note';
          drCr = 'Dr';
          debit = total;
        } else {
          vchType = 'Purchase';
          drCr = 'Dr';
          credit = total;
        }

        list.push({
          id: `inv_${inv.invoiceNo}`,
          isAutoBill: true,
          date: inv.date || '',
          drCr,
          particulars: `Interstate -Reg Dealer Purchase @5%`,
          vchType,
          vchNo: inv.invoiceNo ? inv.invoiceNo.replace(/[^0-9]/g, '') || inv.invoiceNo : '',
          debit,
          credit,
          rawDate: new Date(inv.date || '2000-01-01').getTime()
        });
      }
    });

    // 2. Add manual ledger vouchers
    ledgerEntries.forEach(ent => {
      if (ent.partyName && ent.partyName.trim().toLowerCase() === partyNorm) {
        list.push({
          id: ent.id,
          isAutoBill: false,
          date: ent.date || '',
          drCr: ent.drCr || (parseFloat(ent.debit) > 0 ? 'Dr' : 'Cr'),
          particulars: ent.particulars || '',
          vchType: ent.vchType || 'Payment',
          vchNo: ent.vchNo || '',
          debit: parseFloat(ent.debit) || 0,
          credit: parseFloat(ent.credit) || 0,
          rawDate: new Date(ent.date || '2000-01-01').getTime()
        });
      }
    });

    return list.sort((a, b) => a.rawDate - b.rawDate);
  }, [selectedParty, invoices, ledgerEntries, systemMode]);

  // Filter transactions within selected Date Range
  const filteredTransactions = useMemo(() => {
    if (!fromDate && !toDate) return partyTransactions;
    const fromTime = fromDate ? new Date(fromDate).getTime() : 0;
    const toTime = toDate ? new Date(toDate + 'T23:59:59').getTime() : Infinity;

    return partyTransactions.filter(tx => {
      if (!tx.date) return true;
      const t = new Date(tx.date).getTime();
      return t >= fromTime && t <= toTime;
    });
  }, [partyTransactions, fromDate, toDate]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    filteredTransactions.forEach(tx => {
      totalDebit += tx.debit || 0;
      totalCredit += tx.credit || 0;
    });

    const closingBalance = Math.abs(totalCredit - totalDebit);
    const balanceDrCr = totalCredit >= totalDebit ? 'Cr' : 'Dr';

    return {
      totalDebit,
      totalCredit,
      closingBalance,
      balanceDrCr
    };
  }, [filteredTransactions]);

  // Handle Save New Manual Voucher
  const handleCreateVoucherSubmit = (e) => {
    e.preventDefault();
    if (!selectedParty) {
      alert("Please select or enter a party name first.");
      return;
    }

    const deb = parseFloat(newVoucher.debit) || 0;
    const cred = parseFloat(newVoucher.credit) || 0;

    const entryToSave = {
      id: `ledg_${Date.now()}`,
      partyName: selectedParty,
      date: newVoucher.date,
      vchType: newVoucher.vchType,
      vchNo: newVoucher.vchNo,
      particulars: newVoucher.particulars,
      drCr: newVoucher.drCr,
      debit: deb,
      credit: cred
    };

    if (onSaveLedgerEntry) {
      onSaveLedgerEntry(entryToSave);
    }

    setIsAddingVoucher(false);
    setNewVoucher({
      date: new Date().toISOString().split('T')[0],
      vchType: 'Payment',
      vchNo: '',
      particulars: 'SBI - CC-42476655602',
      debit: '',
      credit: '',
      drCr: 'Cr'
    });
  };

  // Print & PDF Handlers
  const handlePrintLedger = () => {
    window.print();
  };

  const handleDownloadLedgerPDF = () => {
    const element = document.getElementById('printable-ledger-statement');
    const filename = `Ledger_${selectedParty.replace(/\s+/g, '_')}.pdf`;
    const opt = {
      margin:       [5, 5, 5, 5],
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2.5, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const isAmbekar = systemMode === 'ambekar' || systemMode === 'ambekar_pn';
  const activeShopName = settings.shopName || (isAmbekar ? 'Ambekar Handloom House' : 'Reoti Handloom');
  const activeLogo = isAmbekar ? '/logo_ambekar.jpg' : '/logo.jpg';

  return (
    <div className="ledger-console-container" style={{ padding: '10px 0' }}>
      
      {/* Top Filter & Actions Header Bar */}
      <div className="glass-card no-print mb-4" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="d-flex justify-between align-center flex-wrap gap-3">
          <div>
            <h2 className="brand-heading d-flex align-center gap-2" style={{ fontSize: '1.4rem', color: 'var(--accent-gold)' }}>
              <BookOpen size={24} /> Party Ledger Account (खाता विवरण)
            </h2>
            <p className="text-muted" style={{ fontSize: '0.85rem', margin: '2px 0 0 0' }}>
              Issued by <strong>{activeShopName}</strong> for customer & supplier statement tracking.
            </p>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <button 
              className="btn btn-emerald" 
              onClick={() => setIsAddingVoucher(true)}
              style={{ fontWeight: '600', padding: '9px 16px' }}
            >
              <Plus size={18} /> Add Payment / Voucher Entry
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={handlePrintLedger}
              style={{ fontWeight: '600', padding: '9px 16px' }}
            >
              <Printer size={18} /> Print Statement
            </button>

            <button 
              className="btn btn-primary" 
              onClick={handleDownloadLedgerPDF}
              style={{ fontWeight: '600', padding: '9px 16px' }}
            >
              <Download size={18} /> Export PDF
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid-responsive gap-3 mt-4" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr 1fr', alignItems: 'end' }}>
          
          {/* Party Selector */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              <User size={14} style={{ display: 'inline', marginRight: '4px' }} /> Party / Customer Name
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                list="party-options"
                className="input-field w-full"
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                placeholder="Type or select Party Name..."
                style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}
              />
              <datalist id="party-options">
                {existingParties.map((p, idx) => (
                  <option key={idx} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Party Address */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> Party Address / Location
            </label>
            <input 
              type="text"
              className="input-field w-full"
              value={partyAddress}
              onChange={(e) => setPartyAddress(e.target.value)}
              placeholder="e.g. No-29, C.P.Ramaswamy Road, Alwarpet, Chennai-18."
              style={{ fontSize: '0.88rem' }}
            />
          </div>

          {/* Date From */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> From Date
            </label>
            <input 
              type="date"
              className="input-field w-full"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ fontSize: '0.88rem' }}
            />
          </div>

          {/* Date To */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> To Date
            </label>
            <input 
              type="date"
              className="input-field w-full"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ fontSize: '0.88rem' }}
            />
          </div>
        </div>
      </div>

      {/* Add New Voucher Entry Form Modal */}
      {isAddingVoucher && (
        <div className="modal-overlay no-print">
          <div className="modal-content" style={{ maxWidth: '550px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="brand-heading d-flex align-center gap-2">
                <Plus size={20} /> Add Ledger Voucher Entry
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAddingVoucher(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateVoucherSubmit} style={{ padding: '20px' }}>
              <div className="mb-3">
                <label style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Party Name
                </label>
                <input 
                  type="text" 
                  className="input-field w-full" 
                  value={selectedParty} 
                  onChange={(e) => setSelectedParty(e.target.value)} 
                  required 
                />
              </div>

              <div className="grid-responsive gap-3 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                    Voucher Date
                  </label>
                  <input 
                    type="date" 
                    className="input-field w-full" 
                    value={newVoucher.date} 
                    onChange={(e) => setNewVoucher({...newVoucher, date: e.target.value})} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                    Voucher Type
                  </label>
                  <select 
                    className="input-field w-full" 
                    value={newVoucher.vchType} 
                    onChange={(e) => setNewVoucher({...newVoucher, vchType: e.target.value})}
                  >
                    <option value="Payment">Payment</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Sales">Sales</option>
                    <option value="Debit Note">Debit Note</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Opening Balance">Opening Balance</option>
                  </select>
                </div>
              </div>

              <div className="grid-responsive gap-3 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                    Vch No. (Optional)
                  </label>
                  <input 
                    type="text" 
                    className="input-field w-full" 
                    placeholder="e.g. 505" 
                    value={newVoucher.vchNo} 
                    onChange={(e) => setNewVoucher({...newVoucher, vchNo: e.target.value})} 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                    Dr / Cr Mode
                  </label>
                  <select 
                    className="input-field w-full" 
                    value={newVoucher.drCr} 
                    onChange={(e) => setNewVoucher({...newVoucher, drCr: e.target.value})}
                  >
                    <option value="Cr">Cr (Credit Entry)</option>
                    <option value="Dr">Dr (Debit Entry)</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Particulars / Description
                </label>
                <input 
                  type="text" 
                  className="input-field w-full" 
                  placeholder="e.g. SBI - CC-42476655602, IDBI Current A/c 15057" 
                  value={newVoucher.particulars} 
                  onChange={(e) => setNewVoucher({...newVoucher, particulars: e.target.value})} 
                  required 
                />
              </div>

              <div className="grid-responsive gap-3 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '4px', color: '#10b981' }}>
                    Debit Amount (₹)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input-field w-full" 
                    placeholder="0.00" 
                    value={newVoucher.debit} 
                    onChange={(e) => setNewVoucher({...newVoucher, debit: e.target.value, credit: e.target.value ? '' : newVoucher.credit, drCr: 'Dr'})} 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '4px', color: '#ef4444' }}>
                    Credit Amount (₹)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input-field w-full" 
                    placeholder="0.00" 
                    value={newVoucher.credit} 
                    onChange={(e) => setNewVoucher({...newVoucher, credit: e.target.value, debit: e.target.value ? '' : newVoucher.debit, drCr: 'Cr'})} 
                  />
                </div>
              </div>

              <div className="d-flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddingVoucher(false)}>Cancel</button>
                <button type="submit" className="btn btn-emerald">Save Entry to Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Royal Theme Matched Printable Statement Paper */}
      <div 
        id="printable-ledger-statement" 
        className="ledger-print-paper"
        style={{
          background: '#fdfaf2',
          color: '#4a2c11',
          padding: '24px 30px',
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          borderRadius: '6px',
          margin: '0 auto',
          maxWidth: '920px',
          border: '3px double #b45309',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* 1. TOP HEADER: Reoti Handloom Official Business Branding */}
        <div style={{
          backgroundColor: '#fffef9',
          borderRadius: '6px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '16px',
          alignItems: 'center',
          border: '1px solid #b45309',
          boxShadow: 'inset 0 0 0 2px #fef3c7, 0 2px 6px rgba(180,83,9,0.08)'
        }}>
          {/* Shop Logo & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src={activeLogo} alt="Logo" style={{ height: '76px', width: '76px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #b45309', backgroundColor: '#ffffff', padding: '3px', flexShrink: 0 }} />
            <div>
              <h1 className="brand-heading" style={{ fontSize: '1.85rem', color: '#78350f', fontWeight: '800', margin: 0, lineHeight: '1.05' }}>
                {activeShopName}
              </h1>
              <div className="gold-badge" style={{ backgroundColor: '#fef3c7', color: '#78350f', border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700', marginTop: '4px', display: 'inline-block' }}>
                ✨ Something "MORE" In Maheshwari Handloom
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', fontWeight: '600', color: '#451a03' }}>
                Manufacturer of Maheshwari Handloom Sarees, Suits & Fabrics
              </p>
            </div>
          </div>

          {/* Shop Address & GSTIN Box */}
          <div style={{
            backgroundColor: '#fef7e6',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '0.78rem',
            color: '#451a03',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #fed7aa', paddingBottom: '3px' }}>
              <span>📍</span>
              <span style={{ fontWeight: '600' }}>{settings.shopAddress || '73, LaxmiBai Marg, Maheshwar, MP'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #fed7aa', paddingBottom: '3px' }}>
              <span>📞</span>
              <span style={{ fontWeight: '700' }}>+{settings.shopPhone || '91-9617444445'}</span>
            </div>
            {settings.shopGSTIN && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🏛️</span>
                <span style={{ fontWeight: '800', color: '#78350f' }}>GSTIN: {settings.shopGSTIN}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. LEDGER TITLE BANNER */}
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '5px',
          padding: '8px 14px',
          marginBottom: '14px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📜 LEDGER ACCOUNT STATEMENT (खाता विवरण)
            </h2>
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#451a03' }}>
            Period: <strong>{fromDate ? formatDateShort(fromDate) : '01-Apr-2024'}</strong> to <strong>{toDate ? formatDateShort(toDate) : '31-Mar-2026'}</strong>
          </div>
        </div>

        {/* 3. CUSTOMER / PARTY ACCOUNT CARD */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '16px',
          backgroundColor: '#ffffff',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>
              Account Statement For (Customer / Party):
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>
              {selectedParty || 'Samasta'}
            </div>
            {partyAddress && (
              <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '2px', fontWeight: '500' }}>
                📍 {partyAddress}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', borderLeft: '2px solid #f1f5f9', paddingLeft: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Closing Balance</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: totals.balanceDrCr === 'Cr' ? '#059669' : '#dc2626' }}>
              ₹{totals.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({totals.balanceDrCr})
            </div>
          </div>
        </div>

        {/* 4. MAIN TRANSACTIONS TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #94a3b8', borderBottom: '2px solid #94a3b8' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '7px 8px', textAlign: 'center', width: '11%', fontWeight: '700' }}>Date</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'left', width: '45%', fontWeight: '700' }}>Particulars / Description</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '7px 8px', textAlign: 'center', width: '14%', fontWeight: '700' }}>Vch Type</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '7px 8px', textAlign: 'center', width: '10%', fontWeight: '700' }}>Vch No</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'right', width: '10%', fontWeight: '700', color: '#059669' }}>Debit (₹)</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'right', width: '10%', fontWeight: '700', color: '#dc2626' }}>Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', backgroundColor: '#fff' }}>
                  No transaction records found for <strong>{selectedParty}</strong> in selected period.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: '500' }}>
                    {formatDateShort(tx.date)}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 10px', fontWeight: '600', color: '#1e293b' }}>
                    {tx.particulars}
                    {!tx.isAutoBill && (
                      <button 
                        className="no-print" 
                        onClick={() => onDeleteLedgerEntry && onDeleteLedgerEntry(tx.id)}
                        title="Delete entry"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '8px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>
                    <span style={{
                      backgroundColor: tx.vchType === 'Purchase' || tx.vchType === 'Purchase Note' ? '#eff6ff' : (tx.vchType === 'Credit Note' ? '#fef2f2' : '#f0fdf4'),
                      color: tx.vchType === 'Purchase' || tx.vchType === 'Purchase Note' ? '#1d4ed8' : (tx.vchType === 'Credit Note' ? '#dc2626' : '#15803d'),
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      {tx.vchType}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                    {tx.vchNo || '-'}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: tx.debit > 0 ? '#059669' : '#94a3b8' }}>
                    {tx.debit > 0 ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: tx.credit > 0 ? '#dc2626' : '#94a3b8' }}>
                    {tx.credit > 0 ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredTransactions.length > 0 && (
            <tfoot>
              {/* Row 1: Subtotals */}
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                <td colSpan={4} style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'right' }}>Total Transactions Sum:</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'right', color: '#059669' }}>
                  ₹{totals.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '7px 10px', textAlign: 'right', color: '#dc2626' }}>
                  ₹{totals.credit !== undefined ? totals.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : totals.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 2: Closing Balance */}
              <tr style={{ backgroundColor: '#fef3c7', fontWeight: 'bold' }}>
                <td colSpan={4} style={{ border: '1px solid #f59e0b', padding: '7px 10px', textAlign: 'right', color: '#78350f' }}>
                  Closing Account Balance ({totals.balanceDrCr}):
                </td>
                {totals.balanceDrCr === 'Cr' ? (
                  <>
                    <td style={{ border: '1px solid #f59e0b', padding: '7px 10px', textAlign: 'right', color: '#059669' }}>
                      ₹{totals.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #f59e0b', padding: '7px 10px' }}></td>
                  </>
                ) : (
                  <>
                    <td style={{ border: '1px solid #f59e0b', padding: '7px 10px' }}></td>
                    <td style={{ border: '1px solid #f59e0b', padding: '7px 10px', textAlign: 'right', color: '#dc2626' }}>
                      ₹{totals.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </>
                )}
              </tr>

              {/* Row 3: Grand Net Total */}
              <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold', fontSize: '0.88rem' }}>
                <td colSpan={4} style={{ border: '2px solid #475569', padding: '8px 10px', textAlign: 'right' }}>Net Balanced Ledger Total:</td>
                <td style={{ border: '2px solid #475569', padding: '8px 10px', textAlign: 'right' }}>
                  ₹{Math.max(totals.totalDebit, totals.totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ border: '2px solid #475569', padding: '8px 10px', textAlign: 'right' }}>
                  ₹{Math.max(totals.totalDebit, totals.totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* 5. FOOTER SIGNATURE & TERMS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginTop: '20px', fontSize: '0.78rem', color: '#475569' }}>
          <div>
            <div style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: '#1e293b' }}>Note & Verification:</div>
            <div>
              1. This is a computer-generated ledger statement issued by <strong>{activeShopName}</strong>.<br />
              2. Please inform us within 7 days in case of any discrepancy in transaction balance.
            </div>
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', alignItems: 'center' }}>
            <div>For <strong>{activeShopName}</strong></div>
            <div style={{ height: '35px' }}></div>
            <div style={{ borderTop: '1px solid #94a3b8', width: '80%', paddingTop: '3px', fontWeight: '600' }}>
              Authorized Signatory
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
