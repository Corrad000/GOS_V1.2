'use client';

import React, { useState } from 'react';

export interface ContactItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
}

export interface GovernanceRoleItem {
  id: string;
  roleTitle: string;
  assigneeName: string;
  email: string;
  phone: string;
  responsibilityScope: string;
  accessLevel: 'FULL_CONTROL' | 'ADVISOR' | 'VIEW_ONLY';
  assignmentStatus: 'ATTIVO' | 'SOSTITUITO';
  startDate?: string;
  endDate?: string;
}

interface ProjectGovernanceProps {
  projectId: string;
}

export function ProjectGovernanceView({ projectId }: ProjectGovernanceProps) {
  // Stato Rubrica Incaricati
  const [contacts, setContacts] = useState<ContactItem[]>([
    
  ]);

  // Stato Ruoli & Governance con Storico Assegnazioni
  const [roles, setRoles] = useState<GovernanceRoleItem[]>([
    
  ]);

  // Filtro visibilità ruoli
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ATTIVO' | 'SOSTITUITO'>('ALL');

  // Stati visibilità maschere
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);

  // Form stato Incaricato
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactTitle, setNewContactTitle] = useState('');

  // Form stato Ruolo
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [newRoleScope, setNewRoleScope] = useState('');
  const [newRoleAccess, setNewRoleAccess] = useState<'FULL_CONTROL' | 'ADVISOR' | 'VIEW_ONLY'>('ADVISOR');
  const [newStartDate, setNewStartDate] = useState('');

  // --- CRUD INCARICATI ---
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;

    const newC: ContactItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: newContactName,
      email: newContactEmail || 'n/d@domain.com',
      phone: newContactPhone || 'N/D',
      title: newContactTitle || 'Incaricato'
    };

    setContacts([...contacts, newC]);
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setNewContactTitle('');
    setIsAddingContact(false);
  };

  const updateContactField = (id: string, field: keyof ContactItem, value: any) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const deleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  // --- CRUD RUOLI & STORICO ---
  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitle.trim()) return;

    const contact = contacts.find(c => c.id === selectedContactId) || {
      name: 'Da Assegnare',
      email: 'n/d',
      phone: 'n/d'
    };

    const newR: GovernanceRoleItem = {
      id: Math.random().toString(36).substring(2, 9),
      roleTitle: newRoleTitle,
      assigneeName: contact.name,
      email: contact.email,
      phone: contact.phone,
      responsibilityScope: newRoleScope || 'Gestione attività specifiche',
      accessLevel: newRoleAccess,
      assignmentStatus: 'ATTIVO',
      startDate: newStartDate || new Date().toISOString().split('T')[0]
    };

    setRoles([...roles, newR]);
    setNewRoleTitle('');
    setSelectedContactId('');
    setNewRoleScope('');
    setNewStartDate('');
    setIsAddingRole(false);
  };

  // Modifica dell'incaricato direttamente dal menu a tendina nel singolo box ruolo
  const handleAssigneeChangeInRole = (roleId: string, contactName: string) => {
    const contact = contacts.find(c => c.name === contactName);
    setRoles(roles.map(r => {
      if (r.id === roleId) {
        return {
          ...r,
          assigneeName: contactName,
          email: contact ? contact.email : r.email,
          phone: contact ? contact.phone : r.phone
        };
      }
      return r;
    }));
  };

  const updateRoleField = (id: string, field: keyof GovernanceRoleItem, value: any) => {
    setRoles(roles.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleStatusRole = (id: string) => {
    setRoles(roles.map(r => {
      if (r.id === id) {
        const nextStatus = r.assignmentStatus === 'ATTIVO' ? 'SOSTITUITO' : 'ATTIVO';
        const endDateVal = nextStatus === 'SOSTITUITO' ? new Date().toISOString().split('T')[0] : '';
        return { ...r, assignmentStatus: nextStatus, endDate: endDateVal };
      }
      return r;
    }));
  };

  const deleteRole = (id: string) => {
    setRoles(roles.filter(r => r.id !== id));
  };

  const filteredRoles = roles.filter(r => {
    if (filterStatus === 'ATTIVO') return r.assignmentStatus === 'ATTIVO';
    if (filterStatus === 'SOSTITUITO') return r.assignmentStatus === 'SOSTITUITO';
    return true;
  });

  return (
    <div className="space-y-10">
      
      {/* SEZIONE 1: RUBRICA INCARICATI E CONTATTI */}
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Rubrica Incaricati & Contatti</h3>
            <p className="text-xs text-gray-400">Anagrafica dei referenti attivi sul progetto ({projectId}).</p>
          </div>
          <button
            onClick={() => setIsAddingContact(!isAddingContact)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
          >
            {isAddingContact ? 'Annulla' : '+ Aggiungi Incaricato'}
          </button>
        </div>

        {/* MASCHERA NUOVO INCARICATO */}
        {isAddingContact && (
          <form onSubmit={handleAddContact} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Nuovo Incaricato</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Nome e Cognome</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Es. Marco Rossi"
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Qualifica / Ruolo Aziendale</label>
                <input
                  type="text"
                  value={newContactTitle}
                  onChange={(e) => setNewContactTitle(e.target.value)}
                  placeholder="Es. Technical Lead"
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="m.rossi@azienda.it"
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Telefono</label>
                <input
                  type="text"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+39 333 0000000"
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Salva Incaricato in Rubrica
              </button>
            </div>
          </form>
        )}

        {/* LISTA INCARICATI MODIFICABILE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-3 relative group">
              <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                <input
                  type="text"
                  value={contact.title}
                  onChange={(e) => updateContactField(contact.id, 'title', e.target.value)}
                  className="text-[10px] font-bold text-indigo-400 uppercase bg-transparent focus:outline-none focus:border-b border-indigo-500"
                />
                <button
                  onClick={() => deleteContact(contact.id)}
                  className="text-red-400 text-xs hover:text-red-300 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Elimina Incaricato"
                >
                  🗑️
                </button>
              </div>

              <input
                type="text"
                value={contact.name}
                onChange={(e) => updateContactField(contact.id, 'name', e.target.value)}
                className="w-full bg-transparent text-white font-extrabold text-sm focus:outline-none focus:border-b border-emerald-500"
              />

              <div className="space-y-1.5 text-xs text-gray-400 pt-1 font-mono">
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContactField(contact.id, 'email', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 px-2 py-1 rounded text-gray-300 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>📞</span>
                  <input
                    type="text"
                    value={contact.phone}
                    onChange={(e) => updateContactField(contact.id, 'phone', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 px-2 py-1 rounded text-gray-300 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEZIONE 2: ASSEGNAZIONE RUOLI, GOVERNANCE & STORICO */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Governance & Storico Assegnazioni</h3>
            <p className="text-xs text-gray-400">Tracciamento e perimetro di responsabilità degli incaricati attivi e sostituiti.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro Stato Assegnazione */}
            <div className="flex items-center bg-gray-950 border border-gray-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'ALL' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Tutti ({roles.length})
              </button>
              <button
                onClick={() => setFilterStatus('ATTIVO')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'ATTIVO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'text-gray-400 hover:text-white'}`}
              >
                Attivi ({roles.filter(r => r.assignmentStatus === 'ATTIVO').length})
              </button>
              <button
                onClick={() => setFilterStatus('SOSTITUITO')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'SOSTITUITO' ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'text-gray-400 hover:text-white'}`}
              >
                Sostituiti ({roles.filter(r => r.assignmentStatus === 'SOSTITUITO').length})
              </button>
            </div>

            <button
              onClick={() => setIsAddingRole(!isAddingRole)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
            >
              {isAddingRole ? 'Annulla' : '+ Assegna Nuovo Ruolo'}
            </button>
          </div>
        </div>

        {/* MASCHERA NUOVO RUOLO */}
        {isAddingRole && (
          <form onSubmit={handleAddRole} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Nuovo Ruolo di Governance</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Titolo Ruolo / Funzione</label>
                <input
                  type="text"
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  placeholder="Es. Responsabile Commerciale & Sales"
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Seleziona Incaricato da Rubrica</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-semibold cursor-pointer"
                >
                  <option value="">-- Seleziona Incaricato --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Data Inizio Incarico</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Livello Accesso</label>
                <select
                  value={newRoleAccess}
                  onChange={(e) => setNewRoleAccess(e.target.value as any)}
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-semibold cursor-pointer"
                >
                  <option value="FULL_CONTROL">Full Control (Advisor / Partner)</option>
                  <option value="ADVISOR">Advisor Operativo</option>
                  <option value="VIEW_ONLY">View Only (Cliente / Stakeholder)</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="text-gray-400 block mb-1">Perimetro di Responsabilità</label>
                <input
                  type="text"
                  value={newRoleScope}
                  onChange={(e) => setNewRoleScope(e.target.value)}
                  placeholder="Es. Definizione pipeline commerciale e coordinamento del reparto marketing"
                  className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Salva Ruolo di Governance
              </button>
            </div>
          </form>
        )}

        {/* ELENCO RUOLI CONFIGURATI & STORICO */}
        <div className="space-y-4">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className={`border p-6 rounded-2xl space-y-4 relative transition-all ${
                role.assignmentStatus === 'SOSTITUITO'
                  ? 'bg-gray-950/40 border-gray-900 opacity-75'
                  : 'bg-gray-950 border-gray-800'
              }`}
            >
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    {/* Badge Stato Assegnazione */}
                    <button
                      onClick={() => toggleStatusRole(role.id)}
                      className={`px-2.5 py-1 text-[9px] font-extrabold rounded uppercase cursor-pointer border ${
                        role.assignmentStatus === 'ATTIVO'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                      }`}
                      title="Clicca per modificare lo stato di questo incarico"
                    >
                      {role.assignmentStatus === 'ATTIVO' ? '🟢 Incarico Attivo' : '⚪ Sostituito / Storico'}
                    </button>

                    {/* Permessi Accesso */}
                    <select
                      value={role.accessLevel}
                      onChange={(e) => updateRoleField(role.id, 'accessLevel', e.target.value)}
                      className={`px-3 py-1 text-[10px] font-bold rounded uppercase cursor-pointer border ${
                        role.accessLevel === 'FULL_CONTROL' ? 'bg-purple-950 text-purple-400 border-purple-900' :
                        role.accessLevel === 'ADVISOR' ? 'bg-blue-950 text-blue-400 border-blue-900' :
                        'bg-emerald-950 text-emerald-400 border-emerald-900'
                      }`}
                    >
                      <option value="FULL_CONTROL" className="bg-gray-900 text-purple-400">Full Control</option>
                      <option value="ADVISOR" className="bg-gray-900 text-blue-400">Advisor Operativo</option>
                      <option value="VIEW_ONLY" className="bg-gray-900 text-emerald-400">View Only</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={role.roleTitle}
                    onChange={(e) => updateRoleField(role.id, 'roleTitle', e.target.value)}
                    className="w-full bg-transparent text-white font-bold text-base focus:outline-none focus:border-b border-indigo-500 mt-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleStatusRole(role.id)}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {role.assignmentStatus === 'ATTIVO' ? 'Segna come Sostituito' : 'Ripristina Incarico Attivo'}
                  </button>

                  <button
                    onClick={() => deleteRole(role.id)}
                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-900 text-red-400 text-xs rounded-xl transition-all cursor-pointer"
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>

              {/* DETTAGLI MODIFICABILI RUOLO: MENU A TENDINA PER L'INCARICATO */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2 border-t border-gray-900 text-xs">
                <div>
                  <span className="text-gray-400 block mb-1">Incaricato (da Rubrica)</span>
                  <select
                    value={role.assigneeName}
                    onChange={(e) => handleAssigneeChangeInRole(role.id, e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-semibold cursor-pointer"
                  >
                    {contacts.map((c) => (
                      <option key={c.id} value={c.name} className="bg-gray-900 text-white">
                        {c.name} ({c.title})
                      </option>
                    ))}
                    {/* Fallback se l'incaricato storico non è più nella rubrica */}
                    {!contacts.some(c => c.name === role.assigneeName) && (
                      <option value={role.assigneeName} className="bg-gray-900 text-amber-400">
                        {role.assigneeName} (Storico / Non in rubrica)
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <span className="text-gray-400 block mb-1">Data Inizio Incarico</span>
                  <input
                    type="date"
                    value={role.startDate || ''}
                    onChange={(e) => updateRoleField(role.id, 'startDate', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <span className="text-gray-400 block mb-1">Data Fine (se sostituito)</span>
                  <input
                    type="date"
                    value={role.endDate || ''}
                    onChange={(e) => updateRoleField(role.id, 'endDate', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <span className="text-gray-400 block mb-1">E-mail</span>
                  <input
                    type="email"
                    value={role.email}
                    onChange={(e) => updateRoleField(role.id, 'email', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <span className="text-gray-400 block mb-1">Perimetro di Responsabilità</span>
                  <input
                    type="text"
                    value={role.responsibilityScope}
                    onChange={(e) => updateRoleField(role.id, 'responsibilityScope', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white"
                  />
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
