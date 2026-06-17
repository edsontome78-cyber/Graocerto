/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GrainType, GrainSample, CalculationResult, GRAIN_PRESETS } from '../types';

/**
 * Calcula os descontos de peso físico baseados nas regras oficiais de recepção de grãos.
 * 
 * Fórmula clássica de quebra de umidade (conservação de matéria seca):
 * Peso Final = Peso Inicial * ((100 - Umidade Inicial) / (100 - Umidade Padrão))
 * Desconto Umidade = Peso Inicial - Peso Final
 * 
 * Descontos de impureza e avariados são proporcionais direto sobre o peso inicial
 * quando excedem as tolerâncias regulamentares.
 */
export function calculateGrainDiscounts(sample: GrainSample & { applyDiscount?: boolean }, forceApplyDiscount?: boolean): CalculationResult {
  const config = GRAIN_PRESETS[sample.grainType] || GRAIN_PRESETS['SOJA'];
  
  // Decide whether to apply discounts or not (defaults to true if undefined)
  const applyDiscount = forceApplyDiscount !== undefined ? forceApplyDiscount : (sample.applyDiscount !== false);
  
  // Sanitize all inputs to prevent NaN or undefined crashes
  const totalWeight = Number.isNaN(Number(sample.totalWeight)) ? 0 : (Number(sample.totalWeight) || 0);
  const rawFieldSampleWeight = Number.isNaN(Number(sample.rawFieldSampleWeight)) ? 0 : (Number(sample.rawFieldSampleWeight) || 0);
  const officialSampleWeight = Number.isNaN(Number(sample.officialSampleWeight)) ? 100 : (Number(sample.officialSampleWeight) || 100);
  const impurityGrams = Number.isNaN(Number(sample.impurityGrams)) ? 0 : (Number(sample.impurityGrams) || 0);
  const damagedGrams = Number.isNaN(Number(sample.damagedGrams)) ? 0 : (Number(sample.damagedGrams) || 0);
  const brokenGrams = Number.isNaN(Number(sample.brokenGrams)) ? 0 : (Number(sample.brokenGrams) || 0);
  const greenGrams = Number.isNaN(Number(sample.greenGrams)) ? 0 : (Number(sample.greenGrams) || 0);
  const burntGrams = Number.isNaN(Number(sample.burntGrams)) ? 0 : (Number(sample.burntGrams) || 0);
  const moldyGrams = Number.isNaN(Number(sample.moldyGrams)) ? 0 : (Number(sample.moldyGrams) || 0);
  const gessadosGrams = Number.isNaN(Number(sample.gessadosGrams)) ? 0 : (Number(sample.gessadosGrams) || 0);
  const moisture = Number.isNaN(Number(sample.moisture)) ? 0 : (Number(sample.moisture) || 0);

  // Garantir que a amostra oficial tem peso válido para evitar divisões por zero
  const officialW = officialSampleWeight || 100;

  // 1. Converter pesos de triagem em percentuais reais
  const impurityPercent = (impurityGrams / officialW) * 100;
  const damagedPercent = (damagedGrams / officialW) * 100;
  const brokenPercent = (brokenGrams / officialW) * 100;
  const greenPercent = (greenGrams / officialW) * 100;
  const burntPercent = (burntGrams / officialW) * 100;
  const moldyPercent = (moldyGrams / officialW) * 100;
  const gessadosPercent = (gessadosGrams / officialW) * 100;

  // --- DIMENSÃO A: DESCONTOS NA AMOSTRA OFICIAL (em gramas) ---

  // A.1. Quebra de Umidade na Amostra
  let sampleDiscountMoisture = 0;
  if (moisture > config.standardMoisture) {
    const finalWeightAfterMoisture = officialW * ((100 - moisture) / (100 - config.standardMoisture));
    sampleDiscountMoisture = officialW - finalWeightAfterMoisture;
    sampleDiscountMoisture = Math.max(0, Math.min(officialW, sampleDiscountMoisture));
  }

  // A.2. Desconto de Impurezas (Excedente)
  let sampleDiscountImpurity = 0;
  if (impurityPercent > config.standardImpurity) {
    const excessImpurityPercent = impurityPercent - config.standardImpurity;
    sampleDiscountImpurity = officialW * (excessImpurityPercent / 100);
  }

  // A.3. Desconto de Avariados (Excedente)
  let sampleDiscountDamaged = 0;
  if (damagedPercent > config.standardDamaged) {
    const excessDamagedPercent = damagedPercent - config.standardDamaged;
    sampleDiscountDamaged = officialW * (excessDamagedPercent / 100);
  }

  // A.4. Desconto de Quebrados (Penalidade menor de 50%)
  let sampleDiscountBroken = 0;
  if (brokenPercent > config.standardBroken) {
    const excessBrokenPercent = brokenPercent - config.standardBroken;
    sampleDiscountBroken = officialW * (excessBrokenPercent / 100) * 0.5;
  }

  // A.5. Desconto de Esverdeados (Excedente, somente soja)
  let sampleDiscountGreen = 0;
  if (sample.grainType === 'SOJA' && config.standardGreen && greenPercent > config.standardGreen) {
    const excessGreenPercent = greenPercent - config.standardGreen;
    sampleDiscountGreen = officialW * (excessGreenPercent / 100);
  }

  // A.6. Desconto de Queimados (Excedente, somente soja)
  let sampleDiscountBurnt = 0;
  if (sample.grainType === 'SOJA' && config.standardBurnt && burntPercent > config.standardBurnt) {
    const excessBurntPercent = burntPercent - config.standardBurnt;
    sampleDiscountBurnt = officialW * (excessBurntPercent / 100);
  }

  // A.7. Desconto de Mofados (Excedente, somente soja)
  let sampleDiscountMoldy = 0;
  if (sample.grainType === 'SOJA' && config.standardMoldy && moldyPercent > config.standardMoldy) {
    const excessMoldyPercent = moldyPercent - config.standardMoldy;
    sampleDiscountMoldy = officialW * (excessMoldyPercent / 100);
  }

  // A.8. Desconto de Gessados (Excedente, somente milho)
  let sampleDiscountGessados = 0;
  if (sample.grainType === 'MILHO' && config.standardGessados && gessadosPercent > config.standardGessados) {
    const excessGessadosPercent = gessadosPercent - config.standardGessados;
    sampleDiscountGessados = officialW * (excessGessadosPercent / 100);
  }

  let sampleTotalDiscounts = sampleDiscountMoisture + sampleDiscountImpurity + sampleDiscountDamaged + sampleDiscountBroken + 
    sampleDiscountGreen + sampleDiscountBurnt + sampleDiscountMoldy + sampleDiscountGessados;
  let sampleFinalNetWeight = Math.max(0, officialW - sampleTotalDiscounts);


  // --- DIMENSÃO B: PROJEÇÃO NA CARGA TOTAL DO VEÍCULO (em kg) ---

  // Usamos as mesmas taxas percentuais resultantes da amostra para descontar a carga
  let discountMoistureWeight = 0;
  if (moisture > config.standardMoisture) {
    const finalWeightCargo = totalWeight * ((100 - moisture) / (100 - config.standardMoisture));
    discountMoistureWeight = totalWeight - finalWeightCargo;
    discountMoistureWeight = Math.max(0, Math.min(totalWeight, discountMoistureWeight));
  }

  let discountImpurityWeight = totalWeight * (Math.max(0, impurityPercent - config.standardImpurity) / 100);
  let discountDamagedWeight = totalWeight * (Math.max(0, damagedPercent - config.standardDamaged) / 100);
  let discountBrokenWeight = totalWeight * (Math.max(0, brokenPercent - config.standardBroken) / 100) * 0.5;
  
  let discountGreenWeight = sample.grainType === 'SOJA' && config.standardGreen && greenPercent > config.standardGreen
    ? totalWeight * ((greenPercent - config.standardGreen) / 100)
    : 0;

  let discountBurntWeight = sample.grainType === 'SOJA' && config.standardBurnt && burntPercent > config.standardBurnt
    ? totalWeight * ((burntPercent - config.standardBurnt) / 100)
    : 0;

  let discountMoldyWeight = sample.grainType === 'SOJA' && config.standardMoldy && moldyPercent > config.standardMoldy
    ? totalWeight * ((moldyPercent - config.standardMoldy) / 100)
    : 0;

  let discountGessadosWeight = sample.grainType === 'MILHO' && config.standardGessados && gessadosPercent > config.standardGessados
    ? totalWeight * ((gessadosPercent - config.standardGessados) / 100)
    : 0;

  let totalDiscounts = discountMoistureWeight + discountImpurityWeight + discountDamagedWeight + discountBrokenWeight + 
    discountGreenWeight + discountBurntWeight + discountMoldyWeight + discountGessadosWeight;
  let finalNetWeight = Math.max(0, totalWeight - totalDiscounts);

  // SE NÃO FOR APLICAR DESCONTO, ZERA OS DESCONTOS DE PESO, PRESERVANDO TAXAS (%)
  if (!applyDiscount) {
    discountMoistureWeight = 0;
    discountImpurityWeight = 0;
    discountDamagedWeight = 0;
    discountBrokenWeight = 0;
    discountGreenWeight = 0;
    discountBurntWeight = 0;
    discountMoldyWeight = 0;
    discountGessadosWeight = 0;
    totalDiscounts = 0;
    finalNetWeight = totalWeight;

    sampleDiscountMoisture = 0;
    sampleDiscountImpurity = 0;
    sampleDiscountDamaged = 0;
    sampleDiscountBroken = 0;
    sampleDiscountGreen = 0;
    sampleDiscountBurnt = 0;
    sampleDiscountMoldy = 0;
    sampleDiscountGessados = 0;
    sampleTotalDiscounts = 0;
    sampleFinalNetWeight = officialW;
  }


  // Determinar Tipo Comercial (Classificação)
  let classificationGrade: CalculationResult['classificationGrade'] = 'TIPO 1 (Excelente)';
  
  const moistureExced = moisture - config.standardMoisture;
  const impurityExced = impurityPercent - config.standardImpurity;
  const damagedExced = damagedPercent - config.standardDamaged;
  const greenExced = sample.grainType === 'SOJA' && config.standardGreen ? (greenPercent - config.standardGreen) : 0;
  const burntExced = sample.grainType === 'SOJA' && config.standardBurnt ? (burntPercent - config.standardBurnt) : 0;
  const moldyExced = sample.grainType === 'SOJA' && config.standardMoldy ? (moldyPercent - config.standardMoldy) : 0;
  const gessadosExced = sample.grainType === 'MILHO' && config.standardGessados ? (gessadosPercent - config.standardGessados) : 0;

  if (moistureExced > 4 || impurityExced > 3 || damagedExced > 5 || greenExced > 5 || burntExced > 2 || moldyExced > 3 || gessadosExced > 4) {
    classificationGrade = 'FORA DE PADRÃO (Desconto Alto)';
  } else if (moistureExced > 2 || impurityExced > 1.5 || damagedExced > 2 || greenExced > 2 || burntExced > 1 || moldyExced > 1.5 || gessadosExced > 2) {
    classificationGrade = 'TIPO 3 (Ajuste Necessário)';
  } else if (moistureExced > 0 || impurityExced > 0 || damagedExced > 0 || greenExced > 0 || burntExced > 0 || moldyExced > 0 || gessadosExced > 0 || brokenPercent > config.standardBroken) {
    classificationGrade = 'TIPO 2 (Adequado)';
  }

  const safeVal = (v: number) => Number.isNaN(v) || !Number.isFinite(v) ? 0 : v;

  return {
    sampleDiscountMoisture: safeVal(sampleDiscountMoisture),
    sampleDiscountImpurity: safeVal(sampleDiscountImpurity),
    sampleDiscountDamaged: safeVal(sampleDiscountDamaged),
    sampleDiscountBroken: safeVal(sampleDiscountBroken),
    sampleDiscountGreen: safeVal(sampleDiscountGreen),
    sampleDiscountBurnt: safeVal(sampleDiscountBurnt),
    sampleDiscountMoldy: safeVal(sampleDiscountMoldy),
    sampleDiscountGessados: safeVal(sampleDiscountGessados),
    sampleTotalDiscounts: safeVal(sampleTotalDiscounts),
    sampleFinalNetWeight: safeVal(sampleFinalNetWeight),

    discountMoistureWeight: safeVal(discountMoistureWeight),
    discountImpurityWeight: safeVal(discountImpurityWeight),
    discountDamagedWeight: safeVal(discountDamagedWeight),
    discountBrokenWeight: safeVal(discountBrokenWeight),
    discountGreenWeight: safeVal(discountGreenWeight),
    discountBurntWeight: safeVal(discountBurntWeight),
    discountMoldyWeight: safeVal(discountMoldyWeight),
    discountGessadosWeight: safeVal(discountGessadosWeight),
    totalDiscounts: safeVal(totalDiscounts),
    finalNetWeight: safeVal(finalNetWeight),

    moisturePercent: safeVal(moisture),
    impurityPercent: safeVal(impurityPercent),
    damagedPercent: safeVal(damagedPercent),
    brokenPercent: safeVal(brokenPercent),
    greenPercent: safeVal(greenPercent),
    burntPercent: safeVal(burntPercent),
    moldyPercent: safeVal(moldyPercent),
    gessadosPercent: safeVal(gessadosPercent),
    hasDeduction: sampleTotalDiscounts > 0,
    classificationGrade
  };
}

