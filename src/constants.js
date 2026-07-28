// Seed data and constants for Reoti Handloom Billing System

export const INITIAL_PRODUCTS = [
  { id: 'prod-1', name: 'Banarasi Silk Saree', sku: 'BNS-001', hsn: '5208', category: 'Sarees', rate: 5800, gstRate: 5, stock: 15, unit: 'Pcs' },
  { id: 'prod-2', name: 'Chanderi Cotton Saree', sku: 'CHC-002', hsn: '5208', category: 'Sarees', rate: 3200, gstRate: 5, stock: 24, unit: 'Pcs' },
  { id: 'prod-3', name: 'Pochampally Ikat Saree', sku: 'PIS-003', hsn: '5208', category: 'Sarees', rate: 7500, gstRate: 5, stock: 8, unit: 'Pcs' },
  { id: 'prod-4', name: 'Indigo Dabu Print Fabric', sku: 'DAB-101', hsn: '5209', category: 'Fabrics', rate: 180, gstRate: 5, stock: 120, unit: 'Meters' },
  { id: 'prod-5', name: 'Kalamkari Handblock Fabric', sku: 'KAL-102', hsn: '5209', category: 'Fabrics', rate: 240, gstRate: 5, stock: 85, unit: 'Meters' },
  { id: 'prod-6', name: 'Bhagalpuri Tussar Saree', sku: 'BTS-201', hsn: '5208', category: 'Sarees', rate: 4500, gstRate: 5, stock: 18, unit: 'Pcs' },
  { id: 'prod-7', name: 'Jaipuri Hand-printed Bedsheet', sku: 'JHB-301', hsn: '6304', category: 'Home Decor', rate: 2100, gstRate: 12, stock: 20, unit: 'Sets' },
  { id: 'prod-8', name: 'Lucknowi Chikankari Kurta Fabric', sku: 'LCK-401', hsn: '5208', category: 'Fabrics', rate: 350, gstRate: 5, stock: 60, unit: 'Meters' }
];

export const DEFAULT_SETTINGS = {
  shopName: 'Reoti Handloom',
  shopAddress: '73, LaxmiBai Marg, Maheshwar , Madhya Pradesh  - 451224',
  shopPhone: '9617444445',
  shopEmail: 'reotihandloom@hotmail.com',
  shopGSTIN: '23BDFPA9843J1ZJ', // Madhya Pradesh state code prefix is 23 (Varanasi/UP was 09)
  bankName: 'HDFC',
  bankAccountNo: '99954444444445',
  bankIFSC: 'HDFC0002089',
  bankBranch: 'Maheshwar Branch',
  accountHolderName: 'Reoti Handloom',
  invoicePrefix: 'RH-2026-',
  startingInvoiceNo: 293,
  termsConditions: '1. Goods once sold cannot be taken back.\n2. Interest @ 18% will be charged if bill is not settled within 15 days.\n3. All disputes are subject to Maheshwar jurisdiction.'
};

export const INITIAL_INVOICES = [];

export const CATEGORIES = ['Sarees', 'Fabrics', 'Dupattas', 'Home Decor', 'Others'];
export const UNITS = ['Pcs', 'Meters', 'Sets', 'Kgs'];
