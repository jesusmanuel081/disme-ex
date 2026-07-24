'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Topbar from '@/components/layout/Topbar';
import { supabase } from '@/lib/supabase/client';

const RouteMap = dynamic(() => import('@/components/maps/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-text-muted text-sm">
      Cargando mapa...
    </div>
  ),
});

export default function RoutesContent() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [routeForm, setRouteForm] = useState({
    name: '', driver_name: '', vehicle: '', date: new Date().toISOString().split('T')[0], start_point: '',
  });
  const [stopForm, setStopForm] = useState({
    customer_id: '', lat: 28.6353, lng: -106.0889, notes: '',
  });

  useEffect(() => {
    loadRoutes();
    loadCustomers();
  }, []);

  async function loadRoutes() {
    const { data } = await supabase.from('routes').select('*').order('date', { ascending: false });
    setRoutes(data || []);
  }

  async function loadCustomers() {
    const { data } = await supabase.from('customers').select('id, company_name');
    setCustomers(data || []);
  }

  async function loadStops(routeId) {
    const { data } = await supabase
      .from('route_stops')
      .select('*, customers(company_name)')
      .eq('route_id', routeId)
      .order('stop_order');
    const formatted = (data || []).map((s) => ({
      ...s,
      customer_name: s.customers?.company_name || 'Sin cliente',
    }));
    setStops(formatted);
    setSelectedRoute(routes.find((r) => r.id === routeId));
  }

  async function handleSaveRoute(e) {
    e.preventDefault();
    await supabase.from('routes').insert([routeForm]);
    setShowModal(false);
    setRouteForm({ name: '', driver_name: '', vehicle: '', date: new Date().toISOString().split('T')[0], start_point: '' });
    loadRoutes();
  }

  async function handleSaveStop(e) {
    e.preventDefault();
    if (!selectedRoute) return;
    const maxOrder = stops.length > 0 ? Math.max(...stops.map((s) => s.stop_order)) : 0;
    await supabase.from('route_stops').insert([{
      route_id: selectedRoute.id,
      customer_id: stopForm.customer_id || null,
      lat: stopForm.lat,
      lng: stopForm.lng,
      notes: stopForm.notes,
      stop_order: maxOrder + 1,
    }]);
    setShowStopModal(false);
    setStopForm({ customer_id: '', lat: 28.6353, lng: -106.0889, notes: '' });
    loadStops(selectedRoute.id);
  }

  async function handleDeleteRoute(route) {
    if (confirm(`¿Eliminar ruta "${route.name}"?`)) {
      await supabase.from('routes').delete().eq('id', route.id);
      if (selectedRoute?.id === route.id) {
        setSelectedRoute(null);
        setStops([]);
      }
      loadRoutes();
    }
  }

  const routeLines = [];
  if (stops.length > 1) {
    routeLines.push({
      positions: stops.map((s) => [s.lat, s.lng]).sort((a, b) => {
        const stopA = stops.find((s) => s.lat === a[0] && s.lng === a[1]);
        const stopB = stops.find((s) => s.lat === b[0] && s.lng === b[1]);
        return (stopA?.stop_order || 0) - (stopB?.stop_order || 0);
      }),
    });
  }

  const statusColors = {
    planned: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  return (
    <div>
      <Topbar title="Rutas" />
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-text">Rutas</h3>
            <button onClick={() => setShowModal(true)}
              className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover">
              + Nueva
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {routes.map((route) => (
              <div key={route.id} onClick={() => loadStops(route.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedRoute?.id === route.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm text-text">{route.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">{route.date}</p>
                    {route.driver_name && <p className="text-xs text-text-muted">Chofer: {route.driver_name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[route.status]}`}>{route.status}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route); }}
                      className="p-1 text-accent hover:bg-accent-light rounded">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {routes.length === 0 && <div className="p-8 text-center text-text-muted text-sm">No hay rutas creadas</div>}
          </div>
        </div>

        <div className="flex-1 relative">
          {selectedRoute ? (
            <>
              <div className="absolute top-4 right-4 z-[1000]">
                <button onClick={() => setShowStopModal(true)}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover shadow-lg">
                  + Agregar Parada
                </button>
              </div>
              <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-xs">
                <p className="font-semibold text-sm text-text">{selectedRoute.name}</p>
                <p className="text-xs text-text-muted">{stops.length} parada(s)</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Pendiente</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Llegó</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Entregado</span>
                </div>
              </div>
              <RouteMap stops={stops} routeLines={routeLines} />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-text-muted">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-sm">Selecciona una ruta para ver el mapa</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nueva Ruta</h2>
            <form onSubmit={handleSaveRoute} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input required value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Chofer</label>
                  <input value={routeForm.driver_name} onChange={(e) => setRouteForm({ ...routeForm, driver_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vehículo</label>
                  <input value={routeForm.vehicle} onChange={(e) => setRouteForm({ ...routeForm, vehicle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <input type="date" value={routeForm.date} onChange={(e) => setRouteForm({ ...routeForm, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Punto Inicial</label>
                  <input value={routeForm.start_point} onChange={(e) => setRouteForm({ ...routeForm, start_point: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-text-muted hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Agregar Parada</h2>
            <form onSubmit={handleSaveStop} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <select value={stopForm.customer_id} onChange={(e) => setStopForm({ ...stopForm, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="">Seleccionar cliente</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitud *</label>
                  <input type="number" step="any" required value={stopForm.lat} onChange={(e) => setStopForm({ ...stopForm, lat: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitud *</label>
                  <input type="number" step="any" required value={stopForm.lng} onChange={(e) => setStopForm({ ...stopForm, lng: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <input value={stopForm.notes} onChange={(e) => setStopForm({ ...stopForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowStopModal(false)}
                  className="px-4 py-2 text-sm text-text-muted hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover">Agregar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
