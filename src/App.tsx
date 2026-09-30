import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MealScanner } from './components/MealScanner';
import { SmartBoardAdminControl } from './components/SmartBoardAdminControl';
import { SmartBoardLiveDisplay } from './components/SmartBoardLiveDisplay';
import { MenuOptimizer } from './components/MenuOptimizer';
import { WasteTracker } from './components/WasteTracker';
import { StaffChatbot } from './components/StaffChatbot';
import { AdminConsole } from './components/AdminConsole';
import { StaffLoginModal } from './components/StaffLoginModal';
import { StaffLoginPage } from './components/StaffLoginPage';
import { StaffLunchManager } from './components/StaffLunchManager';
import { AppView, AgeGroupTier, MealAnalysisResult, BroadcastConfig, ParentAccount, LunchBooking, BookingSettings } from './types';
import { CheckCircle, Menu, Tv, Cloud, CloudCheck, ShieldCheck } from 'lucide-react';
import { 
  subscribeMeals, 
  subscribeActiveMeal,
  saveMealToDb, 
  subscribeBroadcastConfig, 
  saveBroadcastConfigToDb, 
  subscribeSchoolSettings, 
  saveSchoolSettingsToDb,
  deleteMealFromDb,
  clearActiveMealFromDb,
  clearAllMealsFromDb,
  wipeAllFirestoreData,
  subscribeParentAccounts,
  subscribeLunchBookings,
  subscribeBookingSettings
} from './lib/firebase';
import { ParentAuthModal } from './components/ParentAuthModal';
import { ParentPortal } from './components/ParentPortal';

