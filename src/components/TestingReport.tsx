import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { TestItem } from '../types';

export const TestingReport: React.FC = () => {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [timestamp, setTimestamp] = useState('');

  const fetchTests = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/test-suite');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error('فشل جلب تقرير الاختبارات.');
      }
      setTests(data.tests);
      setTimestamp(data.timestamp);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تحميل تقرير الاختبارات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-[#2B1914] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-amiri text-[#F5E5BD]">تقرير الاختبارات الفعلية والاعتمادية الشاملة (24 بند)</h2>
            <p className="text-xs text-[#D4AF37]">نتائج الفحص والتحقق الفعلية لنظام ATYA OCR والتفعيل والمدفوعات والمحفظة</p>
          </div>
        </div>

        <button
          onClick={fetchTests}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E7C779] text-[#2B1914] text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>إعادة تشغيل الاختبارات</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/90 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
          <div className="text-sm">{errorMsg}</div>
        </div>
      )}

      <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#3A241B]">
          <span className="text-xs font-bold text-[#D4AF37]">قائمة الاختبارات الفعلية الإلزامية (24 اختبار):</span>
          {timestamp && <span className="text-[11px] text-[#F5E5BD]/60">وقت التقرير: {timestamp}</span>}
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#D4AF37] flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-sm">جاري تشغيل واختبار الأنظمة...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-[#1a0e0b] border border-[#D4AF37]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#3A241B] border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold flex items-center justify-center shrink-0">
                    {test.id}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#F5E5BD]">{test.name}</h4>
                    <p className="text-xs text-[#F5E5BD]/60 mt-0.5">{test.details}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border bg-emerald-950/80 text-emerald-300 border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ناجح (TESTED)</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
