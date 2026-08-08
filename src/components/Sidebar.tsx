import React from 'react';
import { 
  Satellite, 
  LayoutDashboard, 
  TrendingUp, 
  Sprout, 
  GraduationCap, 
  Settings, 
  HelpCircle, 
  LogOut,
  Map as MapIcon,
  Bell,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  activeField: { name: string; crop: string } | null;
  onLogout?: () => void;
}

export default function Sidebar({ currentView, onViewChange, activeField, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'map', label: 'Interactive Map', icon: MapIcon },
    { id: 'dashboard', label: 'Deep-Dive Analytics', icon: LayoutDashboard },
    { id: 'fields', label: 'Field Management', icon: Sprout },
    { id: 'learning', label: 'Learning Academy', icon: GraduationCap },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#F5F5F0]/90 backdrop-blur-md border-b border-black/10">
        <div className="flex items-center gap-4">
          <span 
            className="font-serif text-2xl font-bold text-[#1A1A1A] tracking-tight cursor-pointer"
            onClick={() => onViewChange('map')}
          >
            FarmHealth
          </span>
          <div className="hidden md:flex items-center bg-white/60 rounded-full px-3 py-1 gap-2 border border-black/10">
            <Satellite className="text-[#2A4B35] w-4 h-4 animate-pulse" />
            <span className="font-mono text-[10px] text-black/70 tracking-wider uppercase font-semibold">Sentinel-2 LIVE</span>
          </div>
        </div>

        {/* Top bar icons / Profile */}
        <div className="flex items-center gap-4">
          <button className="text-black/60 hover:text-[#1A1A1A] transition-colors p-1.5 rounded-full hover:bg-black/5 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#d9534f] rounded-full"></span>
          </button>
          
          <div className="flex items-center gap-2.5 px-3 py-1 bg-white border border-black/10 rounded-full">
            <GraduationCap className="text-[#2A4B35] w-4 h-4" />
            <span className="font-mono text-[10px] text-black/80 font-semibold">Level 4</span>
          </div>

          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#2A4B35]/30">
            <img 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC84_EyOBhMw2PZKuXZvK_UUqn53yGq3lINMoThkByrB-FOrIcEyOgTlojB0H6qr-xojkkBjpUkUIgdvJSJ9tAh9IgAuXu8t0MlXovXbNh8JpxJoTS8rQRhoRLKthYIUZ7uPbWgCztTjlCk1TzkDx_wHuqY-AOq7IE_J-rd7HHQgXWS5guOr4Esy8Ce0m-u7Y9a7TQSdQQHu9trAWecJBcor9a0VXi3D1Ifku5ya55Vyu1l6GM7DRdtroLRXaT70LLpE_Ny6jS11eZT" 
              alt="Agronomist profile"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* Desktop Sidebar Panel */}
      <aside className="hidden md:flex flex-col h-screen w-80 fixed left-0 top-0 pt-16 bg-[#EAEAE2] border-r border-black/10 py-6 px-4 z-40">
        {/* Active Field Badge */}
        {activeField && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-white border border-black/5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center">
              <Sprout className="text-[#2A4B35] w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] text-[#2A4B35] uppercase tracking-wider font-bold">Active Sector</p>
              <p className="text-sm text-[#1A1A1A] font-semibold truncate">{activeField.name}</p>
              <p className="text-xs text-black/60 truncate">{activeField.crop}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-all rounded-xl text-left border ${
                  isActive 
                    ? 'bg-white text-[#1A1A1A] border-black/10 shadow-sm font-semibold' 
                    : 'text-black/60 hover:bg-white/50 hover:text-black border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#2A4B35]' : 'text-black/50'}`} />
                <span className="font-mono text-xs uppercase tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="mt-auto border-t border-black/10 pt-4 space-y-1">
          <button 
            onClick={() => onViewChange('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-xs uppercase tracking-wider font-mono cursor-pointer transition-colors ${
              currentView === 'settings' ? 'text-[#2A4B35] font-semibold bg-white' : 'text-black/60 hover:text-black'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          
          <button 
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-xs uppercase tracking-wider font-mono text-black/60 hover:text-black cursor-pointer transition-colors"
            onClick={() => alert('Support module is active. Support ticket opened for help.')}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Support</span>
          </button>

          <button 
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-xs uppercase tracking-wider font-mono text-red-700 hover:text-red-800 cursor-pointer transition-colors"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#EAEAE2] border-t border-black/10 flex justify-around items-center h-16 z-50 px-2 pb-safe">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                isActive ? 'text-[#2A4B35] font-bold' : 'text-black/60'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span>{item.id === 'dashboard' ? 'Analytics' : item.id === 'learning' ? 'Academy' : item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => onViewChange('settings')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-mono uppercase tracking-wider transition-colors ${
            currentView === 'settings' ? 'text-[#2A4B35] font-bold' : 'text-black/60'
          }`}
        >
          <Settings className="w-5 h-5 mb-1" />
          <span>Config</span>
        </button>
      </nav>
    </>
  );
}

