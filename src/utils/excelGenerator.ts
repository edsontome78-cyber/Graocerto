/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FarmerReport, GRAIN_PRESETS } from '../types';

/**
 * Generates and triggers downloading of a beautiful, organized CSV file compatible with Excel.
 * Implements Semicolon separator, proper UTF-8 BOM for Portuguese character sets, and auto-formatting.
 */
export function downloadDailyClassificationsExcel(reports: FarmerReport[], targetDateStr: string) {
  // Filter reports that belong to the active date
  // Accommodates both ISO strings ("2026-06-16T15:19:51Z") and simple date strings ("2026-06-16 15:19")
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const dailyReports = reports.filter(r => {
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

  if (dailyReports.length === 0) {
    const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    throw new Error(`Nenhum laudo encontrado para a data selecionada (${formattedDate}).`);
  }

  // Create Headers
  const headers = [
    'TICKET / LAUDO',
    'DATA E HORA',
    'PRODUTOR RURAL',
    'FAZENDA / PROPRIEDADE',
    'CIDADE / UF',
    'LOTE DE REFERÊNCIA',
    'CULTURA / GRÃO',
    'PLACA VEÍCULO',
    'PESO BRUTO DA CARGA (kg)',
    'UMIDADE (%)',
    'IMPUREZA (%)',
    'AVARIADOS (%)',
    'QUEBRADOS (%)',
    'ESVERDEADOS (%)',
    'QUEIMADOS (%)',
    'MOFADOS (%)',
    'GESSADOS (%)',
    'DESCONTO UMIDADE (kg)',
    'DESCONTO IMPUREZA (kg)',
    'DESCONTO AVARIADOS (kg)',
    'DESCONTO QUEBRADOS (kg)',
    'DESCONTO ESVERDEADOS (kg)',
    'DESCONTO QUEIMADOS (kg)',
    'DESCONTO MOFADOS (kg)',
    'DESCONTO GESSADOS (kg)',
    'TOTAL DESCONTOS (kg)',
    'PESO LÍQUIDO FINAL (kg)',
    'GRAU CLASSIFICAÇÃO',
    'OPERADOR / TÉCNICO'
  ];

  const rows = dailyReports.map(report => {
    const rDate = new Date(report.date);
    const dateFormatted = rDate.toLocaleDateString('pt-BR') + ' ' + rDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const config = GRAIN_PRESETS[report.sample.grainType];

    // Safe numeric formatting for Excel (using decimal commas if needed, or keeping simple numeric representations)
    const totalW = report.sample.totalWeight || 0;
    const moisture = report.sample.moisture || 0;
    const impurity = report.result?.impurityPercent || 0;
    const damaged = report.result?.damagedPercent || 0;
    const broken = report.result?.brokenPercent || 0;
    
    // Soy elements
    const green = report.result?.greenPercent || 0;
    const burnt = report.result?.burntPercent || 0;
    const moldy = report.result?.moldyPercent || 0;
    
    // Corn elements
    const gessados = report.result?.gessadosPercent || 0;

    // Weight discounts
    const dMoisture = report.result?.discountMoistureWeight || 0;
    const dImpurity = report.result?.discountImpurityWeight || 0;
    const dDamaged = report.result?.discountDamagedWeight || 0;
    const dBroken = report.result?.discountBrokenWeight || 0;
    const dGreen = report.result?.discountGreenWeight || 0;
    const dBurnt = report.result?.discountBurntWeight || 0;
    const dMoldy = report.result?.discountMoldyWeight || 0;
    const dGessados = report.result?.discountGessadosWeight || 0;

    const totalD = report.result?.totalDiscounts || 0;
    const netW = report.result?.finalNetWeight || 0;

    return [
      `Laudo #${String(report.reportNumber).padStart(5, '0')}`,
      dateFormatted,
      report.farmerName || 'N/A',
      report.farmName || 'N/A',
      report.cityState || 'N/A',
      report.lotReference || 'N/A',
      config?.name || report.sample.grainType,
      report.vehiclePlate?.toUpperCase() || 'N/A',
      totalW,
      moisture.toFixed(1).replace('.', ','),
      impurity.toFixed(1).replace('.', ','),
      damaged.toFixed(1).replace('.', ','),
      broken.toFixed(1).replace('.', ','),
      report.sample.grainType === 'SOJA' ? green.toFixed(1).replace('.', ',') : '0,0',
      report.sample.grainType === 'SOJA' ? burnt.toFixed(1).replace('.', ',') : '0,0',
      report.sample.grainType === 'SOJA' ? moldy.toFixed(1).replace('.', ',') : '0,0',
      report.sample.grainType === 'MILHO' ? gessados.toFixed(1).replace('.', ',') : '0,0',
      Math.round(dMoisture),
      Math.round(dImpurity),
      Math.round(dDamaged),
      Math.round(dBroken),
      report.sample.grainType === 'SOJA' ? Math.round(dGreen) : 0,
      report.sample.grainType === 'SOJA' ? Math.round(dBurnt) : 0,
      report.sample.grainType === 'SOJA' ? Math.round(dMoldy) : 0,
      report.sample.grainType === 'MILHO' ? Math.round(dGessados) : 0,
      Math.round(totalD),
      Math.round(netW),
      report.result?.classificationGrade || 'N/A',
      report.operatorName || 'N/A'
    ];
  });

  // Construct semicolon-separated content
  // Excel inside Portuguese regions uses ";" as the default column divisor.
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  // Excel UTF-8 BOM indicator (Required to show Portuguese accents perfectly)
  const excelBOM = '\uFEFF';
  const blob = new Blob([excelBOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Trigger file download in browser
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fechamento_diario_classificacoes_${targetDateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
