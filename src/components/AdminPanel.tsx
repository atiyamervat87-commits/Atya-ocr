import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, CheckCircle, XCircle, RefreshCw, AlertCircle, Settings, FileText, Smartphone } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'settings' | 'logs'>('requests');
  const [actionNotes, setActionNotes] = useState<{ [key: number]: string }>({});

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'فشل جلب بيانات لوحة التحكم الإدارية.');
      }
      setData(json);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تحميل لوحة المسؤول.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleActivationAction = async (requestId: number, action: 'approve' | 'reject' | 'needs_review') => {
    const notes = actionNotes[requestId] || '';
    try {
      const res = await fetch('/api/admin/activation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action, notes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'فشل تنفيذ الإجراء.');
      }
      fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !data.settings) return;

    try {
      const settingsArray = data.settings.map((s: any) => ({ key: s.key, value: s.value }));
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArray }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      alert('تم حفظ الإعدادات بنجاح.');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setData((prev: any) => ({
      ...prev,
      settings: prev.settings.map((s: any) => s.key === key ? { ...s, value } : s),
    }));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-[#D4AF37] flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <p className="text-sm">جاري تحميل لوحة المسؤول الملكية...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-rose-950/90 border border-rose-500/50 rounded-2xl p-6 text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-rose-400 shrink-0" />
          <div>
            <h3 className="font-bold text-base">خطأ في الصلاحيات أو الخادم</h3>
            <p className="text-xs mt-1">{errorMsg}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-[#2B1914] border border-[#D4AF37]/40 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-amiri text-[#F5E5BD]">لوحة المسؤول والإدارة العامة</h2>
            <p className="text-xs text-[#D4AF37]">مراجعة طلبات التفعيل، إدارة المستخدمين، وتعديل إعدادات المحافظ والأرقام</p>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-[#1a0e0b] p-1.5 rounded-2xl border border-[#D4AF37]/30">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'requests' ? 'bg-[#D4AF37] text-[#2B1914]' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
            }`}
          >
            طلبات التفعيل ({data.stats.pending_requests_count})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'users' ? 'bg-[#D4AF37] text-[#2B1914]' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
            }`}
          >
            العملاء ({data.users.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'settings' ? 'bg-[#D4AF37] text-[#2B1914]' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
            }`}
          >
            إعدادات النظام والأرقام
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'logs' ? 'bg-[#D4AF37] text-[#2B1914]' : 'text-[#F5E5BD] hover:bg-[#3A241B]'
            }`}
          >
            سجل التدقيق والإشعارات
          </button>
        </div>
      </div>

      {/* Tab 1: Activation Requests */}
      {activeTab === 'requests' && (
        <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-[#F5E5BD] border-b border-[#3A241B] pb-3">
            طلبات التفعيل المقدمة (رسوم 500 جنيه)
          </h3>

          {data.pending_requests.length === 0 ? (
            <p className="text-xs text-[#F5E5BD]/60 text-center py-8">لا توجد طلبات تفعيل بانتظار المراجعة حالياً.</p>
          ) : (
            <div className="space-y-4">
              {data.pending_requests.map((req: any) => (
                <div key={req.id} className="bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4 shadow">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-[#F5E5BD]">
                    <div>
                      <span className="text-[#D4AF37] block mb-1 font-bold">اسم العميل:</span>
                      <strong>{req.full_name}</strong> ({req.phone})
                    </div>
                    <div>
                      <span className="text-[#D4AF37] block mb-1 font-bold">المبلغ ورقم المحفظة:</span>
                      {req.amount} جنيه (إلى: {req.wallet_number})
                    </div>
                    <div>
                      <span className="text-[#D4AF37] block mb-1 font-bold">رقم العملية (المرجع):</span>
                      <span className="font-mono bg-[#3A241B] px-2 py-1 rounded text-emerald-300">{req.transaction_reference}</span>
                    </div>
                    <div>
                      <span className="text-[#D4AF37] block mb-1 font-bold">تاريخ الطلب:</span>
                      {req.created_at}
                    </div>
                  </div>

                  {req.receipt_image && (
                    <div>
                      <span className="text-xs text-[#D4AF37] block mb-1">صورة الإيصال المرفق:</span>
                      <img src={req.receipt_image} alt="إيصال التحويل" className="max-h-48 rounded-xl border border-[#D4AF37]/40 object-contain" />
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#3A241B] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <input
                      type="text"
                      placeholder="ملاحظات المسؤول أو سبب الرفض..."
                      value={actionNotes[req.id] || ''}
                      onChange={(e) => setActionNotes({ ...actionNotes, [req.id]: e.target.value })}
                      className="w-full sm:w-1/2 bg-[#24140f] border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs text-[#F5E5BD] placeholder-[#F5E5BD]/40 focus:outline-none focus:border-[#D4AF37]"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleActivationAction(req.id, 'approve')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>تأكيد التفعيل وفتح الحساب</span>
                      </button>

                      <button
                        onClick={() => handleActivationAction(req.id, 'reject')}
                        className="px-4 py-2 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رفض الطلب</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-[#F5E5BD] border-b border-[#3A241B] pb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            <span>قائمة عملاء المنصة المسجلين</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#3A241B] text-[#D4AF37]">
                  <th className="py-2.5 px-3">#ID</th>
                  <th className="py-2.5 px-3">الاسم الكامل</th>
                  <th className="py-2.5 px-3">رقم الهاتف</th>
                  <th className="py-2.5 px-3">الدور</th>
                  <th className="py-2.5 px-3">حالة التفعيل</th>
                  <th className="py-2.5 px-3">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A241B]">
                {data.users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-[#1a0e0b]/50 transition">
                    <td className="py-3 px-3 font-mono">{u.id}</td>
                    <td className="py-3 px-3 font-bold text-[#F5E5BD]">{u.full_name}</td>
                    <td className="py-3 px-3 font-mono">{u.phone}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' : 'bg-[#3A241B] text-[#F5E5BD]'}`}>
                        {u.role === 'admin' ? 'مسؤول (Admin)' : 'عميل'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300 border border-rose-500/30'}`}>
                        {u.is_active ? 'مفعل' : 'غير مفعل'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#F5E5BD]/60">{u.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Settings */}
      {activeTab === 'settings' && (
        <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-[#F5E5BD] border-b border-[#3A241B] pb-3 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#D4AF37]" />
            <span>إعدادات النظام، رقم محفظة التحويل، وتكاليف الحصص</span>
          </h3>

          <form onSubmit={handleUpdateSettings} className="space-y-4 max-w-2xl">
            {data.settings.map((s: any) => (
              <div key={s.key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-2xl bg-[#1a0e0b] border border-[#D4AF37]/20">
                <div>
                  <span className="text-xs font-bold text-[#F5E5BD] block">{s.key}</span>
                  <span className="text-[10px] text-[#D4AF37]">مفتاح إعداد النظام في قاعدة البيانات</span>
                </div>
                <input
                  type="text"
                  value={s.value}
                  onChange={(e) => handleSettingChange(s.key, e.target.value)}
                  className="w-full sm:w-64 bg-[#24140f] border border-[#D4AF37]/40 rounded-xl px-3 py-2 text-sm text-[#F5E5BD] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            ))}

            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] text-[#2B1914] font-bold text-sm shadow-xl transition cursor-pointer"
            >
              حفظ جميع التعديلات الإدارية
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Logs & Audit */}
      {activeTab === 'logs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#F5E5BD] border-b border-[#3A241B] pb-3">سجل التدقيق الإداري (Audit Logs)</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.audit_logs.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-[#1a0e0b] border border-[#D4AF37]/20 text-xs space-y-1">
                  <div className="flex justify-between text-[#D4AF37]">
                    <strong>{log.action}</strong>
                    <span>{log.created_at}</span>
                  </div>
                  <p className="text-[#F5E5BD]">{log.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#F5E5BD] border-b border-[#3A241B] pb-3 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>سجل إشعارات واتساب</span>
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.notifications.map((n: any) => (
                <div key={n.id} className="p-3 rounded-xl bg-[#1a0e0b] border border-[#D4AF37]/20 text-xs space-y-1">
                  <div className="flex justify-between text-emerald-400">
                    <span>إلى: {n.recipient}</span>
                    <span>{n.created_at}</span>
                  </div>
                  <p className="text-[#F5E5BD] whitespace-pre-wrap font-amiri">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
