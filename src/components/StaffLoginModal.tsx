import React, { useState, useEffect } from 'react';
import { UserCheck, Lock, X, ShieldAlert, Sparkles, Eye, EyeOff } from 'lucide-react';
import { subscribeStaffAccounts, saveStaffAccountToDb } from '../lib/firebase';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (staff: { id: string; name: string; username: string }) => void;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
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

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser) {
      setError('Please enter your assigned canteen staff username.');
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
          onClose();
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-100 space-y-6 animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Canteen Staff Portal</h2>
            <p className="text-xs text-slate-400">Login with your staff credentials</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Staff Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
