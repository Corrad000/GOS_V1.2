'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Campi del profilo
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Dati anagrafici, contatto ed emergenza
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [status, setStatus] = useState<'Active' | 'Busy' | 'Away' | 'Offline'>('Active');
  
  // Indirizzo
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressRegion, setAddressRegion] = useState('');
  const [addressCountry, setAddressCountry] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || '');
          if (user.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
          if (user.user_metadata?.role) setRole(user.user_metadata.role);
          if (user.user_metadata?.phone) setPhone(user.user_metadata.phone);
          if (user.user_metadata?.emergencyContactName) setEmergencyContactName(user.user_metadata.emergencyContactName);
          if (user.user_metadata?.emergencyContactPhone) setEmergencyContactPhone(user.user_metadata.emergencyContactPhone);
          if (user.user_metadata?.status) setStatus(user.user_metadata.status);
          if (user.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url);
          
          const addr = user.user_metadata?.address;
          if (addr) {
            setAddressStreet(addr.street || '');
            setAddressNumber(addr.number || '');
            setAddressPostalCode(addr.postalCode || '');
            setAddressCity(addr.city || '');
            setAddressRegion(addr.region || '');
            setAddressCountry(addr.country || '');
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento del profilo:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUserProfile();
  }, [supabase]);

  // Gestione dell'upload dell'immagine su Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      setUploadingImage(true);
      setMessage(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setMessage({ type: 'success', text: 'Immagine caricata con successo! Ricorda di salvare le modifiche.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Errore durante l'upload dell'immagine. Assicurati che esista il bucket 'avatars' su Supabase." });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone,
          emergencyContactName,
          emergencyContactPhone,
          status,
          avatar_url: avatarUrl,
          address: {
            street: addressStreet,
            number: addressNumber,
            postalCode: addressPostalCode,
            city: addressCity,
            region: addressRegion,
            country: addressCountry
          }
        }
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profilo, anagrafica e contatti di emergenza aggiornati con successo!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Errore durante il salvataggio.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-400 font-mono text-sm">
        Caricamento profilo in corso...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Breadcrumb di Navigazione */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link 
          href="/dashboard" 
          className="hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>←</span> Torna alla Dashboard
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-emerald-400 font-medium">Profilo Utente</span>
      </nav>

      {/* Intestazione */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Profilo Utente & Anagrafica</h1>
        <p className="text-xs text-gray-400 mt-1">Gestisci le tue informazioni personali, foto, contatti, indirizzo e stato operativo.</p>
      </div>

      {message && (
        <div className={`p-4 text-xs font-medium border ${message.type === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Form Principale */}
      <form onSubmit={handleSave} className="bg-[#0F172A] border border-[#1E293B] p-6 space-y-6 shadow-xl">
        
        {/* Sezione Foto Profilo con Upload */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[#1E293B]">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-700 bg-gray-900 shrink-0 flex items-center justify-center">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500 text-[10px] font-mono">NO FOTO</span>
            )}
          </div>
          <div className="space-y-2 w-full">
            <label className="text-xs font-bold text-gray-200 uppercase tracking-wider block">Foto Profilo (Upload)</label>
            <p className="text-[11px] text-gray-400">Carica un'immagine dal tuo dispositivo (PNG, JPG o WEBP).</p>
            
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 bg-[#1E293B] hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-semibold rounded-none transition-all cursor-pointer inline-flex items-center gap-2">
                {uploadingImage ? 'Caricamento in corso...' : 'Scegli File...'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  disabled={uploadingImage}
                  className="hidden" 
                />
              </label>
              <span className="text-[11px] text-gray-400 truncate max-w-xs font-mono">{avatarUrl}</span>
            </div>
          </div>
        </div>

        {/* Informazioni Personali e Contatti */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#1E293B]">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Nome Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#050B14] border border-[#1E293B] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Indirizzo Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-[#050B14]/50 border border-[#1E293B] px-3.5 py-2 text-xs text-gray-400 cursor-not-allowed"
            />
            <span className="text-[10px] text-gray-500 block">L'email di accesso non è modificabile.</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Numero di Telefono</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#050B14] border border-[#1E293B] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              placeholder="+39 ..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Ruolo di Sistema</label>
            <input
              type="text"
              value={role}
              disabled
              className="w-full bg-[#050B14]/50 border border-[#1E293B] px-3.5 py-2 text-xs text-amber-400 font-bold uppercase cursor-not-allowed"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Status Operativo</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-[#050B14] border border-[#1E293B] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="Active">🟢 Attivo / Operativo</option>
              <option value="Busy">🔴 Occupato / In Riunione</option>
              <option value="Away">🟡 Assente / Fuori Sede</option>
              <option value="Offline">⚪ Offline</option>
            </select>
          </div>

        </div>

        {/* Contatto di Emergenza */}
        <div className="space-y-4 pb-6 border-b border-[#1E293B]">
          <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Contatto di Emergenza</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase">Nome Contatto di Emergenza</label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="w-full bg-[#050B14] border border-[#1E293B] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Es. Nome Cognome"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase">Telefono di Emergenza</label>
              <input
                type="text"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                className="w-full bg-[#050B14] border border-[#1E293B] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="+39 ..."
              />
            </div>
          </div>
        </div>

        {/* Indirizzo Completo */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Indirizzo Completo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-gray-300 uppercase">Via / Piazza</label>
              <input
                type="text"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                className="w-full bg-[#050B14] border border-[#1E293B] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Es. Via Dante Alighieri"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase">Numero Civico</label>
              <input
                type="text"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                className="w-full bg-[#050B14] border border-[#1E293B] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Es. 14"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase">Codice Postale (CAP)</label>
              <input
                type="text"
                value={addressPostalCode}
                onChange={(e) => setAddressPostalCode(e.target.value)}
                className="w-full bg-[#050B14] border border-[#1E293B] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="Es. 09128"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase">Città</label>
              <input
                type="text"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                className="w-full bg-[#050B14] border border-[#1E293B] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Es. Cagliari"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-300 uppercase">Regione</label>
              <input
                type="text"
                value={addressRegion}
                onChange={(e) => setAddressRegion(e.target.value)}
                className="w-full bg-[#050B14] border border-[#1E293B] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Es. Sardegna"
              />
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-[11px] font-bold text-gray-300 uppercase">Stato</label>
              <input
                type="text"
                value={addressCountry}
                onChange={(e) => setAddressCountry(e.target.value)}
                className="w-full bg-[#050B14] border border-[#1E293B] px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Es. Italia"
              />
            </div>
          </div>
        </div>

        {/* Pulsante di Salvataggio */}
        <div className="flex justify-end pt-4 border-t border-[#1E293B]">
          <button
            type="submit"
            disabled={saving || uploadingImage}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Salvataggio in corso...' : 'Salva Modifiche'}
          </button>
        </div>

      </form>

    </div>
  );
}
