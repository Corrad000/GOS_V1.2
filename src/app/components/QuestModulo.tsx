'use client';

import { Categoria, ModuloQuestionario } from '@/app/services/questionarioService';

interface QuestModuloProps {
  selectedCategory: Categoria | null;
  modules: ModuloQuestionario[];
  loading: boolean;
  onOpenCreateModal: () => void;
  onDeleteModule: (moduleId: string) => void;
  onConfigureModule: (modulo: ModuloQuestionario) => void; // <-- Callback fondamentale per aprire l'Edit Module
}

export function QuestModulo({
  selectedCategory,
  modules,
  loading,
  onOpenCreateModal,
  onDeleteModule,
  onConfigureModule,
}: QuestModuloProps) {
  if (!selectedCategory) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono">
          2. Moduli Esistenti per: {selectedCategory.nome}
        </h3>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
        >
          + Crea Modulo Questionario
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-gray-400 font-mono">
          Caricamento moduli per {selectedCategory.nome}...
        </div>
      ) : modules.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-400 font-mono">
          Nessun modulo presente per questa categoria. Clicca su "+ Crea Modulo Questionario" per aggiungerne uno.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-4">Codice Modulo</th>
                <th className="py-3 px-4">Titolo Modulo</th>
                <th className="py-3 px-4">Versione</th>
                <th className="py-3 px-4">Stato</th>
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {modules.map((mod: any) => (
                <tr key={mod.id} className="hover:bg-gray-950/50">
                  <td className="py-3 px-4 font-mono font-bold text-[#FF5500]">
                    {mod.codice_modulo || 'QST-000'}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{mod.titolo}</td>
                  <td className="py-3 px-4 font-mono text-gray-300">{mod.versione}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                      {mod.stato}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-3">
                    <button
                      onClick={() => onConfigureModule(mod)} // <-- ORA APRE CORRETTAMENTE LA VISTA EDIT MODULE
                      className="text-amber-400 hover:text-amber-300 font-bold font-mono text-xs cursor-pointer inline-flex items-center gap-1"
                    >
                      Configura Domande →
                    </button>
                    <button
                      onClick={() => onDeleteModule(mod.id)}
                      className="text-red-400 hover:text-red-300 font-mono text-xs font-semibold cursor-pointer bg-red-950/40 hover:bg-red-950 px-2.5 py-1 rounded border border-red-900/50 transition-all"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
