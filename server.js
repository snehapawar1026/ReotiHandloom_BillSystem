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

    console.log('Database tables verified / initialized.');
  });
}

// Backup helper
function saveJsonBackup(data) {
  try {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write JSON backup:', err);
  }
}

function loadJsonBackup() {
  try {
    if (fs.existsSync(BACKUP_PATH)) {
      const raw = fs.readFileSync(BACKUP_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load JSON backup:', err);
  }
  return { reoti: { invoices: [], inventory: [], settings: null }, ambekar: { invoices: [], inventory: [], settings: null } };
}

// API Routes

// 1. Get all store data (Invoices, Inventory, Settings) for a given mode
app.get('/api/data', (req, res) => {
  const mode = req.query.mode || 'reoti';

  db.serialize(() => {
    db.all(`SELECT data_json FROM invoices WHERE store_mode = ? ORDER BY date DESC, updated_at DESC`, [mode], (err, invRows) => {
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

          const invoices = invRows ? invRows.map(r => JSON.parse(r.data_json)) : [];
          const inventory = invenRows ? invenRows.map(r => JSON.parse(r.data_json)) : [];
          const settings = setRow ? JSON.parse(setRow.data_json) : null;

          res.json({ invoices, inventory, settings });
        });
      });
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
      res.json({ success: true, invoiceNo: invoice.invoiceNo, id });
    }
  );
});

// 3. Delete an invoice
app.delete('/api/invoices', (req, res) => {
  const { mode, invoiceNo } = req.body;
  if (!mode || !invoiceNo) {
    return res.status(400).json({ error: 'Missing mode or invoiceNo' });
  }

  const id = `${mode}_${invoiceNo}`;
  db.run(`DELETE FROM invoices WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Delete invoice error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, deleted: this.changes });
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
