import React from 'react';
import { Scale, MessageSquare, Languages, FileText, CheckSquare, Printer, LogOut, Coins, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  onOpenWallet: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, user, onLogout, onOpenWallet }) => {
  return (
    <header className="sticky top-0 z-50 bg-[#2B1914]/95 backdrop-blur border-b border-[#D4AF37]/30 shadow-xl px-4 py-3 no-print">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8c701e] flex items-center justify-center text-[#2B1914] font-bold text-xl shadow-lg border border-[#E7C779]">
            ⚖️
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold font-amiri text-[#F5E5BD] leading-tight">
              المستشار عطيه الهلباوي | ATYA OCR
            </h1>
            <p className="text-[11px] text-[#D4AF37]">
              النظام الملكي الذكي لإدارة المحاماة وقراءة المستندات
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {user && user.is_active ? (
            <>
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'home' ? 'bg-[#D4AF37] text-[#2B1914] shadow' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>الرئيسية والقراءة</span>
              </button>
              
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'chat' ? 'bg-[#D4AF37] text-[#2B1914] shadow' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>محادثة المستشار</span>
              </button>

              <button
                onClick={() => setActiveTab('translation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'translation' ? 'bg-[#D4AF37] text-[#2B1914] shadow' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
                }`}
              >
                <Languages className="w-4 h-4" />
                <span>الترجمة الفورية</span>
              </button>
            </>
          ) : (
            <span className="text-xs text-amber-400 font-bold bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-500/30">
              الحساب بانتظار تفعيل الرسوم (500 ج.م)
            </span>
          )}

          <button
            onClick={() => setActiveTab('testing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'testing' ? 'bg-[#D4AF37] text-[#2B1914] shadow' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>تقرير الاختبارات</span>
          </button>

          {user && user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'admin' ? 'bg-amber-500 text-[#2B1914] shadow' : 'text-amber-300 hover:bg-[#3A241B] border border-amber-500/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>لوحة الإدارة</span>
            </button>
          )}
        </nav>

        {/* User Profile & Quick Actions */}
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={onOpenWallet}
              className="px-3 py-1.5 rounded-lg bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition"
              title="محفظة الحصص"
            >
              <Coins className="w-4 h-4" />
              <span>{user.balance?.toFixed(1) || '0.0'} حصة</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="p-2 rounded-lg bg-[#3A241B] text-[#D4AF37] hover:bg-[#2B1914] border border-[#D4AF37]/30 text-xs flex items-center gap-1 cursor-pointer"
            title="طباعة"
          >
            <Printer className="w-4 h-4" />
          </button>

          {user && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-rose-950/80 text-rose-200 hover:bg-rose-900 border border-rose-500/40 text-xs flex items-center gap-1 cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
