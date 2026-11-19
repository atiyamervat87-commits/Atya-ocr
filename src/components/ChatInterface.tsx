import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Sparkles, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { ChatMessage, DocumentResult } from '../types';

interface ChatInterfaceProps {
  currentDoc: DocumentResult | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentDoc }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: 'أهلاً بك. أنا "المستشار عطيه الهلباوي" - عبقرينو. أنا هنا لمساعدتك في قراءة المستندات، تحليل النصوص، الإجابة عن الأسئلة القانونية والتقنية، وتلخيص الملفات المرفقة بدقة تامة. كيف يمكنني خدمتك اليوم؟',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const question = textToSend || input;
    if (!question.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          documentContext: currentDoc ? `اسم المستند: ${currentDoc.fileName}\nنص المستند:\n${currentDoc.text}` : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل الرد من خادم الذكاء الاصطناعي.');
      }

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.response,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...newMessages, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء المحادثة.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('هل أنت متأكد من مسح محادثة المستشار؟')) {
      setMessages([
        {
          id: Date.now().toString(),
          role: 'model',
          content: 'تم مسح المحادثة. أنا جاهز لتلقي أسئلتك الجديدة.',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const suggestedPrompts = [
    'تلخيص المستند الحالي في نقاط رئيسية',
    'ما هي أهم التواريخ والأرقام والمبالغ المذكورة؟',
    'شرح البنود القانونية والالتزامات وردت في النص',
    'استخراج الجداول والأختام والتوقيعات بدقة',
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col h-[calc(100vh-100px)]">
      {/* Header Bar */}
      <div className="bg-[#2B1914] border border-[#D4AF37]/30 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#F5E5BD]">محادثة المستشار عطيه الهلباوي (عبقرينو)</h2>
            <p className="text-xs text-[#D4AF37]">
              {currentDoc ? `مستند نشط: ${currentDoc.fileName}` : 'جاهز للإجابة والاستشارات العامة والمستندات'}
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="px-3 py-1.5 rounded-lg bg-rose-950/80 text-rose-200 hover:bg-rose-900 border border-rose-500/40 text-xs flex items-center gap-1.5 cursor-pointer transition"
          title="مسح المحادثة"
        >
          <Trash2 className="w-4 h-4" />
          <span>مسح المحادثة</span>
        </button>
      </div>

      {/* Active Document Context Banner */}
      {currentDoc && (
        <div className="bg-[#3A241B] border border-[#D4AF37]/40 rounded-xl p-3 mb-3 flex items-center justify-between text-xs text-[#F5E5BD]">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="truncate">المستند المُرفق قيد النقاش: <strong>{currentDoc.fileName}</strong> ({currentDoc.pagesCount} صفحات)</span>
          </div>
          <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30 shrink-0">نشط في السياق</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-[#24140f] border border-[#D4AF37]/20 rounded-3xl p-4 sm:p-6 overflow-y-auto space-y-4 shadow-xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                msg.role === 'user'
                  ? 'bg-[#D4AF37] text-[#2B1914] border-[#E7C779]'
                  : 'bg-[#3A241B] text-[#D4AF37] border-[#D4AF37]/40'
              }`}
            >
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            <div
              className={`max-w-[80%] rounded-2xl p-4 shadow-md ${
                msg.role === 'user'
                  ? 'bg-[#D4AF37] text-[#2B1914] rounded-tr-none'
                  : 'bg-[#3A241B] text-[#F5E5BD] border border-[#D4AF37]/20 rounded-tl-none font-amiri text-base leading-relaxed'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div
                className={`text-[10px] mt-2 text-right ${
                  msg.role === 'user' ? 'text-[#2B1914]/70' : 'text-[#F5E5BD]/60'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3A241B] text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-[#3A241B] border border-[#D4AF37]/20 rounded-2xl p-4 text-[#F5E5BD] flex items-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
              <span>المستشار عطيه الهلباوي يفكر ويكتب الرد...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-950/90 border border-rose-500/50 rounded-2xl p-3 text-rose-200 flex items-center gap-2 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {currentDoc && (
        <div className="flex flex-wrap gap-2 my-3">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-[#3A241B] hover:bg-[#D4AF37] hover:text-[#2B1914] text-[#D4AF37] text-xs border border-[#D4AF37]/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={currentDoc ? 'اسأل المستشار عن المستند المرفق...' : 'اكتب سؤالك القانوني أو استفسارك هنا...'}
          className="flex-1 bg-[#24140f] border border-[#D4AF37]/40 rounded-2xl px-4 py-3 text-[#F5E5BD] placeholder-[#F5E5BD]/40 focus:outline-none focus:border-[#D4AF37] text-sm shadow-inner"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E7C779] hover:from-[#E7C779] hover:to-[#D4AF37] text-[#2B1914] font-bold text-sm shadow-lg transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <span>إرسال</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
