'use client';

import React, { useState } from 'react';
import { StrategyBlockModal, StrategyBlock } from './StrategyBlockModal';

export interface StrategyData {
  themeAndScope: string;
  painPoints: string;
  competitorsBenchmark: string;
  currentProductAsIs: string;
  ourProposedStrategy: string;
  // Aggiungiamo i blocchi strutturati alla strategia
  strategicBlocks?: StrategyBlock[];
}

interface StrategyEntryProps {
  strategy: StrategyData;
  setStrategy: React.Dispatch<React.SetStateAction<StrategyData>>;
  onSave: () => void;
  saving: boolean;
}

export function StrategyEntryView({
  strategy,
  setStrategy,
  onSave,
  saving
}: StrategyEntryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const safeStrategy = strategy || {
    themeAndScope: '',
    painPoints: '',
    competitorsBenchmark: '',
    currentProductAsIs: '',
    ourProposedStrategy: '',
    strategicBlocks: []
  };

  const handleChange = (field: keyof StrategyData, value: any) => {
    setStrategy((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveNewBlock = (newBlock: StrategyBlock) => {
    const currentBlocks = safeStrategy.strategicBlocks || [];
    handleChange('strategicBlocks', [...currentBlocks, newBlock]);
  };

  const handleDeleteBlock = (blockId: string) => {
    const currentBlocks = safeStrategy.strategicBlocks || [];
    handleChange('strategicBlocks', currentBlocks.filter(b => b.id !== blockId));
  };

  const getCategoryBadgeStyle = (cat: StrategyBlock['category']) => {
    switch(cat) {
      case 'DIAGNOSI': return 'bg-red-950 text-red-400 border-red-900';
      case 'SOLUZIONE': return 'bg-emerald-950 text-emerald-400 border-emerald-900';
      case 'STRATEGIA': return 'bg-cyan-950 text-cyan-400 border-cyan-900';
      case 'PIANO_OPERATIVO': return 'bg-amber-950 text-amber-400 border-amber-900';
      case 'FINANZIARIO': return 'bg-indigo-950 text-indigo-400 border-indigo-900';
      default: return 'bg-gray-900 text-gray-400 border-gray-800';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      
      {/* BARRA SUPERIORE INTRODUTTIVA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">Manifesto & Analisi Strategica di Progetto</h3>
          <p className="text-xs text-gray-400 mt-1">
            Sezione descrittiva e qualitativa. Definisci il contesto industriale, i pain points, il benchmark competitivo e la proposta di valore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md uppercase tracking-wider flex-shrink-0"
          >
            + Aggiungi Blocco Ragionato
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 uppercase tracking-wider flex-shrink-0"
          >
            {saving ? 'Salvataggio...' : 'Salva Strategia'}
          </button>
        </div>
      </div>

      {/* --- SEZIONE BLOCCHI DI RAGIONAMENTO STRATEGICO AGGIUNTI --- */}
      {safeStrategy.strategicBlocks && safeStrategy.strategicBlocks.length > 0 && (
        <div className="bg-gray-900/90 border border-cyan-500/30 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">Ingegneria di Progetto</span>
              <h4 className="text-sm font-extrabold text-white uppercase tracking-tight">Blocchi di Ragionamento Guidato ({safeStrategy.strategicBlocks.length})</h4>
            </div>
            <span className="text-xs font-mono text-gray-400">Punti focalizzati alla chiusura e profitto</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeStrategy.strategicBlocks.map((block) => (
              <div key={block.id} className="bg-gray-950 border border-gray-800 p-5 rounded-xl space-y-3 relative group shadow-lg flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded border ${getCategoryBadgeStyle(block.category)}`}>
                      {block.category}
                    </span>
                    <button 
                      onClick={() => handleDeleteBlock(block.id)}
                      className="text-gray-500 hover:text-red-400 text-xs font-bold cursor-pointer"
                      title="Elimina blocco"
                    >
                      ✕
                    </button>
                  </div>
                  <h5 className="text-sm font-bold text-white tracking-tight">{block.title}</h5>
                  
                  <div className="space-y-1.5 text-xs pt-1 border-t border-gray-900">
                    <p className="text-gray-300">
                      <strong className="text-cyan-400 font-mono text-[10px] uppercase block">Scopo & Obiettivo:</strong> 
                      {block.objective}
                    </p>
                    <p className="text-gray-300">
                      <strong className="text-amber-400 font-mono text-[10px] uppercase block">Azione Operativa:</strong> 
                      {block.actionStep}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-900 text-[11px] text-emerald-400 font-mono">
                  📈 <strong>Impatto:</strong> {block.businessImpact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEZIONE 1: IL TEMA E IL PERIMETRO */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono text-xs font-bold">01</span>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">Il Tema e il Perimetro del Progetto (The Core Thesis)</h4>
            <p className="text-[11px] text-gray-400">Inquadra la sfida strategica centrale ed esplicita chiaramente cosa rientra e cosa è escluso dal mandato.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 block">Analisi discorsiva del tema centrale ed esclusioni di perimetro (Scope Exclusions):</label>
          <textarea
            rows={5}
            value={safeStrategy.themeAndScope}
            onChange={(e) => handleChange('themeAndScope', e.target.value)}
            placeholder="Es. Il progetto affronta la transizione del cliente verso un modello di business scalabile. Si precisa che l'attività esclude espressamente la gestione legale ordinaria e il recupero crediti..."
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs font-sans focus:outline-none focus:border-amber-500/50 transition-all leading-relaxed"
          />
        </div>
      </div>

      {/* SEZIONE 2: PAIN POINTS */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono text-xs font-bold">02</span>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">Analisi dei Pain Points (Colli di bottiglia)</h4>
            <p className="text-[11px] text-gray-400">Quali sono le inefficienze strutturali o operative che bloccano l'azienda oggi e quali i rischi futuri?</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 block">Descrizione dei punti critici e impatto economico/operativo:</label>
          <textarea
            rows={5}
            value={safeStrategy.painPoints}
            onChange={(e) => handleChange('painPoints', e.target.value)}
            placeholder="Es. Margini operativi erosi da costi fissi non ottimizzati, assenza di un processo strutturato di acquisizione lead, dipendenza eccessiva da pochi clienti storici..."
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs font-sans focus:outline-none focus:border-amber-500/50 transition-all leading-relaxed"
          />
        </div>
      </div>

      {/* SEZIONE 3: COMPETITOR E BENCHMARK */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono text-xs font-bold">03</span>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">Analisi dei Competitor & Benchmark di Mercato</h4>
            <p className="text-[11px] text-gray-400">Come si muovono i concorrenti, quali soluzioni adottano e dove il mercato attuale lascia uno spazio vuoto.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 block">Mappatura concorrenza e limiti delle soluzioni esistenti:</label>
          <textarea
            rows={5}
            value={safeStrategy.competitorsBenchmark}
            onChange={(e) => handleChange('competitorsBenchmark', e.target.value)}
            placeholder="Es. I principali competitor offrono soluzioni generaliste e poco flessibili. Il vuoto di mercato risiede nella possibilità di offrire un servizio sartoriale con marginalità elevata..."
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs font-sans focus:outline-none focus:border-amber-500/50 transition-all leading-relaxed"
          />
        </div>
      </div>

      {/* SEZIONE 4: PRODOTTO / SERVIZIO ATTUALE (AS-IS) */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono text-xs font-bold">04</span>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wide">Analisi dell'Offerta Attuale (As-Is Product / Service)</h4>
            <p className="text-[11px] text-gray-400">Valutazione dei pro, dei contro e del posizionamento percepito oggi dal mercato.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 block">Pro, contro e posizionamento attuale dell'azienda:</label>
          <textarea
            rows={5}
            value={safeStrategy.currentProductAsIs}
            onChange={(e) => handleChange('currentProductAsIs', e.target.value)}
            placeholder="Es. Il catalogo prodotti attuale gode di ottima reputazione tecnica (Pro), ma sconta una comunicazione inadeguata e un disallineamento dei prezzi rispetto al valore percepito (Contro)..."
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs font-sans focus:outline-none focus:border-amber-500/50 transition-all leading-relaxed"
          />
        </div>
      </div>

      {/* SEZIONE 5: LA NOSTRA PROPOSTA STRATEGICA (TO-BE) */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-amber-950/20 border border-amber-500/30 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono text-xs font-bold">05</span>
          <div>
            <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wide">La Nostra Proposta Strategica (To-Be Solution)</h4>
            <p className="text-[11px] text-gray-400">Il cuore della consulenza: la nuova value proposition, le azioni chiave e il posizionamento finale.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300 block">Value Proposition, azioni strategiche e nuovo posizionamento:</label>
          <textarea
            rows={6}
            value={safeStrategy.ourProposedStrategy}
            onChange={(e) => handleChange('ourProposedStrategy', e.target.value)}
            placeholder="Es. Introduzione del nuovo modello di offerta, ridefinizione dei listini, attivazione del canale commerciale con incentivi flessibili e posizionamento da premium partner..."
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs font-sans focus:outline-none focus:border-amber-500/50 transition-all leading-relaxed"
          />
        </div>
      </div>

      {/* MODALE DI INSERIMENTO GUIDATO DEL BLOCCO STRATEGICO */}
      <StrategyBlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNewBlock}
      />

    </div>
  );
}
