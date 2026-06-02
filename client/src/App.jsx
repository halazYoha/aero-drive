import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  SlidersHorizontal,
  Activity,
  Calendar,
  Clock,
  DollarSign,
  Gauge,
  Fuel,
  Eye,
  BookOpen,
  X,
  CheckCircle,
  TrendingUp,
  ShieldCheck,
  Layers,
  Award,
  LogIn,
  UserPlus,
  LogOut,
  User,
  EyeOff
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('showroom');
  const [selectedCar, setSelectedCar] = useState(null);

  // Auth state — loaded from localStorage for persistent sessions
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aerodrive_user')) || null; } catch { return null; }
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('aerodrive_token') || null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ full_name: '', email: '', password: '' });
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [filters, setFilters] = useState({
    make: '',
    body_style: '',
    fuel_type: '',
    max_price: 250000,
    search: ''
  });

  const [downPayment, setDownPayment] = useState(20000);
  const [loanTerm, setLoanTerm] = useState(60);
  const [creditTier, setCreditTier] = useState('excellent'); // excellent (4.5%), good (6.2%), fair (8.5%)

  // Test Drive booking inputs
  const [bookingForm, setBookingForm] = useState({
    name: '',
    email: '',
    date: '',
    timeSlot: 'morning'
  });
  const [bookingMessage, setBookingMessage] = useState(null);

  // Admin Leads Mock/Db bookings
  const [leads, setLeads] = useState([]);

  // Admin Dashboard extra states
  const [consoleTab, setConsoleTab] = useState('leads'); // 'leads' | 'fleet' | 'add_car'
  const [consoleMessage, setConsoleMessage] = useState(null);
  const [newCarForm, setNewCarForm] = useState({
    make: '', model: '', year: '2026', price: '120000', mileage: '10',
    fuel_type: 'Gasoline', transmission: 'Automatic', body_style: 'Coupe',
    image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=800',
    engine: '4.0L Twin-Turbo Flat-6', horsepower: '502', acceleration: '3.2s', top_speed: '296 km/h', drivetrain: 'Rear-Wheel Drive (RWD)'
  });

  // 🏎️ COMPARISON ENGINE STATES
  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // 🚗 ADD CAR FORM LOADING STATE
  const [isSubmittingCar, setIsSubmittingCar] = useState(false);

  // 🎨 VIRTUAL OPTIONS CUSTOMIZER STATES
  const [selectedPaint, setSelectedPaint] = useState('Matte Obsidian Black');
  const [selectedWheels, setSelectedWheels] = useState('20" Aero V-Spoke Alloys');

  // 📄 PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Calculate pagination
  const totalPages = Math.ceil(cars.length / itemsPerPage);
  const paginatedCars = cars.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Helper: Computes configured price based on base MSRP + selected options
  const getConfiguredPrice = (basePrice) => {
    let cost = parseFloat(basePrice);
    if (isNaN(cost)) return 0;

    const paintCosts = {
      'Matte Obsidian Black': 0,
      'Satin Liquid Silver': 3500,
      'Electric Azure Blue': 4200,
      'Crimson Metallic Red': 5000
    };

    const wheelCosts = {
      '20" Aero V-Spoke Alloys': 0,
      '21" Carbon-Forged Monoblocks': 8500,
      '21" Stealth Sport Satin Wheels': 6200
    };

    cost += (paintCosts[selectedPaint] || 0);
    cost += (wheelCosts[selectedWheels] || 0);
    return cost;
  };

  // Fetch cars from Node.js database API when filters change
  useEffect(() => {
    const fetchCars = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filters.make) queryParams.append('make', filters.make);
        if (filters.body_style) queryParams.append('body_style', filters.body_style);
        if (filters.fuel_type) queryParams.append('fuel_type', filters.fuel_type);
        if (filters.max_price) queryParams.append('max_price', filters.max_price);

        const response = await fetch(`${API_BASE}/cars?${queryParams.toString()}`);
        const data = await response.json();

        // Front-end filter for keyword search
        let filteredData = data;
        if (filters.search) {
          const kw = filters.search.toLowerCase();
          filteredData = data.filter(car =>
            car.make.toLowerCase().includes(kw) ||
            car.model.toLowerCase().includes(kw)
          );
        }

        setCars(filteredData);
      } catch (error) {
        console.error('❌ Failed to fetch cars from API:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCars();
  }, [filters]);

  // When a car is selected, fetch full details with spec JOIN
  const handleViewDetails = async (carId) => {
    try {
      const response = await fetch(`${API_BASE}/cars/${carId}`);
      const detailedCar = await response.json();
      setSelectedCar(detailedCar);
      // Pre-set logical default down payment (15% of car price)
      setDownPayment(Math.floor(detailedCar.price * 0.15));
      setSelectedPaint('Matte Obsidian Black');
      setSelectedWheels('20" Aero V-Spoke Alloys');
      setBookingMessage(null);
    } catch (error) {
      console.error('❌ Failed to load car specs:', error);
    }
  };

  // Monthly Loan Compound Payment Math Formula
  const calculateMonthlyPayment = () => {
    if (!selectedCar) return 0;
    const price = getConfiguredPrice(selectedCar.price);
    const principal = price - downPayment;
    if (principal <= 0) return 0;

    // APR rates based on credit scores
    const rates = { excellent: 0.045, good: 0.062, fair: 0.085 };
    const annualRate = rates[creditTier];
    const monthlyRate = annualRate / 12;

    // Formula: P * (r(1+r)^n) / ((1+r)^n - 1)
    const power = Math.pow(1 + monthlyRate, loanTerm);
    const payment = principal * (monthlyRate * power) / (power - 1);

    return isNaN(payment) ? 0 : Math.round(payment);
  };

  // Toggle vehicle inside the comparison list (max 3 items)
  const handleToggleCompare = (car) => {
    setCompareList(prev => {
      const exists = prev.find(c => c.id === car.id);
      if (exists) {
        return prev.filter(c => c.id !== car.id);
      } else {
        if (prev.length >= 3) {
          alert("You can compare up to 3 vehicles at a time.");
          return prev;
        }
        return [...prev, car];
      }
    });
  };

  // Fetch booking leads from database
  const fetchBookings = async () => {
    try {
      const response = await fetch(`${API_BASE}/bookings`);
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // Submit test-drive booking to backend API
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!authUser) {
      setBookingMessage({ type: 'error', text: 'Please sign in to schedule a test drive.' });
      return;
    }
    if (!bookingForm.date) {
      setBookingMessage({ type: 'error', text: 'Please select a date for your test drive.' });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authUser.full_name,
          email: authUser.email,
          car_id: selectedCar.id,
          booking_date: bookingForm.date,
          time_slot: bookingForm.timeSlot
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setBookingMessage({ type: 'error', text: data.error || 'Booking failed.' });
        return;
      }

      setBookingMessage({
        type: 'success',
        text: `Success! Test drive registered for ${bookingForm.date} (${bookingForm.timeSlot}) with your customized configuration (${selectedPaint} & ${selectedWheels}).`
      });
      setBookingForm({ name: '', email: '', date: '', timeSlot: 'morning' });
      fetchBookings();
    } catch (error) {
      setBookingMessage({ type: 'error', text: 'Connection error. Please try again.' });
    }
  };

  // ── ADMIN/FLEET ACTIONS ──────────────────────────────────────────────────
  const handleUpdateBookingStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) fetchBookings();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCar = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/cars/${id}`, { method: 'DELETE' });
      if (response.ok) {
        // Refresh catalog by toggling search state or reload
        setFilters(f => ({ ...f }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCarSubmit = async (e) => {
    e.preventDefault();
    setConsoleMessage(null);
    setIsSubmittingCar(true);
    try {
      const response = await fetch(`${API_BASE}/cars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCarForm)
      });
      const data = await response.json();
      if (response.ok) {
        setConsoleMessage({ type: 'success', text: `✅ ${newCarForm.make} ${newCarForm.model} has been published to the showroom successfully!` });
        setNewCarForm({
          make: '', model: '', year: '2026', price: '120000', mileage: '10',
          fuel_type: 'Gasoline', transmission: 'Automatic', body_style: 'Coupe',
          image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=800',
          engine: '4.0L Twin-Turbo Flat-6', horsepower: '502', acceleration: '3.2s', top_speed: '296 km/h', drivetrain: 'Rear-Wheel Drive (RWD)'
        });
        setFilters(f => ({ ...f }));
        // Auto-dismiss success toast after 6 seconds
        setTimeout(() => setConsoleMessage(null), 6000);
      } else {
        setConsoleMessage({ type: 'error', text: `❌ Failed to add vehicle: ${data.error || 'Server rejected the request.'}` });
        setTimeout(() => setConsoleMessage(null), 8000);
      }
    } catch (err) {
      setConsoleMessage({ type: 'error', text: '❌ Network error — could not reach the server. Is the backend running on port 5000?' });
      setTimeout(() => setConsoleMessage(null), 8000);
    } finally {
      setIsSubmittingCar(false);
    }
  };

  // ── AUTH HANDLERS ──────────────────────────────────────────────────────────

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = authMode === 'login'
      ? { email: authForm.email, password: authForm.password }
      : { full_name: authForm.full_name, email: authForm.email, password: authForm.password };
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Authentication failed.'); return; }
      // Persist session to localStorage
      localStorage.setItem('aerodrive_token', data.token);
      localStorage.setItem('aerodrive_user', JSON.stringify(data.user));
      setAuthToken(data.token);
      setAuthUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ full_name: '', email: '', password: '' });
    } catch {
      setAuthError('Connection error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('aerodrive_token');
    localStorage.removeItem('aerodrive_user');
    setAuthToken(null);
    setAuthUser(null);
    setActiveTab('showroom');
  };

  // Admin-only portal guard
  const openDealerPortal = () => {
    if (!authUser) { setAuthMode('login'); setShowAuthModal(true); }
    else if (authUser.role === 'admin') setActiveTab('dashboard');
  };

  // Client portal — My Account
  const openClientPortal = () => {
    if (!authUser) { setAuthMode('login'); setShowAuthModal(true); }
    else setActiveTab('mybookings');
  };

  return (
    <div className="app-container">

      {/* 🧭 PREMIUM NAVIGATION NAVBAR */}
      <nav style={{
        background: 'rgba(10, 12, 18, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-glass)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '1rem 1rem'
      }}>
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => { setActiveTab('showroom'); setSelectedCar(null); }}>
            <Compass size={28} color="var(--primary-cyan)" style={{ filter: 'drop-shadow(0 0 8px var(--primary-cyan-glow))' }} />
            <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.04em' }}>
              AERO<span className="gradient-text">DRIVE</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => { setActiveTab('showroom'); setSelectedCar(null); }}
              className="btn-secondary"
              style={{
                border: 'none',
                color: activeTab === 'showroom' ? 'var(--primary-cyan)' : 'var(--text-primary)',
                background: 'transparent',
                fontWeight: activeTab === 'showroom' ? '600' : '400'
              }}
            >
              Showroom Fleet
            </button>

            {/* Role-Conditional Portal Buttons */}
            {authUser?.role === 'admin' && (
              <button
                onClick={openDealerPortal}
                className="btn-primary"
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  background: activeTab === 'dashboard' ? 'linear-gradient(135deg, var(--primary-cyan) 0%, var(--secondary-violet) 100%)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#000' : '#fff',
                  border: activeTab === 'dashboard' ? 'none' : '1px solid var(--border-glass)'
                }}
              >
                <Activity size={16} /> Dealer Portal
              </button>
            )}
            {authUser?.role === 'client' && (
              <button
                onClick={openClientPortal}
                className="btn-primary"
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  background: activeTab === 'mybookings' ? 'linear-gradient(135deg, var(--secondary-violet) 0%, var(--primary-cyan) 100%)' : 'transparent',
                  color: activeTab === 'mybookings' ? '#fff' : '#fff',
                  border: activeTab === 'mybookings' ? 'none' : '1px solid var(--border-glass)'
                }}
              >
                <BookOpen size={16} /> My Account
              </button>
            )}

            {/* Auth Buttons */}
            {authUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Role-coded user badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: authUser.role === 'admin' ? 'rgba(0,229,255,0.08)' : 'rgba(124,58,237,0.08)',
                  border: authUser.role === 'admin' ? '1px solid rgba(0,229,255,0.2)' : '1px solid rgba(124,58,237,0.25)',
                  borderRadius: '9999px', padding: '0.3rem 0.85rem', fontSize: '0.82rem'
                }}>
                  <User size={14} color={authUser.role === 'admin' ? 'var(--primary-cyan)' : 'var(--secondary-violet)'} />
                  <span style={{ color: authUser.role === 'admin' ? 'var(--primary-cyan)' : 'var(--secondary-violet)', fontWeight: 600 }}>{authUser.full_name.split(' ')[0]}</span>
                  <span style={{
                    fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700,
                    color: '#fff',
                    background: authUser.role === 'admin' ? 'rgba(0,229,255,0.18)' : 'rgba(124,58,237,0.22)',
                    borderRadius: '9999px', padding: '0.1rem 0.45rem'
                  }}>{authUser.role}</span>
                </div>
                <button onClick={handleLogout} className="btn-secondary"
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} className="btn-secondary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <LogIn size={15} /> Sign In
                </button>
                <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserPlus size={15} /> Register
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 🚀 MAIN CONTENT ENGINE */}
      <main className="main-content">

        {activeTab === 'showroom' ? (
          <>
            {/* HERO LANDING SLIDE */}
            <div style={{
              textAlign: 'center',
              padding: '4rem 1rem',
              background: 'radial-gradient(circle at 50% -20%, rgba(0, 229, 255, 0.15) 0%, transparent 60%)',
              borderRadius: '24px',
              marginBottom: '3rem'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
                padding: '0.35rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                color: 'var(--primary-cyan)',
                marginBottom: '1.5rem'
              }}>
                <Award size={14} /> Next-Generation Premium Dealership
              </div>
              <h1 style={{
                fontSize: 'clamp(2.2rem, 5vw + 1rem, 4rem)',
                lineHeight: 1.1,
                marginBottom: '1rem',
                letterSpacing: '-0.03em'
              }}>
                Engineering Excellence. <br />
                <span className="gradient-text">Uncompromised Luxury.</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2rem', fontSize: '1.1rem' }}>
                Discover our curated collection of hypercars, premium electric sedans, and high-performance SUVs. Connect directly, schedule track trials, and calculate tailored financing options on-the-fly.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <a href="#showroom" className="btn-primary">Browse Inventory</a>
                {authUser?.role === 'admin' && (
                  <button onClick={() => setActiveTab('dashboard')} className="btn-secondary">Dealer Console</button>
                )}
                {authUser?.role === 'client' && (
                  <button onClick={() => setActiveTab('mybookings')} className="btn-secondary">My Bookings</button>
                )}
                {!authUser && (
                  <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="btn-secondary">Join AeroDrive</button>
                )}
              </div>
            </div>

            {/* 🔍 FILTER DRAWER CONTROL PANEL */}
            <div id="showroom" className="glass-card" style={{ marginBottom: '2.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <SlidersHorizontal size={20} color="var(--primary-cyan)" />
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Custom Fleet Filters</span>
              </div>

              {/* Dynamic Filtering inputs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Search Term */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Search Make or Model</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Porsche..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.75rem 0.65rem 2.2rem',
                        color: '#fff',
                        fontFamily: 'var(--font-geom)',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                {/* Make selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Select Manufacturer</label>
                  <select
                    value={filters.make}
                    onChange={(e) => setFilters({ ...filters, make: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.75rem',
                      color: '#fff',
                      fontFamily: 'var(--font-geom)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">All Brands</option>
                    <option value="Porsche">Porsche</option>
                    <option value="Tesla">Tesla</option>
                    <option value="Audi">Audi</option>
                    <option value="BMW">BMW</option>
                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                    <option value="Land Rover">Range Rover</option>
                  </select>
                </div>

                {/* Body style selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Body Style</label>
                  <select
                    value={filters.body_style}
                    onChange={(e) => setFilters({ ...filters, body_style: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.75rem',
                      color: '#fff',
                      fontFamily: 'var(--font-geom)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">All Styles</option>
                    <option value="Coupe">Coupe</option>
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                  </select>
                </div>

                {/* Dynamic Price slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>Max Price</span>
                    <span style={{ color: 'var(--primary-cyan)', fontWeight: 600 }}>${filters.max_price.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="250000"
                    step="5000"
                    value={filters.max_price}
                    onChange={(e) => setFilters({ ...filters, max_price: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      accentColor: 'var(--primary-cyan)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 🚗 VEHICLE GRID CATALOG DISPLAY */}
            {loading ? (
              <div className="showroom-grid">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="glass-card" style={{ height: '380px', animation: 'pulse 1.5s infinite ease-in-out', background: 'rgba(255,255,255,0.02)' }}></div>
                ))}
              </div>
            ) : cars.length > 0 ? (
              <div className="showroom-grid">
                {paginatedCars.map((car) => (
                  <div key={car.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0' }}>

                    {/* Visual Card Header Image */}
                    <div style={{ position: 'relative', overflow: 'hidden', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', height: '220px' }}>
                      <img
                        src={car.image_url}
                        alt={`${car.make} ${car.model}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'var(--transition-smooth)'
                        }}
                        className="car-card-img"
                      />
                      <span className={`badge badge-${car.status}`} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        {car.status}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{car.year} Showroom Stock</span>
                      <h3 style={{ fontSize: '1.25rem', margin: '0.25rem 0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{car.make} <span style={{ fontWeight: 400, color: '#fff' }}>{car.model}</span></span>
                      </h3>

                      {/* Icon metrics */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '10px',
                        padding: '0.65rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: '1.25rem'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <Gauge size={14} color="var(--primary-cyan)" />
                          <span>{car.mileage.toLocaleString()} mi</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <Fuel size={14} color="var(--primary-cyan)" />
                          <span>{car.fuel_type}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <Compass size={14} color="var(--primary-cyan)" />
                          <span style={{ textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{car.transmission.split(' ')[0]}</span>
                        </div>
                      </div>

                      {/* Action Button & Price */}
                      <div style={{
                        marginTop: 'auto',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border-glass)'
                      }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>MSRP Price</span>
                          <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                            ${parseFloat(car.price).toLocaleString()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleToggleCompare(car)}
                            className="btn-secondary"
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.82rem',
                              borderColor: compareList.some(c => c.id === car.id) ? 'var(--primary-cyan)' : 'var(--border-glass)',
                              background: compareList.some(c => c.id === car.id) ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                              color: compareList.some(c => c.id === car.id) ? 'var(--primary-cyan)' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                            title="Add to comparison list"
                          >
                            <Layers size={13} /> {compareList.some(c => c.id === car.id) ? 'Comparing' : 'Compare'}
                          </button>
                          <button
                            onClick={() => handleViewDetails(car.id)}
                            className="btn-primary"
                            style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}
                          >
                            <Eye size={13} /> Specs
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 📄 PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '2rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{
                      padding: '0.5rem 1rem',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        padding: '0.5rem 0.75rem',
                        minWidth: '40px',
                        background: currentPage === page
                          ? 'linear-gradient(135deg, var(--primary-cyan) 0%, var(--secondary-violet) 100%)'
                          : 'transparent',
                        color: currentPage === page ? '#000' : '#fff',
                        border: currentPage === page ? 'none' : '1px solid var(--border-glass)'
                      }}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{
                      padding: '0.5rem 1rem',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            ) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🔍 No Vehicles Match Your Query</span>
                <p style={{ color: 'var(--text-muted)' }}>Try modifying your manufacturer filters or sliding the price limit higher.</p>
                <button onClick={() => setFilters({ make: '', body_style: '', fuel_type: '', max_price: 250000, search: '' })} className="btn-secondary" style={{ marginTop: '1rem' }}>Reset Filters</button>
              </div>
            )}
          </>
        ) : activeTab === 'mybookings' ? (
          /* 👤 CLIENT PERSONAL ACCOUNT PORTAL */
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                  Welcome back, <span className="gradient-text">{authUser?.full_name.split(' ')[0]}</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your personal AeroDrive account — bookings, history, and preferences.</p>
              </div>
              <div style={{
                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: '12px', padding: '0.75rem 1.25rem', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Member Status</div>
                <div style={{ fontWeight: 700, color: 'var(--secondary-violet)', fontSize: '0.9rem' }}>⭐ Premium Client</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(124,58,237,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                  <Calendar size={22} color="var(--secondary-violet)" />
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>My Test Drive Bookings</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {leads.filter(l => l.email === authUser?.email).length}
                  </span>
                </div>
              </div>
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                  <CheckCircle size={22} color="var(--success-emerald)" />
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Approved Sessions</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-emerald)' }}>
                    {leads.filter(l => l.email === authUser?.email && l.status === 'approved').length}
                  </span>
                </div>
              </div>
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(245,158,11,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                  <Clock size={22} color="var(--accent-gold)" />
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Sessions</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    {leads.filter(l => l.email === authUser?.email && l.status === 'pending').length}
                  </span>
                </div>
              </div>
            </div>

            {/* My Bookings List */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="var(--secondary-violet)" /> My Test Drive Schedule
              </h3>
              {leads.filter(l => l.email === authUser?.email).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                  <Calendar size={40} style={{ opacity: 0.25, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                  <p style={{ marginBottom: '1.25rem' }}>You have no test drive sessions booked yet.</p>
                  <button onClick={() => { setActiveTab('showroom'); setSelectedCar(null); }} className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
                    Explore Showroom
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {leads.filter(l => l.email === authUser?.email).map(booking => (
                    <div key={booking.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
                      padding: '1rem 1.25rem', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(124,58,237,0.12)', borderRadius: '10px', padding: '0.6rem' }}>
                          <Calendar size={18} color="var(--secondary-violet)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{booking.car_make} {booking.car_model}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {booking.booking_date} · {booking.time_slot}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: booking.status === 'approved' ? 'rgba(16,185,129,0.12)' : booking.status === 'cancelled' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                        color: booking.status === 'approved' ? 'var(--success-emerald)' : booking.status === 'cancelled' ? 'var(--error-crimson)' : 'var(--accent-gold)',
                        border: `1px solid ${booking.status === 'approved' ? 'rgba(16,185,129,0.25)' : booking.status === 'cancelled' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`
                      }}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Row */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
              <button onClick={() => { setActiveTab('showroom'); }} className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
                Browse Showroom Fleet
              </button>
              <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>

        ) : (
          /* 📊 ADMIN PORTAL / DEALER LEADS INTERACTIVE SCREEN */
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Admin access guard */}
            {authUser?.role !== 'admin' ? (
              <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Access Restricted</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '420px', margin: '0 auto 2rem' }}>
                  The Dealer Console is available to authorized administrator accounts only.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setActiveTab('showroom')} className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>Return to Showroom</button>
                  {authUser && <button onClick={() => setActiveTab('mybookings')} className="btn-secondary" style={{ padding: '0.65rem 1.5rem' }}>My Account</button>}
                </div>
              </div>
            ) : (
            <>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
              <span className="gradient-text">Dealer Console</span> & System Management
            </h2>

            {/* Tab navigation headers */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)' }}>
              {['leads', 'fleet', 'add_car'].map(tab => (
                <button key={tab} onClick={() => { setConsoleTab(tab); setConsoleMessage(null); }} style={{
                  background: 'none', border: 'none', color: consoleTab === tab ? 'var(--primary-cyan)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', paddingBottom: '0.75rem',
                  borderBottom: consoleTab === tab ? '2px solid var(--primary-cyan)' : 'none', transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}>
                  {tab === 'leads' ? 'Active Leads & Analytics' : tab === 'fleet' ? 'Manage Fleet' : 'Add New Vehicle'}
                </button>
              ))}
            </div>

            {consoleTab === 'leads' && (
              <>
                {/* Mini Analytics Widgets */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2.5rem'
                }}>
                  <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                      <TrendingUp size={24} color="var(--primary-cyan)" />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Showroom Stock</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{cars.length} Vehicles</span>
                    </div>
                  </div>

                  <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(124, 58, 237, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                      <BookOpen size={24} color="var(--secondary-violet)" />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Booking Leads</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{leads.length} Contacts</span>
                    </div>
                  </div>

                  <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                      <DollarSign size={24} color="var(--success-emerald)" />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fleet Market Value</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-emerald)' }}>${cars.reduce((sum, c) => sum + parseFloat(c.price || 0), 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2.5rem'
                }}>
                  {/* Monthly Revenue Trend */}
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={16} color="var(--primary-cyan)" /> Monthly Revenue Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={[
                        { month: 'Jan', revenue: 185000 },
                        { month: 'Feb', revenue: 220000 },
                        { month: 'Mar', revenue: 310000 },
                        { month: 'Apr', revenue: 275000 },
                        { month: 'May', revenue: 420000 },
                        { month: 'Jun', revenue: 380000 }
                      ]}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                        <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: '#0d1018', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#00E5FF" fill="url(#revenueGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Inventory by Make */}
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={16} color="var(--secondary-violet)" /> Inventory by Manufacturer
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={[
                        { make: 'Porsche', count: 1, value: 223800 },
                        { make: 'Tesla', count: 1, value: 89990 },
                        { make: 'Audi', count: 1, value: 147500 },
                        { make: 'BMW', count: 1, value: 82200 },
                        { make: 'Mercedes', count: 1, value: 165600 },
                        { make: 'Land Rover', count: 1, value: 118000 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="make" stroke="#94A3B8" fontSize={11} />
                        <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: '#0d1018', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {['#00E5FF', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#6366F1'].map((color, i) => (
                            <Cell key={i} fill={color} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Lead Tracking Table */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Test Drive Lead Requests</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live data from PostgreSQL</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '1rem 1.5rem' }}>Client Name</th>
                          <th style={{ padding: '1rem' }}>Email Address</th>
                          <th style={{ padding: '1rem' }}>Vehicle Model</th>
                          <th style={{ padding: '1rem' }}>Booking Date</th>
                          <th style={{ padding: '1rem' }}>Time Slot</th>
                          <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Status / Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              No booking leads yet. Customers can schedule test drives from the showroom.
                            </td>
                          </tr>
                        ) : leads.map((lead) => (
                          <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }} className="table-row-hover">
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{lead.name}</td>
                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{lead.email}</td>
                            <td style={{ padding: '1rem', color: 'var(--primary-cyan)' }}>{lead.car}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Calendar size={13} /> {lead.booking_date}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Clock size={13} /> {lead.time_slot}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                              {lead.status.toLowerCase() === 'pending' ? (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button onClick={() => handleUpdateBookingStatus(lead.id, 'approved')} className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Approve</button>
                                  <button onClick={() => handleUpdateBookingStatus(lead.id, 'cancelled')} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}>Cancel</button>
                                </div>
                              ) : (
                                <span className={`badge ${lead.status.toLowerCase() === 'approved' ? 'badge-available' : 'badge-sold'}`} style={{ fontSize: '0.7rem' }}>
                                  {lead.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {consoleTab === 'fleet' && (
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Manage Showroom Fleet</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {cars.map(car => (
                    <div key={car.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.01)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src={car.image_url} alt={car.model} style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div>
                          <strong style={{ display: 'block' }}>{car.make} {car.model}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Year: {car.year} | Mileage: {parseInt(car.mileage).toLocaleString()} mi</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <strong style={{ color: 'var(--primary-cyan)' }}>${parseFloat(car.price).toLocaleString()}</strong>
                        <button onClick={() => handleDeleteCar(car.id)} className="btn-secondary" style={{
                          padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444'
                        }}>
                          Delete Listing
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {consoleTab === 'add_car' && (
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>Add a New Showroom Vehicle</h3>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Fill in the details below and publish directly to the live showroom catalog.</p>

                {/* ✅ Rich Toast Notification */}
                {consoleMessage && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    borderRadius: '10px',
                    border: `1px solid ${consoleMessage.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    background: consoleMessage.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.15rem',
                      background: consoleMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                    }}>
                      {consoleMessage.type === 'success' ? '🚗' : '⚠️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.2rem', color: consoleMessage.type === 'success' ? 'var(--success-emerald)' : 'var(--error-crimson)' }}>
                        {consoleMessage.type === 'success' ? 'Vehicle Published Successfully' : 'Failed to Add Vehicle'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {consoleMessage.text}
                      </div>
                      {consoleMessage.type === 'success' && (
                        <button
                          onClick={() => { setActiveTab('showroom'); setSelectedCar(null); }}
                          style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--primary-cyan)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, padding: 0, textDecoration: 'underline' }}
                        >
                          → View in Showroom
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setConsoleMessage(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0', lineHeight: 1, flexShrink: 0 }}
                    >✕</button>
                  </div>
                )}

                <form onSubmit={handleAddCarSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Manufacturer</label>
                    <input type="text" placeholder="e.g. Porsche" required value={newCarForm.make} onChange={e => setNewCarForm({ ...newCarForm, make: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Model</label>
                    <input type="text" placeholder="e.g. Cayman GT4" required value={newCarForm.model} onChange={e => setNewCarForm({ ...newCarForm, model: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Price ($)</label>
                    <input type="number" placeholder="e.g. 115000" required value={newCarForm.price} onChange={e => setNewCarForm({ ...newCarForm, price: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Image URL
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--primary-cyan)', fontWeight: 500 }}>(tip: paste /filename.jpg for local files)</span>
                    </label>
                    <input type="text" required value={newCarForm.image_url} onChange={e => setNewCarForm({ ...newCarForm, image_url: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Year</label>
                    <input type="number" required value={newCarForm.year} onChange={e => setNewCarForm({ ...newCarForm, year: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Mileage (mi)</label>
                    <input type="number" required value={newCarForm.mileage} onChange={e => setNewCarForm({ ...newCarForm, mileage: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Body Style</label>
                    <select value={newCarForm.body_style} onChange={e => setNewCarForm({ ...newCarForm, body_style: e.target.value })} style={{ width: '100%', background: '#08090C', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }}>
                      <option value="Coupe">Coupe</option>
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Convertible">Convertible</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Engine Specs</label>
                    <input type="text" placeholder="4.0L Twin-Turbo Flat-6" value={newCarForm.engine} onChange={e => setNewCarForm({ ...newCarForm, engine: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Horsepower</label>
                    <input type="number" placeholder="502" value={newCarForm.horsepower} onChange={e => setNewCarForm({ ...newCarForm, horsepower: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Acceleration (0-100 km/h)</label>
                    <input type="text" placeholder="3.2s" value={newCarForm.acceleration} onChange={e => setNewCarForm({ ...newCarForm, acceleration: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.6rem', color: '#fff', outline: 'none' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSubmittingCar}
                      style={{
                        width: '100%',
                        padding: '0.85rem',
                        fontSize: '0.95rem',
                        opacity: isSubmittingCar ? 0.7 : 1,
                        cursor: isSubmittingCar ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {isSubmittingCar ? (
                        <>
                          <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                          Publishing...
                        </>
                      ) : (
                        'Publish Showroom Listing'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
            </>
            )}
          </div>
        )}
      </main>

      {/* 🏎️ SPEC DETAIL VIEW & INTERACTIVE MATH CALCULATOR OVERLAY SHEET */}
      {selectedCar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(4, 5, 8, 0.85)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '2rem 1rem'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            position: 'relative',
            background: 'var(--bg-obsidian)',
            border: '1px solid rgba(0, 229, 255, 0.2)'
          }}>
            {/* Close button */}
            <button
              onClick={() => setSelectedCar(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-glass)',
                borderRadius: '50%',
                padding: '0.5rem',
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-fast)'
              }}
              className="btn-secondary"
            >
              <X size={20} />
            </button>

            {/* Header info */}
            <div style={{ marginBottom: '2rem' }}>
              <span className="badge badge-available" style={{ marginBottom: '0.5rem' }}>{selectedCar.year} Series</span>
              <h2 style={{ fontSize: '2.2rem', letterSpacing: '-0.03em', display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                <span>{selectedCar.make}</span>
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{selectedCar.model}</span>
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>Showroom SKU: AD-0{selectedCar.id}93</p>
            </div>

            {/* Grid Split Content */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2.5rem'
            }}>

              {/* Left Column: Visuals & Tech Specifications */}
              <div>
                <img
                  src={selectedCar.image_url}
                  alt={selectedCar.model}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '1px solid var(--border-glass)',
                    marginBottom: '1.5rem'
                  }}
                />

                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Layers size={16} color="var(--primary-cyan)" /> Technical Specifications
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-glass)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Engine Powertrain</span>
                    <span style={{ fontWeight: 500, textAlign: 'right' }}>{selectedCar.engine}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-glass)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Horsepower Output</span>
                    <span style={{ fontWeight: 500, color: 'var(--primary-cyan)' }}>{selectedCar.horsepower} HP</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-glass)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>0 - 100 km/h acceleration</span>
                    <span style={{ fontWeight: 500 }}>{selectedCar.acceleration}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-glass)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Track Top Speed</span>
                    <span style={{ fontWeight: 500 }}>{selectedCar.top_speed}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-glass)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Drivetrain System</span>
                    <span style={{ fontWeight: 500 }}>{selectedCar.drivetrain}</span>
                  </div>
                </div>

                {/* 🎨 OPTIONS CUSTOMIZER */}
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <SlidersHorizontal size={16} color="var(--primary-cyan)" /> Configure Bespoke Options
                  </h3>

                  {/* Paint Finish Selection */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                      Bespoke Paint Finish
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                      {[
                        { name: 'Matte Obsidian Black', price: 0, color: '#0f1115' },
                        { name: 'Satin Liquid Silver', price: 3500, color: '#a1a8b3' },
                        { name: 'Electric Azure Blue', price: 4200, color: '#0070f3' },
                        { name: 'Crimson Metallic Red', price: 5000, color: '#9e0000' }
                      ].map((paint) => (
                        <button
                          key={paint.name}
                          type="button"
                          onClick={() => setSelectedPaint(paint.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: selectedPaint === paint.name ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: selectedPaint === paint.name ? '1px solid var(--primary-cyan)' : '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <span style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: paint.color,
                            border: '1px solid rgba(255,255,255,0.2)',
                            display: 'inline-block',
                            flexShrink: 0
                          }} />
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'block', fontWeight: selectedPaint === paint.name ? 600 : 400 }}>{paint.name.split(' ').slice(1).join(' ')}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {paint.price === 0 ? 'Included' : `+$${paint.price.toLocaleString()}`}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wheels Option Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                      Aero Sport Wheels
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {[
                        { name: '20" Aero V-Spoke Alloys', price: 0 },
                        { name: '21" Carbon-Forged Monoblocks', price: 8500 },
                        { name: '21" Stealth Sport Satin Wheels', price: 6200 }
                      ].map((wheel) => (
                        <button
                          key={wheel.name}
                          type="button"
                          onClick={() => setSelectedWheels(wheel.name)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.6rem 0.85rem',
                            background: selectedWheels === wheel.name ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: selectedWheels === wheel.name ? '1px solid var(--primary-cyan)' : '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <span style={{ fontWeight: selectedWheels === wheel.name ? 600 : 400 }}>{wheel.name}</span>
                          <span style={{ fontSize: '0.75rem', color: selectedWheels === wheel.name ? 'var(--primary-cyan)' : 'var(--text-muted)' }}>
                            {wheel.price === 0 ? 'Included' : `+$${wheel.price.toLocaleString()}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Finance Estimator & Test Drive */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* 📊 INTERACTIVE AUTO PAYMENT ESTIMATOR */}
                <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DollarSign size={16} color="var(--primary-cyan)" /> Live Payment Estimator
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary-cyan)', fontWeight: 700 }}>
                      ${getConfiguredPrice(selectedCar.price).toLocaleString()} Configured
                    </span>
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                    {/* Down Payment Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Down Payment</span>
                        <span style={{ fontWeight: 600 }}>${downPayment.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="5000"
                        max={Math.floor(getConfiguredPrice(selectedCar.price) * 0.5)}
                        step="1000"
                        value={downPayment}
                        onChange={(e) => setDownPayment(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary-cyan)' }}
                      />
                    </div>

                    {/* Loan Term and Credit tier selector */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Loan Length</label>
                        <select
                          value={loanTerm}
                          onChange={(e) => setLoanTerm(parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '6px',
                            padding: '0.4rem',
                            color: '#fff',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="36">36 Months</option>
                          <option value="48">48 Months</option>
                          <option value="60">60 Months</option>
                          <option value="72">72 Months</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Credit Score Tier</label>
                        <select
                          value={creditTier}
                          onChange={(e) => setCreditTier(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '6px',
                            padding: '0.4rem',
                            color: '#fff',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="excellent">Excellent (4.5% APR)</option>
                          <option value="good">Good (6.2% APR)</option>
                          <option value="fair">Fair (8.5% APR)</option>
                        </select>
                      </div>
                    </div>

                    {/* Math Output Panel */}
                    <div style={{
                      background: 'rgba(0, 229, 255, 0.05)',
                      border: '1px solid rgba(0, 229, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.5rem'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Estimated payment</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                          ${calculateMonthlyPayment()}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', maxWidth: '100px', lineHeight: '1.2' }}>
                        Excludes local taxes and dealer fees.
                      </span>
                    </div>

                  </div>
                </div>

                {/* 📅 TEST DRIVE SCHEDULER */}
                <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="var(--primary-cyan)" /> Schedule Test Drive
                  </h3>

                  <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Your Name"
                        required
                        value={authUser ? authUser.full_name : bookingForm.name}
                        onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                        disabled={!!authUser}
                        style={{
                          background: authUser ? 'rgba(124,58,237,0.1)' : 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          color: '#fff',
                          opacity: authUser ? 0.7 : 1
                        }}
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={authUser ? authUser.email : bookingForm.email}
                        onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                        disabled={!!authUser}
                        style={{
                          background: authUser ? 'rgba(124,58,237,0.1)' : 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          color: '#fff',
                          opacity: authUser ? 0.7 : 1
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input
                        type="date"
                        required
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '6px',
                          padding: '0.4rem',
                          color: '#fff'
                        }}
                      />
                      <select
                        value={bookingForm.timeSlot}
                        onChange={(e) => setBookingForm({ ...bookingForm, timeSlot: e.target.value })}
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '6px',
                          padding: '0.4rem',
                          color: '#fff'
                        }}
                      >
                        <option value="morning">Morning (9AM - 12PM)</option>
                        <option value="afternoon">Afternoon (1PM - 5PM)</option>
                      </select>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                      Book Session
                    </button>
                  </form>

                  {bookingMessage && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: bookingMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: bookingMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                      color: bookingMessage.type === 'success' ? 'var(--success-emerald)' : 'var(--error-crimson)'
                    }}>
                      <CheckCircle size={14} />
                      <span>{bookingMessage.text}</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* 🔐 AUTH MODAL OVERLAY */}
      {showAuthModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(4,5,8,0.88)', backdropFilter: 'blur(18px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: '440px', padding: '2.5rem',
            background: '#0d1018', border: '1px solid rgba(0,229,255,0.18)',
            position: 'relative'
          }}>
            {/* Close */}
            <button onClick={() => { setShowAuthModal(false); setAuthError(null); }}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <Compass size={32} color="var(--primary-cyan)" style={{ filter: 'drop-shadow(0 0 10px var(--primary-cyan-glow))' }} />
              </div>
              <h2 style={{ fontSize: '1.6rem', letterSpacing: '-0.03em', marginBottom: '0.35rem' }}>
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                {authMode === 'login'
                  ? 'Sign in to access the AeroDrive Dealer Portal.'
                  : 'Register a new account to get started.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Full Name</label>
                  <input type="text" placeholder="Enter your full name" required
                    value={authForm.full_name}
                    onChange={e => setAuthForm({ ...authForm, full_name: e.target.value })}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-glass)', borderRadius: '8px',
                      padding: '0.7rem 1rem', color: '#fff', fontSize: '0.9rem',
                      fontFamily: 'var(--font-geom)', outline: 'none'
                    }}/>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Email Address</label>
                <input type="email" placeholder="Enter your email address" required
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-glass)', borderRadius: '8px',
                    padding: '0.7rem 1rem', color: '#fff', fontSize: '0.9rem',
                    fontFamily: 'var(--font-geom)', outline: 'none'
                  }}/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" required
                    value={authForm.password}
                    onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-glass)', borderRadius: '8px',
                      padding: '0.7rem 2.8rem 0.7rem 1rem', color: '#fff', fontSize: '0.9rem',
                      fontFamily: 'var(--font-geom)', outline: 'none'
                    }}/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      padding: '0.2rem', display: 'flex', alignItems: 'center'
                    }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {authError && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '8px', padding: '0.65rem 1rem', fontSize: '0.83rem',
                  color: 'var(--error-crimson)', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}>
                  <X size={14} /> {authError}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={authLoading}
                style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem',
                  opacity: authLoading ? 0.7 : 1, marginTop: '0.25rem' }}>
                {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Sign In to Portal' : 'Create Account')}
              </button>
            </form>

            {/* Mode Toggle */}
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-cyan)', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.85rem' }}>
                {authMode === 'login' ? 'Register here' : 'Sign in instead'}
              </button>
            </p>

            {/* Demo hint */}
            <div style={{
              marginTop: '1.25rem', padding: '0.75rem', borderRadius: '8px',
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)',
              fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6
            }}>
              <strong style={{ color: 'var(--secondary-violet)' }}>Demo Admin Account:</strong><br />
              admin@aerodrive.com · password: admin123
            </div>
          </div>
        </div>
      )}

      {/* 🚀 FOOTER */}
      <footer style={{
        background: 'rgba(5, 6, 8, 0.95)',
        borderTop: '1px solid var(--border-glass)',
        padding: '2.5rem 2rem',
        marginTop: 'auto',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          mdDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div>
            <span style={{ fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>AERO<span style={{ color: 'var(--primary-cyan)' }}>DRIVE</span></span>
            <span> — High Performance Automotive Showcase Portfolio Project. Built with React & PostgreSQL.</span>
          </div>
          <div>
            <span>© 2026 AeroDrive Corporation. Created by Halaz.</span>
          </div>
        </div>
      </footer>

      {/* 🏎️ FLOATING COMPARE BAR */}
      {compareList.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 90,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--primary-cyan)',
          boxShadow: '0 8px 32px rgba(0, 229, 255, 0.25)',
          borderRadius: '14px',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--primary-cyan)" style={{ filter: 'drop-shadow(0 0 5px var(--primary-cyan-glow))' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Compare Fleet ({compareList.length}/3)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowCompareModal(true)}
              className="btn-primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px' }}
            >
              Compare Side-by-Side
            </button>
            <button
              onClick={() => setCompareList([])}
              className="btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: '8px', color: 'var(--text-muted)', border: 'none', background: 'transparent' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 🏎️ VEHICLE COMPARISON MODAL OVERLAY */}
      {showCompareModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(4, 5, 8, 0.88)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 210,
          padding: '2rem 1rem'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            position: 'relative',
            background: 'var(--bg-obsidian)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            {/* Close */}
            <button
              onClick={() => setShowCompareModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-glass)',
                borderRadius: '50%',
                padding: '0.5rem',
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="btn-secondary"
            >
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layers color="var(--primary-cyan)" size={24} /> Side-by-Side Fleet Comparison
            </h2>

            {compareList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <p>No vehicles selected for comparison. Add cars from the showroom catalog.</p>
                <button onClick={() => setShowCompareModal(false)} className="btn-primary" style={{ marginTop: '1.25rem', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                  Return to Showroom
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compareList.length}, 1fr)`, gap: '1.5rem', marginTop: '1rem' }}>
                {compareList.map(car => (
                  <div key={car.id} className="glass-card" style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    {/* Delete button from compare list */}
                    <button
                      onClick={() => handleToggleCompare(car)}
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '50%',
                        padding: '0.35rem',
                        cursor: 'pointer',
                        color: 'var(--error-crimson)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                      }}
                      title="Remove from comparison"
                    >
                      <X size={12} />
                    </button>

                    {/* Image and basic info */}
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <img
                        src={car.image_url}
                        alt={car.model}
                        style={{
                          width: '100%',
                          height: '140px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid var(--border-glass)',
                          marginBottom: '0.85rem'
                        }}
                      />
                      <span className="badge badge-available" style={{ fontSize: '0.65rem', marginBottom: '0.35rem' }}>
                        {car.year} Model
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.15rem 0' }}>
                        {car.make}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        {car.model}
                      </p>
                      <strong style={{ fontSize: '1.3rem', color: 'var(--primary-cyan)' }}>
                        ${parseFloat(car.price).toLocaleString()}
                      </strong>
                    </div>

                    {/* Specifications list comparison */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                      fontSize: '0.8rem',
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '1rem',
                      marginBottom: '1.25rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Body Style</span>
                        <span style={{ fontWeight: 500 }}>{car.body_style}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Transmission</span>
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={car.transmission}>
                          {car.transmission}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Fuel Type</span>
                        <span style={{ fontWeight: 500 }}>{car.fuel_type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Mileage</span>
                        <span style={{ fontWeight: 500 }}>{car.mileage.toLocaleString()} mi</span>
                      </div>

                      {/* Specifications table properties from JOIN */}
                      <div style={{ borderTop: '1px dotted var(--border-glass)', marginTop: '0.4rem', paddingTop: '0.4rem' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Engine</span>
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={car.engine || 'Standard Setup'}>
                          {car.engine || 'Standard Setup'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Horsepower</span>
                        <span style={{ fontWeight: 500, color: 'var(--primary-cyan)' }}>
                          {car.horsepower ? `${car.horsepower} HP` : 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Acceleration</span>
                        <span style={{ fontWeight: 500 }}>
                          {car.acceleration || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Top Speed</span>
                        <span style={{ fontWeight: 500 }}>
                          {car.top_speed || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Drivetrain</span>
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                          {car.drivetrain || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowCompareModal(false);
                        handleViewDetails(car.id);
                      }}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.5rem', fontSize: '0.8rem' }}
                    >
                      Configure & Book
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
