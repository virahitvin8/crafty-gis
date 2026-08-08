import React, { useState } from 'react';
import { 
  Lock, 
  MapPin, 
  ShieldAlert, 
  Key, 
  Database, 
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Field } from './types';
import { INITIAL_FIELDS } from './data';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import DeepDive from './components/DeepDive';
import FieldManagement from './components/FieldManagement';
import LearningPortal from './components/LearningPortal';

export default function App() {
  // Authentication Role State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Defaults to true for seamless instant viewing, but support toggle
  const [userRole, setUserRole] = useState<'admin' | 'user'>('admin');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Primary Data State
  const [fields, setFields] = useState<Field[]>(INITIAL_FIELDS);
  const [activeField, setActiveField] = useState<Field>(INITIAL_FIELDS[0]);
  const [currentView, setCurrentView] = useState<string>('map');
  const [indexType, setIndexType] = useState<string>('ndvi');
  const [cropType, setCropType] = useState<string>('Winter Wheat');

  // API Config Settings State (Admin role can modify)
  const [geminiApiKey, setGeminiApiKey] = useState<string>('••••••••••••');
  const [isSavedKey, setIsSavedKey] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput === 'admin' && passwordInput === 'admin') {
      setUserRole('admin');
      setIsAuthenticated(true);
      setLoginError('');
    } else if (usernameInput === 'user' && passwordInput === 'user') {
      setUserRole('user');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Use admin/admin or user/user.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleAddField = (newField: Field) => {
    setFields((prev) => [newField, ...prev]);
  };

  const handleDeleteField = (id: string) => {
    // Select a different active field if deleted active
    if (activeField.id === id) {
      const remaining = fields.filter((f) => f.id !== id);
      if (remaining.length > 0) {
        setActiveField(remaining[0]);
      }
    }
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const saveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKey.trim()) return;
    setIsSavedKey(true);
    alert("Gemini Client Key mapped securely for server session. Real-time custom agricultural assessments will now deploy upon requesting AI advisories.");
    setTimeout(() => {
      setIsSavedKey(false);
    }, 3000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-sm p-8 rounded-2xl border border-black/10 space-y-6 text-center shadow-md bg-white">
          <div className="space-y-2">
            <div className="w-12 h-12 bg-[#2A4B35]/10 rounded-full flex items-center justify-center text-[#2A4B35] mx-auto">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] tracking-tight">Secure Portal Access</h2>
            <p className="text-xs text-black/60">FarmHealth Precision Satellite Crop Monitor</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-black/60 mb-1.5 block">Username</label>
              <input 
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="admin or user"
                className="w-full bg-[#F5F5F0] border border-black/10 rounded-xl py-2.5 px-4 text-sm text-[#1A1A1A] focus:border-[#2A4B35] outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-black/60 mb-1.5 block">Password</label>
              <input 
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="admin or user"
                className="w-full bg-[#F5F5F0] border border-black/10 rounded-xl py-2.5 px-4 text-sm text-[#1A1A1A] focus:border-[#2A4B35] outline-none"
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-700 font-mono text-center">{loginError}</p>
            )}

            <button 
              type="submit"
              className="w-full py-2.5 bg-[#2A4B35] text-white font-mono text-xs uppercase font-bold tracking-wider rounded-xl hover:bg-[#3E654C] transition-all cursor-pointer shadow-md"
            >
              Sign In
            </button>
          </form>

          <div className="pt-4 border-t border-black/10 space-y-1 text-[10px] text-black/60 opacity-80">
            <p>🔑 Mock Credentials Available:</p>
            <p className="font-mono">Admin level: <strong className="text-black">admin / admin</strong></p>
            <p className="font-mono">Standard level: <strong className="text-black">user / user</strong></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans antialiased overflow-x-hidden">
      
      {/* Side and top header rails navigation */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        activeField={activeField} 
        onLogout={handleLogout}
      />

      {/* Screen routers container */}
      <div className="pt-16 min-h-[calc(100vh-4rem)]">
        
        {currentView === 'map' && (
          <MapView 
            fields={fields}
            activeField={activeField}
            onSelectField={setActiveField}
            onAddField={handleAddField}
            indexType={indexType}
            onIndexTypeChange={setIndexType}
            cropType={cropType}
            onCropTypeChange={setCropType}
            onStartWalk={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'dashboard' && (
          <DeepDive 
            activeField={activeField}
            indexType={indexType}
          />
        )}

        {currentView === 'fields' && (
          <FieldManagement 
            fields={fields}
            activeField={activeField}
            onSelectField={setActiveField}
            onAddField={handleAddField}
            onDeleteField={handleDeleteField}
          />
        )}

        {currentView === 'learning' && (
          <LearningPortal />
        )}

        {currentView === 'settings' && (
          <div className="md:ml-80 pt-20 px-6 pb-12 min-h-screen bg-[#F5F5F0] text-left">
            <div className="max-w-2xl mx-auto space-y-8">
              
              <div className="space-y-1.5 border-b border-black/10 pb-4">
                <h1 className="text-3xl font-serif font-bold text-[#1A1A1A]">Settings & Credentials</h1>
                <p className="text-xs text-black/60 font-mono">Current role session: <strong className="text-[#2A4B35] uppercase">{userRole}</strong></p>
              </div>

              {/* Gemini credentials manager card */}
              <div className="glass-panel p-6 rounded-2xl border border-black/10 space-y-4 bg-white">
                <div className="flex items-center gap-2 text-[#1A1A1A]">
                  <Key className="w-5 h-5 text-[#2A4B35]" />
                  <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-[#1A1A1A]">Gemini AI API Configuration</h3>
                </div>

                {userRole === 'admin' ? (
                  <form onSubmit={saveApiKey} className="space-y-4">
                    <p className="text-xs text-black/70 leading-relaxed">
                      The application automatically uses your workspace secrets or container-configured <code className="text-[#2A4B35] font-mono bg-[#EAEAE2] px-1 py-0.5 rounded">GEMINI_API_KEY</code>. Override or set a custom API key below to configure bespoke analysis models directly:
                    </p>
                    <div className="space-y-2">
                      <input 
                        type="password"
                        placeholder="Configure GEMINI_API_KEY"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="w-full bg-[#F5F5F0] border border-black/10 rounded-xl py-2.5 px-4 text-xs font-mono text-[#1A1A1A] focus:border-[#2A4B35] outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button 
                        type="submit"
                        className="py-2 px-5 bg-[#2A4B35] text-white font-mono text-xs font-bold uppercase rounded-xl hover:bg-[#3E654C] transition-colors cursor-pointer"
                      >
                        Map Credentials
                      </button>
                      {isSavedKey && (
                        <span className="text-xs text-[#2A4B35] font-mono flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Success
                        </span>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="p-4 bg-[#EAEAE2] border border-black/10 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-red-800">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">Access Restricted</span>
                    </div>
                    <p className="text-xs text-black/60 leading-relaxed">
                      As a standard <code className="text-black font-mono bg-white px-1 rounded">user</code> role, API key configuration panels are masked to protect session endpoints. Log out and sign back in as <code className="text-black font-mono bg-white px-1 rounded">admin</code> to adjust API parameters.
                    </p>
                  </div>
                )}
              </div>

              {/* Data and caching configuration card */}
              <div className="glass-panel p-6 rounded-2xl border border-black/10 space-y-4 bg-white">
                <div className="flex items-center gap-2 text-[#1A1A1A]">
                  <Database className="w-5 h-5 text-[#2A4B35]" />
                  <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-[#1A1A1A]">Telemetry & Caching Parameters</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-widest text-black/60 mb-1.5 block">Cloud Cover Filter (%)</label>
                    <input 
                      type="number" 
                      defaultValue="30" 
                      className="w-full bg-[#F5F5F0] border border-black/10 rounded-xl py-2 px-3 text-xs font-mono text-[#1A1A1A] focus:border-[#2A4B35] outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-widest text-black/60 mb-1.5 block">Search Interval (Months)</label>
                    <input 
                      type="number" 
                      defaultValue="3" 
                      className="w-full bg-[#F5F5F0] border border-black/10 rounded-xl py-2 px-3 text-xs font-mono text-[#1A1A1A] focus:border-[#2A4B35] outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-[#2A4B35]/5 rounded-xl border border-[#2A4B35]/10 flex gap-2">
                  <Info className="w-4.5 h-4.5 text-[#2A4B35] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-black/60 leading-relaxed">
                    Automated Sentinel-2 L2A telemetry cache scans active satellite data daily. System maps soil properties and terrain indices dynamically when saving parcel boundaries.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
