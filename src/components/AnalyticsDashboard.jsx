import React, { useMemo } from 'react';
import { DollarSign, FileText, ShoppingCart, Percent, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils';

export default function AnalyticsDashboard({ invoices = [], inventory = [] }) {
  // 1. Calculate general financial metrics
  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grandTotal) || 0), 0);
    const invoiceCount = invoices.length;
    const avgOrderValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;
    
    // Total Udhar / Pending due
    const totalDueUdhar = invoices.reduce((sum, inv) => {
      const grandTotal = parseFloat(inv.grandTotal) || 0;
      const paid = inv.paidAmount !== undefined && inv.paidAmount !== null ? parseFloat(inv.paidAmount) : (inv.paymentStatus === 'Unpaid' ? 0 : grandTotal);
      const due = inv.dueAmount !== undefined && inv.dueAmount !== null ? parseFloat(inv.dueAmount) : Math.max(0, grandTotal - paid);
      return sum + due;
    }, 0);

    // Tax calculation
    const totalTaxes = invoices.reduce((sum, inv) => {
      const items = inv.items || [];
      const itemTax = items.reduce((s, item) => s + (parseFloat(item.tax) || 0), 0);
      return sum + itemTax;
    }, 0);

    return {
      revenue: totalRevenue,
      count: invoiceCount,
      avg: avgOrderValue,
      tax: totalTaxes,
      dueUdhar: totalDueUdhar
    };
  }, [invoices]);

  // 2. Calculations for Payment Modes metrics
  const paymentBreakdown = useMemo(() => {
    const breakdown = { UPI: 0, Cash: 0, Card: 0, 'Net Banking': 0, Credit: 0 };
    invoices.forEach(inv => {
      const mode = inv.paymentMode || 'Cash';
      const amt = parseFloat(inv.grandTotal) || 0;
      if (breakdown[mode] !== undefined) {
        breakdown[mode] += amt;
      }
    });

    // Convert into percentage distributions
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return Object.entries(breakdown).map(([mode, value]) => ({
      mode,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    }));
  }, [invoices]);

  // 3. Calculate Daily Sales Chart Details (Last 7 active bill dates)
  const chartData = useMemo(() => {
    const grouped = {};
    // Seed last 7 calendar days dynamically
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      grouped[dateStr] = 0;
    }

    // Populate actual revenues
    invoices.forEach(inv => {
      if (grouped[inv.date] !== undefined) {
        grouped[inv.date] += parseFloat(inv.grandTotal) || 0;
      }
    });

    const entries = Object.entries(grouped);
    const maxVal = Math.max(...entries.map(([, val]) => val), 1000); // division fallback

    return entries.map(([date, revenue]) => {
      const parts = date.split('-');
      const label = `${parts[2]}/${parts[1]}`; // DD/MM formatting
      return {
        date,
        label,
        revenue,
        heightPercent: (revenue / maxVal) * 100
      };
    });
  }, [invoices]);

  // 4. Low stock warnings overview
  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.stock < 5).slice(0, 5);
  }, [inventory]);

  return (
    <div className="d-flex flex-column gap-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h2 className="brand-heading text-gold">Business Analytics & Metrics Console</h2>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
          Evaluate store performance, audit total tax logs, inspect recent sales curves, and check stock warnings.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid-4">
        {/* Revenue Card */}
        <div className="glass-card dashboard-stat-card">
          <div className="stat-icon-wrapper emerald">
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Total Revenue Receipts</span>
            <h3>{formatCurrency(stats.revenue)}</h3>
          </div>
        </div>

        {/* Invoice Sales Count Card */}
        <div className="glass-card dashboard-stat-card">
          <div className="stat-icon-wrapper blue">
            <FileText size={24} />
          </div>
          <div className="stat-details">
            <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Total Invoices Billed</span>
            <h3>{stats.count} Bills</h3>
          </div>
        </div>

        {/* Average Transaction Ticket Card */}
        <div className="glass-card dashboard-stat-card">
          <div className="stat-icon-wrapper">
            <ShoppingCart size={24} />
          </div>
          <div className="stat-details">
            <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Average Bill Value</span>
            <h3>{formatCurrency(stats.avg)}</h3>
          </div>
        </div>

        {/* Total Pending Customer Udhar Card */}
        <div className="glass-card dashboard-stat-card" style={stats.dueUdhar > 0 ? { border: '1px solid #ef4444' } : {}}>
          <div className="stat-icon-wrapper rose">
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Total Outstanding Credit Due</span>
            <h3 style={{ color: stats.dueUdhar > 0 ? '#ef4444' : 'inherit' }}>{formatCurrency(stats.dueUdhar)}</h3>
          </div>
        </div>
      </div>

      {/* Charts & Split Screen Sections */}
      <div className="grid-2">
        {/* Custom Revenue Bar Chart */}
        <div className="glass-card d-flex flex-column gap-4">
          <h3 className="brand-heading text-gold" style={{ fontSize: '1.2rem' }}>7-Day Revenue Trend (₹)</h3>
          
          <div className="d-flex flex-column justify-between" style={{ height: '220px', padding: '10px 0' }}>
            <div className="d-flex align-end justify-between" style={{ height: '180px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              {chartData.map(day => (
                <div key={day.date} className="d-flex flex-column align-center flex-grow-1" style={{ maxWidth: '40px' }}>
                  {/* Revenue tooltip visual on hover */}
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: '4px',
                    color: day.revenue > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)'
                  }}>
                    {day.revenue > 0 ? `₹${Math.round(day.revenue / 100) / 10}k` : '0'}
                  </div>
                  
                  {/* Revenue Bar */}
                  <div style={{
                    width: '24px',
                    height: `${Math.max(day.heightPercent, 2)}px`,
                    backgroundColor: day.revenue > 0 ? 'var(--accent-gold)' : 'var(--border-color)',
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                    transition: 'height 0.4s ease',
                    boxShadow: day.revenue > 0 ? 'rgba(212, 175, 55, 0.25) 0px 4px 10px' : 'none'
                  }}></div>
                </div>
              ))}
            </div>

            {/* X Axis labels */}
            <div className="d-flex justify-between" style={{ padding: '4px 10px 0 10px' }}>
              {chartData.map(day => (
                <span key={day.date} className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 500, width: '40px', textAlign: 'center' }}>
                  {day.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Preferences Spread */}
        <div className="glass-card d-flex flex-column justify-between gap-4">
          <h3 className="brand-heading text-gold" style={{ fontSize: '1.2rem' }}>Payment Distribution Methods</h3>
          
          <div className="d-flex flex-column gap-3" style={{ flexGrow: 1, justifyCenter: 'center' }}>
            {paymentBreakdown.map(({ mode, value, percentage }) => (
              <div key={mode} className="d-flex flex-column gap-1">
                <div className="d-flex justify-between text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                  <span className="text-primary">{mode}</span>
                  <span>{formatCurrency(value)} ({percentage.toFixed(1)}%)</span>
                </div>
                {/* Visual percentage tracker bar */}
                <div style={{
                  height: '8px',
                  backgroundColor: 'var(--border-color)',
                  borderRadius: '9999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: mode === 'UPI' ? 'var(--accent-emerald)' : 
                                     mode === 'Cash' ? 'var(--accent-gold)' : 
                                     mode === 'Card' ? 'var(--accent-blue)' : 'var(--text-muted)',
                    borderRadius: '9999px'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Stock alerts tracker */}
      <div className="glass-card">
        <h3 className="brand-heading text-gold mb-3" style={{ fontSize: '1.2rem' }}>Warehouse Replenishment Warnings</h3>
        <div className="table-container">
          <table className="custom-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Standard Rate</th>
                <th>Stock Left</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map(item => (
                <tr key={item.id}>
                  <td><span className="badge badge-gold">{item.sku}</span></td>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td>{formatCurrency(item.rate)}</td>
                  <td>
                    <span className="badge badge-rose font-bold pulse-glow">
                      {item.stock} {item.unit}
                    </span>
                  </td>
                </tr>
              ))}
              {lowStockItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-emerald" style={{ padding: '16px', fontWeight: 500 }}>
                    Excellent! All catalog stocks are healthy (&gt;= 5 units available).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
