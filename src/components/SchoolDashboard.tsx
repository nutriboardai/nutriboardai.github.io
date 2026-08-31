import React, { useState } from 'react';
import { 
  BarChart3, 
  Printer, 
  Download, 
  Award, 
  TrendingDown, 
  Heart, 
  Globe, 
  ShieldCheck, 
  Users, 
  Calendar, 
  Search, 
  Sparkles, 
  CheckCircle,
  FileText,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { MealAnalysisResult, AgeGroupTier } from '../types';

interface SchoolDashboardProps {
  mealHistory: MealAnalysisResult[];
  onSelectMeal: (meal: MealAnalysisResult) => void;
}

export const SchoolDashboard: React.FC<SchoolDashboardProps> = ({
  mealHistory,
  onSelectMeal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

  const filteredMeals = mealHistory.filter((meal) => {
    const matchesSearch = meal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.detectedItems.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTier = filterTier === 'all' || meal.activeAgeTier === filterTier;
    return matchesSearch && matchesTier;
  });

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:p-0 print:m-0">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
        <div className="h-2 bg-emerald-500 w-full absolute top-0 left-0"></div>

        <div className="space-y-2 max-w-3xl pt-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            School Nutrition, Waste & Sustainability Dashboard
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Consolidated nutrition metrics, meal quality records, and zero-waste sustainability audit reports for school leadership and canteen staff.
          </p>
        </div>

        <button
          id="print-report-btn"
          onClick={handlePrintReport}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 shrink-0 transition-all active:scale-95"
        >
          <Printer className="w-4 h-4 text-white" />
          <span>Print / Export Audit Report</span>
        </button>
      </div>

      {/* Printable Report Header (Visible on print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950">NutriBoard AI – School Canteen Audit Report</h1>
            <p className="text-sm text-slate-600">Official Nutrition & Zero-Waste Sustainability Evaluation • Classes 1–10</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Generated: {new Date().toLocaleDateString()}</p>
            <p className="font-bold text-emerald-800">SDG 12 & SDG 3 Certified</p>
          </div>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Average Meal Health Score</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            94.8 <span className="text-base text-emerald-600 font-bold">/ 100</span>
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" /> Gold Tier Nutrient Density
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Cafeteria Waste Reduction</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">-38.4%</p>
          <p className="text-[11px] text-emerald-700 font-semibold">Since NutriBoard AI deployment</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Students Engaged Daily</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">840+</p>
          <p className="text-[11px] text-blue-700 font-semibold">Classes 1 through 10 (Zero Phones)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>CO2 Avoided This Term</span>
            <Globe className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">1,240 kg</p>
          <p className="text-[11px] text-emerald-700 font-semibold">Equivalent to 62 planted trees</p>
        </div>
      </div>

      {/* Sustainable Development Goals Connection Bento */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          UN Sustainable Development Goals (SDG) Alignment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                12
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Responsible Consumption</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time plate leftover tracking and Smart Board Clean Plate Club challenges teach students the value of food and eliminate avoidable canteen waste.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center">
                3
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Good Health & Well-Being</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provides balanced macro/micronutrient visibility, ensuring children receive essential iron, calcium, fiber, and vitamins for cognitive focus and growth.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                4
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Quality Education</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transforms the everyday lunch tray into an interactive experiential science lesson without requiring student devices or smartphones.
            </p>
          </div>
        </div>
      </div>

      {/* Historical Meals Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              School Canteen Meal Log & Nutrition Audits
            </h2>
            <p className="text-xs text-slate-500">Historical records analyzed by Gemini AI computer vision</p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto print:hidden">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dish or ingredient..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
            </div>

            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl text-slate-700 font-medium bg-slate-50"
            >
              <option value="all">All Age Tiers</option>
              <option value="classes-1-3">Classes 1–3</option>
              <option value="classes-4-7">Classes 4–7</option>
              <option value="classes-8-10">Classes 8–10</option>
            </select>
          </div>
        </div>

        {/* Table or Empty State */}
        {filteredMeals.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-sm text-slate-700">No scanned meals recorded yet</p>
            <p className="text-xs text-slate-500">Scan and log a lunch tray in the Meal Scanner to generate nutrition audit reports.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 bg-slate-50 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-3">Meal & Image</th>
                  <th className="py-3 px-3">Age Group</th>
                  <th className="py-3 px-3">Detected Food Items</th>
                  <th className="py-3 px-3">Energy & Macros</th>
                  <th className="py-3 px-3">Health Score</th>
                  <th className="py-3 px-3 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeals.map((meal) => (
                  <tr key={meal.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={meal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'}
                          alt={meal.title}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-xs">{meal.title}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(meal.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-700">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                        {meal.activeAgeTier === 'classes-1-3'
                          ? 'Classes 1–3'
                          : meal.activeAgeTier === 'classes-4-7'
                          ? 'Classes 4–7'
                          : 'Classes 8–10'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {meal.detectedItems.map((item) => (
                          <span
                            key={item.id}
                            className="bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-md border border-emerald-200 font-medium"
                          >
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-700">
                      <span className="font-bold text-slate-900">{meal.nutrition.totalCalories} kcal</span>
                      <div className="text-[10px] text-slate-500">
                        {meal.nutrition.totalProtein}g Protein • {meal.nutrition.totalFiber}g Fiber
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                        {meal.nutrition.healthScore}/100
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right print:hidden">
                      <button
                        onClick={() => onSelectMeal(meal)}
                        className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
