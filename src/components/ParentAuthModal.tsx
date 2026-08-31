import React, { useState } from 'react';
import { User, Lock, GraduationCap, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ParentAccount } from '../types';
import { saveParentAccountToDb } from '../lib/firebase';

interface ParentAuthModalProps {
  parentAccounts: ParentAccount[];
  onLoginSuccess: (parent: ParentAccount) => void;
  schoolName?: string;
  schoolLogo?: string;
}

export const ParentAuthModal: React.FC<ParentAuthModalProps> = ({
  parentAccounts,
  onLoginSuccess,
  schoolName = 'NutriBoard Public School',
  schoolLogo = '/logo.png',
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [grade, setGrade] = useState('Grade 4 - Class A');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!name.trim() || !studentName.trim() || !studentId.trim()) {
          setError('Please fill in all parent and student ward details.');
          setIsLoading(false);
          return;
        }

        const existing = parentAccounts.find((p) => p.username.toLowerCase() === trimmedUser);
        if (existing) {
          setError('Username already exists. Please choose another username or log in.');
          setIsLoading(false);
          return;
        }

        const newParent: ParentAccount = {
          id: `parent_${Date.now()}`,
          name: name.trim(),
          username: trimmedUser,
          password: trimmedPass,
          studentName: studentName.trim(),
          studentId: studentId.trim().toUpperCase(),
          grade: grade.trim(),
          walletBalance: 25.00, // Starter wallet credit
          createdAt: Date.now(),
        };

        await saveParentAccountToDb(newParent);
        onLoginSuccess(newParent);
      } else {
        const found = parentAccounts.find(
          (p) => p.username.toLowerCase() === trimmedUser && (!p.password || p.password === trimmedPass)
        );

        if (found) {
          onLoginSuccess(found);
        } else {
          setError('Invalid username or password. Please check your credentials or register a new account.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Authentication failed. Please check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <img src={schoolLogo || '/logo.png'} alt={schoolName} className="w-8 h-8 object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">Parent Portal</h1>
            <p className="text-xs text-emerald-400/80 font-medium">{schoolName}</p>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white">
            {isRegistering ? 'Create Parent Account' : 'Welcome Back, Parent'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegistering 
              ? 'Register to manage your student ward wallet and book school lunches.'
              : 'Sign in to access student wallet, book lunches, and view pickup PINs.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Parent Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Student Ward Name</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Leo Jenkins"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Student ID</label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. STU-1042"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Student Grade / Class</label>
                <input
                  type="text"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. Grade 4 - Class B"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. sarah"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>{isRegistering ? 'Register Parent Account' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            {isRegistering ? 'Already have an account? Sign in' : "Don't have a parent account? Register here"}
          </button>
        </div>

      </div>
    </div>
  );
};
