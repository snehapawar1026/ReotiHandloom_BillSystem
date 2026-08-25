import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend build from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// SQLite Database File
const DB_PATH = path.join(__dirname, 'reoti_bills.sqlite');
const BACKUP_PATH = path.join(__dirname, 'bills_backup.json');

// Initialize SQLite DB
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    // Invoices table
    db.run(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        store_mode TEXT NOT NULL,
        invoice_no TEXT NOT NULL,
        date TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        grand_total REAL,
        data_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory table
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        store_mode TEXT NOT NULL,
        name TEXT NOT NULL,
        stock REAL,
        price REAL,
        data_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        store_mode TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ledger table (for manual payment/receipt vouchers & party entries)
    db.run(`
      CREATE TABLE IF NOT EXISTS ledger (
        id TEXT PRIMARY KEY,
        store_mode TEXT NOT NULL,
        party_name TEXT NOT NULL,
        date TEXT,
        vch_type TEXT,
        vch_no TEXT,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        data_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Permanent Archive Tables for safety (No record is ever lost permanently!)
    db.run(`
      CREATE TABLE IF NOT EXISTS deleted_invoices_archive (
        id TEXT PRIMARY KEY,
        store_mode TEXT NOT NULL,
        invoice_no TEXT NOT NULL,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_json TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS deleted_ledger_archive (
        id TEXT PRIMARY KEY,
        store_mode TEXT NOT NULL,
        vch_no TEXT,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_json TEXT NOT NULL
      )
    `);

    // Update Ambekar settings shopName & Bank details in DB if stored as old values
    db.all(`SELECT store_mode, data_json FROM settings WHERE store_mode = 'ambekar'`, (err, rows) => {
      if (!err && rows && rows.length > 0) {
        try {
          const parsed = JSON.parse(rows[0].data_json);
          let updated = false;
          if (parsed.shopName !== 'Ambekar Handloom House') {
            parsed.shopName = 'Ambekar Handloom House';
            updated = true;
          }
          if (parsed.bankAccountNo === '99954444444445' || !parsed.bankAccountNo || (parsed.accountHolderName && parsed.accountHolderName.includes('Saving'))) {
            parsed.bankName = 'HDFC Bank';
            parsed.bankAccountNo = '50100394215668';
            parsed.bankIFSC = 'HDFC0002116';
            parsed.bankBranch = 'Maheshwar';
            parsed.accountHolderName = 'Shivam Ambekar';
            updated = true;
          }
          if (updated) {
            db.run(`UPDATE settings SET data_json = ? WHERE store_mode = 'ambekar'`, [JSON.stringify(parsed)]);
          }
        } catch (e) {}
      }
    });

    db.all(`SELECT store_mode, data_json FROM settings WHERE store_mode = 'reoti'`, (err, rows) => {
      if (!err && rows && rows.length > 0) {
        try {
          const parsed = JSON.parse(rows[0].data_json);
          let updated = false;
          if (parsed.accountHolderName !== 'Reoti Handloom' || parsed.bankName !== 'HDFC' || parsed.bankAccountNo !== '99954444444445' || parsed.bankIFSC !== 'HDFC0002089' || parsed.bankBranch !== 'Maheshwar Branch') {
            parsed.accountHolderName = 'Reoti Handloom';
            parsed.bankName = 'HDFC';
            parsed.bankAccountNo = '99954444444445';
            parsed.bankIFSC = 'HDFC0002089';
            parsed.bankBranch = 'Maheshwar Branch';
            updated = true;
          }
          if (updated) {
            db.run(`UPDATE settings SET data_json = ? WHERE store_mode = 'reoti'`, [JSON.stringify(parsed)]);
          }
        } catch (e) {}
      }
    });

    db.all(`SELECT store_mode, data_json FROM settings WHERE store_mode = 'reoti_cn'`, (err, rows) => {
      if (!err && rows && rows.length > 0) {
        try {
          const parsed = JSON.parse(rows[0].data_json);
          let updated = false;
          if (parsed.accountHolderName !== 'Reoti Handloom' || parsed.bankName !== 'HDFC' || parsed.bankAccountNo !== '99954444444445' || parsed.bankIFSC !== 'HDFC0002089' || parsed.bankBranch !== 'Maheshwar Branch') {
            parsed.accountHolderName = 'Reoti Handloom';
            parsed.bankName = 'HDFC';
            parsed.bankAccountNo = '99954444444445';
            parsed.bankIFSC = 'HDFC0002089';
            parsed.bankBranch = 'Maheshwar Branch';
            updated = true;
          }
          if (updated) {
            db.run(`UPDATE settings SET data_json = ? WHERE store_mode = 'reoti_cn'`, [JSON.stringify(parsed)]);
          }
        } catch (e) {}
      } else if (!err && (!rows || rows.length === 0)) {
        db.all(`SELECT data_json FROM settings WHERE store_mode = 'reoti'`, (err2, reotiRows) => {
          if (!err2 && reotiRows && reotiRows.length > 0) {
            try {
              const cnSettings = JSON.parse(reotiRows[0].data_json);
              cnSettings.invoicePrefix = 'RH-CN-2026-';
              cnSettings.startingInvoiceNo = 1;
              cnSettings.accountHolderName = 'Reoti Handloom';
              cnSettings.bankName = 'HDFC';
              cnSettings.bankAccountNo = '99954444444445';
              cnSettings.bankIFSC = 'HDFC0002089';
              cnSettings.bankBranch = 'Maheshwar Branch';
              db.run(`INSERT OR IGNORE INTO settings (store_mode, data_json) VALUES ('reoti_cn', ?)`, [JSON.stringify(cnSettings)]);
            } catch (e) {}
          }
        });
      }
    });

    db.all(`SELECT store_mode, data_json FROM settings WHERE store_mode = 'ambekar_pn'`, (err, rows) => {
      if (!err && rows && rows.length > 0) {
        try {
          const parsed = JSON.parse(rows[0].data_json);
          let updated = false;
          if (parsed.shopName !== 'Ambekar Handloom House') {
            parsed.shopName = 'Ambekar Handloom House';
            updated = true;
          }
          if (updated) {
            db.run(`UPDATE settings SET data_json = ? WHERE store_mode = 'ambekar_pn'`, [JSON.stringify(parsed)]);
          }
        } catch (e) {}
      } else if (!err && (!rows || rows.length === 0)) {
        db.all(`SELECT data_json FROM settings WHERE store_mode = 'ambekar'`, (err2, ambekarRows) => {
          if (!err2 && ambekarRows && ambekarRows.length > 0) {
            try {
              const pnSettings = JSON.parse(ambekarRows[0].data_json);
              pnSettings.invoicePrefix = 'AH-PN-2026-';
              pnSettings.startingInvoiceNo = 1;
              pnSettings.shopName = 'Ambekar Handloom House';
              pnSettings.shopGSTIN = '';
              db.run(`INSERT OR IGNORE INTO settings (store_mode, data_json) VALUES ('ambekar_pn', ?)`, [JSON.stringify(pnSettings)]);
            } catch (e) {}
          }
        });
      }
    });

    // Always seed/ensure Jayshree 15 ledger entries in SQLite database
    const jayshreeEntries = [
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

    const stmt = db.prepare(`INSERT OR REPLACE INTO ledger (id, store_mode, party_name, date, vch_type, vch_no, debit, credit, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    jayshreeEntries.forEach(ent => {
      stmt.run([`reoti_${ent.id}`, 'reoti', ent.partyName, ent.date, ent.vchType, ent.vchNo, ent.debit, ent.credit, JSON.stringify(ent)]);
    });
    stmt.finalize();

    // Also add Jayshree contact info invoice record
    const jsInvoice = {
      invoiceNo: 'RH-2025-JS01',
      date: '2025-01-14',
      customerName: 'Jayshree',
      customerPhone: '9869050598',
      customerAddress: 'Shop No. - 01 Pethe Building Ranade Road, Dadar (west), Mumbai - 400028, (M.H.)',
      items: [{ name: 'SBI - CC-42476655602', rate: 241427, qty: 1, total: 241427 }],
      grandTotal: 241427,
      paidAmount: 241427,
      dueAmount: 0,
      paymentMode: 'Cash',
      paymentStatus: 'Paid',
      remarks: 'Opening Balance Record'
    };
    const jsId = `reoti_${jsInvoice.invoiceNo}`;
    db.run(`INSERT OR IGNORE INTO invoices (id, invoice_no, store_mode, customer_name, customer_phone, date, grand_total, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [jsId, jsInvoice.invoiceNo, 'reoti', jsInvoice.customerName, jsInvoice.customerPhone, jsInvoice.date, jsInvoice.grandTotal, JSON.stringify(jsInvoice)]
    );

    // Also seed Moolchand Mill Pvt. Ltd. invoice RH-2026-0292
    const moolchandInvoice = {
      invoiceNo: 'RH-2026-0292',
      date: '2026-07-16',
      isCreditNote: false,
      isPurchaseNote: false,
      originalInvoiceNo: '',
      originalInvoiceDate: '',
      reasonForCN: 'Sales Return',
      customerName: 'MOOLCHAND MILL PVT. LTD.',
      customerPhone: '8484006244',
      customerEmail: '',
      customerAddress: 'PCMC Warehouse : Plot No. 100, H Block, MIDC, Pimpri Pune, Maharashtra- 411018',
      customerGSTIN: '27AANCM3785C1Z7',
      items: [
        { productId: 'custom-1784200000001', name: 'Lahar Border RuiPhool Buti Shaded Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 6, unit: 'Pcs', rate: 2850, gstRate: 5, grossAmount: 17100, itemDiscount: 0, taxable: 17100, tax: 855, cgst: 0, sgst: 0, igst: 855, total: 17100 },
        { productId: 'custom-1784200000002', name: 'Lotus All Over Buta With Shaded Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 4, unit: 'Pcs', rate: 3350, gstRate: 5, grossAmount: 13400, itemDiscount: 0, taxable: 13400, tax: 670, cgst: 0, sgst: 0, igst: 670, total: 13400 },
        { productId: 'custom-1784200000003', name: 'Diamond Border With Buti Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 4, unit: 'Pcs', rate: 2850, gstRate: 5, grossAmount: 11400, itemDiscount: 0, taxable: 11400, tax: 570, cgst: 0, sgst: 0, igst: 570, total: 11400 },
        { productId: 'custom-1784200000004', name: 'Khatiya Border With Buti Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 5, unit: 'Pcs', rate: 2750, gstRate: 5, grossAmount: 13750, itemDiscount: 0, taxable: 13750, tax: 687.5, cgst: 0, sgst: 0, igst: 687.5, total: 13750 },
        { productId: 'custom-1784200000005', name: 'Lahar Border With Buti Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 3, unit: 'Pcs', rate: 2750, gstRate: 5, grossAmount: 8250, itemDiscount: 0, taxable: 8250, tax: 412.5, cgst: 0, sgst: 0, igst: 412.5, total: 8250 },
        { productId: 'custom-1784200000006', name: 'Big RuiPhool Buta With Shaded Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 5, unit: 'Pcs', rate: 3250, gstRate: 5, grossAmount: 16250, itemDiscount: 0, taxable: 16250, tax: 812.5, cgst: 0, sgst: 0, igst: 812.5, total: 16250 },
        { productId: 'custom-1784200000007', name: 'Banarasi Border With Buta Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 4, unit: 'Pcs', rate: 3000, gstRate: 5, grossAmount: 12000, itemDiscount: 0, taxable: 12000, tax: 600, cgst: 0, sgst: 0, igst: 600, total: 12000 },
        { productId: 'custom-1784200000008', name: 'Patti Buta Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 5, unit: 'Pcs', rate: 3050, gstRate: 5, grossAmount: 15250, itemDiscount: 0, taxable: 15250, tax: 762.5, cgst: 0, sgst: 0, igst: 762.5, total: 15250 },
        { productId: 'custom-1784200000009', name: 'All Over SunFlower Buta Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 6, unit: 'Pcs', rate: 3250, gstRate: 5, grossAmount: 19500, itemDiscount: 0, taxable: 19500, tax: 975, cgst: 0, sgst: 0, igst: 975, total: 19500 },
        { productId: 'custom-1784200000010', name: 'Skairt Big Border With Buti Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 10, unit: 'Pcs', rate: 2850, gstRate: 5, grossAmount: 28500, itemDiscount: 0, taxable: 28500, tax: 1425, cgst: 0, sgst: 0, igst: 1425, total: 28500 },
        { productId: 'custom-1784200000011', name: 'Diamond Border Zari Lining Buti Sarees', sku: 'CUSTOM', hsn: '5208', meter: '6.20', qty: 5, unit: 'Pcs', rate: 2950, gstRate: 5, grossAmount: 14750, itemDiscount: 0, taxable: 14750, tax: 737.5, cgst: 0, sgst: 0, igst: 737.5, total: 14750 }
      ],
      courierCharges: 0,
      invoiceGstRate: 5,
      paymentMode: 'Cash',
      paymentStatus: 'Unpaid',
      remarks: '',
      isInterState: true,
      isEditing: false,
      bankDetails: 'HDFC, A/C: 99954444444445, IFSC: HDFC0002089',
      subtotal: 170150,
      totalDiscount: 0,
      taxableValue: 170150,
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 8507.5,
      totalGST: 8507.5,
      roundOff: 0.5,
      grandTotal: 178658,
      paidAmount: 0,
      dueAmount: 178658,
      gstBreakdown: {
        5: { taxable: 170150, taxVal: 8507.5, cgst: 0, sgst: 0, igst: 8507.5 }
      }
    };
    const mcId = `reoti_${moolchandInvoice.invoiceNo}`;
    db.run(`INSERT OR REPLACE INTO invoices (id, store_mode, invoice_no, date, customer_name, customer_phone, grand_total, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [mcId, 'reoti', moolchandInvoice.invoiceNo, moolchandInvoice.date, moolchandInvoice.customerName, moolchandInvoice.customerPhone, moolchandInvoice.grandTotal, JSON.stringify(moolchandInvoice)]
    );

    // Also seed Ambekar Gagan Handloom invoice AH-2026-0074
    const gaganInvoice = {
      invoiceNo: 'AH-2026-0074',
      date: '2026-07-28',
      customerName: 'Gagan Handloom',
      customerPhone: '9691756921',
      customerAddress: 'Maheshwar',
      customerEmail: '',
      customerGSTIN: '',
      items: [
        { name: 'Tissue Small Zari Checks Saree', hsn: '5208', rate: 2850, qty: 18, unit: 'Pcs', total: 51300 },
        { name: 'Multi Border Saree', hsn: '5208', rate: 2150, qty: 24, unit: 'Pcs', total: 51600 },
        { name: 'Khatiya Border Buti Sarees', hsn: '5208', rate: 2400, qty: 10, unit: 'Pcs', total: 24000 },
        { name: 'Big Triangle Buta With Buti Sarees', hsn: '5208', rate: 2800, qty: 16, unit: 'Pcs', total: 44800 },
        { name: 'Maheshwari Tisshu 2 Lining', hsn: '5208', rate: 2550, qty: 7, unit: 'Pcs', total: 17850 },
        { name: 'Triangle Buti Zari Buti Sarees', hsn: '5208', rate: 2350, qty: 7, unit: 'Pcs', total: 16450 },
        { name: 'Zari Checks Saree', hsn: '5208', rate: 2350, qty: 1, unit: 'Pcs', total: 2350 }
      ],
      totalQuantity: 83,
      subTotal: 208350,
      grandTotal: 208350,
      paidAmount: 0,
      dueAmount: 208350,
      paymentMode: 'Cash',
      paymentStatus: 'Unpaid',
      remarks: '',
      bankDetails: 'HDFC Bank, A/C: 50100394215668, IFSC: HDFC0002116',
      isManualEntry: false,
      isCreditNote: false,
      isPurchaseNote: false
    };
    const gaganId = `ambekar_${gaganInvoice.invoiceNo}`;
    db.run(`INSERT OR IGNORE INTO invoices (id, store_mode, invoice_no, date, customer_name, customer_phone, grand_total, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [gaganId, 'ambekar', gaganInvoice.invoiceNo, gaganInvoice.date, gaganInvoice.customerName, gaganInvoice.customerPhone, gaganInvoice.grandTotal, JSON.stringify(gaganInvoice)]
    );


    console.log('Database tables verified / initialized.');
    restoreFromBackupIfAny();
    triggerDatabaseBackup();
  });
}

// Full Backup & Self-Healing Restoration Helpers
function triggerDatabaseBackup() {
  db.serialize(() => {
    db.all(`SELECT id, store_mode, invoice_no, date, customer_name, customer_phone, grand_total, data_json FROM invoices`, (err, invRows) => {
      if (err) return;
      db.all(`SELECT id, store_mode, party_name, date, vch_type, vch_no, debit, credit, data_json FROM ledger`, (err2, ledgRows) => {
        if (err2) return;
        const backupData = {
          timestamp: new Date().toISOString(),
          invoices: invRows ? invRows.map(r => ({ ...JSON.parse(r.data_json), id: r.id, storeMode: r.store_mode })) : [],
          ledger: ledgRows ? ledgRows.map(r => ({ ...JSON.parse(r.data_json), id: r.id, storeMode: r.store_mode })) : []
        };
        try {
          fs.writeFileSync(BACKUP_PATH, JSON.stringify(backupData, null, 2), 'utf8');
        } catch (e) {
          console.error('Failed to write backup:', e);
        }
      });
    });
  });
}

function restoreFromBackupIfAny() {
  if (!fs.existsSync(BACKUP_PATH)) return;
  try {
    const raw = fs.readFileSync(BACKUP_PATH, 'utf8');
    const backupData = JSON.parse(raw);
    if (backupData && Array.isArray(backupData.invoices) && backupData.invoices.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO invoices (id, store_mode, invoice_no, date, customer_name, customer_phone, grand_total, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          date = excluded.date,
          customer_name = excluded.customer_name,
          customer_phone = excluded.customer_phone,
          grand_total = excluded.grand_total,
          data_json = excluded.data_json
      `);
      backupData.invoices.forEach(inv => {
        const mode = inv.storeMode || (inv.invoiceNo && inv.invoiceNo.startsWith('AH-') ? 'ambekar' : 'reoti');
        const id = inv.id || `${mode}_${inv.invoiceNo}`;
        stmt.run([id, mode, inv.invoiceNo, inv.date || '', inv.customerName || '', inv.customerPhone || '', inv.grandTotal || 0, JSON.stringify(inv)]);
      });
      stmt.finalize();
    }
    if (backupData && Array.isArray(backupData.ledger) && backupData.ledger.length > 0) {
      const stmtL = db.prepare(`
        INSERT INTO ledger (id, store_mode, party_name, date, vch_type, vch_no, debit, credit, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json
      `);
      backupData.ledger.forEach(ent => {
        const mode = ent.storeMode || 'reoti';
        const id = ent.id || `${mode}_${ent.vchNo || Math.random()}`;
        stmtL.run([id, mode, ent.partyName || '', ent.date || '', ent.vchType || '', ent.vchNo || '', ent.debit || 0, ent.credit || 0, JSON.stringify(ent)]);
      });
      stmtL.finalize();
    }
  } catch (e) {
    console.error('Backup restore error:', e);
  }
}

function saveJsonBackup(data) {
  triggerDatabaseBackup();
}

function loadJsonBackup() {
  if (fs.existsSync(BACKUP_PATH)) {
    try {
      const raw = fs.readFileSync(BACKUP_PATH, 'utf8');
      return JSON.parse(raw);
    } catch (e) {}
  }
  return { reoti: { invoices: [], inventory: [], settings: null }, ambekar: { invoices: [], inventory: [], settings: null } };
}

// API Routes

// 1. Get all store data (Invoices, Inventory, Settings) for a given mode
app.get('/api/data', (req, res) => {
  const mode = req.query.mode || 'reoti';

  db.serialize(() => {
    db.all(`SELECT store_mode, data_json FROM invoices ORDER BY date DESC, updated_at DESC`, [], (err, allInvRows) => {
      if (err) {
        console.error('Fetch invoices error:', err);
        return res.status(500).json({ error: err.message });
      }

      const invenMode = (mode === 'ambekar_pn') ? 'ambekar' : mode;
      db.all(`SELECT data_json FROM inventory WHERE store_mode = ?`, [invenMode], (err, invenRows) => {
        if (err) {
          console.error('Fetch inventory error:', err);
          return res.status(500).json({ error: err.message });
        }

        db.get(`SELECT data_json FROM settings WHERE store_mode = ?`, [mode], (err, setRow) => {
          if (err) {
            console.error('Fetch settings error:', err);
            return res.status(500).json({ error: err.message });
          }

          db.all(`SELECT data_json FROM ledger ORDER BY date ASC`, [], (err, ledgRows) => {
            const allInvoices = allInvRows ? allInvRows.map(r => JSON.parse(r.data_json)) : [];
            const invoices = allInvRows ? allInvRows.filter(r => r.store_mode === mode).map(r => JSON.parse(r.data_json)) : [];
            const inventory = invenRows ? invenRows.map(r => JSON.parse(r.data_json)) : [];
            const settings = setRow ? JSON.parse(setRow.data_json) : null;
            const ledgerEntries = ledgRows ? ledgRows.map(r => JSON.parse(r.data_json)) : [];

            res.json({ invoices, allInvoices, inventory, settings, ledgerEntries });
          });
        });
      });
    });
  });
});

// API endpoint to save/update a single ledger entry
app.post('/api/ledger', (req, res) => {
  const { mode, entry } = req.body;
  if (!mode || !entry || !entry.id) {
    return res.status(400).json({ error: 'Invalid ledger payload' });
  }

  const id = `${mode}_${entry.id}`;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO ledger (id, store_mode, party_name, date, vch_type, vch_no, debit, credit, data_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       party_name = excluded.party_name,
       date = excluded.date,
       vch_type = excluded.vch_type,
       vch_no = excluded.vch_no,
       debit = excluded.debit,
       credit = excluded.credit,
       data_json = excluded.data_json,
       updated_at = excluded.updated_at`,
    [
      id,
      mode,
      entry.partyName || '',
      entry.date || '',
      entry.vchType || '',
      entry.vchNo || '',
      entry.debit || 0,
      entry.credit || 0,
      JSON.stringify(entry),
      now
    ],
    function (err) {
      if (err) {
        console.error('Save ledger error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id });
    }
  );
});

// API endpoint to delete a ledger entry with permanent safety archiving
app.delete('/api/ledger', (req, res) => {
  const { mode, id } = req.body;
  if (!mode || !id) {
    return res.status(400).json({ error: 'Missing mode or entry id' });
  }

  const dbId = `${mode}_${id}`;
  
  // Archive to safety table first
  db.get(`SELECT * FROM ledger WHERE id = ?`, [dbId], (err, row) => {
    if (row) {
      db.run(
        `INSERT OR REPLACE INTO deleted_ledger_archive (id, store_mode, vch_no, data_json) VALUES (?, ?, ?, ?)`,
        [row.id, row.store_mode, row.vch_no || '', row.data_json]
      );
    }
    
    db.run(`DELETE FROM ledger WHERE id = ?`, [dbId], function (err) {
      if (err) {
        console.error('Delete ledger error:', err);
        return res.status(500).json({ error: err.message });
      }
      triggerDatabaseBackup();
      res.json({ success: true, deleted: this.changes });
    });
  });
});


// 2. Save or update an invoice
app.post('/api/invoices', (req, res) => {
  const { mode, invoice } = req.body;
  if (!mode || !invoice || !invoice.invoiceNo) {
    return res.status(400).json({ error: 'Invalid invoice payload' });
  }

  const id = `${mode}_${invoice.invoiceNo}`;
  const dataJson = JSON.stringify(invoice);
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO invoices (id, store_mode, invoice_no, date, customer_name, customer_phone, grand_total, data_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date,
       customer_name = excluded.customer_name,
       customer_phone = excluded.customer_phone,
       grand_total = excluded.grand_total,
       data_json = excluded.data_json,
       updated_at = excluded.updated_at`,
    [
      id,
      mode,
      invoice.invoiceNo,
      invoice.date || '',
      invoice.customerName || '',
      invoice.customerPhone || '',
      invoice.grandTotal || 0,
      dataJson,
      now
    ],
    function (err) {
      if (err) {
        console.error('Save invoice error:', err);
        return res.status(500).json({ error: err.message });
      }
      triggerDatabaseBackup();
      res.json({ success: true, invoiceNo: invoice.invoiceNo, id });
    }
  );
});

// 3. Delete an invoice with permanent safety archiving
app.delete('/api/invoices', (req, res) => {
  const { mode, invoiceNo } = req.body;
  if (!mode || !invoiceNo) {
    return res.status(400).json({ error: 'Missing mode or invoiceNo' });
  }

  const id = `${mode}_${invoiceNo}`;

  // Copy to permanent archive table before removing from active table
  db.get(`SELECT * FROM invoices WHERE id = ?`, [id], (err, row) => {
    if (row) {
      db.run(
        `INSERT OR REPLACE INTO deleted_invoices_archive (id, store_mode, invoice_no, data_json) VALUES (?, ?, ?, ?)`,
        [row.id, row.store_mode, row.invoice_no, row.data_json]
      );
    }

    db.run(`DELETE FROM invoices WHERE id = ?`, [id], function (err) {
      if (err) {
        console.error('Delete invoice error:', err);
        return res.status(500).json({ error: err.message });
      }
      triggerDatabaseBackup();
      res.json({ success: true, deleted: this.changes });
    });
  });
});

// 4. Save/Update Bulk Inventory
app.post('/api/inventory', (req, res) => {
  const { mode, inventory } = req.body;
  if (!mode || !Array.isArray(inventory)) {
    return res.status(400).json({ error: 'Invalid inventory payload' });
  }

  db.serialize(() => {
    // Delete existing inventory for this mode and re-insert
    db.run(`DELETE FROM inventory WHERE store_mode = ?`, [mode], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const stmt = db.prepare(`
        INSERT INTO inventory (id, store_mode, name, stock, price, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      inventory.forEach(item => {
        const id = `${mode}_${item.id || item.code || Math.random().toString(36).substr(2, 9)}`;
        stmt.run([id, mode, item.name || '', item.stock || 0, item.price || 0, JSON.stringify(item), now]);
      });

      stmt.finalize((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, count: inventory.length });
      });
    });
  });
});

// 5. Save Settings
app.post('/api/settings', (req, res) => {
  const { mode, settings } = req.body;
  if (!mode || !settings) {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }

  const dataJson = JSON.stringify(settings);
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO settings (store_mode, data_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(store_mode) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at`,
    [mode, dataJson, now],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// 6. Sync all data at once (migration / bulk sync)
app.post('/api/sync-all', (req, res) => {
  const { mode, invoices, inventory, settings } = req.body;
  if (!mode) return res.status(400).json({ error: 'Mode required' });

  db.serialize(() => {
    // Save Settings
    if (settings) {
      db.run(
        `INSERT INTO settings (store_mode, data_json, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(store_mode) DO UPDATE SET data_json = excluded.data_json`,
        [mode, JSON.stringify(settings)]
      );
    }

    // Save Inventory
    if (Array.isArray(inventory)) {
      db.run(`DELETE FROM inventory WHERE store_mode = ?`, [mode], () => {
        const stmt = db.prepare(`INSERT INTO inventory (id, store_mode, name, stock, price, data_json) VALUES (?, ?, ?, ?, ?, ?)`);
        inventory.forEach(item => {
          const id = `${mode}_${item.id}`;
          stmt.run([id, mode, item.name || '', item.stock || 0, item.price || 0, JSON.stringify(item)]);
        });
        stmt.finalize();
      });
    }

    // Save Invoices
    if (Array.isArray(invoices)) {
      const stmt = db.prepare(`
        INSERT INTO invoices (id, store_mode, invoice_no, date, customer_name, customer_phone, grand_total, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          date = excluded.date,
          customer_name = excluded.customer_name,
          customer_phone = excluded.customer_phone,
          grand_total = excluded.grand_total,
          data_json = excluded.data_json
      `);
      invoices.forEach(inv => {
        const id = `${mode}_${inv.invoiceNo}`;
        stmt.run([
          id,
          mode,
          inv.invoiceNo,
          inv.date || '',
          inv.customerName || '',
          inv.customerPhone || '',
          inv.grandTotal || 0,
          JSON.stringify(inv)
        ]);
      });
      stmt.finalize();
    }

    res.json({ success: true, message: 'All data synced & saved to MySQL/SQLite database!' });
  });
});

// Fallback for Single Page Application
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
