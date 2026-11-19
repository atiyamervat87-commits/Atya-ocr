import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeUploader } from './components/HomeUploader';
import { ChatInterface } from './components/ChatInterface';
import { TranslationStudio } from './components/TranslationStudio';
import { SavedDocs } from './components/SavedDocs';
import { TestingReport } from './components/TestingReport';
import { DocumentResult } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentDoc, setCurrentDoc] = useState<DocumentResult | null>(() => {
    const saved = localStorage.getItem('smart_doc_current');
    return saved ? JSON.parse(saved) : null;
  });
  const [savedDocs, setSavedDocs] = useState<DocumentResult[]>(() => {
    const saved = localStorage.getItem('smart_doc_saved_list');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (currentDoc) {
      localStorage.setItem('smart_doc_current', JSON.stringify(currentDoc));
    } else {
      localStorage.removeItem('smart_doc_current');
    }
  }, [currentDoc]);

  useEffect(() => {
    localStorage.setItem('smart_doc_saved_list', JSON.stringify(savedDocs));
  }, [savedDocs]);

  const handleSaveDoc = (doc: DocumentResult) => {
    setSavedDocs((prev) => {
      const exists = prev.some((d) => d.id === doc.id);
      if (exists) return prev;
      return [doc, ...prev];
    });
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستند من المكتبة؟')) {
      setSavedDocs((prev) => prev.filter((d) => d.id !== id));
      if (currentDoc?.id === id) {
        setCurrentDoc(null);
      }
    }
  };

  const handleClearData = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع البيانات الحالية والمستندات؟')) {
      setCurrentDoc(null);
      setSavedDocs([]);
      localStorage.removeItem('smart_doc_current');
      localStorage.removeItem('smart_doc_saved_list');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1a0e0b] text-[#F5E5BD]">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClearData={handleClearData}
      />

      {/* Main Content View */}
      <main className="flex-1 pb-24">
        {activeTab === 'home' && (
          <HomeUploader
            currentDoc={currentDoc}
            setCurrentDoc={setCurrentDoc}
            onNavigateTab={setActiveTab}
            onSaveDoc={handleSaveDoc}
          />
        )}

        {activeTab === 'chat' && (
          <ChatInterface currentDoc={currentDoc} />
        )}

        {activeTab === 'translation' && (
          <TranslationStudio currentDoc={currentDoc} />
        )}

        {activeTab === 'saved' && (
          <SavedDocs
            savedDocs={savedDocs}
            onSelectDoc={setCurrentDoc}
            onDeleteDoc={handleDeleteDoc}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'testing' && (
          <TestingReport />
        )}
      </main>

      {/* Royal Footer */}
      <footer className="bg-[#2B1914] border-t border-[#D4AF37]/30 py-4 px-6 text-center text-xs text-[#D4AF37] no-print">
        <p>
          المستشار عطيه الهلباوي | عبقرينو — المنصة الملكية الذكية لقراءة المستندات والصور وترجمتها بالذكاء الاصطناعي © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
