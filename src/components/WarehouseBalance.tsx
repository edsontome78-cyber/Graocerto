/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Warehouse, TrendingDown, RefreshCw, ChevronDown, ChevronUp, Sliders, Scale, AlertCircle, Info, FileSpreadsheet, FileDown, History, Search, Calendar, Container, Truck } from 'lucide-react';
import { GrainType, GRAIN_PRESETS, FarmerReport } from '../types';
import { downloadRomaneioPDF, downloadWarehouseStatementPDF, LedgerEntry } from '../utils/pdfGenerator';

interface WarehouseBalanceProps {
  reports: FarmerReport[];
  currentUserPlan?: 'CORRETOR' | 'PRODUTOR';
}

export default function WarehouseBalance({ reports, currentUserPlan = 'PRODUTOR' }: WarehouseBalanceProps) {
  const [stockTransactions, setStockTransactions] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('graocert_stock_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawGrain, setWithdrawGrain] = useState<GrainType>('SOJA');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // States for warehouse ledger filters and display
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'ALL' | 'ENTRADA' | 'SAIDA'>('ALL');
  const [ledgerGrainFilter, setLedgerGrainFilter] = useState<'ALL' | GrainType>('ALL');
  const [showLedgerSection, setShowLedgerSection] = useState(true);

  // Get compiled entries of active warehouse movement (entradas and saídas after latest cuts/resets)
  const getActiveLedgerEntries = (): LedgerEntry[] => {
    const ledger: LedgerEntry[] = [];

    // 1. Process active reports (Entradas)
    (Object.keys(GRAIN_PRESETS) as GrainType[]).forEach(grain => {
      const grainResets = stockTransactions.filter(
        (t: any) => t.type === 'RESET' && (t.grainType === 'ALL' || t.grainType === grain)
      );
      
      let latestResetDate = 0;
      if (grainResets.length > 0) {
        const dates = grainResets.map((r: any) => new Date(r.date).getTime());
        latestResetDate = Math.max(...dates);
      }

      const activeReports = reports.filter(r => {
        if (r.sample.grainType !== grain) return false;
        const rTime = new Date(r.date).getTime();
        return rTime > latestResetDate;
      });

      activeReports.forEach(r => {
        ledger.push({
          id: r.id || `rep_${r.reportNumber}`,
          date: r.date,
          type: 'ENTRADA',
          grainType: r.sample.grainType,
          identifier: `Laudo #${String(r.reportNumber).padStart(5, '0')}`,
          vehiclePlate: r.vehiclePlate,
          entityName: r.farmerName,
          grossWeight: r.sample.totalWeight,
          discounts: r.result?.totalDiscounts || 0,
          netWeight: r.result?.finalNetWeight || 0,
          notes: r.notes || '',
        });
      });
    });

    // 2. Process active withdrawals (Saídas)
    (Object.keys(GRAIN_PRESETS) as GrainType[]).forEach(grain => {
      const grainResets = stockTransactions.filter(
        (t: any) => t.type === 'RESET' && (t.grainType === 'ALL' || t.grainType === grain)
      );
      
      let latestResetDate = 0;
      if (grainResets.length > 0) {
        const dates = grainResets.map((r: any) => new Date(r.date).getTime());
        latestResetDate = Math.max(...dates);
      }

      const activeWithdrawals = stockTransactions.filter((t: any) => {
        if (t.type !== 'WITHDRAWAL') return false;
        if (t.grainType !== grain) return false;
        const tTime = new Date(t.date).getTime();
        return tTime > latestResetDate;
      });

      activeWithdrawals.forEach((w: any) => {
        ledger.push({
          id: w.id,
          date: w.date,
          type: 'SAIDA',
          grainType: w.grainType,
          identifier: `Saída de Silo`,
          entityName: w.notes || 'Retirada de Estoque Geral',
          grossWeight: w.amount,
          discounts: 0,
          netWeight: w.amount,
          notes: w.notes || '',
        });
      });
    });

    // Sort: newest first
    return ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handlePrintRomaneio = (item: LedgerEntry) => {
    if (item.type === 'ENTRADA') {
      const originalReport = reports.find(r => r.id === item.id || `rep_${r.reportNumber}` === item.id);
      if (originalReport) {
        downloadRomaneioPDF(originalReport, 'ENTRADA');
      } else {
        // Fallback reconstructed
        const mockReport = {
          reportNumber: parseInt(item.identifier.replace(/\D/g, '')) || 99999,
          date: item.date,
          farmerName: item.entityName || 'Produtor Rural',
          farmName: 'Fazenda Geral',
          cityState: 'Local / SP',
          vehiclePlate: item.vehiclePlate || 'N/A',
          operatorName: 'Técnico de Balança',
          sample: { grainType: item.grainType, totalWeight: item.grossWeight, moisture: 14, impurityGrams: 0, damagedGrams: 0, brokenGrams: 0 },
          result: { totalDiscounts: item.discounts, finalNetWeight: item.netWeight, discountMoistureWeight: 0, discountImpurityWeight: 0, discountDamagedWeight: 0, discountBrokenWeight: 0, moisturePercent: 14, impurityPercent: 0, damagedPercent: 0, brokenPercent: 0, classificationGrade: 'PADRÃO' }
        };
        downloadRomaneioPDF(mockReport, 'ENTRADA');
      }
    } else if (item.type === 'SAIDA') {
      const originalTx = stockTransactions.find((t: any) => t.id === item.id);
      if (originalTx) {
        downloadRomaneioPDF(originalTx, 'SAIDA');
      } else {
        // Fallback reconstructed
        const mockTx = {
          id: item.id,
          grainType: item.grainType,
          amount: item.grossWeight,
          date: item.date,
          notes: item.entityName || 'Retirada de Estoque'
        };
        downloadRomaneioPDF(mockTx, 'SAIDA');
      }
    }
  };

  // Calculate net balance for a specific grain, considering the latest reset transaction
  const getAdjustedBalance = (grain: GrainType) => {
    const grainResets = stockTransactions.filter(
      t => t.type === 'RESET' && (t.grainType === 'ALL' || t.grainType === grain)
    );
    
    let latestResetDate = 0;
    if (grainResets.length > 0) {
      const dates = grainResets.map(r => new Date(r.date).getTime());
      latestResetDate = Math.max(...dates);
    }

    const activeReports = reports.filter(r => {
      if (r.sample.grainType !== grain) return false;
      const rTime = new Date(r.date).getTime();
      return rTime > latestResetDate;
    });

    const reportsSum = activeReports.reduce((acc, r) => acc + (r.result?.finalNetWeight || 0), 0);

    const activeWithdrawals = stockTransactions.filter(t => {
      if (t.type !== 'WITHDRAWAL') return false;
      if (t.grainType !== grain) return false;
      const tTime = new Date(t.date).getTime();
      return tTime > latestResetDate;
    });

    const withdrawalsSum = activeWithdrawals.reduce((acc, w) => acc + w.amount, 0);

    return Math.max(0, reportsSum - withdrawalsSum);
  };

  const currentAdjustedSoja = getAdjustedBalance('SOJA');
  const currentAdjustedMilho = getAdjustedBalance('MILHO');
  const currentAdjustedSorgo = getAdjustedBalance('SORGO');
  const totalAdjustedStock = currentAdjustedSoja + currentAdjustedMilho + currentAdjustedSorgo;

  const getActiveDiscounts = () => {
    let sum = 0;
    (Object.keys(GRAIN_PRESETS) as GrainType[]).forEach(grain => {
      const grainResets = stockTransactions.filter(
        t => t.type === 'RESET' && (t.grainType === 'ALL' || t.grainType === grain)
      );
      let latestResetDate = 0;
      if (grainResets.length > 0) {
        const dates = grainResets.map(r => new Date(r.date).getTime());
        latestResetDate = Math.max(...dates);
      }
      const activeReports = reports.filter(r => {
        if (r.sample.grainType !== grain) return false;
        const rTime = new Date(r.date).getTime();
        return rTime > latestResetDate;
      });
      sum += activeReports.reduce((acc, r) => acc + (r.result?.totalDiscounts || 0), 0);
    });
    return sum;
  };

  const getActiveReportsCount = () => {
    let count = 0;
    (Object.keys(GRAIN_PRESETS) as GrainType[]).forEach(grain => {
      const grainResets = stockTransactions.filter(
        t => t.type === 'RESET' && (t.grainType === 'ALL' || t.grainType === grain)
      );
      let latestResetDate = 0;
      if (grainResets.length > 0) {
        const dates = grainResets.map(r => new Date(r.date).getTime());
        latestResetDate = Math.max(...dates);
      }
      const activeReports = reports.filter(r => {
        if (r.sample.grainType !== grain) return false;
        const rTime = new Date(r.date).getTime();
        return rTime > latestResetDate;
      });
      count += activeReports.length;
    });
    return count;
  };

  const handleResetWarehouse = (grain: GrainType | 'ALL') => {
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'RESET',
      grainType: grain,
      amount: 0,
      date: new Date().toISOString(),
      notes: grain === 'ALL' ? 'Zeramento geral de estoque do armazém.' : `Zeramento de estoque da cultura: ${grain}.`
    };
    const updated = [...stockTransactions, newTx];
    setStockTransactions(updated);
    localStorage.setItem('graocert_stock_transactions', JSON.stringify(updated));
    setShowConfirmReset(false);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-3 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-4">
        <div>
          <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-700" />
            Saldo Total do Armazém
          </h4>
          <p className="text-xs text-stone-500">Controle de estoque de grãos em tempo real pós-descontos.</p>
        </div>
        <span className="bg-emerald-100 text-emerald-850 px-3 py-1 rounded-full text-xs font-bold font-sans">
          Estoque Ativado
        </span>
      </div>

      {currentUserPlan === 'CORRETOR' ? (
        <div className="bg-stone-50/50 rounded-xl border border-dashed border-stone-250 p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-700 border border-amber-200 animate-pulse">
            <Warehouse className="w-6 h-6" />
          </div>
          <div className="space-y-1.5Packed">
            <h5 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">Módulo de Estoque Bloqueado</h5>
            <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
              Seu plano atual é o <strong>Plano Corretor</strong>. O controle de estoque, saldos de silos e histórico de entradas/saídas estão disponíveis exclusivamente no <strong>Plano Produtor</strong>.
            </p>
          </div>
          <div className="bg-amber-100/50 border border-amber-250 p-2.5 text-xs text-amber-800 font-bold w-full max-w-md uppercase tracking-wider rounded text-center">
            🚫 Entrada e Saída de Estoque Bloqueados
          </div>
        </div>
      ) : (
        <>
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-stone-50 border border-stone-150 p-4 rounded-xl text-center" title="Cargas ativas após o último zeramento">
              <span className="block text-[10px] text-stone-500 font-sans uppercase font-bold tracking-wider">Cargas Registradas</span>
              <span className="text-2xl font-black font-mono text-stone-850">{getActiveReportsCount()}</span>
            </div>
            <div className="bg-amber-50/40 border border-amber-100 p-4 rounded-xl text-center" title="Descontos acumulados nas cargas ativas">
              <span className="block text-[10px] text-amber-700 font-sans uppercase font-bold tracking-wider">Descontos Aplicados</span>
              <span className="text-xl font-black font-mono text-amber-800">
                -{Math.round(getActiveDiscounts()).toLocaleString('pt-BR')} <span className="text-xs">kg</span>
              </span>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-150 p-4 rounded-xl text-center" title="Saldo líquido de grãos atualmente no armazém">
              <span className="block text-[10px] text-emerald-700 font-sans uppercase font-bold tracking-wider">Saldo Líquido Total</span>
              <span className="text-xl font-black font-mono text-emerald-800">
                {Math.round(totalAdjustedStock).toLocaleString('pt-BR')} <span className="text-xs">kg</span>
              </span>
            </div>
          </div>

          {/* Grain Breakdown Balance */}
          <div className="space-y-3 pt-2">
            <h5 className="text-xs text-stone-700 font-extrabold uppercase tracking-wider">Estoque por Cultura</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(GRAIN_PRESETS) as GrainType[]).map((key) => {
                const config = GRAIN_PRESETS[key];
                const grainNet = getAdjustedBalance(key);
                
                const grainResets = stockTransactions.filter(
                  t => t.type === 'RESET' && (t.grainType === 'ALL' || t.grainType === key)
                );
                let latestResetDate = 0;
                if (grainResets.length > 0) {
                  const dates = grainResets.map(r => new Date(r.date).getTime());
                  latestResetDate = Math.max(...dates);
                }
                const activeReports = reports.filter(r => {
                  if (r.sample.grainType !== key) return false;
                  const rTime = new Date(r.date).getTime();
                  return rTime > latestResetDate;
                });
                const grainCount = activeReports.length;

                // Percentage relative to total warehouse nets (fallback to 0)
                const percentOfTotal = totalAdjustedStock > 0 ? Math.min(100, Math.round((grainNet / totalAdjustedStock) * 100)) : 0;

                return (
                  <div key={key} className="bg-stone-50 border border-stone-200 p-4 rounded-xl flex flex-col justify-between gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{config.emoji}</span>
                        <div>
                          <span className="font-extrabold text-sm text-stone-800 block">{config.name}</span>
                          <span className="text-[10px] text-stone-400 font-mono block">({grainCount} {grainCount === 1 ? 'carga' : 'cargas'})</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right font-mono text-lg font-black text-stone-900 border-t border-stone-100 pt-2">
                      {Math.round(grainNet).toLocaleString('pt-BR')} <span className="text-xs font-normal text-stone-500">kg</span>
                    </div>

                    {/* Representation progress bar */}
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${grainCount > 0 ? percentOfTotal || 5 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock Operations controls */}
          <div className="space-y-4 pt-2 border-t border-stone-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="btn-withdraw-stock"
                type="button"
                onClick={() => {
                  setShowWithdrawForm(!showWithdrawForm);
                  setShowConfirmReset(false);
                  setWithdrawError(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-904 font-bold text-xs uppercase tracking-wider rounded-xl transition border border-stone-200 cursor-pointer shadow-sm"
              >
                <TrendingDown className="w-4 h-4 text-amber-700" />
                Registrar Retirada de Estoque (Saída)
              </button>
              <button
                id="btn-reset-stock"
                type="button"
                onClick={() => {
                  setShowConfirmReset(!showConfirmReset);
                  setShowWithdrawForm(false);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs uppercase tracking-wider rounded-xl transition border border-red-150 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Zerar Saldos de Silos
              </button>
            </div>

            {/* Withdraw Form slide-down */}
            {showWithdrawForm && (
              <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl space-y-4 animate-fade-in font-sans text-xs">
                <div className="flex justify-between items-center border-b border-stone-250 pb-2">
                  <h6 className="font-extrabold text-stone-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <TrendingDown className="w-4 h-4 text-amber-700" />
                    Solicitar Retirada de Produto
                  </h6>
                  <button 
                    type="button" 
                    onClick={() => setShowWithdrawForm(false)} 
                    className="text-stone-400 hover:text-stone-650 font-bold transition text-xs p-1.5 hover:bg-stone-200 rounded-lg cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Cultura / Silo</label>
                    <select
                      value={withdrawGrain}
                      onChange={(e) => {
                        setWithdrawGrain(e.target.value as GrainType);
                        setWithdrawError(null);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                      <option value="SOJA">🌱 Soja (Disp: {Math.round(currentAdjustedSoja).toLocaleString('pt-BR')} kg)</option>
                      <option value="MILHO">🌽 Milho (Disp: {Math.round(currentAdjustedMilho).toLocaleString('pt-BR')} kg)</option>
                      <option value="SORGO">🌾 Sorgo (Disp: {Math.round(currentAdjustedSorgo).toLocaleString('pt-BR')} kg)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Quantidade para Retirar (kg)</label>
                    <input
                      type="number"
                      placeholder="Ex: 500"
                      value={withdrawAmount}
                      onChange={(e) => {
                        setWithdrawAmount(e.target.value);
                        setWithdrawError(null);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Motivação / Transportadora / Destinatário</label>
                  <input
                    type="text"
                    placeholder="Ex: Venda local comercial, lotes de expedição, transferência..."
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {withdrawError && (
                  <p className="text-xs text-red-650 font-semibold bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{withdrawError}</span>
                  </p>
                )}

                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawForm(false)}
                    className="p-2 px-4 bg-white hover:bg-stone-100 text-stone-650 border border-stone-200 rounded-lg font-bold text-xs transition cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const amt = Math.floor(parseFloat(withdrawAmount));
                      if (isNaN(amt) || amt <= 0) {
                        setWithdrawError('Digite uma quantidade válida em quilogramas (kg).');
                        return;
                      }
                      const currentBal = getAdjustedBalance(withdrawGrain);
                      if (amt > currentBal) {
                        setWithdrawError(`Estoque insuficiente! Saldo disponível de ${Math.round(currentBal).toLocaleString('pt-BR')} kg.`);
                        return;
                      }

                      // Save transaction
                      const newTx = {
                        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                        type: 'WITHDRAWAL',
                        grainType: withdrawGrain,
                        amount: amt,
                        date: new Date().toISOString(),
                        notes: withdrawNote || 'Retirada manual de produto.'
                      };
                      const updated = [...stockTransactions, newTx];
                      setStockTransactions(updated);
                      localStorage.setItem('graocert_stock_transactions', JSON.stringify(updated));

                      // Reset form
                      setWithdrawAmount('');
                      setWithdrawNote('');
                      setShowWithdrawForm(false);
                    }}
                    className="p-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-md"
                  >
                    Confirmar Saída
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Reset Dialog */}
            {showConfirmReset && (
              <div className="bg-red-50 border border-red-150 p-4 rounded-xl space-y-3 font-sans text-xs">
                <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-red-650" />
                  <span>Deseja realmente zerar os saldos de estoque do armazém?</span>
                </div>
                <p className="text-red-650 leading-relaxed">
                  Esta ação é irreversível e marcará um ponto de corte (corte de safra). O estoque corrente de grãos será zerado. Seus laudos salvos e relatórios no Arquivo Central NÃO serão perdidos.
                </p>
                
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => handleResetWarehouse('ALL')}
                    className="flex-1 min-w-[90px] p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-sm text-center"
                  >
                    Zerar Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetWarehouse('SOJA')}
                    className="flex-1 min-w-[90px] p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-sm text-center"
                  >
                    Silo Soja
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetWarehouse('MILHO')}
                    className="flex-1 min-w-[90px] p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-sm text-center"
                  >
                    Silo Milho
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetWarehouse('SORGO')}
                    className="flex-1 min-w-[90px] p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-sm text-center"
                  >
                    Silo Sorgo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="p-2 px-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. SEÇÃO DE MOVIMENTAÇÕES E ROMANEIOS DE BALANÇA */}
          <div className="pt-6 border-t border-stone-150 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div 
                onClick={() => setShowLedgerSection(!showLedgerSection)}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <History className="w-5 h-5 text-emerald-800" />
                <div>
                  <h5 className="text-xs font-extrabold text-stone-850 uppercase tracking-wider flex items-center gap-2">
                    Movimentações & Romaneios de Balança
                    {showLedgerSection ? <ChevronUp className="w-3.5 h-3.5 text-stone-500" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
                  </h5>
                  <p className="text-[10px] text-stone-500 mt-0.5">Dossiê de fluxo de grãos (entradas/saídas) e impressão de romaneios de balança.</p>
                </div>
              </div>

              {/* Top report actions buttons */}
              <button
                type="button"
                onClick={() => {
                  const filtered = getActiveLedgerEntries();
                  downloadWarehouseStatementPDF(filtered);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl transition text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-sm ml-auto sm:ml-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Extrato Geral (PDF)
              </button>
            </div>

            {showLedgerSection && (
              <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden text-xs">
                {/* Filters Row */}
                <div className="bg-stone-100 p-3.5 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-stone-500 mr-2">Tipo de Fluxo:</span>
                    <button
                      type="button"
                      onClick={() => setLedgerTypeFilter('ALL')}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${
                        ledgerTypeFilter === 'ALL'
                          ? 'bg-stone-800 border-stone-800 text-white'
                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerTypeFilter('ENTRADA')}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${
                        ledgerTypeFilter === 'ENTRADA'
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      🟢 Entradas
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerTypeFilter('SAIDA')}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${
                        ledgerTypeFilter === 'SAIDA'
                          ? 'bg-red-700 border-red-700 text-white'
                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      🔴 Saídas
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto font-sans">
                    <span className="text-[10px] uppercase font-bold text-stone-500 shrink-0">Cultura:</span>
                    <select
                      value={ledgerGrainFilter}
                      onChange={(e) => setLedgerGrainFilter(e.target.value as any)}
                      className="text-[11px] p-1.5 px-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-none text-stone-700 font-bold shrink-0"
                    >
                      <option value="ALL">Todas</option>
                      <option value="SOJA">🌱 Soja</option>
                      <option value="MILHO">🌽 Milho</option>
                      <option value="SORGO">🌾 Sorgo</option>
                    </select>
                  </div>
                </div>

                {/* Ledger Listing */}
                <div className="divide-y divide-stone-200 max-h-[380px] overflow-y-auto">
                  {(() => {
                    const rawEntries = getActiveLedgerEntries();
                    const filtered = rawEntries.filter(entry => {
                      if (ledgerTypeFilter !== 'ALL' && entry.type !== ledgerTypeFilter) return false;
                      if (ledgerGrainFilter !== 'ALL' && entry.grainType !== ledgerGrainFilter) return false;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center text-stone-500">
                          <Container className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                          <p className="font-semibold text-xs text-stone-700">Nenhum registro de fluxo encontrado</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">Tente reajustar seus filtros de busca ou adicione novos laudos de entrada.</p>
                        </div>
                      );
                    }

                    return filtered.map((item) => {
                      const grainConfig = GRAIN_PRESETS[item.grainType as GrainType] || { emoji: '🌾', name: item.grainType };
                      const isEntry = item.type === 'ENTRADA';
                      const formattedDate = new Date(item.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      }) + ' ' + new Date(item.date).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={item.id} className="p-4 hover:bg-stone-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition">
                          <div className="space-y-1 w-full md:w-auto">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isEntry 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {isEntry ? '🟢 Entrada' : '🔴 Saída'}
                              </span>
                              <span className="font-bold text-stone-700 flex items-center gap-1">
                                {grainConfig.emoji} {grainConfig.name}
                              </span>
                              <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                                {formattedDate}
                              </span>
                            </div>

                            <div className="text-[10px] text-stone-500 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <span className="text-stone-700">
                                <strong className="font-bold text-stone-800">{isEntry ? 'Laudo / Produtor:' : 'Motivo / Destino:'}</strong>{' '}
                                {item.entityName}
                              </span>
                              {item.vehiclePlate && (
                                <span className="inline-flex items-center gap-1 font-mono text-stone-600">
                                  <Truck className="w-3 h-3 text-stone-400" /> Placa: {(item.vehiclePlate).toUpperCase()}
                                </span>
                              )}
                              <span className="text-stone-500 font-mono text-[10px]">
                                ID: #{item.id.replace('tx_', '')}
                              </span>
                            </div>
                          </div>

                          {/* Mass Weights Summary and print button */}
                          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 border-stone-200/60 pt-3 md:pt-0">
                            <div className="grid grid-cols-3 gap-3 md:gap-4 text-center md:text-right">
                              <div>
                                <span className="block text-[8px] uppercase font-bold text-stone-400 tracking-wider">P. Bruto</span>
                                <span className="font-mono font-bold text-stone-800 text-[11px]">
                                  {Math.round(item.grossWeight).toLocaleString('pt-BR')} kg
                                </span>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase font-bold text-stone-400 tracking-wider">Descontos</span>
                                <span className="font-mono font-bold text-red-650 text-[11px]">
                                  {item.discounts > 0 ? `-${Math.round(item.discounts).toLocaleString('pt-BR')} kg` : '0 kg'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase font-bold text-stone-400 tracking-wider font-sans">P. Líquido</span>
                                <span className="font-mono font-black text-emerald-800 text-[11px]">
                                  {Math.round(item.netWeight).toLocaleString('pt-BR')} kg
                                </span>
                              </div>
                            </div>

                            <button
                              id={`btn-print-romaneio-${item.id}`}
                              type="button"
                              onClick={() => handlePrintRomaneio(item)}
                              className="inline-flex items-center gap-1.5 py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 border border-stone-200 hover:border-emerald-300 rounded-xl transition text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-sm shrink-0"
                              title="Gerar Romaneio de Balança para esta carga"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              Romaneio
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
