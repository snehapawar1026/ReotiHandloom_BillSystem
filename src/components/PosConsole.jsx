import React, { useState, useMemo } from 'react';
import { Plus, Trash2, RotateCcw, Save, Printer, Search, Info, PlusCircle } from 'lucide-react';
import { formatCurrency, calculateTotals } from '../utils';
import { CATEGORIES } from '../constants';

export default function PosConsole({
  inventory = [],
  invoices = [],
  allInvoices = [],
  ledgerEntries = [],
  currentInvoice = null,
  settings = {},
  onSaveInvoice,
  onClearInvoice,
  onUpdateCurrentInvoice,
  hasGST = true
}) {
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogCat, setSelectedCatalogCat] = useState('All');

  // Destructure invoice fields from parent-controlled object
  const {
    invoiceNo = '',
    date = '',
    isCreditNote = false,
    isPurchaseNote = false,
    originalInvoiceNo = '',
    originalInvoiceDate = '',
    reasonForCN = 'Sales Return',
    customerName = '',
    customerPhone = '',
    customerEmail = '',
    customerAddress = '',
    customerGSTIN = '',
    items = [],
    courierCharges = 0,
    paymentMode = 'Cash',
    paymentStatus = 'Paid',
    paidAmount = null,
    remarks = '',
    isInterState = false,
    cgstOverride = null,
    sgstOverride = null,
    igstOverride = null
  } = currentInvoice || {};

  // Compute live calculations
  const totals = useMemo(() => {
    return calculateTotals(items, isInterState, courierCharges, hasGST);
  }, [items, isInterState, courierCharges, hasGST]);

  // Tax calculations based on overall selected invoiceGstRate (hardcoded to 5%)
  const invoiceGstRate = 5;
  const computedCGST = !hasGST || isInterState ? 0 : parseFloat((totals.taxableValue * 0.025).toFixed(2));
  const computedSGST = !hasGST || isInterState ? 0 : parseFloat((totals.taxableValue * 0.025).toFixed(2));
  const computedIGST = !hasGST || !isInterState ? 0 : parseFloat((totals.taxableValue * 0.05).toFixed(2));

  const displayCGST = cgstOverride !== null && cgstOverride !== undefined
    ? cgstOverride
    : (computedCGST === 0 ? '' : computedCGST);

  const displaySGST = sgstOverride !== null && sgstOverride !== undefined
    ? sgstOverride
    : (computedSGST === 0 ? '' : computedSGST);

  const displayIGST = igstOverride !== null && igstOverride !== undefined
    ? igstOverride
    : (computedIGST === 0 ? '' : computedIGST);

  const finalCGST = isInterState ? 0 : (parseFloat(displayCGST) || 0);
  const finalSGST = isInterState ? 0 : (parseFloat(displaySGST) || 0);
  const finalIGST = isInterState ? (parseFloat(displayIGST) || 0) : 0;

  const finalPreRound = totals.taxableValue + (isInterState ? finalIGST : (finalCGST + finalSGST)) + (parseFloat(courierCharges) || 0);
  const grandTotal = Math.round(finalPreRound);
  const roundOff = grandTotal - finalPreRound;
  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

  // Udhar / Partial payment computation
  const actualPaidAmount = paymentStatus === 'Paid'
    ? (paidAmount !== null && paidAmount !== undefined && paidAmount !== '' ? parseFloat(paidAmount) : grandTotal)
    : (paymentStatus === 'Unpaid' ? 0 : (paidAmount !== null && paidAmount !== undefined && paidAmount !== '' ? parseFloat(paidAmount) : 0));

  const dueAmount = Math.max(0, grandTotal - actualPaidAmount);

  // Extract unique saved customer profiles from all invoices & ledger entries
  const savedCustomers = useMemo(() => {
    const customerMap = new Map();

    const addCustomerProfile = (name, phone, email, address, gstin) => {
      const cleanName = (name || '').trim();
      const cleanPhone = (phone || '').trim();
      if (!cleanName && !cleanPhone) return;

      const key = cleanName ? cleanName.toLowerCase() : cleanPhone;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerName: cleanName,
          customerPhone: cleanPhone,
          customerEmail: (email || '').trim(),
          customerAddress: (address || '').trim(),
          customerGSTIN: (gstin || '').trim()
        });
      } else {
        const existing = customerMap.get(key);
        customerMap.set(key, {
          customerName: existing.customerName || cleanName,
          customerPhone: existing.customerPhone || cleanPhone,
          customerEmail: existing.customerEmail || (email || '').trim(),
          customerAddress: existing.customerAddress || (address || '').trim(),
          customerGSTIN: existing.customerGSTIN || (gstin || '').trim()
        });
      }
    };

    const sourceInvoices = (allInvoices && allInvoices.length > 0) ? allInvoices : invoices;
    (sourceInvoices || []).forEach(inv => {
      addCustomerProfile(
        inv.customerName,
        inv.customerPhone,
        inv.customerEmail,
        inv.customerAddress,
        inv.customerGSTIN
      );
    });

    (ledgerEntries || []).forEach(ent => {
      addCustomerProfile(
        ent.partyName || ent.customerName,
        ent.customerPhone || ent.phone,
        ent.customerEmail || ent.email,
        ent.customerAddress || ent.address,
        ent.customerGSTIN || ent.gstin
      );
    });

    return Array.from(customerMap.values());
  }, [invoices, allInvoices, ledgerEntries]);

  const handleSelectSavedCustomer = (cust) => {
    if (!cust) return;
    let updatedInvoice = {
      ...currentInvoice,
      customerName: cust.customerName || '',
      customerPhone: cust.customerPhone || '',
      customerEmail: cust.customerEmail || '',
      customerAddress: cust.customerAddress || '',
      customerGSTIN: cust.customerGSTIN || ''
    };

    if (cust.customerGSTIN) {
      const cleanGSTIN = cust.customerGSTIN.trim().toUpperCase();
      const shopStateCode = settings?.shopGSTIN?.substring(0, 2) || '23';
      if (cleanGSTIN.length >= 2) {
        const custStateCode = cleanGSTIN.substring(0, 2);
        updatedInvoice.isInterState = (custStateCode !== shopStateCode);
      }
    }

    onUpdateCurrentInvoice(updatedInvoice);
  };

  // Form input update handler
  const handleInputChange = (field, value) => {
    let updatedInvoice = {
      ...currentInvoice,
      [field]: value
    };

    // Auto-fill existing customer details if Customer Name matches a saved record
    if (field === 'customerName') {
      const valTrim = value.trim().toLowerCase();
      if (valTrim.length >= 2) {
        const match = savedCustomers.find(
          c => c.customerName && c.customerName.trim().toLowerCase() === valTrim
        );
        if (match) {
          updatedInvoice = {
            ...updatedInvoice,
            customerPhone: match.customerPhone || updatedInvoice.customerPhone,
            customerEmail: match.customerEmail || updatedInvoice.customerEmail,
            customerAddress: match.customerAddress || updatedInvoice.customerAddress,
            customerGSTIN: match.customerGSTIN || updatedInvoice.customerGSTIN
          };
        }
      }
    }

    // Auto-fill existing customer details if Customer Phone matches a saved record
    if (field === 'customerPhone') {
      const cleanPhone = value.trim();
      if (cleanPhone.length >= 4) {
        const match = savedCustomers.find(
          c => c.customerPhone && c.customerPhone.trim() === cleanPhone
        );
        if (match) {
          updatedInvoice = {
            ...updatedInvoice,
            customerName: match.customerName || updatedInvoice.customerName,
            customerEmail: match.customerEmail || updatedInvoice.customerEmail,
            customerAddress: match.customerAddress || updatedInvoice.customerAddress,
            customerGSTIN: match.customerGSTIN || updatedInvoice.customerGSTIN
          };
        }
      }
    }

    // Auto-detect inter-state tax type if Customer GSTIN changes or gets auto-filled
    const activeGSTIN = (field === 'customerGSTIN' ? value : (updatedInvoice.customerGSTIN || '')).trim().toUpperCase();
    if (activeGSTIN.length >= 2) {
      const shopStateCode = settings?.shopGSTIN?.substring(0, 2) || '23';
      const custStateCode = activeGSTIN.substring(0, 2);
      updatedInvoice.isInterState = (custStateCode !== shopStateCode);
    } else if (field === 'customerGSTIN') {
      updatedInvoice.isInterState = false;
    }
    
    onUpdateCurrentInvoice(updatedInvoice);
  };

  // Extract all unique item suggestions from inventory & past invoices
  const itemSuggestions = useMemo(() => {
    const map = new Map();
    (inventory || []).forEach(p => {
      if (p.name && p.name.trim()) {
        const cleanName = p.name.trim();
        const key = cleanName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            name: cleanName,
            rate: (p.rate !== undefined && p.rate !== null && p.rate !== '') ? p.rate : '',
            meter: (p.meter !== undefined && p.meter !== null && p.meter !== '') ? p.meter : '6.20',
            hsn: p.hsn || '5208',
            unit: p.unit || 'Pcs',
            sku: p.sku || 'CUSTOM'
          });
        }
      }
    });

    const sourceInvoices = (allInvoices && allInvoices.length > 0) ? allInvoices : invoices;
    (sourceInvoices || []).forEach(inv => {
      (inv.items || []).forEach(it => {
        if (it.name && it.name.trim()) {
          const cleanName = it.name.trim();
          const key = cleanName.toLowerCase();
          if (!map.has(key)) {
            map.set(key, {
              name: cleanName,
              rate: (it.rate !== undefined && it.rate !== null && it.rate !== '') ? it.rate : '',
              meter: (it.meter !== undefined && it.meter !== null && it.meter !== '') ? it.meter : '6.20',
              hsn: it.hsn || '5208',
              unit: it.unit || 'Pcs',
              sku: it.sku || 'CUSTOM'
            });
          }
        }
      });
    });

    return Array.from(map.values());
  }, [inventory, invoices, allInvoices]);

  // Item row operations
  const handleItemRowChange = (index, field, value) => {
    const updatedItems = [...items];
    if (field === 'name') {
      updatedItems[index] = {
        ...updatedItems[index],
        name: value
      };
    } else if (field === 'total') {
      const newTotal = value === '' ? '' : parseFloat(value);
      if (newTotal === '' || isNaN(newTotal)) {
        updatedItems[index] = {
          ...updatedItems[index],
          rate: ''
        };
      } else {
        const qty = parseFloat(updatedItems[index].qty) || 1;
        const calculatedRate = newTotal / qty;
        updatedItems[index] = {
          ...updatedItems[index],
          rate: parseFloat(calculatedRate.toFixed(4))
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: field === 'qty' || field === 'rate' || field === 'meter'
          ? (value === '' ? '' : value)
          : value
      };
    }
    onUpdateCurrentInvoice({ ...currentInvoice, items: updatedItems });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = items.filter((_, idx) => idx !== index);
    onUpdateCurrentInvoice({ ...currentInvoice, items: updatedItems });
  };

  const handleAddItemFromCatalog = (product) => {
    const existingIndex = items.findIndex(item => item.productId === product.id);
    
    if (existingIndex > -1) {
      // Increment quantity if already exists
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        qty: (parseFloat(updatedItems[existingIndex].qty) || 0) + 1
      };
      onUpdateCurrentInvoice({ ...currentInvoice, items: updatedItems });
    } else {
      // Add new row representation
      const newItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        hsn: product.hsn || '5208',
        meter: product.meter !== undefined && product.meter !== null ? product.meter : '6.20',
        qty: '',
        unit: product.unit || 'Pcs',
        rate: product.rate,
        gstRate: product.gstRate || 0
      };
      onUpdateCurrentInvoice({ ...currentInvoice, items: [...items, newItem] });
    }
  };

  const handleAddCustomItem = () => {
    const newItem = {
      productId: `custom-${Date.now()}`,
      name: '',
      sku: 'CUSTOM',
      hsn: '5208',
      meter: '6.20',
      qty: '',
      unit: 'Pcs',
      rate: '',
      gstRate: 5
    };
    onUpdateCurrentInvoice({ ...currentInvoice, items: [...items, newItem] });
  };

  // Submit complete invoice / credit note
  const handleCommit = (e, shouldPrint) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("No products have been added. Please select items from the stock catalogue card shelf.");
      return;
    }
    
    const derivedStatus = dueAmount === 0 ? 'Paid' : (actualPaidAmount > 0 ? 'Partial' : 'Unpaid');

    // Save invoice payload containing computed values for persistence
    const invoicePayload = {
      ...currentInvoice,
      isCreditNote: isCreditNote,
      originalInvoiceNo: originalInvoiceNo,
      originalInvoiceDate: originalInvoiceDate,
      reasonForCN: reasonForCN,
      invoiceGstRate, // Save the selected overall invoice GST rate
      items: totals.items.map(item => ({
        ...item,
        name: item.name?.trim() ? item.name : (isCreditNote ? 'Returned Fabric / Item' : 'Custom Fabric / Item')
      })),
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableValue: totals.taxableValue,
      totalCGST: finalCGST,
      totalSGST: finalSGST,
      totalIGST: finalIGST,
      totalGST: finalCGST + finalSGST + finalIGST,
      courierCharges: parseFloat(courierCharges) || 0,
      roundOff: roundOff,
      grandTotal: grandTotal,
      paidAmount: actualPaidAmount,
      dueAmount: dueAmount,
      paymentStatus: derivedStatus,
      gstBreakdown: totals.gstBreakdown,
      isInterState: totals.isInterState
    };

    onSaveInvoice(invoicePayload, shouldPrint);
  };

  // Filter products in side-panel
  const filteredCatalog = inventory.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                        product.sku.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchCat = selectedCatalogCat === 'All' || product.category === selectedCatalogCat;
    return matchSearch && matchCat;
  });

  return (
    <form onSubmit={(e) => handleCommit(e, false)} className="pos-split-container d-flex gap-5 flex-wrap w-full animate-fade-in" style={{ alignItems: 'stretch' }}>
      
      {/* 2/3 LEFT PANEL: Invoice Builder Grid */}
      <div className="d-flex flex-column gap-5" style={{ flex: '1 1 65%', minWidth: '320px' }}>
        
        {/* Customer / Supplier Profiles Panel */}
        <div className="glass-card d-flex flex-column gap-4" style={isCreditNote ? { border: '1px solid rgba(239,68,68,0.3)' } : (isPurchaseNote ? { border: '1px solid rgba(139,92,246,0.3)' } : {})}>
          <div className="d-flex justify-between align-center border-bottom pb-2">
            <h3 className="brand-heading text-gold" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: isCreditNote ? '#f87171' : (isPurchaseNote ? '#a855f7' : 'var(--text-gold)') }}>
              <span style={{ display: 'inline-flex', padding: '6px', borderRadius: '50%', backgroundColor: isCreditNote ? 'rgba(239,68,68,0.15)' : (isPurchaseNote ? 'rgba(139,92,246,0.15)' : 'var(--accent-gold-glow)') }}>
                {isCreditNote ? '📑' : (isPurchaseNote ? '📦' : '👤')}
              </span>
              {isPurchaseNote ? 'Purchase Note & Supplier Details' : (isCreditNote ? 'Credit Note & Customer Details' : 'Invoice & Customer Info')}
            </h3>
            <div className="d-flex gap-2 align-center flex-wrap">
              {isCreditNote && (
                <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 'bold' }}>
                  GST CREDIT NOTE VOUCHER
                </span>
              )}
              {isPurchaseNote && (
                <span className="badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#a855f7', fontWeight: 'bold' }}>
                  PURCHASE NOTE (INWARD STOCK)
                </span>
              )}

              {/* Prominent Top Action Buttons */}
              <button
                type="submit"
                className={`btn btn-sm ${isCreditNote ? 'btn-rose' : (isPurchaseNote ? 'btn-primary' : 'btn-emerald')}`}
                style={{ fontWeight: '700', padding: '7px 14px', backgroundColor: isCreditNote ? '#dc2626' : (isPurchaseNote ? '#8b5cf6' : undefined), borderColor: isPurchaseNote ? '#8b5cf6' : undefined }}
                title="Save Bill to Database"
              >
                <Save size={16} /> {isPurchaseNote ? 'Save Purchase Note' : (isCreditNote ? 'Save Credit Note' : '💾 Save Bill (बिल सेव करें)')}
              </button>

              <button
                type="button"
                className={`btn btn-sm ${isCreditNote ? 'btn-rose' : (isPurchaseNote ? 'btn-primary' : 'btn-primary')}`}
                onClick={(e) => handleCommit(e, true)}
                style={{ fontWeight: '700', padding: '7px 14px', backgroundColor: isCreditNote ? '#b91c1c' : (isPurchaseNote ? '#7c3aed' : undefined), borderColor: isCreditNote ? '#b91c1c' : (isPurchaseNote ? '#7c3aed' : undefined) }}
                title="Save Bill & Print Receipt"
              >
                <Printer size={16} /> {isPurchaseNote ? 'Save & Print PN' : (isCreditNote ? 'Save & Print CN' : '🖨️ Save & Print')}
              </button>
            </div>
          </div>


          {/* Number & Dates Grid */}
          <div className={`grid-${isCreditNote ? '2' : '2'}`} style={{ gap: '15px' }}>
            <div>
              <label htmlFor="invoiceNoInput" style={{ fontWeight: '600', color: isCreditNote ? '#f87171' : (isPurchaseNote ? '#a855f7' : 'var(--text-gold)') }}>
                {isPurchaseNote ? 'Purchase Note Number' : (isCreditNote ? 'Credit Note Number' : 'Invoice Number')}
              </label>
              <input
                id="invoiceNoInput"
                type="text"
                value={invoiceNo}
                onChange={(e) => handleInputChange('invoiceNo', e.target.value)}
                placeholder={isPurchaseNote ? "e.g. AH-PN-2026-0001" : (isCreditNote ? "e.g. RH-CN-2026-0001" : "e.g. RH-2026-0001")}
                required
              />
            </div>
            <div>
              <label htmlFor="invoiceDateInput" style={{ fontWeight: '600', color: isCreditNote ? '#f87171' : (isPurchaseNote ? '#a855f7' : 'var(--text-gold)') }}>
                {isPurchaseNote ? 'Purchase Date' : (isCreditNote ? 'Credit Note Date' : 'Invoice Date')}
              </label>
              <input
                id="invoiceDateInput"
                type="date"
                value={date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Original Invoice Reference Row for Credit Notes */}
          {isCreditNote && (
            <div className="grid-3 border-bottom pb-4" style={{ gap: '15px', backgroundColor: 'rgba(239, 68, 68, 0.03)', padding: '12px', borderRadius: '8px', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
              <div>
                <label htmlFor="origInvoiceNo" style={{ fontWeight: '600', color: '#ef4444' }}>
                  Original Tax Invoice No. *
                </label>
                <input
                  id="origInvoiceNo"
                  type="text"
                  value={originalInvoiceNo}
                  onChange={(e) => handleInputChange('originalInvoiceNo', e.target.value)}
                  placeholder="e.g. RH-2026-0293"
                  required={isCreditNote}
                />
              </div>
              <div>
                <label htmlFor="origInvoiceDate" style={{ fontWeight: '600', color: '#ef4444' }}>
                  Original Invoice Date
                </label>
                <input
                  id="origInvoiceDate"
                  type="date"
                  value={originalInvoiceDate}
                  onChange={(e) => handleInputChange('originalInvoiceDate', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reasonCN" style={{ fontWeight: '600', color: '#ef4444' }}>
                  Reason for Credit Note *
                </label>
                <select
                  id="reasonCN"
                  value={reasonForCN}
                  onChange={(e) => handleInputChange('reasonForCN', e.target.value)}
                >
                  <option value="Sales Return">🔄 Sales Return / Goods Return</option>
                  <option value="Goods Damaged / Defective">⚠️ Goods Damaged / Defective</option>
                  <option value="Rate / Price Difference">💲 Rate / Price Difference</option>
                  <option value="Quantity Discount">🏷️ Quantity Discount / Scheme</option>
                  <option value="Order Cancellation">❌ Order Cancellation</option>
                  <option value="Other">📝 Other Adjustment</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid-3">
            <div>
              <label htmlFor="custName">{isPurchaseNote ? 'Supplier / Weaver Name' : 'Customer Name'}</label>
              <input
                id="custName"
                type="text"
                list="saved-customer-names-list"
                value={customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                placeholder={isPurchaseNote ? "Weaver / Vendor Name" : "Walk-in Customer / Client Name"}
                autoComplete="on"
              />
              <datalist id="saved-customer-names-list">
                {savedCustomers.filter(c => c.customerName).map((c, i) => (
                  <option key={i} value={c.customerName}>
                    {c.customerPhone ? `Phone: ${c.customerPhone}` : ''} {c.customerAddress ? `| ${c.customerAddress}` : ''}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="custPhone">{isPurchaseNote ? 'Supplier Phone Number' : 'Phone Number'}</label>
              <input
                id="custPhone"
                type="text"
                list="saved-customer-phones-list"
                value={customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                autoComplete="on"
              />
              <datalist id="saved-customer-phones-list">
                {savedCustomers.filter(c => c.customerPhone).map((c, i) => (
                  <option key={i} value={c.customerPhone}>
                    {c.customerName ? `Name: ${c.customerName}` : ''} {c.customerAddress ? `| ${c.customerAddress}` : ''}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="custEmail">{isPurchaseNote ? 'Supplier Email' : 'Email Address'}</label>
              <input
                id="custEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                placeholder="vendor@email.com"
              />
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label htmlFor="custAddress">{isPurchaseNote ? 'Supplier Address' : 'Billing Address'}</label>
              <input
                id="custAddress"
                type="text"
                value={customerAddress}
                onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                placeholder="Weaver Workshop / Supplier Address"
              />
            </div>
            <div>
              <label htmlFor="custGSTIN">{isPurchaseNote ? 'Supplier GSTIN (if applicable)' : 'Customer GSTIN (if applicable)'}</label>
              <input
                id="custGSTIN"
                type="text"
                value={customerGSTIN}
                onChange={(e) => handleInputChange('customerGSTIN', e.target.value.toUpperCase())}
                placeholder="e.g. 09ABCDE1234F1Z5"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>
        </div>

        {/* Invoice Item Details Grid */}
        <div className="glass-card d-flex flex-column gap-4">
          <div className="d-flex justify-between align-center border-bottom pb-2">
            <h3 className="brand-heading text-gold" style={{ fontSize: '1.2rem' }}>Bill Details (Voucher Rows)</h3>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCustomItem}>
                <PlusCircle size={14} /> Add Custom item row
              </button>
            </div>
          </div>

          <div className="table-container" style={{ maxHeight: '310px', overflowY: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Item / Description</th>
                  <th style={{ width: '13%', textAlign: 'center' }}>Meter (कट/मीटर)</th>
                  <th style={{ width: '14%' }}>Rate (₹)</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '9%' }}>Unit</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ width: '5%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  // Locate corresponding warehouse stock details to render alerts
                  const stockDetails = inventory.find(p => p.id === item.productId);
                  const isUnderstocked = stockDetails && stockDetails.stock < item.qty;

                  return (
                    <tr key={item.productId || index} style={isUnderstocked ? { backgroundColor: 'rgba(239, 68, 68, 0.03)' } : {}}>
                      {/* Name input & HSN */}
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <input
                            type="text"
                            list="custom-item-suggestions-list"
                            value={item.name}
                            onChange={(e) => handleItemRowChange(index, 'name', e.target.value)}
                            placeholder={isCreditNote ? 'Returned Fabric / Item' : 'Custom Fabric / Item'}
                            style={{ padding: '6px' }}
                            autoComplete="on"
                          />
                          <div className="d-flex align-center gap-2" style={{ paddingLeft: '2px', fontSize: '0.75rem' }}>
                            <span className="text-muted">HSN:</span>
                            <input
                              type="text"
                              value={item.hsn !== undefined ? item.hsn : '5208'}
                              onChange={(e) => handleItemRowChange(index, 'hsn', e.target.value)}
                              placeholder="5208"
                              style={{ width: '85px', padding: '2px 6px', fontSize: '0.75rem' }}
                            />
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>| SKU: {item.sku || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Meter (Cut/Length) */}
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.meter !== undefined && item.meter !== null ? item.meter : '6.20'}
                          onChange={(e) => handleItemRowChange(index, 'meter', e.target.value)}
                          style={{ padding: '6px', textAlign: 'center', fontWeight: '600', color: 'var(--text-gold)' }}
                          placeholder="6.20"
                        />
                      </td>

                      {/* Rate */}
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate === 0 || item.rate === '' || item.rate === null || item.rate === undefined ? '' : item.rate}
                          onChange={(e) => handleItemRowChange(index, 'rate', e.target.value)}
                          placeholder="Rate (₹)"
                          style={{ padding: '6px', textAlign: 'right' }}
                          required
                        />
                      </td>

                      {/* Qty */}
                      <td>
                        <div className="d-flex flex-column align-center gap-1">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={item.qty === 0 || item.qty === '' || item.qty === null || item.qty === undefined ? '' : item.qty}
                            onChange={(e) => handleItemRowChange(index, 'qty', e.target.value)}
                            placeholder="Qty (मात्रा)"
                            style={{ padding: '6px', textAlign: 'center' }}
                            required
                          />
                          {stockDetails && (
                            <span className={`text-muted ${isUnderstocked ? 'text-rose font-bold' : ''}`} style={{ fontSize: '0.7rem' }}>
                              Stock: {stockDetails.stock}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemRowChange(index, 'unit', e.target.value)}
                          style={{ padding: '6px' }}
                        />
                      </td>

                      {/* Line total (editable input) */}
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={totals.items[index]?.total !== undefined && totals.items[index].total !== 0 ? parseFloat((totals.items[index].total).toFixed(2)) : ''}
                          onChange={(e) => handleItemRowChange(index, 'total', e.target.value)}
                          style={{ padding: '6px', textAlign: 'right', fontWeight: '600' }}
                          required
                        />
                      </td>

                      {/* Delete */}
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-rose btn-sm"
                          onClick={() => handleRemoveItem(index)}
                          style={{ padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted" style={{ padding: '24px' }}>
                      Your billing list is empty. Click items in the stock panel on the right side to add them.
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 'bold', backgroundColor: 'var(--card-bg-subtle)' }}>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '10px 12px' }}>Total Quantity:</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                        {totalQty}
                      </span>
                    </td>
                    <td></td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--gold-color)' }}>{formatCurrency(totals.subtotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
            <datalist id="custom-item-suggestions-list">
              {itemSuggestions.map((s, i) => (
                <option key={i} value={s.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Transaction and billing options summaries */}
        <div className="glass-card grid-2">
          {/* Comments & gateways */}
          <div className="d-flex flex-column gap-4">
            <h4 className="brand-heading text-gold" style={{ fontSize: '1.05rem' }}>Transaction Options</h4>
            
            <div className={hasGST ? "grid-3" : "grid-2"}>
              <div>
                <label htmlFor="payGate">Payment gateway</label>
                <select id="payGate" value={paymentMode} onChange={(e) => handleInputChange('paymentMode', e.target.value)}>
                  <option value="Cash">💵 Cash</option>
                  <option value="Card">💳 Debit/Credit Card</option>
                  <option value="UPI">📱 GooglePay/UPI</option>
                  <option value="Net Banking">🏦 Net Banking</option>
                  <option value="Credit">⏳ Credit (Unpaid Ledger)</option>
                </select>
              </div>

              <div>
                <label htmlFor="payStat">Payment Status</label>
                <select id="payStat" value={paymentStatus} onChange={(e) => handleInputChange('paymentStatus', e.target.value)}>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>

              {hasGST && (
                <div>
                  <label htmlFor="taxType">GST Tax Type</label>
                  <select id="taxType" value={isInterState ? 'IGST' : 'CGST_SGST'} onChange={(e) => handleInputChange('isInterState', e.target.value === 'IGST')}>
                    <option value="CGST_SGST">Intra-State (CGST+SGST)</option>
                    <option value="IGST">Inter-State (IGST)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="invoiceNotes">Voucher Remarks / Internal Notes</label>
              <textarea
                id="invoiceNotes"
                value={remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                placeholder="Include discount details or courier parcel slips..."
                rows={2}
              />
            </div>
          </div>

          {/* Detailed Receipts Calculator Calculations */}
          <div className="d-flex flex-column gap-3 pl-3" style={{ borderLeft: '1px solid var(--border-color)' }}>
            <h4 className="brand-heading text-gold" style={{ fontSize: '1.05rem' }}>Invoice Statement Summary</h4>
            
            <div className="d-flex justify-between" style={{ fontSize: '0.9rem' }}>
              <span className="text-muted">Total Gross Amount:</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            
            <div className="d-flex justify-between" style={{ fontSize: '0.9rem' }}>
              <span className="text-muted">Total Quantity:</span>
              <span style={{ fontWeight: 500 }}>{totalQty}</span>
            </div>
            
            {hasGST && (
              <>
                <div className="d-flex justify-between" style={{ fontSize: '0.9rem' }}>
                  <span className="text-muted">Total Taxable Value (Pre-tax):</span>
                  <span style={{ fontWeight: 500 }}>{formatCurrency(totals.taxableValue)}</span>
                </div>

                {!isInterState ? (
                  <>
                    <div className="d-flex justify-between align-center" style={{ fontSize: '0.9rem' }}>
                      <span className="text-muted">CGST Subtotal (2.5%):</span>
                      <div style={{ width: '120px' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="₹ CGST"
                          value={displayCGST}
                          onChange={(e) => handleInputChange('cgstOverride', e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.85rem', textAlign: 'right' }}
                        />
                      </div>
                    </div>
                    <div className="d-flex justify-between align-center" style={{ fontSize: '0.9rem' }}>
                      <span className="text-muted">SGST Subtotal (2.5%):</span>
                      <div style={{ width: '120px' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="₹ SGST"
                          value={displaySGST}
                          onChange={(e) => handleInputChange('sgstOverride', e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.85rem', textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="d-flex justify-between align-center" style={{ fontSize: '0.9rem' }}>
                    <span className="text-muted">IGST Subtotal (5%):</span>
                    <div style={{ width: '120px' }}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="₹ IGST"
                        value={displayIGST}
                        onChange={(e) => handleInputChange('igstOverride', e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.85rem', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {!isPurchaseNote && !isCreditNote && (
              <div className="d-flex justify-between align-center" style={{ fontSize: '0.9rem' }}>
                <span className="text-muted">Courier Charges:</span>
                <div style={{ width: '100px' }}>
                  <input
                    type="number"
                    placeholder="₹ Amount"
                    value={courierCharges === 0 || courierCharges === '0' ? '' : courierCharges}
                    onChange={(e) => handleInputChange('courierCharges', e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.85rem', textAlign: 'right' }}
                  />
                </div>
              </div>
            )}



            {Math.abs(roundOff) > 0 && (
              <div className="d-flex justify-between text-muted" style={{ fontSize: '0.8rem' }}>
                <span>Round Off:</span>
                <span>₹{roundOff.toFixed(2)}</span>
              </div>
            )}

            <div className="d-flex justify-between border-top pt-2" style={{ fontSize: '1.2rem', fontWeight: '700' }}>
              <span className="text-gold">Grand Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>

            {/* Udhar / Partial Payment Row */}
            <div className="d-flex flex-column gap-2 p-2 rounded" style={{ backgroundColor: paymentStatus !== 'Paid' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${paymentStatus !== 'Paid' ? '#ef4444' : '#10b981'}` }}>
              <div className="d-flex justify-between align-center" style={{ fontSize: '0.9rem' }}>
                <span style={{ fontWeight: '600' }}>Amount Paid:</span>
                <div style={{ width: '120px' }}>
                  <input
                    type="number"
                    step="any"
                    placeholder="₹ Paid"
                    value={paidAmount !== null && paidAmount !== undefined ? paidAmount : (paymentStatus === 'Paid' ? grandTotal : (paymentStatus === 'Unpaid' ? 0 : ''))}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleInputChange('paidAmount', val);
                      if (parseFloat(val) >= grandTotal) {
                        handleInputChange('paymentStatus', 'Paid');
                      } else if (parseFloat(val) > 0) {
                        handleInputChange('paymentStatus', 'Partial');
                      } else if (val === '0' || val === 0) {
                        handleInputChange('paymentStatus', 'Unpaid');
                      }
                    }}
                    style={{ padding: '4px 8px', fontSize: '0.9rem', textAlign: 'right', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              {dueAmount > 0 && (
                <div className="d-flex justify-between align-center pt-1" style={{ fontSize: '0.95rem', fontWeight: '800', color: '#dc2626', borderTop: '1px dashed rgba(220, 38, 38, 0.3)' }}>
                  <span>Balance Due Amount:</span>
                  <span>{formatCurrency(dueAmount)}</span>
                </div>
              )}
            </div>

            {/* Action rows */}
            <div className="d-flex gap-2 mt-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClearInvoice}
                style={{ flex: 1 }}
                title="Wipe POS Form details"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button
                type="submit"
                className={`btn ${isCreditNote ? 'btn-rose' : (isPurchaseNote ? 'btn-primary' : 'btn-emerald')}`}
                style={{ flex: 1.2, backgroundColor: isCreditNote ? '#dc2626' : (isPurchaseNote ? '#8b5cf6' : undefined), borderColor: isPurchaseNote ? '#8b5cf6' : undefined }}
                title={isPurchaseNote ? "Save purchase note ledger" : (isCreditNote ? "Save credit note ledger" : "Save bill transaction ledger")}
              >
                <Save size={16} /> {isPurchaseNote ? 'Save Purchase Note' : (isCreditNote ? 'Save Credit Note' : 'Save Invoice')}
              </button>
              <button
                type="button"
                className={`btn ${isCreditNote ? 'btn-rose' : (isPurchaseNote ? 'btn-primary' : 'btn-primary')}`}
                onClick={(e) => handleCommit(e, true)}
                style={{ flex: 1.5, backgroundColor: isCreditNote ? '#b91c1c' : (isPurchaseNote ? '#7c3aed' : undefined), borderColor: isCreditNote ? '#b91c1c' : (isPurchaseNote ? '#7c3aed' : undefined) }}
                title={isPurchaseNote ? "Save & Display Purchase Note Print dialog" : (isCreditNote ? "Save & Display Credit Note Print dialog" : "Save & Display Invoice Print dialog")}
              >
                <Printer size={16} /> {isPurchaseNote ? 'Save & Print Purchase Note' : (isCreditNote ? 'Save & Print Credit Note' : 'Save & Print')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1/3 RIGHT PANEL: Interactive Catalogue */}
      <div className="glass-card d-flex flex-column gap-4" style={{ flex: '1 1 30%', minWidth: '220px', maxHeight: '720px', overflowY: 'auto' }}>
        <h3 className="brand-heading text-gold" style={{ fontSize: '1.2rem' }}>Product Catalogue Shelf</h3>
        
        {/* Search bar inside stock */}
        <div className="d-flex align-center" style={{ relative: 'true' }}>
          <Search size={14} className="text-muted" style={{ position: 'absolute', marginLeft: '10px' }} />
          <input
            type="text"
            placeholder="Search items..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
          />
        </div>

        {/* Categories togglers */}
        <div className="d-flex gap-1 flex-wrap">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCatalogCat === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCatalogCat(cat)}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Clickable Items list */}
        <div className="d-flex flex-column gap-2" style={{ overflowY: 'auto' }}>
          {filteredCatalog.map(product => {
            const isOutOfStock = product.stock <= 0;
            return (
              <div
                key={product.id}
                onClick={() => !isOutOfStock && handleAddItemFromCatalog(product)}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  opacity: isOutOfStock ? 0.5 : 1,
                  display: 'flex',
                  justifyContent: 'between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  transition: 'transform 0.15s ease'
                }}
                className="catalog-item-row"
              >
                <div style={{ flexGrow: 1 }}>
                  <div className="d-flex align-center gap-2">
                    <strong style={{ fontSize: '0.9rem' }}>{product.name}</strong>
                    <span className="text-gold" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{product.sku}</span>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Price: {formatCurrency(product.rate)} / {product.unit} (GST {product.gstRate}%)
                  </span>
                </div>
                <div className="text-right" style={{ textAlign: 'right' }}>
                  <span className={`badge ${isOutOfStock ? 'badge-rose' : product.stock < 5 ? 'badge-rose font-bold pulse-glow' : 'badge-emerald'}`} style={{ fontSize: '0.7rem' }}>
                    {isOutOfStock ? 'Out' : `${product.stock} left`}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredCatalog.length === 0 && (
            <div className="text-center text-muted" style={{ padding: '16px', fontSize: '0.85rem' }}>
              No products found in catalogue.
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
