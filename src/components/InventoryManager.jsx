import React, { useState } from 'react';
import { Plus, Search, Trash2, Edit3, Check, X, AlertTriangle, Layers } from 'lucide-react';
import { CATEGORIES, UNITS } from '../constants';
import { formatCurrency } from '../utils';

export default function InventoryManager({ inventory = [], onAddProduct, onUpdateProduct, onDeleteProduct }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // New product form visibility and state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    hsn: '5208',
    category: 'Sarees',
    rate: '',
    gstRate: 5,
    stock: '',
    unit: 'Pcs'
  });

  const handleStartEdit = (product) => {
    setEditingId(product.id);
    setEditForm({ ...product, hsn: product.hsn || '5208' });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'rate' || name === 'stock' || name === 'gstRate' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSaveEdit = () => {
    onUpdateProduct(editingId, editForm);
    setEditingId(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleAddNewProduct = (e) => {
    e.preventDefault();
    const productToAdd = {
      ...newProduct,
      id: `prod-${Date.now()}`,
      hsn: newProduct.hsn || '5208',
      rate: parseFloat(newProduct.rate) || 0,
      stock: parseFloat(newProduct.stock) || 0,
      gstRate: parseFloat(newProduct.gstRate) || 0
    };
    onAddProduct(productToAdd);
    setShowAddForm(false);
    setNewProduct({
      name: '',
      sku: '',
      hsn: '5208',
      category: 'Sarees',
      rate: '',
      gstRate: 5,
      stock: '',
      unit: 'Pcs'
    });
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  // Filters list
  const filteredProducts = inventory.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (product.hsn && product.hsn.includes(searchTerm));
    const matchCat = selectedCategory === 'All' || product.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const lowStockCount = inventory.filter(p => p.stock < 5).length;

  return (
    <div className="d-flex flex-column gap-6 animate-fade-in">
      {/* Header operations and summaries */}
      <div className="d-flex justify-between align-center flex-wrap gap-4">
        <div>
          <h2 className="brand-heading text-gold">Handloom Stock Catalogue</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Maintain product catalogs, adjust prices, edit raw HSN labels, and control stock availability.
          </p>
        </div>
        <div className="d-flex gap-3">
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={18} /> New Product Catalog Entry
          </button>
        </div>
      </div>

      {/* Warning Alert if stock running low */}
      {lowStockCount > 0 && (
        <div className="d-flex align-center gap-3" style={{
          backgroundColor: 'var(--accent-rose-glow)',
          border: '1px solid var(--accent-rose)',
          color: 'var(--accent-rose)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          fontWeight: '500'
        }}>
          <AlertTriangle size={18} />
          <span>Notice: {lowStockCount} product(s) are running critically low on inventory stock (&lt; 5 units). Prompt replenishment is recommended.</span>
        </div>
      )}

      {/* Expandable New Product Shell */}
      {showAddForm && (
        <form onSubmit={handleAddNewProduct} className="glass-card d-flex flex-column gap-4" style={{ border: '1px solid var(--accent-gold)' }}>
          <div className="d-flex justify-between align-center border-bottom pb-2">
            <h3 className="brand-heading text-gold" style={{ fontSize: '1.2rem' }}>Add Product Details</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)} style={{ padding: '3px' }}>
              <X size={18} />
            </button>
          </div>
          <div className="grid-4">
            <div>
              <label htmlFor="prodName">Item Name</label>
              <input id="prodName" type="text" name="name" value={newProduct.name} onChange={handleAddChange} placeholder="e.g. Silk Dupatta" required />
            </div>
            <div>
              <label htmlFor="prodSku">SKU Code</label>
              <input id="prodSku" type="text" name="sku" value={newProduct.sku} onChange={handleAddChange} placeholder="e.g. SLK-DPT" required />
            </div>
            <div>
              <label htmlFor="prodHsn">HSN Code</label>
              <input id="prodHsn" type="text" name="hsn" value={newProduct.hsn} onChange={handleAddChange} placeholder="GST HSN e.g. 5007" />
            </div>
            <div>
              <label htmlFor="prodCat">Category</label>
              <select id="prodCat" name="category" value={newProduct.category} onChange={handleAddChange}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-4">
            <div>
              <label htmlFor="prodRate">Rate (Price per Unit)</label>
              <input id="prodRate" type="number" step="0.01" name="rate" value={newProduct.rate} onChange={handleAddChange} placeholder="₹ Price" required />
            </div>
            <div>
              <label htmlFor="prodUnit">Quantity Unit</label>
              <select id="prodUnit" name="unit" value={newProduct.unit} onChange={handleAddChange}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="prodTax">GST Rate (%)</label>
              <select id="prodTax" name="gstRate" value={newProduct.gstRate} onChange={handleAddChange}>
                <option value={0}>0% (Tax Exempt)</option>
                <option value={5}>5% (Standard Apparel)</option>
                <option value={12}>12% (Premium Home)</option>
                <option value={18}>18% (Luxury Goods)</option>
              </select>
            </div>
            <div>
              <label htmlFor="prodStock">Opening Stock</label>
              <input id="prodStock" type="number" name="stock" value={newProduct.stock} onChange={handleAddChange} placeholder="Qty" required />
            </div>
          </div>
          <div className="d-flex justify-end gap-3 mt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Product Stock</button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-card d-flex align-center justify-between gap-4 flex-wrap py-3">
        <div className="d-flex align-center gap-2 flex-grow-1" style={{ maxWidth: '400px', relative: 'true' }}>
          <Search size={18} className="text-muted" style={{ position: 'absolute', marginLeft: '12px' }} />
          <input
            type="text"
            placeholder="Search products by SKU, name or HSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
        <div className="d-flex align-center gap-3">
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Category:</span>
          <div className="d-flex gap-2">
            {['All', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="glass-card table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>SKU Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>HSN</th>
              <th className="text-right">Price Rate</th>
              <th className="text-center">Tax Slab</th>
              <th className="text-center">Stock Level</th>
              <th className="text-right no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const isEditing = editingId === product.id;
              const isLowStock = product.stock < 5;

              return (
                <tr key={product.id} style={isLowStock ? { backgroundColor: 'rgba(239, 68, 68, 0.02)' } : {}}>
                  
                  {/* SKU Column */}
                  <td>
                    {isEditing ? (
                      <input type="text" name="sku" value={editForm.sku} onChange={handleEditChange} style={{ width: '100px', padding: '6px' }} />
                    ) : (
                      <span className="badge badge-gold">{product.sku}</span>
                    )}
                  </td>

                  {/* Name Column */}
                  <td>
                    {isEditing ? (
                      <input type="text" name="name" value={editForm.name} onChange={handleEditChange} style={{ padding: '6px' }} />
                    ) : (
                      <strong>{product.name}</strong>
                    )}
                  </td>

                  {/* Category Column */}
                  <td>
                    {isEditing ? (
                      <select name="category" value={editForm.category} onChange={handleEditChange} style={{ padding: '6px' }}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      product.category
                    )}
                  </td>

                  {/* HSN Column */}
                  <td>
                    {isEditing ? (
                      <input type="text" name="hsn" value={editForm.hsn} onChange={handleEditChange} style={{ width: '80px', padding: '6px' }} />
                    ) : (
                      product.hsn || '-'
                    )}
                  </td>

                  {/* Price Rate Column */}
                  <td className="text-right">
                    {isEditing ? (
                      <input type="number" step="0.01" name="rate" value={editForm.rate} onChange={handleEditChange} style={{ width: '90px', padding: '6px', textAlign: 'right' }} />
                    ) : (
                      formatCurrency(product.rate)
                    )}
                  </td>

                  {/* GST Slab Column */}
                  <td className="text-center">
                    {isEditing ? (
                      <select name="gstRate" value={editForm.gstRate} onChange={handleEditChange} style={{ padding: '6px', width: '80px' }}>
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                      </select>
                    ) : (
                      `${product.gstRate}%`
                    )}
                  </td>

                  {/* Stock Level Column */}
                  <td className="text-center">
                    {isEditing ? (
                      <div className="d-flex align-center gap-1" style={{ justifyContent: 'center' }}>
                        <input type="number" name="stock" value={editForm.stock} onChange={handleEditChange} style={{ width: '70px', padding: '6px', textAlign: 'center' }} />
                        <span style={{ fontSize: '0.8rem' }}>{editForm.unit}</span>
                      </div>
                    ) : (
                      <span className={`badge ${isLowStock ? 'badge-rose font-bold pulse-glow' : 'badge-emerald'}`}>
                        {product.stock} {product.unit}
                      </span>
                    )}
                  </td>

                  {/* Action buttons */}
                  <td className="text-right no-print">
                    <div className="d-flex gap-2 justify-end">
                      {isEditing ? (
                        <>
                          <button className="btn btn-emerald btn-sm" onClick={handleSaveEdit} title="Commit Changes">
                            <Check size={14} /> Save
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit} title="Discard Updates">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleStartEdit(product)} title="Edit specifications">
                            <Edit3 size={14} />
                          </button>
                          <button className="btn btn-rose btn-sm" onClick={() => {
                            if (window.confirm(`Delete ${product.name} from warehouse catalogs?`)) {
                              onDeleteProduct(product.id);
                            }
                          }} title="Delete item">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted" style={{ padding: '24px' }}>
                  No stock items match your filter criteria. Add a product above to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
