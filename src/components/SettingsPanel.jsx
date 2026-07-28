import React, { useState } from 'react';
import { Save, CheckCircle, HelpCircle } from 'lucide-react';

export default function SettingsPanel({ settings = {}, onSave }) {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card animate-fade-in d-flex flex-column gap-6">
      <div className="d-flex justify-between align-center border-bottom pb-4 mb-2">
        <div>
          <h2 className="brand-heading text-gold">Shop Configuration & Printing Profile</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Set standard headers, bank credentials, tax GST IDs, and invoice parameters.
          </p>
        </div>
        <button type="submit" className="btn btn-primary">
          <Save size={18} /> Save Settings
        </button>
      </div>

      {saved && (
        <div style={{
          backgroundColor: 'var(--accent-emerald-glow)',
          border: '1px solid var(--accent-emerald)',
          color: 'var(--accent-emerald)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '500'
        }}>
          <CheckCircle size={18} /> Shop credentials saved successfully! All future invoices will reflect these details.
        </div>
      )}

      <div className="grid-2">
        {/* Company Header Block */}
        <div className="d-flex flex-column gap-4">
          <h3 className="brand-heading border-bottom pb-2" style={{ fontSize: '1.15rem' }}>1. Shop Branding & Details</h3>
          
          <div>
            <label htmlFor="shopName">Shop Name / Business Title</label>
            <input
              id="shopName"
              type="text"
              name="shopName"
              value={form.shopName || ''}
              onChange={handleChange}
              placeholder="e.g. Reoti Handloom"
              required
            />
          </div>

          <div>
            <label htmlFor="shopAddress">Business Address</label>
            <textarea
              id="shopAddress"
              name="shopAddress"
              rows={3}
              value={form.shopAddress || ''}
              onChange={handleChange}
              placeholder="Full shop address..."
              required
            />
          </div>

          <div className="grid-2">
            <div>
              <label htmlFor="shopPhone">Phone / Mobile No</label>
              <input
                id="shopPhone"
                type="text"
                name="shopPhone"
                value={form.shopPhone || ''}
                onChange={handleChange}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div>
              <label htmlFor="shopEmail">Email Address</label>
              <input
                id="shopEmail"
                type="email"
                name="shopEmail"
                value={form.shopEmail || ''}
                onChange={handleChange}
                placeholder="billing@shop.com"
              />
            </div>
          </div>

          <div className="grid-3">
            <div>
              <label htmlFor="shopGSTIN">Shop GSTIN (Tax ID)</label>
              <input
                id="shopGSTIN"
                type="text"
                name="shopGSTIN"
                value={form.shopGSTIN || ''}
                onChange={handleChange}
                placeholder="e.g. 09ABCDE1234F1Z5"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label htmlFor="invoicePrefix">Invoice Prefix ID</label>
              <input
                id="invoicePrefix"
                type="text"
                name="invoicePrefix"
                value={form.invoicePrefix || ''}
                onChange={handleChange}
                placeholder="e.g. RH-2026-"
              />
            </div>
            <div>
              <label htmlFor="startingInvoiceNo">Starting Invoice No.</label>
              <input
                id="startingInvoiceNo"
                type="number"
                name="startingInvoiceNo"
                value={form.startingInvoiceNo || 293}
                onChange={handleChange}
                placeholder="293"
              />
            </div>
          </div>
        </div>

        {/* Bank details & Terms block */}
        <div className="d-flex flex-column gap-4">
          <h3 className="brand-heading border-bottom pb-2" style={{ fontSize: '1.15rem' }}>2. Accounts & Terms</h3>

          <div>
            <label htmlFor="accountHolderName">Account Holder Name (A/C Name)</label>
            <input
              id="accountHolderName"
              type="text"
              name="accountHolderName"
              value={form.accountHolderName || ''}
              onChange={handleChange}
              placeholder="e.g. Reoti Handloom / Shivam Ambekar"
            />
          </div>

          <div className="grid-2">
            <div>
              <label htmlFor="bankName">Bank Name</label>
              <input
                id="bankName"
                type="text"
                name="bankName"
                value={form.bankName || ''}
                onChange={handleChange}
                placeholder="e.g. State Bank of India"
              />
            </div>
            <div>
              <label htmlFor="bankAccountNo">Account Number</label>
              <input
                id="bankAccountNo"
                type="text"
                name="bankAccountNo"
                value={form.bankAccountNo || ''}
                onChange={handleChange}
                placeholder="e.g. 3300887766554"
              />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label htmlFor="bankIFSC">IFSC Code</label>
              <input
                id="bankIFSC"
                type="text"
                name="bankIFSC"
                value={form.bankIFSC || ''}
                onChange={handleChange}
                placeholder="e.g. SBIN0000201"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label htmlFor="bankBranch">Branch Name</label>
              <input
                id="bankBranch"
                type="text"
                name="bankBranch"
                value={form.bankBranch || ''}
                onChange={handleChange}
                placeholder="e.g. Sigra Branch"
              />
            </div>
          </div>

          <div>
            <label htmlFor="termsConditions">Standard Printing Terms & Conditions</label>
            <textarea
              id="termsConditions"
              name="termsConditions"
              rows={4}
              value={form.termsConditions || ''}
              onChange={handleChange}
              placeholder="Terms to display on the invoice footer. Add one item per line."
            />
          </div>
        </div>
      </div>
    </form>
  );
}
