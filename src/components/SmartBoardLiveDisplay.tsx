import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Volume2, 
  Sparkles, 
  Rocket, 
  Zap, 
  Shield, 
  Brain, 
  Award, 
  Activity, 
  HeartPulse, 
  Flame, 
  ShieldCheck, 
  Cpu, 
  Maximize2, 
  Minimize2, 
  CheckCircle, 
  Globe, 
  Leaf, 
  RotateCcw,
  Clock,
  Radio,
  ArrowLeft,
  VolumeX,
  Heart
} from 'lucide-react';
import { MealAnalysisResult, AgeGroupTier, BroadcastConfig } from '../types';
import { subscribeBroadcastConfig, subscribeMeals, subscribeActiveMeal, subscribeSchoolSettings } from '../lib/firebase';

interface SmartBoardLiveDisplayProps {
  onExitLive?: () => void;
}

const DEFAULT_BROADCAST_CONFIG: BroadcastConfig = {
  activeMealId: '',
  activeAgeTier: 'classes-4-7',
  autoRotateAgeTiers: false,
  announcementTicker: 'School Nutrition Notice: Fuel your day with fresh healthy foods!',
  isVoiceActive: false,
  lastUpdated: Date.now(),
};

export const SmartBoardLiveDisplay: React.FC<SmartBoardLiveDisplayProps> = ({ onExitLive }) => {
  const [schoolName, setSchoolName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_school_name');
      if (saved) return saved;
    } catch {}
    return '';
  });

  const [schoolLogo, setSchoolLogo] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_school_logo');
      if (saved) return saved;
    } catch {}
    return '';
  });

  const [broadcastConfig, setBroadcastConfig] = useState<BroadcastConfig>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_broadcast_config');
      return saved ? JSON.parse(saved) : DEFAULT_BROADCAST_CONFIG;
    } catch {
      return DEFAULT_BROADCAST_CONFIG;
    }
  });

  const [activeMeal, setActiveMeal] = useState<MealAnalysisResult | null>(() => {
    try {
      const savedMeal = localStorage.getItem('nutriboard_active_meal');
      if (savedMeal) return JSON.parse(savedMeal);
    } catch {}
    return null;
  });

  const [currentTier, setCurrentTier] = useState<AgeGroupTier>(broadcastConfig.activeAgeTier);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [quizRevealed, setQuizRevealed] = useState(false);

  // Sync with Cloud Firestore & LocalStorage in Real-time
  useEffect(() => {
    const unsubActiveMeal = subscribeActiveMeal((meal) => {
      if (meal) {
        setActiveMeal(meal);
      }
    });

    const unsubBroadcast = subscribeBroadcastConfig((config) => {
      if (config) {
        setBroadcastConfig(config);
        if (!config.autoRotateAgeTiers) {
          setCurrentTier(config.activeAgeTier);
        }
      }
    });

    const unsubMeals = subscribeMeals((meals) => {
      if (meals && meals.length > 0) {
        const active = meals.find((m) => (m as any).isActive);
        if (active) {
          setActiveMeal(active);
        }
      }
    });

    const unsubSettings = subscribeSchoolSettings((settings) => {
      if (settings) {
        if (settings.schoolName) setSchoolName(settings.schoolName);
        if (settings.schoolLogo) setSchoolLogo(settings.schoolLogo);
      }
    });

    const handleStorageChange = () => {
      try {
        const savedConfig = localStorage.getItem('nutriboard_broadcast_config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setBroadcastConfig(parsed);
          if (!parsed.autoRotateAgeTiers) {
            setCurrentTier(parsed.activeAgeTier);
          }
        }
        const savedMeal = localStorage.getItem('nutriboard_active_meal');
        if (savedMeal) {
          setActiveMeal(JSON.parse(savedMeal));
        }
      } catch (e) {
        console.error('Failed to sync broadcast config in live view', e);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubActiveMeal();
      unsubBroadcast();
      unsubMeals();
      unsubSettings();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Update clock every minute
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(clockTimer);
  }, []);

  // Auto-rotate age tiers if enabled by admin
  useEffect(() => {
    if (!broadcastConfig.autoRotateAgeTiers) {
      setCurrentTier(broadcastConfig.activeAgeTier);
      return;
    }

    const tiers: AgeGroupTier[] = ['classes-1-3', 'classes-4-7', 'classes-8-10'];
    let idx = tiers.indexOf(currentTier);

    const timer = setInterval(() => {
      idx = (idx + 1) % tiers.length;
      setCurrentTier(tiers[idx]);
    }, 25000);

    return () => clearInterval(timer);
  }, [broadcastConfig.autoRotateAgeTiers, broadcastConfig.activeAgeTier, currentTier]);

  const activeExplanation = activeMeal
    ? activeMeal.ageTierExplanations[currentTier] || Object.values(activeMeal.ageTierExplanations)[0]
    : null;

  // Icon renderer for superpower badges
  const renderBadgeIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'rocket':
        return <Rocket className="w-8 h-8" />;
      case 'zap':
        return <Zap className="w-8 h-8" />;
      case 'shield':
        return <Shield className="w-8 h-8" />;
      case 'brain':
        return <Brain className="w-8 h-8" />;
      case 'activity':
        return <Activity className="w-8 h-8" />;
      case 'heartpulse':
        return <HeartPulse className="w-8 h-8" />;
      case 'award':
        return <Award className="w-8 h-8" />;
      case 'flame':
        return <Flame className="w-8 h-8" />;
      case 'cpu':
        return <Cpu className="w-8 h-8" />;
      case 'shieldcheck':
        return <ShieldCheck className="w-8 h-8" />;
      default:
        return <Sparkles className="w-8 h-8" />;
    }
  };

  // Web Speech API Voice Reader for cafeteria speakers
  const speakNutritionMessage = () => {
    if (!activeExplanation) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isSpeaking) {
        setIsSpeaking(false);
        return;
      }

      const scriptToRead = activeExplanation.speechScript || activeExplanation.simpleDescription;
      const utterance = new SpeechSynthesisUtterance(scriptToRead);
      utterance.rate = 0.95;
      utterance.pitch = currentTier === 'classes-1-3' ? 1.15 : 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Fullscreen toggle for projector / smart board
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top Header Bar: Clean Live Display Banner */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {onExitLive && (
            <button
              onClick={onExitLive}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold mr-1"
              title="Return to Admin Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
            </button>
          )}

          <img 
            src={schoolLogo || '/logo.png'} 
            alt={schoolName || 'School Emblem'} 
            className="w-10 h-10 rounded-2xl object-contain bg-white p-0.5 shadow-lg shadow-emerald-500/20 shrink-0" 
          />

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {schoolName || 'NutriBoard AI'}
              </h1>
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                CAFETERIA SMART BOARD
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Powered By NutriBoard AI • School Canteen Live Display
            </p>
          </div>
        </div>

        {/* Live Controls: Fullscreen */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-colors"
            title="Toggle Projector Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Big-Screen Showcase Canvas */}
      <main className="flex-1 my-4 space-y-6">
        {!activeMeal || !activeExplanation ? (
          /* Standby Display when no meal is broadcast yet */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center space-y-6 my-8">
            <div className="h-2 bg-emerald-500 w-full absolute top-0 left-0"></div>

            <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
              <Tv className="w-10 h-10 animate-pulse" />
            </div>

            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>CAFETERIA SMART BOARD • STANDBY</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                Today's Lunch Menu Loading
              </h2>
              <p className="text-base sm:text-xl font-medium text-slate-400 leading-relaxed">
                The school canteen is preparing today's fresh cooked meals. Tray nutrition, superpowers, and portion tips will broadcast here once scanned.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Hero Banner: Child-Friendly Nutrition Metaphor */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="h-1.5 bg-emerald-500 w-full absolute top-0 left-0"></div>

              <div className="space-y-1.5 max-w-4xl pt-0.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  <span>TODAY'S FUEL</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                  {activeExplanation.headline}
                </h2>

                <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed max-w-3xl">
                  {activeExplanation.simpleDescription}
                </p>
              </div>

              {/* Quick Health Scorecard Badge */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center shrink-0 w-full sm:w-auto shadow-inner">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nutrition Balance</p>
                <p className="text-2xl font-black text-white mt-0.5">
                  {activeMeal.nutrition.healthScore}
                  <span className="text-sm text-emerald-400 font-bold">/100</span>
                </p>
                <p className="text-[11px] font-semibold text-emerald-400">{activeMeal.nutrition.balanceRating}</p>
              </div>
            </div>

            {/* Central Display: Tray Visual (Left) & 4 Superpower Bento Cards (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Left Column: Labeled Meal Tray Visual & Portion Guide (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-md h-full">
                  {/* Circular Geometric Meal Display */}
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-6 border-emerald-500/20 bg-slate-950 flex items-center justify-center overflow-hidden shadow-xl relative group">
                    <img
                      src={activeMeal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
                      alt={activeMeal.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-60"></div>
                  </div>

                  <div className="mt-3 space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Today's Fresh Lunch Tray
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">{activeMeal.title}</h3>
                    <p className="text-[11px] text-slate-400">~{activeMeal.nutrition.totalCalories} kcal • {activeMeal.nutrition.energyDurationHours}</p>
                  </div>

                  {/* Portion Guidance */}
                  <div className="mt-3 w-full bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl text-left flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Canteen Portion Advice:
                      </p>
                      <p className="text-xs font-semibold text-emerald-100 leading-snug">
                        {activeExplanation.portionTip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: 4 Superpower Bento Cards (7 cols) */}
              <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                {/* 4 Superpower Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeExplanation.powerBadges.map((badge, idx) => {
                    const cardTheme = 
                      idx === 0 ? 'bg-amber-950/30 border-amber-500/30 text-amber-200' :
                      idx === 1 ? 'bg-blue-950/30 border-blue-500/30 text-blue-200' :
                      idx === 2 ? 'bg-purple-950/30 border-purple-500/30 text-purple-200' :
                      'bg-emerald-950/30 border-emerald-500/30 text-emerald-200';

                    const iconBg = 
                      idx === 0 ? 'bg-amber-500 text-slate-950' :
                      idx === 1 ? 'bg-blue-500 text-white' :
                      idx === 2 ? 'bg-purple-500 text-white' :
                      'bg-emerald-500 text-slate-950';

                    return (
                      <div
                        key={`live-badge-${idx}`}
                        className={`p-4 sm:p-5 rounded-3xl border transition-all hover:scale-[1.01] space-y-2.5 shadow-md ${cardTheme}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${iconBg}`}>
                            {renderBadgeIcon(badge.icon)}
                          </div>
                          <div>
                            <h4 className="font-black text-base sm:text-lg leading-tight text-white">{badge.title}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Superpower Fuel</span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm font-medium opacity-90 leading-relaxed">
                          {badge.subtitle}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