/**
 * Gera comandos ESC/POS para as bobinas de impressoras térmicas portáteis de 58mm/80mm.
 */
export function generateEscPosCommands(report: any): string {
  const line = "------------------------------------------------";
  const doubleLine = "================================================";
  const logo = report.sample.grainType === 'SOJA' ? "   (o o)   " : report.sample.grainType === 'MILHO' ? "  ( (oo) ) " : "   |||||   ";
  
  return `[ESC @] (Reset)
[ESC a 1] (Centralizar Alinhamento)
${logo}
*** GRÃOCERT - LAUDO DE CAMPO ***
Nro: #${String(report.reportNumber).padStart(5, '0')}
${doubleLine}
[ESC a 0] (Alinhar Esquerda)
Produtor   : ${report.farmerName}
Propriedade: ${report.farmName}
Localidade : ${report.cityState}
Placa / Lote: ${report.vehiclePlate.toUpperCase()} / ${report.lotReference}
Operador   : ${report.operatorName}
Data       : ${new Date(report.date).toLocaleDateString('pt-BR')} ${new Date(report.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
${line}
PRODUTO    : COD ${report.sample.grainType} - ${GRAIN_PRESETS[report.sample.grainType as GrainType]?.name.toUpperCase()}
Amostra Campo  : ${report.sample.rawFieldSampleWeight}g (Max: 500g)
Amostra Oficial: ${report.sample.officialSampleWeight}g (Analise)
${line}
MEDICOES NA AMOSTRA DE TRABALHO (${report.sample.officialSampleWeight}g):
- Umidade Medido: ${report.sample.moisture.toFixed(1)}% (Pad: ${GRAIN_PRESETS[report.sample.grainType as GrainType]?.standardMoisture.toFixed(1)}%)
- Impureza Peso : ${report.sample.impurityGrams.toFixed(1)}g (${report.result.impurityPercent.toFixed(1)}%)
- Avariados Peso: ${report.sample.damagedGrams.toFixed(1)}g (${report.result.damagedPercent.toFixed(1)}%)
${report.sample.grainType === 'SOJA' ? `- Esverd. Peso  : ${((report.sample as any).greenGrams || 0).toFixed(1)}g (${(report.result.greenPercent || 0).toFixed(1)}%)\n` : ''}- Quebrados Peso: ${report.sample.brokenGrams.toFixed(1)}g (${report.result.brokenPercent.toFixed(1)}%)
${line}
[ESC E 1] (Negrito Ativo)
DEDUCOES APLICADAS NA AMOSTRA OFICIAL:
* Desc. Umidade   : -${report.result.sampleDiscountMoisture.toFixed(1)}g
* Desc. Impurezas : -${report.result.sampleDiscountImpurity.toFixed(1)}g
* Desc. Avariados : -${report.result.sampleDiscountDamaged.toFixed(1)}g
${report.sample.grainType === 'SOJA' && report.result.sampleDiscountGreen ? `* Desc. Esverdead.: -${report.result.sampleDiscountGreen.toFixed(1)}g\n` : ''}* Desc. Quebrados : -${report.result.sampleDiscountBroken.toFixed(1)}g
Total Descontos   : -${report.result.sampleTotalDiscounts.toFixed(1)}g
[ESC E 0] (Negrito Inativo)
${line}
[ESC ! 16] (Fonte Dupla Altura)
PESO LIQ. AMOSTRA : ${report.result.sampleFinalNetWeight.toFixed(1)}g
[ESC ! 0] (Fonte Normal)
${line}
PROJECAO DE CARGA REAL (VALOR MERCEAL):
Carga de Entrada : ${report.sample.totalWeight.toLocaleString('pt-BR')} kg
Descontos Totais : -${Math.round(report.result.totalDiscounts).toLocaleString('pt-BR')} kg
PESO LIQ. CARGA  : ${Math.round(report.result.finalNetWeight).toLocaleString('pt-BR')} kg
${line}
CLASSIFICACAO     : ${report.result.classificationGrade}
STATUS EM CAMPO   : LIBERADO PARA RECEPCAO
${doubleLine}
Assinatura do Produtor:

________________________________________
Representante

Assinatura do Classificador:

________________________________________
${report.operatorName}

[ESC d 3] (Avanca 3 linhas)
[GS V 66 0] (Corte de papel completo)
`;
}
