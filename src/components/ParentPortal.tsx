import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  PlusCircle, 
  Calendar, 
  KeyRound, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  Utensils, 
  CheckCircle2, 
  AlertCircle, 
  IndianRupee, 
  Sparkles,
  GraduationCap,
  Bell
} from 'lucide-react';
import { ParentAccount, MealAnalysisResult, LunchBooking, BookingSettings, WalletTransaction, ParentNotification, TomorrowMenu } from '../types';
import { updateParentWalletInDb, saveLunchBookingToDb, subscribeWalletTransactions, subscribeParentNotifications, saveWalletTransactionToDb, saveParentNotificationToDb, updateParentNotificationReadInDb, subscribeTomorrowMenu } from '../lib/firebase';

interface ParentPortalProps {
  parent: ParentAccount;
  onLogout: () => void;
  meals: MealAnalysisResult[];
  bookings: LunchBooking[];
  bookingSettings: BookingSettings;
  schoolName?: string;
  schoolLogo?: string;
  onUpdateParent: (updated: ParentAccount) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  parent,
  onLogout,
  meals,
  bookings,
  bookingSettings,
  schoolName = 'NutriBoard Public School',
  schoolLogo = '/logo.png',
  onUpdateParent,
}) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'book' | 'history'>('book');
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('25');
  const [selectedMealForBooking, setSelectedMealForBooking] = useState<MealAnalysisResult | null>(null);
  const [bookingSuccessPin, setBookingSuccessPin] = useState<{ pin: string; mealTitle: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);
  const [allNotifications, setAllNotifications] = useState<ParentNotification[]>([]);
  const [tomorrowMenuState, setTomorrowMenuState] = useState<TomorrowMenu | null>(null);

  useEffect(() => {
    const unsubscribeTxs = subscribeWalletTransactions((txs) => {
      const filtered = txs.filter((t) => t.parentId === parent.id || t.studentId === parent.studentId);
      setAllTransactions(filtered);
    });

    const unsubscribeNotifs = subscribeParentNotifications((notifs) => {
      const filtered = notifs.filter((n) => n.parentId === parent.id);
      setAllNotifications(filtered);
    });

    const unsubscribeTomorrow = subscribeTomorrowMenu((menu) => {
      setTomorrowMenuState(menu);
    });

    return () => {
      unsubscribeTxs();
      unsubscribeNotifs();
      unsubscribeTomorrow();
    };
  }, [parent.id, parent.studentId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const parentBookings = bookings.filter((b) => b.parentId === parent.id || b.studentId === parent.studentId);

  // Time window checking function
  const checkBookingTimeWindow = (): { allowed: boolean; reason?: string } => {
    if (bookingSettings.isBookingAllowed === false) {
      return { allowed: false, reason: 'Lunch bookings are currently closed by the school administrator.' };
    }

    const now = new Date();
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();

    const parseTimeToMins = (timeStr?: string, defaultMins: number = 0) => {
      if (!timeStr) return defaultMins;
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return defaultMins;
      return h * 60 + m;
    };

    const fromMins = parseTimeToMins(bookingSettings.fromTime, 6 * 60); // default 06:00
    const toMins = parseTimeToMins(bookingSettings.toTime || bookingSettings.cutoffTime, 9 * 60); // default 09:00

    if (currentTotalMins < fromMins) {
      return {
        allowed: false,
        reason: `Lunch bookings open today at ${bookingSettings.fromTime || '06:00'} . Booking window is not open yet.`
      };
    }

    if (currentTotalMins > toMins) {
      return {
        allowed: false,
        reason: `Lunch bookings closed at ${bookingSettings.toTime || bookingSettings.cutoffTime || '09:00'} . The cut-off time has passed for today.`
      };
    }

    return { allowed: true };
  };

  const windowCheck = checkBookingTimeWindow();
  const isBookingBlocked = !windowCheck.allowed;

  const handleAddMoney = async (amount: number) => {
    try {
      const newBalance = Number((parent.walletBalance + amount).toFixed(2));
      const updatedParent = { ...parent, walletBalance: newBalance };
      await updateParentWalletInDb(parent.id, newBalance);
      onUpdateParent(updatedParent);

      // Save top-up transaction history
      const tx: WalletTransaction = {
        id: `tx-topup-${Date.now()}`,
        parentId: parent.id,
        studentId: parent.studentId,
        type: 'credit',
        amount: amount,
        description: `Wallet Top-up (Added Online)`,
        timestamp: Date.now()
      };
      await saveWalletTransactionToDb(tx);

      // Save top-up notification
      const notif: ParentNotification = {
        id: `notif-topup-${Date.now()}`,
        parentId: parent.id,
        title: 'Wallet Top-up Successful',
        message: `Successfully added ₹${amount.toFixed(2)} to your wallet. New balance is ₹${newBalance.toFixed(2)}.`,
        type: 'general',
        isRead: false,
        timestamp: Date.now()
      };
      await saveParentNotificationToDb(notif);

      setSuccessMsg(`Successfully added ₹${amount.toFixed(2)} to ${parent.studentName}'s lunch wallet!`);
      setIsAddMoneyOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to add money. Please try again.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleBookMeal = async (meal: MealAnalysisResult) => {
    setErrorMsg('');
    const timeCheck = checkBookingTimeWindow();
    if (!timeCheck.allowed) {
      setErrorMsg(timeCheck.reason || 'Lunch bookings are closed at this time.');
      return;
    }

    const mealPrice = bookingSettings.lunchPrice ?? 4.50; // standard school lunch price
    if (parent.walletBalance < mealPrice) {
      setErrorMsg(`Insufficient wallet balance (₹${parent.walletBalance.toFixed(2)}). Please top up your wallet to book this lunch.`);
      setActiveTab('wallet');
      return;
    }

    // Check if already booked for today (Only one lunch per student is allowed)
    const alreadyBookedToday = parentBookings.some(
      (b) => b.bookingDate === todayStr && b.status !== 'cancelled' && b.studentId === parent.studentId
    );
    if (alreadyBookedToday) {
      setErrorMsg(`${parent.studentName} already has an active or dispensed lunch booked for today. (Limit: 1 lunch per student per day).`);
      return;
    }

    try {
      // Deduct wallet balance
      const newBalance = Number((parent.walletBalance - mealPrice).toFixed(2));
      const updatedParent = { ...parent, walletBalance: newBalance };
      await updateParentWalletInDb(parent.id, newBalance);
      onUpdateParent(updatedParent);

      // Generate random 4-digit pickup PIN
      const randomPin = String(Math.floor(1000 + Math.random() * 9000));

      const newBooking: LunchBooking = {
        id: `booking_${Date.now()}`,
        parentId: parent.id,
        parentName: parent.name,
        studentId: parent.studentId,
        studentName: parent.studentName,
        grade: parent.grade,
        mealId: meal.id,
        mealTitle: meal.title,
        mealPrice,
        pickupPin: randomPin,
        bookingDate: todayStr,
        status: 'booked',
        createdAt: Date.now(),
      };

      await saveLunchBookingToDb(newBooking);

      // Save Booking transaction history
      const tx: WalletTransaction = {
        id: `tx-book-${Date.now()}`,
        parentId: parent.id,
        studentId: parent.studentId,
        type: 'debit',
        amount: mealPrice,
        description: `Pre-booked meal: ${meal.title}`,
        timestamp: Date.now()
      };
      await saveWalletTransactionToDb(tx);

      // Save Booking notification
      const notif: ParentNotification = {
        id: `notif-book-${Date.now()}`,
        parentId: parent.id,
        title: 'Lunch Pre-booked Successful',
        message: `Successfully pre-booked "${meal.title}" for ${parent.studentName}. ₹${mealPrice.toFixed(2)} was debited. Pickup PIN is ${randomPin}.`,
        type: 'booking_alert',
        isRead: false,
        timestamp: Date.now()
      };
      await saveParentNotificationToDb(notif);

      setBookingSuccessPin({ pin: randomPin, mealTitle: meal.title });
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to book lunch. Please try again.');
    }
  };

  const handleBookTomorrowMeal = async (menu: TomorrowMenu) => {
    setErrorMsg('');
    const timeCheck = checkBookingTimeWindow();
    if (!timeCheck.allowed) {
      setErrorMsg(timeCheck.reason || 'Lunch bookings are closed at this time.');
      return;
    }

    const price = menu.price || bookingSettings.lunchPrice || 4.50;
    if (parent.walletBalance < price) {
      setErrorMsg(`Insufficient wallet balance (₹${parent.walletBalance.toFixed(2)}). Please top up your wallet to pre-book tomorrow's lunch.`);
      setActiveTab('wallet');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Check if already booked for tomorrow
    const alreadyBookedTomorrow = parentBookings.some(
      (b) => b.bookingDate === tomorrowStr && b.status !== 'cancelled' && b.studentId === parent.studentId
    );
    if (alreadyBookedTomorrow) {
      setErrorMsg(`${parent.studentName} already has a pre-booked lunch for tomorrow (${tomorrowStr}).`);
      return;
    }

    try {
      const newBalance = Number((parent.walletBalance - price).toFixed(2));
      const updatedParent = { ...parent, walletBalance: newBalance };
      await updateParentWalletInDb(parent.id, newBalance);
      onUpdateParent(updatedParent);

      const randomPin = String(Math.floor(1000 + Math.random() * 9000));

      const newBooking: LunchBooking = {
        id: `booking_tomorrow_${Date.now()}`,
        parentId: parent.id,
        parentName: parent.name,
        studentId: parent.studentId,
        studentName: parent.studentName,
        grade: parent.grade,
        mealId: menu.id,
        mealTitle: `Tomorrow's Lunch: ${menu.title}`,
        mealPrice: price,
        pickupPin: randomPin,
        bookingDate: tomorrowStr,
        status: 'booked',
        createdAt: Date.now(),
      };

      await saveLunchBookingToDb(newBooking);

      const tx: WalletTransaction = {
        id: `tx-book-tomorrow-${Date.now()}`,
        parentId: parent.id,
        studentId: parent.studentId,
        type: 'debit',
        amount: price,
        description: `Pre-booked Tomorrow's Lunch (${tomorrowStr}): ${menu.title}`,
        timestamp: Date.now()
      };
      await saveWalletTransactionToDb(tx);

      const notif: ParentNotification = {
        id: `notif-book-tomorrow-${Date.now()}`,
        parentId: parent.id,
        title: 'Tomorrow\'s Lunch Pre-Booked!',
        message: `Successfully pre-booked "${menu.title}" for ${parent.studentName} for tomorrow (${tomorrowStr}). ₹${price.toFixed(2)} debited. Pickup PIN is ${randomPin}.`,
        type: 'booking_alert',
        isRead: false,
        timestamp: Date.now()
      };
      await saveParentNotificationToDb(notif);

      setBookingSuccessPin({ pin: randomPin, mealTitle: `Tomorrow's Lunch (${tomorrowStr}): ${menu.title}` });
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to pre-book tomorrow\'s lunch. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <img src={schoolLogo || '/logo.png'} alt={schoolName} className="w-6 h-6 object-contain rounded-md" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>{schoolName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                Parent Portal
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Parent: <span className="text-white font-medium">{parent.name}</span> | Student: <span className="text-emerald-400 font-bold">{parent.studentName}</span> ({parent.studentId})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">

        {/* Toasts / Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm font-medium flex items-center gap-3 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm font-medium flex items-center gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {bookingSuccessPin && (
          <div className="p-6 bg-gradient-to-r from-emerald-900/40 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-3xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-base">Lunch Successfully Booked for {parent.studentName}!</span>
              </div>
              <button 
                onClick={() => setBookingSuccessPin(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Dismiss
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Meal: <strong className="text-white">{bookingSuccessPin.mealTitle}</strong> | Date: <strong className="text-white">{todayStr}</strong>
            </p>
            <div className="p-4 bg-slate-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Canteen Pickup PIN</p>
                <p className="text-xs text-slate-400">Give this 4-digit PIN to the canteen staff when collecting lunch.</p>
              </div>
              <div className="text-2xl font-black tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/30">
                {bookingSuccessPin.pin}
              </div>
            </div>
          </div>
        )}

        {/* Student Wallet & Quick Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Wallet</span>
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-white">₹{parent.walletBalance.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">Available for school cafeteria lunch bookings</p>
            </div>
            <button
              onClick={() => setIsAddMoneyOpen(true)}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Money to Wallet</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ward Information</span>
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">{parent.studentName}</h3>
              <p className="text-xs text-slate-400">Student ID: <span className="text-indigo-400 font-bold">{parent.studentId}</span></p>
              <p className="text-xs text-slate-400">Class: <span className="text-white font-medium">{parent.grade}</span></p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Booking Cut-off Time</span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{bookingSettings.cutoffTime || '09:00'}</div>
              <p className="text-xs text-slate-400 mt-1">
                {isBookingBlocked ? (
                  <span className="text-rose-400 font-bold">Bookings closed for today</span>
                ) : (
                  <span className="text-emerald-400 font-bold">Bookings open for today</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Notifications Alert Center */}
        {allNotifications.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  {allNotifications.some(n => !n.isRead) && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                </div>
                <span>Parent Notifications & Alerts ({allNotifications.filter(n => !n.isRead).length} unread)</span>
              </h3>
              {allNotifications.some(n => !n.isRead) && (
                <button
                  onClick={async () => {
                    const unread = allNotifications.filter(n => !n.isRead);
                    for (const n of unread) {
                      await updateParentNotificationReadInDb(n.id, true);
                    }
                  }}
                  className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 hover:text-emerald-300"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800/60 rounded-2xl">
              {allNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    notif.isRead ? 'bg-slate-900/30 opacity-60' : 'bg-slate-950/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                      )}
                      <p className="font-extrabold text-white">{notif.title}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        notif.type === 'booking_alert' 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {notif.type === 'booking_alert' ? 'Wallet Debit' : 'Alert'}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{notif.message}</p>
                    <p className="text-[9px] text-slate-500">
                      {new Date(notif.timestamp).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={() => updateParentNotificationReadInDb(notif.id, true)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'book'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Book School Lunch</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'wallet'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Wallet & Top-Up</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>My Bookings & Pickup PINs ({parentBookings.length})</span>
          </button>
        </div>

        {/* Tab 1: Book Lunch */}
        {activeTab === 'book' && (
          <div className="space-y-8">
            {/* Booking Hours Window Status Banner */}
            <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              windowCheck.allowed 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  windowCheck.allowed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold flex items-center gap-2">
                    <span>Lunch Booking Window: {bookingSettings.fromTime || '06:00'}  to {bookingSettings.toTime || bookingSettings.cutoffTime || '09:00'} </span>
                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                      windowCheck.allowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {windowCheck.allowed ? 'OPEN NOW' : 'CLOSED'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {windowCheck.allowed 
                      ? `Parents can book lunch for ${parent.studentName} during this daily window.`
                      : windowCheck.reason}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
                School Price: ₹{(bookingSettings.lunchPrice ?? 4.50).toFixed(2)}
              </span>
            </div>

            {/* Tomorrow's Special Lunch Menu Section (Set by Staff) */}
            {tomorrowMenuState && tomorrowMenuState.isAvailable && (() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tomorrowStr = tomorrow.toISOString().split('T')[0];
              const isAlreadyBookedTomorrow = parentBookings.some(
                (b) => b.bookingDate === tomorrowStr && b.status !== 'cancelled' && b.studentId === parent.studentId
              );

              return (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                      <span>Tomorrow's School Menu & Pre-Booking</span>
                      <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {tomorrowStr}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">Pre-book a freshly planned meal for {parent.studentName} for tomorrow.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group">
                      <div>
                        <div className="relative h-48 bg-slate-950 overflow-hidden">
                          <img
                            src={tomorrowMenuState.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                            alt={tomorrowMenuState.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3 bg-indigo-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider border border-indigo-400/30">
                            Tomorrow's Special
                          </div>
                          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-emerald-400 border border-emerald-500/30">
                            ₹{tomorrowMenuState.price.toFixed(2)}
                          </div>
                        </div>

                        <div className="p-5 space-y-3">
                          <h3 className="text-base font-extrabold text-white">{tomorrowMenuState.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold">
                            <span>{tomorrowMenuState.category || 'Special Lunch'}</span>
                            <span>•</span>
                            <span>Pre-booking for {tomorrowStr}</span>
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-2">
                            {tomorrowMenuState.description || 'Nutritious lunch pre-booking for tomorrow.'}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-0">
                        {isAlreadyBookedTomorrow ? (
                          <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Pre-Booked for Tomorrow</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBookTomorrowMeal(tomorrowMenuState)}
                            disabled={isBookingBlocked}
                            className={`w-full py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg ${
                              isBookingBlocked
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Pre-Book Tomorrow's Lunch (₹{tomorrowMenuState.price.toFixed(2)})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Today's Scanned Meal Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-white">Today's School Menu & Lunch Booking</h2>
                <p className="text-xs text-slate-400">Select a freshly prepared meal for {parent.studentName} for today ({todayStr}).</p>
              </div>

              {meals.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                  <Utensils className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">No active school meals scanned yet for today</h3>
                  <p className="text-xs text-slate-400">Please check back when canteen staff scan today's menu.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {meals.map((meal) => {
                    const isAlreadyBooked = parentBookings.some(
                      (b) => b.mealId === meal.id && b.bookingDate === todayStr && b.status === 'booked'
                    );

                    return (
                      <div 
                        key={meal.id} 
                        className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group"
                      >
                        <div>
                          <div className="relative h-48 bg-slate-950 overflow-hidden">
                            <img
                              src={meal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                              alt={meal.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-emerald-400 border border-emerald-500/30">
                              ₹{(bookingSettings.lunchPrice ?? 4.50).toFixed(2)}
                            </div>
                          </div>

                          <div className="p-5 space-y-3">
                            <h3 className="text-base font-extrabold text-white">{meal.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span>🔥 {meal.nutrition.totalCalories} kcal</span>
                              <span>💪 {meal.nutrition.totalProtein}g protein</span>
                              <span>⭐ {meal.nutrition.healthScore}/100 Health</span>
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-2">
                              {meal.ageTierExplanations['classes-4-7']?.headline || 'Balanced nutritious meal prepared with fresh ingredients.'}
                            </p>
                          </div>
                        </div>

                        <div className="p-5 pt-0">
                          {isAlreadyBooked ? (
                            <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Booked for Today</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleBookMeal(meal)}
                              disabled={isBookingBlocked}
                              className={`w-full py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg ${
                                isBookingBlocked
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                              }`}
                            >
                              <Calendar className="w-4 h-4" />
                              <span>Book Lunch (₹{(bookingSettings.lunchPrice ?? 4.50).toFixed(2)})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Wallet & Top-Up */}
        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Top-Up Wallet (Span 5) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-white">Top-Up Wallet</h2>
                <p className="text-xs text-slate-400">Add funds instantly to {parent.studentName}'s wallet ({parent.studentId}).</p>
              </div>

              <div className="text-3xl font-black text-emerald-400 bg-slate-950/40 py-3 rounded-2xl border border-slate-800/60">
                ₹{parent.walletBalance.toFixed(2)}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[10, 25, 50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleAddMoney(amt)}
                    className="py-2.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-black text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1 shadow-md"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>₹{amt}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">Or enter custom amount (₹):</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IndianRupee className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="25"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                  <button
                    onClick={() => handleAddMoney(Number(customAmount) || 25)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    Add Custom
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Transaction History (Span 7) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <span>Wallet Transaction History</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Real-time log of credits (deposits) and debits (bookings).</p>
              </div>

              {allTransactions.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                  <Wallet className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-300">No transactions recorded yet</h3>
                  <p className="text-[11px] text-slate-500">Your top-up history and meal booking debits will be displayed here.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-800 rounded-2xl">
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/80">
                    {allTransactions.map((tx) => (
                      <div key={tx.id} className="p-3.5 hover:bg-slate-950/20 transition-all flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="font-extrabold text-white leading-tight">{tx.description}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(tx.timestamp).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black ${tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 3: My Bookings & Pickup PINs */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-white">Student Lunch Bookings & Pickup PINs</h2>
              <p className="text-xs text-slate-400">View active pickup PINs for {parent.studentName}. Give this PIN to canteen staff to collect lunch.</p>
            </div>

            {parentBookings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <KeyRound className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No lunch bookings found</h3>
                <p className="text-xs text-slate-400">Book a school lunch from the menu tab to generate a canteen pickup PIN.</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50 uppercase text-[10px] tracking-wider font-bold">
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Student & ID</th>
                        <th className="py-3.5 px-4">Meal Booked</th>
                        <th className="py-3.5 px-4">Pickup PIN</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {parentBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-4 font-semibold text-slate-300">{b.bookingDate}</td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-white">{b.studentName}</p>
                            <p className="text-[10px] text-slate-400">{b.studentId} • {b.grade}</p>
                          </td>
                          <td className="py-4 px-4 font-bold text-emerald-400">{b.mealTitle}</td>
                          <td className="py-4 px-4">
                            <span className="text-base font-black tracking-widest text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                              {b.pickupPin}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {b.status === 'given' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] uppercase">
                                ✓ Collected / Given
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-[10px] uppercase animate-pulse">
                                ⏳ Ready for Pickup
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Add Money Modal */}
      {isAddMoneyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Add Funds to Lunch Wallet</h3>
              <button onClick={() => setIsAddMoneyOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400">Select top-up amount for {parent.studentName}:</p>
            <div className="grid grid-cols-3 gap-3">
              {[10, 25, 50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAddMoney(amt)}
                  className="py-3 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-black text-sm rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-1"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsAddMoneyOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
