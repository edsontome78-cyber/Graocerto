/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, Printer, Share2, ShieldCheck, CheckCircle2, AlertTriangle, UserCheck, Send, Copy, Check, ExternalLink, Download, Building2 } from 'lucide-react';
import { FarmerReport, GRAIN_PRESETS } from '../types';
import { downloadReportPDF } from '../utils/pdfGenerator';

interface LaudoPreviewProps {
  report: FarmerReport | null;
  onShared?: (method: string) => void;
}

export default function LaudoPreview({ report, onShared }: LaudoPreviewProps) {
  if (!report) {
    return (
      <div id="laudo-preview-empty" className="bg-white rounded-xl border border-stone-200 shadow-sm p-8 text-center flex flex-col items-center justify-center h-full min-h-[450px]">
        <FileText className="w-12 h-12 text-stone-300 mb-3 animate-pulse" />
        <h3 className="font-semibold text-stone-850 text-sm">Nenhum Laudo Ativo</h3>
        <p className="text-xs text-stone-500 max-w-[280px] mt-1.5 leading-relaxed">
          Preencha a ficha de classificação ao lado e salve para gerar o certificado técnico, ou selecione um laudo salvo do histórico abaixo.
        </p>
      </div>
    );
  }

  const [copied, setCopied] = useState(false);
  const [nativeShared, setNativeShared] = useState(false);
  const [companyName, setCompanyName] = useState<string>(() => {
    try {
      return localStorage.getItem('graocert_custom_company_name') || '';
    } catch (e) {
      return '';
    }
  });

  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    try {
      localStorage.setItem('graocert_custom_company_name', val);
    } catch (e) {
      console.warn(e);
    }
  };

  const config = GRAIN_PRESETS[report.sample.grainType];
  const dateStr = new Date(report.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = new Date(report.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleBrowserPrint = () => {
    window.print();
    if (onShared) onShared('Impressão Padrão (Navegador/PDF)');
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    downloadReportPDF(report, companyName);
    if (onShared) onShared('Download Certificado PDF A4');
  };

  const getWhatsAppMessage = () => {
    return `*GRÃOCERT - LAUDO DE CLASSIFICAÇÃO AGRICOLA #${report.reportNumber}*\n` +
      `🌾 Produto: *${config?.name || report.sample.grainType} ${config?.emoji || ''}*\n` +
      `🚜 Produtor: *${report.farmerName}*\n` +
      `📍 Propriedade: *${report.farmName}* (${report.cityState})\n` +
      `🚚 Placa Veículo: *${report.vehiclePlate?.toUpperCase() || 'N/A'}*\n` +
      `⚖️ Peso Líquido Balança: ${report.sample.totalWeight.toLocaleString('pt-BR')} kg\n` +
      `🌧️ Umidade: ${report.sample.moisture.toFixed(1)}% | Impurezas: ${report.result.impurityPercent.toFixed(1)}%\n` +
      `🛡️ Total Descontos: ${Math.round(report.result.totalDiscounts).toLocaleString('pt-BR')} kg\n` +
      `💵 *PESO LÍQUIDO FINAL COMERCIAL: ${Math.round(report.result.finalNetWeight).toLocaleString('pt-BR')} kg*\n` +
      `✅ Classificação: ${report.result.classificationGrade}\n` +
      `Responsável: ${report.operatorName}\n` +
      `Sincronizado na Estação Pro.\n` +
      `Visualize seu laudo completo: https://graocert.com/laudo/${report.id}`;
  };

  const handleShareWhatsApp = () => {
    const message = getWhatsAppMessage();
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (onShared) onShared('WhatsApp (Laudo Ativo)');
  };

  const handleCopyLink = () => {
    const mockUrl = `https://graocert.com/laudo/${report.id}`;
    navigator.clipboard.writeText(mockUrl).then(() => {
      setCopied(true);
      if (onShared) onShared('Link do Laudo Copiado');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Laudo Agrícola #${report.reportNumber} - Grãocerto Pro`,
        text: `Confira o laudo de classificação de grãos para o produtor rural ${report.farmerName}. Peso líquido retido: ${Math.round(report.result.finalNetWeight).toLocaleString('pt-BR')} kg.`,
        url: `https://graocert.com/laudo/${report.id}`,
      })
      .then(() => {
        setNativeShared(true);
        if (onShared) onShared('Compartilhamento de Sistema');
        setTimeout(() => setNativeShared(false), 2000);
      })
      .catch((err) => {
        console.warn('Erro ao compartilhar via API nativa:', err);
      });
    } else {
      handleCopyLink();
    }
  };

  // Check if sample exceeded standard norms
  const moistureExceeded = report.sample.moisture > config.standardMoisture;
  const impurityExceeded = report.result.impurityPercent > config.standardImpurity;
  const damagedExceeded = report.result.damagedPercent > config.standardDamaged;
  const brokenExceeded = report.result.brokenPercent > config.standardBroken;
  const greenExceeded = config?.standardGreen && (report.result.greenPercent || 0) > config.standardGreen;
  const burntExceeded = config?.standardBurnt && (report.result.burntPercent || 0) > config.standardBurnt;
  const moldyExceeded = config?.standardMoldy && (report.result.moldyPercent || 0) > config.standardMoldy;
  const gessadosExceeded = config?.standardGessados && (report.result.gessadosPercent || 0) > config.standardGessados;

  // Calculates 12-hour validity of the classification report
  const getValidityDetails = () => {
    try {
      if (!report.date) return { text: 'Laudo Ativo', isValid: true, remainingStr: '12h 00m' };
      const repDate = new Date(report.date);
      const now = new Date();
      const diffMs = now.getTime() - repDate.getTime();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      
      const isValid = diffMs >= 0 && diffMs < twelveHoursMs;
      
      if (diffMs < 0) {
        return { text: 'Válido (Futuro)', isValid: true, remainingStr: '12h 00m' };
      }
      
      if (isValid) {
        const remainingMs = twelveHoursMs - diffMs;
        const h = Math.floor(remainingMs / (1000 * 60 * 60));
        const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return { 
          text: 'Válido', 
          isValid: true, 
          remainingStr: `${h}h ${m}m`
        };
      }
      
      return { 
        text: 'Expirado', 
        isValid: false, 
        remainingStr: '0h 00m'
      };
    } catch (e) {
      return { text: 'Válido', isValid: true, remainingStr: '12h 00m' };
    }
  };

  const validity = getValidityDetails();

  return (
    <div id="laudo-preview-card" className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Action header with print & share buttons */}
      <div className="bg-stone-50 border-b border-stone-150 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">Laudo Certificado {String(report.reportNumber).padStart(5, '0')}</h3>
            <p className="text-xs text-stone-500">Impressão A4 oficial e arquivo digitalizado.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-download-pdf-a4"
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded transition shadow-sm"
            title="Gerar e Baixar Documento PDF Oficial"
          >
            <Download className="w-3.5 h-3.5" />
            A4 PDF Oficial
          </button>

          <button
            id="btn-print-browser"
            onClick={handleBrowserPrint}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-950 font-semibold text-xs rounded transition"
            title="Salvar como PDF ou Imprimir Página"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF / Imprimir
          </button>
          
          <button
            id="btn-share-whatsapp-active"
            onClick={handleShareWhatsApp}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition shadow-sm"
            title="Enviar no WhatsApp do Produtor"
          >
            <Send className="w-3.5 h-3.5" />
            WhatsApp
          </button>

          <button
            id="btn-share-native-active"
            onClick={handleNativeShare}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded transition shadow-sm"
            title="Mais opções de Compartilhamento"
          >
            <Share2 className="w-3.5 h-3.5" />
            {nativeShared ? 'Compartilhado!' : 'Compartilhar'}
          </button>
        </div>
      </div>

      {/* Interactive Quick Share Strip (Alert / Reminder to share easily) */}
      <div className="bg-sky-50/50 border-b border-sky-100 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-sky-900 print:hidden font-sans">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <div>
            <span className="font-bold">Link Direto Gerado:</span>
            <span className="ml-1 text-stone-500 font-mono text-[11px]">https://graocert.com/laudo/{report.id}</span>
          </div>
        </div>
        <button
          id="btn-quick-copy-link"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-sky-100 border border-sky-200 text-sky-850 font-semibold text-[11px] rounded transition shadow-sm self-stretch sm:self-auto justify-center"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              Copiado com Sucesso!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-sky-700" />
              Copiar Link Técnico
            </>
          )}
        </button>
      </div>

      {/* Custom Company Name Settings - print:hidden */}
      <div className="bg-stone-50 border-b border-stone-150 p-2.5 px-4 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 text-xs print:hidden font-sans">
        <label htmlFor="custom-company-name-input" className="font-extrabold text-stone-700 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-stone-500" />
          Cabeçalho Personalizado:
        </label>
        <div className="relative flex-1 w-full">
          <input
            id="custom-company-name-input"
            type="text"
            value={companyName}
            onChange={(e) => handleCompanyNameChange(e.target.value)}
            placeholder="Digite o nome da sua empresa (substitui 'GRÃOCERT')"
            className="w-full bg-white border border-stone-250 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 transition-all font-sans"
          />
          <Building2 className="absolute left-2.5 top-2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
        </div>
        {companyName && (
          <button
            onClick={() => handleCompanyNameChange('')}
            className="text-[10px] text-stone-500 hover:text-red-700 font-extrabold hover:underline uppercase transition cursor-pointer"
          >
            redefinir
          </button>
        )}
      </div>

      {/* Printable Sheet Container */}
      <div id="printable-sheet" className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 print:p-0">

        {/* 12-Hour Validity Banner */}
        <div className={`p-4 rounded-xl border mb-2 print:hidden font-sans transition-all duration-300 ${
          validity.isValid 
            ? 'bg-emerald-50 border-emerald-250 text-emerald-900 shadow-xs' 
            : 'bg-amber-50 border-amber-250 text-amber-950 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex gap-2.5 items-start">
              <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 relative ${
                validity.isValid ? 'bg-emerald-600' : 'bg-amber-600'
              }`}>
                {validity.isValid && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
              </span>
              <div>
                <h4 className="font-extrabold text-[12px] uppercase tracking-wide flex items-center gap-1.5 leading-none">
                  {validity.isValid ? "🟢 LAUDO DE ENTRADA VÁLIDO (Uso Comercial Ativo)" : "🔴 VALIDADE EXPIRADA (+12 HORAS)"}
                </h4>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                  {validity.isValid 
                    ? `Este laudo possui validade legal e comercial de 12 horas. Seus cálculos permanecem ativos e chancelados na balança de recepção.`
                    : `Este laudo expirou seu ciclo regulamentar de 12 horas de validade. Suas informações de classificação foram arquivadas e consolidadas na Planilha do Dia.`}
                </p>
              </div>
            </div>
            
            <div className={`px-3.5 py-1.5 rounded-lg border text-center flex-shrink-0 font-mono w-full sm:w-auto ${
              validity.isValid 
                ? 'bg-white border-emerald-300 text-emerald-850' 
                : 'bg-amber-100/55 border-amber-300 text-amber-900'
            }`}>
              <span className="block text-[8px] font-bold text-stone-500 uppercase tracking-wide">TEMPO RESTANTE</span>
              <span className="text-xs font-black tracking-tight">{validity.remainingStr}</span>
            </div>
          </div>
        </div>
        
        {/* Certificate official Header banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-stone-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            {companyName ? (
              <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-lg border-2 border-emerald-600 shadow-sm animate-fade-in">
                <Building2 className="w-5 h-5 text-emerald-100" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-white font-mono flex items-center justify-center font-bold text-lg border-2 border-emerald-500">
                GC
              </div>
            )}
            <div>
              <h1 className="font-sans font-extrabold text-base tracking-tight text-stone-900 uppercase">
                {companyName || "GRÃOCERT"}
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                {companyName ? "Laudo de Classificação de Grãos" : "Certificate of Quality Inspection"}
              </p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <div className="inline-flex items-center gap-1.5 bg-stone-900 text-white text-[10px] font-mono px-2.5 py-1 rounded">
              LAUDO TÉCNICO Nº {String(report.reportNumber).padStart(5, '0')}
            </div>
            <p className="text-[10px] text-stone-400 mt-1 font-mono">Emissão: {dateStr} às {timeStr}</p>
          </div>
        </div>

        {/* 2. Customer & Origin Meta Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
          <div>
            <span className="block text-[10px] uppercase font-bold text-stone-400">Produtor Rural</span>
            <span className="font-semibold text-xs text-stone-800 select-all">{report.farmerName || '-'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-stone-400">Fazenda / Local</span>
            <span className="font-semibold text-xs text-stone-800">{report.farmName || '-'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-stone-400">Cidade / ID</span>
            <span className="font-semibold text-xs text-stone-800">{report.cityState || '-'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-stone-400">Carga / Placa</span>
            <span className="font-semibold text-xs text-stone-800 font-mono">{report.vehiclePlate?.toUpperCase() || '-'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-stone-400">Destino Final</span>
            <span className="font-semibold text-xs text-stone-800">{report.lotReference || '-'}</span>
          </div>
        </div>

        {/* Specifications detailed summary block */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/20 p-3 rounded-lg border border-emerald-100/40 text-xs">
          <div>
            <span className="block text-[9px] uppercase font-bold text-emerald-800 tracking-wider">Especificação do Laudo</span>
            <span className="font-semibold text-stone-800 block mt-0.5">{report.emissionType || 'Laudo de Classificação de Entrada'}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase font-bold text-emerald-800 tracking-wider">Destino Armazenamento</span>
            <span className="font-semibold text-stone-800 block mt-0.5">{report.cargoDestination || 'Moega Principal - Armazenamento'}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase font-bold text-emerald-800 tracking-wider">Regime Comercial</span>
            <span className="font-bold text-emerald-700 block mt-0.5">
              {report.commercialTreatment || 'Padrão de Recebimento de Cargas'} {report.applyDiscount === false && '(Sem Desconto)'}
            </span>
          </div>
        </div>

        {/* 3. Product & Cargo Primary metrics summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white border border-stone-200 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-500">Espécie / Grão</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xl">{config?.emoji}</span>
              <span className="font-bold text-xs text-stone-900">{config?.name} <span className="text-[9px] font-normal text-stone-400">({report.sample.grainType})</span></span>
            </div>
          </div>
          <div className="p-3 bg-white border border-stone-200 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-500">Amostra Física</span>
            <span className="font-bold text-xs text-stone-900 mt-1 font-mono">
              Campo: {report.sample.rawFieldSampleWeight}g / Ofic: {report.sample.officialSampleWeight}g
            </span>
          </div>
          <div className="p-3 bg-white border border-stone-200 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-stone-500">Peso Balança</span>
            <span className="font-bold text-xs text-stone-900 font-mono mt-1">
              {report.sample.totalWeight.toLocaleString('pt-BR')} kg
            </span>
          </div>
          <div className={`p-3 text-white rounded-lg flex flex-col justify-between shadow-sm ${report.applyDiscount === false ? 'bg-indigo-900' : 'bg-emerald-800'}`}>
            <span className="text-[10px] uppercase font-bold text-emerald-100">
              {report.applyDiscount === false ? 'Líquido (Sem Descontos)' : 'Líquido Comercial'}
            </span>
            <span className="font-mono font-black text-xs sm:text-sm mt-1">
              {Math.round(report.result.finalNetWeight).toLocaleString('pt-BR')} kg
            </span>
          </div>
        </div>

        {/* 4. Quality Parameter Matrix Table */}
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase font-bold text-stone-950 tracking-wider">Detalhamento da Análise da Amostra Oficial ({report.sample.officialSampleWeight}g)</h4>
          <div className="overflow-hidden border border-stone-200 rounded-lg">
            <table className="w-full text-left text-[11px] font-sans">
              <thead className="bg-stone-50 border-b border-stone-200 text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Fator Analisado</th>
                  <th className="p-2.5 text-center">Tolerância Oficial</th>
                  <th className="p-2.5 text-center">Peso Triado (g / %)</th>
                  <th className="p-2.5 text-center">Desc. Amostra (g)</th>
                  <th className="p-2.5 text-right">Desc. Carga (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150 text-stone-700">
                
                {/* Moisture Row */}
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">
                    <div>Umidade (Quebra Térmica)</div>
                    <div className="text-[9px] text-stone-400 font-normal">Perda por redução de água</div>
                  </td>
                  <td className="p-2.5 text-center font-mono">{config?.standardMoisture.toFixed(1)}%</td>
                  <td className={`p-2.5 text-center font-mono font-bold ${moistureExceeded ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {report.sample.moisture.toFixed(1)}%
                  </td>
                  <td className={`p-2.5 text-center font-mono ${report.result.sampleDiscountMoisture > 0 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                    {report.result.sampleDiscountMoisture > 0 ? `-${report.result.sampleDiscountMoisture.toFixed(1)}g` : '0g'}
                  </td>
                  <td className={`p-2.5 text-right font-mono font-bold ${report.result.discountMoistureWeight > 0 ? 'text-red-650' : 'text-stone-450'}`}>
                    {report.result.discountMoistureWeight > 0 ? `-${Math.round(report.result.discountMoistureWeight).toLocaleString('pt-BR')} kg` : '0 kg'}
                  </td>
                </tr>

                {/* Impurity Row */}
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">
                    <div>Impurezas & Palhas</div>
                    <div className="text-[9px] text-stone-400 font-normal">Sementes estranhas, caule, folhas</div>
                  </td>
                  <td className="p-2.5 text-center font-mono">{config?.standardImpurity.toFixed(1)}%</td>
                  <td className={`p-2.5 text-center font-mono font-bold ${impurityExceeded ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {report.sample.impurityGrams.toFixed(1)}g ({report.result.impurityPercent.toFixed(1)}%)
                  </td>
                  <td className={`p-2.5 text-center font-mono ${report.result.sampleDiscountImpurity > 0 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                    {report.result.sampleDiscountImpurity > 0 ? `-${report.result.sampleDiscountImpurity.toFixed(1)}g` : '0g'}
                  </td>
                  <td className={`p-2.5 text-right font-mono font-bold ${report.result.discountImpurityWeight > 0 ? 'text-red-650' : 'text-stone-450'}`}>
                    {report.result.discountImpurityWeight > 0 ? `-${Math.round(report.result.discountImpurityWeight).toLocaleString('pt-BR')} kg` : '0 kg'}
                  </td>
                </tr>

                {/* Damaged Row */}
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">
                    <div>Grãos Avariados / Ardidos</div>
                    <div className="text-[9px] text-stone-400 font-normal">Mofados, brotados, ardidos, chocos</div>
                  </td>
                  <td className="p-2.5 text-center font-mono">{config?.standardDamaged.toFixed(1)}%</td>
                  <td className={`p-2.5 text-center font-mono font-bold ${damagedExceeded ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {report.sample.damagedGrams.toFixed(1)}g ({report.result.damagedPercent.toFixed(1)}%)
                  </td>
                  <td className={`p-2.5 text-center font-mono ${report.result.sampleDiscountDamaged > 0 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                    {report.result.sampleDiscountDamaged > 0 ? `-${report.result.sampleDiscountDamaged.toFixed(1)}g` : '0g'}
                  </td>
                  <td className={`p-2.5 text-right font-mono font-bold ${report.result.discountDamagedWeight > 0 ? 'text-red-650' : 'text-stone-450'}`}>
                    {report.result.discountDamagedWeight > 0 ? `-${Math.round(report.result.discountDamagedWeight).toLocaleString('pt-BR')} kg` : '0 kg'}
                  </td>
                </tr>

                {/* Esverdeados Row */}
                {report.sample.grainType === 'SOJA' && (
                  <tr>
                    <td className="p-2.5 font-semibold text-stone-900">
                      <div>Grãos Esverdeados</div>
                      <div className="text-[9px] text-stone-400 font-normal">Sementes imaturas ou verdes</div>
                    </td>
                    <td className="p-2.5 text-center font-mono">{(config?.standardGreen || 8.0).toFixed(1)}%</td>
                    <td className={`p-2.5 text-center font-mono font-bold ${greenExceeded ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {(report.sample.greenGrams || 0).toFixed(1)}g ({(report.result.greenPercent || 0).toFixed(1)}%)
                    </td>
                    <td className={`p-2.5 text-center font-mono ${report.result.sampleDiscountGreen && report.result.sampleDiscountGreen > 0 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                      {report.result.sampleDiscountGreen && report.result.sampleDiscountGreen > 0 ? `-${report.result.sampleDiscountGreen.toFixed(1)}g` : '0g'}
                    </td>
                    <td className={`p-2.5 text-right font-mono font-bold ${report.result.discountGreenWeight && report.result.discountGreenWeight > 0 ? 'text-red-650' : 'text-stone-450'}`}>
                      {report.result.discountGreenWeight && report.result.discountGreenWeight > 0 ? `-${Math.round(report.result.discountGreenWeight).toLocaleString('pt-BR')} kg` : '0 kg'}
                    </td>
                  </tr>
                )}

                {/* Queimados Row */}
                {report.sample.grainType === 'SOJA' && (
                  <tr>
                    <td className="p-2.5 font-semibold text-stone-900">
                      <div>Grãos Queimados</div>
                      <div className="text-[9px] text-stone-400 font-normal">Grãos carbonizados ou excesso secagem</div>
                    </td>
                    <td className="p-2.5 text-center font-mono">{(config?.standardBurnt || 1.0).toFixed(1)}%</td>
                    <td className={`p-2.5 text-center font-mono font-bold ${burntExceeded ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {(report.sample.burntGrams || 0).toFixed(1)}g ({(report.result.burntPercent || 0).toFixed(1)}%)
                    </td>
                    <td className={`p-2.5 text-center font-mono ${report.result.sampleDiscountBurnt && report.result.sampleDiscountBurnt > 0 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                      {report.result.sampleDiscountBurnt && report.result.sampleDiscountBurnt > 0 ? `-${report.result.sampleDiscountBurnt.toFixed(1)}g` : '0g'}
                    </td>
                    <td className={`p-2.5 text-right font-mono font-bold ${report.result.discountBurntWeight && report.result.discountBurntWeight > 0 ? 'text-red-650' : 'text-stone-450'}`}>
                      {report.result.discountBurntWeight && report.result.discountBurntWeight > 0 ? `-${Math.round(report.result.discountBurntWeight).toLocaleString('pt-BR')} kg` : '0 kg'}
                    </td>
                  </tr>
                )}

                {/* Mofados Row */}
                {report.sample.grainType === 'SOJA' && (
                  <tr>
                    <td className="p-2.5 font-semibold text-stone-900">
                      <div>Grãos Mofados</div>
                      <div className="text-[9px] text-stone-400 font-normal">Mofos e fungos visíveis</div>
                    </td>
                    <td className="p-2.5 text-center font-mono">{(config?.standardMoldy || 6.0).toFixed(1)}%</td>
                    <td className={`p-2.5 text-center font-mono font-bold ${moldyExceeded ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {(report.sample.moldyGrams || 0).toFixed(1)}g ({(report.result.moldyPercent || 0).toFixed(1)}%)
                    </td>
                    <td className={`p-2.5 text-center font-mono ${report.result.sampleDiscountMoldy && report.result.sampleDiscountMoldy > 0 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                      {report.result.sampleDiscountMoldy && report.result.sampleDiscountMoldy > 0 ? `-${report.result.sampleDiscountMoldy.toFixed(1)}g` : '0g'}
                    </td>
                    <td className={`p-2.5 text-right font-mono font-bold ${report.result.discountMoldyWeight && report.result.discountMoldyWeight > 0 ? 'text-red-650' : 'text-stone-450'}`}>
                      {report.result.discountMoldyWeight && report.result.discountMoldyWeight > 0 ? `-${Math.round(report.result.discountMoldyWeight).toLocaleString('pt-BR')} kg` : '0 kg'}
                    </td>
                  </tr>
                )}

                {/* Gessados Row */}
                {report.sample.grainType === 'MILHO' && (
                  <tr>
                    <td className="p-2.5 font-semibold text-stone-900">
                      <div>Grãos Gessados</div>
                      <div className="text-[9px] text-stone-400 font-normal">Opacidade branca giz, farináceo</div>
                    </td>
                    <td className="p-2.5 text-center font-mono">{(config?.standardGessados || 5.0).toFixed(1)}%</td>
                    <td className={`p-2.5 text-center font-mono font-bold ${gessadosExceeded ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {(report.sample.gessadosGrams || 0).toFixed(1)}g ({(report.result.gessadosPercent || 0).toFixed(1)}%)
                    </td>
                    <td className={`p-2.5 text-center font-mono ${report.result.sampleDiscountGessados && report.result.sampleDiscountGessados > 0 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                      {report.result.sampleDiscountGessados && report.result.sampleDiscountGessados > 0 ? `-${report.result.sampleDiscountGessados.toFixed(1)}g` : '0g'}
                    </td>
                    <td className={`p-2.5 text-right font-mono font-bold ${report.result.discountGessadosWeight && report.result.discountGessadosWeight > 0 ? 'text-red-650' : 'text-stone-450'}`}>
                      {report.result.discountGessadosWeight && report.result.discountGessadosWeight > 0 ? `-${Math.round(report.result.discountGessadosWeight).toLocaleString('pt-BR')} kg` : '0 kg'}
                    </td>
                  </tr>
                )}

                {/* Broken Row */}
                <tr>
                  <td className="p-2.5 font-semibold text-stone-900">
                    <div>Quebrados / Bandas</div>
                    <div className="text-[9px] text-stone-400 font-normal">Grãos partidos ou fragmentos</div>
                  </td>
                  <td className="p-2.5 text-center font-mono">{config?.standardBroken.toFixed(1)}%</td>
                  <td className={`p-2.5 text-center font-mono font-bold ${brokenExceeded ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {report.sample.brokenGrams.toFixed(1)}g ({report.result.brokenPercent.toFixed(1)}%)
                  </td>
                  <td className={`p-2.5 text-center font-mono ${report.result.sampleDiscountBroken > 0 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                    {report.result.sampleDiscountBroken > 0 ? `-${report.result.sampleDiscountBroken.toFixed(1)}g` : '0g'}
                  </td>
                  <td className={`p-2.5 text-right font-mono font-bold ${report.result.discountBrokenWeight > 0 ? 'text-red-650' : 'text-stone-450'}`}>
                    {report.result.discountBrokenWeight > 0 ? `-${Math.round(report.result.discountBrokenWeight).toLocaleString('pt-BR')} kg` : '0 kg'}
                  </td>
                </tr>

                {/* Total discounts row */}
                <tr className="bg-stone-50 font-bold text-stone-900">
                  <td className="p-2.5" colSpan={2}>Soma Totais de Deduções</td>
                  <td className="p-2.5 text-center font-mono"></td>
                  <td className="p-2.5 text-center font-mono text-amber-700">
                    -{report.result.sampleTotalDiscounts.toFixed(1)}g ({((report.result.sampleTotalDiscounts / report.sample.officialSampleWeight) * 100).toFixed(1)}%)
                  </td>
                  <td className="p-2.5 text-right font-mono text-red-650">
                    -{Math.round(report.result.totalDiscounts).toLocaleString('pt-BR')} kg ({((report.result.totalDiscounts / report.sample.totalWeight) * 100).toFixed(1)}%)
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Classification summary badge with visual warnings */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-stone-250 rounded-lg justify-between">
          <div className="flex items-center gap-2.5">
            {report.result.totalDiscounts > 0 ? (
              <div className="p-2 bg-amber-100 text-amber-850 rounded-full flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 bg-emerald-100 text-emerald-850 rounded-full flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="font-bold text-xs text-stone-900">Tipificação do Lote Comercial</p>
              <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">
                Determinado de acordo com os limites físicos vigentes da Instrução Técnica. Tipo {report.result.classificationGrade}.
              </p>
            </div>
          </div>
          <div className="text-center font-semibold text-xs px-4 py-1.5 bg-stone-900 text-white rounded">
            {report.result.classificationGrade}
          </div>
        </div>

        {/* Notes & Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-200">
          <div className="space-y-1">
            <span className="block text-[9px] uppercase font-bold text-stone-400">Notas Adicionais do Responsável</span>
            <p className="text-[10px] text-stone-600 bg-stone-50 p-2.5 rounded border border-stone-150/60 leading-relaxed italic">
              "{report.notes || 'Sem observações adicionais gravadas.'}"
            </p>
          </div>
          <div className="space-y-1.5 flex flex-col justify-end text-right">
            <div className="inline-flex items-center gap-1 justify-end text-stone-700 text-xs font-semibold">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              Classificador: {report.operatorName}
            </div>
            <p className="text-[9px] text-stone-400 uppercase tracking-widest font-mono">Assinatura Certificada Eletronicamente</p>
          </div>
        </div>

      </div>
    </div>
  );
}
