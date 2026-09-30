import { WasteLogEntry, WasteInsightReport, MenuItem } from '../types';

export const INITIAL_WASTE_LOGS: WasteLogEntry[] = [];

export const INITIAL_WASTE_INSIGHT_REPORT: WasteInsightReport = {
  wasteReductionScore: 0,
  averageWasteRate: '0%',
  keyInsights: [],
  sdg12ImpactMetrics: {
    totalKgSavedMonth: 0,
    co2PreventedKg: 0,
    waterConservedLitres: 0,
    financialSavingsDollars: 0,
  },
  smartBoardStudentChallenge: '🌱 Zero Waste Goal: Log cafeteria leftovers to trigger AI diagnostics and portion improvements.',
};

export const WEEKLY_CANTEEN_SCHEDULE: MenuItem[] = [];
