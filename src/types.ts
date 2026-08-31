export type AgeGroupTier = 'classes-1-3' | 'classes-4-7' | 'classes-8-10';

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  estimatedQuantity: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fiberGrams: number;
  fatGrams: number;
  micronutrients: string[];
  funFact: string;
  superpowerLabel: string;
  colorTag: 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'indigo';
}

export interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFiber: number;
  totalFat: number;
  vitamins: string[];
  minerals: string[];
  healthScore: number;
  balanceRating: string;
  energyDurationHours: string;
}

export interface PowerBadge {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
}

export interface AgeExplanation {
  headline: string;
  simpleDescription: string;
  portionTip: string;
  powerBadges: PowerBadge[];
  smartFact: string;
  speechScript: string;
}

export interface SDGImpact {
  sdg12Tip: string;
  sdg3Tip: string;
  zeroWastePledge: string;
}

export interface MealAnalysisResult {
  id: string;
  title: string;
  imageUrl?: string;
  detectedItems: FoodItem[];
  nutrition: NutritionSummary;
  ageTierExplanations: Record<AgeGroupTier, AgeExplanation>;
  activeAgeTier: AgeGroupTier;
  sdgImpact: SDGImpact;
  timestamp: number;
  canteenStaffNotes?: string;
  isActive?: boolean;
}

export interface WasteItem {
  id: string;
  name: string;
  estimatedKg: number;
  preparedKg: number;
  reasonDetected?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface WasteLogEntry {
  id: string;
  date: string;
  mealTitle: string;
  ageTier: AgeGroupTier;
  totalPreparedKg: number;
  totalLeftoverKg: number;
  wastePercentage: number;
  leftoverItems: WasteItem[];
  costLossEstimate: number;
  co2ImpactKg: number;
  notes?: string;
}

export interface WasteInsightReport {
  wasteReductionScore: number;
  averageWasteRate: string;
  keyInsights: Array<{
    dishName: string;
    wasteLevel: string;
    rootCause: string;
    actionableFix: string;
    estimatedKgSavedPerWeek: number;
    impactSummary: string;
  }>;
  sdg12ImpactMetrics: {
    totalKgSavedMonth: number;
    co2PreventedKg: number;
    waterConservedLitres: number;
    financialSavingsDollars: number;
  };
  smartBoardStudentChallenge: string;
}

export interface MenuItem {
  day: string;
  mealName: string;
  dishes: string[];
  calories: number;
  protein: number;
  fiber: number;
  sdgRating: string;
}

export interface MenuAuditReport {
  overallGrade: string;
  summaryReview: string;
  nutritionalScore: number;
  colorDiversityScore: string;
  topRecommendations: Array<{
    targetDay: string;
    title: string;
    currentDish: string;
    improvedDish: string;
    kidFriendlyAngle: string;
    wasteReductionTip: string;
    estimatedCostChange: string;
    nutritionGain: string;
  }>;
  seasonalProduceSpotlight: Array<{
    name: string;
    bestUse: string;
    season: string;
  }>;
  sdg12Checklist: string[];
}

export interface BroadcastConfig {
  activeMealId: string;
  activeAgeTier: AgeGroupTier;
  autoRotateAgeTiers: boolean;
  announcementTicker: string;
  isVoiceActive: boolean;
  cleanPlateCount?: number;
  lastUpdated: number;
}

export interface StaffAccount {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: string;
  createdAt: number;
}

export interface ParentAccount {
  id: string;
  name: string;
  username: string;
  password?: string;
  studentId: string;
  studentName: string;
  grade: string;
  walletBalance: number;
  createdAt: number;
}

export interface LunchBooking {
  id: string;
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
  grade: string;
  mealId: string;
  mealTitle: string;
  mealPrice: number;
  pickupPin: string;
  bookingDate: string; // YYYY-MM-DD
  status: 'booked' | 'given' | 'cancelled';
  createdAt: number;
}

export interface TomorrowMenu {
  id: string;
  title: string;
  description: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  date: string; // YYYY-MM-DD
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isAvailable: boolean;
  updatedAt: number;
}

export interface BookingSettings {
  fromTime?: string; // e.g. "06:00"
  toTime?: string;   // e.g. "09:00"
  cutoffTime: string; // e.g. "09:00"
  isBookingAllowed: boolean;
  lunchPrice?: number;
  updatedAt: number;
}

export interface AdminCredentials {
  username: string;
  password?: string;
  updatedAt?: number;
}

export type AppView = 'scanner' | 'smartboard' | 'menu-optimizer' | 'waste-tracker' | 'chatbot' | 'lunch-manager';

export interface WalletTransaction {
  id: string;
  parentId: string;
  studentId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: number;
}

export interface ParentNotification {
  id: string;
  parentId: string;
  title: string;
  message: string;
  type: 'debit_alert' | 'booking_alert' | 'general';
  isRead: boolean;
  timestamp: number;
}
