import React from 'react';
import { 
  Utensils, 
  Tv, 
  CalendarCheck, 
  Trash2, 
  BarChart3, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Globe, 
  X,
  Smartphone,
  ChefHat,
  UserCheck,
  LogOut,
  Database,
  ShieldCheck
} from 'lucide-react';
import { AppView, AgeGroupTier } from '../types';

interface SidebarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  activeAgeTier: AgeGroupTier;
  onSelectAgeTier: (tier: AgeGroupTier) => void;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenLiveView?: () => void;
  schoolName?: string;
  schoolLogo?: string;
  loggedInStaff?: { id: string; name: string; username: string } | null;
  onOpenStaffLogin?: () => void;
  onStaffLogout?: () => void;
  onSwitchToParentPortal?: () => void;
  onClearActiveMeal?: () => void;
  onClearAllMeals?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  activeAgeTier,
  onSelectAgeTier,
  isVoiceActive,
  onToggleVoice,
  isOpenMobile,
  onCloseMobile,
  onOpenLiveView,
  schoolName = '',
  schoolLogo = '/logo.png',
  loggedInStaff = null,
  onOpenStaffLogin,
  onStaffLogout,
  onSwitchToParentPortal,
  onClearActiveMeal,
  onClearAllMeals,
}) => {
  const [isClearModalOpen, setIsClearModalOpen] = React.useState(false);
  const navItems = [
    {
      id: 'scanner' as AppView,
      name: 'Meal Scanner & AI Vision',
      shortLabel: 'Meal Scanner',
      desc: 'Canteen photo & AI food detection',
      icon: Utensils,
      color: 'emerald',
    },
    {
      id: 'smartboard' as AppView,
      name: 'Smart Board Broadcast Control',
      shortLabel: 'Broadcast Admin',
      desc: 'Controls for cafeteria live display screen',
      icon: Tv,
      color: 'indigo',
    },
    {
      id: 'menu-optimizer' as AppView,
      name: 'AI Menu Assistant',
      shortLabel: 'Menu Assistant',
      desc: 'Nutritional variety & recipe swaps',
      icon: CalendarCheck,
      color: 'amber',
    },
    {
      id: 'waste-tracker' as AppView,
      name: 'Food Waste Tracker',
      shortLabel: 'Waste Tracker',
      desc: 'Leftover logs & AI waste insights',
      icon: Trash2,
      color: 'rose',
    },
    {
      id: 'lunch-manager' as AppView,
      name: 'Lunch Orders & PINs',
      shortLabel: 'Lunch Orders',
      desc: 'Verify student PINs & track bookings',
      icon: ChefHat,
      color: 'sky',
    },
    {
      id: 'chatbot' as AppView,
      name: 'AI Nutritionist Assistant',
      shortLabel: 'AI Chatbot',
      desc: 'Ask AI questions about recipes & nutrition',
      icon: Sparkles,
      color: 'violet',
    },
  ];

  const handleNavClick = (view: AppView) => {
    onSelectView(view);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none">
      {/* App Branding */}
      <div className="p-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => handleNavClick('scanner')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img 
              src={schoolLogo || '/logo.png'} 
              alt={schoolName || 'School Emblem'} 
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
              className="w-10 h-10 rounded-xl object-contain shadow-md bg-white p-0.5 shrink-0 group-hover:scale-105 transition-transform" 
            />
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                NutriBoard <span className="text-emerald-400">AI</span>
              </h1>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider truncate max-w-[150px]" title={schoolName || 'Cafeteria Smart Hub'}>
                {schoolName || 'Cafeteria Smart Hub'}
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all relative ${
                isActive
                  ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <span className={`text-xs font-extrabold truncate block ${isActive ? 'text-white' : 'text-slate-200'}`}>
                  {item.name}
                </span>
                <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}

        {/* Audio Narration Toggle & Clear Menu Quick Action */}
        <div className="pt-4 mt-2 border-t border-slate-800 space-y-2">
          <button
            id="sidebar-voice-btn"
            onClick={onToggleVoice}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
              isVoiceActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {isVoiceActive ? (
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-[11px] font-bold">Smart Board Audio Voice</span>
            </div>
            <span className="text-[10px] font-bold uppercase">{isVoiceActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Clear Menu Button for Staff & Admin */}
          <button
            id="sidebar-clear-menu-btn"
            onClick={() => setIsClearModalOpen(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 hover:text-rose-200 text-xs transition-colors font-bold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clear Canteen Menu</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
              Clear
            </span>
          </button>
        </div>

        {/* Canteen Staff Section */}
        <div className="pt-3 mt-3 border-t border-slate-800 space-y-2">
          {loggedInStaff ? (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <p className="font-bold text-white truncate">{loggedInStaff.name}</p>
                  <p className="text-[10px] text-emerald-300 font-mono">@{loggedInStaff.username}</p>
                </div>
              </div>
              <button
                onClick={onStaffLogout}
                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 transition-colors cursor-pointer"
                title="Staff Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenStaffLogin}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-900/30 text-indigo-300 hover:text-indigo-200 text-xs transition-colors font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>Canteen Staff Login</span>
              </div>
              <span className="text-[9px] font-bold uppercase bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                Staff
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0 border-r border-slate-800 shadow-xl z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Clear Menu Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Clear Canteen Menu</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select how you would like to clear today's canteen menu settings. This action will update Cloud Firestore and cafeteria display boards in real-time.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => {
                  onClearActiveMeal?.();
                  setIsClearModalOpen(false);
                }}
                className="w-full text-left p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Clear Active Broadcast Tray Only
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Removes active meal from Smart Board live screen (/live) while keeping daily history logs intact.
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  onClearAllMeals?.();
                  setIsClearModalOpen(false);
                }}
                className="w-full text-left p-3.5 rounded-2xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/40 transition-all flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 shrink-0 mt-0.5">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-300 group-hover:text-rose-200 transition-colors">
                    Clear All Canteen Daily Menu Items
                  </h4>
                  <p className="text-[11px] text-rose-300/80 mt-0.5">
                    Wipes active meal broadcast AND removes all scanned/logged canteen meals for today from Cloud Firestore.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
