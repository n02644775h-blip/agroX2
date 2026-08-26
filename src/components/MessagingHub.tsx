import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Message, User, Product, Conversation } from '../types';
import {
  Send,
  MessageSquare,
  Search,
  CheckCheck,
  MapPin,
  Clock,
  ShieldCheck,
  Package
} from 'lucide-react';

interface MessagingHubProps {
  initialRecipientId?: string | null;
  initialProductId?: string | null;
}

export const MessagingHub: React.FC<MessagingHubProps> = ({
  initialRecipientId,
  initialProductId
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeRecipient, setActiveRecipient] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [attachedProduct, setAttachedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const [convs, usersList] = await Promise.all([
        api.getConversations(user.id).catch(() => []),
        api.getUsers().catch(() => [])
      ]);
      setConversations(convs);
      setAllUsers(usersList);

      if (initialProductId) {
        api.getProduct(initialProductId).then(p => setAttachedProduct(p)).catch(() => {});
      }

      if (initialRecipientId) {
        const foundUser = usersList.find(u => u.id === initialRecipientId);
        if (foundUser) setActiveRecipient(foundUser);

        const foundConv = convs.find(c =>
          c.participants.some(p => p.id === initialRecipientId)
        );
        if (foundConv) {
          setActiveConvId(foundConv.id);
          const msgs = await api.getMessages(foundConv.id).catch(() => []);
          setMessages(msgs);
        }
      } else if (convs.length > 0 && !activeConvId) {
        const firstConv = convs[0];
        setActiveConvId(firstConv.id);
        const partner = firstConv.participants.find(p => p.id !== user.id);
        if (partner) {
          const partnerUser = usersList.find(u => u.id === partner.id) || null;
          setActiveRecipient(partnerUser);
        }
        const msgs = await api.getMessages(firstConv.id).catch(() => []);
        setMessages(msgs);
      }
    } catch (err) {
      console.error('Failed to load messaging data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      if (activeConvId) {
        const msgs = await api.getMessages(activeConvId).catch(() => []);
        setMessages(msgs);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [user, initialRecipientId, activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = async (conv: Conversation) => {
    if (!user) return;
    setActiveConvId(conv.id);
    const partner = conv.participants.find(p => p.id !== user.id);
    if (partner) {
      const partnerUser = allUsers.find(u => u.id === partner.id) || {
        id: partner.id,
        name: partner.name,
        email: '',
        role: partner.role,
        avatar: partner.avatar,
        status: 'active',
        location: { province: '', city: '' },
        createdAt: ''
      };
      setActiveRecipient(partnerUser);
    }
    const msgs = await api.getMessages(conv.id).catch(() => []);
    setMessages(msgs);
    api.markConversationRead(conv.id, user.id).catch(() => {});
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRecipient || !newMessageText.trim()) return;

    try {
      const res = await api.sendMessage({
        conversationId: activeConvId || undefined,
        senderId: user.id,
        recipientId: activeRecipient.id,
        text: newMessageText.trim(),
        productId: attachedProduct?.id,
        productSnippet: attachedProduct ? {
          name: attachedProduct.name,
          price: attachedProduct.price,
          unit: attachedProduct.unit,
          image: attachedProduct.images[0]
        } : undefined
      });

      if (res?.message) {
        setMessages(prev => [...prev, res.message]);
        if (res.conversation && (!activeConvId || activeConvId !== res.conversation.id)) {
          setActiveConvId(res.conversation.id);
        }
      }
      setNewMessageText('');
      setAttachedProduct(null);

      // Refresh conversations list
      const updatedConvs = await api.getConversations(user.id).catch(() => []);
      setConversations(updatedConvs);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const partner = c.participants.find(p => p.id !== user?.id);
    return partner?.name.toLowerCase().includes(searchFilter.toLowerCase());
  });

  const quickTemplates = [
    'Is this produce available for pickup today?',
    'Do you offer bulk delivery for larger orders?',
    'When was this batch harvested?',
    'Could you confirm your exact farm gate location?'
  ];

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col md:flex-row">
      {/* Left Sidebar: Conversations */}
      <div className="w-full md:w-80 border-r border-stone-200 flex flex-col bg-stone-50/50">
        <div className="p-4 border-b border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-stone-900 text-base">Direct Messages</h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {conversations.length} Active
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No conversations found. Contact farmers directly from product listings.
            </div>
          ) : (
            filteredConversations.map(conv => {
              const partner = conv.participants.find(p => p.id !== user?.id);
              if (!partner) return null;
              const isSelected = activeConvId === conv.id;
              const unread = conv.unreadCountFor?.[user?.id || ''] || 0;

              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected ? 'bg-emerald-50/80 border-r-4 border-emerald-600' : 'hover:bg-stone-100/60'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={partner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                      alt=""
                      className="w-11 h-11 rounded-2xl object-cover border border-stone-200"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-stone-900 text-xs truncate">{partner.name}</h4>
                      <span className="text-[10px] text-stone-400">
                        {conv.lastMessageTime
                          ? new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-stone-500 truncate">{conv.lastMessage || 'Click to view'}</p>
                      {unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-1">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Active Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeRecipient ? (
          <>
            {/* Chat Top Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3">
                <img
                  src={activeRecipient.avatar}
                  alt=""
                  className="w-10 h-10 rounded-2xl object-cover border border-stone-200"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-stone-900 text-sm">
                    <span>{activeRecipient.name}</span>
                    {activeRecipient.role === 'farmer' && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" title="Verified Producer" />
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 flex items-center gap-2">
                    <span className="capitalize">{activeRecipient.role}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {activeRecipient.location?.city || 'Local Hub'}, {activeRecipient.location?.province || ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Thread Container */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-stone-50/40">
              {attachedProduct && (
                <div className="max-w-md mx-auto p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-xs">
                  <img src={attachedProduct.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  <div className="truncate text-xs">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Product Inquiry</span>
                    <strong className="text-stone-900 block truncate">{attachedProduct.name}</strong>
                    <span className="text-emerald-700 font-bold">${attachedProduct.price.toFixed(2)} / {attachedProduct.unit}</span>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-400 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-stone-300" />
                  <p>Send a message to inquire about harvest dates, schedule pickup, or request bulk orders.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === user?.id;
                  const messageText = msg.text || msg.content || '';
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-xs space-y-1 ${
                          isMe
                            ? 'bg-emerald-700 text-white rounded-br-xs'
                            : 'bg-white text-stone-800 border border-stone-200/90 rounded-bl-xs'
                        }`}
                      >
                        {msg.productSnippet && (
                          <div className={`p-2 rounded-xl mb-1.5 flex items-center gap-2 text-[11px] ${
                            isMe ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-50 text-stone-700'
                          }`}>
                            <Package className="w-4 h-4" />
                            <span className="font-semibold truncate">{msg.productSnippet.name}</span>
                          </div>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap">{messageText}</p>
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] ${
                            isMe ? 'text-emerald-200' : 'text-stone-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Inquiry Templates */}
            <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 flex gap-2 overflow-x-auto">
              {quickTemplates.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setNewMessageText(tmpl)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-full text-[11px] text-stone-600 hover:text-emerald-800 whitespace-nowrap transition-colors"
                >
                  {tmpl}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-stone-200 bg-white flex items-center gap-2">
              <input
                id="message-text-input"
                type="text"
                value={newMessageText}
                onChange={e => setNewMessageText(e.target.value)}
                placeholder={`Message ${activeRecipient.name}...`}
                className="flex-1 px-4 py-2.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 text-white rounded-2xl shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 space-y-2">
            <MessageSquare className="w-12 h-12 text-stone-300" />
            <h3 className="font-bold text-stone-700 text-sm">Select a Conversation</h3>
            <p className="text-xs max-w-xs">
              Choose a farmer or buyer from the left panel to begin instant agricultural messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
