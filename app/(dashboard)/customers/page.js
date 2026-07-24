'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import PieChart from '@/components/charts/PieChart';
import DataTable from '@/components/tables/DataTable';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

const columns = [
  { key: 'company_name', label: 'Empresa' },
  { key: 'contact_name', label: 'Contacto' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'address', label: 'Dirección' },
  { key: 'credit_limit', label: 'Crédito', type: 'currency' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', address: '', credit_limit: 0,
  });

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('customers').select('*').order('company_name');
    setCustomers(data || []);

    // Orders by status for chart
    const { data: orderData } = await supabase.from('orders').select('status');
    const statusMap = {};
    orderData?.forEach((o) => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });
    setChartData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    const supabase = createClient();
    if (editing) {
      await supabase.from('customers').update(form).eq('id', editing.id);
    } else {
      await supabase.from('customers').insert([form]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({ company_name: '', contact_name: '', email: '', phone: '', address: '', credit_limit: 0 });
    loadCustomers();
  }

  async function handleDelete(row) {
    if (confirm(`¿Eliminar cliente "${row.company_name}"?`)) {
      const supabase = createClient();
      await supabase.from('customers').delete().eq('id', row.id);
      loadCustomers();
    }
  }

  function handleEdit(row) {
    setForm(row);
    setEditing(row);
    setShowModal(true);
  }

  return (
    <div>
      <Topbar title="Clientes" />
      <div className="p-6 space-y-6">
        <PieChart data={chartData} title="Pedidos por Estado" />

        <div className="flex justify-between items-center">
          <p className="text-sm text-text-muted">{customers.length} cliente(s)</p>
          <button
            onClick={() => { setEditing(null); setForm({ company_name: '', contact_name: '', email: '', phone: '', address: '', credit_limit: 0 }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Cliente
          </button>
        </div>

        <DataTable columns={columns} data={customers} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Empresa *</label>
                <input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Contacto</label>
                  <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dirección</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Límite de Crédito</label>
                <input type="number" step="0.01" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
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
