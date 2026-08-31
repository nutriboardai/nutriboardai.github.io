import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  School, 
  Users, 
  Tv, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  Sparkles,
  Database,
  ChefHat,
  Upload,
  Image as ImageIcon,
  UserCheck,
  RotateCcw,
  Clock,
  Loader2,
  Search,
  Download,
  Calendar,
  Key,
  Eye,
  EyeOff,
  UserCog
} from 'lucide-react';
import { MealAnalysisResult, WasteLogEntry, LunchBooking, BookingSettings, AdminCredentials } from '../types';
import { saveSchoolSettingsToDb, forceSyncAllToFirestore, wipeAllFirestoreData, subscribeStaffAccounts, saveStaffAccountToDb, deleteStaffAccountFromDb, subscribeLunchBookings, subscribeBookingSettings, saveBookingSettingsToDb, subscribeMeals, subscribeWasteLogs, subscribeAdminCredentials, saveAdminCredentialsToDb } from '../lib/firebase';

interface AdminConsoleProps {
  onExit: () => void;
  schoolName: string;
  onUpdateSchoolName: (name: string) => void;
  schoolLogo: string;
  onUpdateSchoolLogo: (logo: string) => void;
  onFactoryReset?: () => void;
  onClearActiveMeal?: () => void;
  onClearAllMeals?: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ 
  onExit, 
  schoolName, 
  onUpdateSchoolName, 
  schoolLogo, 
  onUpdateSchoolLogo,
  onFactoryReset,
  onClearActiveMeal,
  onClearAllMeals,
}) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('nutriboard_admin_auth') === 'true';
  });

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin account custom credentials state (Cloud Firestore synced)
  const [adminCreds, setAdminCreds] = useState<AdminCredentials>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_admin_creds');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { username: 'admin', password: 'admin123' };
  });

  // Admin credentials update form state
  const [currentAdminPassInput, setCurrentAdminPassInput] = useState('');
  const [newAdminUserInput, setNewAdminUserInput] = useState('');
  const [newAdminPassInput, setNewAdminPassInput] = useState('');
  const [confirmAdminPassInput, setConfirmAdminPassInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [credsError, setCredsError] = useState('');
  const [credsSuccess, setCredsSuccess] = useState('');

  // School branding state form
  const [schoolInput, setSchoolInput] = useState(schoolName);
  const [logoInput, setLogoInput] = useState(schoolLogo);
  const [brandingSavedToast, setBrandingSavedToast] = useState(false);

  // Factory reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState(false);
  const [cloudSyncToast, setCloudSyncToast] = useState(false);

  // Staff accounts state (Cloud Firestore)
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; username: string; password?: string; role: string; createdAt: number }>>([]);
  const [lunchBookings, setLunchBookings] = useState<LunchBooking[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({ cutoffTime: '09:00', isBookingAllowed: true, updatedAt: Date.now() });

  const [loggedInStaff, setLoggedInStaff] = useState<{ id: string; name: string; username: string } | null>(() => {
    try {
      const saved = localStorage.getItem('nutriboard_logged_in_staff');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('staff123');
  const [newStaffRole, setNewStaffRole] = useState('Canteen Operations Staff');
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');

  // Dashboard metrics
  const [activeMeal, setActiveMeal] = useState<MealAnalysisResult | null>(null);
  const [mealHistoryCount, setMealHistoryCount] = useState(0);
  const [wasteLogsCount, setWasteLogsCount] = useState(0);

  // Booking settings state form
  const [fromTimeInput, setFromTimeInput] = useState('06:00');
  const [toTimeInput, setToTimeInput] = useState('09:00');
  const [cutoffTimeInput, setCutoffTimeInput] = useState('09:00');
  const [isAllowedInput, setIsAllowedInput] = useState(true);
  const [lunchPriceInput, setLunchPriceInput] = useState('4.50');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Lunch orders log filtering state
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // 'all', 'booked', 'given', 'cancelled'
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (bookingSettings) {
      setFromTimeInput(bookingSettings.fromTime || '06:00');
      setToTimeInput(bookingSettings.toTime || bookingSettings.cutoffTime || '09:00');
      setCutoffTimeInput(bookingSettings.cutoffTime || bookingSettings.toTime || '09:00');
      setIsAllowedInput(bookingSettings.isBookingAllowed ?? true);
      setLunchPriceInput(String(bookingSettings.lunchPrice ?? '4.50'));
    }
  }, [bookingSettings]);

  useEffect(() => {
    const unsubscribeAdminCreds = subscribeAdminCredentials((creds) => {
      if (creds && creds.username && creds.password) {
        setAdminCreds(creds);
        try {
          localStorage.setItem('nutriboard_admin_creds', JSON.stringify(creds));
        } catch {}
      }
    });

    const unsubscribeStaff = subscribeStaffAccounts((list) => {
      if (list) {
        setStaffList(list);
      }
    });
    const unsubscribeBookings = subscribeLunchBookings((list) => {
      setLunchBookings(list);
    });
    const unsubscribeSettings = subscribeBookingSettings((settings) => {
      setBookingSettings(settings);
    });

    const unsubscribeMeals = subscribeMeals((meals) => {
      if (meals) {
        setMealHistoryCount(meals.length);
        const active = meals.find((m) => (m as any).isActive) || meals[0];
        if (active) {
          setActiveMeal(active);
        } else {
          setActiveMeal(null);
        }
      } else {
        setMealHistoryCount(0);
        setActiveMeal(null);
      }
    });

    const unsubscribeWaste = subscribeWasteLogs((logs) => {
      if (logs) {
        setWasteLogsCount(logs.length);
      } else {
        setWasteLogsCount(0);
      }
    });

    if (isAdminAuthenticated) {
      try {
        const staffSession = localStorage.getItem('nutriboard_logged_in_staff');
        if (staffSession) setLoggedInStaff(JSON.parse(staffSession));
      } catch {}
    }

    return () => {
      unsubscribeAdminCreds();
      unsubscribeStaff();
      unsubscribeBookings();
      unsubscribeSettings();
      unsubscribeMeals();
      unsubscribeWaste();
    };
  }, [isAdminAuthenticated]);

  // Reset page when filters change
  useEffect(() => {
    setOrdersPage(1);
  }, [selectedMonth, selectedStatus, orderSearchQuery]);

  // Extract all unique months from the actual lunchBookings list
  const uniqueMonths = (Array.from(
    new Set(lunchBookings.map((b) => b.bookingDate.substring(0, 7)))
  ) as string[]).sort((a, b) => b.localeCompare(a)); // Sort in reverse chronological order

  const formatMonthLabel = (yearMonthStr: string) => {
    if (!yearMonthStr || yearMonthStr === 'all') return 'All Months';
    const parts = yearMonthStr.split('-');
    if (parts.length !== 2) return yearMonthStr;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filter bookings based on selected month, status, and search query
  const filteredBookings = lunchBookings.filter((b) => {
    // 1. Month filter (bookingDate is e.g., "2026-08-22")
    if (selectedMonth !== 'all') {
      const bookingMonth = b.bookingDate.substring(0, 7); // "YYYY-MM"
      if (bookingMonth !== selectedMonth) return false;
    }

    // 2. Status filter
    if (selectedStatus !== 'all') {
      if (b.status !== selectedStatus) return false;
    }

    // 3. Search query
    if (orderSearchQuery.trim() !== '') {
      const query = orderSearchQuery.toLowerCase();
      const matchName = b.studentName.toLowerCase().includes(query);
      const matchId = b.studentId.toLowerCase().includes(query);
      const matchParent = b.parentName.toLowerCase().includes(query);
      const matchMeal = b.mealTitle.toLowerCase().includes(query);
      const matchGrade = b.grade.toLowerCase().includes(query);
      if (!matchName && !matchId && !matchParent && !matchMeal && !matchGrade) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (ordersPage - 1) * itemsPerPage,
    ordersPage * itemsPerPage
  );

  const handleExportCSV = () => {
    // construct headers
    const headers = ["Booking ID", "Booking Date", "Student ID", "Student Name", "Grade", "Parent Name", "Meal Title", "Price (INR)", "Pickup Pin", "Status", "Created At"];
    // construct rows
    const rows = filteredBookings.map(b => [
      b.id,
      b.bookingDate,
      b.studentId,
      `"${b.studentName.replace(/"/g, '""')}"`,
      b.grade,
      `"${b.parentName.replace(/"/g, '""')}"`,
      `"${b.mealTitle.replace(/"/g, '""')}"`,
      b.mealPrice,
      b.pickupPin,
      b.status,
      new Date(b.createdAt).toLocaleString()
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lunch_orders_${selectedMonth || 'all'}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const inputUser = usernameInput.trim().toLowerCase();
    const activeUser = (adminCreds.username || 'admin').trim().toLowerCase();
    const activePass = adminCreds.password || 'admin123';

    if (inputUser === activeUser && passwordInput === activePass) {
      sessionStorage.setItem('nutriboard_admin_auth', 'true');
      setIsAdminAuthenticated(true);
    } else {
      setLoginError('Invalid admin username or password.');
    }
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError('');
    setCredsSuccess('');

    const activePass = adminCreds.password || 'admin123';
    if (currentAdminPassInput !== activePass) {
      setCredsError('Current admin password does not match.');
      return;
    }

    const trimmedUser = newAdminUserInput.trim();
    if (!trimmedUser) {
      setCredsError('Please enter a valid new admin username.');
      return;
    }

    if (!newAdminPassInput || newAdminPassInput.length < 4) {
      setCredsError('New admin password must be at least 4 characters long.');
      return;
    }

    if (newAdminPassInput !== confirmAdminPassInput) {
      setCredsError('New password and password confirmation do not match.');
      return;
    }

    const updatedCreds: AdminCredentials = {
      username: trimmedUser,
      password: newAdminPassInput,
      updatedAt: Date.now(),
    };

    setAdminCreds(updatedCreds);
    try {
      localStorage.setItem('nutriboard_admin_creds', JSON.stringify(updatedCreds));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    await saveAdminCredentialsToDb(updatedCreds);

    setCurrentAdminPassInput('');
    setNewAdminUserInput('');
    setNewAdminPassInput('');
    setConfirmAdminPassInput('');
    setCredsSuccess('Admin credentials updated successfully! Changes saved to Cloud Firestore.');

    setTimeout(() => setCredsSuccess(''), 5000);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = schoolInput.trim();
    if (!trimmedName) return;

    onUpdateSchoolName(trimmedName);
    onUpdateSchoolLogo(logoInput);
    saveSchoolSettingsToDb(trimmedName, logoInput);

    try {
      localStorage.setItem('nutriboard_school_name', trimmedName);
      localStorage.setItem('nutriboard_school_logo', logoInput);
      window.dispatchEvent(new Event('storage'));
    } catch {}

    setBrandingSavedToast(true);
    setTimeout(() => setBrandingSavedToast(false), 3000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const price = Number(parseFloat(lunchPriceInput).toFixed(2));
      const newSettings: BookingSettings = {
        fromTime: fromTimeInput || '06:00',
        toTime: toTimeInput || '09:00',
        cutoffTime: toTimeInput || '09:00',
        isBookingAllowed: isAllowedInput,
        lunchPrice: isNaN(price) || price < 0 ? 4.50 : price,
        updatedAt: Date.now(),
      };
      await saveBookingSettingsToDb(newSettings);
      setSettingsSavedToast(true);
      setTimeout(() => setSettingsSavedToast(false), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setLogoInput(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');

    const name = newStaffName.trim();
    let uname = newStaffUsername.trim().toLowerCase();
    const pwd = newStaffPassword.trim();

    if (!name || !uname) {
      setStaffError('Please provide both full name and a staff username.');
      return;
    }

    if (!pwd) {
      setStaffError('Please assign a login password for the staff member.');
      return;
    }

    if (!uname.startsWith('staff_') && !uname.startsWith('canteen_')) {
      uname = `staff_${uname}`;
    }

    if (staffList.some((s) => s.username.toLowerCase() === uname)) {
      setStaffError(`Username "${uname}" already exists. Please choose a unique staff username.`);
      return;
    }

    const newStaff = {
      id: `staff_${Date.now()}`,
      name,
      username: uname,
      password: pwd,
      role: newStaffRole.trim() || 'Canteen Staff',
      createdAt: Date.now()
    };

    await saveStaffAccountToDb(newStaff);
    const updatedList = [newStaff, ...staffList];
    setStaffList(updatedList);

    setNewStaffName('');
    setNewStaffUsername('');
    setNewStaffPassword('staff123');
    setStaffSuccess(`Successfully created staff account for ${name} (@${uname}) and saved to Cloud Firestore.`);
  };

  const handleDeleteStaff = async (id: string) => {
    await deleteStaffAccountFromDb(id);
    const updatedList = staffList.filter((s) => s.id !== id);
    setStaffList(updatedList);
  };

  const handlePerformFactoryReset = async () => {
    setIsResetting(true);
    try {
      try {
        localStorage.removeItem('nutriboard_active_meal');
        localStorage.removeItem('nutriboard_meal_history');
        localStorage.removeItem('nutriboard_waste_logs');
        localStorage.removeItem('nutriboard_waste_insights');
        localStorage.removeItem('nutriboard_logged_in_staff');
        localStorage.removeItem('nutriboard_school_name');
        localStorage.removeItem('nutriboard_school_logo');
        window.dispatchEvent(new Event('storage'));
      } catch {}

      if (onFactoryReset) {
        await onFactoryReset();
      } else {
        await wipeAllFirestoreData();
      }

      // Reset local view state to blank
      setStaffList([]);
      setLoggedInStaff(null);
      setActiveMeal(null);
      setMealHistoryCount(0);
      setWasteLogsCount(0);
      setSchoolInput('');
      setLogoInput('');
      onUpdateSchoolName('');
      onUpdateSchoolLogo('');
      setResetSuccessToast(true);
      setTimeout(() => setResetSuccessToast(false), 4000);
    } catch (error) {
      console.error("Database factory reset encountered an error:", error);
    } finally {
      setIsResetting(false);
      setShowResetModal(false);
    }
  };

  const handleSyncToFirestore = async () => {
    setIsSyncingToCloud(true);
    try {
      let currentMeals: MealAnalysisResult[] = [];
      let currentWasteLogs: WasteLogEntry[] = [];
      try {
        const savedMeals = localStorage.getItem('nutriboard_meal_history');
        if (savedMeals) currentMeals = JSON.parse(savedMeals);
        const savedWaste = localStorage.getItem('nutriboard_waste_logs');
        if (savedWaste) currentWasteLogs = JSON.parse(savedWaste);
      } catch {}

      await forceSyncAllToFirestore(currentMeals, currentWasteLogs, staffList, schoolName, schoolLogo);
      setCloudSyncToast(true);
      setTimeout(() => setCloudSyncToast(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingToCloud(false);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">System Admin Console</h1>
              <p className="text-xs text-slate-400">NutriBoard AI Management Portal</p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Admin Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter admin username"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Admin Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Login To Admin Panel</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-slate-950 shadow-lg font-black text-xl shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">System Admin Console</h1>
                <span className="text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  Authenticated Console
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Global school branding, logo upload, dashboard overview, and canteen staff manager.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sessionStorage.removeItem('nutriboard_admin_auth');
                setIsAdminAuthenticated(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Admin Logout
            </button>
          </div>
        </div>

        {/* Global School Branding & Logo Upload Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Global School Branding & Logo</h2>
              <p className="text-xs text-slate-400">Configure school name and upload school emblem to display across all portals</p>
            </div>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  School Name (Main Heading)
                </label>
                <input
                  type="text"
                  value={schoolInput}
                  onChange={(e) => setSchoolInput(e.target.value)}
                  placeholder="Enter school name..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400">Appears as the primary heading with subtitle "Powered By NutriBoard AI".</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  School Logo / Emblem URL or Upload
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logoInput}
                    onChange={(e) => setLogoInput(e.target.value)}
                    placeholder="https://... or upload image"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <label className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl cursor-pointer flex items-center gap-1.5 shrink-0 border border-slate-700 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                    <input type="file" onChange={handleLogoFileChange} accept="image/*" className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Logo Preview */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-700 flex items-center justify-center shrink-0">
                <img src={logoInput || '/logo.png'} alt="School Logo Preview" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Active School Logo Preview</p>
                <p className="text-[11px] text-slate-400">This emblem will replace the default logo across the sidebar, mobile header, and smart board displays.</p>
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-md transition-all flex items-center gap-2 text-xs shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Save Branding & Logo</span>
              </button>
            </div>
          </form>

          {brandingSavedToast && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>School branding and logo updated successfully across all portals!</span>
            </div>
          )}
        </div>

        {/* Overview Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active Staff Session</span>
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-white truncate">
              {loggedInStaff ? loggedInStaff.name : 'No Staff Logged In'}
            </div>
            <p className="text-[11px] text-slate-400">
              {loggedInStaff ? `@${loggedInStaff.username}` : 'Waiting for staff portal login'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Canteen Staff Accounts</span>
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-black text-white">{staffList.length}</div>
            <p className="text-[11px] text-slate-400">Created staff usernames</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active Broadcast</span>
              <Tv className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-white truncate">
              {activeMeal ? activeMeal.title : 'No Meal Live'}
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold">Broadcasting to Smart Board</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Meal History Logs</span>
              <Database className="w-5 h-5 text-sky-400" />
            </div>
            <div className="text-3xl font-black text-white">{mealHistoryCount}</div>
            <p className="text-[11px] text-slate-400">Scanned canteen meals</p>
          </div>
        </div>

        {/* Google Cloud Firestore Real-time Database Status Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Google Cloud Firestore Database</h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Connected
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Database ID: ai-studio-nutriboardai-68dc8c73-fd74-41e5-be65-5e8a4da1dd50
                </p>
              </div>
            </div>
            
            <button
              onClick={handleSyncToFirestore}
              disabled={isSyncingToCloud}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <RotateCcw className={`w-4 h-4 ${isSyncingToCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingToCloud ? 'Syncing to Cloud...' : 'Force Sync All to Cloud Firestore'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Meals Collection</span>
              <p className="text-sm font-bold text-white mt-0.5">{mealHistoryCount} records</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Waste Logs</span>
              <p className="text-sm font-bold text-white mt-0.5">{wasteLogsCount} entries</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Live Broadcast Doc</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">broadcast/config (Active)</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">School Branding</span>
              <p className="text-sm font-bold text-indigo-300 mt-0.5">settings/school (Synced)</p>
            </div>
          </div>

          {cloudSyncToast && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All meals, cafeteria waste records, broadcast configuration, and school settings are synced into Cloud Firestore!</span>
            </div>
          )}
        </div>

        {/* Admin Account & Security Credentials Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <UserCog className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Admin Account & Security Credentials</span>
                  <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Active: @{adminCreds.username || 'admin'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Update your system administrator username and password. Changes persist across sessions in Cloud Firestore.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateAdminCredentials} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Change Admin Credentials Form</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Current Admin Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentAdminPassInput}
                    onChange={(e) => setCurrentAdminPassInput(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">New Admin Username</label>
                <input
                  type="text"
                  value={newAdminUserInput}
                  onChange={(e) => setNewAdminUserInput(e.target.value)}
                  placeholder={`Current: ${adminCreds.username || 'admin'}`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">New Admin Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newAdminPassInput}
                    onChange={(e) => setNewAdminPassInput(e.target.value)}
                    placeholder="Enter new admin password..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Confirm New Admin Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmAdminPassInput}
                    onChange={(e) => setConfirmAdminPassInput(e.target.value)}
                    placeholder="Confirm new admin password..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {credsError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{credsError}</span>
              </div>
            )}

            {credsSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{credsSuccess}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>Update Admin Credentials</span>
              </button>
            </div>
          </form>
        </div>

        {/* Canteen Staff Account Management */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Canteen Staff Account Management</h2>
                <p className="text-xs text-slate-400">Only the admin can create login usernames for canteen staff members</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
              {staffList.length} Staff Accounts Active
            </span>
          </div>

          {/* Create Staff Form */}
          <form onSubmit={handleCreateStaff} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Create New Canteen Staff Account</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Staff Full Name</label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. John Miller"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Assigned Username</label>
                <input
                  type="text"
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  placeholder="e.g. staff_john"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Staff Password</label>
                <input
                  type="text"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="e.g. staff123"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Staff Role / Designation</label>
                <input
                  type="text"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  placeholder="e.g. Canteen Operations Chef"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {staffError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{staffError}</span>
              </div>
            )}

            {staffSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{staffSuccess}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Staff Account</span>
              </button>
            </div>
          </form>

          {/* Staff Accounts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Login Username</th>
                  <th className="py-3 px-4">Login Password</th>
                  <th className="py-3 px-4">Role / Designation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      No canteen staff accounts created yet. Use the form above to create staff login credentials.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => {
                    const isCurrentActive = loggedInStaff?.username.toLowerCase() === staff.username.toLowerCase();
                    return (
                      <tr key={staff.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                            {staff.name.charAt(0)}
                          </div>
                          <span>{staff.name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400">@{staff.username}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                            {staff.password || 'staff123'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{staff.role}</td>
                        <td className="py-3.5 px-4">
                          {isCurrentActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Active Session
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Offline</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteStaff(staff.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/30"
                            title="Revoke and delete staff account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Booking Cutoff Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Configure Lunch Booking Hours & Availability</h3>
                <p className="text-xs text-slate-400">Set the daily opening (From Time) and closing (To Time / Cut-off) hours during which parents can book lunch.</p>
              </div>
            </div>
            {settingsSavedToast && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 animate-pulse">
                ✓ Settings Saved
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Booking Open From Time</label>
              <input
                type="time"
                value={fromTimeInput}
                onChange={(e) => setFromTimeInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Booking Cutoff / To Time</label>
              <input
                type="time"
                value={toTimeInput}
                onChange={(e) => {
                  setToTimeInput(e.target.value);
                  setCutoffTimeInput(e.target.value);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Allow Parent Bookings</label>
              <select
                value={isAllowedInput ? 'true' : 'false'}
                onChange={(e) => setIsAllowedInput(e.target.value === 'true')}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="true">Enabled (Parents Can Book)</option>
                <option value="false">Disabled (Closed by Admin)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lunch Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={lunchPriceInput}
                onChange={(e) => setLunchPriceInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                placeholder="4.50"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Save Booking Settings
              </button>
            </div>
          </form>
        </div>

        {/* Lunch Orders master log & CSV analytics section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Lunch Orders Master Log & Analytics</h3>
                <p className="text-xs text-slate-400">Track all parent lunch bookings, filter monthly, and export report files.</p>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={filteredBookings.length === 0}
              className="flex items-center justify-center gap-2 py-2.5 px-5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-800 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-sky-500/15 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export {filteredBookings.length} Orders to CSV</span>
            </button>
          </div>

          {/* Filtering Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Search query input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search by student, parent, meal, grade..."
                className="w-full bg-slate-800 border border-slate-700 pl-11 pr-4 py-2.5 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-medium transition-colors"
              />
            </div>

            {/* Monthly Filter Dropdown */}
            <div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 py-2.5 px-4 rounded-2xl text-xs text-white focus:outline-none focus:border-sky-500 font-bold transition-colors"
              >
                <option value="all">📅 All Months (No date limit)</option>
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>
                    📅 {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 py-2.5 px-4 rounded-2xl text-xs text-white focus:outline-none focus:border-sky-500 font-bold transition-colors"
              >
                <option value="all">🟢 All Statuses</option>
                <option value="booked">⏳ Booked (Pending Pickup)</option>
                <option value="given">✅ Given (Picked Up)</option>
                <option value="cancelled">❌ Cancelled</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-950/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Booking Date</th>
                    <th className="py-3 px-4">Student & Parent</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4">Meal & Price</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 text-slate-300">
                  {paginatedBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 px-4 text-center text-slate-500 text-xs font-semibold">
                        No lunch orders match the selected filters or search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-900/20 transition-colors text-xs">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                          {b.bookingDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-white">{b.studentName}</div>
                          <div className="text-[10px] text-slate-500">Parent: {b.parentName} (ID: {b.studentId})</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">
                          {b.grade}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-200">{b.mealTitle}</div>
                          <div className="text-[10px] text-emerald-400 font-extrabold">₹{b.mealPrice.toFixed(2)}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            b.status === 'given'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : b.status === 'booked'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {b.status === 'given' ? 'Picked Up' : b.status === 'booked' ? 'Pending' : 'Cancelled'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-semibold">
                Showing <span className="text-white font-bold">{(ordersPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="text-white font-bold">
                  {Math.min(ordersPage * itemsPerPage, filteredBookings.length)}
                </span>{' '}
                of <span className="text-sky-400 font-bold">{filteredBookings.length}</span> orders
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                  disabled={ordersPage === 1}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400 font-bold px-1">
                  {ordersPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOrdersPage((p) => Math.min(totalPages, p + 1))}
                  disabled={ordersPage === totalPages}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-700 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clear Daily Canteen Menu Management Section */}
        <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Clear Daily Canteen Menu</span>
                  <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Admin & Staff Feature
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Quickly clear today's active broadcasted meal or remove all daily menu entries from Cloud Firestore and Smart Board displays.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={onClearActiveMeal}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Clear Active Broadcast Tray</span>
              </button>

              <button
                onClick={onClearAllMeals}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-200 font-bold text-xs rounded-xl border border-rose-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Clear All Daily Menu Items</span>
              </button>
            </div>
          </div>
        </div>

        {/* Factory Reset Database & Danger Zone Section */}
        <div className="bg-slate-900 border border-rose-950/60 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Factory Reset Database</span>
                  <span className="text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                    Danger Zone
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Permanently wipe all scanned canteen meals, active broadcasts, food waste records, staff accounts, and custom branding from local storage.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Factory Reset Database</span>
            </button>
          </div>

          {resetSuccessToast && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Database factory reset completed. All records and canteen data have been wiped.</span>
            </div>
          )}
        </div>

      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Confirm Factory Reset?</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Are you sure you want to perform a complete factory reset? This action will permanently erase:
              </p>
              <ul className="text-xs text-slate-300 mt-2 space-y-1 list-disc list-inside">
                <li>All daily meal scanner logs & nutrition data</li>
                <li>Live Smart Board display broadcast states</li>
                <li>Food waste tracker weight logs & AI analytics</li>
                <li>All custom canteen staff login accounts</li>
                <li>Custom school branding and uploaded emblems</li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handlePerformFactoryReset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:opacity-75 disabled:cursor-not-allowed text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isResetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isResetting ? 'Wiping Database...' : 'Wipe & Reset Everything'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
