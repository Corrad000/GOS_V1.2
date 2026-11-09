'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface UserRoleProfile {
  role: 'Administrator' | 'Network Partner' | 'Senior Advisor' | 'Junior Advisor';
  badgeColor: string;
  permissions: {
    view: string[];
    actions: string[];
    restrictions: string;
  };
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Administrator' | 'Network Partner' | 'Senior Advisor' | 'Junior Advisor';
  status: 'Attivo' | 'Sospeso' | 'Online';
  lastAccess: string;
}

export default function UserManagementPage() {
  const router = useRouter();

  const roleProfiles: Record<string, UserRoleProfile> = {
    'Administrator': {
      role: 'Administrator',
      badgeColor: 'bg-red-950 text-red-400 border-red-800',
      permissions: {
        view: ['Control Center globale', 'Tutti i dati aziendali', 'Librerie Master', 'Bilanci e P&L di rete'],
        actions: ['Gestione utenti e ruoli', 'Creazione/Modifica moduli master', 'Approvazione contratti', 'Configurazione di sistema'],
        restrictions: 'Nessuna limitazione (Accesso totale).'
      }
    },
    'Network Partner': {
      role: 'Network Partner',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800',
      permissions: {
        view: ['Portfolio progetti associati', 'Offerte della propria rete', 'Report di redditività partner', 'Libreria moduli standard'],
        actions: ['Creazione offerte commerciali', 'Invito nuovi advisor', 'Supervisione progetti attivi', 'Gestione commissioni'],
        restrictions: 'Accesso limitato alla propria struttura di network e alle aziende collegate.'
      }
    },
    'Senior Advisor': {
      role: 'Senior Advisor',
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800',
      permissions: {
        view: ['Offerte commerciali assegnate', 'Aziende clienti in gestione', 'Questionari di assessment', 'Task di progetto'],
        actions: ['Compilazione Offer Builder', 'Esecuzione audit e diagnostica', 'Gestione task di progetto', 'Interazione diretta cliente'],
        restrictions: 'Non può modificare i moduli master di sistema o gestire gli utenti.'
      }
    },
    'Junior Advisor': {
      role: 'Junior Advisor',
      badgeColor: 'bg-blue-950 text-blue-400 border-blue-800',
      permissions: {
        view: ['Task di progetto assegnate', 'Template di questionari', 'Documentazione di supporto'],
        actions: ['Compilazione dati operativi', 'Aggiornamento task', 'Supporto operativo sui progetti'],
        restrictions: 'Sola lettura sulle offerte commerciali; non può approvare o finalizzare contratti.'
      }
    }
  };

  const [users, setUsers] = useState<SystemUser[]>([
    { id: 'u1', name: 'Corrado Pinna', email: 'corrado.pinna@glaring.co.uk', phone: '+39 335 1234567', role: 'Administrator', status: 'Online', lastAccess: 'Adesso' },
    { id: 'u2', name: 'Marco Rossi', email: 'm.rossi@glaring.co.uk', phone: '+39 338 7654321', role: 'Network Partner', status: 'Online', lastAccess: '5 min fa' },
    { id: 'u3', name: 'Alessandro Bianchi', email: 'a.bianchi@glaring.co.uk', phone: '+39 340 1122334', role: 'Senior Advisor', status: 'Attivo', lastAccess: '2 ore fa' },
    { id: 'u4', name: 'Giulia Verdi', email: 'g.verdi@glaring.co.uk', phone: '+39 349 9988776', role: 'Junior Advisor', status: 'Attivo', lastAccess: 'Ieri' }
  ]);

  const [selectedRoleView, setSelectedRoleView] = useState<'Administrator' | 'Network Partner' | 'Senior Advisor' | 'Junior Advisor'>('Senior Advisor');

  // Stati per il form di Creazione / Modifica Utente (incluso setInputPhone)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [inputRole, setInputRole] = useState<'Administrator' | 'Network Partner' | 'Senior Advisor' | 'Junior Advisor'>('Senior Advisor');
  const [inputStatus, setInputStatus] = useState<'Attivo' | 'Sospeso' | 'Online'>('Attivo');

  const handleOpenCreate = () => {
    setEditingId(null);
    setInputName('');
    setInputEmail('');
    setInputPhone('');
    setInputRole('Senior Advisor');
    setInputStatus('Attivo');
    setShowForm(true);
  };

  const handleOpenEdit = (u: SystemUser) => {
    setEditingId(u.id);
    setInputName(u.name);
    setInputEmail(u.email);
    setInputPhone(u.phone || '');
    setInputRole(u.role);
    setInputStatus(u.status);
    setShowForm(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim() || !inputEmail.trim()) return;

    if (editingId) {
      setUsers(users.map(u => u.id === editingId ? {
        ...u,
        name: inputName,
        email: inputEmail,
        phone: inputPhone,
        role: inputRole,
        status: inputStatus
      } : u));
    } else {
      const newUser: SystemUser = {
        id: `usr-${Date.now()}`,
        name: inputName,
        email: inputEmail,
        phone: inputPhone,
        role: inputRole,
        status: inputStatus,
        lastAccess: 'Mai'
      };
      setUsers([...users, newUser]);
    }

    setShowForm(false);
    setEditingId(null);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo utente dal sistema?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block">
              GOS 1.2 — GOVERNANCE & SICUREZZA
            </span>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-wider">Gestione Utenti & Matrice Ruoli</h1>
          </div>
          
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            ← Torna al Control Center
          </button>
        </div>

        {/* SEZIONE 1: MATRICE DEI PERMESSI PER RUOLO */}
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl space-y-6">
          <div className="border-b border-gray-800 pb-4">
            <h2 className="text-base font-black text-white uppercase">Matrice dei Permessi per Tipologia Utente</h2>
            <p className="text-xs text-gray-400 mt-1">Seleziona un profilo per visualizzare le autorizzazioni di lettura, scrittura e operazioni consentite.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['Administrator', 'Network Partner', 'Senior Advisor', 'Junior Advisor'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleView(r)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedRoleView === r 
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md' 
                    : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider block">👁️ Cosa può Vedere (Lettura)</span>
              <ul className="space-y-1">
                {roleProfiles[selectedRoleView].permissions.view.map((item, idx) => (
                  <li key={idx} className="text-xs text-gray-300 flex items-center gap-2">
                    <span className="text-amber-500">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider block">⚡ Cosa può Fare (Azioni)</span>
              <ul className="space-y-1">
                {roleProfiles[selectedRoleView].permissions.actions.map((item, idx) => (
                  <li key={idx} className="text-xs text-gray-300 flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono text-red-400 uppercase font-bold tracking-wider block">🔒 Restrizioni & Limiti</span>
              <p className="text-xs text-gray-300 leading-relaxed bg-gray-900 p-3 rounded-lg border border-gray-800">
                {roleProfiles[selectedRoleView].permissions.restrictions}
              </p>
            </div>
          </div>
        </div>

        {/* SEZIONE 2: ELENCO UTENTI E FORM DI GESTIONE */}
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white uppercase">Utenti Registrati nel Sistema</h2>
              <p className="text-xs text-gray-400 mt-1">Elenco degli account attivi e assegnazione dei ruoli operativi.</p>
            </div>
            <button
              onClick={() => showForm ? setShowForm(false) : handleOpenCreate()}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              {showForm ? '✕ Chiudi Maschera' : '+ Aggiungi Nuovo Utente'}
            </button>
          </div>

          {/* FORM AGGIUNTA / MODIFICA UTENTE */}
          {showForm && (
            <form onSubmit={handleSaveUser} className="bg-gray-950 border border-amber-500/40 p-6 rounded-2xl space-y-5 shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                {editingId ? 'Modifica Profilo Utente' : 'Registrazione Nuovo Utente di Sistema'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Nome Completo</label>
                  <input
                    type="text"
                    placeholder="Es. Mario Rossi"
                    value={inputName}
                    onChange={e => setInputName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Indirizzo Email Aziendale</label>
                  <input
                    type="email"
                    placeholder="mario.rossi@glaring.co.uk"
                    value={inputEmail}
                    onChange={e => setInputEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Telefono / Cellulare</label>
                  <input
                    type="text"
                    placeholder="+39 335 0000000"
                    value={inputPhone}
                    onChange={e => setInputPhone(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Assegna Ruolo</label>
                  <select
                    value={inputRole}
                    onChange={e => setInputRole(e.target.value as any)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Network Partner">Network Partner</option>
                    <option value="Senior Advisor">Senior Advisor</option>
                    <option value="Junior Advisor">Junior Advisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Stato Account</label>
                  <select
                    value={inputStatus}
                    onChange={e => setInputStatus(e.target.value as any)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Attivo">Attivo</option>
                    <option value="Online">Online</option>
                    <option value="Sospeso">Sospeso</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  {editingId ? 'Salva Modifiche' : 'Crea e Registra Utente'}
                </button>
              </div>
            </form>
          )}

          {/* TABELLA UTENTI */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-gray-400 uppercase font-mono text-[10px] border-b border-gray-800">
                <tr>
                  <th className="p-3">Utente</th>
                  <th className="p-3">Contatti (Email / Tel)</th>
                  <th className="p-3">Ruolo di Sistema</th>
                  <th className="p-3">Stato</th>
                  <th className="p-3">Ultimo Accesso</th>
                  <th className="p-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-950/50 transition-colors">
                    <td className="p-3 font-bold text-white">{u.name}</td>
                    <td className="p-3">
                      <div className="text-gray-300 font-mono">{u.email}</div>
                      <div className="text-gray-500 font-mono text-[11px]">{u.phone || 'Nessun telefono'}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${roleProfiles[u.role].badgeColor}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'Online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-gray-800 text-gray-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></span>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 font-mono">{u.lastAccess}</td>
                    <td className="p-3 text-right space-x-3">
                      <button 
                        onClick={() => handleOpenEdit(u)}
                        className="text-gray-400 hover:text-amber-400 font-bold transition-colors cursor-pointer"
                      >
                        ✏️ Modifica
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-gray-500 hover:text-red-400 font-bold transition-colors cursor-pointer"
                      >
                        ✕ Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
