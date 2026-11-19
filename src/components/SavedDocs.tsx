import React from 'react';
import { FileText, Trash2, Eye, Calendar, HardDrive } from 'lucide-react';
import { DocumentResult } from '../types';

interface SavedDocsProps {
  savedDocs: DocumentResult[];
  onSelectDoc: (doc: DocumentResult) => void;
  onDeleteDoc: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const SavedDocs: React.FC<SavedDocsProps> = ({ savedDocs, onSelectDoc, onDeleteDoc, onNavigateTab }) => {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-[#2B1914] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-amiri text-[#F5E5BD]">مكتبة المستندات المحفوظة</h2>
            <p className="text-xs text-[#D4AF37]">إدارة المستندات والملفات التي تمت معالجتها وسجل القراءة</p>
          </div>
        </div>

        <span className="text-xs px-3 py-1.5 rounded-xl bg-[#3A241B] text-[#E7C779] border border-[#D4AF37]/40 font-mono">
          إجمالي المستندات: {savedDocs.length}
        </span>
      </div>

      {savedDocs.length === 0 ? (
        <div className="bg-[#24140f] border border-[#D4AF37]/20 rounded-3xl p-12 text-center text-[#F5E5BD]/60 space-y-3">
          <div className="text-4xl">📂</div>
          <p className="text-base font-medium">لا توجد مستندات محفوظة حالياً.</p>
          <p className="text-xs text-[#F5E5BD]/40">المستندات التي تقوم برفعها ومعالجتها ستظهر هنا تلقائياً للرجوع إليها.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-[#24140f] border border-[#D4AF37]/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#D4AF37] transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-5 h-5 text-[#D4AF37] shrink-0" />
                    <h3 className="text-sm font-bold text-[#F5E5BD] truncate" title={doc.fileName}>
                      {doc.fileName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#F5E5BD]/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {doc.createdAt}
                  </span>
                  <span>الصفحات: {doc.pagesCount}</span>
                </div>

                <p className="text-xs text-[#F5E5BD]/80 line-clamp-3 font-amiri bg-[#1a0e0b] p-3 rounded-xl border border-[#D4AF37]/10">
                  {doc.text}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#3A241B]">
                <button
                  onClick={() => {
                    onSelectDoc(doc);
                    onNavigateTab('home');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E7C779] text-[#2B1914] text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow"
                >
                  <Eye className="w-4 h-4" />
                  <span>عرض وقراءة</span>
                </button>

                <button
                  onClick={() => onDeleteDoc(doc.id)}
                  className="p-1.5 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-500/40 transition cursor-pointer"
                  title="حذف المستند"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
