// Utility functions for Reoti Handloom Billing Console

/**
 * Convert numerical cash amount to Indian Rupees text representation
 */
export function priceToWords(n) {
  let amount = Math.round(n);
  if (amount === 0) return "Rupees Zero Only";
  
  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const double = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  function formatHundred(num) {
    let str = "";
    if (num >= 100) {
      str += single[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num >= 10 && num < 20) {
      str += double[num - 10] + " ";
    } else if (num >= 20) {
      str += tens[Math.floor(num / 10)] + " " + single[num % 10] + " ";
    } else if (num > 0) {
      str += single[num] + " ";
    }
    return str;
  }
  
  let words = "";
  // Crore
  if (amount >= 10000000) {
    words += formatHundred(Math.floor(amount / 10000000)) + "Crore ";
    amount %= 10000000;
  }
  // Lakh
  if (amount >= 100000) {
    words += formatHundred(Math.floor(amount / 100000)) + "Lakh ";
    amount %= 100000;
  }
  // Thousand
  if (amount >= 1000) {
    words += formatHundred(Math.floor(amount / 1000)) + "Thousand ";
    amount %= 1000;
  }
  // Remaining Hundreds
  words += formatHundred(amount);
  
  return "Rupees " + words.trim() + " Only";
}

/**
 * Format raw numbers into regional Currency Format (INR ₹)
 */
export function formatCurrency(amount) {
  const val = parseFloat(amount);
  if (isNaN(val)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(val);
}

/**
 * Calculates intermediate sums (Gross, discount, taxable, CGST, SGST, IGST totals) on an invoice object
 */
export function calculateTotals(items = [], isInterState = false, courierCharges = 0, hasGST = true) {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableValue = 0;
  let totalTax = 0;
  
  // Group tax GST brackets for detailed billing tables
  const gstBreakdown = {};

  const processedItems = items.map(item => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gstRate = hasGST ? (parseFloat(item.gstRate) || 0) : 0;
    
    const grossAmount = qty * rate;
    const itemDiscount = 0;
    const taxable = grossAmount;
    const tax = taxable * (gstRate / 100);
    const cgst = isInterState ? 0 : tax / 2;
    const sgst = isInterState ? 0 : tax / 2;
    const igst = isInterState ? tax : 0;
    const total = taxable;

    subtotal += grossAmount;
    totalDiscount += itemDiscount;
    taxableValue += taxable;
    totalTax += tax;

    // Track GST metrics per rates (e.g. 5%, 12%)
    if (gstRate > 0) {
      if (!gstBreakdown[gstRate]) {
        gstBreakdown[gstRate] = { taxable: 0, taxVal: 0, cgst: 0, sgst: 0, igst: 0 };
      }
      gstBreakdown[gstRate].taxable += taxable;
      gstBreakdown[gstRate].taxVal += tax;
      gstBreakdown[gstRate].cgst += cgst;
      gstBreakdown[gstRate].sgst += sgst;
      gstBreakdown[gstRate].igst += igst;
    }

    return {
      ...item,
      grossAmount,
      itemDiscount,
      taxable,
      tax,
      cgst,
      sgst,
      igst,
      total
    };
  });

  const parsedCourier = parseFloat(courierCharges) || 0;
  const finalPreRound = taxableValue + totalTax + parsedCourier;
  const grandTotal = Math.round(finalPreRound);
  const roundOff = grandTotal - finalPreRound;

  return {
    items: processedItems,
    subtotal,
    totalDiscount,
    taxableValue,
    totalCGST: isInterState ? 0 : totalTax / 2,
    totalSGST: isInterState ? 0 : totalTax / 2,
    totalIGST: isInterState ? totalTax : 0,
    totalGST: totalTax,
    flatDiscount: 0,
    courierCharges: parsedCourier,
    roundOff,
    grandTotal,
    gstBreakdown,
    isInterState
  };
}

export function generateInvoiceNum(prefix = 'RH-2026-', currentInvoices = [], startingNumber = 293) {
  let startVal = parseInt(startingNumber);
  if (isNaN(startVal) || startVal < 1) startVal = 293;
  let maxNum = startVal - 1;

  if (Array.isArray(currentInvoices)) {
    currentInvoices.forEach(inv => {
      if (inv && inv.invoiceNo) {
        // Match trailing digits regardless of prefix variation
        const match = inv.invoiceNo.match(/(\d+)$/);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
    });
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}
