import React, { useState, useEffect } from 'react';
import { Lock, Image as ImageIcon, Calendar, Hash, LogOut, Trash2 } from 'lucide-react';
import { Shipment, Upload } from './types.ts';

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(false);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [savingShipment, setSavingShipment] = useState(false);

  const fetchShipmentData = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/shipment?nc=${Date.now()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await res.json();
      const arrayData = Array.isArray(data) ? data : (data ? [data] : []);
      setShipments(arrayData);
      // Ensure we have at least 1 tab selected if data exists
      if (arrayData.length > 0 && activeTab >= arrayData.length) {
        setActiveTab(0);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeTab]);

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    setUploads([]);
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUploads = React.useCallback(async (token: string, silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/admin/uploads?nc=${Date.now()}`, {
        headers: {
          'Authorization': token,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setUploads(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Fetch uploads error:", err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [handleLogout]);

  // Auto refresh uploads every 15 seconds
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!isLoggedIn || !token) return;

    const interval = setInterval(() => {
      fetchUploads(token, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [isLoggedIn, fetchUploads]);

  useEffect(() => {
    document.title = "Panel de Administración - Envío Rápido y Seguro";
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsLoggedIn(true);
      fetchUploads(token);
      fetchShipmentData();
    }
  }, [fetchShipmentData, fetchUploads]);

  const handleShipmentChange = (index: number, field: keyof Shipment, value: string) => {
    setShipments(prev => {
      const newShipments = [...prev];
      newShipments[index] = { ...newShipments[index], [field]: value };
      return newShipments;
    });
  };

  const handleSaveShipments = async () => {
    setSavingShipment(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify(shipments)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en la respuesta del servidor');
      }
      
      alert('Todos los datos guardados correctamente');
      
      // Small delay before refresh to ensure filesystem sync
      setTimeout(() => {
        fetchShipmentData();
      }, 300);
    } catch (err: unknown) {
      console.error('Save error:', err);
      alert('Error al guardar los datos: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSavingShipment(false);
    }
  };

  const handleResetShipments = async () => {
    if (!confirm('¿Estás seguro de que quieres restablecer todos los valores por defecto?')) return;
    
    setSavingShipment(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/shipment/reset', {
        method: 'POST',
        headers: {
          'Authorization': token || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        setShipments(data.data);
        alert('Datos restablecidos correctamente');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      console.error(err);
      alert('Error al restablecer los datos');
    } finally {
      setSavingShipment(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('adminToken', 'Bearer ' + data.token);
        setIsLoggedIn(true);
        fetchUploads('Bearer ' + data.token);
        fetchShipmentData();
      } else {
        setError(data.error || 'Contraseña incorrecta');
      }
    } catch (err) {
      console.error("Connection error:", err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteUpload = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comprobante?')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/uploads/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token || ''
        }
      });
      
      if (res.ok) {
        setUploads(prev => prev.filter(u => u.id !== id));
      } else {
        alert('Error al eliminar el comprobante');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full border-t-4 border-[#1e3a6e]">
          <div className="flex justify-center mb-6">
            <div className="bg-[#1e3a6e] p-4 rounded-full">
              <Lock className="text-[#f5c000]" size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-[#1e3a6e] mb-2">Panel de Administración</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">Ingresa tu clave para acceder a los comprobantes</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e] focus:ring-1 focus:ring-[#1e3a6e]"
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#f5c000] text-[#1e3a6e] font-bold py-3 rounded hover:bg-[#e0ad00] transition-colors"
            >
              {loading ? 'Verificando...' : 'Acceder'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4ff] font-sans">
      <header className="bg-[#1e3a6e] text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Lock className="text-[#f5c000]" />
          <h1 className="font-bold text-xl">Admin - Comprobantes Recibidos</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {shipments.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
            <div className="flex border-b mb-6 overflow-x-auto">
              {shipments.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(idx)}
                  className={`px-6 py-3 font-bold text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === idx ? 'border-[#1e3a6e] text-[#1e3a6e]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Envío {idx + 1} ({s.trackingNumber})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="block text-sm font-bold text-[#1e3a6e] mb-2">Estado del Envío (Concepto)</label>
                <select 
                  value={shipments[activeTab].status} 
                  onChange={(e) => handleShipmentChange(activeTab, 'status', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e] font-medium"
                >
                  <option value="pending">PAGO PENDIENTE (Rojo)</option>
                  <option value="validating">Pago en proceso de validación (Azul/Cian)</option>
                  <option value="verified">PAGO VERIFICADO / EN PROCESO DE DESPACHO (Amarillo/Naranja)</option>
                  <option value="transit">En Tránsito (Verde)</option>
                </select>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <label className="block text-sm font-bold text-[#1e3a6e] mb-2">Etiqueta Superior (Badge)</label>
                <div className="flex gap-2 mb-2">
                  <select 
                    value={['RETENIDO', 'EN REVISIÓN', 'DESPACHANDO', 'EN TRÁNSITO'].includes(shipments[activeTab].badge) ? shipments[activeTab].badge : 'custom'} 
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        handleShipmentChange(activeTab, 'badge', e.target.value);
                      }
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e] font-medium"
                  >
                    <option value="RETENIDO">RETENIDO</option>
                    <option value="EN REVISIÓN">EN REVISIÓN</option>
                    <option value="DESPACHANDO">DESPACHANDO</option>
                    <option value="EN TRÁNSITO">EN TRÁNSITO</option>
                    <option value="custom">-- Personalizado --</option>
                  </select>
                </div>
                <input 
                  type="text" 
                  placeholder="Escribe etiqueta personalizada..."
                  value={shipments[activeTab].badge} 
                  onChange={(e) => handleShipmentChange(activeTab, 'badge', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Número de envío</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].trackingNumber} 
                  onChange={(e) => handleShipmentChange(activeTab, 'trackingNumber', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombres & Apellidos</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].name} 
                  onChange={(e) => handleShipmentChange(activeTab, 'name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Código Postal</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].postalCode} 
                  onChange={(e) => handleShipmentChange(activeTab, 'postalCode', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Dirección</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].address} 
                  onChange={(e) => handleShipmentChange(activeTab, 'address', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Contacto</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].contact} 
                  onChange={(e) => handleShipmentChange(activeTab, 'contact', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Paquete Verificado</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].packageVerified} 
                  onChange={(e) => handleShipmentChange(activeTab, 'packageVerified', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Beneficiario</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].beneficiary} 
                  onChange={(e) => handleShipmentChange(activeTab, 'beneficiary', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Concepto</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].concept} 
                  onChange={(e) => handleShipmentChange(activeTab, 'concept', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Etiqueta IBAN (ej. IBAN BANCO (BBVA))</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].ibanLabel} 
                  onChange={(e) => handleShipmentChange(activeTab, 'ibanLabel', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Número IBAN</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].ibanValue} 
                  onChange={(e) => handleShipmentChange(activeTab, 'ibanValue', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Costo servicio de envío seguro</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].shippingCost} 
                  onChange={(e) => handleShipmentChange(activeTab, 'shippingCost', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Costo de Paquete</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].packageCost} 
                  onChange={(e) => handleShipmentChange(activeTab, 'packageCost', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Importe Total</label>
                <input 
                  type="text" 
                  value={shipments[activeTab].totalAmount} 
                  onChange={(e) => handleShipmentChange(activeTab, 'totalAmount', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#1e3a6e]"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleSaveShipments}
                disabled={savingShipment}
                className="bg-[#1e3a6e] text-white px-6 py-2 rounded font-bold hover:bg-[#152a52] transition-colors disabled:opacity-70"
              >
                {savingShipment ? 'Guardando...' : 'Guardar Todos los Cambios'}
              </button>
              <button 
                onClick={handleResetShipments}
                disabled={savingShipment}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded font-bold hover:bg-gray-300 transition-colors disabled:opacity-70"
              >
                Restablecer Valores por Defecto
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6 mt-8">
          <h2 className="text-xl font-bold text-[#1e3a6e] flex items-center gap-2">
            <ImageIcon className="text-[#f5c000]" />
            Comprobantes para: {shipments[activeTab]?.trackingNumber}
          </h2>
          <button 
            onClick={() => fetchUploads(localStorage.getItem('adminToken') || '')}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all ${isRefreshing ? 'bg-gray-200 text-gray-400' : 'bg-[#f5c000] text-[#1e3a6e] hover:bg-[#e0ad00]'}`}
          >
            <div className={isRefreshing ? 'animate-spin' : ''}>
              <Hash size={16} />
            </div>
            {isRefreshing ? 'Actualizando...' : 'Refrescar Comprobantes'}
          </button>
        </div>

        {uploads.filter(u => u.trackingNumber === shipments[activeTab]?.trackingNumber).length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
            <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">No hay comprobantes para este envío.</p>
            <p className="text-xs mt-2">Pide al cliente que suba el comprobante usando el código {shipments[activeTab]?.trackingNumber}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploads
              .filter(u => u.trackingNumber === shipments[activeTab]?.trackingNumber)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((upload) => (
              <div key={upload.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#1e3a6e]">
                    <Hash size={16} className="text-[#f5c000]" />
                    {upload.trackingNumber}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={12} />
                    {new Date(upload.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="p-4 flex justify-center bg-gray-100 h-48">
                  {upload.image.startsWith('data:image') ? (
                    <img src={upload.image} alt="Comprobante" className="max-h-full object-contain cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(upload.image)} />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-xs">Archivo no es imagen</span>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white space-y-2">
                  <a 
                    href={upload.image} 
                    download={`comprobante_${upload.trackingNumber}.png`}
                    className="block w-full text-center bg-[#1e3a6e] text-white py-2 rounded text-sm font-medium hover:bg-[#152a52] transition-colors"
                  >
                    Descargar Comprobante
                  </a>
                  <button 
                    onClick={() => handleDeleteUpload(upload.id)}
                    className="flex items-center justify-center gap-2 w-full text-center bg-red-500 text-white py-2 rounded text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
