/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Printer, Check, Eye, Code, Share2, Send, Download, Building2 } from 'lucide-react';
import { FarmerReport, GRAIN_PRESETS, GrainType } from '../types';
import { generateEscPosCommands } from '../utils/classification';
import { jsPDF } from 'jspdf';

interface PrinterSimulatorProps {
  report: FarmerReport | null;
  onShared?: (method: string) => void;
}

export default function PrinterSimulator({ report, onShared }: PrinterSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'escpos'>('visual');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [copiedEscPos, setCopiedEscPos] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  // Custom Company Name Settings state synced with localStorage and custom event triggering
  const [companyName, setCompanyName] = useState<string>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('graocert_custom_company_name') || '' : '';
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
    window.dispatchEvent(new Event('graocert_company_name_updated'));
  };

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setCompanyName(localStorage.getItem('graocert_custom_company_name') || '');
      } catch (e) {
        console.warn(e);
      }
    };
    window.addEventListener('graocert_company_name_updated', handleUpdate);
    return () => {
      window.removeEventListener('graocert_company_name_updated', handleUpdate);
    };
  }, []);

  const triggerPrintSim = () => {
    if (!report) return;
    setIsPrinting(true);
    setPrintSuccess(false);

    // Scroll paper container or trigger feed animation effect
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      if (onShared) onShared('Impressão Térmica');
      setTimeout(() => setPrintSuccess(false), 3000);
    }, 2000);
  };

  const copyEscPosToClipboard = () => {
    if (!report) return;
    const commands = generateEscPosCommands(report);
    navigator.clipboard.writeText(commands).then(() => {
      setCopiedEscPos(true);
      setTimeout(() => setCopiedEscPos(false), 2000);
    });
  };

  const getThermalReceiptText = () => {
    if (!report) return '';
    const dateStr = new Date(report.date).toLocaleDateString('pt-BR') + ' ' + new Date(report.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const config = GRAIN_PRESETS[report.sample.grainType as GrainType];
    
    let physicalAnalysisLines = 
      `Umidade   ${report.sample.moisture.toFixed(1)}%    ${config.standardMoisture.toFixed(1)}%   -${Math.round(report.result.discountMoistureWeight)}k\n` +
      `Impurez.  ${report.result.impurityPercent.toFixed(1)}%     ${config.standardImpurity.toFixed(1)}%   -${Math.round(report.result.discountImpurityWeight)}k\n` +
      `Avariad.  ${report.result.damagedPercent.toFixed(1)}%     ${config.standardDamaged.toFixed(1)}%   -${Math.round(report.result.discountDamagedWeight)}k\n`;

    if (report.sample.grainType === 'SOJA') {
      const greenLim = config.standardGreen || 8.0;
      const greenDeduc = report.result.discountGreenWeight || 0;
      physicalAnalysisLines += `Esverd.   ${(report.result.greenPercent || 0).toFixed(1)}%     ${greenLim.toFixed(1)}%   -${Math.round(greenDeduc)}k\n`;

      const burntLim = config.standardBurnt || 1.0;
      const burntDeduc = report.result.discountBurntWeight || 0;
      physicalAnalysisLines += `Queimad.  ${(report.result.burntPercent || 0).toFixed(1)}%     ${burntLim.toFixed(1)}%   -${Math.round(burntDeduc)}k\n`;

      const moldyLim = config.standardMoldy || 6.0;
      const moldyDeduc = report.result.discountMoldyWeight || 0;
      physicalAnalysisLines += `Mofado    ${(report.result.moldyPercent || 0).toFixed(1)}%     ${moldyLim.toFixed(1)}%   -${Math.round(moldyDeduc)}k\n`;
    }

    if (report.sample.grainType === 'MILHO') {
      const gessadosLim = config.standardGessados || 5.0;
      const gessadosDeduc = report.result.discountGessadosWeight || 0;
      physicalAnalysisLines += `Gessado   ${(report.result.gessadosPercent || 0).toFixed(1)}%     ${gessadosLim.toFixed(1)}%   -${Math.round(gessadosDeduc)}k\n`;
    }

    physicalAnalysisLines += `Quebrad.  ${report.result.brokenPercent.toFixed(1)}%    ${config.standardBroken.toFixed(1)}%   -${Math.round(report.result.discountBrokenWeight)}k\n`;

    // Normalize and clean company name for old thermal print drivers
    const cleanCompName = companyName ? companyName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
    const nameLine = cleanCompName ? (cleanCompName.length > 20 ? cleanCompName.substring(0, 30) : cleanCompName) : 'GRÂOCERT';
    const subHeaderLine = cleanCompName ? 'LAUDO DE CLASSIFICAÇÃO' : 'CLASSIFICAÇÃO DE GRÃOS';

    // Monospace center helper
    const centerPad = (text: string, width: number = 32) => {
      const padLen = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padLen) + text;
    };

    return `--------------------------------\n` +
           `${centerPad(nameLine)}\n` +
           `${centerPad(subHeaderLine)}\n` +
           `${centerPad('ESTAÇÃO DE CAMPO')}\n` +
           `--------------------------------\n` +
           `Nro Laudo: #${String(report.reportNumber).padStart(5, '0')}\n` +
           `Data: ${dateStr}\n` +
           `--------------------------------\n` +
           `Produtor: ${report.farmerName}\n` +
           `Fazenda : ${report.farmName}\n` +
           `Placa   : ${report.vehiclePlate.toUpperCase()}\n` +
           `Lote    : ${report.lotReference}\n` +
           `Tipo    : ${report.emissionType || 'Laudo de Entrada'}\n` +
           `Destino : ${report.cargoDestination || 'Moega Principal'}\n` +
           `Regime  : ${report.commercialTreatment || 'Padrão Geral'}\n` +
           `--------------------------------\n` +
           `PRODUTO: ${report.sample.grainType}\n` +
           `PESO LÍQ. BALANÇA: ${report.sample.totalWeight.toLocaleString('pt-BR')} kg\n` +
           `--------------------------------\n` +
           `ANÁLISE FÍSICA:\n` +
           `Item      Medido   Padrão  Deduc.\n` +
           physicalAnalysisLines +
           `--------------------------------\n` +
           `TOTAL DESCONTOS: -${Math.round(report.result.totalDiscounts).toLocaleString('pt-BR')} kg\n` +
           `PESO LÍQUIDO   : ${Math.round(report.result.finalNetWeight).toLocaleString('pt-BR')} kg\n` +
           `--------------------------------\n` +
           `CLASSIFICAÇÃO: ${report.result.classificationGrade}\n` +
           `--------------------------------\n` +
           `Agradecemos a entrega!\n` +
           `Cupom emitido via ${cleanCompName || 'Grãocerto Pro'}.\n` +
           `--------------------------------`;
  };

  const handleShareReceiptWhatsApp = () => {
    if (!report) return;
    const text = getThermalReceiptText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
    if (onShared) onShared('Cupom WhatsApp');
  };

  const handleCopyReceiptText = () => {
    if (!report) return;
    const text = getThermalReceiptText();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedReceipt(true);
      if (onShared) onShared('Cópia de Texto de Cupom');
      setTimeout(() => setCopiedReceipt(false), 2000);
    });
  };

  const handleNativeReceiptShare = () => {
    if (!report) return;
    if (navigator.share) {
      const text = getThermalReceiptText();
      navigator.share({
        title: `Cupom de Classificação #${report.reportNumber}`,
        text: text,
      })
      .then(() => {
        if (onShared) onShared('Cupom Nativo');
      })
      .catch((err) => {
        console.warn('Erro ao compartilhar cupom:', err);
      });
    } else {
      handleCopyReceiptText();
    }
  };

  const handleDownloadThermalPDF = () => {
    if (!report) return;
    try {
      const config = GRAIN_PRESETS[report.sample.grainType as GrainType];
      const isSoja = report.sample.grainType === 'SOJA';
      const height = isSoja ? 212 : 198;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, height]
      });

      // Monospace layout to match thermal feed
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);

      if (companyName) {
        doc.text(companyName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), 40, 10, { align: 'center' });
        doc.text("LAUDO DE CLASSIFICACAO", 40, 14, { align: 'center' });
      } else {
        doc.text("(o o) GRÃOCERT", 40, 10, { align: 'center' });
        doc.text("CLASSIFICAÇÃO DE GRÃOS", 40, 14, { align: 'center' });
      }
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.text("ESTAÇÃO DE CAMPO", 40, 18, { align: 'center' });
      doc.text("--------------------------------", 40, 22, { align: 'center' });

      doc.setFont("courier", "bold");
      doc.text(`Nro Laudo: #${String(report.reportNumber).padStart(5, '0')}`, 10, 26);
      doc.setFont("courier", "normal");
      const dateStr = new Date(report.date).toLocaleDateString('pt-BR') + ' ' + new Date(report.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      doc.text(`Data: ${dateStr}`, 10, 30);
      doc.text("--------------------------------", 40, 34, { align: 'center' });

      doc.text(`Produtor: ${report.farmerName}`, 10, 38, { maxWidth: 64 });
      doc.text(`Fazenda : ${report.farmName}`, 10, 42, { maxWidth: 64 });
      doc.text(`Placa   : ${report.vehiclePlate.toUpperCase()}`, 10, 46);
      doc.text(`DestinoF: ${report.lotReference}`, 10, 50);
      doc.text(`Tipo    : ${report.emissionType || 'Laudo de Entrada'}`, 10, 54, { maxWidth: 64 });
      doc.text(`Destino : ${report.cargoDestination || 'Moega Principal'}`, 10, 58, { maxWidth: 64 });
      doc.text(`Regime  : ${report.commercialTreatment || 'Padrão Geral'}`, 10, 62, { maxWidth: 64 });
      doc.text("--------------------------------", 40, 66, { align: 'center' });

      doc.setFont("courier", "bold");
      doc.text(`PRODUTO: ${report.sample.grainType}`, 10, 70);
      doc.text(`PESO LÍQ. BALANÇA: ${report.sample.totalWeight.toLocaleString('pt-BR')} kg`, 10, 74);
      doc.setFont("courier", "normal");
      doc.text("--------------------------------", 40, 78, { align: 'center' });

      doc.setFont("courier", "bold");
      doc.text("ANÁLISE FÍSICA:", 10, 82);
      doc.setFont("courier", "normal");
      doc.text("Item      Medido   Padrão  Deduc.", 10, 86);

      let curY = 90;
      const rows = [
        { name: "Umidade", med: `${report.sample.moisture.toFixed(1)}%`, std: `${config.standardMoisture.toFixed(1)}%`, ded: `-${Math.round(report.result.discountMoistureWeight)}k` },
        { name: "Impurez.", med: `${report.result.impurityPercent.toFixed(1)}%`, std: `${config.standardImpurity.toFixed(1)}%`, ded: `-${Math.round(report.result.discountImpurityWeight)}k` },
        { name: "Avariad.", med: `${report.result.damagedPercent.toFixed(1)}%`, std: `${config.standardDamaged.toFixed(1)}%`, ded: `-${Math.round(report.result.discountDamagedWeight)}k` }
      ];

      if (isSoja) {
        rows.push({
          name: "Esverd.",
          med: `${(report.result.greenPercent || 0).toFixed(1)}%`,
          std: `${(config.standardGreen || 8.0).toFixed(1)}%`,
          ded: `-${Math.round(report.result.discountGreenWeight || 0)}k`
        });
        rows.push({
          name: "Queimad.",
          med: `${(report.result.burntPercent || 0).toFixed(1)}%`,
          std: `${(config.standardBurnt || 1.0).toFixed(1)}%`,
          ded: `-${Math.round(report.result.discountBurntWeight || 0)}k`
        });
        rows.push({
          name: "Mofado",
          med: `${(report.result.moldyPercent || 0).toFixed(1)}%`,
          std: `${(config.standardMoldy || 6.0).toFixed(1)}%`,
          ded: `-${Math.round(report.result.discountMoldyWeight || 0)}k`
        });
      }

      if (report.sample.grainType === 'MILHO') {
        rows.push({
          name: "Gessado",
          med: `${(report.result.gessadosPercent || 0).toFixed(1)}%`,
          std: `${(config.standardGessados || 5.0).toFixed(1)}%`,
          ded: `-${Math.round(report.result.discountGessadosWeight || 0)}k`
        });
      }

      rows.push({
        name: "Quebrad.",
        med: `${report.result.brokenPercent.toFixed(1)}%`,
        std: `${config.standardBroken.toFixed(1)}%`,
        ded: `-${Math.round(report.result.discountBrokenWeight)}k`
      });

      rows.forEach(item => {
        const nameCol = item.name.padEnd(10, ' ').substring(0, 10);
        const medCol = item.med.padStart(8, ' ');
        const stdCol = item.std.padStart(9, ' ');
        const dedCol = item.ded.padStart(8, ' ');
        doc.text(`${nameCol}${medCol}${stdCol}${dedCol}`, 10, curY);
        curY += 4;
      });

      doc.text("--------------------------------", 40, curY, { align: 'center' });
      curY += 4;

      doc.setFont("courier", "bold");
      doc.text(`TOTAL DESCONTOS: -${Math.round(report.result.totalDiscounts).toLocaleString('pt-BR')} kg`, 10, curY);
      curY += 5;

      doc.setFillColor(30, 30, 30);
      doc.rect(8, curY - 3, 64, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`PESO LÍQUIDO   : ${Math.round(report.result.finalNetWeight).toLocaleString('pt-BR')} kg`, 10, curY);

      doc.setTextColor(30, 30, 30);
      curY += 6;

      doc.setFont("courier", "bold");
      doc.text(`CLASSIFICAÇÃO: ${report.result.classificationGrade}`, 10, curY, { maxWidth: 64 });
      curY += 8;

      doc.setFont("courier", "normal");
      doc.text("--------------------------------", 40, curY, { align: 'center' });
      curY += 4;

      doc.setFontSize(7.5);
      doc.text("Agradecemos a entrega!", 40, curY, { align: 'center' });
      const cleanCompName = companyName ? companyName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
      doc.text(`Emitido via ${cleanCompName || 'Grãocerto Pro'}.`, 40, curY + 3, { align: 'center' });

      doc.save(`cupom-graocert-${report.reportNumber}.pdf`);

      if (onShared) onShared('Download Cupom Termo-PDF');
    } catch (err) {
      console.error("Erro ao gerar cupom PDF:", err);
    }
  };

  const formattedEscPos = report ? generateEscPosCommands(report) : 'Nenhum laudo selecionado para impressão.';

  return (
    <div id="printer-simulator-module" className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-full animate-fade-in">
      {/* Module Title */}
      <div className="bg-stone-50 border-b border-stone-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <Printer className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">Emissão & Impressão de Cupom</h3>
            <p className="text-xs text-stone-500 font-sans">Visualização de via portátil para entrega imediata de campo</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-250">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Leopard A7 Ativa
          </span>
        </div>
      </div>

      {/* Dynamic Company Header input on Thermal Slip page */}
      <div className="bg-stone-50/50 border-b border-stone-150 p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 text-xs font-sans">
        <label htmlFor="custom-company-name-input-thermal" className="font-extrabold text-stone-700 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
          <Building2 className="w-3.5 h-3.5 text-stone-600" />
          Cabeçalho do Cupom Térmico:
        </label>
        <div className="relative flex-1 w-full">
          <input
            id="custom-company-name-input-thermal"
            type="text"
            value={companyName}
            onChange={(e) => handleCompanyNameChange(e.target.value)}
            placeholder="Digite o nome da sua empresa (substitui 'GRÂOCERT' no cupom)"
            className="w-full bg-white border border-stone-250 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 transition-all font-sans"
          />
          <Building2 className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
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

      {/* Optimized Unified Column - Receipt Preview & Action Buttons */}
      <div className="bg-stone-950 p-4 flex flex-col lg:flex-row gap-6 items-center lg:items-stretch min-h-[480px]">
        
        {/* Left/Main Side: Receipt paper scroll inside simulated dark frame */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {report && (
            <div className="flex gap-1.5 mb-3 bg-stone-900 p-1.5 rounded-lg border border-stone-800 w-[260px] justify-between">
              <button
                id="btn-share-receipt-whats"
                onClick={handleShareReceiptWhatsApp}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition cursor-pointer shadow-sm"
                title="Compartilhar Cupom no WhatsApp"
              >
                <Send className="w-2.5 h-2.5" />
                WhatsApp
              </button>
              <button
                id="btn-share-receipt-pdf-quick"
                onClick={handleDownloadThermalPDF}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-bold transition cursor-pointer shadow-sm"
                title="Baixar Cupom em PDF"
              >
                <Download className="w-2.5 h-2.5" />
                Imprimir/PDF
              </button>
              <button
                id="btn-share-receipt-copy"
                onClick={handleCopyReceiptText}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded text-[10px] font-bold transition cursor-pointer shadow-sm"
                title="Copiar Texto Físico do Cupom"
              >
                {copiedReceipt ? "Copiado!" : "Copiar"}
              </button>
            </div>
          )}

          <div 
            ref={paperRef}
            id="virtual-receipt-roll"
            className={`w-[260px] bg-amber-50 text-stone-950 font-mono text-[9px] leading-tight p-4 shadow-xl relative border-t-4 border-stone-300 transition-all duration-700 ease-out origin-top ${
              isPrinting ? 'animate-[pulse_1s_infinite] scale-y-105' : ''
            }`}
            style={{
              minHeight: '380px',
              backgroundImage: 'radial-gradient(#000 10%, transparent 10%)',
              backgroundSize: '10px 10px',
              backgroundPosition: '0 0',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)'
            }}
          >
            {/* Torn edge simulator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-stone-300 flex overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 bg-stone-950 rotate-45 transform -translate-y-1.5 flex-shrink-0"></div>
              ))}
            </div>

            {report ? (
              <div className="pt-2 text-[9px]">
                <div className="text-center font-bold text-[10px] mb-2 leading-none uppercase">
                  {companyName ? (
                    <>
                      {companyName} <br/>
                      <span className="text-[8px] font-semibold text-stone-600">LAUDO DE CLASSIFICAÇÃO</span>
                    </>
                  ) : (
                    <>
                      (o o) GRÃOCERT <br/>
                      CLASSIFICAÇÃO DE GRÃOS
                    </>
                  )}
                </div>
                <div className="text-center text-[8px] mb-1">
                  ESTAÇÃO DE CAMPO
                </div>
                <p className="border-b border-dashed border-stone-800 my-1"></p>
                
                <div className="flex justify-between font-bold">
                  <span>Nro Laudo:</span>
                  <span>#{String(report.reportNumber).padStart(5, '0')}</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span>Data:</span>
                  <span>{new Date(report.date).toLocaleDateString()} {new Date(report.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>

                <p className="border-b border-dashed border-stone-800 my-1"></p>
                
                <div className="space-y-0.5">
                  <div className="truncate"><span className="font-bold">Produtor:</span> {report.farmerName}</div>
                  <div className="truncate"><span className="font-bold">Fazenda :</span> {report.farmName}</div>
                  <div><span className="font-bold">Placa   :</span> {report.vehiclePlate.toUpperCase()}</div>
                  <div><span className="font-bold">Destino F.:</span> {report.lotReference}</div>
                </div>

                <p className="border-b border-dashed border-stone-800 my-1"></p>

                <div className="flex justify-between font-bold">
                  <span>PRODUTO:</span>
                  <span className="bg-stone-900 text-white px-1 py-0.2 rounded text-[8px]">{report.sample.grainType}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>PESO LÍQ. BALANÇA:</span>
                  <span className="font-bold">{report.sample.totalWeight.toLocaleString('pt-BR')} kg</span>
                </div>

                <p className="border-b border-dashed border-stone-800 my-1"></p>

                <div className="font-bold mb-0.5">ANÁLISE FÍSICA:</div>
                <div className="grid grid-cols-4 font-bold text-[8px] border-b border-dashed border-stone-400 pb-0.5 text-center">
                  <span className="text-left font-bold">Item</span>
                  <span className="font-bold">Medido</span>
                  <span className="font-bold">Padrão</span>
                  <span className="font-bold text-right">Deduc.</span>
                </div>
                {(() => {
                  const config = GRAIN_PRESETS[report.sample.grainType as GrainType];
                  return (
                    <div className="space-y-0.5 text-center pt-1">
                      <div className="grid grid-cols-4">
                        <span className="text-left">Umidade</span>
                        <span>{report.sample.moisture.toFixed(1)}%</span>
                        <span>{config.standardMoisture.toFixed(1)}%</span>
                        <span className="text-right">-{Math.round(report.result.discountMoistureWeight)}k</span>
                      </div>
                      <div className="grid grid-cols-4">
                        <span className="text-left">Impureza</span>
                        <span>{report.result.impurityPercent.toFixed(1)}%</span>
                        <span>{config.standardImpurity.toFixed(1)}%</span>
                        <span className="text-right">-{Math.round(report.result.discountImpurityWeight)}k</span>
                      </div>
                      <div className="grid grid-cols-4">
                        <span className="text-left">Avariado</span>
                        <span>{report.result.damagedPercent.toFixed(1)}%</span>
                        <span>{config.standardDamaged.toFixed(1)}%</span>
                        <span className="text-right">-{Math.round(report.result.discountDamagedWeight)}k</span>
                      </div>
                      {report.sample.grainType === 'SOJA' && (
                        <>
                          <div className="grid grid-cols-4">
                            <span className="text-left">Esverd.</span>
                            <span>{(report.result.greenPercent || 0).toFixed(1)}%</span>
                            <span>{(config.standardGreen || 8.0).toFixed(1)}%</span>
                            <span className="text-right">-{Math.round(report.result.discountGreenWeight || 0)}k</span>
                          </div>
                          <div className="grid grid-cols-4">
                            <span className="text-left">Queimad.</span>
                            <span>{(report.result.burntPercent || 0).toFixed(1)}%</span>
                            <span>{(config.standardBurnt || 1.0).toFixed(1)}%</span>
                            <span className="text-right">-{Math.round(report.result.discountBurntWeight || 0)}k</span>
                          </div>
                          <div className="grid grid-cols-4">
                            <span className="text-left">Mofado</span>
                            <span>{(report.result.moldyPercent || 0).toFixed(1)}%</span>
                            <span>{(config.standardMoldy || 6.0).toFixed(1)}%</span>
                            <span className="text-right">-{Math.round(report.result.discountMoldyWeight || 0)}k</span>
                          </div>
                        </>
                      )}
                      {report.sample.grainType === 'MILHO' && (
                        <div className="grid grid-cols-4">
                          <span className="text-left">Gessado</span>
                          <span>{(report.result.gessadosPercent || 0).toFixed(1)}%</span>
                          <span>{(config.standardGessados || 5.0).toFixed(1)}%</span>
                          <span className="text-right">-{Math.round(report.result.discountGessadosWeight || 0)}k</span>
                        </div>
                      )}
                      <div className="grid grid-cols-4">
                        <span className="text-left">Quebrado</span>
                        <span>{report.result.brokenPercent.toFixed(1)}%</span>
                        <span>{config.standardBroken.toFixed(1)}%</span>
                        <span className="text-right">-{Math.round(report.result.discountBrokenWeight)}k</span>
                      </div>
                    </div>
                  );
                })()}

                <p className="border-b border-dashed border-stone-800 my-1"></p>

                <div className="flex justify-between font-bold">
                  <span>TOTAL DESCONTOS:</span>
                  <span>-{Math.round(report.result.totalDiscounts).toLocaleString('pt-BR')} kg</span>
                </div>
                <div className="flex justify-between font-bold text-[10px] mt-0.5 bg-stone-900 text-white px-1 py-0.5 font-mono">
                  <span>PESO LIQ. COMERCIAL:</span>
                  <span>{Math.round(report.result.finalNetWeight).toLocaleString('pt-BR')} kg</span>
                </div>

                <p className="border-b border-dashed border-stone-800 my-1"></p>

                <div className="text-[8px] font-bold leading-tight">
                  CLASSIFICAÇÃO: <span className="bg-stone-200 px-1 py-0.2 rounded font-black">{report.result.classificationGrade}</span>
                </div>

                <p className="border-b border-dashed border-stone-800 my-1"></p>

                <div className="text-center text-[7.5px] text-stone-600 mt-2 space-y-0.5">
                  <p className="font-bold">Obrigado pela preferência!</p>
                  <p>Operação portátil homologada MAPA</p>
                  <p className="font-mono text-[7px] uppercase opacity-75">cupom gerado via smartphone</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-stone-400 h-full pt-16">
                <Printer className="w-8 h-8 opacity-25 mb-2" />
                <p className="text-[10px] font-bold text-center">Nenhum cupom gerado</p>
                <p className="text-[9px] text-stone-500 text-center max-w-[150px] mt-1">Preencha um laudo para alimentar a bobina térmica.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Fast Actions panel */}
        <div className="w-full lg:w-72 flex flex-col justify-center gap-4 bg-stone-900 p-4 rounded-xl border border-stone-800">
          <div className="space-y-1">
            <h4 className="text-white text-xs font-extrabold uppercase tracking-widest flex items-center gap-1">
              🚀 AÇÕES RÁPIDAS
            </h4>
            <p className="text-[10px] text-stone-400 font-sans">Emita cupons térmicos para a sua impressora Leopard A7 sem precisar parear</p>
          </div>

          <button
            id="btn-trigger-print"
            disabled={!report || isPrinting}
            onClick={triggerPrintSim}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition text-xs uppercase tracking-wider cursor-pointer ${
              !report 
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-750'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 border border-emerald-500 active:scale-[0.98]'
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-100" />
            {isPrinting ? 'Imprimindo Cupom...' : 'Disparar Cupom Portátil'}
          </button>

          {report && (
            <button
              id="btn-trigger-pdf-thermal"
              onClick={handleDownloadThermalPDF}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 hover:border-stone-600 rounded-xl font-bold transition text-xs shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              Baixar Via PDF (80mm)
            </button>
          )}

          {printSuccess && (
            <p className="text-[10px] text-emerald-400 text-center font-bold bg-emerald-950/20 border border-emerald-900/55 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 animate-bounce">
              <Check className="w-3.5 h-3.5" /> Cupom impresso e expedido com sucesso!
            </p>
          )}

          {!report && (
            <p className="text-[10px] text-stone-500 text-center italic mt-1 leading-normal font-sans">
              Selecione um laudo salvo na aba do arquivo central para visualizar a bobina e emitir.
            </p>
          )}
        </div>

      </div>

      {/* Footer message / feedback inside phone frame */}
      <div className="bg-stone-50 p-4 border-t border-stone-100 text-center flex items-center justify-center gap-1.5 text-[10px] text-stone-500 font-sans font-medium font-mono">
        {isPrinting ? (
          <span className="text-amber-800 animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
            Transmitindo buffer de dados de classificação para o cabeçote térmico...
          </span>
        ) : report ? (
          <span className="text-stone-650 flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Emissor térmico calibrado. Pronto para entrega física de campo.
          </span>
        ) : (
          <span>Selecione ou gere um laudo de classificação para alimentar o rolo.</span>
        )}
      </div>
    </div>
  );
}
