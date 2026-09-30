import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Leaf, 
  Plus, 
  RefreshCw, 
  ArrowRight, 
  Heart, 
  Award,
  ChevronRight,
  TrendingUp,
  Apple
} from 'lucide-react';
import { MenuItem, MenuAuditReport } from '../types';
import { WEEKLY_CANTEEN_SCHEDULE } from '../data/sampleWasteLogs';

export const MenuOptimizer: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(WEEKLY_CANTEEN_SCHEDULE);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<MenuAuditReport | null>({
    overallGrade: 'A-',
    summaryReview: 'Good baseline nutritional balance, but mid-week menus show a slight dip in dark green vegetables and whole grain variety.',
    nutritionalScore: 88,
    colorDiversityScore: '8.5 / 10',
    topRecommendations: [
      {
        targetDay: 'Wednesday',
        title: 'Boost Iron & Vitamin C Absorption',
        currentDish: 'Plain Steamed Rice with Yellow Moong Dal',
        improvedDish: 'Iron-Rich Spinach Lentil Dal with Lemon Slices & Roasted Cumin',
        kidFriendlyAngle: 'Call it "Emerald Hero Stew" with squeeze-your-own lemon wedges for fun interactivity!',
        wasteReductionTip: 'Finely chopping greens prevents students from picking them out.',
        estimatedCostChange: '+$0.04 per tray',
        nutritionGain: '+4.2mg bioavailable Iron, +18mg Vit C',
      },
      {
        targetDay: 'Friday',
        title: 'Whole Grain & Fiber Upgrade',
        currentDish: 'White Bread Sandwich with Cheese Slice',
        improvedDish: 'Multi-Grain Pita Pockets with Grated Carrot-Cucumber Hummus Spread',
        kidFriendlyAngle: 'Pocket format prevents messy spills and makes crunchy veggies exciting to bite into.',
        wasteReductionTip: 'Pita pockets reduce dropped bread crusts by up to 60%.',
        estimatedCostChange: 'Cost neutral',
        nutritionGain: '+4.5g Dietary Fiber, -120mg Sodium',
      },
      {
        targetDay: 'Monday',
        title: 'Natural Hydration & Electrolytes',
        currentDish: 'Commercial Sugar Fruit Punch',
        improvedDish: 'Infused Water with Fresh Orange Slices, Mint & Cucumbers',
        kidFriendlyAngle: 'Visible fruit floating in clear glass dispensers looks refreshing and fun to pour!',
        wasteReductionTip: 'Zero single-use packaging waste and cuts refined sugar by 18g per student.',
        estimatedCostChange: '-$0.12 per student (Cost savings!)',
        nutritionGain: '-18g added sugar, +Natural Hydration',
      },
    ],
    seasonalProduceSpotlight: [
      { name: 'Sweet Carrots & Beetroot', bestUse: 'Grated in coleslaw or baked into mini whole-wheat muffins', season: 'Peak Freshness' },
      { name: 'Local Green Peas & Baby Spinach', bestUse: 'Blended in pasta pesto sauces for vibrant green color', season: 'Budget-Friendly' },
      { name: 'Crisp Red Apples', bestUse: 'Pre-sliced with a pinch of cinnamon to prevent browning', season: 'High Student Acceptance' },
    ],
    sdg12Checklist: [
      'Batch-cook base sauces that can be repurposed across two consecutive school days.',
      'Offer junior (130g) and senior (200g) scoop sizes to eliminate plate leftovers.',
      'Feature a weekly "Student Recipe Vote" on the Smart Board to ensure high meal excitement.',
    ],
  });

  const [newDay, setNewDay] = useState('Monday');
  const [newMealName, setNewMealName] = useState('');
  const [newDishes, setNewDishes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Trigger Gemini AI Menu Analysis
  const handleRunAiAudit = async () => {
    setIsAuditing(true);
    try {
      const response = await fetch('/api/menu-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyMenu: menuItems,
          targetGoal: 'increase-iron-and-fiber',
          budgetTier: 'standard',
        }),
      });
      const json = await response.json();
      if (json.success && json.data) {
        setAuditReport(json.data);
      }
    } catch (err) {
      console.error('Menu AI audit error:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName) return;

    const dishesArray = newDishes ? newDishes.split(',').map((s) => s.trim()) : ['Balanced Main', 'Veggie Side', 'Fresh Fruit'];
    const newItem: MenuItem = {
      day: newDay,
      mealName: newMealName,
      dishes: dishesArray,
      calories: 440,
      protein: 18,
      fiber: 11,
      sdgRating: 'Gold Tier Canteen Meal',
    };

    setMenuItems([...menuItems, newItem]);
    setNewMealName('');
    setNewDishes('');
    setShowAddForm(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="h-2 bg-emerald-500 w-full absolute top-0 left-0"></div>

        <div className="space-y-2 max-w-3xl pt-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            AI Menu Assistant & Variety Optimizer
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            NutriBoard AI audits your weekly school menu to identify nutritional gaps, suggest kid-approved recipe enhancements, and optimize ingredient utilization to prevent cafeteria waste.
          </p>
        </div>

        <button
          id="run-menu-audit-btn"
          onClick={handleRunAiAudit}
          disabled={isAuditing}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 shrink-0 transition-all active:scale-95"
        >
          {isAuditing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Auditing Menu with Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-white" />
              <span>Audit Weekly Menu with AI ⚡</span>
            </>
          )}
        </button>
      </div>

      {/* Main Grid: Weekly Schedule (Left) + AI Recommendations (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Weekly Menu Calendar (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              Current Weekly Canteen Menu
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
            >
              <Plus className="w-3.5 h-3.5" /> Add Meal
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddMeal} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Day</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option>Monday</option>
                    <option>Tuesday</option>
                    <option>Wednesday</option>
                    <option>Thursday</option>
                    <option>Friday</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Meal Name</label>
                  <input
                    type="text"
                    required
                    value={newMealName}
                    onChange={(e) => setNewMealName(e.target.value)}
                    placeholder="e.g. Rajma Chawal & Salad"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Dishes (comma separated)</label>
                <input
                  type="text"
                  value={newDishes}
                  onChange={(e) => setNewDishes(e.target.value)}
                  placeholder="e.g. Red Kidney Beans, Rice, Cucumber Slices"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Save Dish
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {menuItems.map((item, idx) => (
              <div
                key={`menu-${idx}`}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {item.day}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {item.calories} kcal • {item.protein}g Protein
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{item.mealName}</h3>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.dishes.map((dish, dIdx) => (
                    <span
                      key={`dish-${dIdx}`}
                      className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                    >
                      {dish}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Recipe Upgrades & Waste Reduction Strategy (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {auditReport && (
            <>
              {/* Top AI Actionable Recommendations */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    AI Kid-Friendly Recipe & Variety Makeovers
                  </h2>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    3 High Impact Upgrades
                  </span>
                </div>

                <div className="space-y-4">
                  {auditReport.topRecommendations.map((rec, idx) => (
                    <div
                      key={`rec-${idx}`}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                          {rec.targetDay}: {rec.title}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {rec.estimatedCostChange}
                        </span>
                      </div>

                      {/* Before / After comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Dish</p>
                          <p className="font-semibold text-slate-700 mt-0.5">{rec.currentDish}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" /> AI Improved Upgrade
                          </p>
                          <p className="font-bold text-emerald-950 mt-0.5">{rec.improvedDish}</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-slate-700">
                          <span className="font-bold text-amber-800">🎈 Kid Appeal Angle:</span> {rec.kidFriendlyAngle}
                        </p>
                        <p className="text-slate-700">
                          <span className="font-bold text-emerald-800">♻️ Food Waste Prevention:</span> {rec.wasteReductionTip}
                        </p>
                        <p className="text-slate-600 text-[11px] font-medium">
                          <span className="font-semibold text-blue-800">⚡ Nutrition Gain:</span> {rec.nutritionGain}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seasonal Produce Spotlight */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Apple className="w-4 h-4 text-rose-500" />
                  Seasonal Produce Spotlight for High Variety
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {auditReport.seasonalProduceSpotlight.map((prod, idx) => (
                    <div key={`prod-${idx}`} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <p className="text-xs font-bold text-slate-900">{prod.name}</p>
                      <p className="text-[11px] text-slate-600 leading-snug">{prod.bestUse}</p>
                      <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-1 border border-emerald-200">
                        {prod.season}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SDG 12 Canteen Waste Checklist */}
              <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-xs space-y-3 relative overflow-hidden">
                <div className="h-1.5 bg-emerald-500 w-full absolute top-0 left-0"></div>

                <div className="flex items-center gap-2 pt-1">
                  <Leaf className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                    SDG 12 Zero-Waste Kitchen Guidelines
                  </h3>
                </div>
                <div className="space-y-2">
                  {auditReport.sdg12Checklist.map((tip, idx) => (
                    <div key={`tip-${idx}`} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
