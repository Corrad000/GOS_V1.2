'use client';

import React, { useState } from 'react';

export interface ProductItem {
  name: string;
  pieces: [number, number, number, number, number];
  prices: [number, number, number, number, number];
  unitCosts: [number, number, number, number, number];
}

export interface DynamicCostItem {
  label: string;
  amounts: [number, number, number, number, number];
}

interface FinancialInputProps {
  products: ProductItem[];
  setProducts: React.Dispatch<React.SetStateAction<ProductItem[]>>;
  generalProductionCosts: DynamicCostItem[];
  setGeneralProductionCosts: React.Dispatch<React.SetStateAction<DynamicCostItem[]>>;
  capexItems: DynamicCostItem[];
  setCapexItems: React.Dispatch<React.SetStateAction<DynamicCostItem[]>>;
  opexItems: DynamicCostItem[];
  setOpexItems: React.Dispatch<React.SetStateAction<DynamicCostItem[]>>;
  otherOperatingExpenses: number;
  setOtherOperatingExpenses: (val: number) => void;
  depreciation: number;
  setDepreciation: (val: number) => void;
  financialIncome: number;
  setFinancialIncome: (val: number) => void;
  financialExpenses: number;
  setFinancialExpenses: (val: number) => void;
  corporateTaxRate: number;
  setCorporateTaxRate: (val: number) => void;
  onSave: () => void;
  saving: boolean;
}

