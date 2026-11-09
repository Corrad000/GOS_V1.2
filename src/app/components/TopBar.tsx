'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TopBar() {
  const [userName] = useState('Corrado Pinna');
  const [userRole] = useState<'Administrator' | 'Network Partner' | 'Senior Advisor' | 'Junior Advisor'>('Administrator');
  const [loginTime] = useState('09:15:20');
  const [sessionDuration, setSessionDuration] = useState('00:42:15');
  
  const [logoText, setLogoText] = useState('GOS 1.2');
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [tempLogo, setTempLogo] = useState('GOS 1.2');

  const isAdmin = userRole === 'Administrator';

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(prev => {
        const parts = prev.split(':').map(Number);
        let s = parts[2] + 1;
        let m = parts[1];
        let h = parts[0];
        if (s >= 60) { s = 0; m++; }
        if (m >= 60) { m = 0; h++; }
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveLogo = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && tempLogo.trim()) {
      setLogoText(tempLogo.trim());
      setIsEditingLogo(false);
    }
  };

  const roleBadgeColors = {
    'Administrator': 'bg-red-950 text-red-400 border-red-800',
    'Network Partner': 'bg-amber-950 text-amber-400 border-amber-800',
    'Senior Advisor': 'bg-emerald-950 text-emerald-400 border-emerald-800',
    'Junior Advisor': 'bg-blue-950 text-blue-400 border-blue-800',
  };

  return (
    <header className="bg-gray-950 border-b border-gray-800 text-gray-200 px-6 py-3.5 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* LOGO A SINISTRA */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center font-mono font-black text-white shadow-lg group-hover:bg-amber-500 transition-all">
              G
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-wider text-white uppercase block font-mono">
                {logoText}
              </span>
              <span className="text-[9px] text-amber-500 font-mono tracking-widest block uppercase">
                Glaring LLP Infrastructure
              </span>
            </div>
          </Link>

          {isAdmin && (
            <button
              onClick={() => setIsEditingLogo(!isEditingLogo)}
              className="text-[10px] text-gray-500 hover:text-amber-400 font-mono border border-gray-800 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              ⚙️ {isEditingLogo ? 'Chiudi' : 'Modifica Logo'}
            </button>
          )}

          {isEditingLogo && isAdmin && (
            <form onSubmit={handleSaveLogo} className="flex items-center gap-2 bg-gray-900 p-1.5 rounded-xl border border-amber-500/50">
              <input
                type="text"
                value={tempLogo}
                onChange={e => setTempLogo(e.target.value)}
                className="bg-gray-950 text-xs px-2 py-1 rounded text-white font-mono w-24 focus:outline-none"
                placeholder="Nuovo Nome"
                required
              />
              <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                Salva
              </button>
            </form>
          )}
        </div>

        {/* INFO UTENTE E SESSIONE */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-800 px-3 py-1.5 rounded-xl">
            <span className="font-bold text-white">{userName}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${roleBadgeColors[userRole]}`}>
              {userRole}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-gray-400 bg-gray-900/50 border border-gray-800/80 px-3 py-1.5 rounded-xl text-[11px]">
            <span>📅 {new Date().toLocaleDateString('it-IT')}</span>
            <span>⏰ Login: {loginTime}</span>
            <span className="text-amber-400 font-bold">⏳ Durata: {sessionDuration}</span>
          </div>

          <div className="flex items-center gap-2 border-l border-gray-800 pl-4">
            <button
              onClick={() => alert('Apertura pannello Edit Profile')}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Edit Profile
            </button>
            <button
              onClick={() => {
                if (confirm('Vuoi effettuare il logout dal sistema GOS?')) {
                  window.location.href = '/login';
                }
              }}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-900/60 text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Log-out
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
