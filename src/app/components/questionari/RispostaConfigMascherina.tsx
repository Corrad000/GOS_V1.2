'use client';

import React, { useState } from 'react';

export interface DomandaConfig {
  opzioniText: string;
  ratingMin: number;
  ratingMax: number;
  ratingLabelMin: string;
  ratingLabelMax: string;
  peso: number;
  sezioneCustom: string;
}

export const DEFAULT_DOMANDA_CONFIG: DomandaConfig = {
  opzioniText: '',
  ratingMin: 1,
  ratingMax: 5,
  ratingLabelMin: 'Minimo / Insufficiente',
  ratingLabelMax: 'Massimo / Eccellente',
  peso: 1.0,
  sezioneCustom: '',
};

export function parseOpzioniList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\n|,/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

interface RispostaConfigMascherinaProps {
  tipo: string;
  cfg: DomandaConfig;
  setCfg: React.Dispatch<React.SetStateAction<DomandaConfig>>;
}

export function RispostaConfigMascherina({
  tipo,
  cfg,
  setCfg,
}: RispostaConfigMascherinaProps) {
  const [singolaOpzione, setSingolaOpzione] = useState('');

  const setOpzioniList = (list: string[]) => {
    setCfg((prev) => ({ ...prev, opzioniText: list.join(', ') }));
  };

  const handleAggiungiSingolaOpzione = () => {
    const clean = singolaOpzione.trim();
    if (!clean) return;
    const current = parseOpzioniList(cfg.opzioniText);
    if (!current.includes(clean)) {
      setOpzioniList([...current, clean]);
    }
    setSingolaOpzione('');
  };

  const handleRimuoviOpzione = (target: string) => {
    const current = parseOpzioniList(cfg.opzioniText);
    setOpzioniList(current.filter((item) => item !== target));
  };

  if (tipo === 'section_header') {
    return (
      <div className="bg-gray-950/90 border border-orange-900/60 p-3 text-[11px] text-orange-200">
        <strong>Intestazione di Sezione:</strong> verrà salvata come titolo divisorio (peso 0).
      </div>
    );
  }

  if (tipo === 'boolean') {
    const opzioniList = parseOpzioniList(cfg.opzioniText);
    const flagSelezionato = opzioniList[0] || '';

    const handleToggleFlag = (valore: 'Sì' | 'No') => {
      if (flagSelezionato === valore) {
        setOpzioniList([]);
      } else {
        setOpzioniList([valore]);
      }
    };

    return (
      <div className="bg-gray-950/90 border border-gray-700 p-3.5 space-y-3">
        <div className="text-[10px] font-mono font-bold uppercase text-[#FF5500]">
          Impostazioni Sì / No (Flag)
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {(['Sì', 'No'] as const).map((opt) => {
            const isChecked = flagSelezionato === opt;
            return (
              <label
                key={opt}
                className={`flex items-center gap-2 px-3.5 py-2 border text-xs font-bold cursor-pointer transition ${
                  isChecked
                    ? 'bg-orange-950/40 border-[#FF5500] text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300'
                }`}
              >
                <span className="font-mono text-[#FF5500] w-5 text-center">
                  [{isChecked ? 'X' : ' '}]
                </span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleFlag(opt)}
                  className="sr-only"
                />
                <span>{opt}</span>
              </label>
            );
          })}
          <span className="text-[10px] text-gray-400">
            Opzionale: spunta la risposta predefinita o lasciala vuota
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Sezione / Sotto-gruppo (opzionale)
            </label>
            <input
              type="text"
              placeholder="Es. Controlli Interni"
              value={cfg.sezioneCustom}
              onChange={(e) => setCfg((prev) => ({ ...prev, sezioneCustom: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Peso Domanda
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={cfg.peso}
              onChange={(e) =>
                setCfg((prev) => ({ ...prev, peso: Number(e.target.value) || 0 }))
              }
              className="w-full bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-none text-white text-xs font-mono focus:outline-none focus:border-[#FF5500]"
            />
          </div>
        </div>
      </div>
    );
  }

  if (tipo === 'choice') {
    const opzioniList = parseOpzioniList(cfg.opzioniText);

    return (
      <div className="bg-gray-950/90 border border-gray-700 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-[#FF5500]">
            Set Risposte Multiple ({opzioniList.length}{' '}
            {opzioniList.length === 1 ? 'risposta' : 'risposte'})
          </span>
          <span className="text-[10px] text-gray-400">
            Scrivi una risposta e inseriscila nel set
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Scrivi una singola risposta da inserire nel set..."
            value={singolaOpzione}
            onChange={(e) => setSingolaOpzione(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAggiungiSingolaOpzione();
              }
            }}
            className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
          />
          <button
            type="button"
            onClick={handleAggiungiSingolaOpzione}
            className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shrink-0"
          >
            + Inserisci nel set
          </button>
        </div>

        {opzioniList.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {opzioniList.map((opt, idx) => (
              <span
                key={`${opt}-${idx}`}
                className="inline-flex items-center gap-2 bg-gray-900 border border-gray-700 px-2.5 py-1 text-xs text-white"
              >
                <span>{opt}</span>
                <button
                  type="button"
                  onClick={() => handleRimuoviOpzione(opt)}
                  className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                  title="Rimuovi dal set"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Sezione / Sotto-gruppo (opzionale)
            </label>
            <input
              type="text"
              placeholder="Es. Governance & Controlli"
              value={cfg.sezioneCustom}
              onChange={(e) => setCfg((prev) => ({ ...prev, sezioneCustom: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Peso Domanda
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={cfg.peso}
              onChange={(e) =>
                setCfg((prev) => ({ ...prev, peso: Number(e.target.value) || 0 }))
              }
              className="w-full bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-none text-white text-xs font-mono focus:outline-none focus:border-[#FF5500]"
            />
          </div>
        </div>
      </div>
    );
  }

  if (tipo === 'rating_1_5') {
    return (
      <div className="bg-gray-950/90 border border-gray-700 p-3.5 space-y-3">
        <div className="text-[10px] font-mono font-bold uppercase text-[#FF5500]">
          Impostazioni Valutazione / Rating ({cfg.ratingMin} – {cfg.ratingMax})
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Valore Min
            </label>
            <input
              type="number"
              value={cfg.ratingMin}
              onChange={(e) =>
                setCfg((prev) => ({ ...prev, ratingMin: Number(e.target.value) || 1 }))
              }
              className="w-full bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-none text-white text-xs font-mono focus:outline-none focus:border-[#FF5500]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Valore Max
            </label>
            <input
              type="number"
              value={cfg.ratingMax}
              onChange={(e) =>
                setCfg((prev) => ({ ...prev, ratingMax: Number(e.target.value) || 5 }))
              }
              className="w-full bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-none text-white text-xs font-mono focus:outline-none focus:border-[#FF5500]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Etichetta Min
            </label>
            <input
              type="text"
              value={cfg.ratingLabelMin}
              onChange={(e) => setCfg((prev) => ({ ...prev, ratingLabelMin: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Etichetta Max
            </label>
            <input
              type="text"
              value={cfg.ratingLabelMax}
              onChange={(e) => setCfg((prev) => ({ ...prev, ratingLabelMax: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Sezione / Sotto-gruppo (opzionale)
            </label>
            <input
              type="text"
              placeholder="Es. Controllo di Gestione"
              value={cfg.sezioneCustom}
              onChange={(e) => setCfg((prev) => ({ ...prev, sezioneCustom: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Peso Domanda
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={cfg.peso}
              onChange={(e) =>
                setCfg((prev) => ({ ...prev, peso: Number(e.target.value) || 0 }))
              }
              className="w-full bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-none text-white text-xs font-mono focus:outline-none focus:border-[#FF5500]"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950/90 border border-gray-700 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
          Sezione / Sotto-gruppo (opzionale)
        </label>
        <input
          type="text"
          placeholder="Es. Operatività & Processi"
          value={cfg.sezioneCustom}
          onChange={(e) => setCfg((prev) => ({ ...prev, sezioneCustom: e.target.value }))}
          className="w-full bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
          Peso Domanda
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          value={cfg.peso}
          onChange={(e) =>
            setCfg((prev) => ({ ...prev, peso: Number(e.target.value) || 0 }))
          }
          className="w-full bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-none text-white text-xs font-mono focus:outline-none focus:border-[#FF5500]"
        />
      </div>
    </div>
  );
}
