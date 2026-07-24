'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import PieChart from '@/components/charts/PieChart';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    products: 0,
    customers: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [inventoryData, setInventoryData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [supplierOrderData, setSupplierOrderData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);

    // Load counts
    const [products, customers, orders, payments] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id, status, total'),
      supabase.from('payments').select('amount, status'),
    ]);

    const pendingOrders = orders.data?.filter((o) => o.status === 'pending').length || 0;
    const totalRevenue = payments.data
      ?.filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0) || 0;

    setStats({
      products: products.count || 0,
      customers: customers.count || 0,
      pendingOrders,
      totalRevenue,
    });

    // Inventory by category
    const { data: productsData } = await supabase.from('products').select('category');
    const categoryMap = {};
    productsData?.forEach((p) => {
      const cat = p.category || 'Sin categoría';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    setInventoryData(Object.entries(categoryMap).map(([name, value]) => ({ name, value })));

    // Orders by status
    const statusMap = {};
    orders.data?.forEach((o) => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });
    setOrderStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

    // Supplier orders
    const { data: poData } = await supabase.from('purchase_orders').select('status');
    const poMap = {};
    poData?.forEach((po) => {
      poMap[po.status] = (poMap[po.status] || 0) + 1;
    });
    setSupplierOrderData(Object.entries(poMap).map(([name, value]) => ({ name, value })));

    // Payments by status
    const payMap = {};
    payments.data?.forEach((p) => {
      payMap[p.status] = (payMap[p.status] || 0) + 1;
    });
    setPaymentData(Object.entries(payMap).map(([name, value]) => ({ name, value })));

    setLoading(false);
  }

  const kpiCards = [
    {
      title: 'Productos',
      value: stats.products,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Clientes',
      value: stats.customers,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Pedidos Pendientes',
      value: stats.pendingOrders,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      title: 'Ingresos Totales',
      value: formatCurrency(stats.totalRevenue),
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-accent/10 text-accent',
    },
  ];

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div key={card.title} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">{card.title}</p>
                  <p className="text-2xl font-bold text-text mt-1">
                    {loading ? '...' : card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PieChart data={inventoryData} title="Inventario por Categoría" />
          <PieChart data={orderStatusData} title="Estado de Pedidos a Clientes" />
          <PieChart data={supplierOrderData} title="Órdenes de Compra a Proveedores" />
          <PieChart data={paymentData} title="Estado de Pagos" />
        </div>
      </div>
    </div>
  );
}
