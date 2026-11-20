import React, { useState, useEffect } from 'react';
import { Key, Shield, CheckCircle2, XCircle, RefreshCw, AlertCircle, Trash2, Cpu, HelpCircle, Save } from 'lucide-react';

export const AiSettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<'platform' | 'byok'>('platform');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState('none');
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [platformAvailable, setPlatformAvailable] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-settings');
      const data = await res.json();
      if (res.ok && data.success) {
        setProvider(data.settings.provider || 'platform');
        setKeyStatus(data.settings.key_status || 'none');
        setLastTestedAt(data.settings.last_tested_at);
        setPlatformAvailable(data.platform_available);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/ai-settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          api_key: apiKeyInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حفظ الإعدادات.');
      }

      setMsg({ type: 'success', text: data.message || 'تم الحفظ بنجاح.' });
      setKeyStatus(data.key_status || 'valid');
      setApiKeyInput('');
      fetchSettings();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'حدث خطأ أثناء الحفظ.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestKey = async () => {
    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/ai-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKeyInput }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل اختبار المفتاح.');
      }

      setMsg({ type: 'success', text: data.message });
      setKeyStatus('valid');
      fetchSettings();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
      setKeyStatus('invalid');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!window.confirm('هل أنت متأكد من حذف مفتاحك الشخصي والتبديل لمفتاح المنصة؟')) return;

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/ai-settings/delete', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setMsg({ type: 'success', text: data.message });
      setProvider('platform');
      setApiKeyInput('');
      setKeyStatus('none');
      fetchSettings();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-[#D4AF37]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p className="text-xs">جاري تحميل إعدادات الذكاء الاصطناعي...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-[#2B1914] border border-[#D4AF37]/40 rounded-3xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-amiri text-[#F5E5BD]">إعدادات الذكاء الاصطناعي (مزود خدمة Gemini)</h2>
            <p className="text-xs text-[#D4AF37]">اختر بين استخدام مفتاحك الشخصي (BYOK) أو مفتاح المنصة (مع خصم الحصص)</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Provider Selector Form */}
      <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform Option */}
            <div
              onClick={() => setProvider('platform')}
              className={`border rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                provider === 'platform' ? 'bg-[#3A241B] border-[#D4AF37] shadow-lg' : 'bg-[#1a0e0b] border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[#F5E5BD]">
                  <Shield className="w-5 h-5 text-[#D4AF37]" />
                  <span>مفتاح المنصة (Platform Key)</span>
                </div>
                <input
                  type="radio"
                  name="provider_choice"
                  checked={provider === 'platform'}
                  onChange={() => setProvider('platform')}
                  className="accent-[#D4AF37]"
                />
              </div>
              <p className="text-xs text-[#F5E5BD]/70 leading-relaxed">
                استخدام مفتاح Google Gemini المملوك للمنصة. يتم خصم حصص الاستهلاك مباشرة من رصيد محفظة الحصص الخاصة بك (OCR = 1، ترجمة = 1، محادثة = 0.5).
              </p>
              <span className={`text-[10px] px-2.5 py-1 rounded-full w-fit font-bold ${
                platformAvailable ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300 border border-rose-500/30'
              }`}>
                {platformAvailable ? 'الحالة: مفتاح المنصة جاهز ومتاح' : 'الحالة: مفتاح المنصة غير مهيأ'}
              </span>
            </div>

            {/* BYOK Option */}
            <div
              onClick={() => setProvider('byok')}
              className={`border rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                provider === 'byok' ? 'bg-[#3A241B] border-[#D4AF37] shadow-lg' : 'bg-[#1a0e0b] border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[#F5E5BD]">
                  <Key className="w-5 h-5 text-[#D4AF37]" />
                  <span>مفتاح Gemini الخاص بي (BYOK)</span>
                </div>
                <input
                  type="radio"
                  name="provider_choice"
                  checked={provider === 'byok'}
                  onChange={() => setProvider('byok')}
                  className="accent-[#D4AF37]"
                />
              </div>
              <p className="text-xs text-[#F5E5BD]/70 leading-relaxed">
                استخدام مفتاح Gemini الخاص بك. يتم إرسال الطلبات مباشرة بمفتاحك الشخصي **دون خصم أي حصص** من محفظتك الداخلية. تُحاسب لدى Google مباشرة.
              </p>
              <span className={`text-[10px] px-2.5 py-1 rounded-full w-fit font-bold ${
                keyStatus === 'valid' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                keyStatus === 'invalid' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                'bg-amber-950 text-amber-300 border border-amber-500/30'
              }`}>
                {keyStatus === 'valid' ? 'المفتاح الشخصي: محفوظ وصالح ✓' :
                 keyStatus === 'invalid' ? 'المفتاح الشخصي: غير صالح ✕' : 'المفتاح الشخصي: غير مضاف'}
              </span>
            </div>
          </div>

          {/* BYOK Input Field */}
          {provider === 'byok' && (
            <div className="space-y-3 bg-[#1a0e0b] p-5 rounded-2xl border border-[#D4AF37]/30">
              <label className="text-xs font-bold text-[#D4AF37] block">أدخل مفتاح Gemini الشخصي (يُخزن مشفراً بالكامل على الخادم بـ AES-256-GCM):</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-[#24140f] border border-[#D4AF37]/40 rounded-xl px-4 py-2.5 text-sm text-[#F5E5BD] placeholder-[#F5E5BD]/30 focus:outline-none focus:border-[#D4AF37] font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={actionLoading || !apiKeyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs font-bold border border-[#D4AF37]/40 transition cursor-pointer disabled:opacity-50"
                >
                  اختبار الاتصال
                </button>
              </div>
              {lastTestedAt && <p className="text-[11px] text-[#F5E5BD]/50">آخر اختبار اتصال: {lastTestedAt}</p>}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#3A241B]">
            {provider === 'byok' && keyStatus === 'valid' && (
              <button
                type="button"
                onClick={handleDeleteKey}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-200 text-xs font-bold border border-rose-500/40 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف المفتاح الشخصي</span>
              </button>
            )}

            <button
              type="submit"
              disabled={actionLoading}
              className="py-3 px-8 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] hover:from-[#E7C779] hover:to-[#D4AF37] text-[#2B1914] font-bold text-sm shadow-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50 mr-auto"
            >
              {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ إعدادات المزود</span>
            </button>
          </div>
        </form>
      </div>

      {/* Operation Logs */}
      <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-[#F5E5BD] border-b border-[#3A241B] pb-3 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
          <span>سجل عمليات الذكاء الاصطناعي والمزود المستخدم</span>
        </h3>

        {logs.length === 0 ? (
          <p className="text-xs text-[#F5E5BD]/60 text-center py-6">لا توجد عمليات مسجلة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#3A241B] text-[#D4AF37]">
                  <th className="py-2.5 px-3">الخدمة</th>
                  <th className="py-2.5 px-3">المزود</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3">التفاصيل</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A241B]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1a0e0b]/50 transition">
                    <td className="py-3 px-3 font-bold text-[#F5E5BD]">{log.service_name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.provider === 'byok' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' : 'bg-blue-950 text-blue-300 border border-blue-500/30'}`}>
                        {log.provider === 'byok' ? 'مفتاح شخصي (BYOK)' : 'مفتاح المنصة'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300 border border-rose-500/30'}`}>
                        {log.status === 'success' ? 'ناجح' : 'فاشل'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#F5E5BD]/70 max-w-xs truncate" title={log.details}>{log.details}</td>
                    <td className="py-3 px-3 text-[#F5E5BD]/50">{log.created_at}</td>
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
