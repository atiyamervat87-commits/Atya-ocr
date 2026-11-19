import React, { useState, useEffect } from 'react';
import { Coins, PlusCircle, RefreshCw, AlertCircle, History, Sparkles } from 'lucide-react';
import { CreditTransaction } from '../types';

interface WalletViewProps {
  balance: number;
  onUpdateBalance: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ balance, onUpdateBalance }) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('50');
  const [topUpRef, setTopUpRef] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (res.ok && data.success) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [balance]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/wallet/top-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(topUpAmount), reference: topUpRef }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل شحن المحفظة.');
      }

      setTopUpRef('');
      onUpdateBalance();
      fetchWallet();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطأ في عملية الشحن.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#2B1914] to-[#3A241B] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] text-3xl shadow-inner">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-amiri text-[#F5E5BD]">محفظة حصص الذكاء الاصطناعي</h2>
            <p className="text-xs text-[#D4AF37] mt-1">تستخدم للخصم عند قراءة OCR والترجمة والمحادثة والتحليل</p>
          </div>
        </div>

        <div className="bg-[#24140f] border border-[#D4AF37]/50 rounded-2xl px-6 py-4 text-center shadow-xl">
          <span className="text-xs text-[#F5E5BD]/70 block mb-1">رصيدك الحالي من الحصص:</span>
          <span className="text-3xl font-bold font-mono text-[#D4AF37]">{balance.toFixed(1)}</span>
          <span className="text-xs text-[#E7C779] mr-1.5">حصة</span>
        </div>
      </div>

      {/* Top Up Section */}
      <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-[#F5E5BD] flex items-center gap-2 border-b border-[#3A241B] pb-3">
          <PlusCircle className="w-5 h-5 text-[#D4AF37]" />
          <span>شحن حصص جديدة</span>
        </h3>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleTopUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-[#D4AF37] block mb-1">عدد الحصص المراد شحنها:</label>
            <select
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="w-full bg-[#1a0e0b] border border-[#D4AF37]/40 rounded-xl px-3 py-2.5 text-sm text-[#F5E5BD] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="20">20 حصة</option>
              <option value="50">50 حصة</option>
              <option value="100">100 حصة</option>
              <option value="500">500 حصة</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#D4AF37] block mb-1">رقم عملية التحويل أو المرجع:</label>
            <input
              type="text"
              required
              value={topUpRef}
              onChange={(e) => setTopUpRef(e.target.value)}
              placeholder="مرجع الدفع (مثال: TOPUP-983)"
              className="w-full bg-[#1a0e0b] border border-[#D4AF37]/40 rounded-xl px-3 py-2.5 text-sm text-[#F5E5BD] placeholder-[#F5E5BD]/30 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] hover:from-[#E7C779] hover:to-[#D4AF37] text-[#2B1914] font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>تأكيد شحن الحصص</span>
            </button>
          </div>
        </form>
      </div>

      {/* Transactions History */}
      <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-[#F5E5BD] flex items-center gap-2 border-b border-[#3A241B] pb-3">
          <History className="w-5 h-5 text-[#D4AF37]" />
          <span>سجل حركات الحصص (شحن واستهلاك)</span>
        </h3>

        {loading ? (
          <div className="py-8 text-center text-[#D4AF37] flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-xs">جاري تحميل السجل...</span>
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-xs text-[#F5E5BD]/60 text-center py-6">لا توجد حركات مسجلة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#3A241B] text-[#D4AF37]">
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3">الوصف / الخدمة</th>
                  <th className="py-2.5 px-3">الكمية</th>
                  <th className="py-2.5 px-3">الرصيد بعد الحركة</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A241B]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#1a0e0b]/50 transition">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        tx.type === 'top_up' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                        'bg-rose-950 text-rose-300 border border-rose-500/30'
                      }`}>
                        {tx.type === 'top_up' ? 'شحن رصيد' : 'خصم خدمة'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#F5E5BD] font-medium">{tx.description}</td>
                    <td className={`py-3 px-3 font-mono font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#E7C779]">{tx.balance_after}</td>
                    <td className="py-3 px-3 text-[#F5E5BD]/60">{tx.created_at}</td>
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
