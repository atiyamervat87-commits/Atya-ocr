import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeUploader } from './components/HomeUploader';
import { ChatInterface } from './components/ChatInterface';
import { TranslationStudio } from './components/TranslationStudio';
import { SavedDocs } from './components/SavedDocs';
import { TestingReport } from './components/TestingReport';
import { AuthModal } from './components/AuthModal';
import { ActivationScreen } from './components/ActivationScreen';
import { WalletView } from './components/WalletView';
import { AdminPanel } from './components/AdminPanel';
import { AiSettingsView } from './components/AiSettingsView';
import { User, DocumentResult } from './types';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [currentDoc, setCurrentDoc] = useState<DocumentResult | null>(() => {
    const saved = localStorage.getItem('atya_current_doc');
    return saved ? JSON.parse(saved) : null;
  });
  const [savedDocs, setSavedDocs] = useState<DocumentResult[]>(() => {
    const saved = localStorage.getItem('atya_saved_docs');
    return saved ? JSON.parse(saved) : [];
  });
  const [showWalletModal, setShowWalletModal] = useState(false);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error(err);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentDoc) {
      localStorage.setItem('atya_current_doc', JSON.stringify(currentDoc));
    } else {
      localStorage.removeItem('atya_current_doc');
    }
  }, [currentDoc]);

  useEffect(() => {
    localStorage.setItem('atya_saved_docs', JSON.stringify(savedDocs));
  }, [savedDocs]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setActiveTab('home');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDoc = (doc: DocumentResult) => {
    setSavedDocs((prev) => {
      const exists = prev.some((d) => d.id === doc.id);
      if (exists) return prev;
      return [doc, ...prev];
    });
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستند؟')) {
      setSavedDocs((prev) => prev.filter((d) => d.id !== id));
      if (currentDoc?.id === id) setCurrentDoc(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1a0e0b] text-[#F5E5BD] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 animate-spin text-[#D4AF37] mx-auto" />
          <p className="text-sm font-amiri">جاري التحقق من جلسة النظام الملكي...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  if (!user.is_active) {
    return (
      <div className="min-h-screen flex flex-col bg-[#1a0e0b] text-[#F5E5BD]">
        <header className="bg-[#2B1914] border-b border-[#D4AF37]/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <span className="font-bold font-amiri">المستشار عطيه الهلباوي | ATYA OCR</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-200 text-xs border border-rose-500/40"
          >
            تسجيل الخروج
          </button>
        </header>
        <main className="flex-1 py-8">
          <ActivationScreen user={user} onRefreshUser={checkAuth} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1a0e0b] text-[#F5E5BD]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onOpenWallet={() => setShowWalletModal(!showWalletModal)}
      />

      <main className="flex-1 pb-24">
        {showWalletModal ? (
          <div className="py-6">
            <div className="max-w-5xl mx-auto px-4 mb-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#D4AF37]">إدارة محفظة الحصص</h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="px-3 py-1 rounded-lg bg-[#3A241B] text-[#F5E5BD] text-xs"
              >
                العودة للرئيسية
              </button>
            </div>
            <WalletView balance={user.balance} onUpdateBalance={checkAuth} />
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeUploader
                currentDoc={currentDoc}
                setCurrentDoc={setCurrentDoc}
                onNavigateTab={setActiveTab}
                onSaveDoc={handleSaveDoc}
                onActionSuccess={checkAuth}
              />
            )}

            {activeTab === 'chat' && (
              <ChatInterface currentDoc={currentDoc} onActionSuccess={checkAuth} />
            )}

            {activeTab === 'translation' && (
              <TranslationStudio currentDoc={currentDoc} onActionSuccess={checkAuth} />
            )}

            {activeTab === 'ai_settings' && (
              <AiSettingsView />
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

            {activeTab === 'admin' && user.role === 'admin' && (
              <AdminPanel />
            )}
          </>
        )}
      </main>

      <footer className="bg-[#2B1914] border-t border-[#D4AF37]/30 py-4 px-6 text-center text-xs text-[#D4AF37] no-print">
        <p>
          المستشار عطيه الهلباوي | ATYA OCR — المزود المزدوج لـ Gemini AI © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
