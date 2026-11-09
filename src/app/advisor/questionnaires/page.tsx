'use client';

import { useEffect, useState } from 'react';
import { questionarioService, Questionario } from '@/services/questionarioService';
import Link from 'next/link';

export default function QuestionnairesListPage() {
  const [questionari, setQuestionari] = useState<Questionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCodice, setNewCodice] = useState('');
  const [newTitolo, setNewTitolo] = useState('');
  const [newDescrizione, setNewDescrizione] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await questionarioService.getQuestionari();
      setQuestionari(data);
    } catch (err: any) {
      alert(`Errore nel caricamento dei questionari: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await questionarioService.createQuestionario({
        codice: newCodice,
        titolo: newTitolo,
        descrizione: newDescrizione,
      });
      setNewCodice('');
      setNewTitolo('');
      setNewDescrizione('');
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      alert(`Errore creazione modulo: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        Caricamento Libreria Moduli...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Sezione */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Libreria Questionari & Moduli</h1>
            <p className="text-sm text-gray-400 mt-1">Gestisci i modelli di diagnostica e assessment aziendale</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {showForm ? 'Annulla' : '+ Nuovo Modulo'}
          </button>
        </div>

        {/* Form Creazione Modulo */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Crea Nuovo Modulo Questionario</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Codice (es. QUEST-DIAG-01) *</label>
                <input
                  type="text"
                  required
                  value={newCodice}
                  onChange={(e) => setNewCodice(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="QUEST-XXX"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Titolo Modulo *</label>
                <input
                  type="text"
                  required
                  value={newTitolo}
                  onChange={(e) => setNewTitolo(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="es. Check-up Diagnostico di Finanza Aziendale"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Descrizione</label>
              <textarea
                rows={2}
                value={newDescrizione}
                onChange={(e) => setNewDescrizione(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Finalità e ambito del questionario..."
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva Modulo'}
              </button>
            </div>
          </form>
        )}

        {/* Griglia Elenco Moduli */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questionari.length === 0 ? (
            <div className="md:col-span-2 p-12 text-center border border-dashed border-gray-800 rounded-2xl text-gray-500 text-sm">
              Nessun modulo questionario presente. Clicca su "+ Nuovo Modulo" per crearne uno.
            </div>
          ) : (
            questionari.map((q) => (
              <div key={q.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono px-2.5 py-1 bg-gray-950 border border-gray-800 rounded text-gray-400">
                      {q.codice}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{q.titolo}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {q.descrizione || 'Nessuna descrizione inserita.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-800/60 flex justify-end">
                  <Link
                    href={`/advisor/questionnaires/${q.id}`}
                    className="px-4 py-2 bg-gray-950 border border-gray-800 hover:border-blue-600 hover:text-blue-400 text-xs font-medium text-gray-300 rounded-lg transition-colors"
                  >
                    Gestisci Domande →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}
