'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCompanyRegistrationPage() {
  const router = useRouter();

  // Generazione sicura del codice azienda progressivo (es. AZ-00024) eseguita a componente montato
  const [companyCode, setCompanyCode] = useState('AZ-00020');

  useEffect(() => {
    // In un contesto reale qui leggerai l'ultimo progressivo dal database (Supabase)
    const nextId = 24; 
    const formattedCode = `AZ-${String(nextId).padStart(5, '0')}`;
    setCompanyCode(formattedCode);
  }, []);
  
  const [companyName, setCompanyName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [industry, setIndustry] = useState('Manifatturiero / Industriale');
  const [assignedAdvisor, setAssignedAdvisor] = useState('Corrado Pinna');
  const [estimatedRevenue, setEstimatedRevenue] = useState('250000');
  const [notes, setNotes] = useState('');

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !vatNumber.trim()) return;

    // Esempio di codice composto per sezioni collegate (Azienda + Progetto / Offerta)
    const sampleProjectCode = `${companyCode}/PRJ-001`;

    alert(`Azienda registrata con successo!\nCodice Unico Master: ${companyCode}\nEsempio Codice Progetto Collegato: ${sampleProjectCode}\nAdvisor: ${assignedAdvisor}`);
    router.push('/admin');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block">
              GOS 1.2 — ONBOARDING & CODIFICA UNICA AZIENDA
            </span>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-wider">Registra Nuova Azienda</h1>
          </div>
          
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            ← Indietro
          </button>
        </div>

        {/* Form di Censimento Azienda */}
        <form onSubmit={handleSaveCompany} className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Anagrafica e Codice Progressivo Master</h2>
              <p className="text-xs text-gray-400 mt-0.5">Il codice azienda è univoco e verrà utilizzato come prefisso per offerte, questionari e progetti.</p>
            </div>
            <div className="bg-amber-950/60 border border-amber-800/60 px-4 py-2 rounded-xl text-amber-400 font-mono font-bold text-xs">
              ID Master: {companyCode}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Ragione Sociale</label>
              <input
                type="text"
                placeholder="Es. Opus Automazione S.p.A."
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-3 rounded-xl text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Partita IVA / Codice Fiscale</label>
              <input
                type="text"
                placeholder="Es. IT01234567890"
                value={vatNumber}
                onChange={e => setVatNumber(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-3 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Settore Industriale / Mercato</label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-3 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="Manifatturiero / Industriale">Manifatturiero / Industriale</option>
                <option value="Tecnologia & Software">Tecnologia & Software</option>
                <option value="Energy & Green Tech">Energy & Green Tech</option>
                <option value="Commerciale & Distribuzione">Commerciale & Distribuzione</option>
                <option value="Servizi Professionali">Servizi Professionali</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Assegna Advisor Responsabile</label>
              <select
                value={assignedAdvisor}
                onChange={e => setAssignedAdvisor(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-3 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="Corrado Pinna">Corrado Pinna (Administrator)</option>
                <option value="Marco Rossi">Marco Rossi (Network Partner)</option>
                <option value="Alessandro Bianchi">Alessandro Bianchi (Senior Advisor)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Fatturato Stimato / Annuo (€)</label>
              <input
                type="text"
                inputMode="decimal"
                value={estimatedRevenue}
                onChange={e => setEstimatedRevenue(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-3 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Note Preliminari / Obiettivi Strategici</label>
              <textarea
                rows={3}
                placeholder="Dettagli sulle esigenze di consulenza o accordi iniziali..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-3 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              Conferma e Registra Azienda ({companyCode})
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}
