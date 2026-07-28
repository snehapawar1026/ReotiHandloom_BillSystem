import React, { useState } from 'react';
import { Search, Eye, Edit3, Trash2, Download, Plus, FileText, Calendar, CreditCard, User, Phone, MapPin } from 'lucide-react';
import { formatCurrency } from '../utils';

export default function InvoiceList({ invoices = [], onSelectInvoice, onEditInvoice, onDeleteInvoice, onSaveInvoice, onViewInLedger }) {

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State for manual old bill creation modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualBill, setManualBill] = useState({
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerGSTIN: '',
    particulars: 'Interstate -Reg Dealer Purchase @5%',
    grandTotal: '',
    paymentMode: 'Cash',
    paymentStatus: 'Paid',
    paidAmount: '',
    remarks: 'Manual Past Bill Entry'
  });

  const handleSettleUdhar = (inv) => {
    const grandTotal = parseFloat(inv.grandTotal) || 0;
    const currentPaid = inv.paidAmount !== undefined && inv.paidAmount !== null ? parseFloat(inv.paidAmount) : (inv.paymentStatus === 'Unpaid' ? 0 : grandTotal);
    const currentDue = inv.dueAmount !== undefined && inv.dueAmount !== null ? parseFloat(inv.dueAmount) : Math.max(0, grandTotal - currentPaid);

    const input = window.prompt(`Invoice #${inv.invoiceNo} (${inv.customerName || 'Customer'})\n----------------------------------------\nGrand Total: ₹${grandTotal.toFixed(2)}\nPaid So Far: ₹${currentPaid.toFixed(2)}\nRemaining Balance Due: ₹${currentDue.toFixed(2)}\n\nEnter payment amount received now (₹):`, currentDue);
    
    if (input === null) return;
    const addAmt = parseFloat(input);
    if (isNaN(addAmt) || addAmt <= 0) {
      alert("Please enter a valid numeric payment amount.");
      return;
    }

    const newPaid = Math.min(grandTotal, currentPaid + addAmt);
    const newDue = Math.max(0, grandTotal - newPaid);
    const newStatus = newDue === 0 ? 'Paid' : 'Partial';

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedInvoice = {
      ...inv,
      paidAmount: newPaid,
      dueAmount: newDue,
      paymentStatus: newStatus,
      remarks: inv.remarks ? `${inv.remarks} | Recd ₹${addAmt} on ${todayStr}` : `Recd ₹${addAmt} on ${todayStr}`
    };

    if (onSaveInvoice) {
      onSaveInvoice(updatedInvoice, false);
    }
  };

  // Submit manual past bill
  const handleSaveManualBill = (e) => {
    e.preventDefault();
    if (!manualBill.invoiceNo || !manualBill.invoiceNo.trim()) {
      alert("Please enter a Bill / Invoice Number (e.g. RH-2024-073).");
      return;
    }

    const totalVal = parseFloat(manualBill.grandTotal) || 0;
    const paidVal = manualBill.paymentStatus === 'Paid' ? totalVal : (manualBill.paymentStatus === 'Unpaid' ? 0 : (parseFloat(manualBill.paidAmount) || 0));
    const dueVal = Math.max(0, totalVal - paidVal);

    // Create complete invoice object
    const newInvoiceObj = {
      invoiceNo: manualBill.invoiceNo.trim(),
      date: manualBill.date,
      customerName: manualBill.customerName.trim() || 'Walk-in Customer',
      customerPhone: manualBill.customerPhone.trim(),
      customerAddress: manualBill.customerAddress.trim(),
      customerGSTIN: manualBill.customerGSTIN.trim(),
      items: [
        {
          id: `item_${Date.now()}`,
          name: manualBill.particulars || 'Handloom Items Purchase',
          hsn: '5208',
          rate: totalVal,
          qty: 1,
          unit: 'Pcs',
          taxable: totalVal,
          total: totalVal
        }
      ],
      courierCharges: 0,
      invoiceGstRate: 5,
      grandTotal: totalVal,
      paidAmount: paidVal,
      dueAmount: dueVal,
      paymentMode: manualBill.paymentMode,
      paymentStatus: manualBill.paymentStatus,
      remarks: manualBill.remarks || 'Manual Past Bill Entry',
      isManualEntry: true
    };

    if (onSaveInvoice) {
      onSaveInvoice(newInvoiceObj, false);
    }

    setIsManualModalOpen(false);
    setManualBill({
      invoiceNo: '',
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerGSTIN: '',
      particulars: 'Interstate -Reg Dealer Purchase @5%',
      grandTotal: '',
      paymentMode: 'Cash',
      paymentStatus: 'Paid',
      paidAmount: '',
      remarks: 'Manual Past Bill Entry'
    });
  };

  // 1. Process filtering operations
  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    const matchSearch = inv.invoiceNo.toLowerCase().includes(term) ||
                        (inv.customerName && inv.customerName.toLowerCase().includes(term)) ||
                        (inv.customerPhone && inv.customerPhone.includes(term));
                        
    const matchStatus = statusFilter === 'All' || inv.paymentStatus === statusFilter;
    const matchMode = modeFilter === 'All' || inv.paymentMode === modeFilter;
    
    let matchDate = true;
    if (startDate) {
      matchDate = matchDate && inv.date >= startDate;
    }
    if (endDate) {
      matchDate = matchDate && inv.date <= endDate;
    }

    return matchSearch && matchStatus && matchMode && matchDate;
  });

  // 2. Export historic invoices list to format compatible with Excel/Sheets
  const exportToCSV = () => {
    if (filteredInvoices.length === 0) return;
    
    // Header Row
    const headers = [
      'Invoice No',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Customer GSTIN',
      'Payment Mode',
      'Payment Status',
      'Grand Total (Rs.)',
      'Remarks'
    ];
    
    // Rows composition
    const csvRows = [
      headers.join(','),
      ...filteredInvoices.map(inv => [
        `"${inv.invoiceNo}"`,
        `"${inv.date}"`,
        `"${inv.customerName || 'Walk-in Customer'}"`,
        `"${inv.customerPhone || ''}"`,
        `"${inv.customerGSTIN || ''}"`,
        `"${inv.paymentMode}"`,
        `"${inv.paymentStatus}"`,
        inv.grandTotal,
        `"${inv.remarks || ''}"`
      ].join(','))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const exportFileName = `RH_Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", exportFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="d-flex flex-column gap-6 animate-fade-in">
      {/* Header and exports */}
      <div className="d-flex justify-between align-center flex-wrap gap-4">
        <div>
          <h2 className="brand-heading text-gold">Transactional Bills Archive</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Browse historical billing vouchers, add manual old bills, print receipts, or export database logs.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button
            className="btn btn-emerald"
            onClick={() => setIsManualModalOpen(true)}
            style={{ fontWeight: '600' }}
          >
            <Plus size={18} /> Add Manual / Old Past Bill (पुराना बिल जोड़ें)
          </button>

          <button
            className="btn btn-secondary"
            onClick={exportToCSV}
            disabled={filteredInvoices.length === 0}
            title="Backup visible logs to CSV"
          >
            <Download size={18} /> Export List as CSV
          </button>
        </div>
      </div>

      {/* Modal for Manual Old Past Bill Entry */}
      {isManualModalOpen && (
        <div className="modal-overlay no-print">
          <div className="modal-content" style={{ maxWidth: '620px', width: '92%' }}>
            <div className="modal-header d-flex justify-between align-center">
              <h3 className="brand-heading d-flex align-center gap-2" style={{ color: 'var(--accent-gold)' }}>
                <FileText size={20} /> Add Old / Past Bill Entry (पुराना बिल)
              </h3>
              <div className="d-flex gap-2 align-center">
                <button
                  type="button"
                  className="btn btn-emerald btn-sm"
                  onClick={handleSaveManualBill}
                  style={{ fontWeight: '700' }}
                >
                  💾 Save Old Bill (सेव करें)
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsManualModalOpen(false)}>✕</button>
              </div>
            </div>


            <form onSubmit={handleSaveManualBill} style={{ padding: '20px' }}>
              <p className="text-muted mb-3" style={{ fontSize: '0.84rem' }}>
                This bill will be permanently saved to your SQLite Database and automatically included in Party Ledger statements.
              </p>

              <div className="grid-responsive gap-3 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Bill / Invoice No. *
                  </label>
                  <input 
                    type="text" 
                    className="input-field w-full" 
                    placeholder="e.g. RH-2024-073" 
                    value={manualBill.invoiceNo} 
                    onChange={(e) => setManualBill({...manualBill, invoiceNo: e.target.value})} 
                    required 
                    style={{ fontWeight: '700' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Bill Date *
                  </label>
                  <input 
                    type="date" 
                    className="input-field w-full" 
                    value={manualBill.date} 
                    onChange={(e) => setManualBill({...manualBill, date: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="grid-responsive gap-3 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Customer / Party Name *
                  </label>
                  <input 
                    type="text" 
                    className="input-field w-full" 
                    placeholder="e.g. Samasta" 
                    value={manualBill.customerName} 
                    onChange={(e) => setManualBill({...manualBill, customerName: e.target.value})} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Mobile Number
                  </label>
                  <input 
                    type="text" 
                    className="input-field w-full" 
                    placeholder="e.g. 9826012345" 
                    value={manualBill.customerPhone} 
                    onChange={(e) => setManualBill({...manualBill, customerPhone: e.target.value})} 
                  />
                </div>
              </div>

              <div className="mb-3">
                <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  Customer Address / City
                </label>
                <input 
                  type="text" 
                  className="input-field w-full" 
                  placeholder="e.g. No-29, C.P.Ramaswamy Road, Chennai" 
                  value={manualBill.customerAddress} 
                  onChange={(e) => setManualBill({...manualBill, customerAddress: e.target.value})} 
                />
              </div>

              <div className="mb-3">
                <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  Item Description / Particulars
                </label>
                <input 
                  type="text" 
                  className="input-field w-full" 
                  placeholder="e.g. Interstate -Reg Dealer Purchase @5%" 
                  value={manualBill.particulars} 
                  onChange={(e) => setManualBill({...manualBill, particulars: e.target.value})} 
                />
              </div>

              <div className="grid-responsive gap-3 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--accent-gold)' }}>
                    Grand Total Amount (₹) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-field w-full" 
                    placeholder="0.00" 
                    value={manualBill.grandTotal} 
                    onChange={(e) => setManualBill({...manualBill, grandTotal: e.target.value})} 
                    required 
                    style={{ fontWeight: '700', fontSize: '1rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Payment Method
                  </label>
                  <select 
                    className="input-field w-full" 
                    value={manualBill.paymentMode} 
                    onChange={(e) => setManualBill({...manualBill, paymentMode: e.target.value})}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Credit">Credit / Udhar</option>
                  </select>
                </div>
              </div>

              <div className="grid-responsive gap-3 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Payment Status
                  </label>
                  <select 
                    className="input-field w-full" 
                    value={manualBill.paymentStatus} 
                    onChange={(e) => setManualBill({...manualBill, paymentStatus: e.target.value})}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid / Udhar</option>
                    <option value="Partial">Partial Paid</option>
                  </select>
                </div>

                {manualBill.paymentStatus === 'Partial' && (
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: '#10b981' }}>
                      Paid Amount (₹)
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="input-field w-full" 
                      placeholder="0.00" 
                      value={manualBill.paidAmount} 
                      onChange={(e) => setManualBill({...manualBill, paidAmount: e.target.value})} 
                    />
                  </div>
                )}
              </div>

              <div className="d-flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-emerald" style={{ fontWeight: '600' }}>Save Old Bill to Database</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced filters card */}
      <div className="glass-card d-flex flex-column gap-4 py-4">
        <h4 className="brand-heading text-gold" style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
          Search & Query Parameters
        </h4>
        <div className="grid-4" style={{ gap: '15px' }}>
          {/* Main search bar */}
          <div className="d-flex flex-column">
            <label htmlFor="searchField">General Query Search</label>
            <div className="d-flex align-center" style={{ relative: 'true' }}>
              <Search size={16} className="text-muted" style={{ position: 'absolute', marginLeft: '12px' }} />
              <input
                id="searchField"
                type="text"
                placeholder="Search Bill #, Name, Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Date range filters */}
          <div>
            <label htmlFor="dateStart">Bill From Date</label>
            <input
              id="dateStart"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="dateEnd">Bill To Date</label>
            <input
              id="dateEnd"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Status Dropdowns selector */}
          <div className="grid-2" style={{ gap: '10px' }}>
            <div>
              <label htmlFor="statusSel">Payment</label>
              <select id="statusSel" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
            <div>
              <label htmlFor="modeSel">Gateway</label>
              <select id="modeSel" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
                <option value="All">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Database log table */}
      <div className="glass-card table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Document #</th>
              <th>Date</th>
              <th>Customer Details</th>
              <th>Original Invoice / Reason</th>
              <th className="text-right">Net Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th className="text-right no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => {
              const isCN = inv.isCreditNote || (inv.invoiceNo && inv.invoiceNo.includes('CN'));
              const isPN = inv.isPurchaseNote || (inv.invoiceNo && inv.invoiceNo.includes('PN'));
              return (
                <tr key={inv.invoiceNo}>
                  {/* Invoice / Credit Note / Purchase Note tag */}
                  <td>
                    <div className="d-flex flex-column">
                      <strong style={{ color: isCN ? '#ef4444' : (isPN ? '#a855f7' : 'var(--text-gold)') }}>{inv.invoiceNo}</strong>
                      {isCN && (
                        <span className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', marginTop: '2px', padding: '1px 6px' }}>
                          CREDIT NOTE
                        </span>
                      )}
                      {isPN && (
                        <span className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(139,92,246,0.15)', color: '#a855f7', marginTop: '2px', padding: '1px 6px' }}>
                          PURCHASE NOTE
                        </span>
                      )}
                      {inv.isManualEntry && (
                        <span className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', marginTop: '2px', padding: '1px 6px' }}>
                          OLD PAST BILL
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td>{inv.date}</td>

                  {/* Consumer / Supplier */}
                  <td>
                    <div className="d-flex flex-column">
                      <strong>{inv.customerName || (isPN ? 'Weaver / Vendor' : 'Walk-in Customer')}</strong>
                      {inv.customerPhone && <span className="text-muted" style={{ fontSize: '0.8rem' }}>📞 {inv.customerPhone}</span>}
                    </div>
                  </td>

                  {/* Reference / Voucher Type */}
                  <td>
                    {isCN ? (
                      <div className="d-flex flex-column" style={{ fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-gold)' }}>Orig Inv: {inv.originalInvoiceNo || 'N/A'}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Reason: {inv.reasonForCN || 'Sales Return'}</span>
                      </div>
                    ) : isPN ? (
                      <span className="text-muted" style={{ fontSize: '0.8rem', color: '#a855f7' }}>Inward Purchase Note</span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>{inv.isManualEntry ? 'Manual Old Entry' : 'Tax / Retail Invoice'}</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="text-right">
                    <div className="d-flex flex-column align-end">
                      <strong style={{ fontSize: '0.95rem', color: isCN ? '#ef4444' : 'inherit' }}>{formatCurrency(inv.grandTotal)}</strong>
                      {(inv.dueAmount > 0 || inv.paymentStatus !== 'Paid') && (
                        <div className="d-flex flex-column align-end" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                          <span style={{ color: 'var(--accent-emerald, #10b981)' }}>Paid: {formatCurrency(inv.paidAmount !== undefined ? inv.paidAmount : (inv.paymentStatus === 'Unpaid' ? 0 : inv.grandTotal))}</span>
                          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Due: {formatCurrency(inv.dueAmount !== undefined ? inv.dueAmount : (inv.paymentStatus === 'Unpaid' ? inv.grandTotal : 0))}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Gateway Mode */}
                  <td>
                    <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>{inv.paymentMode}</span>
                  </td>

                  {/* Payment status */}
                  <td>
                    <span className={`badge ${inv.paymentStatus === 'Paid' ? 'badge-emerald' : 'badge-rose'}`}>
                      {inv.paymentStatus === 'Paid' ? (isCN ? 'Credited' : 'Paid') : (inv.paymentStatus === 'Partial' ? 'Partial' : 'Unpaid')}
                    </span>
                  </td>

                {/* Control bindings */}
                <td className="text-right no-print">
                  <div className="d-flex gap-2 justify-end">
                    {(inv.dueAmount > 0 || inv.paymentStatus !== 'Paid') && (
                      <button
                        className="btn btn-emerald btn-sm"
                        onClick={() => handleSettleUdhar(inv)}
                        title="Record customer balance payment settlement"
                        style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: '600' }}
                      >
                        ₹ Settle Balance
                      </button>
                    )}
                    {onViewInLedger && (
                      <button
                        className="btn btn-emerald btn-sm"
                        onClick={() => onViewInLedger(inv)}
                        title="View customer account statement in Party Ledger"
                        style={{ fontWeight: '600' }}
                      >
                        📖 Party Ledger
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectInvoice(inv)}
                      title="Load invoice design view / Print"
                    >
                      <Eye size={14} /> View / Print
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditInvoice(inv)}
                      title="Pre-populate to billing screen to modify items"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      className="btn btn-rose btn-sm"
                      onClick={() => {
                        if (window.confirm(`Permanently delete invoice ${inv.invoiceNo} from database files?`)) {
                          onDeleteInvoice(inv.invoiceNo);
                        }
                      }}
                      title="Erase invoice log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
                </tr>
              );
            })}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted" style={{ padding: '24px' }}>
                  No historical bills match your current filter parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
