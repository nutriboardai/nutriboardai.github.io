import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc,
  collection,
  onSnapshot,
  setDoc,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { MealAnalysisResult, WasteLogEntry, WasteInsightReport, BroadcastConfig, StaffAccount, ParentAccount, LunchBooking, BookingSettings, TomorrowMenu, WalletTransaction, ParentNotification, AdminCredentials } from '../types';
import { INITIAL_WASTE_LOGS, INITIAL_WASTE_INSIGHT_REPORT } from '../data/sampleWasteLogs';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Notice:', JSON.stringify(errInfo));
  return errInfo;
}

// Automatic Firestore seeder - ensures clean setup without injecting preset meals or school names
export async function seedFirestoreIfEmpty() {
  try {
    // 1. Check broadcast config
    const broadcastRef = doc(db, 'broadcast', 'config');
    const broadcastSnap = await getDoc(broadcastRef);
    if (!broadcastSnap.exists()) {
      await setDoc(broadcastRef, {
        activeMealId: '',
        activeAgeTier: 'classes-4-7',
        autoRotateAgeTiers: false,
        announcementTicker: '',
        isVoiceActive: false,
        cleanPlateCount: 0,
        lastUpdated: Date.now(),
      });
    }

    // 2. Check school settings - keep clean without hardcoded school names
    const settingsRef = doc(db, 'settings', 'school');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        schoolName: '',
        schoolLogo: '',
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Firestore initialization check finished:', err);
  }
}

// Test connection and auto seed
export async function testConnection() {
  try {
    await seedFirestoreIfEmpty();
    console.log('✅ Cloud Firestore initialization complete:', firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.warn('Firestore initialization notice:', error);
  }
}

testConnection();

// --- Firestore API Wrappers ---

// Broadcast Config
const BROADCAST_DOC_PATH = 'broadcast/config';

export function subscribeBroadcastConfig(onUpdate: (config: BroadcastConfig | null) => void) {
  const configDocRef = doc(db, 'broadcast', 'config');
  return onSnapshot(configDocRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as BroadcastConfig);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, BROADCAST_DOC_PATH);
  });
}

export async function saveBroadcastConfigToDb(config: BroadcastConfig) {
  try {
    const configDocRef = doc(db, 'broadcast', 'config');
    await setDoc(configDocRef, { ...config, lastUpdated: Date.now() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, BROADCAST_DOC_PATH);
  }
}

// Meals Collection
export function subscribeMeals(onUpdate: (meals: MealAnalysisResult[]) => void) {
  const mealsColRef = collection(db, 'meals');
  return onSnapshot(mealsColRef, (snap) => {
    const meals: MealAnalysisResult[] = [];
    snap.forEach((docSnap) => {
      meals.push(docSnap.data() as MealAnalysisResult);
    });
    // Sort newest first
    meals.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    onUpdate(meals);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'meals');
  });
}

export function subscribeActiveMeal(onUpdate: (meal: MealAnalysisResult | null) => void) {
  const activeMealRef = doc(db, 'broadcast', 'active_meal');
  return onSnapshot(activeMealRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as MealAnalysisResult);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'broadcast/active_meal');
  });
}

export async function saveMealToDb(meal: MealAnalysisResult, makeActive = true) {
  try {
    const mealId = meal.id || `meal-${Date.now()}`;
    const mealWithTimestamp: MealAnalysisResult = {
      ...meal,
      id: mealId,
      timestamp: meal.timestamp || Date.now(),
      isActive: makeActive,
    };

    if (makeActive) {
      const activeMealDocRef = doc(db, 'broadcast', 'active_meal');
      await setDoc(activeMealDocRef, mealWithTimestamp);

      // Deactivate other active meals in meals collection
      try {
        const mealsSnap = await getDocs(collection(db, 'meals'));
        for (const docSnap of mealsSnap.docs) {
          if (docSnap.id !== mealId && docSnap.data().isActive) {
            await setDoc(docSnap.ref, { isActive: false }, { merge: true });
          }
        }
      } catch (err) {
        console.warn('Notice deactivating previous active meals:', err);
      }
    }

    const mealDocRef = doc(db, 'meals', mealId);
    await setDoc(mealDocRef, mealWithTimestamp);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `meals/${meal.id || 'new'}`);
  }
}

