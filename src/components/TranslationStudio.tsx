import React, { useState } from 'react';
import { Languages, Copy, Check, Download, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { DocumentResult } from '../types';

interface TranslationStudioProps {
  currentDoc: DocumentResult | null;
  onActionSuccess: () => void;
}

export const TranslationStudio: React.FC<TranslationStudioProps> = ({ currentDoc, onActionSuccess }) => {
  const [sourceText, setSourceText] = useState(currentDoc ? currentDoc.text : '');
  const [targetLang, setTargetLang] = useState('الإنجليزية');
  const [sourceLang, setSourceLang] = useState('العربية');
  const [mode, setMode] = useState<'professional' | 'literal'>('professional');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          sourceLang,
          targetLang,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل عملية الترجمة.');
      }

      setTranslation(data.translation);
      onActionSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء الترجمة.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([translation], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ترجمة_${targetLang}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-[#2B1914] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-amiri text-[#F5E5BD]">استوديو الترجمة الفورية الاحترافية</h2>
            <p className="text-xs text-[#D4AF37]">ترجمة دقيقة تحافظ على الأسماء والأرقام والمبالغ مع الخصم الآمن</p>
          </div>
        </div>

        {currentDoc && (
          <button
            onClick={() => setSourceText(currentDoc.text)}
            className="px-4 py-2 rounded-xl bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs font-semibold border border-[#D4AF37]/30 transition flex items-center gap-2 cursor-pointer shadow"
          >
            <FileText className="w-4 h-4" />
            <span>استيراد نص المستند الحالي ({currentDoc.fileName})</span>
          </button>
        )}
      </div>

      <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-lg">
        <div>
          <label className="text-xs font-bold text-[#D4AF37] block mb-1">اللغة الأصلية:</label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full bg-[#1a0e0b] border border-[#D4AF37]/40 rounded-xl px-3 py-2 text-sm text-[#F5E5BD] focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="العربية">العربية</option>
            <option value="الإنجليزية">الإنجليزية</option>
            <option value="الفرنسية">الفرنسية</option>
            <option value="الألمانية">الألمانية</option>
            <option value="الإسبانية">الإسبانية</option>
            <option value="التركية">التركية</option>
            <option value="تلقائي">كشف تلقائي</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-[#D4AF37] block mb-1">اللغة المستهدفة:</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full bg-[#1a0e0b] border border-[#D4AF37]/40 rounded-xl px-3 py-2 text-sm text-[#F5E5BD] focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="الإنجليزية">الإنجليزية</option>
            <option value="العربية">العربية</option>
            <option value="الفرنسية">الفرنسية</option>
            <option value="الألمانية">الألمانية</option>
            <option value="الإسبانية">الإسبانية</option>
            <option value="التركية">التركية</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-[#D4AF37] block mb-1">أسلوب الترجمة:</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full bg-[#1a0e0b] border border-[#D4AF37]/40 rounded-xl px-3 py-2 text-sm text-[#F5E5BD] focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="professional">احترافية قانونية / مهنية</option>
            <option value="literal">حرفية دقيقة</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleTranslate}
            disabled={loading || !sourceText.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] hover:from-[#E7C779] hover:to-[#D4AF37] text-[#2B1914] font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
            <span>بدء الترجمة</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/90 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
          <div className="text-sm">{errorMsg}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-5 shadow-xl flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D4AF37]">النص الأصلي:</span>
            <span className="text-[10px] text-[#F5E5BD]/60">{sourceText.length} حرف</span>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="أدخل أو ألصق النص المراد ترجمته هنا..."
            rows={12}
            className="w-full bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-2xl p-4 text-[#F5E5BD] placeholder-[#F5E5BD]/40 focus:outline-none focus:border-[#D4AF37] font-amiri text-base resize-y shadow-inner"
          />
        </div>

        <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-5 shadow-xl flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D4AF37]">الترجمة المستهدفة ({targetLang}):</span>
            {translation && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs transition border border-[#D4AF37]/30 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1 rounded-lg bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs transition border border-[#D4AF37]/30 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-full bg-[#1a0e0b] border border-[#D4AF37]/30 rounded-2xl p-4 text-[#F5E5BD] font-amiri text-base h-[310px] overflow-y-auto whitespace-pre-wrap shadow-inner selection:bg-[#D4AF37]/30">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-[#D4AF37] gap-2">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs">جاري الترجمة الفورية والخصم الآمن...</span>
              </div>
            ) : translation ? (
              translation
            ) : (
              <span className="text-[#F5E5BD]/30 italic">ستظهر الترجمة هنا بعد النقر على زر "بدء الترجمة"...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
