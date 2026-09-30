import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  ExternalLink, 
  Volume2, 
  Sparkles, 
  Radio, 
  RefreshCw, 
  CheckCircle, 
  Copy, 
  Play, 
  Settings, 
  Flame, 
  Leaf, 
  ShieldCheck, 
  Clock,
  Layers,
  ChevronRight,
  Maximize2,
  Share2
} from 'lucide-react';
import { MealAnalysisResult, AgeGroupTier, BroadcastConfig } from '../types';
import { subscribeBroadcastConfig, saveBroadcastConfigToDb } from '../lib/firebase';

interface SmartBoardAdminControlProps {
  currentMeal: MealAnalysisResult | null;
  mealHistory: MealAnalysisResult[];
  onSelectMealForBroadcast: (meal: MealAnalysisResult) => void;
  activeAgeTier: AgeGroupTier;
  onSelectAgeTier: (tier: AgeGroupTier) => void;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  onOpenLiveView: () => void;
  onClearActiveMeal?: () => void;
  onClearAllMeals?: () => void;
}

const DEFAULT_BROADCAST_CONFIG: BroadcastConfig = {
  activeMealId: '',
  activeAgeTier: 'classes-4-7',
  autoRotateAgeTiers: false,
  announcementTicker: 'School Nutrition Notice: Fuel your day with fresh healthy foods!',
  isVoiceActive: false,
  lastUpdated: Date.now(),
};

