import { jsPDF } from 'jspdf';
import { FarmerReport, GRAIN_PRESETS, GrainType } from '../types';

export function downloadReportPDF(report: FarmerReport, customCompanyName?: string) {
  if (!report) return;

  try {
    const finalCompanyName = customCompanyName || (typeof window !== 'undefined' ? localStorage.getItem('graocert_custom_company_name') || '' : '');
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

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Header Background Accent (Emerald Line at the absolute top)
    doc.setFillColor(16, 115, 81);
    doc.rect(10, 10, 190, 4, 'F');

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(16, 115, 81);
    const headerTitle = finalCompanyName 
      ? `${finalCompanyName.toUpperCase()} - LAUDO DE CLASSIFICAÇÃO AGRICOLA` 
      : "GRÃOCERT - CERTIFICADO DE CLASSIFICAÇÃO RURAL";
    doc.text(headerTitle, 10, 24);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const subTitle = finalCompanyName
      ? `Laudo emitido por: ${finalCompanyName}`
      : "Grãocerto Pro - Estação Integrada de Monitoramento e Classificação de Campo";
    doc.text(subTitle, 10, 29);
    doc.text(`Identificador do Laudo: ${report.id}`, 10, 33);

    // Right-aligned report number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text(`LAUDO N° ${String(report.reportNumber).padStart(5, '0')}`, 150, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Data: ${dateStr}`, 150, 29);
    doc.text(`Hora: ${timeStr}`, 150, 33);

    // Decorative line divider
    doc.setDrawColor(16, 115, 81);
    doc.setLineWidth(0.4);
    doc.line(10, 37, 200, 37);

    // Section 1: PRODUTOR & PROPRIEDADE
    doc.setFillColor(248, 248, 246);
    doc.rect(10, 42, 190, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 115, 81);
    doc.text("1. INFORMAÇÕES DO PRODUTOR E DA CARGA", 12, 47);

    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);
    
    // Row 1
    doc.setFont("helvetica", "bold");
    doc.text("Produtor Rural:", 12, 54);
    doc.setFont("helvetica", "normal");
    doc.text(report.farmerName, 36, 54);

    doc.setFont("helvetica", "bold");
    doc.text("Propriedade:", 110, 54);
    doc.setFont("helvetica", "normal");
    doc.text(report.farmName, 132, 54);

    // Row 2
    doc.setFont("helvetica", "bold");
    doc.text("Localidade / UF:", 12, 60);
    doc.setFont("helvetica", "normal");
    doc.text(report.cityState, 36, 60);

    doc.setFont("helvetica", "bold");
    doc.text("Veículo Placa:", 110, 60);
    doc.setFont("helvetica", "normal");
    doc.text((report.vehiclePlate || "N/A").toUpperCase(), 132, 60);

    // Row 3
    doc.setFont("helvetica", "bold");
    doc.text("Destino Final:", 12, 66);
    doc.setFont("helvetica", "normal");
    doc.text(report.lotReference, 36, 66);

    doc.setFont("helvetica", "bold");
    doc.text("Classificador:", 110, 66);
    doc.setFont("helvetica", "normal");
    doc.text(report.operatorName, 132, 66);

    // Row 4: Specifications
    doc.setFont("helvetica", "bold");
    doc.text("Laudo Tipo / Dest:", 12, 72);
    doc.setFont("helvetica", "normal");
    const emissionAndDest = `${report.emissionType || 'Laudo de Entrada'} [${report.cargoDestination || 'Moega Principal'}]`;
    doc.text(emissionAndDest, 40, 72);

    doc.setFont("helvetica", "bold");
    doc.text("Regime Desconto:", 110, 72);
    doc.setFont("helvetica", "normal");
    doc.text(report.commercialTreatment || 'Padrão Geral', 138, 72);

    // Border around section 1 (increased height to 37)
    doc.setDrawColor(220, 220, 215);
    doc.setLineWidth(0.25);
    doc.rect(10, 42, 190, 36);

    // Section 2: PESO DE BALANÇA (shifted from 76 to 84)
    doc.setFillColor(248, 248, 246);
    doc.rect(10, 84, 190, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 115, 81);
    doc.text("2. DETERMINAÇÃO DE PESO BRUTO RURAL", 12, 89);

    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);
    
    doc.setFont("helvetica", "bold");
    doc.text("Cultura Agrícola:", 12, 97);
    doc.setFont("helvetica", "normal");
    doc.text(`${report.sample.grainType} (${config?.name || 'Classificação Básica'})`, 40, 97);

    doc.setFont("helvetica", "bold");
    doc.text("Peso Bruto Inicial Balança:", 110, 97);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 115, 81);
    doc.text(`${report.sample.totalWeight.toLocaleString('pt-BR')} kg`, 154, 97);

    // Border around section 2 (shifted from 76 to 84)
    doc.setDrawColor(220, 220, 215);
    doc.rect(10, 84, 190, 18);

    // Section 3: CLASSIFICAÇÃO FÍSICA E DESCONTOS (shifted from 99 to 107)
    doc.setFillColor(248, 248, 246);
    doc.rect(10, 107, 190, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 115, 81);
    doc.text("3. DETALHAMENTO FÍSICO DA AMOSTRA E DEDUÇÕES DE TABELA", 12, 112);

    // Headers (shifted from 111 to 119)
    let yTable = 119;
    doc.setFillColor(235, 244, 240);
    doc.rect(10, yTable, 190, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(16, 115, 81);
    doc.text("Parâmetro de Inspeção", 12, yTable + 4.5);
    doc.text("Tolerância Padrão", 65, yTable + 4.5);
    doc.text("Verificado na Amostra (g / %)", 105, yTable + 4.5);
    doc.text("Dedução Amostra", 152, yTable + 4.5);
    doc.text("Desconto Real (kg)", 178, yTable + 4.5);

    const rows: any[] = [
      {
        name: "Teor de Umidade",
        std: `${config.standardMoisture.toFixed(1)}%`,
        measured: `${report.sample.moisture.toFixed(1)}%`,
        deducSample: report.result.sampleDiscountMoisture > 0 ? `-${report.result.sampleDiscountMoisture.toFixed(1)}g` : "0.0g",
        deducReal: report.result.discountMoistureWeight > 0 ? `-${Math.round(report.result.discountMoistureWeight).toLocaleString('pt-BR')} kg` : "0 kg"
      },
      {
        name: "Impurezas / Matéria Estranha",
        std: `${config.standardImpurity.toFixed(1)}%`,
        measured: `${report.sample.impurityGrams.toFixed(1)}g (${report.result.impurityPercent.toFixed(1)}%)`,
        deducSample: report.result.sampleDiscountImpurity > 0 ? `-${report.result.sampleDiscountImpurity.toFixed(1)}g` : "0.0g",
        deducReal: report.result.discountImpurityWeight > 0 ? `-${Math.round(report.result.discountImpurityWeight).toLocaleString('pt-BR')} kg` : "0 kg"
      },
      {
        name: "Grãos Avariados",
        std: `${config.standardDamaged.toFixed(1)}%`,
        measured: `${report.sample.damagedGrams.toFixed(1)}g (${report.result.damagedPercent.toFixed(1)}%)`,
        deducSample: report.result.sampleDiscountDamaged > 0 ? `-${report.result.sampleDiscountDamaged.toFixed(1)}g` : "0.0g",
        deducReal: report.result.discountDamagedWeight > 0 ? `-${Math.round(report.result.discountDamagedWeight).toLocaleString('pt-BR')} kg` : "0 kg"
      }
    ];

    if (report.sample.grainType === 'SOJA') {
      const pGreen = report.result.greenPercent || 0;
      const sDeducG = report.result.sampleDiscountGreen || 0;
      const rDeducG = report.result.discountGreenWeight || 0;
      rows.push({
        name: "Grãos Esverdeados (Soja)",
        std: `${(config.standardGreen || 8.0).toFixed(1)}%`,
        measured: `${(report.sample.greenGrams || 0).toFixed(1)}g (${pGreen.toFixed(1)}%)`,
        deducSample: sDeducG > 0 ? `-${sDeducG.toFixed(1)}g` : "0.0g",
        deducReal: rDeducG > 0 ? `-${Math.round(rDeducG).toLocaleString('pt-BR')} kg` : "0 kg"
      });

      const pBurnt = report.result.burntPercent || 0;
      const sDeducBurnt = report.result.sampleDiscountBurnt || 0;
      const rDeducBurnt = report.result.discountBurntWeight || 0;
      rows.push({
        name: "Grãos Queimados (Soja)",
        std: `${(config.standardBurnt || 1.0).toFixed(1)}%`,
        measured: `${(report.sample.burntGrams || 0).toFixed(1)}g (${pBurnt.toFixed(1)}%)`,
        deducSample: sDeducBurnt > 0 ? `-${sDeducBurnt.toFixed(1)}g` : "0.0g",
        deducReal: rDeducBurnt > 0 ? `-${Math.round(rDeducBurnt).toLocaleString('pt-BR')} kg` : "0 kg"
      });

      const pMoldy = report.result.moldyPercent || 0;
      const sDeducMoldy = report.result.sampleDiscountMoldy || 0;
      const rDeducMoldy = report.result.discountMoldyWeight || 0;
      rows.push({
        name: "Grãos Mofados (Soja)",
        std: `${(config.standardMoldy || 6.0).toFixed(1)}%`,
        measured: `${(report.sample.moldyGrams || 0).toFixed(1)}g (${pMoldy.toFixed(1)}%)`,
        deducSample: sDeducMoldy > 0 ? `-${sDeducMoldy.toFixed(1)}g` : "0.0g",
        deducReal: rDeducMoldy > 0 ? `-${Math.round(rDeducMoldy).toLocaleString('pt-BR')} kg` : "0 kg"
      });
    }

    if (report.sample.grainType === 'MILHO') {
      const pGessados = report.result.gessadosPercent || 0;
      const sDeducGessados = report.result.sampleDiscountGessados || 0;
      const rDeducGessados = report.result.discountGessadosWeight || 0;
      rows.push({
        name: "Grãos Gessados (Milho)",
        std: `${(config.standardGessados || 5.0).toFixed(1)}%`,
        measured: `${(report.sample.gessadosGrams || 0).toFixed(1)}g (${pGessados.toFixed(1)}%)`,
        deducSample: sDeducGessados > 0 ? `-${sDeducGessados.toFixed(1)}g` : "0.0g",
        deducReal: rDeducGessados > 0 ? `-${Math.round(rDeducGessados).toLocaleString('pt-BR')} kg` : "0 kg"
      });
    }

    rows.push({
      name: "Grãos Quebrados",
      std: `${config.standardBroken.toFixed(1)}%`,
      measured: `${report.sample.brokenGrams.toFixed(1)}g (${report.result.brokenPercent.toFixed(1)}%)`,
      deducSample: report.result.sampleDiscountBroken > 0 ? `-${report.result.sampleDiscountBroken.toFixed(1)}g` : "0.0g",
      deducReal: report.result.discountBrokenWeight > 0 ? `-${Math.round(report.result.discountBrokenWeight).toLocaleString('pt-BR')} kg` : "0 kg"
    });

    let currentY = yTable + 7;
    rows.forEach((row, i) => {
      // Shading alternating rows
      if (i % 2 === 0) {
        doc.setFillColor(252, 252, 250);
        doc.rect(10, currentY, 190, 7.5, 'F');
      }
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(33, 33, 33);
      doc.setFontSize(8);
      doc.text(row.name, 12, currentY + 5);
      doc.text(row.std, 65, currentY + 5);
      doc.text(row.measured, 105, currentY + 5);
      
      doc.setFont("helvetica", "bold");
      doc.text(row.deducSample, 152, currentY + 5);
      
      if (row.deducReal !== "0 kg") {
        doc.setTextColor(180, 50, 50); // Muted red
      } else {
        doc.setTextColor(100, 100, 100);
      }
      doc.text(row.deducReal, 178, currentY + 5);

      currentY += 7.5;
    });

    // Borders around table
    doc.setDrawColor(200, 200, 195);
    doc.line(10, yTable, 10, currentY);
    doc.line(200, yTable, 200, currentY);
    doc.line(10, currentY, 200, currentY);

    // Section 4: RESULTADO COMERCIAL
    let yCommercial = currentY + 8;
    doc.setFillColor(248, 248, 246);
    doc.rect(10, yCommercial, 190, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 115, 81);
    doc.text("4. ENQUADRAMENTO DE QUALIDADE E CONCILIAÇÃO FINAL", 12, yCommercial + 5);

    // Totals
    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DESCONTOS COMERCIAIS:", 12, yCommercial + 15);
    doc.setTextColor(180, 50, 50);
    doc.text(`-${Math.round(report.result.totalDiscounts).toLocaleString('pt-BR')} kg`, 67, yCommercial + 15);

    doc.setTextColor(33, 33, 33);
    doc.text("PESO LÍQUIDO FINAL COMERCIAL:", 110, yCommercial + 15);
    doc.setTextColor(16, 115, 81);
    doc.setFont("helvetica", "bold");
    doc.text(`${Math.round(report.result.finalNetWeight).toLocaleString('pt-BR')} kg`, 164, yCommercial + 15);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text("Enquadramento Comercial:", 12, yCommercial + 22);
    doc.setTextColor(16, 115, 81);
    doc.text(report.result.classificationGrade, 56, yCommercial + 22);

    // Border around Section 4
    doc.setDrawColor(16, 115, 81);
    doc.rect(10, yCommercial, 190, 28);

    // Notes if exists
    if (report.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Observações e Parecer:", 10, yCommercial + 34);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(report.notes, 10, yCommercial + 38, { maxWidth: 190 });
    }

    // Standard regulatory footer text
    let yFooterMsg = yCommercial + (report.notes ? 46 : 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Classificação executada de acordo com as especificações exigidas pela Instrução Normativa MAPA vigente para Cereais e Leguminosas.", 10, yFooterMsg);
    doc.text("A autenticidade deste documento digital pode ser verificada instantaneamente no aplicativo Grãocert Pro com o código identificador acima.", 10, yFooterMsg + 3);

    // Signature Block (Fixed at bottom)
    let ySign = 246;
    doc.setDrawColor(180, 180, 175);
    doc.setLineWidth(0.25);
    doc.line(15, ySign, 85, ySign);
    doc.line(125, ySign, 195, ySign);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(33, 33, 33);
    doc.text(report.operatorName, 50, ySign + 4, { align: 'center' });
    doc.text(report.farmerName, 160, ySign + 4, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Classificador Técnico Responsável", 50, ySign + 8, { align: 'center' });
    doc.text("Produtor Rural / Entregador", 160, ySign + 8, { align: 'center' });

    doc.save(`laudo-graocert-${report.reportNumber}.pdf`);
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
  }
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'ENTRADA' | 'SAIDA' | 'ZERAMENTO';
  grainType: string;
  identifier: string; // e.g., "Laudo #15420" ou "Retirada"
  vehiclePlate?: string;
  entityName?: string; // e.g., "Edson Tomé" etc.
  grossWeight: number;
  discounts: number;
  netWeight: number;
  notes?: string;
}

export function downloadRomaneioPDF(record: any, type: 'ENTRADA' | 'SAIDA', customCompanyName?: string) {
  try {
    const finalCompanyName = customCompanyName || (typeof window !== 'undefined' ? localStorage.getItem('graocert_custom_company_name') || '' : '');
    const isEntrada = type === 'ENTRADA';
    
    // Extract properties depending on type
    const dateVal = record.date || new Date().toISOString();
    const dateStr = new Date(dateVal).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = new Date(dateVal).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Top Brand Accent
    doc.setFillColor(isEntrada ? 16 : 79, isEntrada ? 115 : 70, isEntrada ? 81 : 229); // Green for Entry, Indigo for Exit
    doc.rect(10, 10, 190, 4, 'F');

    // Title Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(isEntrada ? 16 : 79, isEntrada ? 115 : 70, isEntrada ? 81 : 229);
    
    const title = isEntrada ? "ROMANEIO DE BALANÇA E RECEBIMENTO - ENTRADA" : "ROMANEIO DE BALANÇA E EXPEDIÇÃO - SAÍDA";
    doc.text(title, 10, 24);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    const subTitle = finalCompanyName 
      ? `Armazém Geral: ${finalCompanyName}` 
      : "Grãocerto Pro - Balança Integrada de Fluxo e Monitoramento de Estoque";
    doc.text(subTitle, 10, 29);
    
    // Safer check if record.id is a string before splitting
    const recordIdStr = String(record.id || '');
    const ticketId = isEntrada ? String(record.reportNumber || '00000').padStart(5, '0') : (recordIdStr.split('_')[1] || 'S/N');
    doc.text(`Nº de Romaneio: #${ticketId}`, 10, 33);

    // Right header info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(33, 33, 33);
    doc.text(`TIPO: ${isEntrada ? 'ENTRADA' : 'SAÍDA'} DE CARGA`, 140, 24);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${dateStr}`, 140, 29);
    doc.text(`Hora: ${timeStr}`, 140, 33);

    // Divider
    doc.setDrawColor(200, 200, 195);
    doc.setLineWidth(0.4);
    doc.line(10, 37, 200, 37);

    // Section 1: IDENTIFICAÇÃO DO TRANSPORTE
    doc.setFillColor(248, 248, 246);
    doc.rect(10, 42, 190, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(isEntrada ? 16 : 79, isEntrada ? 115 : 70, isEntrada ? 81 : 229);
    doc.text("1. IDENTIFICAÇÃO DO TRANSPORTE E PARCEIRO", 12, 47);

    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);

    // Grid Row 1
    doc.setFont("helvetica", "bold");
    doc.text(isEntrada ? "Produtor Rural:" : "Cliente / Destinatário:", 12, 55);
    doc.setFont("helvetica", "normal");
    doc.text(isEntrada ? (record.farmerName || "Produtor Rural") : "Retirada de Estoque Geral / Expedição", 46, 55);

    doc.setFont("helvetica", "bold");
    doc.text("Veículo Placa:", 110, 55);
    doc.setFont("helvetica", "normal");
    const plate = isEntrada ? (record.vehiclePlate || "N/A") : "N/A";
    doc.text(plate.toUpperCase(), 135, 55);

    // Grid Row 2
    doc.setFont("helvetica", "bold");
    doc.text(isEntrada ? "Propriedade / Fazenda:" : "Motivo da Retirada:", 12, 62);
    doc.setFont("helvetica", "normal");
    doc.text(isEntrada ? (record.farmName || "Fazenda Geral") : (record.notes || record.entityName || 'Retirada de estoque.'), 46, 62);

    doc.setFont("helvetica", "bold");
    doc.text("Localidade / UF:", 110, 62);
    doc.setFont("helvetica", "normal");
    doc.text(isEntrada ? (record.cityState || "Local Geral") : "Piracicaba / SP", 135, 62);

    // Grid Row 3
    doc.setFont("helvetica", "bold");
    doc.text("Cultura Agrícola:", 12, 69);
    doc.setFont("helvetica", "normal");
    const grain = isEntrada ? (record.sample?.grainType || record.grainType) : record.grainType;
    const emojiStr = grain === 'SOJA' ? 'SOJA (Vargem)' : grain === 'MILHO' ? 'MILHO (Carioca / Híbrido)' : 'SORGO (Granífero)';
    doc.text(emojiStr, 46, 69);

    doc.setFont("helvetica", "bold");
    doc.text("Responsável Balança:", 110, 69);
    doc.setFont("helvetica", "normal");
    doc.text(isEntrada ? (record.operatorName || "Técnico de Balança") : "Técnico de Armazém", 145, 69);

    doc.setDrawColor(220, 220, 215);
    doc.rect(10, 42, 190, 32);

    // Section 2: DADOS DE PESAGEM E FLUXO (BALANÇA DE ENTRADA/SAÍDA)
    doc.setFillColor(248, 248, 246);
    doc.rect(10, 80, 190, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isEntrada ? 16 : 79, isEntrada ? 115 : 70, isEntrada ? 81 : 229);
    doc.text("2. DETERMINAÇÃO DE PESOS - ROMANEIO DE PESAGEM (kg)", 12, 85);

    // Table elements
    let yWTable = 92;
    // Table Header
    doc.setFillColor(isEntrada ? 235 : 240, isEntrada ? 244 : 240, isEntrada ? 240 : 255);
    doc.rect(10, yWTable, 190, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);
    doc.text("Descrição da Medição de Pesagem", 12, yWTable + 4.5);
    doc.text("Quantidade em Massa (kg)", 140, yWTable + 4.5);

    // Weight Calculations - Safe from undefined subproperties
    const grossVal = isEntrada ? (record.sample?.totalWeight || 0) : (record.amount || 0);
    const discountVal = isEntrada ? (record.result?.totalDiscounts || 0) : 0;
    const netVal = isEntrada ? (record.result?.finalNetWeight || 0) : (record.amount || 0);

    const wRows = [
      { desc: isEntrada ? "Peso Bruto Pesado de Carga (Carga do Caminhão)" : "Peso Útil Expedido (Carga Retirada do Silo)", value: `${Math.round(grossVal).toLocaleString('pt-BR')} kg` },
      { desc: "(-) Descontos por Impurezas, Avarias ou Umidade sob Tabela", value: `-${Math.round(discountVal).toLocaleString('pt-BR')} kg`, isRed: discountVal > 0 },
      { desc: isEntrada ? "Peso Comercial Líquido Faturado (Massa Faturável)" : "Peso Final Expedido Comercial", value: `${Math.round(netVal).toLocaleString('pt-BR')} kg`, isBold: true, isGreen: true }
    ];

    let currentY = yWTable + 7;
    wRows.forEach((row, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 253 : 248, idx % 2 === 0 ? 253 : 248, idx % 2 === 0 ? 250 : 248);
      doc.rect(10, currentY, 190, 8.5, 'F');
      
      doc.setFont("helvetica", row.isBold ? "bold" : "normal");
      doc.setFontSize(row.isBold ? 9 : 8.5);
      
      if (row.isRed) doc.setTextColor(180, 50, 50);
      else if (row.isGreen) doc.setTextColor(isEntrada ? 16 : 79, isEntrada ? 115 : 70, isEntrada ? 81 : 229);
      else doc.setTextColor(33, 33, 33);

      doc.text(row.desc, 12, currentY + 5.5);
      doc.text(row.value, 140, currentY + 5.5);
      currentY += 8.5;
    });

    doc.rect(10, 80, 190, (currentY - 80));

    // Section 3: SE ENTRADA, MOSTRA DESCONTOS DE ANÁLISE DETALHADOS
    if (isEntrada) {
      let yAnalysis = currentY + 8;
      doc.setFillColor(248, 248, 246);
      doc.rect(10, yAnalysis, 190, 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(16, 115, 81);
      doc.text("3. CLASSIFICAÇÃO QUALITATIVA DA CARGA (DETALHAMENTO DE IMPUREZAS E UMIDADE)", 12, yAnalysis + 5);

      let yATable = yAnalysis + 7;
      doc.setFillColor(235, 244, 240);
      doc.rect(10, yATable, 190, 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(16, 115, 81);
      doc.text("Parâmetro de Verificação", 12, yATable + 4.5);
      doc.text("Teor Lido", 65, yATable + 4.5);
      doc.text("Tolerância Reg.", 100, yATable + 4.5);
      doc.text("Dedução Real de Peso (kg)", 140, yATable + 4.5);

      const grainType = (record.sample?.grainType || 'SOJA') as GrainType;
      const config = GRAIN_PRESETS[grainType];
      const isSoja = grainType === 'SOJA';
      const aRows = [
        { name: "Teor de Umidade Directa", read: `${(record.sample?.moisture || 0).toFixed(1)}%`, limit: "14.0%", discount: `${Math.round(record.result?.discountMoistureWeight || 0).toLocaleString('pt-BR')} kg` },
        { name: "Impurezas / Matéria Estranha", read: `${(record.result?.impurityPercent || 0).toFixed(1)}%`, limit: "1.0%", discount: `${Math.round(record.result?.discountImpurityWeight || 0).toLocaleString('pt-BR')} kg` },
        { name: "Grãos Avariados (Mofo/Ardido)", read: `${(record.result?.damagedPercent || 0).toFixed(1)}%`, limit: "8.0%", discount: `${Math.round(record.result?.discountDamagedWeight || 0).toLocaleString('pt-BR')} kg` }
      ];

      if (isSoja) {
        aRows.push({
          name: "Grãos Esverdeados (Soja)",
          read: `${(record.result?.greenPercent || 0).toFixed(1)}%`,
          limit: `${(config?.standardGreen || 8.0).toFixed(1)}%`,
          discount: `${Math.round(record.result?.discountGreenWeight || 0).toLocaleString('pt-BR')} kg`
        });
        aRows.push({
          name: "Grãos Queimados (Soja)",
          read: `${(record.result?.burntPercent || 0).toFixed(1)}%`,
          limit: `${(config?.standardBurnt || 1.0).toFixed(1)}%`,
          discount: `${Math.round(record.result?.discountBurntWeight || 0).toLocaleString('pt-BR')} kg`
        });
        aRows.push({
          name: "Grãos Mofados (Soja)",
          read: `${(record.result?.moldyPercent || 0).toFixed(1)}%`,
          limit: `${(config?.standardMoldy || 6.0).toFixed(1)}%`,
          discount: `${Math.round(record.result?.discountMoldyWeight || 0).toLocaleString('pt-BR')} kg`
        });
      }

      if (record.sample?.grainType === 'MILHO') {
        aRows.push({
          name: "Grãos Gessados (Milho)",
          read: `${(record.result?.gessadosPercent || 0).toFixed(1)}%`,
          limit: `${(config?.standardGessados || 5.0).toFixed(1)}%`,
          discount: `${Math.round(record.result?.discountGessadosWeight || 0).toLocaleString('pt-BR')} kg`
        });
      }

      aRows.push({
        name: "Grãos Quebrados",
        read: `${(record.result?.brokenPercent || 0).toFixed(1)}%`,
        limit: `${config?.standardBroken.toFixed(1)}%`,
        discount: `${Math.round(record.result?.discountBrokenWeight || 0).toLocaleString('pt-BR')} kg`
      });

      let aY = yATable + 7;
      aRows.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(252, 252, 250);
          doc.rect(10, aY, 190, 7.5, 'F');
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(33, 33, 33);
        doc.text(row.name, 12, aY + 5);
        doc.text(row.read, 65, aY + 5);
        doc.text(row.limit, 100, aY + 5);
        doc.setFont("helvetica", "bold");
        doc.text(row.discount, 140, aY + 5);
        aY += 7.5;
      });

      doc.rect(10, yAnalysis, 190, (aY - yAnalysis));
    } else {
      // Show gorgeous information card about standard product for exits
      let yInfo = currentY + 8;
      doc.setFillColor(240, 244, 255);
      doc.rect(10, yInfo, 190, 20, 'F');
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.3);
      doc.rect(10, yInfo, 190, 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(79, 70, 229);
      doc.text("INFORMAÇÕES ADICIONAIS DE EXPEDIÇÃO", 14, yInfo + 5.5);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 70);
      doc.text("Este ticket refere-se à saída ou expedição física de grãos dos silos deste armazém, em plena conformidade", 14, yInfo + 10);
      doc.text("qualitativa exigida pelo destinatário. O lote expedido mantém os padrões comerciais regulamentados.", 14, yInfo + 14);
    }

    // Signatures and Regulatory Info (Fixed at the bottom of page)
    let yFooter = 230;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text("Este ticket de romaneio de balança é gerado eletronicamente e constitui documento oficial de controle de pesagem deste armazém.", 10, yFooter);
    doc.text("Todos os pesos foram aferidos em balanças rodoviárias homologadas e certificadas pelas normas federais do INMETRO.", 10, yFooter + 3.5);

    let ySign = 255;
    doc.setDrawColor(180, 180, 175);
    doc.setLineWidth(0.25);
    doc.line(15, ySign, 85, ySign);
    doc.line(125, ySign, 195, ySign);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);
    doc.text(isEntrada ? (record.operatorName || "Operador de Balança") : "Fiel Depositário (Silo)", 50, ySign + 4, { align: 'center' });
    doc.text(isEntrada ? (record.farmerName || "Produtor Rural") : "Motorista / Transportador", 160, ySign + 4, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Pesador / Técnico Responsável", 50, ySign + 8, { align: 'center' });
    doc.text("Recebedor / Assinatura do Condutor", 160, ySign + 8, { align: 'center' });

    const fileNameFormat = isEntrada ? `romaneio-entrada-laudo-${ticketId}` : `romaneio-saida-${ticketId}`;
    doc.save(`${fileNameFormat}.pdf`);
  } catch (err) {
    console.error("Erro ao gerar Romaneio:", err);
  }
}

export function downloadWarehouseStatementPDF(ledger: LedgerEntry[], customCompanyName?: string) {
  try {
    const finalCompanyName = customCompanyName || (typeof window !== 'undefined' ? localStorage.getItem('graocert_custom_company_name') || '' : '');
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Emerald Header Bar
    doc.setFillColor(16, 115, 81);
    doc.rect(10, 10, 190, 4, 'F');

    // Title Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(16, 115, 81);
    doc.text("EXTRATO DE MOVIMENTAÇÃO DE ESTOQUE - ENTRADAS & SAÍDAS", 10, 24);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const sub = finalCompanyName 
      ? `Armazém Emissor: ${finalCompanyName}` 
      : "Grãocerto Pro - Relatório Consolidado de Silos de Grãos e Balança";
    doc.text(sub, 10, 29);
    doc.text(`Período consolidado: Safra Corrente (Ativo)`, 10, 33);

    // Right header info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(33, 33, 33);
    doc.text(`RELATÓRIO DE ESTOQUE`, 142, 24);
    doc.setFont("helvetica", "normal");
    doc.text(`Data Emissão: ${dateStr}`, 142, 29);
    doc.text(`Hora Emissão: ${timeStr}`, 142, 33);

    // Line Divider
    doc.setDrawColor(16, 115, 81);
    doc.setLineWidth(0.4);
    doc.line(10, 37, 200, 37);

    // Calc metrics for active stock
    let totEntradas = 0;
    let totSaidas = 0;
    let sojIn = 0, sojOut = 0;
    let milIn = 0, milOut = 0;
    let sorIn = 0, sorOut = 0;

    ledger.forEach(l => {
      const netW = Math.round(l.netWeight || 0);
      if (l.type === 'ENTRADA') {
        totEntradas += netW;
      } else if (l.type === 'SAIDA') {
        totSaidas += netW;
      }

      if (l.grainType === 'SOJA') {
        if (l.type === 'ENTRADA') sojIn += netW;
        else if (l.type === 'SAIDA') sojOut += netW;
      } else if (l.grainType === 'MILHO') {
        if (l.type === 'ENTRADA') milIn += netW;
        else if (l.type === 'SAIDA') milOut += netW;
      } else if (l.grainType === 'SORGO') {
        if (l.type === 'ENTRADA') sorIn += netW;
        else if (l.type === 'SAIDA') sorOut += netW;
      }
    });
    
    const saldoCorrente = Math.max(0, totEntradas - totSaidas);
    const sojBal = Math.max(0, sojIn - sojOut);
    const milBal = Math.max(0, milIn - milOut);
    const sorBal = Math.max(0, sorIn - sorOut);

    // 1. Consolidated Summary Box
    doc.setFillColor(248, 248, 246);
    doc.rect(10, 42, 190, 20, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 115, 81);
    doc.text("SALDO DE ESTOQUES CONSOLIDADO", 12, 47);

    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);
    doc.text(`Total Peso Faturado Entradas: ${totEntradas.toLocaleString('pt-BR')} kg`, 12, 53);
    doc.text(`Total Peso Expedido Saídas: ${totSaidas.toLocaleString('pt-BR')} kg`, 12, 58);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 115, 81);
    doc.text(`ESTOQUE LÍQUIDO DISPONÍVEL: ${saldoCorrente.toLocaleString('pt-BR')} kg`, 100, 54);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`Apurado de forma automática com base em laudos ativos pós-descontos regulamentares.`, 100, 59);

    doc.setDrawColor(200, 200, 195);
    doc.setLineWidth(0.25);
    doc.rect(10, 42, 190, 20);

    // 2. Individual Grain Breakdown Cards (Extremely aesthetic)
    // Box 1: Soja
    doc.setFillColor(240, 248, 244); // light green
    doc.rect(10, 66, 60, 16, 'F');
    doc.setDrawColor(16, 115, 81); // emerald
    doc.rect(10, 66, 60, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(16, 115, 81);
    doc.text("🌱 SOJA (Silos)", 14, 71);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.text(`Ent: ${sojIn.toLocaleString('pt-BR')} | Sai: ${sojOut.toLocaleString('pt-BR')}`, 14, 75);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(16, 115, 81);
    doc.text(`Saldo: ${sojBal.toLocaleString('pt-BR')} kg`, 14, 79.5);

    // Box 2: Milho
    doc.setFillColor(255, 253, 240); // light yellow
    doc.rect(75, 66, 60, 16, 'F');
    doc.setDrawColor(217, 119, 6); // amber
    doc.rect(75, 66, 60, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(217, 119, 6);
    doc.text("🌽 MILHO (Silos)", 79, 71);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.text(`Ent: ${milIn.toLocaleString('pt-BR')} | Sai: ${milOut.toLocaleString('pt-BR')}`, 79, 75);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(217, 119, 6);
    doc.text(`Saldo: ${milBal.toLocaleString('pt-BR')} kg`, 79, 79.5);

    // Box 3: Sorgo
    doc.setFillColor(253, 244, 245); // light pinkish/red
    doc.rect(140, 66, 60, 16, 'F');
    doc.setDrawColor(190, 24, 74); // rose
    doc.rect(140, 66, 60, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(190, 24, 74);
    doc.text("🌾 SORGO (Silos)", 144, 71);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.text(`Ent: ${sorIn.toLocaleString('pt-BR')} | Sai: ${sorOut.toLocaleString('pt-BR')}`, 144, 75);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(190, 24, 74);
    doc.text(`Saldo: ${sorBal.toLocaleString('pt-BR')} kg`, 144, 79.5);

    // 3. Ledger table with dynamic pagination
    let tabY = 88;
    doc.setFillColor(16, 115, 81);
    doc.rect(10, tabY, 190, 7.5, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Data", 12, tabY + 5);
    doc.text("Tipo", 32, tabY + 5);
    doc.text("Cultura", 54, tabY + 5);
    doc.text("Identificação / Placa", 75, tabY + 5);
    doc.text("P. Bruto (kg)", 125, tabY + 5);
    doc.text("Dedução (kg)", 153, tabY + 5);
    doc.text("P. Líquido (kg)", 178, tabY + 5);

    // Sort chronologically (oldest to newest for proper audit flow)
    const sorted = [...ledger].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const N = sorted.length;
    
    // pagination parameters
    const itemsPerPageFirst = 18;
    const itemsPerPageSubsequent = 25;
    
    let totalPages = 1;
    if (N > itemsPerPageFirst) {
      totalPages = 1 + Math.ceil((N - itemsPerPageFirst) / itemsPerPageSubsequent);
    }

    let curPage = 1;
    let itemsRenderedOnCurrentPage = 0;
    let curY = tabY + 7.5; // row start for Page 1

    sorted.forEach((l, i) => {
      const maxRowsOnThisPage = (curPage === 1) ? itemsPerPageFirst : itemsPerPageSubsequent;
      if (itemsRenderedOnCurrentPage >= maxRowsOnThisPage) {
        // Draw page footer before switching
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${curPage} de ${totalPages}`, 100, 282, { align: 'center' });

        doc.addPage();
        curPage++;
        itemsRenderedOnCurrentPage = 0;

        // Draw subsequent page header bar
        doc.setFillColor(16, 115, 81);
        doc.rect(10, 10, 190, 3, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(16, 115, 81);
        doc.text("EXTRATO DE MOVIMENTAÇÃO DE ESTOQUE (CONTINUAÇÃO)", 10, 18);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Emissão em ${dateStr} às ${timeStr}`, 142, 18);

        doc.setDrawColor(200, 200, 195);
        doc.line(10, 21, 200, 21);

        // Draw subsequent page table header
        doc.setFillColor(16, 115, 81);
        doc.rect(10, 24, 190, 7.5, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        
        doc.text("Data", 12, 24 + 5);
        doc.text("Tipo", 32, 24 + 5);
        doc.text("Cultura", 54, 24 + 5);
        doc.text("Identificação / Placa", 75, 24 + 5);
        doc.text("P. Bruto (kg)", 125, 24 + 5);
        doc.text("Dedução (kg)", 153, 24 + 5);
        doc.text("P. Líquido (kg)", 178, 24 + 5);

        curY = 24 + 7.5; // row start for subpage
      }

      // Shading alternating rows
      if (itemsRenderedOnCurrentPage % 2 === 0) {
        doc.setFillColor(248, 248, 245);
        doc.rect(10, curY, 190, 7.5, 'F');
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(33, 33, 33);

      const dStr = new Date(l.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + 
                   new Date(l.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      doc.text(dStr, 12, curY + 5);
      
      // Type styling
      if (l.type === 'ENTRADA') {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 115, 81);
        doc.text("🟢 ENTRADA", 32, curY + 5);
      } else if (l.type === 'SAIDA') {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(190, 70, 70);
        doc.text("🔴 SAÍDA", 32, curY + 5);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("⚪ ZERAMENTO", 32, curY + 5);
      }

      doc.setTextColor(33, 33, 33);
      doc.setFont("helvetica", "normal");
      doc.text(String(l.grainType || 'SOJA'), 54, curY + 5);
      
      const identifierStr = l.vehiclePlate ? `${l.identifier} [${l.vehiclePlate}]` : l.identifier;
      doc.text(identifierStr.substring(0, 24), 75, curY + 5);

      doc.text(Math.round(l.grossWeight || 0).toLocaleString('pt-BR'), 125, curY + 5);
      doc.setTextColor(l.discounts > 0 ? 180 : 100, 50, 50);
      doc.text(l.discounts > 0 ? `-${Math.round(l.discounts).toLocaleString('pt-BR')}` : "0", 153, curY + 5);
      
      doc.setTextColor(l.type === 'ENTRADA' ? 16 : 100, l.type === 'ENTRADA' ? 115 : 100, l.type === 'ENTRADA' ? 81 : 100);
      doc.setFont("helvetica", "bold");
      doc.text(Math.round(l.netWeight || 0).toLocaleString('pt-BR'), 178, curY + 5);

      // Row borders
      doc.setDrawColor(220, 220, 215);
      doc.setLineWidth(0.2);
      doc.line(10, curY, 10, curY + 7.5);
      doc.line(200, curY, 200, curY + 7.5);
      doc.line(10, curY + 7.5, 200, curY + 7.5); // bottom row line

      curY += 7.5;
      itemsRenderedOnCurrentPage++;
    });

    // Draw bottom border on the final page
    doc.setDrawColor(200, 200, 195);
    doc.setLineWidth(0.3);
    doc.line(10, firstTabYBorder(curPage, tabY), 10, curY);
    doc.line(200, firstTabYBorder(curPage, tabY), 200, curY);

    // Page number footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${curPage} de ${totalPages}`, 100, 282, { align: 'center' });

    // Signature Block at Bottom of last page
    let ySign = curY + 12;
    if (ySign > 250) {
      doc.addPage();
      curPage++;
      totalPages++;
      doc.text(`Página ${curPage} de ${totalPages}`, 100, 282, { align: 'center' });
      ySign = 35;
    }

    doc.setDrawColor(180, 180, 175);
    doc.setLineWidth(0.25);
    doc.line(50, ySign + 10, 150, ySign + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);
    doc.text("Supervisão de Estoque do Armazém", 100, ySign + 15, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Documento oficial para fins de auditoria interna e conferência física.", 100, ySign + 19, { align: 'center' });

    doc.save(`extrato-estoque-${dateStr.replace(/\//g, '-')}.pdf`);
  } catch (err) {
    console.error("Erro ao gerar Extrato de Estoque:", err);
  }
}

export function downloadDailyClassificationsPDF(reports: FarmerReport[], targetDateStr: string, customCompanyName?: string) {
  try {
    const finalCompanyName = customCompanyName || (typeof window !== 'undefined' ? localStorage.getItem('graocert_custom_company_name') || '' : '');
    const [year, month, day] = targetDateStr.split('-').map(Number);
    const dateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    const timeNowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Filter reports of the selected day using robust local parts, string match or UTC comparison
    const filtered = reports.filter(r => {
      if (!r.date) return false;
      
      // Direct string match (e.g., "YYYY-MM-DD")
      if (r.date.startsWith(targetDateStr)) {
        return true;
      }
      
      const rDate = new Date(r.date);
      // Local date match
      const rLocalMatch = rDate.getFullYear() === year && 
                          (rDate.getMonth() + 1) === month && 
                          rDate.getDate() === day;
      if (rLocalMatch) return true;
      
      // UTC date match
      return rDate.getUTCFullYear() === year && 
             (rDate.getUTCMonth() + 1) === month && 
             rDate.getUTCDate() === day;
    });

    if (filtered.length === 0) {
      throw new Error(`Nenhum laudo encontrado nesta data (${dateStr}) para gerar planilha.`);
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Landscape Dimensions: Width = 297, Height = 210. Margins: 10mm left & right. printable width: 277mm
    // Emerald Header Line
    doc.setFillColor(16, 115, 81);
    doc.rect(10, 10, 277, 4, 'F');

    // Title Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(16, 115, 81);
    doc.text("PLANILHA CONSOLIDADA - RELATÓRIO DIÁRIO DE CLASSIFICAÇÃO", 10, 23);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const sub = finalCompanyName 
      ? `Emissor: ${finalCompanyName}` 
      : "Grãocerto Pro - Estação Integrada de Monitoramento e Classificação de Campo";
    doc.text(sub, 10, 28);
    doc.text(`Identificador do Fechamento: DAILY-${targetDateStr.replace(/-/g, '')}`, 10, 32);

    // Right Header Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(33, 33, 33);
    doc.text("CONVERSÃO DE PLANILHA (PDF)", 225, 23);
    doc.setFont("helvetica", "normal");
    doc.text(`Dia Referência: ${dateStr}`, 225, 27);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} ${timeNowStr}`, 225, 31);

    // Separator line
    doc.setDrawColor(16, 115, 81);
    doc.setLineWidth(0.4);
    doc.line(10, 35, 287, 35);

    // Calculate sum metrics
    let totalGross = 0;
    let totalDiscounts = 0;
    let totalNet = 0;

    filtered.forEach(r => {
      totalGross += r.sample?.totalWeight || 0;
      totalDiscounts += r.result?.totalDiscounts || 0;
      totalNet += r.result?.finalNetWeight || 0;
    });

    // 1. Consolidated metrics display row (Aesthetic cards)
    doc.setFillColor(248, 248, 246);
    doc.rect(10, 40, 277, 14, 'F');
    doc.setDrawColor(220, 220, 215);
    doc.setLineWidth(0.25);
    doc.rect(10, 40, 277, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("TOTAL DE CARGAS", 14, 45);
    doc.text("PESO EVALUADO (BRUTO)", 75, 45);
    doc.text("TOTAL DE DESCONTOS", 145, 45);
    doc.text("PESO LÍQUIDO FINAL", 215, 45);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(16, 115, 81);
    doc.text(`${filtered.length} Classificações`, 14, 50);
    doc.setTextColor(33, 33, 33);
    doc.text(`${totalGross.toLocaleString('pt-BR')} kg`, 75, 50);
    doc.setTextColor(180, 50, 50);
    doc.text(`-${Math.round(totalDiscounts).toLocaleString('pt-BR')} kg`, 145, 50);
    doc.setTextColor(16, 115, 81);
    doc.text(`${Math.round(totalNet).toLocaleString('pt-BR')} kg`, 215, 50);

    // 2. Spreadsheet tabular headers
    let tabY = 59;
    doc.setFillColor(16, 115, 81);
    doc.rect(10, tabY, 277, 8, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    
    // Header label positions:
    // 1: Ticket (X=12), 2: Hora (X=31), 3: Produtor / Fazenda (X=46), 4: Cultura (X=107), 5: Placa (X=127), 
    // 6: P. Bruto (X=144), 7: Umid. (X=166), 8: Impur. (X=184), 9: Avar. (X=202), 10: Desc. (X=220), 11: P. Líquido (X=244), 12: Classif. (X=268)
    doc.text("Ticket", 12, tabY + 5);
    doc.text("Hora", 31, tabY + 5);
    doc.text("Produtor / Fazenda", 46, tabY + 5);
    doc.text("Cultura", 107, tabY + 5);
    doc.text("Placa", 127, tabY + 5);
    doc.text("P. Bruto (kg)", 144, tabY + 5);
    doc.text("Umid. (%)", 166, tabY + 5);
    doc.text("Impur. (%)", 184, tabY + 5);
    doc.text("Avar. (%)", 202, tabY + 5);
    doc.text("Desc. (kg)", 220, tabY + 5);
    doc.text("P. Líq. (kg)", 244, tabY + 5);
    doc.text("Classif.", 268, tabY + 5);

    // Sort reports chronologically
    const sorted = [...filtered].sort((a,b) => a.reportNumber - b.reportNumber);
    const N = sorted.length;

    // pagination parameters: Landscape has 210mm height
    // bottom margin 15mm (210 - 15 = 195mm)
    // First page starting table from 59mm -> size is 136mm -> 18 rows
    // Subsequent pages start from 24mm -> size is 171mm -> 22 rows
    const itemsPerPageFirst = 16;
    const itemsPerPageSubsequent = 22;

    let totalPages = 1;
    if (N > itemsPerPageFirst) {
      totalPages = 1 + Math.ceil((N - itemsPerPageFirst) / itemsPerPageSubsequent);
    }

    let curPage = 1;
    let itemsRenderedOnCurrentPage = 0;
    let curY = tabY + 8; // row start for Page 1

    sorted.forEach((r, i) => {
      const maxRowsOnThisPage = (curPage === 1) ? itemsPerPageFirst : itemsPerPageSubsequent;
      if (itemsRenderedOnCurrentPage >= maxRowsOnThisPage) {
        // Draw page footer before adding new page
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${curPage} de ${totalPages}`, 148, 203, { align: 'center' });

        doc.addPage();
        curPage++;
        itemsRenderedOnCurrentPage = 0;

        // Subsequent page headers
        doc.setFillColor(16, 115, 81);
        doc.rect(10, 10, 277, 3, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(16, 115, 81);
        doc.text("PLANILHA DIÁRIA DE CLASSIFICAÇÃO (CONTINUAÇÃO)", 10, 17);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Dia Referência: ${dateStr} • Convertido às ${timeNowStr}`, 215, 17);

        doc.setDrawColor(200, 200, 195);
        doc.line(10, 19, 287, 19);

        // Header again
        doc.setFillColor(16, 115, 81);
        doc.rect(10, 22, 277, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        
        doc.text("Ticket", 12, 22 + 5);
        doc.text("Hora", 31, 22 + 5);
        doc.text("Produtor / Fazenda", 46, 22 + 5);
        doc.text("Cultura", 107, 22 + 5);
        doc.text("Placa", 127, 22 + 5);
        doc.text("P. Bruto (kg)", 144, 22 + 5);
        doc.text("Umid. (%)", 166, 22 + 5);
        doc.text("Impur. (%)", 184, 22 + 5);
        doc.text("Avar. (%)", 202, 22 + 5);
        doc.text("Desc. (kg)", 220, 22 + 5);
        doc.text("P. Líq. (kg)", 244, 22 + 5);
        doc.text("Classif.", 268, 22 + 5);

        curY = 22 + 8; // row start for subpage
      }

      // Shading alternating rows
      if (itemsRenderedOnCurrentPage % 2 === 0) {
        doc.setFillColor(248, 248, 245);
        doc.rect(10, curY, 277, 7.5, 'F');
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(33, 33, 33);

      const hourStr = new Date(r.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const clientNameTrunc = `${r.farmerName} / ${r.farmName}`.substring(0, 36);

      doc.text(`#${String(r.reportNumber).padStart(5, '0')}`, 12, curY + 5);
      doc.text(hourStr, 31, curY + 5);
      doc.text(clientNameTrunc, 46, curY + 5);
      doc.text(String(r.sample?.grainType || 'SOJA'), 107, curY + 5);
      doc.text((r.vehiclePlate || 'N/A').toUpperCase().substring(0, 8), 127, curY + 5);
      doc.text((r.sample?.totalWeight || 0).toLocaleString('pt-BR'), 144, curY + 5);
      
      // Dynamic bold indicators if values exceed standards
      const limitMoisture = r.sample?.grainType === 'SOJA' ? 14.0 : 14.0;
      const isMoistureHigh = (r.sample?.moisture || 0) > limitMoisture;
      if (isMoistureHigh) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 50, 50);
      }
      doc.text(`${(r.sample?.moisture || 0).toFixed(1)}%`, 166, curY + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(33, 33, 33);

      const limitImpurity = 1.0;
      const isImpurityHigh = (r.result?.impurityPercent || 0) > limitImpurity;
      if (isImpurityHigh) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 50, 50);
      }
      doc.text(`${(r.result?.impurityPercent || 0).toFixed(1)}%`, 184, curY + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(33, 33, 33);

      const limitDamaged = 8.0;
      const isDamagedHigh = (r.result?.damagedPercent || 0) > limitDamaged;
      if (isDamagedHigh) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 50, 50);
      }
      doc.text(`${(r.result?.damagedPercent || 0).toFixed(1)}%`, 202, curY + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(33, 33, 33);

      // Discount Weight column
      const descW = Math.round(r.result?.totalDiscounts || 0);
      if (descW > 0) {
        doc.setTextColor(180, 50, 50);
      }
      doc.text(descW > 0 ? `-${descW.toLocaleString('pt-BR')}` : "0", 220, curY + 5);
      doc.setTextColor(33, 33, 33);

      // Net Weight column
      doc.setFont("helvetica", "bold");
      doc.text(Math.round(r.result?.finalNetWeight || 0).toLocaleString('pt-BR'), 244, curY + 5);
      doc.setFont("helvetica", "normal");

      // Classification Grade
      const gradeStr = (r.result?.classificationGrade || 'PRODUTOR').substring(0, 10);
      if (gradeStr.includes('FORA')) {
        doc.setTextColor(180, 50, 50);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(16, 115, 81);
      }
      doc.text(gradeStr, 268, curY + 5);
      doc.setTextColor(33, 33, 33);
      doc.setFont("helvetica", "normal");

      // Grid line borders
      doc.setDrawColor(220, 220, 215);
      doc.setLineWidth(0.2);
      doc.line(10, curY, 10, curY + 7.5);
      doc.line(287, curY, 287, curY + 7.5);
      doc.line(10, curY + 7.5, 287, curY + 7.5);

      curY += 7.5;
      itemsRenderedOnCurrentPage++;
    });

    // Draw borders of the table
    const firstBorderStart = (curPage === 1) ? tabY : 22;
    doc.setDrawColor(200, 200, 195);
    doc.setLineWidth(0.3);
    doc.line(10, firstBorderStart, 10, curY);
    doc.line(287, firstBorderStart, 287, curY);

    // Final page footer number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${curPage} de ${totalPages}`, 148, 203, { align: 'center' });

    // Save standard closing signatures
    let ySign = curY + 10;
    if (ySign > 175) {
      doc.addPage();
      curPage++;
      totalPages++;
      doc.text(`Página ${curPage} de ${totalPages}`, 148, 203, { align: 'center' });
      ySign = 30;
    }

    doc.setDrawColor(180, 180, 175);
    doc.setLineWidth(0.25);
    doc.line(100, ySign + 10, 197, ySign + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(33, 33, 33);
    doc.text("Responsável Técnico / Fechamento de Dia", 148, ySign + 14, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Documento oficial impresso da Estação de Classificação Portátil Off-line.", 148, ySign + 18, { align: 'center' });

    doc.save(`planilha-classificacoes-${dateStr.replace(/\//g, '-')}.pdf`);
  } catch (err: any) {
    console.error("Erro ao gerar Relatório Diário:", err);
    throw err;
  }
}

// Helper to determine table top border start coordinate per page
function firstTabYBorder(curPage: number, tabY: number) {
  return curPage === 1 ? tabY : 24;
}