export default function App() {
  const [isLiveMode, setIsLiveMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.pathname === '/live' ||
        window.location.pathname.startsWith('/live') ||
        window.location.hash === '#live'
      );
    }
    return false;
  });

  const [isAdminConsoleMode, setIsAdminConsoleMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.pathname === '/console' ||
        window.location.pathname.startsWith('/console') ||
        window.location.hash === '#console'
      );
    }
    return false;
  });

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

  const [loggedInStaff, setLoggedInStaff] = useState<{ id: string; name: string; username: string } | null>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_logged_in_staff');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [currentPortal, setCurrentPortal] = useState<'parent' | 'staff'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/staff' || path.startsWith('/staff') || hash === '#staff') {
        return 'staff';
      }
    }
    return 'parent';
  });
  const [loggedInParent, setLoggedInParent] = useState<ParentAccount | null>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_logged_in_parent');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [lunchBookings, setLunchBookings] = useState<LunchBooking[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({ cutoffTime: '09:00', isBookingAllowed: true, updatedAt: Date.now() });

  useEffect(() => {
    if (loggedInParent) {
      try {
        localStorage.setItem('nutriboard_logged_in_parent', JSON.stringify(loggedInParent));
      } catch {}
    } else {
      localStorage.removeItem('nutriboard_logged_in_parent');
    }
  }, [loggedInParent]);

  const [isStaffLoginModalOpen, setIsStaffLoginModalOpen] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<AppView>('scanner');
  const [activeAgeTier, setActiveAgeTier] = useState<AgeGroupTier>('classes-4-7');
  const [currentMeal, setCurrentMeal] = useState<MealAnalysisResult | null>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_active_meal');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [mealHistory, setMealHistory] = useState<MealAnalysisResult[]>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_meal_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Factory reset everything (Cloud Firestore + LocalStorage + State)
  const handleFactoryReset = async () => {
    try {
      localStorage.removeItem('nutriboard_active_meal');
      localStorage.removeItem('nutriboard_meal_history');
      localStorage.removeItem('nutriboard_waste_logs');
      localStorage.removeItem('nutriboard_waste_insights');
      localStorage.removeItem('nutriboard_staff_accounts');
      localStorage.removeItem('nutriboard_logged_in_staff');
      localStorage.removeItem('nutriboard_logged_in_parent');
      localStorage.removeItem('nutriboard_school_name');
      localStorage.removeItem('nutriboard_school_logo');
      setLoggedInStaff(null);
      setLoggedInParent(null);
      setSchoolName('');
      setSchoolLogo('');
      window.dispatchEvent(new Event('storage'));
    } catch {}
    setCurrentMeal(null);
    setMealHistory([]);
    
    // Wipe Cloud Firestore DB
    await wipeAllFirestoreData();
    showToast('🔄 Database factory reset completed. Cloud Firestore and local data wiped.');
  };

  // Real-time sync with Firebase Cloud Firestore
  useEffect(() => {
    // 1. Subscribe to Active Meal
    const unsubscribeActiveMeal = subscribeActiveMeal((activeMeal) => {
      if (activeMeal) {
        setCurrentMeal(activeMeal);
      }
    });

    // 2. Subscribe to Meals History
    const unsubscribeMeals = subscribeMeals((meals) => {
      if (meals) {
        setMealHistory(meals);
        const active = meals.find((m) => (m as any).isActive);
        if (active) {
          setCurrentMeal(active);
        } else if (meals.length === 0) {
          setCurrentMeal(null);
        }
      }
    });

    // 3. Subscribe to Broadcast Configuration
    const unsubscribeBroadcast = subscribeBroadcastConfig((config) => {
      if (config) {
        if (config.activeAgeTier) setActiveAgeTier(config.activeAgeTier);
        if (config.isVoiceActive !== undefined) setIsVoiceActive(config.isVoiceActive);
      }
    });

    // 4. Subscribe to School Settings
    const unsubscribeSettings = subscribeSchoolSettings((settings) => {
      if (settings) {
        if (settings.schoolName) setSchoolName(settings.schoolName);
        if (settings.schoolLogo) setSchoolLogo(settings.schoolLogo);
      }
    });

    // 5. Subscribe to Parent Accounts
    const unsubscribeParents = subscribeParentAccounts((list) => {
      setParentAccounts(list);
    });

    // 6. Subscribe to Lunch Bookings
    const unsubscribeBookings = subscribeLunchBookings((list) => {
      setLunchBookings(list);
    });

    // 7. Subscribe to Booking Settings
    const unsubscribeBookingSettings = subscribeBookingSettings((settings) => {
      setBookingSettings(settings);
    });

    return () => {
      unsubscribeActiveMeal();
      unsubscribeMeals();
      unsubscribeBroadcast();
      unsubscribeSettings();
      unsubscribeParents();
      unsubscribeBookings();
      unsubscribeBookingSettings();
    };
  }, []);

  // Sync loggedInParent in real-time when parentAccounts list is updated from Firestore
  useEffect(() => {
    if (loggedInParent && parentAccounts.length > 0) {
      const matchingParent = parentAccounts.find((p) => p.id === loggedInParent.id);
      if (matchingParent) {
        if (JSON.stringify(matchingParent) !== JSON.stringify(loggedInParent)) {
          setLoggedInParent(matchingParent);
          try {
            localStorage.setItem('nutriboard_logged_in_parent', JSON.stringify(matchingParent));
          } catch {}
        }
      }
    }
  }, [parentAccounts, loggedInParent]);

  // Sync route changes (/live or /console) and local storage updates
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const isLive = path === '/live' || path.startsWith('/live') || hash === '#live';
      const isAdmin = path === '/console' || path.startsWith('/console') || hash === '#console';
      setIsLiveMode(isLive);
      setIsAdminConsoleMode(isAdmin);

      const isStaffPath = path === '/staff' || path.startsWith('/staff') || hash === '#staff';
      if (isStaffPath) {
        setCurrentPortal('staff');
      } else if (path === '/' || hash === '') {
        setCurrentPortal('parent');
      }
    };

    const handleStorageChange = () => {
      try {
        const savedName = localStorage.getItem('nutriboard_school_name');
        if (savedName) setSchoolName(savedName);

        const savedLogo = localStorage.getItem('nutriboard_school_logo');
        if (savedLogo) setSchoolLogo(savedLogo);

        const savedStaff = localStorage.getItem('nutriboard_logged_in_staff');
        if (savedStaff) {
          setLoggedInStaff(JSON.parse(savedStaff));
        } else {
          setLoggedInStaff(null);
        }
      } catch {}
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('storage', handleStorageChange);

    // Run once on load to initialize route configuration correctly
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleEnterLive = () => {
    window.history.pushState({}, '', '/live');
    setIsLiveMode(true);
    setIsAdminConsoleMode(false);
  };

  const handleExitLive = () => {
    window.history.pushState({}, '', '/');
    setIsLiveMode(false);
  };

  const handleSwitchToParent = () => {
    window.history.pushState({}, '', '/');
    setCurrentPortal('parent');
  };

  const handleEnterAdminConsole = () => {
    window.history.pushState({}, '', '/console');
    setIsAdminConsoleMode(true);
    setIsLiveMode(false);
  };

  const handleExitAdminConsole = () => {
    window.history.pushState({}, '', '/');
    setIsAdminConsoleMode(false);
  };

  const handleStaffLoginSuccess = (staff: { id: string; name: string; username: string }) => {
    setLoggedInStaff(staff);
    window.history.pushState({}, '', '/staff');
    setCurrentPortal('staff');
    try {
      localStorage.setItem('nutriboard_logged_in_staff', JSON.stringify(staff));
    } catch {}
    showToast(`👨‍🍳 Welcome back, ${staff.name} (Canteen Staff)`);
  };

  const handleStaffLogout = () => {
    setLoggedInStaff(null);
    window.history.pushState({}, '', '/staff');
    setCurrentPortal('staff');
    try {
      localStorage.removeItem('nutriboard_logged_in_staff');
    } catch {}
    showToast('👋 Logged out of Canteen Staff portal.');
  };

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleUpdateMeal = async (updated: MealAnalysisResult) => {
    setCurrentMeal(updated);
    await saveMealToDb(updated, true);
    try {
      localStorage.setItem('nutriboard_active_meal', JSON.stringify(updated));
    } catch {}
  };

  const handleCastToSmartBoard = async (mealToCast: MealAnalysisResult) => {
    setCurrentMeal(mealToCast);
    await saveMealToDb(mealToCast, true);
    await saveBroadcastConfigToDb({
      activeMealId: mealToCast.id,
      activeAgeTier,
      autoRotateAgeTiers: false,
      announcementTicker: `School Nutrition Notice: Fresh ${mealToCast.title} is being served today!`,
      isVoiceActive,
      lastUpdated: Date.now()
    });
    try {
      localStorage.setItem('nutriboard_active_meal', JSON.stringify(mealToCast));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    setCurrentView('smartboard');
    showToast('📺 Meal broadcasted live to Cloud Firestore & Smart Board Screen (/live)!');
  };

  const handleSaveMealToHistory = async (mealToSave: MealAnalysisResult) => {
    await saveMealToDb(mealToSave, false);
    setMealHistory((prev) => {
      const existingIdx = prev.findIndex((m) => m.id === mealToSave.id);
      let updated: MealAnalysisResult[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = mealToSave;
      } else {
        updated = [mealToSave, ...prev];
      }
      try {
        localStorage.setItem('nutriboard_meal_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('💾 Saved to Cloud Firestore Daily Canteen Nutrition Log!');
  };

  const handleSelectMealFromHistory = async (selected: MealAnalysisResult) => {
    setCurrentMeal(selected);
    await saveMealToDb(selected, true);
    await saveBroadcastConfigToDb({
      activeMealId: selected.id,
      activeAgeTier,
      autoRotateAgeTiers: false,
      announcementTicker: `School Nutrition Notice: Fresh ${selected.title} is active on the cafeteria board!`,
      isVoiceActive,
      lastUpdated: Date.now()
    });
    try {
      localStorage.setItem('nutriboard_active_meal', JSON.stringify(selected));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    showToast(`📺 Broadcast updated in Firestore: "${selected.title}"`);
  };

  const handleClearActiveMeal = async () => {
    setCurrentMeal(null);
    try {
      localStorage.removeItem('nutriboard_active_meal');
      window.dispatchEvent(new Event('storage'));
    } catch {}
    await clearActiveMealFromDb();
    showToast('🧹 Active canteen meal menu cleared successfully.');
  };

  const handleClearAllMeals = async () => {
    setCurrentMeal(null);
    setMealHistory([]);
    try {
      localStorage.removeItem('nutriboard_active_meal');
      localStorage.removeItem('nutriboard_meal_history');
      window.dispatchEvent(new Event('storage'));
    } catch {}
    await clearAllMealsFromDb();
    showToast('🗑️ All daily canteen menu items cleared successfully.');
  };

  // 1. If user is at /live, render the dedicated Full-Screen SmartBoard Display Screen
  if (isLiveMode) {
    return <SmartBoardLiveDisplay />;
  }

  // 2. If user is at /console, render the Admin Console
  if (isAdminConsoleMode) {
    return (
      <AdminConsole
        onExit={handleExitAdminConsole}
        schoolName={schoolName}
        onUpdateSchoolName={(newName) => setSchoolName(newName)}
        schoolLogo={schoolLogo}
        onUpdateSchoolLogo={(newLogo) => setSchoolLogo(newLogo)}
        onFactoryReset={handleFactoryReset}
        onClearActiveMeal={handleClearActiveMeal}
        onClearAllMeals={handleClearAllMeals}
      />
    );
  }

  // 3. Root Portal: Parent Portal
  if (currentPortal === 'parent') {
    if (!loggedInParent) {
      return (
        <ParentAuthModal
          parentAccounts={parentAccounts}
          onLoginSuccess={(parent) => setLoggedInParent(parent)}
          schoolName={schoolName}
          schoolLogo={schoolLogo}
        />
      );
    }
    return (
      <ParentPortal
        parent={loggedInParent}
        onLogout={() => setLoggedInParent(null)}
        meals={mealHistory.length > 0 ? mealHistory : (currentMeal ? [currentMeal] : [])}
        bookings={lunchBookings}
        bookingSettings={bookingSettings}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        onUpdateParent={(parent) => {
          setLoggedInParent(parent);
          try {
            localStorage.setItem('nutriboard_logged_in_parent', JSON.stringify(parent));
          } catch {}
        }}
      />
    );
  }

  // 4. Staff Portal Login Gate if not authenticated
  if (!loggedInStaff) {
    return (
      <StaffLoginPage
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        onLoginSuccess={handleStaffLoginSuccess}
      />
    );
  }

  // 5. Otherwise render the Main Canteen Administrative App (Staff Portal Dashboard)
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col lg:flex-row font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-fade-in text-xs sm:text-sm font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Staff Login Modal */}
      <StaffLoginModal
        isOpen={isStaffLoginModalOpen}
        onClose={() => setIsStaffLoginModalOpen(false)}
        onLoginSuccess={handleStaffLoginSuccess}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        activeAgeTier={activeAgeTier}
        onSelectAgeTier={setActiveAgeTier}
        isVoiceActive={isVoiceActive}
        onToggleVoice={() => setIsVoiceActive(!isVoiceActive)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenLiveView={handleEnterLive}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        loggedInStaff={loggedInStaff}
        onOpenStaffLogin={() => setIsStaffLoginModalOpen(true)}
        onStaffLogout={handleStaffLogout}
        onSwitchToParentPortal={handleSwitchToParent}
        onClearActiveMeal={handleClearActiveMeal}
        onClearAllMeals={handleClearAllMeals}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              id="open-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <img 
                src={schoolLogo || '/logo.png'} 
                alt={schoolName} 
                className="w-8 h-8 rounded-lg object-contain bg-white shadow-xs p-0.5" 
              />
              <div>
                <h1 className="font-extrabold text-xs text-slate-900 leading-tight truncate max-w-[140px]" title={schoolName}>
                  {schoolName}
                </h1>
                <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">
                  Powered By NutriBoard AI
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEnterLive}
              className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 shadow-xs"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>/live</span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 pb-12">
          {currentView === 'scanner' && (
            <MealScanner
              currentMeal={currentMeal}
              onUpdateMeal={handleUpdateMeal}
              activeAgeTier={activeAgeTier}
              onSelectAgeTier={setActiveAgeTier}
              onCastToSmartBoard={handleCastToSmartBoard}
              onSaveMealToHistory={handleSaveMealToHistory}
              onClearActiveMeal={handleClearActiveMeal}
              onClearAllMeals={handleClearAllMeals}
            />
          )}

          {currentView === 'smartboard' && (
            <SmartBoardAdminControl
              currentMeal={currentMeal}
              mealHistory={mealHistory}
              onSelectMealForBroadcast={handleSelectMealFromHistory}
              activeAgeTier={activeAgeTier}
              onSelectAgeTier={setActiveAgeTier}
              isVoiceActive={isVoiceActive}
              onToggleVoice={() => setIsVoiceActive(!isVoiceActive)}
              onOpenLiveView={handleEnterLive}
              onClearActiveMeal={handleClearActiveMeal}
              onClearAllMeals={handleClearAllMeals}
            />
          )}

          {currentView === 'menu-optimizer' && <MenuOptimizer />}

          {currentView === 'waste-tracker' && <WasteTracker />}

          {currentView === 'chatbot' && <StaffChatbot activeAgeTier={activeAgeTier} />}

          {currentView === 'lunch-manager' && (
            <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
              <StaffLunchManager 
                bookings={lunchBookings} 
                bookingSettings={bookingSettings} 
                meals={mealHistory} 
                parentAccounts={parentAccounts} 
                onClearActiveMeal={handleClearActiveMeal}
                onClearAllMeals={handleClearAllMeals}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