export const SmartBoardAdminControl: React.FC<SmartBoardAdminControlProps> = ({
  currentMeal,
  mealHistory,
  onSelectMealForBroadcast,
  activeAgeTier,
  onSelectAgeTier,
  isVoiceActive,
  onToggleVoice,
  onOpenLiveView,
  onClearActiveMeal,
  onClearAllMeals,
}) => {
  const [broadcastConfig, setBroadcastConfig] = useState<BroadcastConfig>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_broadcast_config');
      return saved ? JSON.parse(saved) : DEFAULT_BROADCAST_CONFIG;
    } catch {
      return DEFAULT_BROADCAST_CONFIG;
    }
  });

  const [tickerInput, setTickerInput] = useState(broadcastConfig.announcementTicker);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Real-time sync with Cloud Firestore
  useEffect(() => {
    const unsubscribe = subscribeBroadcastConfig((config) => {
      if (config) {
        setBroadcastConfig(config);
        setTickerInput(config.announcementTicker);
      }
    });
    return unsubscribe;
  }, []);

  // Save changes to localStorage and Cloud Firestore whenever broadcastConfig or currentMeal changes
  const saveBroadcastState = (newConfig: Partial<BroadcastConfig>, newMeal?: MealAnalysisResult) => {
    const updated = { ...broadcastConfig, ...newConfig, lastUpdated: Date.now() };
    setBroadcastConfig(updated);
    try {
      localStorage.setItem('nutriboard_broadcast_config', JSON.stringify(updated));
      if (newMeal) {
        localStorage.setItem('nutriboard_active_meal', JSON.stringify(newMeal));
      }
      // Dispatch storage event for same-tab listener
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save broadcast config', e);
    }
    // Persist to Cloud Firestore database in real-time
    saveBroadcastConfigToDb(updated);
  };

  useEffect(() => {
    // Ensure initial sync
    try {
      if (currentMeal) {
        localStorage.setItem('nutriboard_active_meal', JSON.stringify(currentMeal));
      } else {
        localStorage.removeItem('nutriboard_active_meal');
      }
    } catch {}
  }, [currentMeal]);

  const handleUpdateTicker = () => {
    saveBroadcastState({ announcementTicker: tickerInput });
    setSavedNotification('Live announcement ticker updated on smart board!');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  const handlePresetTicker = (text: string) => {
    setTickerInput(text);
    saveBroadcastState({ announcementTicker: text });
    setSavedNotification('Live announcement ticker updated!');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  const handleAgeTierChange = (tier: AgeGroupTier) => {
    onSelectAgeTier(tier);
    saveBroadcastState({ activeAgeTier: tier });
  };

  const handleToggleAutoRotate = () => {
    const newVal = !broadcastConfig.autoRotateAgeTiers;
    saveBroadcastState({ autoRotateAgeTiers: newVal });
  };

  const handleSelectMeal = (meal: MealAnalysisResult) => {
    onSelectMealForBroadcast(meal);
    saveBroadcastState({ activeMealId: meal.id }, meal);
    setSavedNotification(`"${meal.title}" is now broadcasting on the smart board!`);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Copy live URL
  const handleCopyLiveLink = () => {
    const liveUrl = `${window.location.origin}/live`;
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Web Speech API Voice Reader
  const speakNutritionMessage = () => {
    if (!currentMeal) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isSpeaking) {
        setIsSpeaking(false);
        return;
      }

      const activeExp = currentMeal.ageTierExplanations[activeAgeTier] || Object.values(currentMeal.ageTierExplanations)[0];
      if (!activeExp) return;
      const scriptToRead = activeExp.speechScript || activeExp.simpleDescription;
      const utterance = new SpeechSynthesisUtterance(scriptToRead);
      utterance.rate = 0.95;
      utterance.pitch = activeAgeTier === 'classes-1-3' ? 1.15 : 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const activeExplanation = currentMeal
    ? currentMeal.ageTierExplanations[activeAgeTier] || Object.values(currentMeal.ageTierExplanations)[0]
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
      {/* Toast Notification */}
      {savedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-3 animate-fade-in text-xs sm:text-sm font-semibold">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{savedNotification}</span>
        </div>
      )}

      {/* Top Banner: Master Control Station & Quick Launch */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="h-2 bg-emerald-500 w-full absolute top-0 left-0"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-black px-3 py-1 rounded-full border border-emerald-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                SMART BOARD BROADCAST STATION • ON AIR
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">Projector Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cafeteria Smart Board Broadcast Control
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Manage the live feed displayed on cafeteria projectors and interactive screens. Students in Classes 1–10 view real-time nutrition, superpowers, and zero-waste challenges without requiring personal smartphones.
            </p>
          </div>

          {/* Action Launch Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Direct Launch /live Button */}
            <button
              id="launch-live-screen-btn"
              onClick={onOpenLiveView}
              className="flex-1 sm:flex-none py-3.5 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-95"
            >
              <Tv className="w-4 h-4" />
              <span>Launch /live Display Screen</span>
            </button>

            {/* Open /live in New Tab */}
            <a
              href="/live"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors"
              title="Open /live in a separate browser window or dedicated cafeteria projector"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </a>

            {/* Copy Link Button */}
            <button
              onClick={handleCopyLiveLink}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Copy /live direct display URL for projector"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Clear Active Menu Button */}
            <button
              id="smartboard-clear-menu-btn"
              onClick={onClearActiveMeal}
              className="py-3.5 px-4 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
              title="Clear current active broadcast menu"
            >
              <RefreshCw className="w-4 h-4 text-rose-400" />
              <span>Clear Active Menu</span>
            </button>
          </div>
        </div>

        {/* Live URL Link Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 max-w-full overflow-x-auto">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
            <span>Display Screen URL: </span>
            <span className="text-white font-bold">{window.location.origin}/live</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Last Sync: {new Date(broadcastConfig.lastUpdated).toLocaleTimeString()}</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">Synced via Live State</span>
          </div>
        </div>
      </div>

      {/* Main Admin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Broadcast Configuration & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Active Meal Broadcast Selector */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-slate-900">Current Meal on Broadcast</h2>
                  <p className="text-xs text-slate-500">Select which lunch tray is actively shown on the cafeteria screen</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active Feed
              </span>
            </div>

            {/* Currently Active Meal Card */}
            {currentMeal ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <img
                  src={currentMeal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'}
                  alt={currentMeal.title}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-300 shrink-0"
                />
                <div className="space-y-1 flex-1 text-center sm:text-left">
                  <h3 className="font-black text-sm text-slate-900">{currentMeal.title}</h3>
                  <p className="text-xs text-slate-500">
                    {currentMeal.nutrition.totalCalories} kcal • Health Score: <span className="font-bold text-emerald-600">{currentMeal.nutrition.healthScore}/100</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 justify-center sm:justify-start">
                    {currentMeal.detectedItems.map((item) => (
                      <span key={item.id} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <p className="text-xs font-bold text-slate-700">No meal is currently active on broadcast</p>
                <p className="text-[11px] text-slate-500">Scan or add a meal in the Meal Scanner to broadcast live nutrition to the Smart Board.</p>
              </div>
            )}

            {/* Quick Switch to other Meals */}
            {mealHistory.length > 0 && (
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Quick-Switch Broadcast to Scanned Meal:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mealHistory.map((m) => {
                    const isSelected = currentMeal && m.id === currentMeal.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMeal(m)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="truncate">
                          <p className="text-xs font-extrabold truncate">{m.title}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {m.nutrition.totalCalories} kcal • {m.detectedItems.length} items
                          </p>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 shrink-0">
                            ON AIR
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold shrink-0">Switch</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Audience Tier & Auto-Cycle Management */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-slate-900">Student Age-Tier & Tone Control</h2>
                  <p className="text-xs text-slate-500">Adapts language and superpowers on the smart board to student grade</p>
                </div>
              </div>
            </div>

            {/* 3 Tier Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleAgeTierChange('classes-1-3')}
                className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                  activeAgeTier === 'classes-1-3'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-400'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Classes 1–3</span>
                  <span className="text-[10px] font-bold bg-amber-200/60 text-amber-900 px-1.5 py-0.5 rounded">Junior</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Playful superhero fuel, rocket energy & fun analogies.
                </p>
              </button>

              <button
                onClick={() => handleAgeTierChange('classes-4-7')}
                className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                  activeAgeTier === 'classes-4-7'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-400'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Classes 4–7</span>
                  <span className="text-[10px] font-bold bg-blue-200/60 text-blue-900 px-1.5 py-0.5 rounded">Middle</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Sports stamina, growth acceleration & exam brain focus.
                </p>
              </button>

              <button
                onClick={() => handleAgeTierChange('classes-8-10')}
                className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                  activeAgeTier === 'classes-8-10'
                    ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-400'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Classes 8–10</span>
                  <span className="text-[10px] font-bold bg-purple-200/60 text-purple-900 px-1.5 py-0.5 rounded">Senior</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Metabolic endurance, macro balance & athletic recovery.
                </p>
              </button>
            </div>

            {/* Auto-Cycle Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Auto-Cycle Audience Tiers on Smart Board</p>
                <p className="text-[11px] text-slate-500">Automatically rotate between Junior, Middle, and Senior every 25 seconds</p>
              </div>
              <button
                onClick={handleToggleAutoRotate}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                  broadcastConfig.autoRotateAgeTiers
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {broadcastConfig.autoRotateAgeTiers ? 'Auto-Cycle ON' : 'Single Tier'}
              </button>
            </div>
          </div>

          {/* Section 3: Live Cafeteria Announcement Ticker */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-slate-900">Live Announcement Ticker</h2>
                  <p className="text-xs text-slate-500">Broadcast notices, zero-waste challenges, and fresh harvest alerts</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value)}
                  placeholder="Enter cafeteria announcement ticker..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleUpdateTicker}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shrink-0"
                >
                  Push to /live
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 self-center">Quick Notices:</span>
                <button
                  onClick={() => handlePresetTicker('🥦 Nutrition Challenge: Try every color on your plate today!')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors"
                >
                  Rainbow Plate Notice
                </button>
                <button
                  onClick={() => handlePresetTicker('🥗 Fresh Harvest: Organic Spinach from St. Peters School Garden!')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-medium transition-colors"
                >
                  Organic Harvest
                </button>
                <button
                  onClick={() => handlePresetTicker('💧 Stay Hydrated: Don’t forget to drink water after recess sports!')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 font-medium transition-colors"
                >
                  Hydration Reminder
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Cafeteria Audio Speech Broadcast */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-900">Cafeteria Audio Voice</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Broadcast spoken nutrition summary over cafeteria speakers for younger grades.
                </p>
              </div>

              <button
                onClick={speakNutritionMessage}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  isSpeaking
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isSpeaking ? 'Reading to Cafeteria...' : 'Test Audio Read-Aloud 🔊'}</span>
              </button>
            </div>

            {activeExplanation && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 italic">
                &ldquo;{activeExplanation.speechScript || activeExplanation.simpleDescription}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Scaled Projector Monitor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm text-white">Live Projector Preview (Mini Monitor)</h3>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE SYNC
              </span>
            </div>

            {/* Scaled Preview Frame */}
            <div className="rounded-2xl border-2 border-slate-700 bg-slate-950 p-4 space-y-3 shadow-inner relative overflow-hidden text-xs">
              {/* Header Preview */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-[9px] font-black text-slate-950">
                    N
                  </div>
                  <span className="font-extrabold text-[11px] text-white">NutriBoard LIVE</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  {activeAgeTier === 'classes-1-3' ? 'Classes 1–3' : activeAgeTier === 'classes-4-7' ? 'Classes 4–7' : 'Classes 8–10'}
                </span>
              </div>

              {/* Ticker Preview */}
              {broadcastConfig.announcementTicker && (
                <div className="bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded-lg text-[10px] text-emerald-200 truncate">
                  📢 {broadcastConfig.announcementTicker}
                </div>
              )}

              {/* Meal & Headline */}
              {activeExplanation && currentMeal ? (
                <>
                  <div className="space-y-1">
                    <p className="font-extrabold text-xs text-white leading-tight">
                      {activeExplanation.headline}
                    </p>
                    <p className="text-[10px] text-slate-300 line-clamp-2">
                      {activeExplanation.simpleDescription}
                    </p>
                  </div>

                  {/* Meal Photo & Bento Preview */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-2 flex flex-col items-center justify-center text-center">
                      <img
                        src={currentMeal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/40"
                      />
                      <p className="font-bold text-[10px] text-white mt-1 truncate max-w-[90px]">{currentMeal.title}</p>
                    </div>

                    <div className="space-y-1">
                      {activeExplanation.powerBadges.slice(0, 2).map((badge, i) => (
                        <div key={i} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px]">
                          <p className="font-bold text-white leading-none">{badge.title}</p>
                          <p className="text-[9px] text-slate-400 truncate mt-0.5">{badge.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-slate-400 space-y-1">
                  <p className="font-bold text-[11px] text-slate-300">Display Standby</p>
                  <p className="text-[10px] text-slate-500">Awaiting meal scan from canteen staff</p>
                </div>
              )}
            </div>

            {/* Big Launch Button */}
            <button
              onClick={onOpenLiveView}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Open Dedicated /live Display Screen</span>
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              Opens the distraction-free full-screen Smart Board page for projector display in the cafeteria.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