export function FinancialInputView({
  products,
  setProducts,
  generalProductionCosts,
  setGeneralProductionCosts,
  capexItems,
  setCapexItems,
  opexItems,
  setOpexItems,
  otherOperatingExpenses,
  setOtherOperatingExpenses,
  depreciation,
  setDepreciation,
  financialIncome,
  setFinancialIncome,
  financialExpenses,
  setFinancialExpenses,
  corporateTaxRate,
  setCorporateTaxRate,
  onSave,
  saving
}: FinancialInputProps) {

  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GBP' | 'CHF'>('EUR');
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : 'CHF';

  // Protezione anti-crash con optional chaining e fallback sugli array
  const safeProducts = products || [];
  const safeGeneralCosts = generalProductionCosts || [];
  const safeOpex = opexItems || [];
  const safeCapex = capexItems || [];

  const totalRevenueAnno1 = safeProducts.reduce((acc, p) => acc + ((p?.pieces?.[0] || 0) * (p?.prices?.[0] || 0)), 0);
  const totalCOGSAnno1 = safeProducts.reduce((acc, p) => acc + ((p?.pieces?.[0] || 0) * (p?.unitCosts?.[0] || 0)), 0) + safeGeneralCosts.reduce((acc, c) => acc + (c?.amounts?.[0] || 0), 0);
  const grossMarginAnno1 = totalRevenueAnno1 - totalCOGSAnno1;

  return (
    <div className="space-y-4">
      
      {/* BARRA SUPERIORE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-gray-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white">Modello di Calcolo Prodotti, Ricavi e Costi</h3>
          <p className="text-[11px] text-gray-400">Gestione centralizzata dei driver di input per il piano quinquennale.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Valuta:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF (CHF)</option>
            </select>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva & Ricalcola'}
          </button>
        </div>
      </div>

      {/* RIEPILOGO DINAMICO */}
      <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Riepilogo Sintetico (Anno 1)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Revenue ({currencySymbol})</span>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">{currencySymbol} {totalRevenueAnno1.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Cost of Production / COGS ({currencySymbol})</span>
            <div className="text-lg font-extrabold text-red-400 font-mono">- {currencySymbol} {totalCOGSAnno1.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Gross Margin ({currencySymbol})</span>
            <div className="text-lg font-extrabold text-amber-400 font-mono">{currencySymbol} {grossMarginAnno1.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 1. PRODUCT SOLD IN PIECES (QUANTITÀ) */}
      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product Sold in Pieces (Quantità)</h4>
          <button
            onClick={() => setProducts([...safeProducts, { name: 'Nuovo Prodotto', pieces: [500, 600, 700, 800, 900], prices: [100, 100, 100, 100, 100], unitCosts: [40, 40, 40, 40, 40] }])}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
          >
            + Aggiungi Prodotto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3">Prodotto</th>
                <th className="py-2 px-3 text-center w-28">Anno 1</th>
                <th className="py-2 px-3 text-center w-28">Anno 2</th>
                <th className="py-2 px-3 text-center w-28">Anno 3</th>
                <th className="py-2 px-3 text-center w-28">Anno 4</th>
                <th className="py-2 px-3 text-center w-28">Anno 5</th>
                <th className="py-2 px-3 text-center w-20">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {safeProducts.map((p, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={p?.name || ''}
                      onChange={(e) => {
                        const updated = [...safeProducts];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setProducts(updated);
                      }}
                      className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-white text-xs"
                    />
                  </td>
                  {[0, 1, 2, 3, 4].map((yearIdx) => (
                    <td key={yearIdx} className="py-2 px-3 text-center">
                      <input
                        type="number"
                        value={p?.pieces?.[yearIdx] || 0}
                        onChange={(e) => {
                          const updated = [...safeProducts];
                          const newPieces = [...updated[idx].pieces] as [number, number, number, number, number];
                          newPieces[yearIdx] = Number(e.target.value);
                          updated[idx] = { ...updated[idx], pieces: newPieces };
                          setProducts(updated);
                        }}
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => setProducts(safeProducts.filter((_, i) => i !== idx))}
                      className="px-2 py-1 bg-red-950 text-red-400 text-xs rounded hover:bg-red-900 cursor-pointer"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. PREZZO UNITARIO */}
      <div className="space-y-3 bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Prezzo Unitario ({currencySymbol})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="bg-amber-950/30 text-amber-300 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3">Prodotto</th>
                <th className="py-2 px-3 text-center w-28">Anno 1</th>
                <th className="py-2 px-3 text-center w-28">Anno 2</th>
                <th className="py-2 px-3 text-center w-28">Anno 3</th>
                <th className="py-2 px-3 text-center w-28">Anno 4</th>
                <th className="py-2 px-3 text-center w-28">Anno 5</th>
                <th className="py-2 px-3 text-center w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-950/30">
              {safeProducts.map((p, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3 font-medium text-white">{p?.name || ''}</td>
                  {[0, 1, 2, 3, 4].map((yearIdx) => (
                    <td key={yearIdx} className="py-2 px-3 text-center">
                      <input
                        type="number"
                        value={p?.prices?.[yearIdx] || 0}
                        onChange={(e) => {
                          const updated = [...safeProducts];
                          const newPrices = [...updated[idx].prices] as [number, number, number, number, number];
                          newPrices[yearIdx] = Number(e.target.value);
                          updated[idx] = { ...updated[idx], prices: newPrices };
                          setProducts(updated);
                        }}
                        className="w-24 bg-gray-900 border border-amber-900/40 rounded px-2 py-1 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. COGS - COSTI DI VENDITA */}
      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">COGS — Costi di Vendita (Costi Unitari di Produzione)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3">Prodotto</th>
                <th className="py-2 px-3 text-center w-28">Anno 1</th>
                <th className="py-2 px-3 text-center w-28">Anno 2</th>
                <th className="py-2 px-3 text-center w-28">Anno 3</th>
                <th className="py-2 px-3 text-center w-28">Anno 4</th>
                <th className="py-2 px-3 text-center w-28">Anno 5</th>
                <th className="py-2 px-3 text-center w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {safeProducts.map((p, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3 font-medium text-white">{p?.name || ''} (Costo Unitario)</td>
                  {[0, 1, 2, 3, 4].map((yearIdx) => (
                    <td key={yearIdx} className="py-2 px-3 text-center">
                      <input
                        type="number"
                        value={p?.unitCosts?.[yearIdx] || 0}
                        onChange={(e) => {
                          const updated = [...safeProducts];
                          const newUnitCosts = [...updated[idx].unitCosts] as [number, number, number, number, number];
                          newUnitCosts[yearIdx] = Number(e.target.value);
                          updated[idx] = { ...updated[idx], unitCosts: newUnitCosts };
                          setProducts(updated);
                        }}
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MACRO CATEGORIA: OPEX */}
      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">OPEX — Costi Operativi</h4>
            <p className="text-[11px] text-gray-400">Aggiungi e gestisci in autonomia tutte le voci di costo operativo.</p>
          </div>
          <button
            onClick={() => setOpexItems([...safeOpex, { label: 'Nuovo Costo OPEX', amounts: [10000, 10500, 11000, 11500, 12000] }])}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
          >
            + Aggiungi Voce OPEX
          </button>
        </div>

        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3">Voce OPEX</th>
                <th className="py-2 px-3 text-center w-28">Anno 1</th>
                <th className="py-2 px-3 text-center w-28">Anno 2</th>
                <th className="py-2 px-3 text-center w-28">Anno 3</th>
                <th className="py-2 px-3 text-center w-28">Anno 4</th>
                <th className="py-2 px-3 text-center w-28">Anno 5</th>
                <th className="py-2 px-3 text-center w-20">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {safeOpex.map((op, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={op?.label || ''}
                      onChange={(e) => {
                        const updated = [...safeOpex];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setOpexItems(updated);
                      }}
                      className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs"
                    />
                  </td>
                  {[0, 1, 2, 3, 4].map((y) => (
                    <td key={y} className="py-2 px-3 text-center">
                      <input
                        type="number"
                        value={op?.amounts?.[y] || 0}
                        onChange={(e) => {
                          const updated = [...safeOpex];
                          const newAmounts = [...updated[idx].amounts] as [number, number, number, number, number];
                          newAmounts[y] = Number(e.target.value);
                          updated[idx] = { ...updated[idx], amounts: newAmounts };
                          setOpexItems(updated);
                        }}
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => setOpexItems(safeOpex.filter((_, i) => i !== idx))}
                      className="px-2.5 py-1.5 bg-red-950 text-red-400 text-xs rounded hover:bg-red-900 cursor-pointer"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MACRO CATEGORIA: CAPEX */}
      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">CAPEX — Investimenti</h4>
            <p className="text-[11px] text-gray-400">Aggiungi e gestisci in autonomia le voci di investimento.</p>
          </div>
          <button
            onClick={() => setCapexItems([...safeCapex, { label: 'Nuovo Investimento CAPEX', amounts: [20000, 0, 10000, 0, 5000] }])}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
          >
            + Aggiungi Voce CAPEX
          </button>
        </div>

        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3">Voce CAPEX</th>
                <th className="py-2 px-3 text-center w-28">Anno 1</th>
                <th className="py-2 px-3 text-center w-28">Anno 2</th>
                <th className="py-2 px-3 text-center w-28">Anno 3</th>
                <th className="py-2 px-3 text-center w-28">Anno 4</th>
                <th className="py-2 px-3 text-center w-28">Anno 5</th>
                <th className="py-2 px-3 text-center w-20">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {safeCapex.map((cx, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={cx?.label || ''}
                      onChange={(e) => {
                        const updated = [...safeCapex];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setCapexItems(updated);
                      }}
                      className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs"
                    />
                  </td>
                  {[0, 1, 2, 3, 4].map((y) => (
                    <td key={y} className="py-2 px-3 text-center">
                      <input
                        type="number"
                        value={cx?.amounts?.[y] || 0}
                        onChange={(e) => {
                          const updated = [...safeCapex];
                          const newAmounts = [...updated[idx].amounts] as [number, number, number, number, number];
                          newAmounts[y] = Number(e.target.value);
                          updated[idx] = { ...updated[idx], amounts: newAmounts };
                          setCapexItems(updated);
                        }}
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => setCapexItems(safeCapex.filter((_, i) => i !== idx))}
                      className="px-2.5 py-1.5 bg-red-950 text-red-400 text-xs rounded hover:bg-red-900 cursor-pointer"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
