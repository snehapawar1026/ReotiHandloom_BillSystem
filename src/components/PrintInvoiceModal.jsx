import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Sparkles, Layers, FileText, Phone, Mail, Award, MapPin, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
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
  const [printMode, setPrintMode] = useState('duplex_2sided'); // 'duplex_2sided' | 'invoice_only' | 'heritage_only'
  const [previewTab, setPreviewTab] = useState('all'); // 'all' | 'front' | 'back'
  const [backTheme, setBackTheme] = useState('merged_heritage'); // 'merged_heritage' | 'ahilyabai_sketch' | 'pit_loom' | 'weaving_loom'
  const [showPdfDropdown, setShowPdfDropdown] = useState(false); // PDF download options dropdown

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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

  const cgstVal = effectiveHasGST ? (invoice.totalCGST !== undefined && invoice.totalCGST !== null ? invoice.totalCGST : (isInterState ? 0 : parseFloat((taxableValue * 0.025).toFixed(2)))) : 0;
  const sgstVal = effectiveHasGST ? (invoice.totalSGST !== undefined && invoice.totalSGST !== null ? invoice.totalSGST : (isInterState ? 0 : parseFloat((taxableValue * 0.025).toFixed(2)))) : 0;
  const igstVal = effectiveHasGST ? (invoice.totalIGST !== undefined && invoice.totalIGST !== null ? invoice.totalIGST : (isInterState ? parseFloat((taxableValue * 0.05).toFixed(2)) : 0)) : 0;
  const finalTotal = invoice.grandTotal !== undefined && invoice.grandTotal !== null ? invoice.grandTotal : (taxableValue + (isInterState ? igstVal : (cgstVal + sgstVal)) + (parseFloat(invoice.courierCharges) || 0));
  const advanceAdjustedVal = parseFloat(invoice.advanceAdjusted) || 0;
  const netPayableTotal = Math.max(0, finalTotal - advanceAdjustedVal);
  const paidVal = (invoice.paidAmount !== undefined && invoice.paidAmount !== null && invoice.paidAmount !== '') 
    ? parseFloat(invoice.paidAmount) 
    : (invoice.paymentStatus === 'Unpaid' ? 0 : netPayableTotal);
  const excessPaidVal = Math.max(0, paidVal - netPayableTotal);
  const dueAmountVal = Math.max(0, netPayableTotal - paidVal);

  // Dynamic scaling based on item count
  const itemCount = items.length;
  const tier = itemCount <= 4 ? 1 : (itemCount <= 8 ? 2 : (itemCount <= 12 ? 3 : (itemCount <= 16 ? 4 : 5)));

  const cellPadding = tier === 1 ? '7.5px 10px' : (tier === 2 ? '5.5px 9px' : (tier === 3 ? '4.5px 8px' : (tier === 4 ? '3.5px 6px' : '2px 4px')));
  const cellFontSize = tier === 1 ? '0.86rem' : (tier === 2 ? '0.80rem' : (tier === 3 ? '0.76rem' : (tier === 4 ? '0.72rem' : '0.68rem')));
  
  const logoSize = tier === 1 ? '85px' : (tier === 2 ? '75px' : (tier === 3 ? '64px' : (tier === 4 ? '54px' : '46px')));
  const shopFontSize = tier === 1 ? '1.75rem' : (tier === 2 ? '1.5rem' : (tier === 3 ? '1.35rem' : (tier === 4 ? '1.2rem' : '1.1rem')));

  const qrSize = tier === 1 ? '78px' : (tier === 2 ? '70px' : (tier === 3 ? '60px' : (tier === 4 ? '50px' : '44px')));
  const containerPadding = tier === 1 ? '12px 16px' : (tier === 2 ? '10px 14px' : (tier === 3 ? '8px 12px' : (tier === 4 ? '6px 10px' : '5px 8px')));
  const sectionMarginBottom = tier === 1 ? '5.5px' : (tier === 2 ? '4.5px' : (tier === 3 ? '3.5px' : (tier === 4 ? '2.5px' : '2px')));
  const headerPadding = tier === 1 ? '9px 12px' : (tier === 2 ? '7.5px 11px' : (tier === 3 ? '6.5px 10px' : (tier === 4 ? '5.5px 8px' : '5px 7px')));
  const metaPadding = tier === 1 ? '4.5px 9px' : (tier === 2 ? '3.5px 7.5px' : (tier === 3 ? '3px 6.5px' : (tier === 4 ? '2.5px 5.5px' : '2px 4.5px')));
  const customerPadding = tier === 1 ? '6px 9px' : (tier === 2 ? '5px 8px' : (tier === 3 ? '4px 7px' : (tier === 4 ? '3px 5px' : '2.5px 4.5px')));
  const calcCellPadding = tier === 1 ? '4.5px 6px' : (tier === 2 ? '4px 5.5px' : (tier === 3 ? '3.5px 5px' : (tier === 4 ? '3px 4px' : '2px 4px')));
  const isFewItems = tier <= 2;
  const isMediumItems = tier === 3;

  const baseTargetRows = tier === 1 ? 8 : (tier === 2 ? 9 : (tier === 3 ? 10 : itemCount));
  const targetGridRows = effectiveHasGST ? Math.max(itemCount, baseTargetRows - 1) : baseTargetRows;
  const emptyRowCount = Math.max(0, targetGridRows - itemCount);
  const emptyRowHeight = tier === 1 ? '20px' : (tier === 2 ? '18px' : (tier === 3 ? '16px' : '14px'));

  const handlePrint = (mode = printMode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadPDF = async (pages = 'both') => {
    try {
      const frontEl = document.getElementById('printable-invoice');
      const backEl = document.getElementById('printable-invoice-back');
      if (!frontEl && !backEl) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const includeFront = pages === 'both' || pages === 'front';
      const includeBack = (pages === 'both' || pages === 'back') && backEl;

      // Use actual viewport width so layout matches screen exactly (no text wrapping/reflow)
      const actualViewportWidth = document.documentElement.clientWidth || window.innerWidth || 1440;

      const captureOptions = {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        windowWidth: actualViewportWidth,
        windowHeight: document.documentElement.clientHeight || window.innerHeight || 900,
      };

      let pageCount = 0;

      // 1. Capture Front Page (Bill)
      if (includeFront && frontEl) {
        const origFrontDisplay = frontEl.style.display;
        if (origFrontDisplay === 'none') frontEl.style.display = 'flex';

        await new Promise((r) => setTimeout(r, 120));

        const canvasFront = await html2canvas(frontEl, captureOptions);
        if (origFrontDisplay === 'none') frontEl.style.display = origFrontDisplay;

        const imgData = canvasFront.toDataURL('image/jpeg', 0.97);
        // Maintain correct aspect ratio — fit to A4 width, let height follow
        const pdfW = 210;
        const pdfH = pdfW * (canvasFront.height / canvasFront.width);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
        pageCount++;
      }

      // 2. Capture Back Page (Heritage Card)
      if (includeBack && backEl) {
        const origBackDisplay = backEl.style.display;
        const parentEl = backEl.parentElement;
        const origParentDisplay = parentEl ? parentEl.style.display : '';

        if (origBackDisplay === 'none') backEl.style.display = 'flex';
        if (parentEl && origParentDisplay === 'none') parentEl.style.display = 'block';

        await new Promise((r) => setTimeout(r, 120));

        const canvasBack = await html2canvas(backEl, captureOptions);
        if (origBackDisplay === 'none') backEl.style.display = origBackDisplay;
        if (parentEl && origParentDisplay === 'none') parentEl.style.display = origParentDisplay;

        if (pageCount > 0) {
          pdf.addPage('a4', 'portrait');
        }
        const imgData = canvasBack.toDataURL('image/jpeg', 0.97);
        const pdfW = 210;
        const pdfH = pdfW * (canvasBack.height / canvasBack.width);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
        pageCount++;
      }

      if (pageCount > 0) {
        const suffix = pages === 'back' ? '_Heritage' : pages === 'both' ? '_2Sided' : '';
        const filename = `Invoice_${invoice.invoiceNo || 'Draft'}${suffix}.pdf`;
        pdf.save(filename);
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation error: ' + (err.message || 'Unknown error'));
    }
  };


  const handleDownloadImage = async () => {
    try {
      const targetId = (previewTab === 'back' || printMode === 'heritage_only') ? 'printable-invoice-back' : 'printable-invoice';
      const element = document.getElementById(targetId) || document.getElementById('printable-invoice');
      if (!element) return;

      const origDisplay = element.style.display;
      const parentEl = element.parentElement;
      const origParentDisplay = parentEl ? parentEl.style.display : '';

      if (origDisplay === 'none') element.style.display = 'flex';
      if (parentEl && origParentDisplay === 'none') parentEl.style.display = 'block';

      await new Promise((r) => setTimeout(r, 60));

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        windowWidth: document.documentElement.clientWidth || window.innerWidth || 1440,
        windowHeight: document.documentElement.clientHeight || window.innerHeight || 900,
      });

      if (origDisplay === 'none') element.style.display = origDisplay;
      if (parentEl && origParentDisplay === 'none') parentEl.style.display = origParentDisplay;

      const filename = `Invoice_${invoice.invoiceNo || 'Draft'}_${targetId === 'printable-invoice-back' ? 'BackCard' : 'Bill'}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Image generation failed:', err);
    }
  };

  // Render the Authentic Luxury Heritage Card
  const renderInvoiceHeritageBack = () => {
    const activeMainCard = isAmbekarInvoice ? '/ambekar_heritage_main_card.jpg' : '/reoti_heritage_main_card.jpg';

    if (backTheme === 'weaving_loom') {
      return (
        <div 
          id="printable-invoice-back"
          className="print-invoice-back-page"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            padding: '16px 22px 14px 22px',
            background: '#fcfaf6',
            color: '#451a03',
            position: 'relative',
            border: '2px solid #b45309',
            boxShadow: 'inset 0 0 0 3px #fcfaf6, inset 0 0 0 5px #d4af37, inset 0 0 0 7px #fcfaf6, inset 0 0 0 8px #cbd5e1',
            borderRadius: '4px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '1093px',
            height: '1093px',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Main Authentic Luxury Heritage Art Card */}
          <div style={{ 
            position: 'relative', 
            zIndex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            width: '100%',
            flexGrow: 1,
            overflow: 'hidden'
          }}>
            <img 
              src={activeMainCard} 
              alt="Reoti Handloom Heritage Card" 
              style={{
                width: '100%',
                maxHeight: '920px',
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </div>

          {/* Dynamic Store Address & Contact Details Block */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            borderTop: '1.5px solid #b45309',
            paddingTop: '10px',
            marginTop: '4px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '16px',
            alignItems: 'center',
            fontSize: '11.5px',
            color: '#451a03',
            fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          }}>
            {/* Left Column: Store Name & Physical Address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <MapPin size={16} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ lineHeight: '1.35' }}>
                <strong style={{ color: '#78350f', fontSize: '12.5px', display: 'block', marginBottom: '2px' }}>
                  {activeShopName}
                </strong>
                {settings.shopAddress || "73, LaxmiBai Marg, Maheshwar, Madhya Pradesh - 451224"}
              </div>
            </div>

            {/* Right Column: Phone, Email & GSTIN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={13} color="#b45309" />
                <span>Phone: <strong>+91 {invoice.shopPhone || settings.shopPhone || "9617444445"}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={13} color="#b45309" />
                <span>Email: <strong>{settings.shopEmail || "contact@reotihandloom.com"}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={13} color="#b45309" />
                <span>GSTIN: <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{effectiveHasGST ? (invoice.shopGSTIN || settings.shopGSTIN || "23AAAFR1234A1Z5") : "Pure Handloom Certified"}</strong></span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (backTheme === 'merged_heritage') {
      return (
        <div 
          id="printable-invoice-back"
          className="print-invoice-back-page"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            padding: '16px 20px 12px 20px',
            background: '#fdfbf7',
            color: '#451a03',
            position: 'relative',
            border: '2px solid #b45309',
            boxShadow: 'inset 0 0 0 3px #fdfbf7, inset 0 0 0 5px #d4af37, inset 0 0 0 7px #fdfbf7, inset 0 0 0 8px #cbd5e1',
            borderRadius: '4px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '1093px',
            height: '1093px',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Watermark Monogram */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '420px',
            height: '420px',
            backgroundImage: `url(${activeLogo})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.02,
            pointerEvents: 'none',
            zIndex: 0
          }} />

          {/* 1. TOP ROYAL EMBLEM & BRAND TITLE */}
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}>
              <img 
                src={activeLogo} 
                alt={activeShopName} 
                style={{ 
                  width: '52px', 
                  height: '52px', 
                  objectFit: 'contain',
                  borderRadius: '50%',
                  border: '2px solid #b45309',
                  padding: '2px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 3px 10px rgba(180,83,9,0.14)'
                }} 
              />
            </div>

            <h1 style={{ 
              fontFamily: "'Playfair Display', 'Cinzel', Georgia, serif", 
              fontSize: '27px', 
              color: '#78350f', 
              letterSpacing: '1.8px', 
              margin: '0', 
              fontWeight: '900', 
              textTransform: 'uppercase',
              lineHeight: '1.15' 
            }}>
              {activeShopName}
            </h1>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '2px'
            }}>
              <div style={{ height: '1px', width: '45px', background: 'linear-gradient(to right, transparent, #b45309)' }} />
              <span style={{ 
                fontFamily: "'Playfair Display', Georgia, serif", 
                fontSize: '13px', 
                fontStyle: 'italic',
                fontWeight: '600', 
                letterSpacing: '0.8px', 
                color: '#92400e'
              }}>
                A Legacy of Maheshwari Handloom
              </span>
              <div style={{ height: '1px', width: '45px', background: 'linear-gradient(to left, transparent, #b45309)' }} />
            </div>
          </div>

          {/* 2. CENTER HERO ARTWORK: FULL-SIZE HERITAGE MURAL FILLING THE PAGE */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            width: '100%',
            margin: '4px 0',
            minHeight: 0
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              maxHeight: '720px',
              background: '#ede3ce',
              border: '2px solid #b45309',
              borderRadius: '6px',
              padding: '2px',
              boxShadow: '0 4px 18px rgba(120,53,15,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}>
              <img 
                src="/maheshwar_heritage_mural_portrait.png" 
                alt="Rajmata Devi Ahilyabai Holkar & Traditional Maheshwari Pit-Loom Weaving Heritage Mural" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  borderRadius: '4px'
                }} 
              />
            </div>
          </div>

        {/* 3. HERITAGE STORY & GRATITUDE MESSAGE */}
        <div style={{
          textAlign: 'center',
          margin: '4px 0 6px 0',
          position: 'relative',
          zIndex: 1
        }}>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '11.5px',
            color: '#334155',
            lineHeight: '1.4',
            margin: '0 0 4px 0',
            fontStyle: 'italic'
          }}>
            "Initiated by Rajmata Devi Ahilyabai Holkar and preserved across generations by master pit-loom weavers of Maheshwar, every drape carries royal elegance and soulful craftsmanship."
          </p>
          <p style={{
            fontFamily: "'Playfair Display', 'Brush Script MT', 'Great Vibes', Georgia, cursive",
            fontStyle: 'italic',
            fontSize: '17px',
            color: '#78350f',
            margin: 0,
            fontWeight: '700'
          }}>
            Thank you for supporting handloom weavers. We hope you cherish your exquisite piece.
          </p>
        </div>

          {/* 4. DYNAMIC STORE ADDRESS & CONTACT DETAILS BLOCK */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            borderTop: '1.5px solid #b45309',
            paddingTop: '8px',
            marginTop: '2px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '14px',
            alignItems: 'center',
            fontSize: '11px',
            color: '#451a03',
            fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          }}>
            {/* Left Column: Store Name & Physical Address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
              <MapPin size={15} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ lineHeight: '1.3' }}>
                <strong style={{ color: '#78350f', fontSize: '12px', display: 'block', marginBottom: '1px' }}>
                  {activeShopName}
                </strong>
                {settings.shopAddress || "73, LaxmiBai Marg, Maheshwar, Madhya Pradesh - 451224"}
              </div>
            </div>

            {/* Right Column: Phone, Email & GSTIN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px', lineHeight: '1.25' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Phone size={12} color="#b45309" />
                <span>Phone: <strong>+91 {invoice.shopPhone || settings.shopPhone || "9617444445"}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={12} color="#b45309" />
                <span>Email: <strong>{settings.shopEmail || "contact@reotihandloom.com"}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Award size={12} color="#b45309" />
                <span>GSTIN: <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{effectiveHasGST ? (invoice.shopGSTIN || settings.shopGSTIN || "23AAAFR1234A1Z5") : "Pure Handloom Certified"}</strong></span>
              </div>
            </div>
          </div>
        </div>
      );
    }


    // Default: Individual Ahilyabai Sketch or Pit-Loom Sketch Design
    return (
      <div 
        id="printable-invoice-back"
        className="print-invoice-back-page"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          padding: '20px 26px 14px 26px',
          background: '#fdfbf7',
          color: '#451a03',
          position: 'relative',
          border: '2px solid #b45309',
          boxShadow: 'inset 0 0 0 3px #fdfbf7, inset 0 0 0 5px #d4af37, inset 0 0 0 7px #fdfbf7, inset 0 0 0 8px #cbd5e1',
          borderRadius: '4px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '1093px',
          height: '1093px',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Subtle Watermark Monogram */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '420px',
          height: '420px',
          backgroundImage: `url(${activeLogo})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          opacity: 0.02,
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* 1. TOP ROYAL EMBLEM & BRAND TITLE */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}>
            <img 
              src={activeLogo} 
              alt={activeShopName} 
              style={{ 
                width: '52px', 
                height: '52px', 
                objectFit: 'contain',
                borderRadius: '50%',
                border: '2px solid #b45309',
                padding: '2px',
                backgroundColor: '#ffffff',
                boxShadow: '0 3px 10px rgba(180,83,9,0.14)'
              }} 
            />
          </div>

          <h1 style={{ 
            fontFamily: "'Playfair Display', 'Cinzel', Georgia, serif", 
            fontSize: '27px', 
            color: '#78350f', 
            letterSpacing: '1.8px', 
            margin: '0', 
            fontWeight: '900', 
            textTransform: 'uppercase',
            lineHeight: '1.15' 
          }}>
            {activeShopName}
          </h1>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '2px'
          }}>
            <div style={{ height: '1px', width: '45px', background: 'linear-gradient(to right, transparent, #b45309)' }} />
            <span style={{ 
              fontFamily: "'Playfair Display', Georgia, serif", 
              fontSize: '13px', 
              fontStyle: 'italic',
              fontWeight: '600', 
              letterSpacing: '0.8px', 
              color: '#92400e'
            }}>
              A Legacy of Maheshwari Handloom
            </span>
            <div style={{ height: '1px', width: '45px', background: 'linear-gradient(to left, transparent, #b45309)' }} />
          </div>
        </div>

        {/* 2. CENTER HERO ARTWORK */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '6px 0',
          flexGrow: 1
        }}>
          <div style={{
            border: '2px solid #b45309',
            padding: '3px',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(120,53,15,0.12)',
            borderRadius: '4px',
            maxWidth: '430px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src={backTheme === 'pit_loom' ? "/maheshwari_pit_loom_sketch.jpg" : "/ahilyabai_vintage_sketch.jpg"} 
              alt={backTheme === 'pit_loom' ? "Traditional Maheshwari Pit-Loom Artisan Weaving" : "Rajmata Devi Ahilyabai Holkar & Maheshwar Ghat"} 
              style={{
                width: '100%',
                maxHeight: '460px',
                objectFit: 'contain',
                display: 'block',
                borderRadius: '2px'
              }} 
            />
          </div>
          <div style={{
            marginTop: '6px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '800',
            color: '#78350f',
            letterSpacing: '0.6px',
            textTransform: 'uppercase'
          }}>
            {backTheme === 'pit_loom' ? "Traditional Maheshwari Pit-Loom" : "Rajmata Devi Ahilyabai Holkar"}
          </div>
          <div style={{
            fontSize: '10.5px',
            fontStyle: 'italic',
            color: '#92400e',
            letterSpacing: '0.3px'
          }}>
            {backTheme === 'pit_loom' 
              ? "Authentic Handcrafted Weaves by Master Artisans of Maheshwar" 
              : "Visionary Patron & Pioneer of Maheshwari Handloom Craft"}
          </div>
        </div>


        {/* 3. HERITAGE STORY & GRATITUDE MESSAGE */}
        <div style={{
          textAlign: 'center',
          margin: '2px 0 6px 0',
          position: 'relative',
          zIndex: 1
        }}>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '11.5px',
            color: '#334155',
            lineHeight: '1.4',
            margin: '0 0 3px 0',
            fontStyle: 'italic'
          }}>
            {backTheme === 'pit_loom'
              ? '"Painstakingly woven on traditional wooden pit-looms using pure natural yarns, every warp and weft preserves a sacred 700-year-old living weaving heritage."'
              : backTheme === 'merged_heritage'
              ? '"Initiated by Rajmata Devi Ahilyabai Holkar and preserved across generations by master pit-loom weavers of Maheshwar, every drape carries royal elegance and soulful craftsmanship."'
              : '"Revived in the 18th century under the visionary patronage of Rajmata Ahilyabai Holkar, every Maheshwari weave carries a royal legacy of timeless elegance and master craftsmanship."'}
          </p>
          <p style={{
            fontFamily: "'Playfair Display', 'Brush Script MT', 'Great Vibes', Georgia, cursive",
            fontStyle: 'italic',
            fontSize: '16.5px',
            color: '#78350f',
            margin: 0,
            fontWeight: '700'
          }}>
            Thank you for supporting handloom weavers. We hope you cherish your exquisite piece.
          </p>
        </div>

        {/* 4. DYNAMIC STORE ADDRESS & CONTACT DETAILS BLOCK */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          borderTop: '1.5px solid #b45309',
          paddingTop: '8px',
          marginTop: '2px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '14px',
          alignItems: 'center',
          fontSize: '11px',
          color: '#451a03',
          fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"
        }}>
          {/* Left Column: Store Name & Physical Address */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
            <MapPin size={15} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ lineHeight: '1.3' }}>
              <strong style={{ color: '#78350f', fontSize: '12px', display: 'block', marginBottom: '1px' }}>
                {activeShopName}
              </strong>
              {settings.shopAddress || "73, LaxmiBai Marg, Maheshwar, Madhya Pradesh - 451224"}
            </div>
          </div>

          {/* Right Column: Phone, Email & GSTIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px', lineHeight: '1.25' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Phone size={12} color="#b45309" />
              <span>Phone: <strong>+91 {invoice.shopPhone || settings.shopPhone || "9617444445"}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Mail size={12} color="#b45309" />
              <span>Email: <strong>{settings.shopEmail || "contact@reotihandloom.com"}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Award size={12} color="#b45309" />
              <span>GSTIN: <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{effectiveHasGST ? (invoice.shopGSTIN || settings.shopGSTIN || "23AAAFR1234A1Z5") : "Pure Handloom Certified"}</strong></span>
            </div>
          </div>
        </div>

      </div>
    );
  };

  const showFront = previewTab === 'all' || previewTab === 'front';
  const showBack = previewTab === 'all' || previewTab === 'back';

  const printWrapperClass = printMode === 'duplex_2sided' 
    ? 'duplex-mode' 
    : (printMode === 'heritage_only' ? 'heritage-only-mode' : 'invoice-only-mode');

  return (
    <div className="modal-overlay print-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Local Print Rules to ensure perfect 2-sided duplex output without blank pages */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          .page-break-screen-divider {
            display: none !important;
          }
          
          /* Duplex 2-Sided Mode */
          .duplex-mode #printable-invoice {
            display: flex !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .duplex-mode #printable-invoice-back {
            display: flex !important;
            page-break-before: always !important;
            break-before: page !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Single Page: Invoice Only */
          .invoice-only-mode #printable-invoice {
            display: flex !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .invoice-only-mode #printable-invoice-back {
            display: none !important;
          }

          /* Single Page: Heritage Back Only */
          .heritage-only-mode #printable-invoice {
            display: none !important;
          }
          .heritage-only-mode #printable-invoice-back {
            display: flex !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="modal-content" style={{ maxWidth: '980px', width: '96%', maxHeight: '96vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* MODAL HEADER & CONTROLS */}
        <div className="modal-header no-print" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 18px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
            
            {/* Left: Prominent Back Button & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                type="button"
                onClick={onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                  transition: 'background-color 0.2s'
                }}
                title="Go back / Close preview (Escape)"
              >
                <ArrowLeft size={16} /> Back / वापस जाएं
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={18} className="text-amber-600" />
                <div>
                  <h3 className="brand-heading" style={{ margin: 0, fontSize: '17px', color: '#78350f' }}>
                    Invoice Print & Heritage Options
                  </h3>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                    Double-sided bill printing with luxury heritage reverse
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Actions & Close */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* PDF Download Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-emerald btn-sm"
                  onClick={() => setShowPdfDropdown(prev => !prev)}
                  title="Download PDF options"
                  style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Download size={15} /> Download PDF ▾
                </button>
                {showPdfDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #d4af37',
                    borderRadius: '8px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                    zIndex: 9999,
                    minWidth: '210px',
                    overflow: 'hidden'
                  }}>
                    <button
                      onClick={() => { setShowPdfDropdown(false); handleDownloadPDF('front'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '10px 16px', border: 'none',
                        background: 'none', cursor: 'pointer', fontSize: '13px',
                        fontWeight: '600', color: '#1e293b', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      📄 Page 1 Only (Bill)
                    </button>
                    <div style={{ height: '1px', background: '#f1f5f9', margin: '0 10px' }} />
                    <button
                      onClick={() => { setShowPdfDropdown(false); handleDownloadPDF('back'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '10px 16px', border: 'none',
                        background: 'none', cursor: 'pointer', fontSize: '13px',
                        fontWeight: '600', color: '#1e293b', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      🎨 Page 2 Only (Heritage Card)
                    </button>
                    <div style={{ height: '1px', background: '#f1f5f9', margin: '0 10px' }} />
                    <button
                      onClick={() => { setShowPdfDropdown(false); handleDownloadPDF('both'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '10px 16px', border: 'none',
                        background: 'none', cursor: 'pointer', fontSize: '13px',
                        fontWeight: '600', color: '#78350f', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      📋 Both Pages (2-Sided)
                    </button>
                  </div>
                )}
              </div>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleDownloadImage} 
                title="Download high-resolution image for WhatsApp"
                style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Download size={15} /> Download Image
              </button>
              <button 
                type="button"
                onClick={onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(220,38,38,0.25)'
                }}
                title="Close modal (Escape)"
              >
                <X size={16} /> Close
              </button>
            </div>
          </div>

          {/* Print Mode Action Buttons Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
            
            {/* Direct Quick Print Triggers */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-sm"
                onClick={() => handlePrint('duplex_2sided')}
                style={{
                  backgroundColor: '#78350f',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(120,53,15,0.25)',
                  padding: '6px 12px'
                }}
                title="Print Page 1 (Bill) and Page 2 (Heritage Card) back-to-back"
              >
                <Printer size={15} /> ⚡ Print 2-Sided Bill (Front + Back)
              </button>

              <button 
                className="btn btn-sm"
                onClick={() => handlePrint('invoice_only')}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px'
                }}
                title="Print only Page 1 (Bill)"
              >
                <FileText size={14} /> 📄 Invoice Only (1-Page)
              </button>

              <button 
                className="btn btn-sm"
                onClick={() => handlePrint('heritage_only')}
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px'
                }}
                title="Print only Page 2 (Heritage Card)"
              >
                <Sparkles size={14} /> 🌸 Heritage Back Card Only
              </button>
            </div>

            {/* Interactive Back Card Theme Selector & Preview Tabs */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              
              {/* Theme Pill Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '2px', gap: '2px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#92400e', padding: '0 5px' }}>
                  Back Theme:
                </span>
                <button
                  type="button"
                  onClick={() => setBackTheme('merged_heritage')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3.5px 8px',
                    fontSize: '11px',
                    fontWeight: backTheme === 'merged_heritage' ? '800' : '600',
                    backgroundColor: backTheme === 'merged_heritage' ? '#78350f' : 'transparent',
                    color: backTheme === 'merged_heritage' ? '#ffffff' : '#78350f',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Merged: Rajmata Ahilyabai Holkar & Traditional Pit-Loom Weaving side-by-side"
                >
                  👑 Merged Dual (Ahilyabai + Pit-Loom)
                </button>
                <button
                  type="button"
                  onClick={() => setBackTheme('ahilyabai_sketch')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3.5px 8px',
                    fontSize: '11px',
                    fontWeight: backTheme === 'ahilyabai_sketch' ? '800' : '600',
                    backgroundColor: backTheme === 'ahilyabai_sketch' ? '#78350f' : 'transparent',
                    color: backTheme === 'ahilyabai_sketch' ? '#ffffff' : '#78350f',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Royal Devi Ahilyabai Holkar & Maheshwar Ghat Vintage Sketch"
                >
                  🏛️ Ahilyabai
                </button>
                <button
                  type="button"
                  onClick={() => setBackTheme('pit_loom')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3.5px 8px',
                    fontSize: '11px',
                    fontWeight: backTheme === 'pit_loom' ? '800' : '600',
                    backgroundColor: backTheme === 'pit_loom' ? '#78350f' : 'transparent',
                    color: backTheme === 'pit_loom' ? '#ffffff' : '#78350f',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Traditional Wooden Pit-Loom Handloom Weaver Vintage Sketch"
                >
                  🧵 Pit-Loom
                </button>
                <button
                  type="button"
                  onClick={() => setBackTheme('weaving_loom')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3.5px 8px',
                    fontSize: '11px',
                    fontWeight: backTheme === 'weaving_loom' ? '800' : '600',
                    backgroundColor: backTheme === 'weaving_loom' ? '#78350f' : 'transparent',
                    color: backTheme === 'weaving_loom' ? '#ffffff' : '#78350f',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Authentic Handloom Loom & 4 Weaving Medallions Designer Card"
                >
                  📜 Heritage Card
                </button>
              </div>

              {/* View Preview Tabs */}
              <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '6px', padding: '2px', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewTab('all')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: previewTab === 'all' ? '800' : '600',
                    backgroundColor: previewTab === 'all' ? '#ffffff' : 'transparent',
                    color: previewTab === 'all' ? '#0f172a' : '#64748b',
                    boxShadow: previewTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Both Pages
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('front')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: previewTab === 'front' ? '800' : '600',
                    backgroundColor: previewTab === 'front' ? '#ffffff' : 'transparent',
                    color: previewTab === 'front' ? '#0f172a' : '#64748b',
                    boxShadow: previewTab === 'front' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Page 1 (Bill)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('back')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: previewTab === 'back' ? '800' : '600',
                    backgroundColor: previewTab === 'back' ? '#ffffff' : 'transparent',
                    color: previewTab === 'back' ? '#0f172a' : '#64748b',
                    boxShadow: previewTab === 'back' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Page 2 (Heritage Back)
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* MODAL SCROLLABLE PREVIEW & PRINTABLE PAGES */}
        <div 
          className={`modal-body print-invoice-scroll-container ${printWrapperClass}`} 
          style={{ 
            overflowY: 'auto', 
            padding: '24px 20px', 
            backgroundColor: '#0f172a25', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '28px' 
          }}
        >
          
          {/* ════ PAGE 1: TAX INVOICE / BILL ════ */}
          <div 
            className={`print-invoice-layout ${printMode === 'duplex_2sided' ? 'print-page-break' : ''}`} 
            id="printable-invoice" 
            style={{ 
              display: showFront ? 'flex' : 'none',
              fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, Helvetica, sans-serif", 
              padding: containerPadding, 
              background: '#fdfaf2', 
              color: '#4a2c11', 
              position: 'relative', 
              border: '3px double #b45309', 
              boxShadow: 'inset 0 0 0 2px #d4af37, inset 0 0 0 4px #fdfaf2, inset 0 0 0 5px #cbd5e1', 
              borderRadius: '4px', 
              boxSizing: 'border-box', 
              flexDirection: 'column', 
              justifyContent: 'space-between', 
              minHeight: '1093px',
              height: '1093px',
              width: '100%',
              maxWidth: '794px'
            }}
          >
              {/* Centered background watermark logo */}
              {!isAmbekarInvoice && (
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
              )}

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
                  {/* Left Brand Column */}
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

                  {/* Right Contact & GSTIN Card */}
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
                        <span>📦</span> PURCHASE NOTE
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
                  <div style={{ padding: customerPadding, border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fffef9' }}>
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
                    {invoice.remarks && !isPurchaseNote && (
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
                    {/* Empty filler rows to maintain full page grid layout */}
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

              {/* BOTTOM GROUP: Anchored Footer Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: sectionMarginBottom, marginTop: 'auto', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                {/* Subtotals & GST breakup split */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: isFewItems ? '16px' : '10px' }}>
                  {/* Authentic Guarantee Column */}
                  <div>
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

                    {/* Bank Account Details & PhonePe QR */}
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
                        <div style={{ textAlign: 'center', flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', padding: isFewItems ? '5px 8px' : '3px 4px', backgroundColor: '#fffef9' }}>
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
                          <td style={{ padding: isFewItems ? '7px 8px' : '5px', border: '2px solid #000' }}>
                            {advanceAdjustedVal > 0 ? 'Gross Total Amount:' : 'Net Payable Amount:'}
                          </td>
                          <td style={{ padding: isFewItems ? '7px 8px' : '5px', border: '2px solid #000', textAlign: 'right' }}>{formatCurrency(finalTotal)}</td>
                        </tr>

                        {advanceAdjustedVal > 0 && (
                          <>
                            <tr style={{ fontWeight: '600', fontSize: isFewItems ? '0.88rem' : '0.8rem', color: '#6d28d9', backgroundColor: '#f5f3ff' }}>
                              <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1' }}>Advance Payment:</td>
                              <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right' }}>-₹{advanceAdjustedVal.toFixed(2)}</td>
                            </tr>
                            <tr style={{ fontWeight: 'bold', fontSize: isFewItems ? '1.02rem' : '0.92rem', backgroundColor: '#e0e7ff' }}>
                              <td style={{ padding: isFewItems ? '7px 8px' : '5px', border: '2px solid #4338ca', color: '#312e81' }}>Net Payable Amount:</td>
                              <td style={{ padding: isFewItems ? '7px 8px' : '5px', border: '2px solid #4338ca', textAlign: 'right', color: '#312e81' }}>{formatCurrency(netPayableTotal)}</td>
                            </tr>
                          </>
                        )}

                        {/* Payment breakdown */}
                        {((paidVal !== netPayableTotal) || excessPaidVal > 0) && (
                          <>
                            <tr style={{ fontWeight: '600', fontSize: isFewItems ? '0.9rem' : '0.82rem', color: '#16a34a' }}>
                              <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1' }}>Amount Paid Now:</td>
                              <td style={{ padding: calcCellPadding, border: '1px solid #cbd5e1', textAlign: 'right' }}>{formatCurrency(paidVal)}</td>
                            </tr>
                            {dueAmountVal > 0 && (
                              <tr style={{ fontWeight: 'bold', fontSize: isFewItems ? '0.95rem' : '0.88rem', color: '#dc2626', backgroundColor: '#fef2f2' }}>
                                <td style={{ padding: calcCellPadding, border: '2px solid #dc2626' }}>Balance Due Amount:</td>
                                <td style={{ padding: calcCellPadding, border: '2px solid #dc2626', textAlign: 'right' }}>{formatCurrency(dueAmountVal)}</td>
                              </tr>
                            )}
                            {excessPaidVal > 0 && (
                              <tr style={{ fontWeight: 'bold', fontSize: isFewItems ? '0.95rem' : '0.88rem', color: '#047857', backgroundColor: '#ecfdf5' }}>
                                <td style={{ padding: calcCellPadding, border: '2px solid #10b981' }}>✨ Excess / Advance Paid:</td>
                                <td style={{ padding: calcCellPadding, border: '2px solid #10b981', textAlign: 'right' }}>{formatCurrency(excessPaidVal)}</td>
                              </tr>
                            )}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Amount In Words */}
                <div style={{ border: '1px solid #cbd5e1', padding: isFewItems ? '6px 12px' : '4px 8px', borderRadius: '4px', fontSize: isFewItems ? '0.84rem' : '0.78rem', backgroundColor: '#fffef9' }}>
                  <span>Amount Chargeable in Words: </span>
                  <strong style={{ textTransform: 'capitalize' }}>{priceToWords(netPayableTotal)}</strong>
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

          {/* Screen Divider between Page 1 and Page 2 in 'Both Pages' mode */}
          {previewTab === 'all' && (
            <div className="page-break-screen-divider no-print" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              maxWidth: '794px',
              color: '#b45309',
              fontWeight: '800',
              fontSize: '12px',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              <div style={{ flexGrow: 1, height: '1.5px', backgroundColor: '#cbd5e1' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fef3c7', padding: '4px 14px', borderRadius: '9999px', border: '1px solid #f59e0b' }}>
                <Layers size={14} /> Page 2: Heritage Back Card (Printed on Reverse Side of Bill)
              </div>
              <div style={{ flexGrow: 1, height: '1.5px', backgroundColor: '#cbd5e1' }} />
            </div>
          )}

          {/* ════ PAGE 2: HERITAGE BACK CARD ════ */}
          <div style={{ width: '100%', maxWidth: '794px', display: showBack ? 'block' : 'none' }}>
            {renderInvoiceHeritageBack()}
          </div>

        </div>

      </div>
    </div>
  );
}
