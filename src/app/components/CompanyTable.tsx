'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnagraficaForm from './AnagraficaForm';

export interface CompanyItem {
  id: string;
  ragione_sociale: string;
  codice_azienda?: string;
  partita_iva?: string;
  advisor_nome?: string;
  advisor_ruolo?: string;
  fatturato?: number;
  contratti_attivi?: number;
  stato?: string;
}

interface CompanyTableProps {
  companies: CompanyItem[];
  title?: string;
  subtitle?: string;
  showRegisterButton?: boolean;
  fromPath?: string;
  onCompanyAdded?: () => void;
}

export function CompanyTable({
  companies,
  title = 'CONTROLLO AZIENDE',
  subtitle = 'Panoramica di tutte le aziende inserite nel database.',
  showRegisterButton = true,
  fromPath = 'admin',
  onCompanyAdded
}: CompanyTableProps) {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6 shadow-xl">
      
      {/* Visualizzazione dinamica: se si sta registrando mostra il form, altrimenti la tabella */}
      {isRegistering ? (
        <AnagraficaForm
          onSave={(newCompany) => {
            console.log('Azienda registrata in locale:', newCompany);
            setIsRegistering(false);
            if (onCompanyAdded) {
              onCompanyAdded();
            } else {
              window.location.reload();
            }
          }}
          onCancel={() => setIsRegistering(false)}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">{title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
            {showRegisterButton && (
              <button
                onClick={() => setIsRegistering(true)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                + Registra Nuova Azienda
              </button>
            )}
          </div>

          {companies.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              Nessuna azienda registrata nel database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950 uppercase text-gray-400 font-mono text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="p-4">Azienda / Codice</th>
                    <th className="p-4">Advisor Assegnato</th>
                    <th className="p-4">Fatturato Aziendale</th>
                    <th className="p-4">Contratti Attivi</th>
                    <th className="p-4">Stato</th>
                    <th className="p-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {companies.map((c) => {
                    // Lettura pulita dei dati reali senza forzature fittizie
                    const fatturatoVal = Number(c.fatturato ?? (c as any).revenue ?? 0);
                    const contrattiVal = Number(c.contratti_attivi ?? 0);

                    return (
                      <tr key={c.id} className="hover:bg-gray-850/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white text-sm">{c.ragione_sociale}</div>
                          <div className="text-[10px] font-mono text-amber-400">{c.codice_azienda || c.id}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{c.advisor_nome || 'Corrado Pinna'}</div>
                          <div className="text-[10px] text-gray-400">{c.advisor_ruolo || 'Administrator'}</div>
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                          € {fatturatoVal.toLocaleString('it-IT')}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-lg text-[10px] font-bold font-mono">
                            {contrattiVal} Attivi
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {c.stato || 'ATTIVA'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/aziende/${c.id}`}
                            className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-all inline-block cursor-pointer"
                          >
                            Dettagli
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </div>
  );
}
