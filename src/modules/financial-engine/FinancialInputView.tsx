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

  const totalRevenueAnno1 = products.reduce((acc, p) => acc + (p.pieces[0] * p.prices[0]), 0);
  const totalCOGSAnno1 = products.reduce((acc, p) => acc + (p.pieces[0] * p.unitCosts[0]), 0) + generalProductionCosts.reduce((acc, c) => acc + c.amounts[0], 0);
  const grossMarginAnno1 = totalRevenueAnno1 - totalCOGSAnno1;

  return (
    <div className="space-y-8">
      
      {/* BARRA SUPERIORE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white">Modello di Calcolo Prodotti, Ricavi e Costi</h3>
          <p className="text-xs text-gray-400">Gestione centralizzata dei driver di input per il piano quinquennale.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl">
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
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva & Ricalcola'}
          </button>
        </div>
      </div>

      {/* RIEPILOGO DINAMICO */}
      <div className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4">
        <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Riepilogo Sintetico (Anno 1)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Revenue ({currencySymbol})</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">{currencySymbol} {totalRevenueAnno1.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Cost of Production / COGS ({currencySymbol})</span>
            <div className="text-xl font-extrabold text-red-400 font-mono">- {currencySymbol} {totalCOGSAnno1.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Gross Margin ({currencySymbol})</span>
            <div className="text-xl font-extrabold text-amber-400 font-mono">{currencySymbol} {grossMarginAnno1.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 1. PRODUCT SOLD IN PIECES (QUANTITÀ) */}
      <div className="space-y-4 bg-gray-950 border border-gray-800 p-6 rounded-2xl">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-white">PRODUCT SOLD IN PIECES (QUANTITÀ)</h4>
          <button
            onClick={() => setProducts([...products, { name: 'Nuovo Prodotto', pieces: [500, 600, 700, 800, 900], prices: [100, 100, 100, 100, 100], unitCosts: [40, 40, 40, 40, 40] }])}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            + Aggiungi Prodotto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Prodotto</th>
                <th className="p-3 text-center">Anno 1</th>
                <th className="p-3 text-center">Anno 2</th>
                <th className="p-3 text-center">Anno 3</th>
                <th className="p-3 text-center">Anno 4</th>
                <th className="p-3 text-center">Anno 5</th>
                <th className="p-3 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {products.map((p, idx) => (
                <tr key={idx}>
                  <td className="p-3">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const updated = [...products];
                        updated[idx].name = e.target.value;
                        setProducts(updated);
                      }}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-xs"
                    />
                  </td>
                  {[0, 1, 2, 3, 4].map((yearIdx) => (
                    <td key={yearIdx} className="p-3 text-center">
                      <input
                        type="number"
                        value={p.pieces[yearIdx]}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[idx].pieces[yearIdx] = Number(e.target.value);
                          setProducts(updated);
                        }}
                        className="w-20 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setProducts(products.filter((_, i) => i !== idx))}
                      className="px-2 py-1 bg-red-950 text-red-400 text-xs rounded-lg hover:bg-red-900 cursor-pointer"
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
      <div className="space-y-4 bg-amber-950/20 border border-amber-900/50 p-6 rounded-2xl">
        <h4 className="text-sm font-bold text-amber-400">PREZZO UNITARIO ({currencySymbol})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-amber-950/40 text-amber-300 uppercase text-[10px]">
              <tr>
                <th className="p-3">Prodotto</th>
                <th className="p-3 text-center">Anno 1</th>
                <th className="p-3 text-center">Anno 2</th>
                <th className="p-3 text-center">Anno 3</th>
                <th className="p-3 text-center">Anno 4</th>
                <th className="p-3 text-center">Anno 5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-950/40">
              {products.map((p, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-medium text-white">{p.name}</td>
                  {[0, 1, 2, 3, 4].map((yearIdx) => (
                    <td key={yearIdx} className="p-3 text-center">
                      <input
                        type="number"
                        value={p.prices[yearIdx]}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[idx].prices[yearIdx] = Number(e.target.value);
                          setProducts(updated);
                        }}
                        className="w-20 bg-gray-900 border border-amber-900/50 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. COGS - COSTI DI VENDITA */}
      <div className="space-y-4 bg-gray-950 border border-gray-800 p-6 rounded-2xl">
        <h4 className="text-sm font-bold text-white">COGS — COSTI DI VENDITA (Costi Unitari di Produzione)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Prodotto</th>
                <th className="p-3 text-center">Anno 1</th>
                <th className="p-3 text-center">Anno 2</th>
                <th className="p-3 text-center">Anno 3</th>
                <th className="p-3 text-center">Anno 4</th>
                <th className="p-3 text-center">Anno 5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {products.map((p, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-medium text-white">{p.name} (Costo Unitario)</td>
                  {[0, 1, 2, 3, 4].map((yearIdx) => (
                    <td key={yearIdx} className="p-3 text-center">
                      <input
                        type="number"
                        value={p.unitCosts[yearIdx]}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[idx].unitCosts[yearIdx] = Number(e.target.value);
                          setProducts(updated);
                        }}
                        className="w-20 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MACRO CATEGORIA: OPEX */}
      <div className="space-y-4 bg-gray-950 border border-gray-800 p-6 rounded-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-bold text-white">OPEX — COSTI OPERATIVI</h4>
            <p className="text-xs text-gray-400">Aggiungi e gestisci in autonomia tutte le voci di costo operativo.</p>
          </div>
          <button
            onClick={() => setOpexItems([...opexItems, { label: 'Nuovo Costo OPEX', amounts: [10000, 10500, 11000, 11500, 12000] }])}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            + Aggiungi Voce OPEX
          </button>
        </div>

        <div className="space-y-3 pt-2">
          {opexItems.map((op, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              <input
                type="text"
                value={op.label}
                onChange={(e) => {
                  const updated = [...opexItems];
                  updated[idx].label = e.target.value;
                  setOpexItems(updated);
                }}
                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs"
              />
              {[0, 1, 2, 3, 4].map((y) => (
                <input
                  key={y}
                  type="number"
                  value={op.amounts[y]}
                  onChange={(e) => {
                    const updated = [...opexItems];
                    updated[idx].amounts[y] = Number(e.target.value);
                    setOpexItems(updated);
                  }}
                  className="w-24 bg-gray-900 border border-gray-800 rounded-lg px-2 py-2 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              ))}
              <button
                onClick={() => setOpexItems(opexItems.filter((_, i) => i !== idx))}
                className="px-2.5 py-2 bg-red-950 text-red-400 text-xs rounded-lg hover:bg-red-900 cursor-pointer"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. MACRO CATEGORIA: CAPEX */}
      <div className="space-y-4 bg-gray-950 border border-gray-800 p-6 rounded-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-bold text-white">CAPEX — INVESTIMENTI</h4>
            <p className="text-xs text-gray-400">Aggiungi e gestisci in autonomia le voci di investimento.</p>
          </div>
          <button
            onClick={() => setCapexItems([...capexItems, { label: 'Nuovo Investimento CAPEX', amounts: [20000, 0, 10000, 0, 5000] }])}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            + Aggiungi Voce CAPEX
          </button>
        </div>

        <div className="space-y-3 pt-2">
          {capexItems.map((cx, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              <input
                type="text"
                value={cx.label}
                onChange={(e) => {
                  const updated = [...capexItems];
                  updated[idx].label = e.target.value;
                  setCapexItems(updated);
                }}
                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs"
              />
              {[0, 1, 2, 3, 4].map((y) => (
                <input
                  key={y}
                  type="number"
                  value={cx.amounts[y]}
                  onChange={(e) => {
                    const updated = [...capexItems];
                    updated[idx].amounts[y] = Number(e.target.value);
                    setCapexItems(updated);
                  }}
                  className="w-24 bg-gray-900 border border-gray-800 rounded-lg px-2 py-2 text-center text-white text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              ))}
              <button
                onClick={() => setCapexItems(capexItems.filter((_, i) => i !== idx))}
                className="px-2.5 py-2 bg-red-950 text-red-400 text-xs rounded-lg hover:bg-red-900 cursor-pointer"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
