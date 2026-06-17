/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Trash2, Share2, FileDown, Clock, Eye, Send, Printer, LayoutGrid, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { FarmerReport, GRAIN_PRESETS, GrainType } from '../types';
import { downloadReportPDF, downloadDailyClassificationsPDF } from '../utils/pdfGenerator';
import { downloadDailyClassificationsExcel } from '../utils/excelGenerator';

interface ReportHistoryProps {
  reports: FarmerReport[];
  selectedId: string | null;
  onSelect: (report: FarmerReport) => void;
  onDelete: (id: string) => void;
  onShared?: (method: string) => void;
}

export default function ReportHistory({ reports, selectedId, onSelect, onDelete, onShared }: ReportHistoryProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrain, setFilterGrain] = useState<GrainType | 'ALL'>('ALL');
  const [filterValidity, setFilterValidity] = useState<'ALL' | 'VALID' | 'ARCHIVED'>('ALL');
  const [copiedLinkReportId, setCopiedLinkReportId] = useState<string | null>(null);

  // Consolidated Daily Spreadsheet (PDF & Excel) States
  const [dailyReportDate, setDailyReportDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isDailyGenerating, setIsDailyGenerating] = useState(false);
  const [dailyErrorMsg, setDailyErrorMsg] = useState<string | null>(null);

  const isReportValid12h = (report: FarmerReport) => {
    try {
      if (!report.date) return true;
      const repDate = new Date(report.date);
      const now = new Date();
      const diffMs = now.getTime() - repDate.getTime();
      return diffMs >= 0 && diffMs < 12 * 60 * 60 * 1000;
    } catch (e) {
      return true;
    }
  };

  const getValidityBadgeText = (report: FarmerReport) => {
    try {
      if (!report.date) return { text: '🟢 Válido', isValid: true };
      const repDate = new Date(report.date);
      const now = new Date();
      const diffMs = now.getTime() - repDate.getTime();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      if (diffMs < 0) {
        return { text: '🟢 Válido (Futuro)', isValid: true };
      }
      if (diffMs < twelveHoursMs) {
        const remainingMs = twelveHoursMs - diffMs;
        const h = Math.floor(remainingMs / (1000 * 60 * 60));
        const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return { text: `🟢 Válido (Vence em ${h}h ${m}m)`, isValid: true };
      }
      return { text: '📋 Arquivado (>12h)', isValid: false };
    } catch (e) {
      return { text: '🟢 Válido', isValid: true };
    }
  };

  const handleDownloadDailySpreadsheet = () => {
    setIsDailyGenerating(true);
    setDailyErrorMsg(null);
    try {
      downloadDailyClassificationsPDF(reports, dailyReportDate);
      if (onShared) {
        onShared(`Planilha Diária (${dailyReportDate})`);
      }
    } catch (err: any) {
      setDailyErrorMsg(err.message || "Não foi possível gerar a planilha de classificações.");
    } finally {
      setIsDailyGenerating(false);
    }
  };

  const handleDownloadDailyExcel = () => {
    setIsDailyGenerating(true);
    setDailyErrorMsg(null);
    try {
      downloadDailyClassificationsExcel(reports, dailyReportDate);
      if (onShared) {
        onShared(`Planilha Diária Excel (${dailyReportDate})`);
      }
    } catch (err: any) {
      setDailyErrorMsg(err.message || "Não foi possível gerar a planilha em formato Excel.");
    } finally {
      setIsDailyGenerating(false);
    }
  };

  // Search and filter logic with deep safety guards to prevent white screen crashes
  const filteredReports = reports.filter(r => {
    const farmer = r.farmerName || '';
    const farm = r.farmName || '';
    const lot = r.lotReference || '';
    const reportNum = String(r.reportNumber || '');

    const matchesSearch = 
      farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reportNum.includes(searchTerm);
    
    const matchesGrain = filterGrain === 'ALL' || r.sample?.grainType === filterGrain;
    
    const matchesValidity = 
      filterValidity === 'ALL' ||
      (filterValidity === 'VALID' && isReportValid12h(r)) ||
      (filterValidity === 'ARCHIVED' && !isReportValid12h(r));

    return matchesSearch && matchesGrain && matchesValidity;
  });

  const handleShareWhatsApp = (report: FarmerReport) => {
    // Elegant agro messaging template
    const grainType = report.sample?.grainType || 'SOJA';
    const totalWeight = report.sample?.totalWeight || 0;
    const moisture = report.sample?.moisture || 0;
    const impurityPercent = report.result?.impurityPercent || 0;
    const totalDiscounts = report.result?.totalDiscounts || 0;
    const finalNetWeight = report.result?.finalNetWeight || 0;
    const classificationGrade = report.result?.classificationGrade || 'PRODUTOR';

    const message = `*GRÃOCERT - LAUDO DE CLASSIFICAÇÃO AGRICOLA #${report.reportNumber || '00000'}*\n` +
      `🌾 Produto: *${GRAIN_PRESETS[grainType]?.name || grainType}*\n` +
      `🚜 Produtor: *${report.farmerName || ''}* - ${report.farmName || ''}\n` +
      `⚖️ Peso Líquido Balança: ${totalWeight.toLocaleString('pt-BR')} kg\n` +
      `🌧️ Umidade: ${moisture.toFixed(1)}% | Impureza: ${impurityPercent.toFixed(1)}%\n` +
      `🛡️ Total Descontos: ${Math.round(totalDiscounts).toLocaleString('pt-BR')} kg\n` +
      `💵 *PESO LÍQUIDO FINAL: ${Math.round(finalNetWeight).toLocaleString('pt-BR')} kg*\n` +
      `✅ Classificação: ${classificationGrade}\n` +
      `Estação Pro.\n` +
      `Visualize seu laudo completo: https://graocert.com/laudo/${report.id}`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    
    // Simulate navigation link or open window securely
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (onShared) onShared('WhatsApp Link');
  };

  const handleSimulateCopyLink = (report: FarmerReport) => {
    const mockUrl = `https://graocert.com/laudos/verify/${report.id}`;
    navigator.clipboard.writeText(mockUrl).then(() => {
      setCopiedLinkReportId(report.id);
      if (onShared) onShared('Link Direto de Laudo');
      setTimeout(() => setCopiedLinkReportId(null), 2000);
    });
  };

  return (
    <div id="report-history-module" className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 h-full flex flex-col transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-emerald-800" />
          <h4 className="font-semibold text-stone-900 text-sm">
            Arquivo Central de Laudos
          </h4>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
            {reports.length}
          </span>
        </div>
        <button
          id="btn-toggle-minimize-history"
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1 px-2 rounded hover:bg-stone-100 text-stone-500 flex items-center gap-1 text-[11px] font-bold cursor-pointer transition border border-stone-200 bg-stone-50"
          title={isMinimized ? "Maximizar Histórico" : "Minimizar Histórico"}
        >
          {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          <span className="sr-only sm:not-sr-only text-[9px] uppercase tracking-wide opacity-80">{isMinimized ? "Maximizar" : "Minimizar"}</span>
        </button>
      </div>

      {!isMinimized && (
        <>
          <p className="text-xs text-stone-500 mt-1 mb-3">Histórico de lotes avaliados e salvos localmente (funcionamento offline garantido).</p>

          {/* Seção da Planilha Consolidada de Classificação do Dia */}
          <div id="daily-spreadsheet-export-panel" className="bg-emerald-50/40 rounded-xl border border-emerald-100 p-3 mb-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h5 className="font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  📋 Planilha Consolidada de Laudos
                </h5>
                <p className="text-[10px] text-stone-500">
                  Selecione um dia para baixar o compilado de classificações consolidado em PDF ou Excel.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <input
                  id="target-daily-pdf-date"
                  type="date"
                  value={dailyReportDate}
                  onChange={(e) => {
                    setDailyReportDate(e.target.value);
                    setDailyErrorMsg(null);
                  }}
                  className="bg-white border border-stone-300 rounded px-2.5 py-1.5 text-stone-800 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-700 h-[32px] cursor-pointer"
                />
                <button
                  id="btn-trigger-daily-pdf-download"
                  type="button"
                  onClick={handleDownloadDailySpreadsheet}
                  disabled={isDailyGenerating}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm h-[32px]"
                  title="Baixar planilha consolidada do dia em formato de relatório PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Baixar PDF</span>
                </button>
                <button
                  id="btn-trigger-daily-excel-download"
                  type="button"
                  onClick={handleDownloadDailyExcel}
                  disabled={isDailyGenerating}
                  className="bg-emerald-800 hover:bg-emerald-950 disabled:opacity-50 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm h-[32px]"
                  title="Baixar planilha consolidada em formato compatível com Excel"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Baixar Excel</span>
                </button>
              </div>
            </div>

            {dailyErrorMsg && (
              <div id="daily-pdf-error-banner" className="mt-2.5 p-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-[10px] font-semibold flex justify-between items-center animate-fade-in">
                <span>⚠️ {dailyErrorMsg}</span>
                <button 
                  onClick={() => setDailyErrorMsg(null)}
                  className="text-red-900 font-extrabold hover:underline ml-2 cursor-pointer flex-shrink-0"
                >
                  Dispensar
                </button>
              </div>
            )}
          </div>

          {/* Controls: Search and Filters */}
          <div className="space-y-2 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" />
              <input
                id="history-search-input"
                type="text"
                placeholder="Buscar por Produtor, Fazenda, Lote ou Ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-stone-50 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                Cultura:
              </span>
              <button
                id="filter-grain-all"
                onClick={() => setFilterGrain('ALL')}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition ${
                  filterGrain === 'ALL'
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Todos
              </button>
              {(Object.keys(GRAIN_PRESETS) as GrainType[]).map((type) => (
                <button
                  key={type}
                  id={`filter-grain-${type}`}
                  onClick={() => setFilterGrain(type)}
                  className={`px-2 py-0.5 text-[10px] rounded font-medium transition ${
                    filterGrain === type
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {GRAIN_PRESETS[type]?.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center pt-1.5 border-t border-stone-100 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Validade:
              </span>
              <button
                id="filter-validity-all"
                onClick={() => setFilterValidity('ALL')}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition ${
                  filterValidity === 'ALL'
                    ? 'bg-stone-800 text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Todos ({reports.length})
              </button>
              <button
                id="filter-validity-valid"
                onClick={() => setFilterValidity('VALID')}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition flex items-center gap-1 ${
                  filterValidity === 'VALID'
                    ? 'bg-emerald-800 text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {"Válidos (≤ 12h)"} ({reports.filter(r => isReportValid12h(r)).length})
              </button>
              <button
                id="filter-validity-archived"
                onClick={() => setFilterValidity('ARCHIVED')}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition flex items-center gap-1 ${
                  filterValidity === 'ARCHIVED'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {"Arquivados (> 12h)"} ({reports.filter(r => !isReportValid12h(r)).length})
              </button>
            </div>
          </div>

          {/* Reports List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[360px] pr-1">
            {filteredReports.length > 0 ? (
              filteredReports.map((report) => {
                const isSelected = selectedId === report.id;
                const config = GRAIN_PRESETS[report.sample.grainType];
                const dateObj = new Date(report.date);

                return (
                  <div
                    key={report.id}
                    id={`history-report-card-${report.id}`}
                    className={`p-3 rounded-lg border transition flex flex-col gap-2 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/20 ring-1 ring-emerald-600/10'
                        : 'border-stone-200 bg-white hover:bg-stone-50/50'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-stone-885 select-all">
                            #{String(report.reportNumber).padStart(5, '0')}
                          </span>
                          <span className="text-[10px] font-medium bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                            {config?.emoji} {config?.name}
                          </span>
                          {(() => {
                            const valInfo = getValidityBadgeText(report);
                            return (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                valInfo.isValid 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-250 animate-pulse'
                                  : 'bg-amber-50 text-amber-800 border border-amber-250'
                              }`}>
                                {valInfo.text}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-stone-600 font-bold mt-1 truncate max-w-[200px]">
                          {report.farmerName || 'Produtor Desconhecido'}
                        </p>
                        <p className="text-[10px] text-stone-500 truncate max-w-[200px]">
                          {report.farmName} • {report.cityState}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 font-mono block">
                          {dateObj.toLocaleDateString('pt-BR')} {dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="text-xs font-bold text-stone-800 block mt-1">
                          {Math.round(report.result?.finalNetWeight || 0).toLocaleString('pt-BR')} kg liq.
                        </span>
                      </div>
                    </div>

                    {/* Tags representing analytical failures */}
                    <div className="flex flex-wrap gap-1 text-[9px]">
                      {(report.sample?.moisture || 0) > (config?.standardMoisture || 14) && (
                        <span className="bg-amber-100 text-amber-850 px-1.5 py-0.5 rounded font-mono">
                          Umidade: {report.sample?.moisture || 0}%
                        </span>
                      )}
                      {(report.result?.impurityPercent || 0) > (config?.standardImpurity || 1.0) && (
                        <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono">
                          Impureza: {(report.result?.impurityPercent || 0).toFixed(1)}%
                        </span>
                      )}
                      {(report.result?.damagedPercent || 0) > (config?.standardDamaged || 8.0) && (
                        <span className="bg-orange-100 text-orange-850 px-1.5 py-0.5 rounded font-mono">
                          Avariado: {(report.result?.damagedPercent || 0).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {/* Actions button tool rail */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-1">
                      <div className="flex gap-1.5">
                        <button
                          id={`btn-inspect-report-${report.id}`}
                          onClick={() => onSelect(report)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 px-2 py-1 rounded transition cursor-pointer"
                          title="Ver Laudo Técnico Completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Visualizar
                        </button>
                        <button
                          id={`btn-download-pdf-history-${report.id}`}
                          onClick={() => downloadReportPDF(report)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded transition cursor-pointer"
                          title="Baixar Laudo PDF A4"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          PDF
                        </button>
                        <button
                          id={`btn-share-whatsapp-${report.id}`}
                          onClick={() => handleShareWhatsApp(report)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition cursor-pointer"
                          title="Compartilhar pelo WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Enviar
                        </button>
                        <button
                          id={`btn-copy-link-${report.id}`}
                          onClick={() => handleSimulateCopyLink(report)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-600 hover:text-stone-850 hover:bg-stone-50 px-2 py-1 rounded transition cursor-pointer"
                          title="Copiar Link do Laudo"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          {copiedLinkReportId === report.id ? 'Copiado!' : 'Link'}
                        </button>
                      </div>
                      <button
                        id={`btn-delete-report-${report.id}`}
                        onClick={() => onDelete(report.id)}
                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                        title="Excluir Laudo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-stone-400">
                <LayoutGrid className="w-8 h-8 opacity-25 mb-1.5" />
                <p className="text-xs font-bold">Nenhum laudo encontrado</p>
                <p className="text-[10px] text-stone-500 max-w-[170px] mt-0.5">Faça uma busca diferente ou salve um novo laudo no formulário ao lado.</p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-stone-100 text-[10px] text-stone-500 flex justify-between items-center bg-stone-50 p-2.5 rounded">
            <span>Exibindo <strong>{filteredReports.length}</strong> de {reports.length} laudos</span>
            <span className="text-emerald-700 font-semibold">• Cache Offline Ativo</span>
          </div>
        </>
      )}
    </div>
  );
}
