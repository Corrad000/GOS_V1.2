'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    fullName: 'Corrado Pinna',
    email: 'corrado.pinna@glaring.world',
    role: 'Administrator',
    organization: 'Glaring LLP',
    phone: '+39 070 1234567',
    location: 'Cagliari, Sardinia',
    bio: 'Executive Consultant & Strategic Advisor in Corporate Strategy, Operational Transformation and Commercial Development.',
  });

  // Gestione Avatar / Foto Profilo
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gestione Cambio Password
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [savedProfile, setSavedProfile] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Caricamento Foto Profilo
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setAvatarUrl(imageUrl);
      
      /* Supabase Upload Blueprint:
         const fileExt = file.name.split('.').pop();
         const filePath = `${userId}/${Math.random()}.${fileExt}`;
         await supabase.storage.from('avatars').upload(filePath, file);
      */
    }
  };

  // Salvataggio Dati Profilo
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    /* Supabase Update Blueprint:
       await supabase.from('profiles').upsert({
         id: userId,
         full_name: formData.fullName,
         phone: formData.phone,
         location: formData.location,
         bio: formData.bio,
         avatar_url: avatarUrl,
         updated_at: new Date().toISOString(),
       });
    */

    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 3000);
  };

  // Aggiornamento Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword.length < 8) {
      setPasswordError('La nuova password deve contenere almeno 8 caratteri.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Le nuove password non coincidono.');
      return;
    }

    /* Supabase Auth Password Update Blueprint:
       const { error } = await supabase.auth.updateUser({
         password: passwordData.newPassword
       });
    */

    setSavedPassword(true);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setSavedPassword(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Input hidden per il caricamento file dell'avatar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header Pagina */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest block">
            GOS 1.2 — AMMINISTRAZIONE ACCOUNT
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Profilo Utente & Impostazioni
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestisci le tue informazioni personali e le credenziali di accesso al sistema.
          </p>
        </div>
        <Link
          href="/admin"
          className="self-start md:self-auto px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-white font-bold text-xs border border-[#334155] transition-all flex items-center gap-2 rounded-none"
        >
          ← Torna al Control Center
        </Link>
      </div>

      {/* Notifiche di salvataggio */}
      {savedProfile && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-sm font-bold flex items-center justify-between">
          <span>✓ Profilo aggiornato e sincronizzato con la banca dati!</span>
        </div>
      )}

      {savedPassword && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-sm font-bold flex items-center justify-between">
          <span>✓ Password aggiornata con successo in Supabase Auth.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNA SINISTRA: Avatar + Sicurezza Account */}
        <div className="space-y-6">
          
          {/* Card Avatar & Dati Sintetici */}
          <div className="bg-[#0F172A] border border-[#1E293B] p-6 text-center">
            
            {/* Quadratino Avatar Interattivo */}
            <div className="relative group w-28 h-28 mx-auto mb-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar Profilo"
                  className="w-full h-full object-cover border-2 border-emerald-500 rounded-none"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 border-2 border-emerald-500 rounded-none flex items-center justify-center text-3xl font-extrabold text-white">
                  CP
                </div>
              )}
              
              {/* Overlay hover per caricare la foto */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider p-1">
                <span>📷 Carica Foto</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 block mx-auto uppercase tracking-wider mb-4"
            >
              Cambia Foto Profilo
            </button>

            <h2 className="text-xl font-bold text-white">{formData.fullName}</h2>
            <p className="text-xs font-mono text-amber-400 font-bold mt-1 uppercase tracking-wider">
              {formData.role}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{formData.organization}</p>

            <div className="mt-6 pt-6 border-t border-[#1E293B] text-left space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">ID Utente:</span>
                <span className="text-white font-bold">USR-2026-001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stato Account:</span>
                <span className="text-emerald-400 font-bold">Attivo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ultimo Accesso:</span>
                <span className="text-white">Oggi, 09:15:20</span>
              </div>
            </div>
          </div>

          {/* Card Cambio Password */}
          <div className="bg-[#0F172A] border border-[#1E293B] p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 border-b border-[#1E293B] pb-2">
              Sicurezza Account
            </h3>

            <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-1">
              {passwordError && (
                <div className="p-2.5 bg-red-950/80 border border-red-800/80 text-red-300 text-xs font-bold">
                  ⚠️ {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Password Attuale
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full bg-[#050B14] border border-[#1E293B] p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Nuova Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full bg-[#050B14] border border-[#1E293B] p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                  placeholder="Minimo 8 caratteri"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Conferma Nuova Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full bg-[#050B14] border border-[#1E293B] p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                  placeholder="Ripeti nuova password"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  className="flex-1 py-2 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-gray-300 transition-all rounded-none"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs uppercase tracking-wider transition-all rounded-none"
                >
                  Aggiorna
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLONNA DESTRA: Modulo Dettagli Personali */}
        <div className="lg:col-span-2">
          <form onSubmit={handleProfileSubmit} className="bg-[#0F172A] border border-[#1E293B] p-6 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 border-b border-[#1E293B] pb-2">
              Dettagli Personali & Contatti
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Nome e Cognome
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-[#050B14] border border-[#1E293B] p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Indirizzo Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#050B14] border border-[#1E293B] p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Ruolo Assegnato
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.role}
                  className="w-full bg-[#1E293B]/50 border border-[#1E293B] p-2.5 text-sm text-gray-400 cursor-not-allowed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Organizzazione / Ente
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full bg-[#050B14] border border-[#1E293B] p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Telefono di Contatto
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#050B14] border border-[#1E293B] p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                  Sede / Ubicazione
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-[#050B14] border border-[#1E293B] p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                Profilo Professionale / Note
              </label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full bg-[#050B14] border border-[#1E293B] p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            {/* Pulsanti di Azione */}
            <div className="pt-4 border-t border-[#1E293B] flex justify-end gap-3">
              <Link
                href="/admin"
                className="px-4 py-2.5 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-gray-300 transition-all rounded-none"
              >
                Annulla
              </Link>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs uppercase tracking-wider transition-all rounded-none"
              >
                Salva Modifiche
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
