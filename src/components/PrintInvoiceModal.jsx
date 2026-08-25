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

  // Multi-tier dynamic scaling based on item count to guarantee 100% full A4 page utilization & single-page fit without any cutoff
  const itemCount = items.length;

  const tier = itemCount <= 4 ? 1 : (itemCount <= 8 ? 2 : (itemCount <= 12 ? 3 : (itemCount <= 16 ? 4 : 5)));

  const cellPadding = tier === 1 ? '7.5px 10px' : (tier === 2 ? '5.5px 9px' : (tier === 3 ? '4.5px 8px' : (tier === 4 ? '3.5px 6px' : '2px 4px')));
  const cellFontSize = tier === 1 ? '0.86rem' : (tier === 2 ? '0.80rem' : (tier === 3 ? '0.76rem' : (tier === 4 ? '0.72rem' : '0.68rem')));
  
  const logoSize = tier === 1 ? '85px' : (tier === 2 ? '75px' : (tier === 3 ? '64px' : (tier === 4 ? '54px' : '46px')));
  const shopFontSize = isAmbekarInvoice 
    ? (tier === 1 ? '1.75rem' : (tier === 2 ? '1.5rem' : (tier === 3 ? '1.35rem' : (tier === 4 ? '1.2rem' : '1.1rem'))))
    : (tier === 1 ? '1.75rem' : (tier === 2 ? '1.5rem' : (tier === 3 ? '1.35rem' : (tier === 4 ? '1.2rem' : '1.1rem'))));

  const qrSize = tier === 1 ? '78px' : (tier === 2 ? '70px' : (tier === 3 ? '60px' : (tier === 4 ? '50px' : '44px')));
  const containerPadding = tier === 1 ? '12px 16px' : (tier === 2 ? '10px 14px' : (tier === 3 ? '8px 12px' : (tier === 4 ? '6px 10px' : '5px 8px')));
  const sectionMarginBottom = tier === 1 ? '5.5px' : (tier === 2 ? '4.5px' : (tier === 3 ? '3.5px' : (tier === 4 ? '2.5px' : '2px')));
  const headerPadding = tier === 1 ? '9px 12px' : (tier === 2 ? '7.5px 11px' : (tier === 3 ? '6.5px 10px' : (tier === 4 ? '5.5px 8px' : '5px 7px')));
  const metaPadding = tier === 1 ? '4.5px 9px' : (tier === 2 ? '3.5px 7.5px' : (tier === 3 ? '3px 6.5px' : (tier === 4 ? '2.5px 5.5px' : '2px 4.5px')));
  const customerPadding = tier === 1 ? '6px 9px' : (tier === 2 ? '5px 8px' : (tier === 3 ? '4px 7px' : (tier === 4 ? '3px 5px' : '2.5px 4.5px')));
  const calcCellPadding = tier === 1 ? '4.5px 6px' : (tier === 2 ? '4px 5.5px' : (tier === 3 ? '3.5px 5px' : (tier === 4 ? '3px 4px' : '2px 4px')));
  const isFewItems = tier <= 2;
  const isMediumItems = tier === 3;

  // Dynamic grid rows to fill vertical page height seamlessly without blank holes or footer cutoff
  // Tier 1: 8 target rows, Tier 2: 9 target rows, Tier 3: 10 target rows
  const baseTargetRows = tier === 1 ? 8 : (tier === 2 ? 9 : (tier === 3 ? 10 : itemCount));
  const targetGridRows = effectiveHasGST ? Math.max(itemCount, baseTargetRows - 1) : baseTargetRows;
  const emptyRowCount = Math.max(0, targetGridRows - itemCount);
  const emptyRowHeight = tier === 1 ? '20px' : (tier === 2 ? '18px' : (tier === 3 ? '16px' : '14px'));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-invoice');
    if (!element) return;

    // Create an isolated off-screen container with exact A4 printable dimensions (764px x 1093px)
    // This leaves a clean, uniform 4mm white page margin on all 4 sides of the A4 sheet
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '764px';
    container.style.height = '1093px';
    container.style.zIndex = '-9999';
    container.style.backgroundColor = '#ffffff';
    container.style.overflow = 'hidden';
    container.style.margin = '0';
    container.style.padding = '0';

    const clone = element.cloneNode(true);
    clone.classList.add('a4-pdf-export');
    container.appendChild(clone);
    document.body.appendChild(container);

    // Brief layout tick for off-screen element
    await new Promise((resolve) => setTimeout(resolve, 60));

    const filename = `Invoice_${invoice.invoiceNo || 'Draft'}.pdf`;
    const opt = {
      margin:       [4, 4, 4, 4],
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 3, 
        useCORS: true, 
        letterRendering: false, 
        scrollY: 0, 
        scrollX: 0,
        windowWidth: 764,
        windowHeight: 1093
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    try {
      const blob = await html2pdf().set(opt).from(clone).output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('printable-invoice');
    if (!element) return;

    // Create an isolated off-screen container with exact A4 printable dimensions (764px x 1093px)
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '764px';
    container.style.height = '1093px';
    container.style.zIndex = '-9999';
    container.style.backgroundColor = '#ffffff';
    container.style.overflow = 'hidden';
    container.style.margin = '0';
    container.style.padding = '0';

    const clone = element.cloneNode(true);
    clone.classList.add('a4-pdf-export');
    container.appendChild(clone);
    document.body.appendChild(container);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const filename = `Invoice_${invoice.invoiceNo || 'Draft'}.png`;
    
    try {
      const canvas = await html2canvas(clone, {
        scale: 3, // High density scale for super clear text
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: 0,
        scrollX: 0,
        windowWidth: 764,
        windowHeight: 1093
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
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

        <div className="modal-body print-invoice-layout" id="printable-invoice" style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, Helvetica, sans-serif", padding: containerPadding, background: '#fdfaf2', color: '#4a2c11', position: 'relative', border: '3px double #b45309', boxShadow: 'inset 0 0 0 2px #d4af37, inset 0 0 0 4px #fdfaf2, inset 0 0 0 5px #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
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

          {/* TOP GROUP: Header, Meta Banner, Customer Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: sectionMarginBottom, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {/* Royal Maheshwari Handloom Header */}
            <div className="print-invoice-header" style={{
              backgroundColor: '#fffef9',
              color: '#4a2c11',
              borderRadius: '6px',
              padding: headerPadding,
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', backgroundColor: '#f3e8ff', border: '1px solid #8b5cf6', borderRadius: '5px', padding: metaPadding, position: 'relative', zIndex: 1 }}>
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
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #ef4444', borderRadius: '5px', padding: metaPadding, position: 'relative', zIndex: 1 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '5px', padding: metaPadding, position: 'relative', zIndex: 1 }}>
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
            <div className="print-invoice-grid" style={{ fontSize: cellFontSize }}>
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
          </div>

          {/* MIDDLE GROUP: Expanding Product Items Table */}
          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', margin: `${sectionMarginBottom} 0`, position: 'relative', zIndex: 1 }}>
            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', height: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '4%' }}>#</th>
                  <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'left', width: '42%' }}>Item Description</th>
                  <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '9%' }}>HSN</th>
                  <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '9%' }}>Meter</th>
                  <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'right', width: '12%' }}>Rate</th>
                  <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '7%' }}>Qty</th>
                  <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'center', width: '7%' }}>Unit</th>
                  <th style={{ border: '1px solid #94a3b8', padding: cellPadding, fontSize: cellFontSize, textAlign: 'right', width: '10%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, fontWeight: '500', fontSize: cellFontSize }}>{item.name}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{item.hsn || '5208'}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize, fontWeight: '600' }}>
                      {item.meter !== undefined && item.meter !== null ? item.meter : (item.cut || '6.20')}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>₹{(parseFloat(item.rate) || 0).toFixed(2)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>
                      {typeof item.qty === 'number' && item.qty < 10 ? `0${item.qty}` : item.qty}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{item.unit || 'Pcs'}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>₹{(parseFloat(item.total) || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {/* Empty filler rows to maintain full page grid layout exactly like reference invoice */}
                {Array.from({ length: emptyRowCount }).map((_, idx) => (
                  <tr key={`empty-${idx}`} style={{ height: emptyRowHeight }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, fontSize: cellFontSize }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                  <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>Total Quantity:</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'center', fontSize: cellFontSize }}>{totalQty}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding }}></td>
                  <td style={{ border: '1px solid #cbd5e1', padding: cellPadding, textAlign: 'right', fontSize: cellFontSize }}>₹{taxableValue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* BOTTOM GROUP: Anchored Footer Section at Very Bottom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: sectionMarginBottom, marginTop: 'auto', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {/* Subtotals & GST breakup split */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: isFewItems ? '16px' : '10px' }}>
              {/* Authentic Guarantee Column */}
              <div>
                {/* Authentic Handloom Guarantee Box for All Invoices */}
                <div style={{ border: '1px solid #f59e0b', borderRadius: '4px', padding: isFewItems ? '8px 12px' : '6px 10px', backgroundColor: '#fef3c7', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 3px 0', color: '#78350f', fontWeight: '700', fontSize: isFewItems ? '0.8rem' : '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    ✨ AUTHENTIC HANDLOOM GUARANTEE
                  </h5>
                  <p style={{ margin: '1px 0', fontSize: isFewItems ? '0.75rem' : '0.68rem', color: '#451a03', fontWeight: '500' }}>
                    • 100% Authentic Maheshwari Weave (Pure Silk & Cotton)
                  </p>
                  <p style={{ margin: '1px 0', fontSize: isFewItems ? '0.75rem' : '0.68rem', color: '#451a03', fontWeight: '500' }}>
                    • Direct Handcrafted Product from Traditional Weavers of Maheshwar
                  </p>
                </div>

                {/* Bank Account Details & PhonePe QR for client */}
                {!isPurchaseNote && (
                  <div style={{ display: 'flex', gap: isFewItems ? '12px' : '8px', alignItems: 'center', marginTop: '4px' }}>
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
            <div style={{ border: '1px solid #cbd5e1', padding: isFewItems ? '6px 12px' : '4px 8px', borderRadius: '4px', fontSize: isFewItems ? '0.84rem' : '0.78rem', backgroundColor: '#fff' }}>
              <span>Amount Chargeable in Words: </span>
              <strong style={{ textTransform: 'capitalize' }}>{priceToWords(finalTotal)}</strong>
            </div>

            {/* Bill Terms and Signatures */}
            <div className="print-footer-terms" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: isFewItems ? '16px' : '10px', fontSize: isFewItems ? '0.76rem' : '0.7rem', color: '#475569' }}>
              <div>
                <h5 style={{ margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 'bold', fontSize: isFewItems ? '0.76rem' : '0.7rem' }}>Terms & Conditions:</h5>
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.2' }}>
                  {settings.termsConditions || "1. Goods once sold cannot be taken back.\n2. Interest @ 18% will be charged if bill is not settled within 15 days.\n3. All disputes are subject to Maheshwar jurisdiction."}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: isFewItems ? '0.8rem' : '0.74rem' }}>For <strong>{activeShopName}</strong></p>
                <img 
                  src="/signature.png" 
                  alt="Authorized Signature" 
                  style={{ 
                    height: isFewItems ? '48px' : (isMediumItems ? '38px' : '30px'), 
                    width: 'auto', 
                    objectFit: 'contain',
                    margin: '2px 0'
                  }} 
                />
                <p style={{ margin: 0, borderTop: '1px solid #cbd5e1', width: '85%', paddingTop: '2px', fontSize: isFewItems ? '0.76rem' : '0.7rem' }}>Authorized Signatory</p>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: isFewItems ? '0.8rem' : '0.74rem', fontStyle: 'italic', color: '#64748b' }}>
              Thank you for supporting handloom weavers. Visit again!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
