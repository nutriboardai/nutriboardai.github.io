import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Search, 
  KeyRound, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  ShieldCheck, 
  AlertCircle, 
  Calendar,
  Sparkles,
  Users,
  Trash2,
  Plus,
  Send,
  Eye
} from 'lucide-react';
import { LunchBooking, BookingSettings, MealAnalysisResult, ParentAccount, TomorrowMenu, WalletTransaction, ParentNotification } from '../types';
import { updateLunchBookingStatusInDb, saveBookingSettingsToDb, updateParentWalletInDb, saveLunchBookingToDb, saveWalletTransactionToDb, saveParentNotificationToDb, subscribeTomorrowMenu, saveTomorrowMenuToDb } from '../lib/firebase';

interface StaffLunchManagerProps {
  bookings: LunchBooking[];
  bookingSettings: BookingSettings;
  meals: MealAnalysisResult[];
  parentAccounts: ParentAccount[];
  tomorrowMenu?: TomorrowMenu | null;
  onClearActiveMeal?: () => void;
  onClearAllMeals?: () => void;
}

export const StaffLunchManager: React.FC<StaffLunchManagerProps> = ({
  bookings,
  bookingSettings,
  meals,
  parentAccounts,
  onClearActiveMeal,
  onClearAllMeals,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [verifyErrors, setVerifyErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // Over-the-counter booking form state
  const [otcStudentId, setOtcStudentId] = useState('');
  const [otcSelectedMealId, setOtcSelectedMealId] = useState('');
  const [otcError, setOtcError] = useState('');
  const [otcSuccess, setOtcSuccess] = useState('');

  // Tomorrow's Lunch Menu Form State
  const [tomorrowMenuState, setTomorrowMenuState] = useState<TomorrowMenu | null>(null);
  const [tomorrowTitle, setTomorrowTitle] = useState('');
  const [tomorrowDesc, setTomorrowDesc] = useState('');
  const [tomorrowPrice, setTomorrowPrice] = useState('4.50');
  const [tomorrowCategory, setTomorrowCategory] = useState('Nutritious Lunch Thali');
  const [tomorrowImage, setTomorrowImage] = useState('');
  const [tomorrowSuccess, setTomorrowSuccess] = useState('');
  const [tomorrowError, setTomorrowError] = useState('');

  useEffect(() => {
    const unsub = subscribeTomorrowMenu((menu) => {
      setTomorrowMenuState(menu);
      if (menu) {
        if (!tomorrowTitle) setTomorrowTitle(menu.title);
        if (!tomorrowDesc) setTomorrowDesc(menu.description);
        if (!tomorrowPrice) setTomorrowPrice(String(menu.price || 4.50));
        if (!tomorrowImage) setTomorrowImage(menu.imageUrl || '');
      }
    });
    return () => unsub();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.bookingDate === todayStr);
  const totalPreparedCount = todayBookings.filter((b) => b.status === 'booked').length;
  const totalGivenCount = todayBookings.filter((b) => b.status === 'given').length;

  const filteredBookings = todayBookings.filter((b) => 
    b.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.mealTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const matchedOtcParent = parentAccounts.find(
    (p) => p.studentId.trim().toLowerCase() === otcStudentId.trim().toLowerCase()
  );
  const otcStudentHasBooking = matchedOtcParent ? todayBookings.some(
    (b) => b.studentId.trim().toLowerCase() === matchedOtcParent.studentId.trim().toLowerCase() && b.status !== 'cancelled'
  ) : false;

  const handleVerifyPin = async (booking: LunchBooking) => {
    const enteredPin = (pinInputs[booking.id] || '').trim();
    setVerifyErrors((prev) => ({ ...prev, [booking.id]: '' }));

    if (!enteredPin) {
      setVerifyErrors((prev) => ({ ...prev, [booking.id]: 'Please enter the 4-digit pickup PIN.' }));
      return;
    }

    if (enteredPin !== booking.pickupPin) {
      setVerifyErrors((prev) => ({ ...prev, [booking.id]: 'Incorrect pickup PIN! Please check with parent.' }));
      return;
    }

    try {
      await updateLunchBookingStatusInDb(booking.id, 'given');
      setSuccessMsg(`Successfully verified PIN and marked lunch as given for ${booking.studentName}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setVerifyErrors((prev) => ({ ...prev, [booking.id]: 'Failed to update order status.' }));
    }
  };

  const handleOtcBookAndDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtcError('');
    setOtcSuccess('');

    const targetStudentId = otcStudentId.trim();
    if (!targetStudentId) {
      setOtcError('Please enter a Student ID.');
      return;
    }

    // Find parent account matching student ID
    const parent = parentAccounts.find(
      (p) => p.studentId.trim().toLowerCase() === targetStudentId.toLowerCase()
    );

    if (!parent) {
      setOtcError(`No student/parent profile found for Student ID "${targetStudentId}".`);
      return;
    }

    const price = bookingSettings.lunchPrice ?? 4.50;
    if (parent.walletBalance < price) {
      setOtcError(`Insufficient wallet balance! Wallet has ₹${parent.walletBalance.toFixed(2)}, but lunch costs ₹${price.toFixed(2)}. Please ask parent to top up.`);
      return;
    }

    // Check if student already has a lunch booked or given for today (Limit: 1 lunch per day)
    const studentHasBookingToday = todayBookings.some(
      (b) => b.studentId.trim().toLowerCase() === parent.studentId.trim().toLowerCase() && b.status !== 'cancelled'
    );
    if (studentHasBookingToday) {
      setOtcError(`Student "${parent.studentName}" already has an active or dispensed lunch booked for today. (Limit: 1 lunch per student per day).`);
      return;
    }

    const selectedMeal = meals.find((m) => m.id === otcSelectedMealId) || meals[0];
    const mealTitle = selectedMeal ? selectedMeal.title : 'Balanced School Lunch Tray';
    const mealId = selectedMeal ? selectedMeal.id : 'standard-meal';

    try {
      const newBalance = Number((parent.walletBalance - price).toFixed(2));
      const bookingId = `book-otc-${Date.now()}`;
      const txId = `tx-otc-${Date.now()}`;
      const notifId = `notif-otc-${Date.now()}`;

      // 1. Deduct wallet balance
      await updateParentWalletInDb(parent.id, newBalance);

      // 2. Create instant booking with status 'given'
      const booking: LunchBooking = {
        id: bookingId,
        parentId: parent.id,
        parentName: parent.name,
        studentId: parent.studentId,
        studentName: parent.studentName,
        grade: parent.grade,
        mealId: mealId,
        mealTitle: mealTitle,
        mealPrice: price,
        pickupPin: 'OTC', // Over the counter
        bookingDate: todayStr,
        status: 'given',
        createdAt: Date.now()
      };
      await saveLunchBookingToDb(booking);

      // 3. Save a debit transaction log
      const tx: WalletTransaction = {
        id: txId,
        parentId: parent.id,
        studentId: parent.studentId,
        type: 'debit',
        amount: price,
        description: `Staff booked over-the-counter: ${mealTitle}`,
        timestamp: Date.now()
      };
      await saveWalletTransactionToDb(tx);

      // 4. Send parent notification
      const notif: ParentNotification = {
        id: notifId,
        parentId: parent.id,
        title: 'Over-the-Counter Lunch Booked & Dispensed',
        message: `Canteen staff booked and dispensed ${mealTitle} for ${parent.studentName} today, debiting ₹${price.toFixed(2)} from your wallet.`,
        type: 'debit_alert',
        isRead: false,
        timestamp: Date.now()
      };
      await saveParentNotificationToDb(notif);

      setOtcSuccess(`Successfully booked & dispensed "${mealTitle}" for ${parent.studentName}! Parent notified and ₹${price.toFixed(2)} debited.`);
      setOtcStudentId('');
      setOtcSelectedMealId('');
    } catch (err: any) {
      console.error(err);
      setOtcError(`An error occurred: ${err.message || err}`);
    }
  };

  const handlePublishTomorrowMenu = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTomorrowError('');
    setTomorrowSuccess('');

    if (!tomorrowTitle.trim()) {
      setTomorrowError("Please enter a title for tomorrow's lunch menu.");
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const priceNum = Number(parseFloat(tomorrowPrice).toFixed(2)) || bookingSettings.lunchPrice || 4.50;

    const menuObj: TomorrowMenu = {
      id: `tomorrow-menu-${Date.now()}`,
      title: tomorrowTitle.trim(),
      description: tomorrowDesc.trim() || 'Freshly prepared nutritious school lunch for tomorrow.',
      price: priceNum,
      imageUrl: tomorrowImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      category: tomorrowCategory.trim() || 'Nutritious Meal',
      date: tomorrowStr,
      isAvailable: true,
      updatedAt: Date.now(),
    };

    try {
      await saveTomorrowMenuToDb(menuObj);
      setTomorrowSuccess(`Successfully published Tomorrow's Lunch Menu (${tomorrowStr}): "${menuObj.title}"! Parents can now pre-book.`);
      setTimeout(() => setTomorrowSuccess(''), 5000);
    } catch (err: any) {
      console.error(err);
      setTomorrowError(`Failed to save tomorrow's menu: ${err.message || err}`);
    }
  };

  const handlePickMealForTomorrow = (meal: MealAnalysisResult) => {
    setTomorrowTitle(meal.title);
    setTomorrowDesc(meal.ageTierExplanations['classes-4-7']?.headline || 'Balanced nutritious lunch tray.');
    setTomorrowImage(meal.imageUrl || '');
    setTomorrowCategory('Scanned Daily Special');
    setTomorrowSuccess(`Pre-filled "${meal.title}". Click "Publish Tomorrow's Menu" to save it live for parents!`);
    setTimeout(() => setTomorrowSuccess(''), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Staff Clear Menu Action Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Staff Canteen Menu Operations</span>
            <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Canteen Portal
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Staff can wipe the live Smart Board tray or clear all daily scanned meal options.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onClearActiveMeal && (
            <button
              onClick={onClearActiveMeal}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Clear Active Tray</span>
            </button>
          )}

          {onClearAllMeals && (
            <button
              onClick={onClearAllMeals}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs border border-rose-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Daily Menu</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Top Banner: Total Lunches to Prepare */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Lunches To Prepare Today</span>
            <div className="text-3xl font-black text-white mt-1">{totalPreparedCount}</div>
            <p className="text-[11px] text-slate-400">Pending collection for today ({todayStr})</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lunches Collected & Given</span>
            <div className="text-3xl font-black text-white mt-1">{totalGivenCount}</div>
            <p className="text-[11px] text-slate-400">Successfully verified with PIN</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Booking Cut-off Time</span>
            <div className="text-2xl font-black text-white mt-1">{bookingSettings.cutoffTime || '09:00'} AM</div>
            <p className="text-[11px] text-slate-400">
              {bookingSettings.isBookingAllowed ? 'Bookings currently OPEN' : 'Bookings CLOSED by admin'}
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm font-medium flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Over-The-Counter Booking Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-400" />
            <span>Over-the-Counter Booking & Lunch Dispenser</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Book and dispense lunch instantly for a student who forgot to bring a lunchbox or book in advance. This automatically debits their parent's wallet and notifies them.
          </p>
        </div>

        {otcError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{otcError}</span>
          </div>
        )}

        {otcSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{otcSuccess}</span>
          </div>
        )}

        <form onSubmit={handleOtcBookAndDispense} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Student ID</label>
            <input
              type="text"
              value={otcStudentId}
              onChange={(e) => {
                setOtcStudentId(e.target.value);
                setOtcError('');
                setOtcSuccess('');
              }}
              placeholder="e.g. STU101"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-extrabold tracking-wider"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Select Lunch Meal</label>
            <select
              value={otcSelectedMealId}
              onChange={(e) => setOtcSelectedMealId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="">-- Active Day Meal (Default) --</option>
              {meals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} (₹{(bookingSettings.lunchPrice ?? 4.50)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={!otcStudentId.trim() || otcStudentHasBooking}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 h-[42px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Dispense & Debit ₹{(bookingSettings.lunchPrice ?? 4.50).toFixed(2)}</span>
            </button>
          </div>
        </form>

        {/* Live student ID match feedback */}
        {otcStudentId.trim() && (
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Live Student lookup</span>
            {(() => {
              const matchedParent = parentAccounts.find(
                (p) => p.studentId.trim().toLowerCase() === otcStudentId.trim().toLowerCase()
              );
              return matchedParent ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-white text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        {matchedParent.studentName}
                      </p>
                      {otcStudentHasBooking ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-extrabold uppercase tracking-wider">
                          Already Ordered Today
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold uppercase tracking-wider">
                          Eligible
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Grade: <span className="text-slate-200 font-bold">{matchedParent.grade}</span> | Parent: <span className="text-slate-200 font-bold">{matchedParent.name}</span>
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-right">
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Wallet Balance</span>
                    <span className={`text-base font-black ${matchedParent.walletBalance >= (bookingSettings.lunchPrice ?? 4.50) ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{matchedParent.walletBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-rose-400/80 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  No student matching ID "{otcStudentId}" was found in parent database.
                </p>
              );
            })()}
          </div>
        )}
      </div>

      {/* Staff Set Tomorrow's Lunch Menu Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Set Tomorrow's Lunch Menu</span>
                <span className="text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  Parent Pre-Booking
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Staff can publish tomorrow's special menu so parents can pre-book lunch for their children in advance.
              </p>
            </div>
          </div>

          {tomorrowMenuState && tomorrowMenuState.isAvailable && (
            <div className="bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-xs flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <div>
                <span className="font-extrabold text-emerald-300 block">Live Tomorrow Menu</span>
                <span className="text-[11px] text-slate-300 font-bold">{tomorrowMenuState.title} (₹{tomorrowMenuState.price.toFixed(2)})</span>
              </div>
            </div>
          )}
        </div>

        {tomorrowError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{tomorrowError}</span>
          </div>
        )}

        {tomorrowSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{tomorrowSuccess}</span>
          </div>
        )}

        {/* Quick pre-fill buttons from scanned meals */}
        {meals.length > 0 && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Pick From Scanned Meals
            </span>
            <div className="flex flex-wrap gap-2">
              {meals.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handlePickMealForTomorrow(m)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-950 hover:border-indigo-500/50 border border-slate-700 text-slate-200 hover:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Use "{m.title}"</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handlePublishTomorrowMenu} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Menu Title</label>
              <input
                type="text"
                value={tomorrowTitle}
                onChange={(e) => setTomorrowTitle(e.target.value)}
                placeholder="e.g. Paneer Butter Masala & Brown Rice"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Category / Type</label>
              <input
                type="text"
                value={tomorrowCategory}
                onChange={(e) => setTomorrowCategory(e.target.value)}
                placeholder="e.g. Special Thali"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tomorrowPrice}
                onChange={(e) => setTomorrowPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                placeholder="4.50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Image URL (Optional)</label>
              <input
                type="text"
                value={tomorrowImage}
                onChange={(e) => setTomorrowImage(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Menu Description & Items Included</label>
            <textarea
              value={tomorrowDesc}
              onChange={(e) => setTomorrowDesc(e.target.value)}
              placeholder="e.g. Includes fresh Paneer Butter Masala, steamed brown rice, cucumber salad, and low-sugar dessert."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Publish Tomorrow's Menu For Parents</span>
            </button>
          </div>
        </form>
      </div>

      {/* Student ID Search & Orders Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white">Canteen Lunch Orders & Student PIN Verification</h3>
            <p className="text-xs text-slate-400">Search by Student ID or enter the parent's pickup PIN to mark lunch as given.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student ID, name, meal..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
            <Utensils className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No lunch orders found for today ({todayStr})</h4>
            <p className="text-xs text-slate-400">Orders booked by parents will appear here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3.5 px-4">Student ID & Name</th>
                  <th className="py-3.5 px-4">Grade</th>
                  <th className="py-3.5 px-4">Meal Booked</th>
                  <th className="py-3.5 px-4">Parent</th>
                  <th className="py-3.5 px-4">Status & PIN Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-extrabold text-white text-sm">{booking.studentId}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold">{booking.studentName}</p>
                    </td>
                    <td className="py-4 px-4 text-slate-300 font-medium">{booking.grade}</td>
                    <td className="py-4 px-4 font-bold text-white">{booking.mealTitle}</td>
                    <td className="py-4 px-4 text-slate-300">{booking.parentName}</td>
                    <td className="py-4 px-4">
                      {booking.status === 'given' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-extrabold text-[11px]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Given / Collected</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              value={pinInputs[booking.id] || ''}
                              onChange={(e) => setPinInputs((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                              placeholder="4-digit PIN"
                              className="w-28 bg-slate-800 border border-slate-700 rounded-xl py-1.5 px-3 text-center text-xs text-white tracking-widest font-bold focus:outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => handleVerifyPin(booking)}
                              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
                            >
                              <span>Verify & Give</span>
                            </button>
                          </div>
                          {verifyErrors[booking.id] && (
                            <p className="text-[10px] text-rose-400 font-semibold">
                              {verifyErrors[booking.id]}
                            </p>
                          )}
                        </div>
                      )}
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
