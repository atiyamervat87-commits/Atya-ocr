import React, { useState } from 'react';
import { ShieldAlert, CreditCard, Send, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Sparkles } from 'lucide-react';
import { User } from '../types';

interface ActivationScreenProps {
  user: User;
  onRefreshUser: () => void;
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({ user, onRefreshUser }) => {
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const activeReq = user.activation_request;

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      setErrorMsg('يرجى إدخال رقم العملية أو مرجع التحويل.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('transaction_reference', transactionRef);
    if (receiptFile) {
      formData.append('receipt', receiptFile);
    }

    try {
      const token = localStorage.getItem('atya_token');
      const res = await fetch('/api/activation/request', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل إرسال طلب التفعيل.');
      }

      setSuccessInfo(data.whatsapp_notification);
      onRefreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال الطلب.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('atya_token');
      const res = await fetch('/api/activation/dev-bypass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تفعيل المطور.');
      }
      onRefreshUser();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-[#2B1914] border border-[#D4AF37]/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500 text-amber-400 mx-auto flex items-center justify-center text-3xl mb-4 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-amiri text-[#F5E5BD] mb-2">
          تفعيل الحساب مطلوب (رسوم التفعيل الملكية: 500 جنيه)
        </h2>
        <p className="text-sm text-[#F5E5BD]/80 max-w-xl mx-auto leading-relaxed">
          عزيزي العميل، لاستخدام خدمات المنصة الملكية الذكية، يرجى سداد رسوم التفعيل لمرة واحدة فقط.
        </p>

        {/* Developer Free Access Bypass Button */}
        <div className="mt-6 p-4 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 max-w-md mx-auto space-y-2">
          <p className="text-xs text-[#D4AF37] font-bold">بصفتك مطور النظام (صاحب الجهاز)، يمكنك الدخول والتفعيل مجاناً فوراً:</p>
          <button
            onClick={handleDevBypass}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] text-[#2B1914] font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>تفعيل فوري مجاني للمطور (بدون رسوم)</span>
          </button>
        </div>

        {/* Payment Details Card */}
        <div className="mt-6 bg-[#24140f] border border-[#D4AF37]/40 rounded-2xl p-5 text-right max-w-lg mx-auto space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-sm border-b border-[#3A241B] pb-2">
            <span className="text-[#F5E5BD]/70">قيمة رسوم التفعيل:</span>
            <span className="font-bold text-[#D4AF37] text-base">500 جنيه مصري</span>
          </div>
          <div className="flex items-center justify-between text-sm border-b border-[#3A241B] pb-2">
            <span className="text-[#F5E5BD]/70">وسيلة الدفع المعتمدة:</span>
            <span className="font-bold text-[#F5E5BD]">المحفظة الإلكترونية</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#F5E5BD]/70">رقم المحفظة المخصص:</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/40 select-all">
              01153747612
            </span>
          </div>
        </div>
      </div>

      {activeReq ? (
        <div className="bg-[#24140f] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-[#3A241B]">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              activeReq.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
              activeReq.status === 'rejected' ? 'bg-rose-950 text-rose-400 border border-rose-500/40' :
              'bg-amber-950 text-amber-400 border border-amber-500/40'
            }`}>
              {activeReq.status === 'approved' ? <CheckCircle2 className="w-6 h-6" /> : <RefreshCw className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5E5BD]">حالة طلب التفعيل الحالي:</h3>
              <p className="text-xs text-[#D4AF37]">
                {activeReq.status === 'pending_review' ? 'بانتظار مراجعة المسؤول واعتماد التحويل...' :
                 activeReq.status === 'approved' ? 'تم الاعتماد والتفعيل بنجاح!' :
                 activeReq.status === 'rejected' ? 'مرفوض - يرجى المراجعة' : 'يحتاج لمراجعة إضافية'}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#F5E5BD]/80">
            <p><strong>رقم العملية المقدم:</strong> {activeReq.transaction_reference}</p>
            <p><strong>تاريخ الطلب:</strong> {activeReq.created_at}</p>
            {activeReq.admin_notes && (
              <p className="p-3 rounded-xl bg-[#3A241B] border border-[#D4AF37]/20 text-[#D4AF37]">
                <strong>ملاحظات المسؤول:</strong> {activeReq.admin_notes}
              </p>
            )}
          </div>

          {successInfo && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
              <p className="font-bold">✨ تم تسجيل طلبك وإشعار المسؤول بنجاح عبر واتساب.</p>
              <a
                href={successInfo.whatsapp_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow"
              >
                <Smartphone className="w-4 h-4" />
                <span>فتح واتساب لإرسال الإشعار للمسؤول فوراً</span>
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#24140f] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <h3 className="text-lg font-bold font-amiri text-[#F5E5BD] border-b border-[#3A241B] pb-3">
            نموذج إرسال بيانات التحويل للمراجعة
          </h3>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#D4AF37] block mb-1">رقم العملية أو مرجع التحويل:</label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="مثال: TXN-982736451"
                className="w-full bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-sm text-[#F5E5BD] placeholder-[#F5E5BD]/30 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#D4AF37] block mb-1">صورة إيصال التحويل (اختياري):</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-xs text-[#F5E5BD] file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#D4AF37] file:text-[#2B1914] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] hover:from-[#E7C779] hover:to-[#D4AF37] text-[#2B1914] font-bold text-sm shadow-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span>إرسال طلب التفعيل إلى إدارة المنصة</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
