'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  listAllContatti,
  upsertContatto,
  splitNomeCognome,
  type GosContatto,
} from './contactsService';
import { ContactAutocompleteInput } from './ContactAutocompleteInput';

interface ContactsDirectoryViewProps {
  aziendaId?: string | null;
  aziendaNome?: string | null;
}

export function ContactsDirectoryView({
  aziendaId,
  aziendaNome,
}: ContactsDirectoryViewProps) {
  const [contatti, setContatti] = useState<GosContatto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [telefonoInput, setTelefonoInput] = useState('');
  const [ruoloInput, setRuoloInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadContatti = useCallback(async () => {
    setLoading(true);
    const rows = await listAllContatti(aziendaId || null);
    setContatti(rows);
    setLoading(false);
  }, [aziendaId]);

  useEffect(() => {
    void loadContatti();
  }, [loadContatti]);

  const handleSaveContatto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) return;

    setSaving(true);
    const { nome, cognome } = splitNomeCognome(fullNameInput);
    const saved = await upsertContatto({
      nome,
      cognome,
      email: emailInput.trim() || null,
      telefono: telefonoInput.trim() || null,
      ruolo: ruoloInput.trim() || null,
      aziendaId: aziendaId || null,
      aziendaNome: aziendaNome || null,
      origine: 'manuale',
      note: noteInput.trim() || null,
    });

    setSaving(false);
    if (saved) {
      setFullNameInput('');
      setEmailInput('');
      setTelefonoInput('');
      setRuoloInput('');
      setNoteInput('');
      setShowAddModal(false);
      await loadContatti();
    } else {
      alert('Impossibile salvare il contatto in rubrica.');
    }
  };

  const filtered = contatti.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [c.nome_completo, c.email, c.telefono, c.ruolo, c.azienda_nome, c.origine]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const isGlobalView = !aziendaId;

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase">
            Rubrica Contatti &amp; Referenti
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Archivio centralizzato anti-duplicato alimentato automaticamente da anagrafica, trattative, task, ruoli e KYC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtra per nome, ruolo, email, azienda..."
            className="w-full md:w-64 bg-gray-950 border border-gray-700 px-3.5 py-2 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
          />
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider whitespace-nowrap"
          >
            + Nuovo Contatto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-gray-400">
          Caricamento rubrica contatti...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
          <p className="text-sm text-gray-400">
            Nessun contatto trovato per questa ricerca.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            Aggiungi il primo Contatto
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/70 text-[10px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Nome e Cognome</th>
                {isGlobalView && <th className="px-4 py-3">Azienda</th>}
                <th className="px-4 py-3">Ruolo</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Origine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-900/60 transition">
                  <td className="px-4 py-3 font-bold text-white">{c.nome_completo}</td>
                  {isGlobalView && (
                    <td className="px-4 py-3 text-gray-200">{c.azienda_nome || '-'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-300">{c.ruolo || '-'}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{c.email || '-'}</td>
                  <td className="px-4 py-3 font-mono text-gray-400">{c.telefono || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-[#FF5500] text-[10px] font-mono rounded uppercase">
                      {c.origine || 'manuale'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Aggiungi o Aggiorna Contatto
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Se email o nominativo esistono già, il contatto viene aggiornato senza duplicati.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSaveContatto} className="space-y-4">
              <ContactAutocompleteInput
                label="Nome e Cognome *"
                value={fullNameInput}
                onChange={setFullNameInput}
                aziendaId={aziendaId}
                aziendaNome={aziendaNome}
                allowQuickSave={false}
                placeholder="Digita per verificare se già presente in rubrica..."
                onSelectContact={(existing) => {
                  setFullNameInput(existing.nome_completo);
                  if (existing.email) setEmailInput(existing.email);
                  if (existing.telefono) setTelefonoInput(existing.telefono);
                  if (existing.ruolo) setRuoloInput(existing.ruolo);
                  if (existing.note) setNoteInput(existing.note);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                    Ruolo Aziendale
                  </label>
                  <input
                    type="text"
                    placeholder="Es. CEO, CFO, Direttore Commerciale"
                    value={ruoloInput}
                    onChange={(e) => setRuoloInput(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                    Telefono
                  </label>
                  <input
                    type="text"
                    placeholder="+39 ..."
                    value={telefonoInput}
                    onChange={(e) => setTelefonoInput(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="nome@azienda.it"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                  Note
                </label>
                <textarea
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? 'Salvataggio...' : 'Salva Contatto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
