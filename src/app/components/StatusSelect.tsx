'use client';

import React from 'react';

export type EntityStatus = 'Bozza' | 'Attivo' | 'Chiuso';

interface StatusSelectProps {
  status: EntityStatus;
  onChange: (newStatus: EntityStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ status, onChange, disabled = false }: StatusSelectProps) {
  const getBadgeStyle = (currentStatus: EntityStatus) => {
    switch (currentStatus) {
      case 'Attivo':
        return 'bg-emerald-950 border-emerald-800 text-emerald-300';
      case 'Chiuso':
        return 'bg-gray-900 border-gray-700 text-gray-400';
      case 'Bozza':
      default:
        return 'bg-amber-950 border-amber-800 text-amber-300';
    }
  };

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as EntityStatus)}
      disabled={disabled}
      className={`px-3 py-1 border text-xs font-semibold rounded-lg uppercase cursor-pointer focus:outline-none transition-all ${getBadgeStyle(
        status
      )} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
    >
      <option value="Bozza" className="bg-gray-900 text-amber-300">Bozza</option>
      <option value="Attivo" className="bg-gray-900 text-emerald-300">Attivo</option>
      <option value="Chiuso" className="bg-gray-900 text-gray-400">Chiuso</option>
    </select>
  );
}