export async function deleteMealFromDb(mealId: string) {
  try {
    const mealDocRef = doc(db, 'meals', mealId);
    await deleteDoc(mealDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `meals/${mealId}`);
  }
}

// Clear Active Broadcast Meal from Cloud Firestore
export async function clearActiveMealFromDb() {
  try {
    const activeMealRef = doc(db, 'broadcast', 'active_meal');
    await deleteDoc(activeMealRef);

    // Deactivate all active meals in meals collection
    try {
      const mealsSnap = await getDocs(collection(db, 'meals'));
      for (const docSnap of mealsSnap.docs) {
        if (docSnap.data().isActive) {
          await setDoc(docSnap.ref, { isActive: false }, { merge: true });
        }
      }
    } catch (err) {
      console.warn('Notice clearing active flags on meals:', err);
    }

    const configDocRef = doc(db, 'broadcast', 'config');
    await setDoc(configDocRef, {
      activeMealId: '',
      announcementTicker: 'School Canteen Notice: Today\'s menu is currently being updated.',
      lastUpdated: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'broadcast/active_meal');
  }
}

// Clear All Canteen Meals & Daily Menu History from Cloud Firestore
export async function clearAllMealsFromDb() {
  try {
    const mealsSnap = await getDocs(collection(db, 'meals'));
    for (const d of mealsSnap.docs) {
      await deleteDoc(d.ref);
    }
    await clearActiveMealFromDb();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'meals');
  }
}

// Waste Logs Collection
export function subscribeWasteLogs(onUpdate: (logs: WasteLogEntry[]) => void) {
  const wasteColRef = collection(db, 'waste_logs');
  return onSnapshot(wasteColRef, (snap) => {
    const logs: WasteLogEntry[] = [];
    snap.forEach((docSnap) => {
      logs.push(docSnap.data() as WasteLogEntry);
    });
    onUpdate(logs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'waste_logs');
  });
}

export async function saveWasteLogToDb(entry: WasteLogEntry) {
  try {
    const logDocRef = doc(db, 'waste_logs', entry.id);
    await setDoc(logDocRef, entry);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `waste_logs/${entry.id}`);
  }
}

export async function deleteWasteLogFromDb(logId: string) {
  try {
    const logDocRef = doc(db, 'waste_logs', logId);
    await deleteDoc(logDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `waste_logs/${logId}`);
  }
}

// Waste Insights
export function subscribeWasteInsights(onUpdate: (insight: WasteInsightReport | null) => void) {
  const insightDocRef = doc(db, 'waste_insights', 'latest');
  return onSnapshot(insightDocRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as WasteInsightReport);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'waste_insights/latest');
  });
}

export async function saveWasteInsightToDb(report: WasteInsightReport) {
  try {
    const docRef = doc(db, 'waste_insights', 'latest');
    await setDoc(docRef, { ...report, updatedAt: Date.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'waste_insights/latest');
  }
}

// School Settings
export function subscribeSchoolSettings(onUpdate: (settings: { schoolName?: string; schoolLogo?: string } | null) => void) {
  const docRef = doc(db, 'settings', 'school');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as { schoolName?: string; schoolLogo?: string });
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'settings/school');
  });
}

export async function saveSchoolSettingsToDb(name: string, logo: string) {
  try {
    const docRef = doc(db, 'settings', 'school');
    await setDoc(docRef, { schoolName: name, schoolLogo: logo, updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/school');
  }
}

// Admin Credentials Settings
export function subscribeAdminCredentials(onUpdate: (credentials: AdminCredentials | null) => void) {
  const docRef = doc(db, 'settings', 'admin_credentials');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as AdminCredentials);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'settings/admin_credentials');
  });
}

export async function saveAdminCredentialsToDb(credentials: AdminCredentials) {
  try {
    const docRef = doc(db, 'settings', 'admin_credentials');
    await setDoc(docRef, {
      username: credentials.username,
      password: credentials.password,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/admin_credentials');
  }
}

// Staff Accounts Collection
export function subscribeStaffAccounts(onUpdate: (staffList: StaffAccount[]) => void) {
  const colRef = collection(db, 'staff_accounts');
  return onSnapshot(colRef, (snap) => {
    const list: StaffAccount[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as StaffAccount);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'staff_accounts');
  });
}

export async function saveStaffAccountToDb(staff: StaffAccount) {
  try {
    const docRef = doc(db, 'staff_accounts', staff.id);
    await setDoc(docRef, staff);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `staff_accounts/${staff.id}`);
  }
}

