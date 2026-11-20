import React, { useState } from 'react';
import { User, Lock, Phone, Mail, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { User as UserType } from '../types';

interface AuthModalProps {
  onLoginSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { phone, password }
      : { full_name: fullName, phone, email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'حدث خطأ في عملية المصادقة.');
      }

      if (isLogin) {
        if (data.token) {
          localStorage.setItem('atya_token', data.token);
        }
        onLoginSuccess(data.user);
      } else {
        setSuccessMsg(data.message || 'تم التسجيل بنجاح. يمكنك الآن تسجيل الدخول.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#24140f] border border-[#D4AF37]/50 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8c701e] mx-auto flex items-center justify-center text-[#2B1914] text-2xl font-bold shadow-lg border border-[#E7C779] mb-3">
            ⚖️
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-amiri text-[#F5E5BD]">
            {isLogin ? 'تسجيل الدخول إلى ATYA OCR' : 'إنشاء حساب جديد'}
          </h2>
          <p className="text-xs text-[#D4AF37] mt-1">المنصة الملكية الذكية لقراءة المستندات والترجمة</p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-[#1a0e0b] p-1 rounded-2xl border border-[#D4AF37]/20 mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); setSuccessMsg(''); }}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              isLogin ? 'bg-[#D4AF37] text-[#2B1914] shadow' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              !isLogin ? 'bg-[#D4AF37] text-[#2B1914] shadow' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs font-bold text-[#D4AF37] block mb-1">الاسم الكامل:</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#D4AF37]/60">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الثلاثي أو اسم اللقب"
                  className="w-full bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-xl pr-10 pl-4 py-2.5 text-sm text-[#F5E5BD] placeholder-[#F5E5BD]/30 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#D4AF37] block mb-1">رقم الهاتف:</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#D4AF37]/60">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01153747612"
                className="w-full bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-xl pr-10 pl-4 py-2.5 text-sm text-[#F5E5BD] placeholder-[#F5E5BD]/30 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-xs font-bold text-[#D4AF37] block mb-1">البريد الإلكتروني (اختياري):</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#D4AF37]/60">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-xl pr-10 pl-4 py-2.5 text-sm text-[#F5E5BD] placeholder-[#F5E5BD]/30 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#D4AF37] block mb-1">كلمة المرور:</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#D4AF37]/60">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-xl pr-10 pl-4 py-2.5 text-sm text-[#F5E5BD] placeholder-[#F5E5BD]/30 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] hover:from-[#E7C779] hover:to-[#D4AF37] text-[#2B1914] font-bold text-sm shadow-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#3A241B] text-center text-[11px] text-[#F5E5BD]/60">
          تجربة آمنة بالكامل مشفرة وفق أعلى معايير الخصوصية.
        </div>
      </div>
    </div>
  );
};
