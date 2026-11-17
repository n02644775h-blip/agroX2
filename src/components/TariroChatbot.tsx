import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  TariroChatMessage,
  TariroLanguage,
  TariroMatchedProduct
} from '../types';
import {
  Sprout,
  Send,
  X,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  ShoppingBag,
  Sparkles,
  AlertCircle,
  Globe2,
  MapPin,
  ChevronRight
} from 'lucide-react';

interface TariroChatbotProps {
  onSelectProductById?: (productId: string) => void;
}

const WELCOME_MESSAGE =
  "Hello! I'm TARIRO, your FarmBridge agricultural knowledge assistant. I search our curated Zimbabwean farming knowledge base and live marketplace listings to answer your questions accurately — completely free, without external AI subscriptions. What would you like to learn or check today?";

const SUGGESTED_QUESTIONS: Record<TariroLanguage, string[]> = {
  auto: [
    'How do I prepare soil for maize under Pfumvudza?',
    'What livestock fodder or tomatoes are listed on FarmBridge?',
    'How can I verify my email and upload farm produce?'
  ],
  en: [
    'Best practices for broiler vaccination & housing in Zimbabwe?',
    'What fresh produce is available on FarmBridge right now?',
    'How do I prevent Fall Armyworm early in maize?',
    'How do buyers place an order & track delivery?'
  ],
  sn: [
    'Ndingagadzirira sei munda wechibage nePfumvudza?',
    'Ndezvipi zvirimwa kana chikafu chemombe zviri kutengeswa izvozvi?',
    'Ndingachengeta sei huku dzebroiler zvakanaka?',
    'Ndingatengesa sei zvinhu zvangu paFarmBridge?'
  ],
  nd: [
    'Ngingawulungiselela njani umhlabathi womumbu ngePfumvudza?',
    'Kuyini okuthengiswayo emakethe yeFarmBridge khathesi?',
    'Ngingavikela njani izinkukhu zami emkhuhlaneni?',
    'Ngingathengisa njani izilimo zami kuFarmBridge?'
  ]
};

const createWelcomeMessage = (): TariroChatMessage => ({
  id: 'tariro-welcome',
  role: 'assistant',
  content: WELCOME_MESSAGE,
  language: 'en',
  timestamp: new Date().toISOString()
});

const TariroCrestIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <Sprout className="w-full h-full text-[#A8E635]" strokeWidth={2.2} />
  </div>
);

const renderInlineRichText = (line: string): React.ReactNode => {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-[#062B1F]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (
      ((part.startsWith('*') && part.endsWith('*')) ||
        (part.startsWith('_') && part.endsWith('_'))) &&
      part.length > 2
    ) {
      return (
        <em key={idx} className="italic text-[#0B3D2B]/85">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

const renderStructuredReply = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 break-words">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;
        if (line.startsWith('## ')) {
          return (
            <h4 key={idx} className="text-[13px] font-extrabold text-[#062B1F] pt-0.5">
              {renderInlineRichText(line.slice(3))}
            </h4>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h5 key={idx} className="text-[11px] font-extrabold uppercase tracking-wide text-[#145A38] pt-1.5">
              {renderInlineRichText(line.slice(4))}
            </h5>
          );
        }
        if (/^\d+\.\s+/.test(line)) {
          return (
            <div key={idx} className="pl-1.5 flex items-start gap-1.5 leading-relaxed">
              <span className="font-extrabold text-[#145A38] shrink-0">
                {line.match(/^\d+\./)?.[0]}
              </span>
              <span>{renderInlineRichText(line.replace(/^\d+\.\s+/, ''))}</span>
            </div>
          );
        }
        if (/^[•\-]\s+/.test(line)) {
          return (
            <div key={idx} className="pl-2 flex items-start gap-1.5 leading-relaxed">
              <span className="text-[#145A38] font-bold shrink-0">•</span>
              <span>{renderInlineRichText(line.replace(/^[•\-]\s+/, ''))}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineRichText(line)}
          </p>
        );
      })}
    </div>
  );
};

