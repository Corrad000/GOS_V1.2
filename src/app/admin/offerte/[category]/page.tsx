'use client';

import { useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';

export interface CustomField {
  label: string;
  value: string;
}

export interface MasterModuleItem {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  estimatedWeeks: number;
  fee: number;
  currency: string;
  customFields?: CustomField[];
}

function CategoryContent() {
  const router = useRouter();
  const params = useParams();
  const rawCategory = params?.category;
  const categoryName = rawCategory 
    ? (typeof rawCategory === 'string' ? decodeURIComponent(rawCategory) : decodeURIComponent(rawCategory[0])) 
    : '';

  const [modules, setModules] = useState<MasterModuleItem[]>([
    { id: 'm1', category: 'strategia', subcategory: 'Audit & Diagnostica', title: 'Audit Strategico & Diagnostica Aziendale', description: 'Analisi preliminare di bilancio e assetto organizzativo.', estimatedWeeks: 3, fee: 8500, currency: 'EUR' },
    { id: 'm2', category: 'vendite', subcategory: 'Sales & Marketing', title: 'Costituzione Dipartimento Marketing & Vendite', description: 'Definizione della rete commerciale, playbook e KPI.', estimatedWeeks: 8, fee: 18000, currency: 'EUR' },
    { id: 'm3', category: 'diagnostica', subcategory: 'Budgeting & P&L', title: 'Controllo di Gestione Quinquennale', description: 'Implementazione motore economico-finanziario.', estimatedWeeks: 4, fee: 12000, currency: 'EUR' }
  ]);

  const categoryModules = modules.filter(m => m.category.toLowerCase() === categoryName.toLowerCase());

  // Stati form di creazione / modifica
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newSubcategory, setNewSubcategory] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newWeeks, setNewWeeks] = useState('4');
  const [newFee, setNewFee] = useState('10000');
  const [newCurrency, setNewCurrency] = useState('EUR');

  // Stato per campi dinamici aggiuntivi
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldValue, setFieldValue] = useState('');

  const handleAddCustomField = () => {
    if (!fieldLabel.trim() || !fieldValue.trim()) return;
    setCustomFields([...customFields, { label: fieldLabel.trim(), value: fieldValue.trim() }]);
    setFieldLabel('');
    setFieldValue('');
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleOpenCreateForm = () => {
    setEditingId(null);
    setNewSubcategory('');
    setNewTitle('');
    setNewDescription('');
    setNewWeeks('4');
    setNewFee('10000');
    setNewCurrency('EUR');
    setCustomFields([]);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (mod: MasterModuleItem) => {
    setEditingId(mod.id);
    setNewSubcategory(mod.subcategory);
    setNewTitle(mod.title);
    setNewDescription(mod.description);
    setNewWeeks(String(mod.estimatedWeeks));
    setNewFee(String(mod.fee));
    setNewCurrency(mod.currency || 'EUR');
    setCustomFields(mod.customFields || []);
    setShowAddForm(true);
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingId) {
      // Modifica modulo esistente
      setModules(modules.map(m => m.id === editingId ? {
        ...m,
        subcategory: newSubcategory || 'Generale',
        title: newTitle,
        description: newDescription,
        estimatedWeeks: Number(newWeeks) || 0,
        fee: Number(newFee) || 0,
        currency: newCurrency,
        customFields: customFields
      } : m));
    } else {
      // Aggiunta nuovo modulo
      const newMod: MasterModuleItem = {
        id: `mod-${Date.now()}`,
        category: categoryName,
        subcategory: newSubcategory || 'Generale',
        title: newTitle,
        description: newDescription,
        estimatedWeeks: Number(newWeeks) || 0,
        fee: Number(newFee) || 0,
        currency: newCurrency,
        customFields: customFields
      };
      setModules([...modules, newMod]);
    }

    setShowAddForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Vuoi rimuovere questo modulo master?')) {
      setModules(modules.filter(m => m.id !== id));
    }
  };

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'CHF': return 'CHF';
      default: return '€';
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block">
              LIBRERIA MASTER MODULI — CATEGORIA
            </span>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-wider">{categoryName}</h1>
          </div>
          
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            ← Torna al Control Center
          </button>
        </div>

        {/* Gestione Moduli della Categoria */}
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-5">
            <div>
              <h2 className="text-base font-black text-white uppercase">Moduli Standard in [{categoryName}]</h2>
              <p className="text-xs text-gray-400 mt-1">Questi moduli saranno selezionabili dagli advisor durante la composizione delle offerte commerciali.</p>
            </div>
            <button
              onClick={() => showAddForm ? setShowAddForm(false) : handleOpenCreateForm()}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              {showAddForm ? '✕ Chiudi' : `+ Aggiungi Modulo Master`}
            </button>
          </div>

          {/* Form Inserimento / Modifica Modulo */}
          {showAddForm && (
            <form onSubmit={handleSaveModule} className="bg-gray-950 border border-amber-500/40 p-6 rounded-2xl space-y-5 shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 uppercase">
                {editingId ? 'Modifica Modulo Master' : `Nuovo Modulo Master per [${categoryName}]`}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Sottocategoria</label>
                  <input
                    type="text"
                    placeholder="Es. Audit & Diagnostica"
                    value={newSubcategory}
                    onChange={e => setNewSubcategory(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo del Modulo</label>
                  <input
                    type="text"
                    placeholder="Es. Analisi approfondita dei processi"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione del Servizio</label>
                  <textarea
                    rows={2}
                    placeholder="Dettaglio delle attività incluse nel modulo..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Input Durata senza freccine */}
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Durata Stimata (Settimane)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newWeeks}
                    onChange={e => setNewWeeks(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Input Fee e Valuta senza freccine */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Fee Standard</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newFee}
                      onChange={e => setNewFee(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Valuta</label>
                    <select
                      value={newCurrency}
                      onChange={e => setNewCurrency(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 px-3 py-2.5 rounded-xl text-white font-mono uppercase focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CHF">CHF (CHF)</option>
                    </select>
                  </div>
                </div>

                {/* Sezione Campi Personalizzati Dinamici */}
                <div className="md:col-span-2 pt-3 border-t border-gray-800 space-y-3">
                  <label className="block text-amber-400 font-bold uppercase text-[10px] tracking-wider">Campi Aggiuntivi Personalizzati</label>
                  
                  {customFields.map((cf, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-900 p-2.5 rounded-xl border border-gray-800">
                      <span className="text-gray-400 font-mono text-[11px]">{cf.label}:</span>
                      <span className="text-white font-mono text-[11px] flex-1">{cf.value}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCustomField(idx)}
                        className="text-red-400 hover:text-red-300 text-xs font-bold px-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Nome campo (es. Requisiti)"
                      value={fieldLabel}
                      onChange={e => setFieldLabel(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Valore campo"
                      value={fieldValue}
                      onChange={e => setFieldValue(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-amber-400 font-bold rounded-xl cursor-pointer"
                    >
                      + Aggiungi Campo
                    </button>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">
                  Annulla
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer">
                  {editingId ? 'Aggiorna Modulo' : 'Salva Modulo Master'}
                </button>
              </div>
            </form>
          )}

          {/* Lista Moduli Master della Categoria */}
          {categoryModules.length === 0 ? (
            <div className="p-12 text-center border border-gray-800 bg-gray-950 rounded-xl">
              <p className="text-sm text-gray-400">Nessun modulo master presente in questa categoria.</p>
              <p className="text-xs text-gray-500 mt-1">Clicca su &quot;+ Aggiungi Modulo Master&quot; per crearne uno.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryModules.map(mod => (
                <div key={mod.id} className="bg-gray-950 border border-gray-800 p-5 rounded-xl flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono uppercase bg-amber-950/60 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded font-bold tracking-wider">
                        {mod.subcategory}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenEditForm(mod)}
                          className="text-gray-400 hover:text-amber-400 text-xs font-bold cursor-pointer transition-colors"
                        >
                          ✏️ Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(mod.id)}
                          className="text-gray-500 hover:text-red-400 text-xs font-bold cursor-pointer transition-colors"
                        >
                          ✕ Rimuovi
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-extrabold text-white mt-1">{mod.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{mod.description}</p>

                    {/* Mostra campi personalizzati se presenti */}
                    {mod.customFields && mod.customFields.length > 0 && (
                      <div className="pt-2 space-y-1">
                        {mod.customFields.map((cf, idx) => (
                          <div key={idx} className="text-[11px] text-gray-300 font-mono bg-gray-900 px-2.5 py-1 rounded-lg">
                            <strong className="text-amber-400">{cf.label}:</strong> {cf.value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-800/80 flex justify-between items-center font-mono text-xs">
                    <span className="text-gray-400">⏱️ {mod.estimatedWeeks} settimane</span>
                    <span className="text-emerald-400 font-black">
                      {getCurrencySymbol(mod.currency)} {Number(mod.fee).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </main>
  );
}

export default function CategoryMasterModulesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-mono text-xs">Caricamento categoria...</div>}>
      <CategoryContent />
    </Suspense>
  );
}
