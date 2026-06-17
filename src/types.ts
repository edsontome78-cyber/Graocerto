/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GrainType = 'SOJA' | 'MILHO' | 'SORGO';

export interface GrainConfig {
  id: GrainType;
  name: string;
  emoji: string;
  standardMoisture: number; // %
  standardImpurity: number; // %
  standardDamaged: number; // % (Avariados/Ardidos)
  standardBroken: number; // % (Quebrados)
  standardGreen?: number; // % (Esverdeados)
  standardBurnt?: number; // % (Queimados)
  standardMoldy?: number; // % (Mofados)
  standardGessados?: number; // % (Gessados)
  description: string;
}

export const GRAIN_PRESETS: Record<GrainType, GrainConfig> = {
  SOJA: {
    id: 'SOJA',
    name: 'Soja',
    emoji: '🌱',
    standardMoisture: 14.0,
    standardImpurity: 1.0,
    standardDamaged: 8.0,
    standardBroken: 30.0,
    standardGreen: 8.0,
    standardBurnt: 1.0,  // Tolerância de Queimados de Soja (ANEC/MAPA)
    standardMoldy: 6.0,  // Tolerância de Mofados de Soja (ANEC/MAPA)
    description: 'Padrão ANEC (Associação Nacional dos Exportadores de Cereais) e regulamento atualizado.'
  },
  MILHO: {
    id: 'MILHO',
    name: 'Milho',
    emoji: '🌽',
    standardMoisture: 14.0,
    standardImpurity: 1.0,
    standardDamaged: 5.0,
    standardBroken: 3.0,
    standardGessados: 5.0, // Tolerância de Gessados do Milho (MAPA)
    description: 'Resolução MAPA. Limite de avariados e quebrados para comercialização ideal.'
  },
  SORGO: {
    id: 'SORGO',
    name: 'Sorgo',
    emoji: '🌾',
    standardMoisture: 14.0,
    standardImpurity: 1.0,
    standardDamaged: 6.0,
    standardBroken: 4.0,
    description: 'Classificação de Sorgo Grão conforme regulamentos técnicos para nutrição animal e indústrias de moagem.'
  }
};

export interface GrainSample {
  grainType: GrainType;
  totalWeight: number; // kg (Carga total)
  rawFieldSampleWeight: number; // g (Amostra coletada no campo, ex: até 500g)
  officialSampleWeight: number; // g (Amostra oficial de trabalho, ex: 100g)
  impurityGrams: number; // g (Gramas de impureza purificadas)
  damagedGrams: number; // g (Gramas de avariados triados)
  brokenGrams: number; // g (Gramas de quebrados triados)
  greenGrams?: number; // g (Gramas de esverdeados triados - somente soja)
  burntGrams?: number; // g (Gramas de queimados triados - somente soja)
  moldyGrams?: number; // g (Gramas de mofados triados - somente soja)
  gessadosGrams?: number; // g (Gramas de gessados triados - somente milho)
  moisture: number; // % (Lida direta)
  applyDiscount?: boolean;
}

export interface CalculationResult {
  // Descontos na Amostra Oficial (em gramas)
  sampleDiscountMoisture: number; // g
  sampleDiscountImpurity: number; // g
  sampleDiscountDamaged: number; // g
  sampleDiscountBroken: number; // g
  sampleDiscountGreen?: number; // g
  sampleDiscountBurnt?: number; // g
  sampleDiscountMoldy?: number; // g
  sampleDiscountGessados?: number; // g
  sampleTotalDiscounts: number; // g
  sampleFinalNetWeight: number; // g (Peso líquido da amostra original)

  // Descontos projetados na carga total (em kg)
  discountMoistureWeight: number; // kg
  discountImpurityWeight: number; // kg
  discountDamagedWeight: number; // kg
  discountBrokenWeight: number; // kg
  discountGreenWeight?: number; // kg
  discountBurntWeight?: number; // kg
  discountMoldyWeight?: number; // kg
  discountGessadosWeight?: number; // kg
  totalDiscounts: number; // kg
  finalNetWeight: number; // kg

  // Percentuais reais resultantes
  moisturePercent: number;
  impurityPercent: number;
  damagedPercent: number;
  brokenPercent: number;
  greenPercent?: number; // %
  burntPercent?: number; // %
  moldyPercent?: number; // %
  gessadosPercent?: number; // %
  hasDeduction: boolean;
  classificationGrade: 'TIPO 1 (Excelente)' | 'TIPO 2 (Adequado)' | 'TIPO 3 (Ajuste Necessário)' | 'FORA DE PADRÃO (Desconto Alto)';
}

export interface FarmerReport {
  id: string;
  reportNumber: number;
  date: string;
  farmerName: string;
  farmName: string;
  cityState: string;
  lotReference: string;
  vehiclePlate: string;
  operatorName: string;
  sample: GrainSample;
  result: CalculationResult;
  notes: string;
  applyDiscount?: boolean;
  
  // Custom specifications requested
  emissionType?: string;
  cargoDestination?: string;
  commercialTreatment?: string;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  connected: boolean;
  type: 'Thermal Printer' | 'Scale' | 'Moisture Meter';
}