export async function deleteStaffAccountFromDb(staffId: string) {
  try {
    const docRef = doc(db, 'staff_accounts', staffId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `staff_accounts/${staffId}`);
  }
}

// Factory Reset: Permanently wipe all meals, waste logs, staff accounts, custom branding, and broadcast configurations from Cloud Firestore
export async function wipeAllFirestoreData() {
  try {
    // 1. Delete all documents in meals collection
    const mealsSnap = await getDocs(collection(db, 'meals'));
    for (const d of mealsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 2. Delete all documents in waste_logs collection
    const wasteSnap = await getDocs(collection(db, 'waste_logs'));
    for (const d of wasteSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 3. Delete all documents in staff_accounts collection
    const staffSnap = await getDocs(collection(db, 'staff_accounts'));
    for (const d of staffSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 4. Reset broadcast config to blank state
    await setDoc(doc(db, 'broadcast', 'config'), {
      activeMealId: '',
      activeAgeTier: 'classes-4-7',
      autoRotateAgeTiers: false,
      announcementTicker: '',
      isVoiceActive: false,
      cleanPlateCount: 0,
      lastUpdated: Date.now()
    });

    // 5. Reset school settings to blank (no school name, no logo)
    await setDoc(doc(db, 'settings', 'school'), {
      schoolName: '',
      schoolLogo: '',
      updatedAt: Date.now()
    });

    // 6. Reset waste insights to empty
    await deleteDoc(doc(db, 'waste_insights', 'latest'));

    // 7. Clear parent accounts
    const parentsSnap = await getDocs(collection(db, 'parent_accounts'));
    for (const d of parentsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 8. Clear lunch bookings
    const bookingsSnap = await getDocs(collection(db, 'lunch_bookings'));
    for (const d of bookingsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 9. Reset booking settings
    await setDoc(doc(db, 'booking_settings', 'settings'), {
      cutoffTime: '09:00',
      isBookingAllowed: true,
      updatedAt: Date.now()
    });

    console.log('✅ Successfully wiped all Cloud Firestore data collections including parent portals.');
    return true;
  } catch (err) {
    console.error('Failed to wipe Cloud Firestore data:', err);
    return false;
  }
}
export async function forceSyncAllToFirestore(
  meals: MealAnalysisResult[], 
  wasteLogs: WasteLogEntry[], 
  staffAccounts: StaffAccount[],
  schoolName: string, 
  schoolLogo: string
) {
  try {
    for (const meal of meals) {
      await setDoc(doc(db, 'meals', meal.id), meal);
    }
    for (const log of wasteLogs) {
      await setDoc(doc(db, 'waste_logs', log.id), log);
    }
    for (const staff of staffAccounts) {
      await setDoc(doc(db, 'staff_accounts', staff.id), staff);
    }
    await setDoc(doc(db, 'settings', 'school'), { schoolName, schoolLogo, updatedAt: Date.now() });
    if (meals.length > 0) {
      await setDoc(doc(db, 'broadcast', 'config'), {
        activeMealId: meals[0].id,
        activeAgeTier: 'classes-4-7',
        autoRotateAgeTiers: false,
        announcementTicker: `School Nutrition Notice: Fresh ${meals[0].title} is active on the cafeteria board!`,
        isVoiceActive: false,
        lastUpdated: Date.now()
      });
    }
    return true;
  } catch (err) {
    console.error('Failed to force sync to Firestore', err);
    return false;
  }
}

// Parent Accounts Collection
export function subscribeParentAccounts(onUpdate: (parents: ParentAccount[]) => void) {
  const colRef = collection(db, 'parent_accounts');
  return onSnapshot(colRef, (snap) => {
    const list: ParentAccount[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as ParentAccount);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'parent_accounts');
  });
}

export async function saveParentAccountToDb(parent: ParentAccount) {
  try {
    const docRef = doc(db, 'parent_accounts', parent.id);
    await setDoc(docRef, parent);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `parent_accounts/${parent.id}`);
  }
}

export async function updateParentWalletInDb(parentId: string, newBalance: number) {
  try {
    const docRef = doc(db, 'parent_accounts', parentId);
    await setDoc(docRef, { walletBalance: newBalance }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `parent_accounts/${parentId}`);
  }
}

// Lunch Bookings Collection
export function subscribeLunchBookings(onUpdate: (bookings: LunchBooking[]) => void) {
  const colRef = collection(db, 'lunch_bookings');
  return onSnapshot(colRef, (snap) => {
    const list: LunchBooking[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as LunchBooking);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'lunch_bookings');
  });
}

export async function saveLunchBookingToDb(booking: LunchBooking) {
  try {
    const docRef = doc(db, 'lunch_bookings', booking.id);
    await setDoc(docRef, booking);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `lunch_bookings/${booking.id}`);
  }
}

export async function updateLunchBookingStatusInDb(bookingId: string, status: 'booked' | 'given' | 'cancelled') {
  try {
    const docRef = doc(db, 'lunch_bookings', bookingId);
    await setDoc(docRef, { status }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `lunch_bookings/${bookingId}`);
  }
}

// Booking Settings
export function subscribeBookingSettings(onUpdate: (settings: BookingSettings) => void) {
  const docRef = doc(db, 'settings', 'booking_config');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as BookingSettings;
      onUpdate({
        fromTime: data.fromTime || '06:00',
        toTime: data.toTime || data.cutoffTime || '09:00',
        cutoffTime: data.cutoffTime || data.toTime || '09:00',
        isBookingAllowed: data.isBookingAllowed ?? true,
        lunchPrice: data.lunchPrice ?? 4.50,
        updatedAt: data.updatedAt || Date.now(),
      });
    } else {
      onUpdate({ fromTime: '06:00', toTime: '09:00', cutoffTime: '09:00', isBookingAllowed: true, lunchPrice: 4.50, updatedAt: Date.now() });
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'settings/booking_config');
  });
}

