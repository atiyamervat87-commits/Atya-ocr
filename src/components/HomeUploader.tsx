import React, { useState, useRef } from 'react';
import { Upload, FileText, Copy, Check, Printer, Download, Languages, MessageSquare, RefreshCw, AlertCircle, FileCheck } from 'lucide-react';
import { DocumentResult } from '../types';

interface HomeUploaderProps {
  currentDoc: DocumentResult | null;
  setCurrentDoc: (doc: DocumentResult | null) => void;
  onNavigateTab: (tab: string) => void;
  onSaveDoc: (doc: DocumentResult) => void;
  onActionSuccess: () => void;
}

export const HomeUploader: React.FC<HomeUploaderProps> = ({ currentDoc, setCurrentDoc, onNavigateTab, onSaveDoc, onActionSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');
    setProgressText('جاري رفع المستند وقراءته عبر محرك OCR مع الخصم الآمن للحصص...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', 'قم بقراءة كامل المستند أو الصورة بدقة استثنائية، مستخرجاً جميع النصوص، الأرقام، التواريخ، الجداول، والأختام بدقة متناهية. لا تختلق أي شيء، وضع علامة [غير واضح] عند تعذر قراءة أي جزء.');

    try {
      const token = localStorage.getItem('atya_token');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل معالجة الملف.');
      }

      const newDoc: DocumentResult = {
        id: Date.now().toString(),
        fileName: file.name,
        text: data.text,
        pagesCount: data.pagesCount || 1,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        createdAt: new Date().toLocaleString('ar-EG'),
        mimeType: file.type,
      };

      setCurrentDoc(newDoc);
      onSaveDoc(newDoc);
      onActionSuccess();
      setProgressText('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء معالجة المستند.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyFullText = () => {
    if (!currentDoc) return;
    navigator.clipboard.writeText(currentDoc.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!currentDoc) return;
    const blob = new Blob([currentDoc.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.fileName}_مستخرج.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDocx = () => {
    if (!currentDoc) return;
    const htmlContent = `
      <html dir="rtl" lang="ar">
      <head><meta charset="utf-8"><title>${currentDoc.fileName}</title></head>
      <body style="font-family: Cairo, Arial, sans-serif; padding: 20px;">
        <h1 style="color: #2B1914;">${currentDoc.fileName}</h1>
        <p><strong>تاريخ المعالجة:</strong> ${currentDoc.createdAt}</p>
        <hr/>
        <div style="white-space: pre-wrap; line-height: 1.8;">${currentDoc.text}</div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.fileName}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-br from-[#2B1914] to-[#3A241B] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] text-3xl mb-4 shadow-inner">
          📜
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-amiri text-[#F5E5BD] mb-3">
          محرك القراءة الذكي ATYA OCR
        </h2>
        <p className="text-sm sm:text-base text-[#F5E5BD]/80 max-w-2xl mx-auto leading-relaxed">
          ارفع أي مستند (PDF, Word, Excel, TXT) أو صورة لاستخراج النصوص بدقة استثنائية مع الخصم الآمن من رصيد حصص الذكاء الاصطناعي.
        </p>

        <div className="mt-6 max-w-xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx,.csv,.jpg,.jpeg,.png,.webp,.tiff,.bmp"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] hover:from-[#E7C779] hover:to-[#D4AF37] text-[#2B1914] font-bold text-base shadow-xl transition flex items-center justify-center gap-3 cursor-pointer border border-[#F5E5BD] disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>{progressText}</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span>اختر مستندًا أو صورة للرفع وقراءة OCR</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-[#F5E5BD]/60 mt-2">
            يدعم: PDF, DOCX, XLSX, TXT, CSV, JPG, PNG حتى 25 ميجابايت (تكلفة: 1 حصة)
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/90 border border-rose-500/50 rounded-2xl p-4 text-rose-200 flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-6 h-6 shrink-0 text-rose-400" />
          <div className="text-sm">{errorMsg}</div>
        </div>
      )}

      {currentDoc ? (
        <div className="bg-[#24140f] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3A241B]">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-lg font-bold text-[#F5E5BD]">{currentDoc.fileName}</h3>
              </div>
              <p className="text-xs text-[#F5E5BD]/60 mt-1">
                تاريخ المعالجة: {currentDoc.createdAt} | الصفحات: {currentDoc.pagesCount} | الحجم: {currentDoc.fileSize || 'غير معروف'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyFullText}
                className="px-3 py-1.5 rounded-lg bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs font-semibold transition border border-[#D4AF37]/30 flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
              </button>

              <button
                onClick={handleDownloadTxt}
                className="px-3 py-1.5 rounded-lg bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs font-semibold transition border border-[#D4AF37]/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل TXT</span>
              </button>

              <button
                onClick={handleExportDocx}
                className="px-3 py-1.5 rounded-lg bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs font-semibold transition border border-[#D4AF37]/30 flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>تصدير DOCX</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs font-semibold transition border border-[#D4AF37]/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>

              <button
                onClick={() => onNavigateTab('translation')}
                className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E7C779] text-[#2B1914] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Languages className="w-4 h-4" />
                <span>ترجمة النص</span>
              </button>

              <button
                onClick={() => onNavigateTab('chat')}
                className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E7C779] text-[#2B1914] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <MessageSquare className="w-4 h-4" />
                <span>اسأل المستشار عنه</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#D4AF37] block">النص المستخرج والمحلل بدقة:</label>
            <div className="bg-[#1a0e0b] border border-[#D4AF37]/20 rounded-2xl p-4 sm:p-6 text-[#F5E5BD] font-amiri text-base sm:text-lg leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto selection:bg-[#D4AF37]/40">
              {currentDoc.text}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#24140f] border border-[#D4AF37]/20 rounded-3xl p-12 text-center text-[#F5E5BD]/60 space-y-3">
          <div className="text-4xl">📂</div>
          <p className="text-base font-medium">لم يتم رفع أي مستند بعد.</p>
          <p className="text-xs text-[#F5E5BD]/40">قم برفع ملف أو صورة أعلاه لبدء قراءة OCR.</p>
        </div>
      )}
    </div>
  );
};