export const TariroChatbot: React.FC<TariroChatbotProps> = ({ onSelectProductById }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<TariroLanguage>('auto');
  const [messages, setMessages] = useState<TariroChatMessage[]>(() => [createWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commentTargetId, setCommentTargetId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen, messages, isLoading]);

  const handleClearChat = () => {
    setMessages([createWelcomeMessage()]);
    setCommentTargetId(null);
    setCommentDraft('');
  };

  const handleSend = async (overrideText?: string) => {
    const query = (overrideText ?? inputValue).trim();
    if (!query || isLoading) return;

    if (!overrideText) setInputValue('');

    const userMsg: TariroChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    const nextHistory = [...messages, userMsg]
      .filter(m => m.id !== 'tariro-welcome' && !m.error)
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await api.chatWithTariro({
        message: query,
        history: nextHistory.slice(0, -1),
        language,
        userId: user?.id,
        userRole: user?.role
      });

      const assistantMsg: TariroChatMessage = {
        id: res.interactionId || `tar-${Date.now()}`,
        interactionId: res.interactionId,
        role: 'assistant',
        content: res.reply,
        language: res.language,
        topic: res.topic,
        timestamp: new Date().toISOString(),
        citations: res.citations,
        matchedProducts: res.matchedProducts,
        followUpQuestions: res.followUpQuestions,
        confidenceScore: res.confidenceScore,
        confidenceBand: res.confidenceBand,
        needsClarification: res.needsClarification,
        correctedTerms: res.correctedTerms,
        lowConfidence: res.lowConfidence
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorText =
        err?.message ||
        'TARIRO could not reach the knowledge base server right now. Please check your connection and try again.';
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errorText,
          timestamp: new Date().toISOString(),
          error: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (
    msg: TariroChatMessage,
    rating: 'helpful' | 'not_helpful',
    comment?: string
  ) => {
    if (!msg.interactionId) return;
    const msgIdx = messages.findIndex(m => m.id === msg.id);
    const prevUserMsg =
      msgIdx > 0
        ? [...messages.slice(0, msgIdx)].reverse().find(m => m.role === 'user')?.content || ''
        : '';

    setMessages(prev =>
      prev.map(m => (m.id === msg.id ? { ...m, feedbackGiven: rating } : m))
    );
    if (rating === 'not_helpful' && !comment) {
      setCommentTargetId(msg.id);
    } else {
      setCommentTargetId(null);
      setCommentDraft('');
    }

    try {
      await api.submitTariroFeedback({
        interactionId: msg.interactionId,
        userId: user?.id,
        userRole: user?.role,
        question: prevUserMsg,
        answerSnippet: msg.content.slice(0, 260),
        rating,
        comment,
        language: msg.language
      });
    } catch {
      // keep optimistic feedback badge
    }
  };

  const handleProductCardClick = (prod: TariroMatchedProduct) => {
    if (onSelectProductById) {
      onSelectProductById(prod.id);
    }
  };

  const starters = SUGGESTED_QUESTIONS[language] || SUGGESTED_QUESTIONS.auto;
  const hasUserMessages = messages.some(m => m.role === 'user');

  return (
    <>
      {/* Floating Homescreen Launcher Button */}
      {!isOpen && (
        <button
          id="tariro-floating-launcher-btn"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open TARIRO AI Agricultural Assistant"
          className="fixed bottom-36 right-4 md:bottom-6 md:right-6 z-40 group flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full bg-linear-to-r from-[#062B1F] via-[#0B3D2B] to-[#145A38] text-white shadow-[0_12px_32px_rgba(6,43,31,0.42)] border border-[#A8E635]/45 hover:border-[#A8E635] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[#145A38] border border-[#A8E635]/60 shadow-inner">
            <TariroCrestIcon className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#A8E635] ring-2 ring-[#062B1F] animate-pulse" />
          </span>
          <div className="text-left leading-tight">
            <div className="text-xs font-extrabold tracking-tight text-white flex items-center gap-1">
              <span>TARIRO</span>
              <Sparkles className="w-3 h-3 text-[#A8E635]" />
            </div>
            <div className="text-[10px] text-[#DFF4E4]/85 font-medium">
              Agri Knowledge &amp; Market Guide
            </div>
          </div>
        </button>
      )}

      {/* Floating Popup Liquid Glass Chat Window */}
      {isOpen && (
        <div
          id="tariro-chat-popup"
          role="dialog"
          aria-label="TARIRO Agricultural Knowledge Assistant"
          className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-6 md:bottom-6 z-50 sm:w-[420px] max-w-[440px] h-[76dvh] sm:h-[610px] max-h-[82vh] flex flex-col rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(6,43,31,0.48)] border border-white/45 bg-[#F8FAF7]/95 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-linear-to-r from-[#062B1F] via-[#0B3D2B] to-[#145A38] text-white border-b border-white/15 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/12 border border-[#A8E635]/50 flex items-center justify-center shrink-0 shadow-sm">
                  <TariroCrestIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm tracking-tight text-white">TARIRO</h3>
                    <span className="px-1.5 py-0.5 rounded-md bg-[#A8E635] text-[#062B1F] text-[9px] font-black uppercase tracking-wide">
                      AGRI KB
                    </span>
                  </div>
                  <p className="text-[10px] text-[#DFF4E4]/80 truncate">
                    Growing Hope. Growing Futures.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear chat history"
                  aria-label="Clear chat"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#DFF4E4] hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Minimize TARIRO"
                  aria-label="Close TARIRO"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#DFF4E4] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Multilingual Switcher (English, Shona, Ndebele) */}
            <div className="flex items-center gap-1 text-[10px] bg-black/20 p-1 rounded-xl">
              <Globe2 className="w-3 h-3 text-[#A8E635] ml-1.5 mr-0.5 shrink-0" />
              {(
                [
                  { id: 'auto', label: 'Auto' },
                  { id: 'en', label: 'English' },
                  { id: 'sn', label: 'Shona' },
                  { id: 'nd', label: 'Ndebele' }
                ] as const
              ).map(lang => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all cursor-pointer ${
                    language === lang.id
                      ? 'bg-[#A8E635] text-[#062B1F] shadow-2xs'
                      : 'text-[#DFF4E4]/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-linear-to-b from-[#F3F8F4] to-[#F8FAF7]">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[#062B1F] text-white rounded-br-sm'
                        : msg.error
                          ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-bl-sm'
                          : 'bg-white border border-[#062B1F]/10 text-[#062B1F] rounded-bl-sm'
                    }`}
                  >
                    {msg.error && (
                      <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>TARIRO Connection Notice</span>
                      </div>
                    )}

                    {isUser ? (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    ) : (
                      renderStructuredReply(msg.content)
                    )}

                    {/* Cited Knowledge Library Excerpts */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#062B1F]/10 space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#145A38] flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>Agricultural Library Sources</span>
                          </span>
                          {typeof msg.confidenceScore === 'number' && msg.confidenceScore > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#DFF4E4] text-[#145A38] text-[9px] font-bold">
                              {Math.round(msg.confidenceScore * 100)}% Match
                            </span>
                          )}
                        </div>
                        {msg.citations.map((cit) => (
                          <div
                            key={cit.docId}
                            className="p-2 rounded-xl bg-[#DFF4E4]/65 border border-[#145A38]/15 text-[11px]"
                          >
                            <div className="font-bold text-[#062B1F]">{cit.title}</div>
                            <div className="text-[10px] text-[#145A38] font-semibold">
                              {cit.category}
                              {cit.sourceOrganization ? ` · ${cit.sourceOrganization}` : ''}
                              {cit.reviewedAt ? ` · Reviewed ${cit.reviewedAt}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Real Marketplace Matches */}
                    {msg.matchedProducts && msg.matchedProducts.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#062B1F]/10 space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#145A38] flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" />
                          <span>Live FarmBridge Listings</span>
                        </div>
                        {msg.matchedProducts.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => handleProductCardClick(prod)}
                            className="w-full text-left p-2 rounded-xl bg-[#F8FAF7] hover:bg-[#DFF4E4]/70 border border-[#062B1F]/12 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            {prod.image && (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#DFF4E4]"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[#062B1F] text-[11px] truncate">
                                {prod.name}
                              </div>
                              <div className="text-[10px] text-[#0B3D2B]/75 truncate">
                                {prod.farmName} · <MapPin className="w-2.5 h-2.5 inline" /> {prod.city}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-black text-[#145A38] text-[11px] tabular-nums">
                                ${prod.price.toFixed(2)}/{prod.unit}
                              </div>
                              <span className="text-[9px] text-[#145A38] inline-flex items-center font-bold">
                                View <ChevronRight className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Suggested Follow-Up Questions */}
                    {!isUser && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#062B1F]/10 space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#145A38]">
                          Follow-Up Questions
                        </div>
                        <div className="flex flex-col gap-1">
                          {msg.followUpQuestions.map((fq) => (
                            <button
                              key={fq}
                              type="button"
                              onClick={() => handleSend(fq)}
                              className="text-left px-2.5 py-1.5 rounded-xl bg-[#F2F7F3] hover:bg-[#DFF4E4] border border-[#145A38]/15 text-[11px] font-semibold text-[#062B1F] transition-colors cursor-pointer flex items-center justify-between gap-2"
                            >
                              <span className="truncate">{fq}</span>
                              <ChevronRight className="w-3 h-3 text-[#145A38] shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Helpfulness Feedback Controls */}
                  {!isUser && msg.interactionId && !msg.error && (
                    <div className="flex flex-col items-start gap-1.5 px-1">
                      <div className="flex items-center gap-2 text-[10px] text-[#0B3D2B]/60">
                        <span>Helpful?</span>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg, 'helpful')}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            msg.feedbackGiven === 'helpful'
                              ? 'bg-[#DFF4E4] text-[#145A38]'
                              : 'hover:bg-[#062B1F]/8 text-[#0B3D2B]/65'
                          }`}
                          aria-label="Mark answer helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg, 'not_helpful')}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            msg.feedbackGiven === 'not_helpful'
                              ? 'bg-rose-100 text-rose-700'
                              : 'hover:bg-[#062B1F]/8 text-[#0B3D2B]/65'
                          }`}
                          aria-label="Mark answer needs improvement"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                        {msg.topic && (
                          <span className="text-[9px] font-semibold text-[#145A38]/80">
                            · {msg.topic}
                          </span>
                        )}
                      </div>

                      {commentTargetId === msg.id && (
                        <div className="flex items-center gap-1.5 w-64">
                          <input
                            type="text"
                            value={commentDraft}
                            onChange={e => setCommentDraft(e.target.value)}
                            placeholder="What could TARIRO improve?"
                            className="flex-1 px-2.5 py-1 rounded-lg bg-white border border-[#062B1F]/15 text-[11px] text-[#062B1F]"
                          />
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg, 'not_helpful', commentDraft)}
                            className="px-2 py-1 rounded-lg bg-[#062B1F] text-[#A8E635] text-[10px] font-bold cursor-pointer"
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Suggested Starter Prompts */}
            {!hasUserMessages && !isLoading && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#145A38]/80 px-1">
                  Suggested Questions
                </div>
                <div className="flex flex-col gap-1.5">
                  {starters.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="text-left px-3 py-2 rounded-xl bg-white/90 hover:bg-[#DFF4E4] border border-[#145A38]/15 text-[11px] font-semibold text-[#062B1F] transition-colors cursor-pointer shadow-2xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-white border border-[#062B1F]/10 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-xs flex items-center gap-2 text-xs text-[#0B3D2B]">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#145A38] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#145A38] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#145A38] animate-bounce" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#145A38]">
                    TARIRO is researching...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-[#062B1F]/10 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              id="tariro-chat-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder={
                language === 'sn'
                  ? 'Bvunza TARIRO nezvekurima kana musika...'
                  : language === 'nd'
                    ? 'Buza uTARIRO ngezolimo loba imakethe...'
                    : 'Ask TARIRO in English, Shona, or Ndebele...'
              }
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[#F4F8F5] border border-[#062B1F]/15 text-xs text-[#062B1F] placeholder:text-[#0B3D2B]/45 focus:outline-hidden focus:ring-2 focus:ring-[#145A38]/25 disabled:opacity-60"
            />
            <button
              id="tariro-chat-send-btn"
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message to TARIRO"
              className="p-2.5 rounded-2xl bg-linear-to-br from-[#062B1F] to-[#145A38] text-[#A8E635] shadow-md hover:opacity-95 active:scale-95 transition-all disabled:opacity-45 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
