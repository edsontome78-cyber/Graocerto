/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Sparkles, Info, Scale, Sliders, ChevronRight, Beaker, AlertCircle, FileCheck, CheckCircle2, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { GrainType, GrainSample, FarmerReport, GRAIN_PRESETS } from '../types';
import { calculateGrainDiscounts } from '../utils/classification';
import { downloadDailyClassificationsPDF } from '../utils/pdfGenerator';
import { downloadDailyClassificationsExcel } from '../utils/excelGenerator';

interface ClassifierFormProps {
  onSaveReport: (report: FarmerReport) => void;
  currentUser?: { name: string; email: string; plan?: 'CORRETOR' | 'PRODUTOR' } | null;
  reports?: FarmerReport[];
  currentUserPlan?: 'CORRETOR' | 'PRODUTOR';
}

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
         return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('safeLocalStorage.getItem failed for key:', key, e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value || '');
      }
    } catch (e) {
      console.warn('safeLocalStorage.setItem failed for key:', key, e);
    }
  }
};

export default function ClassifierForm({ onSaveReport, currentUser, reports = [], currentUserPlan = 'PRODUTOR' }: ClassifierFormProps) {
  // Precompile default Operator identity details
  const operatorNameAndEmail = currentUser 
    ? `${currentUser.name} (${currentUser.email})` 
    : 'Classificador Pro (admin@graocert.com)';

  // Agricultural identification state pre-loaded from localStorage for ultra-fast session persistence
  const [farmerName, setFarmerName] = useState(() => (safeLocalStorage.getItem('graocert_farmerName') || ''));
  const [farmName, setFarmName] = useState(() => (safeLocalStorage.getItem('graocert_farmName') || ''));
  const [cityState, setCityState] = useState(() => (safeLocalStorage.getItem('graocert_cityState') || ''));
  const [lotReference, setLotReference] = useState(() => (safeLocalStorage.getItem('graocert_lotReference') || ''));
  
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-syncing values to localStorage for persistence across classification sessions
  useEffect(() => {
    safeLocalStorage.setItem('graocert_farmerName', farmerName || '');
  }, [farmerName]);

  useEffect(() => {
    safeLocalStorage.setItem('graocert_farmName', farmName || '');
  }, [farmName]);

  useEffect(() => {
    safeLocalStorage.setItem('graocert_cityState', cityState || '');
  }, [cityState]);

  useEffect(() => {
    safeLocalStorage.setItem('graocert_lotReference', lotReference || '');
  }, [lotReference]);

  // Collapse toggle state for sections
  const [showGrainSelection, setShowGrainSelection] = useState(true);
  const [showIdentification, setShowIdentification] = useState(true);

  // Custom Company Name Settings state synced with localStorage and custom event triggering
  const [companyName, setCompanyName] = useState<string>(() => (safeLocalStorage.getItem('graocert_custom_company_name') || ''));

  const handleCompanyNameChange = (val: string) => {
    const valueStr = val || '';
    setCompanyName(valueStr);
    safeLocalStorage.setItem('graocert_custom_company_name', valueStr);
    window.dispatchEvent(new Event('graocert_company_name_updated'));
  };

  useEffect(() => {
    const handleUpdate = () => {
      setCompanyName(safeLocalStorage.getItem('graocert_custom_company_name') || '');
    };
    window.addEventListener('graocert_company_name_updated', handleUpdate);
    return () => {
      window.removeEventListener('graocert_company_name_updated', handleUpdate);
    };
  }, []);

  // Sample analytics measurements state
  const [selectedGrain, setSelectedGrain] = useState<GrainType | null>(null);
  const [applyDiscount, setApplyDiscount] = useState<boolean>(true);

  useEffect(() => {
    if (selectedGrain === 'SORGO' && currentUserPlan === 'CORRETOR') {
      setSelectedGrain(null);
    }
  }, [currentUserPlan, selectedGrain]);

  // Weights are handled cleanly under the hood - no Step 3 container required
  const [totalWeight, setTotalWeight] = useState<number | "">(""); 
  const [moisture, setMoisture] = useState<number | "">(""); 
  const [impurityGrams, setImpurityGrams] = useState<number | "">(""); 
  const [damagedGrams, setDamagedGrams] = useState<number | "">(""); 
  const [brokenGrams, setBrokenGrams] = useState<number | "">(""); 
  const [greenGrams, setGreenGrams] = useState<number | "">(""); 
  const [burntGrams, setBurntGrams] = useState<number | "">(""); 
  const [moldyGrams, setMoldyGrams] = useState<number | "">(""); 
  const [gessadosGrams, setGessadosGrams] = useState<number | "">(""); 

  const activePresetConfig = selectedGrain ? (GRAIN_PRESETS[selectedGrain] || GRAIN_PRESETS['MILHO']) : GRAIN_PRESETS['MILHO'];

  // Derived safe display/analytic numeric values
  const totalW = totalWeight === "" ? 0 : Number(totalWeight);
  const rawFSW = 500; // Step 3 removed; defaulted to a scientific 500g field sample size
  const officialW = 100; // Step 3 removed; defaulted to an official 100g test size
  const moistureVal = moisture === "" ? 0 : Number(moisture);
  const impurityVal = impurityGrams === "" ? 0 : Number(impurityGrams);
  const damagedVal = damagedGrams === "" ? 0 : Number(damagedGrams);
  const brokenVal = brokenGrams === "" ? 0 : Number(brokenGrams);
  const greenVal = greenGrams === "" ? 0 : Number(greenGrams);
  const burntVal = burntGrams === "" ? 0 : Number(burntGrams);
  const moldyVal = moldyGrams === "" ? 0 : Number(moldyGrams);
  const gessadosVal = gessadosGrams === "" ? 0 : Number(gessadosGrams);

  // Derived current metrics using our new sample weight algorithm
  const sampleData: GrainSample = {
    grainType: selectedGrain || 'MILHO',
    totalWeight: totalW,
    rawFieldSampleWeight: rawFSW,
    officialSampleWeight: officialW,
    impurityGrams: impurityVal,
    damagedGrams: damagedVal,
    brokenGrams: brokenVal,
    greenGrams: selectedGrain === 'SOJA' ? greenVal : 0,
    burntGrams: selectedGrain === 'SOJA' ? burntVal : 0,
    moldyGrams: selectedGrain === 'SOJA' ? moldyVal : 0,
    gessadosGrams: selectedGrain === 'MILHO' ? gessadosVal : 0,
    moisture: moistureVal,
    applyDiscount
  };

  const calculation = calculateGrainDiscounts(sampleData, applyDiscount);

  const handleResetForm = () => {
    setSelectedGrain(null);
    setFarmerName('');
    setFarmName('');
    setCityState('');
    setLotReference('');
    setApplyDiscount(true);
    setTotalWeight('');
    setMoisture('');
    setImpurityGrams('');
    setDamagedGrams('');
    setBrokenGrams('');
    setGreenGrams('');
    setBurntGrams('');
    setMoldyGrams('');
    setGessadosGrams('');
    setVehiclePlate('');
    setValidationError(null);
    setSuccessMessage(null);
    setShowGrainSelection(true);
  };

  const handleFinalizeDay = () => {
    setValidationError(null);
    setSuccessMessage(null);

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Filter reports from today using robust string, local, or UTC comparisons
    const reportsToday = (reports || []).filter(r => {
      if (!r.date) return false;
      
      // Direct string match (e.g., "YYYY-MM-DD")
      if (r.date.startsWith(todayStr)) {
        return true;
      }
      
      const rDate = new Date(r.date);
      // Local date match
      const rLocalMatch = rDate.getFullYear() === today.getFullYear() &&
                          (rDate.getMonth() + 1) === (today.getMonth() + 1) &&
                          rDate.getDate() === today.getDate();
      if (rLocalMatch) return true;
      
      // UTC date match
      return rDate.getUTCFullYear() === today.getFullYear() &&
             (rDate.getUTCMonth() + 1) === (today.getMonth() + 1) &&
             rDate.getUTCDate() === today.getDate();
    });

    if (reportsToday.length === 0) {
      setValidationError(`Não há classificações registradas hoje (${day}/${month}/${year}) para consolidar. Cadastre pelo menos um laudo antes de finalizar o dia!`);
      return;
    }

    try {
      // Trigger PDF download
      downloadDailyClassificationsPDF(reports || [], todayStr);
      // Trigger Excel download
      downloadDailyClassificationsExcel(reports || [], todayStr);

      setSuccessMessage(`Dia finalizado com sucesso! Foram compilados ${reportsToday.length} laudos de hoje (${day}/${month}/${year}) e as duas planilhas (PDF e Excel) foram geradas e baixadas. O histórico completo está guardado no Arquivo Central de laudos.`);
      
      // Perform form reset for a fresh start for the next files
      handleResetForm();
    } catch (err: any) {
      setValidationError(err.message || "Ocorreu um erro ao finalizar o dia e exportar as planilhas.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrain) {
      setValidationError('Por favor, selecione uma cultura para iniciar a classificação.');
      setSuccessMessage(null);
      return;
    }
    if (!farmerName.trim() || !farmName.trim()) {
      setValidationError('Por favor, informe o Produtor Rural e o nome da Fazenda/Propriedade.');
      setSuccessMessage(null);
      return;
    }
    setValidationError(null);

    const report: FarmerReport = {
      id: Math.random().toString(36).substring(2, 11),
      reportNumber: Math.floor(Math.random() * 89999) + 10000,
      date: new Date().toISOString(),
      farmerName: farmerName.trim(),
      farmName: farmName.trim(),
      cityState: (cityState || 'N/A').trim(),
      lotReference: (lotReference || 'Moega principal').trim(),
      vehiclePlate: vehiclePlate || 'N/A',
      operatorName: operatorNameAndEmail,
      sample: sampleData,
      result: calculation,
      notes: '', // Step 5 / Notas removed for optimization
      applyDiscount,
      emissionType: 'Laudo de Classificação de Entrada',
      cargoDestination: 'Moega Principal',
      commercialTreatment: 'Padrão Geral'
    };

    onSaveReport(report);
    
    // Configura o feedback visual imediato de sucesso de criação 100% funcional
    setSuccessMessage(`Sucesso! Laudo #${report.reportNumber} foi gerado e associado ao Arquivo Central.`);
    
    // Limpa a placa e as pesagens analíticas do formulário para o próximo caminhão, mantendo o produtor pré-gravado!
    setVehiclePlate('');
    setTotalWeight('');
    setMoisture('');
    setImpurityGrams('');
    setDamagedGrams('');
    setBrokenGrams('');
    setGreenGrams('');
    setBurntGrams('');
    setMoldyGrams('');
    setGessadosGrams('');
    
    // Limpa a mensagem de sucesso depois de um tempo curto para não congestionar
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  // Tolerâncias convertidas para gramas para facilitar visualização do classificador
  const allowedImpurityGrams = ((activePresetConfig.standardImpurity / 100) * officialW);
  const allowedDamagedGrams = ((activePresetConfig.standardDamaged / 100) * officialW);
  const allowedBrokenGrams = ((activePresetConfig.standardBroken / 100) * officialW);
  const allowedGreenGrams = (((activePresetConfig.standardGreen || 0) / 100) * officialW);
  const allowedBurntGrams = (((activePresetConfig.standardBurnt || 0) / 100) * officialW);
  const allowedMoldyGrams = (((activePresetConfig.standardMoldy || 0) / 100) * officialW);
  const allowedGessadosGrams = (((activePresetConfig.standardGessados || 0) / 100) * officialW);

  return (
    <div id="grain-classifier-module" className="bg-white rounded-xl border border-stone-200 shadow-sm p-3 space-y-4 animate-fade-in">
      
      {/* Custom Company Header Settings */}
      {selectedGrain !== null && (
        <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs font-sans">
          <label htmlFor="form-company-name-input" className="font-extrabold text-stone-700 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
            <Building2 className="w-4 h-4 text-emerald-700" />
            Nome do Cabeçalho:
          </label>
          <div className="relative flex-1 w-full">
            <input
              id="form-company-name-input"
              type="text"
              value={companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              placeholder="Digite o nome da empresa (ex: GRÃOCERT PRO)"
              className="w-full bg-white border border-stone-250 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 transition-all font-sans"
            />
            <Building2 className="absolute left-2.5 top-2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
          </div>
          {companyName && (
            <button
              type="button"
              onClick={() => handleCompanyNameChange('')}
              className="text-[10px] text-stone-500 hover:text-red-750 font-extrabold hover:underline uppercase transition cursor-pointer"
            >
              redefinir
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {selectedGrain === null ? (
          // Welcome greeting and large selection buttons when no grain is selected
          <div className="bg-white p-4 rounded-xl border border-stone-200/80 animate-fade-in text-center space-y-4">
            <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-805 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm animate-pulse">
              <Sparkles className="w-7 h-7 text-emerald-700" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-stone-850">Selecione uma Cultura Agrícola</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Para começar a preencher e emitir o Laudo de Classificação de Grãos, selecione uma das culturas disponíveis abaixo.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-xl mx-auto">
              {(['MILHO', 'SOJA', 'SORGO'] as GrainType[]).map((key) => {
                const config = GRAIN_PRESETS[key];
                const isLocked = key === 'SORGO' && currentUserPlan === 'CORRETOR';
                return (
                  <button
                    key={key}
                    id={`btn-select-main-grain-${key}`}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        setValidationError("O módulo de classificação de Sorgo está indisponível no Plano Corretor. Faça upgrade para o Plano Produtor para liberar acesso!");
                        setSuccessMessage(null);
                        return;
                      }
                      setSelectedGrain(key);
                      setShowGrainSelection(false); // Collapsed by default once selected
                      setValidationError(null);
                    }}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all duration-200 ease-in-out cursor-pointer shadow-sm relative group ${
                      isLocked 
                        ? 'border-stone-200/60 bg-stone-50/40 opacity-70 text-stone-400 cursor-not-allowed'
                        : 'border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/45 text-stone-700 hover:text-emerald-950 hover:shadow-md'
                    }`}
                  >
                    {isLocked && (
                      <span className="absolute top-2 right-2 text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-bold font-sans">
                        🔒 PRO
                      </span>
                    )}
                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-250">{config.emoji}</span>
                    <span className="font-extrabold text-sm block font-sans">{config.name}</span>
                    <span className="text-[11px] text-stone-400 mt-1 block font-sans">Padrão: {config.standardMoisture}% Umidade</span>
                  </button>
                );
              })}
            </div>

            {validationError && (
              <div className="p-3.5 max-w-xl mx-auto bg-rose-50 border border-rose-250 text-rose-800 rounded-lg text-xs flex items-center justify-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="font-semibold">{validationError}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Active Grain Heading Badge (replaces old bulky Step 1) */}
            <div className="flex justify-between items-center bg-emerald-50 text-emerald-850 p-2.5 rounded-xl border border-emerald-100/85 text-xs font-sans">
              <span className="flex items-center gap-1.5 font-bold">
                Cultivo em Análise: {activePresetConfig.emoji} {activePresetConfig.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedGrain(null);
                  setValidationError(null);
                }}
                className="text-[10px] bg-white hover:bg-stone-50 text-stone-600 hover:text-red-750 px-2.5 py-1 rounded-lg border border-stone-250 font-bold uppercase transition"
              >
                ← Alterar Cultura
              </button>
            </div>

            {/* 1. Identification Details */}
            <div className="border border-stone-200 rounded-xl p-3.5 bg-stone-50/50">
              <button
                type="button"
                onClick={() => setShowIdentification(!showIdentification)}
                className="w-full flex items-center justify-between text-xs font-bold text-stone-700 uppercase tracking-wider cursor-pointer font-sans"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  1. Identificação do Produtor e Destino {(farmerName || '').trim() ? `(${(farmerName || '').trim()})` : null}
                </span>
                <span className="text-[10px] text-stone-500 font-semibold lowercase bg-white hover:bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-250 flex items-center gap-1">
                  {showIdentification ? 'esconder dados' : 'mostrar dados'}
                  {showIdentification ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>
              
              {showIdentification && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 animate-fade-in text-xs bg-white p-4 rounded-xl border border-stone-200">
              <div>
                <label htmlFor="input-farmer-name" className="block text-[11px] text-stone-500 mb-1 font-semibold font-sans">Produtor Rural *</label>
                <input
                  id="input-farmer-name"
                  type="text"
                  required
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  placeholder="Ex: Edson Tomé"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none focus:bg-white transition"
                />
              </div>
              <div>
                <label htmlFor="input-farm-name" className="block text-[11px] text-stone-500 mb-1 font-semibold font-sans">Fazenda / Propriedade *</label>
                <input
                  id="input-farm-name"
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="Ex: Fazenda Bela Vista"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none focus:bg-white transition"
                />
              </div>
              <div>
                <label htmlFor="input-city-state" className="block text-[11px] text-stone-500 mb-1 font-sans">Cidade / Estado / UF</label>
                <input
                  id="input-city-state"
                  type="text"
                  value={cityState}
                  onChange={(e) => setCityState(e.target.value)}
                  placeholder="Piracicaba / SP"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none focus:bg-white transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="input-vehicle-plate" className="block text-[11px] text-stone-500 mb-1 font-sans">Placa do Caminhão</label>
                  <input
                    id="input-vehicle-plate"
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="AGR-2026"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none uppercase focus:bg-white transition"
                  />
                </div>
                <div>
                  <label htmlFor="input-lot-reference" className="block text-[11px] text-stone-500 mb-1 font-sans">Destino Final</label>
                  <input
                    id="input-lot-reference"
                    type="text"
                    value={lotReference}
                    onChange={(e) => setLotReference(e.target.value)}
                    placeholder="Ex: Silo Secador / Armazém A"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none focus:bg-white transition"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Medições de Triagem da Amostra em Gramas / Moisture % */}
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 font-sans">
            2. Pesagem Analítica na Carga e Amostra (Gramas)
          </label>
          <div className="space-y-3">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Total Truck weight */}
              <div className="bg-stone-50 p-3 sm:p-3.5 rounded-xl border border-stone-200 flex flex-col justify-between">
                <label id="label-total-weight" htmlFor="input-total-weight-box" className="text-xs text-stone-700 font-semibold flex items-center gap-1.5 cursor-pointer font-sans mb-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-800" />
                  Peso Bruto Balança
                </label>
                <div className="flex items-center gap-2 font-sans mt-auto">
                  <input
                    id="input-total-weight-box"
                    type="number"
                    min="0"
                    placeholder="Ex: 14500"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(e.target.value === "" ? "" : Math.min(150000, parseInt(e.target.value) || 0))}
                    className="w-full text-right font-mono font-bold text-xs p-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-stone-850"
                  />
                  <span className="text-stone-500 font-mono text-xs font-semibold">kg</span>
                </div>
              </div>

              {/* Moisture input (percent) */}
              <div className="p-3 sm:p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between">
                <div className="flex justify-between items-center font-sans mb-1.5 flex-wrap gap-1">
                  <label htmlFor="input-number-moisture" className="text-xs text-stone-700 font-semibold flex items-center gap-1.5 cursor-pointer">
                    🌿 Teor de Umidade
                  </label>
                  <span className={`font-mono text-xs font-bold ${moistureVal > activePresetConfig.standardMoisture ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {moistureVal > 0 ? `${moistureVal.toFixed(1)}%` : 'vazio'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-sans mt-auto">
                  <input
                    id="input-number-moisture"
                    type="number"
                    step="0.1"
                    placeholder={`Ex: ${activePresetConfig.standardMoisture}`}
                    value={moisture}
                    onChange={(e) => setMoisture(e.target.value === "" ? "" : Math.min(100, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-mono font-bold p-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-stone-800"
                  />
                  <span className="text-stone-500 font-mono text-xs font-semibold">%</span>
                </div>
              </div>
            </div>

            {/* Impurities, Damaged, Broken, and Green (Gram Weight on 100g sample) */}
            <div className="bg-stone-50 p-3 sm:p-3.5 rounded-xl border border-stone-200 space-y-3">
              <div className="flex justify-between items-center border-b border-stone-200 pb-1.5">
                <h4 className="text-[10px] md:text-[11px] uppercase tracking-wider font-extrabold text-stone-500 font-sans">Fatores Físicos de Desconto (Grama por 100g)</h4>
                <div className="flex items-center gap-1 text-[10px] text-stone-550 bg-white px-1.5 py-0.5 rounded border border-stone-200 font-sans font-medium">
                  <span>Amostra:</span>
                  <span className="font-mono font-bold text-emerald-800">{officialW}g</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Impurity Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <label htmlFor="input-impurity" className="text-stone-700 font-semibold flex items-center gap-1.5">
                      🍂 Impurezas / Matéria Estranha
                    </label>
                    <span className="text-[10px] text-stone-400 font-mono">Tolerado: {allowedImpurityGrams.toFixed(1)}g ({activePresetConfig.standardImpurity}%)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <input
                      id="input-impurity"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={impurityGrams}
                      onChange={(e) => setImpurityGrams(e.target.value === "" ? "" : Math.min(100, parseFloat(e.target.value) || 0))}
                      className="w-full p-2 text-xs border border-stone-300 bg-white rounded font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <span className="text-stone-500 text-xs font-semibold w-5">g</span>
                  </div>
                </div>

                {/* Damaged Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <label htmlFor="input-damaged" className="text-stone-700 font-semibold flex items-center gap-1.5">
                      🔥 Grãos Avariados / Ardidos
                    </label>
                    <span className="text-[10px] text-stone-400 font-mono">Tolerado: {allowedDamagedGrams.toFixed(1)}g ({activePresetConfig.standardDamaged}%)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <input
                      id="input-damaged"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={damagedGrams}
                      onChange={(e) => setDamagedGrams(e.target.value === "" ? "" : Math.min(100, parseFloat(e.target.value) || 0))}
                      className="w-full p-2 text-xs border border-stone-300 bg-white rounded font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <span className="text-stone-500 text-xs font-semibold w-5">g</span>
                  </div>
                </div>

                {/* Broken Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <label htmlFor="input-broken" className="text-stone-700 font-semibold flex items-center gap-1.5">
                      🔨 Grãos Quebrados / Partidos
                    </label>
                    <span className="text-[10px] text-stone-400 font-mono">Tolerado: {allowedBrokenGrams.toFixed(1)}g ({activePresetConfig.standardBroken}%)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <input
                      id="input-broken"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={brokenGrams}
                      onChange={(e) => setBrokenGrams(e.target.value === "" ? "" : Math.min(100, parseFloat(e.target.value) || 0))}
                      className="w-full p-2 text-xs border border-stone-300 bg-white rounded font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <span className="text-stone-500 text-xs font-semibold w-5">g</span>
                  </div>
                </div>

                {/* Soy green, burnt, and moldy grams input (Soybean only) */}
                {selectedGrain === 'SOJA' && (
                  <>
                    <div className="space-y-1.5 animate-fade-in">
                      <div className="flex justify-between items-center text-xs font-sans">
                        <label htmlFor="input-green" className="text-stone-700 font-semibold flex items-center gap-1.5">
                          🟢 Grãos Esverdeados (Soja)
                        </label>
                        <span className="text-[10px] text-stone-400 font-mono">Tolerado: {allowedGreenGrams.toFixed(1)}g ({activePresetConfig.standardGreen}%)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <input
                          id="input-green"
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={greenGrams}
                          onChange={(e) => setGreenGrams(e.target.value === "" ? "" : Math.min(100, parseFloat(e.target.value) || 0))}
                          className="w-full p-2 text-xs border border-stone-300 bg-white rounded font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        <span className="text-stone-500 text-xs font-semibold w-5">g</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <div className="flex justify-between items-center text-xs font-sans">
                        <label htmlFor="input-burnt" className="text-stone-700 font-semibold flex items-center gap-1.5">
                          🔥 Grãos Queimados (Soja)
                        </label>
                        <span className="text-[10px] text-stone-400 font-mono">Tolerado: {allowedBurntGrams.toFixed(1)}g ({activePresetConfig.standardBurnt}%)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <input
                          id="input-burnt"
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={burntGrams}
                          onChange={(e) => setBurntGrams(e.target.value === "" ? "" : Math.min(100, parseFloat(e.target.value) || 0))}
                          className="w-full p-2 text-xs border border-stone-300 bg-white rounded font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        <span className="text-stone-500 text-xs font-semibold w-5">g</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <div className="flex justify-between items-center text-xs font-sans">
                        <label htmlFor="input-moldy" className="text-stone-700 font-semibold flex items-center gap-1.5">
                          ☁️ Grãos Mofados (Soja)
                        </label>
                        <span className="text-[10px] text-stone-400 font-mono">Tolerado: {allowedMoldyGrams.toFixed(1)}g ({activePresetConfig.standardMoldy}%)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <input
                          id="input-moldy"
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={moldyGrams}
                          onChange={(e) => setMoldyGrams(e.target.value === "" ? "" : Math.min(100, parseFloat(e.target.value) || 0))}
                          className="w-full p-2 text-xs border border-stone-300 bg-white rounded font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        <span className="text-stone-500 text-xs font-semibold w-5">g</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Corn gessados input (Corn only) */}
                {selectedGrain === 'MILHO' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <div className="flex justify-between items-center text-xs font-sans">
                      <label htmlFor="input-gessados" className="text-stone-700 font-semibold flex items-center gap-1.5">
                        🥚 Grãos Gessados (Milho)
                      </label>
                      <span className="text-[10px] text-stone-400 font-mono">Tolerado: {allowedGessadosGrams.toFixed(1)}g ({activePresetConfig.standardGessados}%)</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <input
                        id="input-gessados"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={gessadosGrams}
                        onChange={(e) => setGessadosGrams(e.target.value === "" ? "" : Math.min(100, parseFloat(e.target.value) || 0))}
                        className="w-full p-2 text-xs border border-stone-300 bg-white rounded font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                      <span className="text-stone-500 text-xs font-semibold w-5">g</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calculations Projection (Small real-time preview of deletions before generating) */}
        {totalW === 0 ? (
          <button
            id="btn-clear-fields"
            type="button"
            onClick={handleResetForm}
            className="w-full py-3.5 px-5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl text-stone-700 font-bold text-xs uppercase tracking-wider transition-all duration-150 ease-in-out cursor-pointer flex items-center justify-center gap-2 font-sans shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
            <span>Limpar Campos</span>
          </button>
        ) : (
          <div className="bg-stone-900 text-stone-100 rounded-xl p-4 font-mono text-[11px] space-y-1.5 shadow-inner align-middle">
            <div className="flex justify-between border-b border-stone-850 pb-1 font-sans text-[10px] uppercase font-bold text-stone-400">
              <span>Projeção de Descontos e Classificação</span>
              <span className="text-emerald-400 font-bold">{calculation.classificationGrade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Peso de Balança:</span>
              <span>{totalW.toLocaleString('pt-BR')} kg</span>
            </div>
            <div className="flex justify-between text-amber-400 font-semibold font-mono">
              <span>Deduções Estimadas:</span>
              <span>-{Math.round(calculation.totalDiscounts).toLocaleString('pt-BR')} kg</span>
            </div>
            <div className="flex justify-between border-t border-stone-850 pt-1 text-xs font-bold text-white font-sans">
              <span>Peso Líquido Comercial:</span>
              <span className="text-emerald-400 font-mono">{Math.round(calculation.finalNetWeight).toLocaleString('pt-BR')} kg</span>
            </div>
          </div>
        )}

        {/* Operational Identity details rendered statically right on form */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-[10px] text-stone-500 font-sans flex items-center justify-between">
          <span>Assinatura Digital Laudo:</span>
          <span className="font-semibold text-stone-750">{operatorNameAndEmail}</span>
        </div>

        {/* Reset & Submit Panel */}
        <div className="space-y-3 pt-3 border-t border-stone-100">
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-250 text-rose-800 rounded-lg text-xs flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-semibold">{validationError}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-lg text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          
          <div className="flex gap-3 text-xs font-sans">
            <button
              id="btn-reset-analyzer"
              type="button"
              onClick={handleFinalizeDay}
              className="px-4 py-3 font-bold text-amber-400 transition bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              title="Finalizar o dia de classificação: gera planilha consolidada em PDF e Excel e limpa o formulário"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Finalizar Dia
            </button>
            
            <button
              id="btn-submit-save-report"
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-emerald-800 hover:bg-emerald-700 text-amber-300 hover:text-amber-200 rounded-xl transition font-black border border-amber-500 shadow-md cursor-pointer shadow-emerald-950/20 hover:shadow-lg uppercase tracking-wider"
            >
              <FileCheck className="w-4 h-4 text-amber-400 animate-pulse" />
              Gerar Laudo de Campo 🚀
            </button>
          </div>
        </div>
        </>
        )}
      </form>
    </div>
  );
}
