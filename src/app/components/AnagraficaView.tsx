'use client';

interface AnagraficaViewProps {
  company: {
    ragione_sociale?: string;
    codice_azienda?: string;
    partita_iva?: string;
    codice_fiscale?: string;
    categoria?: string;
    indirizzo?: string;
    citta?: string;
    nazione?: string;
    sito_web?: string;
    referente?: string;
    email?: string;
    telefono?: string;
    note?: string;
    advisor_nome?: string;
    fatturato?: number;
    contratti_attivi?: number;
    stato?: string;
  };
  onEdit?: () => void;
}

export function AnagraficaView({ company, onEdit }: AnagraficaViewProps) {
  // Funzione di utilità per validare l'effettiva presenza di informazioni reali
  const isValid = (val: any) => {
    if (val === undefined || val === null || val === '') return false;
    const str = String(val).trim();
    return str !== '' && str !== 'Non specificata' && str !== 'Non specificato' && str !== 'N/D';
  };

  // Creazione dinamica di tutti i possibili blocchi anagrafici
  const allFields = [
    {
      label: 'Ragione Sociale',
      value: company.ragione_sociale,
      className: 'text-sm font-bold text-white'
    },
    {
      label: 'Codice Azienda / P.IVA',
      value: [company.codice_azienda, isValid(company.partita_iva) ? company.partita_iva : null]
        .filter(Boolean)
        .join(' — '),
      className: 'text-sm font-bold text-[#FF5500] font-mono'
    },
    {
      label: 'Categoria / Settore',
      value: company.categoria,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Codice Fiscale',
      value: isValid(company.codice_fiscale) ? company.codice_fiscale : null,
      className: 'text-sm font-mono text-white'
    },
    {
      label: 'Email di Riferimento',
      value: isValid(company.email) ? company.email : null,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Telefono',
      value: isValid(company.telefono) ? company.telefono : null,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Indirizzo Sede',
      value: [company.indirizzo, company.citta, company.nazione].filter(isValid).join(', '),
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Sito Web',
      value: isValid(company.sito_web) ? company.sito_web : null,
      className: 'text-sm font-semibold text-blue-400 underline'
    },
    {
      label: 'Referente',
      value: isValid(company.referente) ? company.referente : null,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Advisor Assegnato',
      value: company.advisor_nome,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Fatturato Registrato',
      value: company.fatturato ? `€ ${Number(company.fatturato).toLocaleString('it-IT')}` : null,
      className: 'text-sm font-bold text-emerald-400 font-mono'
    },
    {
      label: 'Note / Profilo Aziendale',
      value: isValid(company.note) ? company.note : null,
      className: 'text-xs text-gray-300 whitespace-pre-line md:col-span-2'
    }
  ];

  // Filtra mantenendo unicamente i campi valorizzati e validi
  const activeFields = allFields.filter((field) => isValid(field.value));

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6 shadow-xl">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Scheda Anagrafica Azienda</h3>
          <p className="text-xs text-gray-400 mt-0.5">Informazioni societarie e dati di riferimento</p>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/50 transition-all cursor-pointer uppercase tracking-wider"
          >
            Modifica Dati
          </button>
        )}
      </div>

      {activeFields.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500 italic">
          Nessuna informazione anagrafica inserita.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {activeFields.map((field, idx) => (
            <div
              key={idx}
              className={`bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1 ${
                field.label.includes('Note') ? 'md:col-span-2' : ''
              }`}
            >
              <span className="text-gray-500 uppercase font-mono text-[10px]">{field.label}</span>
              <div className={field.className}>{field.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
