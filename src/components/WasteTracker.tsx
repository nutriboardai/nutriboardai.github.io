import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Sparkles, 
  TrendingDown, 
  IndianRupee, 
  Leaf, 
  Droplet, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  RefreshCw, 
  Award,
  Calendar,
  Scale,
  PieChart,
  Layers
} from 'lucide-react';
import { WasteLogEntry, WasteInsightReport, AgeGroupTier } from '../types';
import { INITIAL_WASTE_LOGS, INITIAL_WASTE_INSIGHT_REPORT } from '../data/sampleWasteLogs';
import { 
  subscribeWasteLogs, 
  saveWasteLogToDb, 
  deleteWasteLogFromDb, 
  subscribeWasteInsights, 
  saveWasteInsightToDb 
} from '../lib/firebase';

export const WasteTracker: React.FC = () => {
  const [wasteLogs, setWasteLogs] = useState<WasteLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_waste_logs');
      return saved ? JSON.parse(saved) : INITIAL_WASTE_LOGS;
    } catch {
      return INITIAL_WASTE_LOGS;
    }
  });

  const [insightReport, setInsightReport] = useState<WasteInsightReport | null>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_waste_insights');
      return saved ? JSON.parse(saved) : INITIAL_WASTE_INSIGHT_REPORT;
    } catch {
      return INITIAL_WASTE_INSIGHT_REPORT;
    }
  });

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);

  // Sync with Cloud Firestore
  useEffect(() => {
    const unsubLogs = subscribeWasteLogs((logs) => {
      if (logs && logs.length > 0) {
        setWasteLogs(logs);
      }
    });

    const unsubInsights = subscribeWasteInsights((insights) => {
      if (insights) {
        setInsightReport(insights);
      }
    });

    const handleStorageChange = () => {
      try {
        const savedLogs = localStorage.getItem('nutriboard_waste_logs');
        if (savedLogs) setWasteLogs(JSON.parse(savedLogs));
        const savedInsights = localStorage.getItem('nutriboard_waste_insights');
        if (savedInsights) setInsightReport(JSON.parse(savedInsights));
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      unsubLogs();
      unsubInsights();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const saveLogs = (logs: WasteLogEntry[]) => {
    setWasteLogs(logs);
    try {
      localStorage.setItem('nutriboard_waste_logs', JSON.stringify(logs));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  const saveInsights = (insights: WasteInsightReport) => {
    setInsightReport(insights);
    saveWasteInsightToDb(insights);
    try {
      localStorage.setItem('nutriboard_waste_insights', JSON.stringify(insights));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  // Form state for new leftover log
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newMealTitle, setNewMealTitle] = useState<string>('Steamed Rice, Dal & Spinach Curry');
  const [newAgeTier, setNewAgeTier] = useState<AgeGroupTier>('classes-4-7');
  const [newPreparedKg, setNewPreparedKg] = useState<number>(85);
  const [newLeftoverKg, setNewLeftoverKg] = useState<number>(9.5);
  const [newNotes, setNewNotes] = useState<string>('');
  const [leftoverDishName, setLeftoverDishName] = useState<string>('Steamed Spinach Florets');
  const [leftoverDishReason, setLeftoverDishReason] = useState<string>('Kids picked out plain steamed leaves');

  // Trigger Gemini AI Waste Analysis
  const handleGenerateAiInsights = async () => {
    if (wasteLogs.length === 0) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/waste-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wasteLogs }),
      });
      const json = await response.json();
      if (json.success && json.data) {
        saveInsights(json.data);
      }
    } catch (err) {
      console.error('Waste AI error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddWasteLog = (e: React.FormEvent) => {
    e.preventDefault();
    const wastePercent = Number(((newLeftoverKg / newPreparedKg) * 100).toFixed(1));
    const newEntry: WasteLogEntry = {
      id: `waste-${Date.now()}`,
      date: newDate,
      mealTitle: newMealTitle,
      ageTier: newAgeTier,
      totalPreparedKg: Number(newPreparedKg),
      totalLeftoverKg: Number(newLeftoverKg),
      wastePercentage: wastePercent,
      costLossEstimate: Number((newLeftoverKg * 2.8).toFixed(1)),
      co2ImpactKg: Number((newLeftoverKg * 2.0).toFixed(1)),
      notes: newNotes,
      leftoverItems: [
        {
          id: `w-item-${Date.now()}`,
          name: leftoverDishName,
          preparedKg: Number((newPreparedKg * 0.25).toFixed(1)),
          estimatedKg: Number(newLeftoverKg),
          reasonDetected: leftoverDishReason,
          severity: wastePercent > 15 ? 'high' : wastePercent > 8 ? 'medium' : 'low',
        },
      ],
    };

    const updated = [newEntry, ...wasteLogs];
    saveLogs(updated);
    saveWasteLogToDb(newEntry);
    setShowLogModal(false);
  };

  // Compute aggregate stats
  const totalKgServed = wasteLogs.reduce((acc, l) => acc + l.totalPreparedKg, 0);
  const totalKgWasted = wasteLogs.reduce((acc, l) => acc + l.totalLeftoverKg, 0);
  const avgWastePercent = totalKgServed > 0 ? ((totalKgWasted / totalKgServed) * 100).toFixed(1) : '0.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="h-2 bg-emerald-500 w-full absolute top-0 left-0"></div>

        <div className="space-y-2 max-w-3xl pt-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Food Waste Tracker & AI Analytics
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Record cafeteria plate leftovers, analyze waste patterns by grade and dish texture, and let Gemini AI diagnose root causes to help the kitchen modify portions, seasonings, and menus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="open-log-modal-btn"
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Log Today's Leftovers</span>
          </button>

          <button
            id="run-waste-ai-btn"
            onClick={handleGenerateAiInsights}
            disabled={isAnalyzing}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Patterns...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>AI Waste Insights ⚡</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metric Cards (SDG 12 Impact) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Average Waste Rate</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{avgWastePercent}%</p>
          <p className="text-[11px] text-emerald-700 font-semibold">
            {wasteLogs.length > 0 ? 'Logged from student plates' : 'Awaiting daily logs'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Prepared Food</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{totalKgServed} kg</p>
          <p className="text-[11px] text-amber-800 font-semibold">
            {totalKgWasted.toFixed(1)} kg plate leftovers
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Water Conserved</span>
            <Droplet className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {insightReport ? `${(insightReport.sdg12ImpactMetrics.waterConservedLitres / 1000).toFixed(1)}k L` : `${(totalKgServed * 120 / 1000).toFixed(1)}k L`}
          </p>
          <p className="text-[11px] text-blue-700 font-semibold">Agricultural footprint saved</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Canteen Budget Saved</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {insightReport ? `₹${insightReport.sdg12ImpactMetrics.financialSavingsDollars}` : `₹${(totalKgWasted * 2.5).toFixed(0)}`}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold">Reinvested in fresh fruit</p>
        </div>
      </div>

      {/* Main Grid: AI Diagnoses & Actionable Fixes + Leftover Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: AI Root-Cause Diagnostic & Fixes (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Smart Board Challenge Callout */}
          {insightReport && (
            <div className="bg-amber-50/90 border border-amber-200 p-5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Active School Smart Board Challenge</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-amber-950 leading-relaxed">
                {insightReport.smartBoardStudentChallenge}
              </p>
            </div>
          )}

          {/* AI Root-Cause Cards */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                AI Root-Cause Diagnostics & Kitchen Fixes
              </h2>
              <span className="text-xs font-bold text-slate-400">Targeting High Scrap Foods</span>
            </div>

            {insightReport && insightReport.keyInsights.length > 0 ? (
              <div className="space-y-4">
                {insightReport.keyInsights.map((insight, idx) => (
                  <div
                    key={`insight-${idx}`}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm">{insight.dishName}</h3>
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                        {insight.wasteLevel}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
                        <span className="font-bold text-rose-800">🔍 Root Cause:</span> {insight.rootCause}
                      </div>

                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
                        <span className="font-bold text-emerald-800">✨ Actionable Kitchen Fix:</span> {insight.actionableFix}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span className="font-semibold text-slate-700">{insight.impactSummary}</span>
                      <span className="font-bold text-emerald-700">Save ~{insight.estimatedKgSavedPerWeek} kg/wk</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-sm text-slate-700">No waste insights generated yet</p>
                <p className="text-xs text-slate-500">Log today's cafeteria leftovers and click "AI Waste Insights" to diagnose root causes.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Historical Waste Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-slate-600" />
              Cafeteria Leftover Logs ({wasteLogs.length})
            </h2>
            <span className="text-xs text-slate-400 font-medium">Recent 7-Day Audit</span>
          </div>

          <div className="space-y-3">
            {wasteLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {log.date}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {log.ageTier === 'classes-1-3' ? 'Junior (1–3)' : log.ageTier === 'classes-4-7' ? 'Middle (4–7)' : 'Senior (8–10)'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      log.wastePercentage <= 10
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : log.wastePercentage <= 15
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {log.wastePercentage}% waste
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-900">{log.mealTitle}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Prepared: <strong className="text-slate-800">{log.totalPreparedKg} kg</strong></span>
                  <span>Leftover: <strong className="text-rose-700">{log.totalLeftoverKg} kg</strong></span>
                  <span>CO2: <strong className="text-slate-800">{log.co2ImpactKg} kg</strong></span>
                </div>

                {log.notes && (
                  <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-200">
                    {log.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Log Leftovers */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative overflow-hidden">
            <div className="h-1.5 bg-emerald-500 w-full absolute top-0 left-0"></div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 pt-1">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-emerald-600" />
                Log Daily Canteen Leftovers
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWasteLog} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Student Group</label>
                  <select
                    value={newAgeTier}
                    onChange={(e) => setNewAgeTier(e.target.value as AgeGroupTier)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50"
                  >
                    <option value="classes-1-3">Classes 1–3 (Junior)</option>
                    <option value="classes-4-7">Classes 4–7 (Middle)</option>
                    <option value="classes-8-10">Classes 8–10 (Senior)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Meal Title</label>
                <input
                  type="text"
                  required
                  value={newMealTitle}
                  onChange={(e) => setNewMealTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Prepared (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newPreparedKg}
                    onChange={(e) => setNewPreparedKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Leftover Scrap (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLeftoverKg}
                    onChange={(e) => setNewLeftoverKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <p className="font-bold text-slate-800">Item with Most Leftovers (Optional)</p>
                <input
                  type="text"
                  value={leftoverDishName}
                  onChange={(e) => setLeftoverDishName(e.target.value)}
                  placeholder="e.g. Steamed Carrots / White Rice"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white"
                />
                <input
                  type="text"
                  value={leftoverDishReason}
                  onChange={(e) => setLeftoverDishReason(e.target.value)}
                  placeholder="Observed reason (e.g. portion too big, bland seasoning)"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Staff Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Class 3 table left extra rice because of recess rush"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-slate-600 font-semibold hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Leftover Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
