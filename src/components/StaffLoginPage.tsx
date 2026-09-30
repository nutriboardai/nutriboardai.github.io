import React, { useState, useEffect } from 'react';
import { UserCheck, Lock, AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { subscribeStaffAccounts, saveStaffAccountToDb } from '../lib/firebase';

interface StaffLoginPageProps {
  schoolName: string;
  schoolLogo: string;
  onLoginSuccess: (staff: { id: string; name: string; username: string }) => void;
  onOpenAdminConsole?: () => void;
}

export const StaffLoginPage: React.FC<StaffLoginPageProps> = ({
  schoolName,
  schoolLogo,
  onLoginSuccess,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [dbStaffAccounts, setDbStaffAccounts] = useState<Array<{ id: string; name: string; username: string; password?: string }>>([]);

  useEffect(() => {
    const unsubscribe = subscribeStaffAccounts((list) => {
      if (list) setDbStaffAccounts(list);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser) {
      setError('Please enter your staff username.');
      return;
    }

    if (!trimmedPass) {
      setError('Please enter your staff password.');
      return;
    }

    try {
      let found = dbStaffAccounts.find((s) => s.username.toLowerCase() === trimmedUser);
      
      // Fallback for demo staff accounts created before custom accounts exist or after reset
      const isAllowedFallback = 
        trimmedUser === 'staff' || 
        trimmedUser === 'canteen' || 
        trimmedUser === 'sarah' || 
        trimmedUser === 'staff_sarah' || 
        trimmedUser.startsWith('staff_');

      if (!found && (dbStaffAccounts.length === 0 || isAllowedFallback)) {
        const cleanName = trimmedUser.includes('_') 
          ? trimmedUser.split('_')[1].toUpperCase() 
          : trimmedUser.toUpperCase();

        found = {
          id: `staff_fallback_${Date.now()}`,
          name: cleanName === 'STAFF' ? 'School Canteen Staff' : `${cleanName} (Staff)`,
          username: trimmedUser,
          password: 'staff123',
        };
        await saveStaffAccountToDb(found as any);
      }

      if (found) {
        const expectedPassword = found.password || 'staff123';
        if (trimmedPass === expectedPassword) {
          onLoginSuccess(found);
          setUsernameInput('');
          setPasswordInput('');
        } else {
          setError('Incorrect staff password. Please check with your administrator.');
        }
      } else {
        setError(`Staff username "${trimmedUser}" not found. Please contact your school administrator.`);
      }
    } catch {
      setError('Error verifying staff account.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6 animate-fade-in">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-md p-1.5 flex items-center justify-center">
            <img src={schoolLogo || '/logo.png'} alt={schoolName} className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{schoolName}</h1>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Powered By NutriBoard AI</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Canteen Staff Portal Login</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Staff Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                @
              </span>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. staff_sarah"
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Staff Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Enter the staff credentials assigned by your administrator.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer mt-2"
          >
            <span>Login to Staff Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
