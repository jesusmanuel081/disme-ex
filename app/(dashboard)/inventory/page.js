'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import PieChart from '@/components/charts/PieChart';
import DataTable from '@/components/tables/DataTable';
import { createClient } from '@/lib/supabase/client';

const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Nombre' },
  { key: 'category', label: 'Categoría' },
  { key: 'current_stock', label: 'Stock', type: 'number' },
  { key: 'min_stock', label: 'Stock Mín', type: 'number' },
  { key: 'avg_cost', label: 'Costo Prom.', type: 'currency' },
  { key: 'sale_price', label: 'Precio Venta', type: 'currency' },
  { key: 'unit', label: 'Unidad' },
];

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', sku: '', category: '', unit: 'pieza',
    current_stock: 0, min_stock: 0, avg_cost: 0, sale_price: 0, description: '',
  });

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);

    const catMap = {};
    (data || []).forEach((p) => {
      const cat = p.category || 'Sin categoría';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    setChartData(Object.entries(catMap).map(([name, value]) => ({ name, value })));
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    const supabase = createClient();
    if (editing) {
      await supabase.from('products').update(form).eq('id', editing.id);
    } else {
      await supabase.from('products').insert([form]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ name: '', sku: '', category: '', unit: 'pieza', current_stock: 0, min_stock: 0, avg_cost: 0, sale_price: 0, description: '' });
    loadProducts();
  }

  async function handleDelete(row) {
    if (confirm(`¿Eliminar "${row.name}"?`)) {
      const supabase = createClient();
      await supabase.from('products').delete().eq('id', row.id);
      loadProducts();
    }
  }

  function handleEdit(row) {
    setForm(row);
    setEditing(row);
    setShowModal(true);
  }

  return (
    <div>
      <Topbar title="Inventario" />
      <div className="p-6 space-y-6">
        <PieChart data={chartData} title="Productos por Categoría" />

        <div className="flex justify-between items-center">
          <p className="text-sm text-text-muted">{products.length} producto(s)</p>
          <button
            onClick={() => { setEditing(null); setForm({ name: '', sku: '', category: '', unit: 'pieza', current_stock: 0, min_stock: 0, avg_cost: 0, sale_price: 0, description: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Producto
          </button>
        </div>

        <DataTable columns={columns} data={products} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU *</label>
                  <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                    <option value="pieza">Pieza</option>
                    <option value="caja">Caja</option>
                    <option value="ml">ml</option>
                    <option value="mg">mg</option>
                    <option value="litro">Litro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Actual</label>
                  <input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Mínimo</label>
                  <input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Costo Promedio</label>
                  <input type="number" step="0.01" value={form.avg_cost} onChange={(e) => setForm({ ...form, avg_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Precio de Venta</label>
                <input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-text-muted hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover">{editing ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
