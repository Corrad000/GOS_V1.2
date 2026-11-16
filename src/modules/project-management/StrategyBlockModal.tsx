'use client';

import React, { useState } from 'react';

export interface StrategyBlock {
  id: string;
  category: 'DIAGNOSI' | 'SOLUZIONE' | 'STRATEGIA' | 'PIANO_OPERATIVO' | 'FINANZIARIO';
  title: string;
  objective: string;
  actionStep: string;
  businessImpact: string;
}

interface StrategyBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: StrategyBlock) => void;
}

export function StrategyBlockModal({ isOpen, onClose, onSave }: StrategyBlockModalProps) {
  const [category, setCategory] = useState<StrategyBlock['category']>('STRATEGIA');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [actionStep, setActionStep] = useState('');
  const [businessImpact, setBusinessImpact] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !objective.trim() || !actionStep.trim()) return;

    const newBlock: StrategyBlock = {
      id: crypto.randomUUID(),
      category,
      title: title.trim(),
      objective: objective.trim(),
      actionStep: actionStep.trim(),
      businessImpact: businessImpact.trim() || 'Ottimizzazione del KPI di riferimento e chiusura contrattuale.',
    };

    onSave(newBlock);
    // Reset form
    setTitle('');
    setObjective('');
    setActionStep('');
    setBusinessImpact('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Intestazione */}
        <div className="flex items-center justify-between border-b border-gray-900 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">Guida alla Decisione</span>
            <h3 className="text-base font-extrabold text-white uppercase tracking-tight">Nuovo Blocco di Ragionamento Strategico</h3>
            <p className="text-xs text-gray-400">Ogni blocco deve giustificare la sua utilità ai fini dello sviluppo del documento e del profitto.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white font-mono text-sm p-2 rounded-lg bg-gray-900 border border-gray-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Guidato */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Categoria di Ragionamento</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-bold cursor-pointer focus:outline-none focus:border-cyan-500"
              >
                <option value="DIAGNOSI">1) Analisi del Problema / Diagnosi</option>
                <option value="SOLUZIONE">2) Soluzione Bullet-Proof</option>
                <option value="STRATEGIA">3) Scelta Strategica</option>
                <option value="PIANO_OPERATIVO">4) Piano Operativo & Temporale</option>
                <option value="FINANZIARIO">5) Piano Finanziario & Margine</option>
              </select>
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Titolo del Blocco</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Sblocco conversione funnel di qualifica"
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 block mb-1 font-semibold">
              🎯 1. Qual è lo scopo critico? <span className="text-cyan-400 font-normal">(Perché lo stiamo inserendo?)</span>
            </label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Es. Raccogliere anagrafica profilata prima del checkout per abbassare il costo di acquisizione..."
              className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="text-gray-400 block mb-1 font-semibold">
              ⚙️ 2. Azione Operativa / Soluzione <span className="text-cyan-400 font-normal">(Cosa facciamo concretamente?)</span>
            </label>
            <textarea
              value={actionStep}
              onChange={(e) => setActionStep(e.target.value)}
              placeholder="Descrivi i passaggi sequenziali e le nazioni operative da compiere..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white resize-none"
              required
            />
          </div>

          <div>
            <label className="text-gray-400 block mb-1 font-semibold">
              📈 3. Impatto sul Business e sulla Chiusura <span className="text-cyan-400 font-normal">(Come aumenta il profitto?)</span>
            </label>
            <input
              type="text"
              value={businessImpact}
              onChange={(e) => setBusinessImpact(e.target.value)}
              placeholder="Es. Aumento del tasso di chiusura del 15% grazie al follow-up mirato sui lead anagrafici..."
              className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
            />
          </div>

          {/* Footer azioni */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 font-bold rounded-xl cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl cursor-pointer shadow-md"
            >
              Aggiungi Blocco Strategico
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
