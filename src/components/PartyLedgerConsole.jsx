import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Printer, 
  Download, 
  Trash2, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownLeft,
  FileText
} from 'lucide-react';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';
import { formatCurrency } from '../utils';

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
  
  // Date range filters (default to financial year 1-Apr-2024 to 31-Mar-2026 as in screenshot)
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

  // Calculate Party Address from existing invoices if available
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
          // Standard Sales Invoice
          vchType = 'Purchase'; // From customer's dealer perspective or Sales
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

    // Sort chronologically by date
    return list.sort((a, b) => a.rawDate - b.rawDate);
  }, [selectedParty, invoices, ledgerEntries, systemMode]);

  // Filter transactions within selected Date Range & group by financial periods if needed
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

  const activeShopName = settings.shopName || 'Reoti Handlooms';

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
              Select a customer or supplier to view, print, or download their complete Tally-style ledger statement.
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
              <User size={14} style={{ display: 'inline', marginRight: '4px' }} /> Select Party / Customer Name
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
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> Party Address / City
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

      {/* Printable / Viewable Tally-style Statement Paper Document */}
      <div 
        id="printable-ledger-statement" 
        className="ledger-print-paper"
        style={{
          background: '#ffffff',
          color: '#000000',
          padding: '40px 45px',
          fontFamily: "'Courier New', Courier, monospace, Arial, sans-serif",
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          margin: '0 auto',
          maxWidth: '900px',
          boxSizing: 'border-box'
        }}
      >
        {/* Top Centered Header - Party Name, Address, Shop Name */}
        <div style={{ textAlign: 'center', marginBottom: '22px', lineHeight: '1.3' }}>
          <h1 style={{ margin: '0 0 2px 0', fontSize: '1.45rem', fontWeight: 'bold', letterSpacing: '0.3px' }}>
            {selectedParty || 'Samasta'}
          </h1>
          {partyAddress && (
            <div style={{ fontSize: '0.92rem', color: '#222222', whiteSpace: 'pre-line', margin: '0 0 8px 0' }}>
              {partyAddress}
            </div>
          )}

          <h2 style={{ margin: '6px 0 2px 0', fontSize: '1.25rem', fontWeight: 'bold' }}>
            {activeShopName}
          </h2>
          <div style={{ fontSize: '1rem', fontStyle: 'italic', margin: '0 0 10px 0' }}>
            Ledger Account
          </div>

          <div style={{ fontSize: '0.88rem', marginTop: '6px' }}>
            {fromDate ? formatDateShort(fromDate) : '1-Apr-24'} to {toDate ? formatDateShort(toDate) : '31-Mar-26'}
          </div>
        </div>

        {/* Page Number Right Align */}
        <div style={{ textAlign: 'right', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 'bold' }}>
          Page 1
        </div>

        {/* Main Ledger Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '6px 4px', textAlign: 'right', width: '10%' }}>Date</th>
              <th style={{ padding: '6px 4px', textAlign: 'left', width: '48%' }}>Particulars</th>
              <th style={{ padding: '6px 4px', textAlign: 'left', width: '15%' }}>Vch Type</th>
              <th style={{ padding: '6px 4px', textAlign: 'right', width: '9%' }}>Vch No.</th>
              <th style={{ padding: '6px 4px', textAlign: 'right', width: '9%' }}>Debit</th>
              <th style={{ padding: '6px 4px', textAlign: 'right', width: '9%' }}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px 10px', color: '#666' }}>
                  No transaction ledger records found for <strong>{selectedParty}</strong> in selected period.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx, idx) => (
                <tr key={idx} style={{ verticalAlign: 'top' }}>
                  {/* Date with Dr/Cr indicator */}
                  <td style={{ padding: '3px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {formatDateShort(tx.date)} <span style={{ fontWeight: 'bold' }}>{tx.drCr || 'Dr'}</span>
                  </td>

                  {/* Particulars */}
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>
                    {tx.particulars}
                    {!tx.isAutoBill && (
                      <button 
                        className="no-print" 
                        onClick={() => onDeleteLedgerEntry && onDeleteLedgerEntry(tx.id)}
                        title="Delete entry"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '8px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>

                  {/* Vch Type */}
                  <td style={{ padding: '3px 4px', fontWeight: 'bold' }}>
                    {tx.vchType}
                  </td>

                  {/* Vch No */}
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                    {tx.vchNo}
                  </td>

                  {/* Debit */}
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                    {tx.debit > 0 ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  </td>

                  {/* Credit */}
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                    {tx.credit > 0 ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Subtotals & Closing Balance Summary Section */}
          {filteredTransactions.length > 0 && (
            <tfoot>
              {/* Row 1: Subtotal of Debit & Credit */}
              <tr style={{ borderTop: '1px solid #000' }}>
                <td colSpan={4}></td>
                <td style={{ padding: '4px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                  {totals.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '4px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                  {totals.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 2: Closing Balance */}
              <tr>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{totals.balanceDrCr}</td>
                <td colSpan={3} style={{ padding: '2px 4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Closing Balance
                </td>
                {totals.balanceDrCr === 'Cr' ? (
                  <>
                    <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {totals.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </>
                ) : (
                  <>
                    <td></td>
                    <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {totals.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </>
                )}
              </tr>

              {/* Row 3: Double Line Total Balancing */}
              <tr style={{ borderTop: '1px solid #000', borderBottom: '3px double #000', fontWeight: 'bold' }}>
                <td colSpan={4}></td>
                <td style={{ padding: '4px 4px', textAlign: 'right' }}>
                  {Math.max(totals.totalDebit, totals.totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '4px 4px', textAlign: 'right' }}>
                  {Math.max(totals.totalDebit, totals.totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
}
