'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [roles, setRoles] = useState<GovernanceRoleItem[]>([]);

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

  // --- FETCH DATI DA SUPABASE ---
  useEffect(() => {
    if (!projectId) return;

    async function fetchData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gos_ruoli')
          .select('*')
          .eq('project_id', projectId);

        if (error) throw error;

        if (data) {
          // Separiamo i record: consideriamo "Contatti" quelli con ruolo = 'CONTATTO' o simili, e "Ruoli" gli altri
          const loadedContacts: ContactItem[] = data
            .filter((item: any) => item.ruolo === 'CONTATTO' || item.is_contact === true)
            .map((item: any) => ({
              id: item.id,
              name: item.nome || '',
              email: item.email || '',
              phone: item.telefono || '',
              title: item.responsibility_scope || 'Incaricato'
            }));

          const loadedRoles: GovernanceRoleItem[] = data
            .filter((item: any) => item.ruolo !== 'CONTATTO' && item.is_contact !== true)
            .map((item: any) => ({
              id: item.id,
              roleTitle: item.ruolo || 'Ruolo senza titolo',
              assigneeName: item.nome || 'Da Assegnare',
              email: item.email || '',
              phone: item.telefono || '',
              responsibilityScope: item.responsibility_scope || '',
              accessLevel: item.access_level || 'ADVISOR',
              assignmentStatus: item.stato || 'ATTIVO',
              startDate: item.start_date || '',
              endDate: item.end_date || ''
            }));

          setContacts(loadedContacts);
          setRoles(loadedRoles);
        }
      } catch (err) {
        console.error('Errore nel recupero dati:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId, supabase]);

  // --- CRUD INCARICATI SU SUPABASE ---
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;

    const payload = {
      project_id: projectId,
      ruolo: 'CONTATTO',
      is_contact: true,
      nome: newContactName,
      email: newContactEmail || 'n/d@domain.com',
      telefono: newContactPhone || 'N/D',
      responsibility_scope: newContactTitle || 'Incaricato',
      stato: 'ATTIVO'
    };

    try {
      const { data, error } = await supabase
        .from('gos_ruoli')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const created: ContactItem = {
        id: data?.id || Math.random().toString(36).substring(2, 9),
        name: newContactName,
        email: payload.email,
        phone: payload.telefono,
        title: payload.responsibility_scope
      };

      setContacts([...contacts, created]);
      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewContactTitle('');
      setIsAddingContact(false);
    } catch (err: any) {
      alert('Impossibile salvare il contatto su Supabase: ' + (err.message || err));
    }
  };

  const updateContactField = async (id: string, field: keyof ContactItem, value: any) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));

    const dbFieldMap: any = {
      name: 'nome',
      email: 'email',
      phone: 'telefono',
      title: 'responsibility_scope'
    };

    const dbColumn = dbFieldMap[field] || field;
    await supabase
      .from('gos_ruoli')
      .update({ [dbColumn]: value })
      .eq('id', id);
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Eliminare questo contatto dalla rubrica?')) return;

    try {
      const { error } = await supabase
        .from('gos_ruoli')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + (err.message || err));
    }
  };

  // --- CRUD RUOLI & STORICO SU SUPABASE ---
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitle.trim()) return;

    const contact = contacts.find(c => c.id === selectedContactId) || {
      name: 'Da Assegnare',
      email: 'n/d',
      phone: 'n/d'
    };

    const payload = {
      project_id: projectId,
      ruolo: newRoleTitle,
      is_contact: false,
      nome: contact.name,
      email: contact.email,
      telefono: contact.phone,
      responsibility_scope: newRoleScope || 'Gestione attività specifiche',
      access_level: newRoleAccess,
      stato: 'ATTIVO',
      start_date: newStartDate || new Date().toISOString().split('T')[0]
    };

    try {
      const { data, error } = await supabase
        .from('gos_ruoli')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const created: GovernanceRoleItem = {
        id: data?.id || Math.random().toString(36).substring(2, 9),
        roleTitle: payload.ruolo,
        assigneeName: payload.nome,
        email: payload.email,
        phone: payload.telefono,
        responsibilityScope: payload.responsibility_scope,
        accessLevel: payload.access_level as any,
        assignmentStatus: 'ATTIVO',
        startDate: payload.start_date
      };

      setRoles([created, ...roles]);
      setNewRoleTitle('');
      setSelectedContactId('');
      setNewRoleScope('');
      setNewStartDate('');
      setIsAddingRole(false);
    } catch (err: any) {
      alert('Impossibile salvare il ruolo su Supabase: ' + (err.message || err));
    }
  };

  const handleAssigneeChangeInRole = async (roleId: string, contactName: string) => {
    const contact = contacts.find(c => c.name === contactName);
    const updatedRoles = roles.map(r => {
      if (r.id === roleId) {
        return {
          ...r,
          assigneeName: contactName,
          email: contact ? contact.email : r.email,
          phone: contact ? contact.phone : r.phone
        };
      }
      return r;
    });
    setRoles(updatedRoles);

    const target = updatedRoles.find(r => r.id === roleId);
    if (target) {
      await supabase
        .from('gos_ruoli')
        .update({ nome: target.assigneeName, email: target.email, telefono: target.phone })
        .eq('id', roleId);
    }
  };

  const updateRoleField = async (id: string, field: keyof GovernanceRoleItem, value: any) => {
    setRoles(roles.map(r => r.id === id ? { ...r, [field]: value } : r));

    const dbFieldMap: any = {
      roleTitle: 'ruolo',
      assigneeName: 'nome',
      email: 'email',
      phone: 'telefono',
      responsibilityScope: 'responsibility_scope',
      accessLevel: 'access_level',
      assignmentStatus: 'stato',
      startDate: 'start_date',
      endDate: 'end_date'
    };

    const dbColumn = dbFieldMap[field] || field;
    await supabase
      .from('gos_ruoli')
      .update({ [dbColumn]: value })
      .eq('id', id);
  };

  const toggleStatusRole = async (id: string) => {
    let updatedStatus = 'ATTIVO';
    let endDateVal = '';

    setRoles(roles.map(r => {
      if (r.id === id) {
        updatedStatus = r.assignmentStatus === 'ATTIVO' ? 'SOSTITUITO' : 'ATTIVO';
        endDateVal = updatedStatus === 'SOSTITUITO' ? new Date().toISOString().split('T')[0] : '';
        return { ...r, assignmentStatus: updatedStatus as any, endDate: endDateVal };
      }
      return r;
    }));

    await supabase
      .from('gos_ruoli')
      .update({ stato: updatedStatus, end_date: endDateVal })
      .eq('id', id);
  };

  const deleteRole = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo ruolo?')) return;

    try {
      const { error } = await supabase
        .from('gos_ruoli')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRoles(roles.filter(r => r.id !== id));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + (err.message || err));
    }
  };

  const filteredRoles = roles.filter(r => {
    if (filterStatus === 'ATTIVO') return r.assignmentStatus === 'ATTIVO';
    if (filterStatus === 'SOSTITUITO') return r.assignmentStatus === 'SOSTITUITO';
    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento governance e ruoli...</div>;
  }

  return (
    <div className="space-y-10">
      
      {/* SEZIONE 1: RUBRICA INCARICATI E CONTATTI */}
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Rubrica Incaricati & Contatti</h3>
            <p className="text-xs text-gray-400">Anagrafica dei referenti attivi sul progetto.</p>
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
          {contacts.length === 0 ? (
            <div className="col-span-3 p-8 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl text-xs text-gray-400">
              Nessun incaricato in rubrica. Clicca su "+ Aggiungi Incaricato" per inserire il primo contatto.
            </div>
          ) : (
            contacts.map((contact) => (
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
            ))
          )}
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
                  <option value="">-- Seleziona Incaricato (Opzionale) --</option>
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
          {filteredRoles.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl text-xs text-gray-400">
              Nessun ruolo di governance registrato per questo progetto. Clicca su "+ Assegna Nuovo Ruolo" per iniziare.
            </div>
          ) : (
            filteredRoles.map((role) => (
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

                {/* DETTAGLI MODIFICABILI RUOLO */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2 border-t border-gray-900 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-1">Incaricato</span>
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
                      {!contacts.some(c => c.name === role.assigneeName) && (
                        <option value={role.assigneeName} className="bg-gray-900 text-amber-400">
                          {role.assigneeName}
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
            ))
          )}
        </div>
      </div>

    </div>
  );
}
