import React, { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';
import html2canvas from 'html2canvas';
import { formatCurrency, priceToWords } from '../utils';

const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (regex.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

export default function PrintInvoiceModal({ isOpen, invoice, settings, onClose, hasGST = true }) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  // Calculate totals details locally for safety
  const items = invoice.items || [];
  const taxableValue = items.reduce((sum, item) => sum + (parseFloat(item.taxable) || 0), 0);
  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
  const isInterState = invoice.isInterState || (
    invoice.customerGSTIN && 
    invoice.customerGSTIN.trim().length >= 2 && 
    invoice.customerGSTIN.trim().toUpperCase().substring(0, 2) !== (settings.shopGSTIN || '23').trim().toUpperCase().substring(0, 2)
  );
  const isCreditNote = invoice.isCreditNote || (invoice.invoiceNo && invoice.invoiceNo.includes('CN')) || invoice.storeMode === 'reoti_cn';
  const isPurchaseNote = invoice.isPurchaseNote || (invoice.invoiceNo && invoice.invoiceNo.includes('PN')) || invoice.storeMode === 'ambekar_pn';
  const isAmbekarInvoice = (invoice.invoiceNo && invoice.invoiceNo.startsWith('AH-')) || 
                           invoice.storeMode === 'ambekar' || invoice.storeMode === 'ambekar_pn';

  const effectiveHasGST = !isAmbekarInvoice && (hasGST || isCreditNote || (invoice.invoiceNo && invoice.invoiceNo.startsWith('RH-')));

  const activeShopName = invoice.shopName || (isAmbekarInvoice ? 'Ambekar Handloom House' : (settings.shopName || 'Reoti Handloom'));
  const activeLogo = invoice.shopLogo || (isAmbekarInvoice ? '/logo_ambekar.jpg' : '/logo.jpg');
  const acHolderName = settings.accountHolderName || 
                       invoice.accountHolderName || 
                       (isAmbekarInvoice ? 'Shivam Ambekar' : 'Reoti Handloom');

  const rateToDisplay = 5;
  const cgstVal = effectiveHasGST ? (invoice.totalCGST !== undefined && invoice.totalCGST !== null ? invoice.totalCGST : (isInterState ? 0 : parseFloat((taxableValue * 0.025).toFixed(2)))) : 0;
  const sgstVal = effectiveHasGST ? (invoice.totalSGST !== undefined && invoice.totalSGST !== null ? invoice.totalSGST : (isInterState ? 0 : parseFloat((taxableValue * 0.025).toFixed(2)))) : 0;
  const igstVal = effectiveHasGST ? (invoice.totalIGST !== undefined && invoice.totalIGST !== null ? invoice.totalIGST : (isInterState ? parseFloat((taxableValue * 0.05).toFixed(2)) : 0)) : 0;
  const finalTotal = invoice.grandTotal !== undefined && invoice.grandTotal !== null ? invoice.grandTotal : (taxableValue + (isInterState ? igstVal : (cgstVal + sgstVal)) + (parseFloat(invoice.courierCharges) || 0));

  // Multi-tier dynamic scaling based on item count to guarantee 100% full A4 page utilization & single-page fit
  const itemCount = items.length;

  const isFewItems = itemCount <= 3;
  const isMediumItems = itemCount >= 4 && itemCount <= 6;
  const isCompact = itemCount >= 7 && itemCount <= 11;
  const isUltraCompact = itemCount >= 12;

  const cellPadding = isFewItems ? '10px 12px' : (isMediumItems ? '6px 9px' : (isCompact ? '3.5px 6px' : '2px 4px'));
  const cellFontSize = isFewItems ? '0.88rem' : (isMediumItems ? '0.82rem' : (isCompact ? '0.76rem' : '0.7rem'));
  
  const logoSize = isFewItems ? '92px' : (isMediumItems ? '76px' : (isCompact ? '62px' : '52px'));
  const shopFontSize = isAmbekarInvoice 
    ? (isFewItems ? '1.75rem' : (isMediumItems ? '1.5rem' : (isCompact ? '1.3rem' : '1.15rem')))
    : (isFewItems ? '2.1rem' : (isMediumItems ? '1.8rem' : (isCompact ? '1.55rem' : '1.35rem')));

  const qrSize = isFewItems ? '85px' : (isMediumItems ? '72px' : (isCompact ? '60px' : '50px'));
  const containerPadding = isFewItems ? '18px 22px' : (isMediumItems ? '14px 18px' : (isCompact ? '10px 14px' : '6px 10px'));
  const sectionMarginBottom = isFewItems ? '14px' : (isMediumItems ? '10px' : (isCompact ? '6px' : '3px'));
  const signSpaceHeight = isFewItems ? '45px' : (isMediumItems ? '32px' : (isCompact ? '22px' : '16px'));
  const headerPadding = isFewItems ? '12px 16px' : (isMediumItems ? '10px 14px' : (isCompact ? '7px 11px' : '5px 9px'));
  const metaPadding = isFewItems ? '6px 12px' : (isMediumItems ? '5px 10px' : (isCompact ? '4px 8px' : '3px 6px'));
  const customerPadding = isFewItems ? '8px 12px' : (isMediumItems ? '6px 10px' : (isCompact ? '5px 8px' : '4px 6px'));
  const calcCellPadding = isFewItems ? '6px 8px' : (isMediumItems ? '4.5px 7px' : (isCompact ? '3px 5px' : '2px 4px'));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Select scrollable containers and save current scroll state
    const modalContent = document.querySelector('.modal-content');
    const modalBody = document.querySelector('.modal-body');
    const prevContentScroll = modalContent ? modalContent.scrollTop : 0;
    const prevBodyScroll = modalBody ? modalBody.scrollTop : 0;

    // Temporarily reset scroll to 0 to prevent html2canvas offset/clipping bug
    if (modalContent) modalContent.scrollTop = 0;
    if (modalBody) modalBody.scrollTop = 0;

    const element = document.getElementById('printable-invoice');
    const filename = `Invoice_${invoice.invoiceNo || 'Draft'}.pdf`;
    const opt = {
      margin:       [0, 0, 0, 0],
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true, scrollY: 0, scrollX: 0 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    // Renders the element as PDF and downloads it using a DOM-anchored link
    html2pdf()
      .set(opt)
      .from(element)
      .output('blob')
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Restore scroll positions
        if (modalContent) modalContent.scrollTop = prevContentScroll;
        if (modalBody) modalBody.scrollTop = prevBodyScroll;
      })
      .catch((err) => {
        console.error('PDF generation failed:', err);
        // Restore scroll positions in case of error
        if (modalContent) modalContent.scrollTop = prevContentScroll;
        if (modalBody) modalBody.scrollTop = prevBodyScroll;
      });
  };

  const handleDownloadImage = () => {
    // Select scrollable containers and save current scroll state
    const modalContent = document.querySelector('.modal-content');
    const modalBody = document.querySelector('.modal-body');
    const prevContentScroll = modalContent ? modalContent.scrollTop : 0;
    const prevBodyScroll = modalBody ? modalBody.scrollTop : 0;

    // Temporarily reset scroll to 0 to prevent html2canvas offset/clipping bug
    if (modalContent) modalContent.scrollTop = 0;
    if (modalBody) modalBody.scrollTop = 0;

    const element = document.getElementById('printable-invoice');
    const filename = `Invoice_${invoice.invoiceNo || 'Draft'}.png`;
    
    // Renders the element to high-res PNG image
    html2canvas(element, {
      scale: 3, // High density scale for super clear text when zooming in on WhatsApp or PDF openers
      useCORS: true,
      backgroundColor: '#fdfaf2',
      scrollY: 0,
      scrollX: 0
    }).then((canvas) => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Restore scroll positions
      if (modalContent) modalContent.scrollTop = prevContentScroll;
      if (modalBody) modalBody.scrollTop = prevBodyScroll;
    }).catch((err) => {
      console.error('Image generation failed:', err);
      // Restore scroll positions in case of error
      if (modalContent) modalContent.scrollTop = prevContentScroll;
      if (modalBody) modalBody.scrollTop = prevBodyScroll;
    });
  };

  return (
    <div className="modal-overlay print-modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
        <div className="modal-header no-print">
          <h3 className="brand-heading">Invoice Options</h3>
          <div className="d-flex gap-2">
            <button className="btn btn-emerald btn-sm" onClick={handleDownloadPDF} title="Download PDF for Adobe Acrobat or print utilities">
              <Download size={16} /> Download PDF (Acrobat)
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleDownloadImage} title="Download high-resolution image to share on WhatsApp">
              <Download size={16} /> Download Image
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} title="Open printer options">
              <Printer size={16} /> Print / Save
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              <X size={16} /> Close
            </button>
          </div>
        </div>

        <div className="modal-body print-invoice-layout" id="printable-invoice" style={{ padding: containerPadding, background: '#fdfaf2', color: '#4a2c11', position: 'relative', border: '3px double #b45309', boxShadow: 'inset 0 0 0 2px #d4af37, inset 0 0 0 4px #fdfaf2, inset 0 0 0 5px #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}>
          {/* Centered background watermark logo */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: isFewItems ? '320px' : (isMediumItems ? '280px' : '230px'),
            height: isFewItems ? '320px' : (isMediumItems ? '280px' : '230px'),
            backgroundImage: `url(${activeLogo})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.035,
            pointerEvents: 'none',
            zIndex: 0
          }} />

          {/* Royal Maheshwari Handloom Header */}
          <div className="print-invoice-header" style={{
            backgroundColor: '#fffef9',
            color: '#4a2c11',
            borderRadius: '6px',
            padding: headerPadding,
            marginBottom: sectionMarginBottom,
            display: 'grid',
            gridTemplateColumns: '1.45fr 1fr',
            gap: isFewItems ? '16px' : '12px',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
            border: '1px solid #b45309',
            boxShadow: 'inset 0 0 0 2px #fef3c7, 0 2px 6px rgba(180,83,9,0.08)'
          }}>
            {/* Left Brand & Craftsmanship Column */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isFewItems ? '16px' : '12px' }}>
              <img src={activeLogo} alt="Logo" style={{ height: logoSize, width: logoSize, objectFit: 'contain', borderRadius: '8px', border: '1px solid #b45309', backgroundColor: '#ffffff', padding: '3px', boxShadow: '0 2px 6px rgba(180,83,9,0.12)', flexShrink: 0 }} />
              <div>
                <h1 className="brand-heading" style={{ fontSize: shopFontSize, color: '#78350f', fontWeight: '800', margin: 0, letterSpacing: isAmbekarInvoice ? '0.2px' : '0.5px', lineHeight: '1.05', whiteSpace: 'nowrap' }}>
                  {activeShopName}
                </h1>
                {isAmbekarInvoice ? (
                  <div style={{ fontSize: isFewItems ? '0.88rem' : '0.8rem', fontWeight: '500', color: '#b45309', fontStyle: 'italic', marginTop: '2px' }}>
                    -By Reoti Handloom
                  </div>
                ) : (
                  <div className="gold-badge" style={{ backgroundColor: '#fef3c7', color: '#78350f', border: '1px solid #f59e0b', padding: isFewItems ? '3px 10px' : '2px 6px', borderRadius: '14px', fontSize: isFewItems ? '0.74rem' : '0.68rem', fontWeight: '700', marginTop: '3px', display: 'inline-block', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    ✨ Something "MORE" In Maheshwari Handloom
                  </div>
                )}
                <p style={{ margin: '3px 0 0 0', fontSize: isFewItems ? '0.82rem' : '0.76rem', fontWeight: '600', color: '#451a03', lineHeight: '1.2' }}>
                  Manufacturer of Maheshwari Handloom Sarees, Dress Materials, & Dupattas
                </p>
              </div>
            </div>

            {/* Right Royal Contact & GSTIN Card */}
            <div style={{
              backgroundColor: '#fef7e6',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: isFewItems ? '8px 12px' : '6px 10px',
              fontSize: isFewItems ? '0.8rem' : '0.75rem',
              color: '#451a03',
              display: 'flex',
              flexDirection: 'column',
              gap: isFewItems ? '4px' : '2px',
              boxShadow: '0 1px 4px rgba(180,83,9,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #fed7aa', paddingBottom: '3px' }}>
                <span style={{ color: '#b45309', fontSize: '0.85rem' }}>📍</span>
                <span style={{ fontSize: isFewItems ? '0.78rem' : '0.74rem', lineHeight: '1.15', fontWeight: '600', color: '#451a03' }}>{settings.shopAddress}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #fed7aa', paddingBottom: '3px' }}>
                <span style={{ color: '#b45309', fontSize: '0.85rem' }}>📞</span>
                <span style={{ fontWeight: '700', color: '#451a03' }}>+{settings.shopPhone || '91-9617444445'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: !isAmbekarInvoice && settings.shopGSTIN ? '1px solid #fed7aa' : 'none', paddingBottom: !isAmbekarInvoice && settings.shopGSTIN ? '3px' : 0 }}>
                <span style={{ color: '#b45309', fontSize: '0.85rem' }}>✉️</span>
                <span style={{ fontSize: isFewItems ? '0.78rem' : '0.74rem', color: '#451a03', fontWeight: '500' }}>{settings.shopEmail}</span>
              </div>
              {!isAmbekarInvoice && settings.shopGSTIN && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#b45309', fontSize: '0.88rem', fontWeight: '800' }}>🏛️</span>
                  <span style={{ fontSize: isFewItems ? '0.8rem' : '0.76rem', fontWeight: '800', color: '#78350f' }}>
                    GSTIN: <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{settings.shopGSTIN}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Invoice / Credit Note / Purchase Note Meta Banner */}
          {isPurchaseNote ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', backgroundColor: '#f3e8ff', border: '1px solid #8b5cf6', borderRadius: '5px', padding: metaPadding, marginBottom: sectionMarginBottom, position: 'relative', zIndex: 1 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: isFewItems ? '1.15rem' : '1.05rem', fontWeight: '800', color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📦</span> PURCHASE NOTE (खरीद नोट)
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '10px 14px', flexWrap: 'wrap', fontSize: isFewItems ? '0.88rem' : '0.82rem', color: '#581c87' }}>
                <span>Purchase Note No: <strong>{invoice.invoiceNo}</strong></span>
                <span>Date: <strong>{formatDateToDDMMYYYY(invoice.date)}</strong></span>
              </div>
            </div>
          ) : isCreditNote ? (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #ef4444', borderRadius: '5px', padding: metaPadding, marginBottom: sectionMarginBottom, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', borderBottom: '1px dashed #fca5a5', paddingBottom: '3px', marginBottom: '3px' }}>
                <h2 style={{ margin: 0, fontSize: isFewItems ? '1.15rem' : '1.05rem', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📑</span> GST CREDIT NOTE
                </h2>
                <div style={{ display: 'flex', gap: '10px 14px', flexWrap: 'wrap', fontSize: isFewItems ? '0.88rem' : '0.82rem', color: '#991b1b' }}>
                  <span>Credit Note No: <strong>{invoice.invoiceNo}</strong></span>
                  <span>Date: <strong>{formatDateToDDMMYYYY(invoice.date)}</strong></span>
                  <span>HSN: <strong>5208</strong></span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 8px', fontSize: isFewItems ? '0.82rem' : '0.78rem', color: '#7f1d1d' }}>
                <span>Original Invoice No: <strong>{invoice.originalInvoiceNo || 'N/A'}</strong></span>
                {invoice.originalInvoiceDate && <span>Original Invoice Date: <strong>{formatDateToDDMMYYYY(invoice.originalInvoiceDate)}</strong></span>}
                <span>Reason for Credit Note: <strong style={{ color: '#dc2626' }}>{invoice.reasonForCN || 'Sales Return'}</strong></span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '5px', padding: metaPadding, marginBottom: sectionMarginBottom, position: 'relative', zIndex: 1 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: isFewItems ? '1.15rem' : '1.05rem', fontWeight: '800', color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {effectiveHasGST ? 'TAX INVOICE' : 'RETAIL INVOICE'}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '10px 14px', flexWrap: 'wrap', fontSize: isFewItems ? '0.88rem' : '0.82rem', color: '#451a03' }}>
                <span>Invoice No: <strong>{invoice.invoiceNo}</strong></span>
                <span>Date: <strong>{formatDateToDDMMYYYY(invoice.date)}</strong></span>
                {effectiveHasGST && <span>HSN Code: <strong>5208</strong></span>}
              </div>
            </div>
          )}

          {/* Customer & Billing Details */}
          <div className="print-invoice-grid" style={{ marginBottom: sectionMarginBottom, fontSize: cellFontSize }}>
            <div style={{ padding: customerPadding, border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>
              <h4 style={{ margin: '0 0 3px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', textTransform: 'uppercase', color: '#475569', fontSize: isFewItems ? '0.8rem' : '0.74rem' }}>
                {isPurchaseNote ? 'Purchased From (Supplier / Weaver):' : (isCreditNote ? 'Credited To (Customer):' : 'Billed To (Customer):')}
              </h4>
              <p style={{ margin: '2px 0', fontWeight: '700' }}>{invoice.customerName || (isPurchaseNote ? 'Weaver / Vendor' : 'Walk-in Customer')}</p>
              {invoice.customerPhone && <p style={{ margin: '1px 0' }}>Phone: {invoice.customerPhone}</p>}
              {invoice.customerEmail && <p style={{ margin: '1px 0' }}>Email: {invoice.customerEmail}</p>}
              {invoice.customerAddress && <p style={{ margin: '1px 0' }}>Address: {invoice.customerAddress}</p>}
              {invoice.customerGSTIN && (
                <p style={{ margin: '2px 0 0 0', fontWeight: '600' }}>
                  GSTIN: <span style={{ textTransform: 'uppercase' }}>{invoice.customerGSTIN}</span>
                </p>
              )}
              {invoice.remarks && (
                <p style={{ margin: '3px 0 0 0', borderTop: '1px dashed #cbd5e1', paddingTop: '2px', fontSize: '0.76rem', fontStyle: 'italic', color: '#475569' }}>
                  Remarks: {invoice.remarks}
                </p>
              )}
            </div>
          </div>

          {/* Product Items Table */}
          <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: sectionMarginBottom }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '4%' }}>#</th>
                <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'left', width: '48%' }}>Item Description</th>
                <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '10%' }}>HSN</th>
                <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'right', width: '12%' }}>Rate</th>
                <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '8%' }}>Qty</th>
                <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '8%' }}>Unit</th>
                <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'right', width: '10%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, fontWeight: '500', fontSize: cellFontSize }}>{item.name}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{item.hsn || '5208'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>₹{(parseFloat(item.rate) || 0).toFixed(2)}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{item.qty}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{item.unit}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>₹{(parseFloat(item.total) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                <td colSpan={4} style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>Total Quantity:</td>
                <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{totalQty}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: cellPadding }}></td>
                <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>₹{taxableValue.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Subtotals & GST breakup split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: isFewItems ? '16px' : '10px', marginBottom: sectionMarginBottom }}>
            {/* Tax Schedule Column */}
            <div>
              {effectiveHasGST && settings.shopGSTIN && (
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: isFewItems ? '10px' : '6px', backgroundColor: '#fff' }}>
                  <h5 style={{ margin: '0 0 4px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', color: '#475569', fontSize: isFewItems ? '0.8rem' : '0.72rem' }}>
                    GST Tax Breakdown Schedule
                  </h5>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isFewItems ? '0.78rem' : '0.7rem', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                        <th style={{ padding: calcCellPadding, textAlign: 'left' }}>HSN / Rate</th>
                        <th style={{ padding: calcCellPadding }}>Taxable Amt</th>
                        {isInterState ? (
                          <th style={{ padding: calcCellPadding }}>IGST Amt</th>
                        ) : (
                          <>
                            <th style={{ padding: calcCellPadding }}>CGST Amt</th>
                            <th style={{ padding: calcCellPadding }}>SGST Amt</th>
                          </>
                        )}
                        <th style={{ padding: calcCellPadding, textAlign: 'right' }}>Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateToDisplay > 0 ? (
                        <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                          <td style={{ padding: calcCellPadding, textAlign: 'left', fontWeight: '600' }}>HSN 5208 ({rateToDisplay}%)</td>
                          <td style={{ padding: calcCellPadding }}>₹{taxableValue.toFixed(2)}</td>
                          {isInterState ? (
                            <td style={{ padding: calcCellPadding }}>₹{igstVal.toFixed(2)} ({rateToDisplay}%)</td>
                          ) : (
                            <>
                              <td style={{ padding: calcCellPadding }}>₹{cgstVal.toFixed(2)} ({(rateToDisplay / 2).toFixed(1).replace('.0', '')}%)</td>
                              <td style={{ padding: calcCellPadding }}>₹{sgstVal.toFixed(2)} ({(rateToDisplay / 2).toFixed(1).replace('.0', '')}%)</td>
                            </>
                          )}
                          <td style={{ padding: calcCellPadding, textAlign: 'right', fontWeight: '600' }}>₹{(cgstVal + sgstVal + igstVal).toFixed(2)}</td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={isInterState ? 4 : 5} style={{ padding: '6px', color: '#64748b' }}>No tax items in bill.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bank Account Details & PhonePe QR for client */}
              {!isPurchaseNote && (
                <div style={{ display: 'flex', gap: isFewItems ? '12px' : '8px', alignItems: 'center', marginTop: isFewItems ? '10px' : '6px' }}>
                  <div style={{ flexGrow: 1, fontSize: isFewItems ? '0.82rem' : '0.74rem' }}>
                    <p style={{ margin: '0 0 3px 0', fontWeight: '700', textDecoration: 'underline', color: '#451a03' }}>Our Bank Account Details:</p>
                    <p style={{ margin: '2px 0', lineHeight: '1.25' }}>A/C Name: <strong>{acHolderName}</strong></p>
                    <p style={{ margin: '2px 0', lineHeight: '1.25' }}>Bank: <strong>{settings.bankName || (isAmbekarInvoice ? 'HDFC Bank' : 'HDFC')}</strong></p>
                    <p style={{ margin: '2px 0', lineHeight: '1.25' }}>Account No: <strong>{settings.bankAccountNo || (isAmbekarInvoice ? '50100394215668' : '99954444444445')}</strong></p>
                    <p style={{ margin: '2px 0', lineHeight: '1.25' }}>IFSC Code: <strong>{settings.bankIFSC || (isAmbekarInvoice ? 'HDFC0002116' : 'HDFC0002089')}</strong></p>
                    <p style={{ margin: '2px 0', lineHeight: '1.25' }}>Branch: <strong>{settings.bankBranch || (isAmbekarInvoice ? 'Maheshwar' : 'Maheshwar Branch')}</strong></p>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', padding: isFewItems ? '5px 8px' : '3px 4px', backgroundColor: '#fff' }}>
                    <p style={{ margin: '0 0 2px 0', fontSize: isFewItems ? '0.72rem' : '0.64rem', fontWeight: '700', color: '#5b21b6' }}>UPI / PhonePe Scan</p>
                    <img src={isAmbekarInvoice ? "/qr_ambekar.jpg" : "/qr_reoti.jpg"} alt="PhonePe QR Code" style={{ width: qrSize, height: qrSize, objectFit: 'contain' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Column */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isFewItems ? '0.88rem' : '0.8rem' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1' }}>{effectiveHasGST ? 'Total Taxable Value (Pre-tax):' : 'Subtotal (Gross):'}</td>
                    <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{taxableValue.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1' }}>Total Quantity:</td>
                    <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: '600' }}>{totalQty}</td>
                  </tr>
                  {effectiveHasGST && (
                    !isInterState ? (
                      <>
                        <tr>
                          <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1' }}>Add CGST @ 2.5%:</td>
                          <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{cgstVal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1' }}>Add SGST @ 2.5%:</td>
                          <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{sgstVal.toFixed(2)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1' }}>Add IGST @ 5%:</td>
                        <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{igstVal.toFixed(2)}</td>
                      </tr>
                    )
                  )}

                  {invoice.courierCharges > 0 && (
                    <tr>
                      <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', fontWeight: '500' }}>Courier Charges:</td>
                      <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{parseFloat(invoice.courierCharges).toFixed(2)}</td>
                    </tr>
                  )}
                  {Math.abs(invoice.roundOff || 0) > 0 && (
                    <tr>
                      <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', fontSize: isFewItems ? '0.8rem' : '0.74rem', color: '#475569' }}>Round Off Adjustment:</td>
                      <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right', fontSize: isFewItems ? '0.85rem' : '0.78rem' }}>₹{(invoice.roundOff || 0).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: 'bold', fontSize: isFewItems ? '1.02rem' : '0.92rem', backgroundColor: '#f1f5f9' }}>
                    <td style={{ padding: isFewItems ? '7px 8px' : '5px', border: '2px solid #000' }}>Net Payable Amount:</td>
                    <td style={{ padding: isFewItems ? '7px 8px' : '5px', border: '2px solid #000', textAlign: 'right' }}>{formatCurrency(finalTotal)}</td>
                  </tr>

                  {/* Udhar / Partial payment schedule on printed receipt */}
                  {(invoice.dueAmount > 0 || (invoice.paidAmount !== undefined && parseFloat(invoice.paidAmount) < finalTotal)) && (
                    <>
                      <tr style={{ fontWeight: '600', fontSize: isFewItems ? '0.9rem' : '0.82rem', color: '#16a34a' }}>
                        <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1' }}>Amount Paid:</td>
                        <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right' }}>{formatCurrency(invoice.paidAmount !== undefined ? parseFloat(invoice.paidAmount) : (invoice.paymentStatus === 'Unpaid' ? 0 : finalTotal))}</td>
                      </tr>
                      <tr style={{ fontWeight: 'bold', fontSize: isFewItems ? '0.95rem' : '0.88rem', color: '#dc2626', backgroundColor: '#fef2f2' }}>
                        <td style={{ padding: calcCellPadding, border: '2px solid #dc2626' }}>Balance Due Amount:</td>
                        <td style={{ padding: calcCellPadding, border: '2px solid #dc2626', textAlign: 'right' }}>{formatCurrency(invoice.dueAmount !== undefined ? parseFloat(invoice.dueAmount) : Math.max(0, finalTotal - (parseFloat(invoice.paidAmount) || 0)))}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>


          {/* Amount In Words */}
          <div style={{ border: '1px solid #cbd5e1', padding: isFewItems ? '6px 12px' : '4px 8px', borderRadius: '4px', marginBottom: sectionMarginBottom, fontSize: isFewItems ? '0.84rem' : '0.78rem', backgroundColor: '#fff' }}>
            <span>Amount Chargeable in Words: </span>
            <strong style={{ textTransform: 'capitalize' }}>{priceToWords(finalTotal)}</strong>
          </div>

          {/* Bill Terms and Signatures */}
          <div className="print-footer-terms" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: isFewItems ? '16px' : '10px', marginTop: isFewItems ? '12px' : '6px', fontSize: isFewItems ? '0.76rem' : '0.7rem', color: '#475569' }}>
            <div>
              <h5 style={{ margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 'bold', fontSize: isFewItems ? '0.76rem' : '0.7rem' }}>Terms & Conditions:</h5>
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.2' }}>
                {settings.termsConditions}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' }}>
              <p style={{ margin: 0 }}>For <strong>{activeShopName}</strong></p>
              <div style={{ height: signSpaceHeight }}></div> {/* Sign space */}
              <p style={{ margin: 0, borderTop: '1px solid #cbd5e1', width: '80%', paddingTop: '2px' }}>Authorized Signatory</p>
            </div>
          </div>

          <div style={{ marginTop: isFewItems ? '10px' : '4px', textAlign: 'center', fontSize: isFewItems ? '0.8rem' : '0.74rem', fontStyle: 'italic', color: '#64748b' }}>
            Thank you for supporting handloom weavers. Visit again!
          </div>
        </div>
      </div>
    </div>
  );
}
