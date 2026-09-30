import React, { useState } from 'react';
import { Lock, Mail, User, ShieldCheck, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.ts';
import { useTradingStore } from '../stores/tradingStore.ts';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { login, register, isLoading } = useAuthStore();
  const { setBalance } = useTradingStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isRegister) {
      if (!name.trim()) {
        setErrorMessage('Full name is required.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }

      const res = await register(name, email, password);
      if (res.success) {
        setSuccessMessage('Account registered in MongoDB! Virtual balance ₹10,00,000 credited.');
        const user = useAuthStore.getState().user;
        if (user) {
          setBalance(user.balance);
        }
        setTimeout(() => onSuccess(), 600);
      } else {
        setErrorMessage(res.error || 'Registration failed. Please try again.');
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        setSuccessMessage('Authenticated successfully!');
        const user = useAuthStore.getState().user;
        if (user) {
          setBalance(user.balance);
        }
        setTimeout(() => onSuccess(), 400);
      } else {
        setErrorMessage(res.error || 'Invalid email or password.');
      }
    }
  };

  const handleInstantDemo = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const demoEmail = 'demo.student@terminalx.io';
    const demoPassword = 'password123';

    // Try logging in first
    let res = await login(demoEmail, demoPassword);
    if (!res.success) {
      // If not yet registered, register it
      res = await register('Engineering Student', demoEmail, demoPassword);
    }

    if (res.success) {
      setSuccessMessage('Demo account loaded from MongoDB with ₹10,00,000 virtual balance.');
      const user = useAuthStore.getState().user;
      if (user) {
        setBalance(user.balance);
      }
      setTimeout(() => onSuccess(), 400);
    } else {
      setErrorMessage(res.error || 'Unable to load demo account.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="bg-[#0D1117] border border-[#1B222C] rounded-lg p-6 shadow-xl">
        {/* Header */}
        <div className="text-center pb-5 border-b border-[#1B222C]">
          <div className="w-12 h-12 rounded-lg bg-[#11161D] border border-[#1B222C] flex items-center justify-center text-[#00C2FF] mx-auto mb-3">
            <Zap className="w-6 h-6 fill-[#00C2FF]/20 text-[#00C2FF]" />
          </div>
          <h2 className="text-xl font-bold font-mono text-[#F5F7FA] tracking-tight">
            {isRegister ? 'Create TerminalX Account' : 'Institutional Terminal Sign In'}
          </h2>
          <p className="text-xs text-[#8B949E] mt-1">
            Access paper trading terminal & MongoDB authenticated portfolio
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs font-mono text-[#EF4444] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mt-4 p-3 rounded bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs font-mono text-[#22C55E] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-tight">{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs font-mono">
          {isRegister && (
            <div>
              <label className="block text-[#8B949E] uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#505A66] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Manan Bhayani"
                  className="w-full bg-[#11161D] border border-[#1B222C] focus:border-[#00C2FF] rounded pl-9 pr-3 py-2 text-[#F5F7FA] placeholder-[#505A66] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#8B949E] uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#505A66] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@terminalx.io"
                className="w-full bg-[#11161D] border border-[#1B222C] focus:border-[#00C2FF] rounded pl-9 pr-3 py-2 text-[#F5F7FA] placeholder-[#505A66] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#8B949E] uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#505A66] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters..."
                className="w-full bg-[#11161D] border border-[#1B222C] focus:border-[#00C2FF] rounded pl-9 pr-3 py-2 text-[#F5F7FA] placeholder-[#505A66] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded bg-[#00C2FF] hover:bg-[#00A8DE] disabled:bg-[#1B222C] disabled:text-[#505A66] text-[#07090C] font-bold transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {isLoading
              ? isRegister
                ? 'Registering in MongoDB...'
                : 'Verifying Credentials...'
              : isRegister
              ? 'Register Account (₹10,00,000 Virtual)'
              : 'Sign In to TerminalX'}
          </button>
        </form>

        {/* Instant Demo Option */}
        <div className="mt-4 pt-4 border-t border-[#1B222C]">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleInstantDemo}
            className="w-full py-2 rounded bg-[#11161D] hover:bg-[#161D26] border border-[#1B222C] text-[#8B949E] hover:text-[#F5F7FA] text-xs font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>One-Click Guest Demo Login (MongoDB Seed)</span>
          </button>
        </div>

        {/* Toggle Register / Login */}
        <div className="mt-4 text-center text-xs text-[#8B949E]">
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-[#00C2FF] hover:underline font-mono ml-1"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New to TerminalX?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-[#00C2FF] hover:underline font-mono ml-1"
              >
                Create Account (₹10L Virtual)
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
