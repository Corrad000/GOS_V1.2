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
  staffCostsItems: DynamicCostItem[];
  setStaffCostsItems: React.Dispatch<React.SetStateAction<DynamicCostItem[]>>;
  capexItems: DynamicCostItem[];
  setCapexItems: React.Dispatch<React.SetStateAction<DynamicCostItem[]>>;
  opexItems: DynamicCostItem[];
  setOpexItems: React.Dispatch<React.SetStateAction<DynamicCostItem[]>>;
  corporateTaxRate: number;
  setCorporateTaxRate: (val: number) => void;
  employeeTaxRate: number;
  setEmployeeTaxRate: (val: number) => void;
  depreciation: number;
  setDepreciation: (val: number) => void;
  financialIncome: number;
  setFinancialIncome: (val: number) => void;
  financialExpenses: number;
  setFinancialExpenses: (val: number) => void;
  onSave: () => void;
  saving: boolean;
}

export function FinancialInputView({
  products,
  setProducts,
  generalProductionCosts,
  setGeneralProductionCosts,
  staffCostsItems,
  setStaffCostsItems,
  capexItems,
  setCapexItems,
  opexItems,
  setOpexItems,
  corporateTaxRate,
  setCorporateTaxRate,
  employeeTaxRate,
  setEmployeeTaxRate,
  depreciation,
  setDepreciation,
  financialIncome,
  setFinancialIncome,
  financialExpenses,
  setFinancialExpenses,
  onSave,
  saving
}: FinancialInputProps) {

  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GBP' | 'CHF'>('EUR');
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : 'CHF';

  const safeProducts = products || [];
  const safeGeneralCosts = generalProductionCosts || [];
  const safeStaffCosts = staffCostsItems || [];
  const safeOpex = opexItems || [];
  const safeCapex = capexItems || [];

  // Calcoli quinquennali (Anni 1-5)
  const yearsCount = 5;
  const yearlyRevenues = Array(yearsCount).fill(0);
  const yearlyCOGS = Array(yearsCount).fill(0);
  const yearlyGrossMargin = Array(yearsCount).fill(0);

  for (let i = 0; i < yearsCount; i++) {
    safeProducts.forEach((p) => {
      const pces = Number(p?.pieces?.[i] || 0);
      const prc = Number(p?.prices?.[i] || 0);
      const uc = Number(p?.unitCosts?.[i] || 0);

      yearlyRevenues[i] += pces * prc;
      yearlyCOGS[i] += pces * uc;
    });

    safeGeneralCosts.forEach((c) => {
      yearlyCOGS[i] += Number(c?.amounts?.[i] || 0);
    });

    yearlyGrossMargin[i] = yearlyRevenues[i] - yearlyCOGS[i];
  }

  const total5YearsRevenue = yearlyRevenues.reduce((a, b) => a + b, 0);
  const total5YearsCOGS = yearlyCOGS.reduce((a, b) => a + b, 0);
  const total5YearsMargin = yearlyGrossMargin.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      
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

      {/* PARAMETRI FISCALI E SOCIETARI */}
      <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Parametri Fiscali e Societari</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] text-gray-300 font-medium">Imposta Societaria / Aziendale (Corporate Tax %)</label>
            <input
              type="number"
              value={corporateTaxRate}
              onChange={(e) => setCorporateTaxRate(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-white text-xs font-mono"
            />
            <p className="text-[10px] text-gray-500">Applicata sull'Utile Ante Tasse (EBT) quando positivo.</p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-gray-300 font-medium">Oneri & Contributi sul Personale (%)</label>
            <input
              type="number"
              value={employeeTaxRate}
              onChange={(e) => setEmployeeTaxRate(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-white text-xs font-mono"
            />
            <p className="text-[10px] text-gray-500">Percentuale aggiunta automaticamente al costo del personale.</p>
          </div>
        </div>
      </div>

      {/* RIEPILOGO QUINQUENNALE */}
      <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-gray-900 pb-2">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Resoconto Sintetico Quinquennale (Totale 5 Anni)</h4>
          <span className="text-[10px] font-mono text-gray-400">Aggiornato in tempo reale</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Totale Ricavi (5 Anni)</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">{currencySymbol} {total5YearsRevenue.toLocaleString('it-IT')}</div>
          </div>
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Totale COGS / Costi (5 Anni)</span>
            <div className="text-xl font-extrabold text-red-400 font-mono">- {currencySymbol} {total5YearsCOGS.toLocaleString('it-IT')}</div>
          </div>
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Margine Lordo Totale (5 Anni)</span>
            <div className="text-xl font-extrabold text-amber-400 font-mono">{currencySymbol} {total5YearsMargin.toLocaleString('it-IT')}</div>
          </div>
        </div>
      </div>

      {/* 1. PRODUCT SOLD IN PIECES */}
      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product Sold in Pieces (Quantità)</h4>
          <button
            onClick={() => setProducts([...safeProducts, { name: 'Nuovo Prodotto', pieces: [0, 0, 0, 0, 0], prices: [0, 0, 0, 0, 0], unitCosts: [0, 0, 0, 0, 0] }])}
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
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-center text-white text-xs font-mono"
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
                        className="w-24 bg-gray-900 border border-amber-900/40 rounded px-2 py-1 text-center text-white text-xs font-mono"
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
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-center text-white text-xs font-mono"
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

      {/* 4. COSTO DEL PERSONALE */}
      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Costo del Personale (Stipendi + Oneri)</h4>
            <p className="text-[11px] text-gray-400">Gestione strutturata delle risorse umane e dei contributi previdenziali.</p>
          </div>
          <button
            onClick={() => setStaffCostsItems([...safeStaffCosts, { label: 'Nuova Risorsa / Reparto', amounts: [25000, 26000, 27000, 28000, 29000] }])}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
          >
            + Aggiungi Voce Personale
          </button>
        </div>

        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3">Voce Personale</th>
                <th className="py-2 px-3 text-center w-28">Anno 1</th>
                <th className="py-2 px-3 text-center w-28">Anno 2</th>
                <th className="py-2 px-3 text-center w-28">Anno 3</th>
                <th className="py-2 px-3 text-center w-28">Anno 4</th>
                <th className="py-2 px-3 text-center w-28">Anno 5</th>
                <th className="py-2 px-3 text-center w-20">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {safeStaffCosts.map((sc, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={sc?.label || ''}
                      onChange={(e) => {
                        const updated = [...safeStaffCosts];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setStaffCostsItems(updated);
                      }}
                      className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs"
                    />
                  </td>
                  {[0, 1, 2, 3, 4].map((y) => (
                    <td key={y} className="py-2 px-3 text-center">
                      <input
                        type="number"
                        value={sc?.amounts?.[y] || 0}
                        onChange={(e) => {
                          const updated = [...safeStaffCosts];
                          const newAmounts = [...updated[idx].amounts] as [number, number, number, number, number];
                          newAmounts[y] = Number(e.target.value);
                          updated[idx] = { ...updated[idx], amounts: newAmounts };
                          setStaffCostsItems(updated);
                        }}
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-center text-white text-xs font-mono"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => setStaffCostsItems(safeStaffCosts.filter((_, i) => i !== idx))}
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

      {/* 5. OPEX */}
      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">OPEX — Costi Operativi</h4>
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
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-center text-white text-xs font-mono"
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

      {/* 6. CAPEX */}
      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">CAPEX — Investimenti</h4>
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
                        className="w-24 bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-center text-white text-xs font-mono"
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