export async function saveBookingSettingsToDb(settings: BookingSettings) {
  try {
    const docRef = doc(db, 'settings', 'booking_config');
    await setDoc(docRef, settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/booking_config');
  }
}

// Tomorrow's Lunch Menu
export function subscribeTomorrowMenu(onUpdate: (menu: TomorrowMenu | null) => void) {
  const docRef = doc(db, 'settings', 'tomorrow_menu');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as TomorrowMenu);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'settings/tomorrow_menu');
  });
}

export async function saveTomorrowMenuToDb(menu: TomorrowMenu) {
  try {
    const docRef = doc(db, 'settings', 'tomorrow_menu');
    await setDoc(docRef, menu);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/tomorrow_menu');
  }
}

// Wallet Transactions Collection
export function subscribeWalletTransactions(onUpdate: (txs: WalletTransaction[]) => void) {
  const colRef = collection(db, 'wallet_transactions');
  return onSnapshot(colRef, (snap) => {
    const list: WalletTransaction[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as WalletTransaction);
    });
    list.sort((a, b) => b.timestamp - a.timestamp);
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'wallet_transactions');
  });
}

export async function saveWalletTransactionToDb(tx: WalletTransaction) {
  try {
    const docRef = doc(db, 'wallet_transactions', tx.id);
    await setDoc(docRef, tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `wallet_transactions/${tx.id}`);
  }
}

// Parent Notifications Collection
export function subscribeParentNotifications(onUpdate: (notifs: ParentNotification[]) => void) {
  const colRef = collection(db, 'parent_notifications');
  return onSnapshot(colRef, (snap) => {
    const list: ParentNotification[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as ParentNotification);
    });
    list.sort((a, b) => b.timestamp - a.timestamp);
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'parent_notifications');
  });
}

export async function saveParentNotificationToDb(notif: ParentNotification) {
  try {
    const docRef = doc(db, 'parent_notifications', notif.id);
    await setDoc(docRef, notif);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `parent_notifications/${notif.id}`);
  }
}

export async function updateParentNotificationReadInDb(notifId: string, isRead: boolean) {
  try {
    const docRef = doc(db, 'parent_notifications', notifId);
    await setDoc(docRef, { isRead }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `parent_notifications/${notifId}`);
  }
}
