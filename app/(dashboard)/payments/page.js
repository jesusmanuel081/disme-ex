'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import PieChart from '@/components/charts/PieChart';
import DataTable from '@/components/tables/DataTable';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';

const columns = [
  { key: 'order_ref', label: 'Pedido' },
  { key: 'amount', label: 'Monto', type: 'currency' },
  { key: 'method', label: 'Método' },
  { key: 'status', label: 'Estado', type: 'status' },
  { key: 'reference', label: 'Referencia' },
  { key: 'created_at', label: 'Fecha', type: 'date' },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    order_id: '', amount: 0, method: 'cash', status: 'pending', reference: '',
  });

  useEffect(() => { loadPayments(); loadOrders(); }, []);

  async function loadPayments() {
    const { data } = await supabase
      .from('payments')
      .select('*, orders(id, total)')
      .order('created_at', { ascending: false });

    const formatted = (data || []).map((p) => ({
      ...p,
      order_ref: `#${p.orders?.id?.slice(0, 8) || 'N/A'}`,
    }));
    setPayments(formatted);

    const statusMap = {};
    (data || []).forEach((p) => {
      statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    });
    setChartData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
  }

  async function loadOrders() {
    const { data } = await supabase.from('orders').select('id, total, status, customers(company_name)');
    setOrders(data || []);
  }

  async function handleSave(e) {
    e.preventDefault();
    await supabase.from('payments').insert([form]);
    setShowModal(false);
    setForm({ order_id: '', amount: 0, method: 'cash', status: 'pending', reference: '' });
    loadPayments();
  }

  async function handleDelete(row) {
    if (confirm('¿Eliminar este pago?')) {
      await supabase.from('payments').delete().eq('id', row.id);
      loadPayments();
    }
  }

  return (
    <div>
      <Topbar title="Pagos" />
      <div className="p-6 space-y-6">
        <PieChart data={chartData} title="Pagos por Estado" />

        <div className="flex justify-between items-center">
          <p className="text-sm text-text-muted">{payments.length} pago(s)</p>
          <button
            onClick={() => { setForm({ order_id: '', amount: 0, method: 'cash', status: 'pending', reference: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Pago
          </button>
        </div>

        <DataTable columns={columns} data={payments} onDelete={handleDelete} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Registrar Pago</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Pedido *</label>
                <select required value={form.order_id} onChange={(e) => {
                  const order = orders.find((o) => o.id === e.target.value);
                  setForm({ ...form, order_id: e.target.value, amount: order?.total || 0 });
                }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="">Seleccionar pedido</option>
                  {orders.filter((o) => o.status !== 'cancelled').map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id.slice(0, 8)} — {o.customers?.company_name} — {formatCurrency(o.total)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Monto *</label>
                  <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Método</label>
                  <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                    <option value="pending">Pendiente</option>
                    <option value="completed">Completado</option>
                    <option value="failed">Fallido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Referencia</label>
                  <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-text-muted hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
