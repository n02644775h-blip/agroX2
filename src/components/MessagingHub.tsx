import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { fetchAllFirebaseUsers } from '../services/firebaseUsers';
import {
  get1on1ConversationId,
  fetchUserFromFirestore,
  subscribeToFirebaseConversations,
  subscribeToFirebaseMessages,
  sendFirebaseMessage,
  markFirebaseConversationRead
} from '../services/firebaseMessaging';
import { Message, User, Product, Conversation, MediaPost, BuyerRequest, isSellerRole } from '../types';
import { PublicAnnouncementsChat } from './PublicAnnouncementsChat';
import { LiquidGlassCard, LiquidGlassButton, LiquidGlassModal } from './glass';
import {
  Send,
  MessageSquare,
  Search,
  CheckCheck,
  MapPin,
  ShieldCheck,
  Package,
  Megaphone,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  X,
  AlertCircle,
  Sprout,
  Wheat,
  ShoppingBag,
  Loader2,
  Sparkles
} from 'lucide-react';

interface MessagingHubProps {
  initialRecipientId?: string | null;
  initialRecipientUser?: User | null;
  initialProductId?: string | null;
  initialProduct?: Product | null;
  initialPost?: MediaPost | null;
  initialBuyerRequest?: BuyerRequest | null;
  defaultChannel?: 'direct' | 'announcements';
}

function mergeUsersLists(fbUsers: User[], apiUsers: User[]): User[] {
  const map = new Map<string, User>();
  apiUsers.forEach(u => {
    if (u?.id) map.set(u.id, u);
  });
  fbUsers.forEach(u => {
    if (u?.id) {
      const existing = map.get(u.id);
      map.set(u.id, existing ? { ...existing, ...u } : u);
    }
  });
  return Array.from(map.values());
}

function mergeConversationsLists(fbConvs: Conversation[], apiConvs: Conversation[]): Conversation[] {
  const map = new Map<string, Conversation>();
  apiConvs.forEach(c => {
    if (c?.id) map.set(c.id, c);
  });
  fbConvs.forEach(c => {
    if (c?.id) {
      const existing = map.get(c.id);
      if (!existing) {
        map.set(c.id, c);
      } else {
        const fbTime = new Date(c.lastMessageTime).getTime() || 0;
        const apiTime = new Date(existing.lastMessageTime).getTime() || 0;
        map.set(c.id, fbTime >= apiTime ? c : existing);
      }
    }
  });
  return Array.from(map.values()).sort(
    (a, b) => (new Date(b.lastMessageTime).getTime() || 0) - (new Date(a.lastMessageTime).getTime() || 0)
  );
}

function mergeMessagesLists(primary: Message[], secondary: Message[]): Message[] {
  const result: Message[] = [...primary];
  for (const candidate of secondary) {
    const candText = (candidate.text || candidate.content || '').trim();
    const candTime = new Date(candidate.createdAt).getTime() || 0;
    const isDuplicate = result.some(existing => {
      if (existing.id && candidate.id && existing.id === candidate.id) return true;
      const existText = (existing.text || existing.content || '').trim();
      const existTime = new Date(existing.createdAt).getTime() || 0;
      return (
        existing.senderId === candidate.senderId &&
        existText === candText &&
        Math.abs(existTime - candTime) < 15000
      );
    });
    if (!isDuplicate) {
      result.push(candidate);
    }
  }
  return result.sort(
    (a, b) => (new Date(a.createdAt).getTime() || 0) - (new Date(b.createdAt).getTime() || 0)
  );
}

export const MessagingHub: React.FC<MessagingHubProps> = ({
  initialRecipientId,
  initialRecipientUser,
  initialProductId,
  initialProduct,
  initialPost,
  initialBuyerRequest,
  defaultChannel = 'direct'
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'direct' | 'announcements'>(
    initialRecipientId ? 'direct' : defaultChannel
  );
  const [fbConversations, setFbConversations] = useState<Conversation[]>([]);
  const [apiConversations, setApiConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeRecipient, setActiveRecipient] = useState<User | null>(null);
  const [fbMessages, setFbMessages] = useState<Message[]>([]);
  const [apiMessages, setApiMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [attachedProduct, setAttachedProduct] = useState<Product | null>(initialProduct || null);
  const [attachedPost, setAttachedPost] = useState<MediaPost | null>(initialPost || null);
  const [attachedRequest, setAttachedRequest] = useState<BuyerRequest | null>(initialBuyerRequest || null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [announcementsCount, setAnnouncementsCount] = useState<number>(0);

  // New Chat Directory Modal
  const [showNewChatPicker, setShowNewChatPicker] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversations = useMemo(
    () => mergeConversationsLists(fbConversations, apiConversations),
    [fbConversations, apiConversations]
  );

  const messages = useMemo(
    () => mergeMessagesLists(fbMessages, apiMessages),
    [fbMessages, apiMessages]
  );

  // Sync defaultChannel changes when navigating via navbar
  useEffect(() => {
    if (initialRecipientId) {
      setActiveTab('direct');
    } else {
      setActiveTab(defaultChannel);
    }
  }, [defaultChannel, initialRecipientId]);

  // Attach initial product/post/request immediately when passed
  useEffect(() => {
    if (initialProduct) {
      setAttachedProduct(initialProduct);
    } else if (initialProductId) {
      api.getProduct(initialProductId).then(p => setAttachedProduct(p)).catch(() => {});
    }
  }, [initialProduct, initialProductId]);

  useEffect(() => {
    if (initialPost) {
      setAttachedPost(initialPost);
      setNewMessageText(prev =>
        prev.trim()
          ? prev
          : `Hi! I saw your FarmBridge Community post${initialPost.productName ? ` about ${initialPost.productName}` : ''} and would like to request a quote.`
      );
    }
  }, [initialPost]);

  useEffect(() => {
    if (initialBuyerRequest) {
      setAttachedRequest(initialBuyerRequest);
      setNewMessageText(prev =>
        prev.trim()
          ? prev
          : `Hi ${initialBuyerRequest.buyerName}! I saw your request for ${initialBuyerRequest.quantityRequired} of ${initialBuyerRequest.productName} in ${initialBuyerRequest.location} and can assist.`
      );
    }
  }, [initialBuyerRequest]);

  // Real-time conversations subscription + initial users/API load
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setLoading(true);

    const unsubConvs = subscribeToFirebaseConversations(
      user.id,
      (convs) => {
        if (isMounted) {
          setFbConversations(convs);
          setLoading(false);
        }
      },
      () => {
        if (isMounted) setLoading(false);
      }
    );

    Promise.all([
      api.getConversations(user.id).catch(() => []),
      api.getUsers().catch(() => []),
      fetchAllFirebaseUsers().catch(() => []),
      api.getAnnouncements(user.role).catch(() => [])
    ]).then(([apiConvs, apiUsers, fbUsers, anns]) => {
      if (!isMounted) return;
      setApiConversations(apiConvs);
      setAllUsers(mergeUsersLists(fbUsers, apiUsers));
      setAnnouncementsCount(anns.length);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubConvs();
    };
  }, [user?.id, user?.role]);

  // Resolve recipient & conversation whenever initialRecipientId or conversations update
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const resolveInitialTarget = async () => {
      if (initialRecipientId) {
        setActiveTab('direct');
        setSendError(null);

        const deterministicId = get1on1ConversationId(user.id, initialRecipientId);
        const existingConv = conversations.find(
          c => c.id === deterministicId || c.participants.some(p => p.id === initialRecipientId)
        );

        const targetConvId = existingConv ? existingConv.id : deterministicId;
        setActiveConvId(targetConvId);

        const knownUser =
          allUsers.find(u => u.id === initialRecipientId) ||
          initialRecipientUser ||
          null;

        if (knownUser) {
          setActiveRecipient(knownUser);
        } else {
          const partnerFromConv = existingConv?.participants.find(p => p.id === initialRecipientId);
          setActiveRecipient({
            id: initialRecipientId,
            name: partnerFromConv?.name || 'Farm Seller',
            email: '',
            phone: '',
            role: partnerFromConv?.role || 'farmer',
            avatar:
              partnerFromConv?.avatar ||
              'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
            location: { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
            status: 'active',
            createdAt: '',
            farmerProfile: partnerFromConv?.farmName
              ? { farmName: partnerFromConv.farmName, isVerified: true }
              : undefined
          } as User);

          const fetched =
            (await fetchUserFromFirestore(initialRecipientId).catch(() => null)) ||
            (await api.getUserById(initialRecipientId).catch(() => null));
          if (!cancelled && fetched) {
            setActiveRecipient(fetched);
          }
        }

        markFirebaseConversationRead(targetConvId, user.id);
        api.markConversationRead(targetConvId, user.id).catch(() => {});
      } else if (!activeRecipient && conversations.length > 0 && !activeConvId) {
        const firstConv = conversations[0];
        setActiveConvId(firstConv.id);
        const partner = firstConv.participants.find(p => p.id !== user.id);
        if (partner) {
          const partnerUser =
            allUsers.find(u => u.id === partner.id) ||
            ({
              id: partner.id,
              name: partner.name,
              role: partner.role,
              avatar: partner.avatar,
              email: '',
              phone: '',
              status: 'active',
              location: { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
              createdAt: '',
              farmerProfile: partner.farmName ? { farmName: partner.farmName } : undefined
            } as User);
          setActiveRecipient(partnerUser);
        }
      }
    };

    resolveInitialTarget();

    return () => {
      cancelled = true;
    };
  }, [user?.id, initialRecipientId, initialRecipientUser, conversations.length, allUsers.length]);

  // Real-time messages listener for the active conversation
  useEffect(() => {
    if (!activeConvId || !user) {
      setFbMessages([]);
      setApiMessages([]);
      return;
    }

    let isMounted = true;
    setFbMessages([]);
    setApiMessages([]);

    const unsubMsgs = subscribeToFirebaseMessages(
      activeConvId,
      (msgs) => {
        if (isMounted) setFbMessages(msgs);
      },
      () => {}
    );

    api.getMessages(activeConvId).then(msgs => {
      if (isMounted) setApiMessages(msgs);
    }).catch(() => {});

    return () => {
      isMounted = false;
      unsubMsgs();
    };
  }, [activeConvId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]);

  const startChatWithUser = async (targetUser: User) => {
    if (!user) return;
    setSendError(null);
    setActiveTab('direct');
    setShowNewChatPicker(false);

    const deterministicId = get1on1ConversationId(user.id, targetUser.id);
    const existingConv = conversations.find(
      c => c.id === deterministicId || c.participants.some(p => p.id === targetUser.id)
    );
    const convId = existingConv ? existingConv.id : deterministicId;

    setActiveRecipient(targetUser);
    setActiveConvId(convId);

    markFirebaseConversationRead(convId, user.id);
    api.markConversationRead(convId, user.id).catch(() => {});
  };

  const selectConversation = async (conv: Conversation) => {
    setSendError(null);
    setActiveConvId(conv.id);
    const partner = conv.participants.find(p => p.id !== user?.id);
    if (partner) {
      const partnerUser =
        allUsers.find(u => u.id === partner.id) ||
        ({
          id: partner.id,
          name: partner.name,
          role: partner.role,
          avatar: partner.avatar,
          email: '',
          phone: '',
          status: 'active',
          location: { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
          createdAt: '',
          farmerProfile: partner.farmName ? { farmName: partner.farmName } : undefined
        } as User);
      setActiveRecipient(partnerUser);
    }

    if (user) {
      markFirebaseConversationRead(conv.id, user.id);
      api.markConversationRead(conv.id, user.id).catch(() => {});
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = newMessageText.trim();
    if (!cleanText || !user || !activeRecipient || sending) return;

    const convId = activeConvId || get1on1ConversationId(user.id, activeRecipient.id);
    const productSnippet = attachedProduct
      ? {
          name: attachedProduct.name,
          price: attachedProduct.price,
          unit: attachedProduct.unit,
          image: attachedProduct.images?.[0] || ''
        }
      : undefined;

    const postReference = attachedPost
      ? {
          postId: attachedPost.id,
          caption: attachedPost.caption,
          productName: attachedPost.productName || attachedPost.taggedProductName,
          price: attachedPost.price,
          unit: attachedPost.unit,
          mediaUrl: attachedPost.media?.[0]?.url,
          mediaType: attachedPost.media?.[0]?.type,
          farmerName: attachedPost.farmerName,
          farmName: attachedPost.farmName
        }
      : undefined;

    const requestReference = attachedRequest
      ? {
          requestId: attachedRequest.id,
          productName: attachedRequest.productName,
          categoryName: attachedRequest.categoryName,
          quantityRequired: attachedRequest.quantityRequired,
          location: attachedRequest.location,
          budgetText:
            attachedRequest.preferredPrice !== undefined
              ? `$${attachedRequest.preferredPrice.toFixed(2)}`
              : undefined,
          status: attachedRequest.status,
          buyerName: attachedRequest.buyerName
        }
      : undefined;

    setSending(true);
    setSendError(null);

    try {
      if (!activeConvId) {
        setActiveConvId(convId);
      }

      let fbSavedMsg: Message | null = null;
      let apiSavedMsg: Message | null = null;

      const [fbResult, apiResult] = await Promise.allSettled([
        sendFirebaseMessage(convId, {
          sender: user,
          recipient: activeRecipient,
          text: cleanText,
          productId: attachedProduct?.id,
          productSnippet,
          postReference,
          requestReference
        }),
        api.sendMessage({
          conversationId: convId,
          senderId: user.id,
          recipientId: activeRecipient.id,
          text: cleanText,
          productId: attachedProduct?.id,
          productSnippet,
          postReference,
          requestReference,
          postId: attachedPost?.id,
          requestId: attachedRequest?.id,
          senderName: user.name,
          senderAvatar: user.avatar,
          senderRole: user.role,
          recipientName: activeRecipient.name,
          recipientAvatar: activeRecipient.avatar,
          recipientRole: activeRecipient.role,
          recipientFarmName: activeRecipient.farmerProfile?.farmName || ''
        })
      ]);

      if (fbResult.status === 'fulfilled') {
        fbSavedMsg = fbResult.value;
      }
      if (apiResult.status === 'fulfilled') {
        apiSavedMsg = apiResult.value.message;
        if (apiResult.value.conversation) {
          setApiConversations(prev => {
            const others = prev.filter(c => c.id !== apiResult.value.conversation.id);
            return [apiResult.value.conversation, ...others];
          });
        }
      }

      if (!fbSavedMsg && !apiSavedMsg) {
        throw new Error('Could not send message. Please check your connection and try again.');
      }

      if (apiSavedMsg) {
        setApiMessages(prev => mergeMessagesLists(prev, [apiSavedMsg!]));
      } else if (fbSavedMsg) {
        setFbMessages(prev => mergeMessagesLists(prev, [fbSavedMsg!]));
      }

      setNewMessageText('');
      setAttachedProduct(null);
      setAttachedPost(null);
      setAttachedRequest(null);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setSendError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const partner = c.participants.find(p => p.id !== user?.id);
    if (!partner) return false;
    return (
      partner.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (partner.farmName || '').toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  const directoryUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (!u || u.id === user?.id) return false;
      if (u.status === 'suspended') return false;
      const q = directorySearch.trim().toLowerCase();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.farmerProfile?.farmName || '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.location?.city || '').toLowerCase().includes(q)
      );
    });
  }, [allUsers, user?.id, directorySearch]);

  const quickTemplates = isSellerRole(user?.role)
    ? [
        'Yes, fresh stock is available today!',
        'We can prepare your order for farm pickup or delivery.',
        'Bulk pricing is available — how many units do you need?',
        'Let me know your preferred delivery address.'
      ]
    : [
        'Is this listing available for pickup today?',
        'Do you offer bulk delivery for larger orders?',
        'When was this batch harvested?',
        'Could you confirm your exact farm gate location?'
      ];

  const getRoleBadgeLabel = (role?: string) => {
    if (role === 'fodder_supplier') return 'Fodder Supplier';
    if (role === 'farmer') return 'Farmer';
    if (role === 'admin') return 'Admin';
    return 'Buyer';
  };

  return (
    <div className="space-y-4">
      {/* Primary Channel Selector Header Bar */}
      <LiquidGlassCard variant="mint" className="p-2.5 sm:p-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="tab-public-announcements-chat"
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'announcements'
                  ? 'bg-[#062B1F] text-[#A8E635] shadow-md'
                  : 'text-[#0B3D2B] hover:bg-white/70'
              }`}
            >
              <Megaphone className="w-4 h-4 text-[#A8E635]" />
              <span>Public Admin Announcements</span>
              {announcementsCount > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                    activeTab === 'announcements'
                      ? 'bg-[#145A38] text-white'
                      : 'bg-[#DFF4E4] text-[#062B1F]'
                  }`}
                >
                  {announcementsCount}
                </span>
              )}
            </button>

            <button
              id="tab-direct-p2p-messages"
              type="button"
              onClick={() => setActiveTab('direct')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'direct'
                  ? 'bg-[#062B1F] text-[#A8E635] shadow-md'
                  : 'text-[#0B3D2B] hover:bg-white/70'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#A8E635]" />
              <span>Direct Messages (1-on-1)</span>
              <span className="text-[10px] opacity-75 font-normal tabular-nums">({conversations.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-[#0B3D2B]/75 hidden md:flex items-center gap-2 px-3">
            <ShieldCheck className="w-4 h-4 text-[#145A38]" />
            <span>Real-Time Buyer, Farmer &amp; Fodder Supplier Messaging</span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* RENDER ACTIVE CHANNEL */}
      {activeTab === 'announcements' ? (
        <PublicAnnouncementsChat />
      ) : (
        /* Direct Messages Interface */
        <LiquidGlassCard variant="light" className="overflow-hidden p-0">
          <div className="min-h-[620px] flex flex-col md:flex-row">
            {/* Left Sidebar: Conversations */}
            <div
              className={`w-full md:w-80 border-r border-[#062B1F]/10 flex-col bg-white/45 ${
                activeRecipient ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="p-4 border-b border-[#062B1F]/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-extrabold text-[#062B1F] text-base">Direct Messages</h2>
                  <LiquidGlassButton
                    id="new-direct-chat-btn"
                    type="button"
                    variant="lime"
                    size="xs"
                    onClick={() => setShowNewChatPicker(true)}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>New Chat</span>
                  </LiquidGlassButton>
                </div>

                {/* Quick switch to Announcements inside list */}
                <button
                  type="button"
                  onClick={() => setActiveTab('announcements')}
                  className="w-full text-left p-3 bg-linear-to-r from-[#062B1F] via-[#0B3D2B] to-[#145A38] text-white rounded-2xl cursor-pointer hover:shadow-md transition-all flex items-center justify-between border border-white/15"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#A8E635]/20 border border-[#A8E635]/35 flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-[#A8E635]" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Public Announcements</h5>
                      <p className="text-[10px] text-[#DFF4E4]/80">Official admin channel</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A8E635]" />
                </button>

                <div className="relative">
                  <Search className="w-4 h-4 text-[#0B3D2B]/45 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-9 pr-3 py-2 bg-white/85 rounded-xl border border-[#062B1F]/12 text-xs text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#062B1F]/8">
                {loading && filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#0B3D2B]/55">Loading chats...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#0B3D2B]/65 space-y-3">
                    <p>No 1-on-1 conversations yet.</p>
                    <p className="text-[11px] text-[#145A38] font-medium">
                      Click <strong>Contact Farmer</strong> on any product or start a new chat below!
                    </p>
                    <LiquidGlassButton
                      type="button"
                      variant="light"
                      size="xs"
                      onClick={() => setShowNewChatPicker(true)}
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#145A38]" />
                      <span>Browse Farmers & Buyers</span>
                    </LiquidGlassButton>
                  </div>
                ) : (
                  filteredConversations.map(conv => {
                    const partner = conv.participants.find(p => p.id !== user?.id);
                    if (!partner) return null;
                    const isSelected = activeConvId === conv.id;
                    const unread = conv.unreadCountFor?.[user?.id || ''] || 0;

                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => selectConversation(conv)}
                        className={`w-full text-left p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#DFF4E4]/85 shadow-inner'
                            : 'hover:bg-white/60'
                        }`}
                      >
                        <img
                          src={
                            partner.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
                          }
                          alt={partner.name}
                          referrerPolicy="no-referrer"
                          className={`w-11 h-11 rounded-2xl object-cover shrink-0 ${
                            isSelected ? 'ring-2 ring-[#145A38]' : 'border border-white/80'
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5 gap-2">
                            <h4 className="font-bold text-[#062B1F] text-xs truncate">{partner.name}</h4>
                            <span className="text-[10px] text-[#0B3D2B]/55 shrink-0 tabular-nums">
                              {conv.lastMessageTime
                                ? new Date(conv.lastMessageTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-[#0B3D2B]/70 truncate">
                              {conv.lastMessage || 'Click to view messages'}
                            </p>
                            {unread > 0 && (
                              <span className="min-w-4 h-4 px-1 rounded-full bg-[#145A38] text-[#A8E635] text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Active Chat Area */}
            <div className={`flex-1 flex-col bg-white/30 ${activeRecipient ? 'flex' : 'hidden md:flex'}`}>
              {activeRecipient ? (
                <>
                  {/* Chat Top Header */}
                  <div className="p-4 border-b border-[#062B1F]/10 flex items-center justify-between bg-white/75 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRecipient(null);
                          setActiveConvId(null);
                        }}
                        className="md:hidden p-1.5 rounded-xl bg-white border border-[#062B1F]/12 text-[#062B1F] cursor-pointer"
                        aria-label="Back to conversations"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <img
                        src={
                          activeRecipient.avatar ||
                          'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=200'
                        }
                        alt={activeRecipient.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-2xl object-cover border border-white shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-extrabold text-[#062B1F] text-sm">
                          <span>{activeRecipient.name}</span>
                          {isSellerRole(activeRecipient.role) && (
                            <span
                              title={
                                activeRecipient.role === 'fodder_supplier'
                                  ? 'Verified Fodder Supplier'
                                  : 'Verified Producer'
                              }
                              className="inline-flex items-center"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-[#145A38]" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#0B3D2B]/70 flex items-center gap-1.5">
                          <span className="font-semibold text-[#145A38]">
                            {getRoleBadgeLabel(activeRecipient.role)}
                          </span>
                          {activeRecipient.farmerProfile?.farmName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[160px]">
                                {activeRecipient.farmerProfile.farmName}
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-[#145A38]" />
                            {activeRecipient.location?.city || 'Local Hub'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages Thread Container */}
                  <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#F8FAF7]/55 max-h-[460px]">
                    {attachedProduct && (
                      <div className="max-w-md mx-auto p-3 rounded-2xl bg-[#DFF4E4]/90 border border-[#145A38]/25 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={attachedProduct.images?.[0]}
                            alt={attachedProduct.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="truncate text-xs">
                            <span className="text-[10px] font-bold text-[#145A38] uppercase block">
                              Product Inquiry
                            </span>
                            <strong className="text-[#062B1F] block truncate">{attachedProduct.name}</strong>
                            <span className="text-[#145A38] font-bold tabular-nums">
                              ${attachedProduct.price.toFixed(2)} / {attachedProduct.unit}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedProduct(null)}
                          className="p-1 rounded-lg hover:bg-white/60 text-[#145A38] cursor-pointer"
                          title="Remove product card"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {attachedPost && (
                      <div className="max-w-md mx-auto p-3 rounded-2xl bg-[#DFF4E4]/90 border border-[#145A38]/25 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          {attachedPost.media?.[0]?.type === 'video' ? (
                            <div className="w-12 h-12 rounded-xl bg-[#062B1F] text-[#A8E635] flex items-center justify-center text-[10px] font-bold shrink-0">
                              VIDEO
                            </div>
                          ) : (
                            <img
                              src={attachedPost.media?.[0]?.url || '/images/community/community_tomato_greenhouse.jpg'}
                              alt={attachedPost.productName || 'Showcase post'}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-xl object-cover shrink-0"
                            />
                          )}
                          <div className="truncate text-xs">
                            <span className="text-[10px] font-bold text-[#145A38] uppercase flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Quote Inquiry — Showcase Post
                            </span>
                            <strong className="text-[#062B1F] block truncate">
                              {attachedPost.productName || attachedPost.caption}
                            </strong>
                            <span className="text-[#145A38] font-bold tabular-nums">
                              {attachedPost.farmName}
                              {attachedPost.price !== undefined
                                ? ` · $${attachedPost.price.toFixed(2)}${attachedPost.unit ? `/${attachedPost.unit}` : ''}`
                                : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedPost(null)}
                          className="p-1 rounded-lg hover:bg-white/60 text-[#145A38] cursor-pointer"
                          title="Remove post card"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {attachedRequest && (
                      <div className="max-w-md mx-auto p-3 rounded-2xl bg-[#F4D35E]/25 border border-[#F4D35E]/60 flex items-center justify-between gap-3 shadow-xs">
                        <div className="min-w-0 text-xs space-y-0.5">
                          <span className="text-[10px] font-bold text-[#694800] uppercase flex items-center gap-1">
                            <Megaphone className="w-3 h-3" />
                            Buyer Request Reference
                          </span>
                          <strong className="text-[#062B1F] block truncate">
                            {attachedRequest.productName} ({attachedRequest.quantityRequired})
                          </strong>
                          <span className="text-[#0B3D2B] block truncate tabular-nums">
                            {attachedRequest.location}
                            {attachedRequest.preferredPrice !== undefined
                              ? ` · Target $${attachedRequest.preferredPrice.toFixed(2)}`
                              : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedRequest(null)}
                          className="p-1 rounded-lg hover:bg-white/60 text-[#694800] shrink-0 cursor-pointer"
                          title="Remove request card"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {messages.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#0B3D2B]/60 space-y-2">
                        <MessageSquare className="w-8 h-8 mx-auto text-[#145A38]/35" />
                        <p className="font-bold text-[#062B1F]">
                          Start a direct 1-on-1 conversation with {activeRecipient.name}
                        </p>
                        <p>
                          Ask about stock levels, harvest dates, bulk pricing, or arrange pickup &amp; delivery.
                        </p>
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
                                  ? 'bg-linear-to-br from-[#145A38] to-[#062B1F] text-white rounded-br-xs border border-white/15'
                                  : 'bg-white/90 text-[#062B1F] border border-white rounded-bl-xs backdrop-blur-md'
                              }`}
                            >
                              {msg.productSnippet && (
                                <div
                                  className={`p-2 rounded-xl mb-1.5 flex items-center gap-2 text-[11px] ${
                                    isMe
                                      ? 'bg-white/12 text-[#DFF4E4]'
                                      : 'bg-[#DFF4E4]/70 text-[#062B1F]'
                                  }`}
                                >
                                  <Package className="w-4 h-4 shrink-0" />
                                  <span className="font-semibold truncate tabular-nums">
                                    {msg.productSnippet.name} (${Number(msg.productSnippet.price || 0).toFixed(2)}/{msg.productSnippet.unit})
                                  </span>
                                </div>
                              )}
                              {msg.postReference && (
                                <div
                                  className={`p-2.5 rounded-xl mb-1.5 flex items-center gap-2.5 text-[11px] ${
                                    isMe
                                      ? 'bg-white/12 text-[#DFF4E4]'
                                      : 'bg-[#DFF4E4]/70 text-[#062B1F] border border-[#145A38]/15'
                                  }`}
                                >
                                  {msg.postReference.mediaUrl && msg.postReference.mediaType !== 'video' ? (
                                    <img
                                      src={msg.postReference.mediaUrl}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      className="w-9 h-9 rounded-lg object-cover shrink-0"
                                    />
                                  ) : (
                                    <Sparkles className="w-4 h-4 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-[10px] font-bold uppercase opacity-80">
                                      Community Quote Request
                                    </div>
                                    <div className="font-bold truncate">
                                      {msg.postReference.productName || msg.postReference.caption}
                                    </div>
                                    {msg.postReference.price !== undefined && (
                                      <div className="opacity-90 tabular-nums">
                                        ${Number(msg.postReference.price).toFixed(2)}
                                        {msg.postReference.unit ? `/${msg.postReference.unit}` : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {msg.requestReference && (
                                <div
                                  className={`p-2.5 rounded-xl mb-1.5 text-[11px] space-y-0.5 ${
                                    isMe
                                      ? 'bg-white/12 text-[#DFF4E4]'
                                      : 'bg-[#F4D35E]/25 text-[#062B1F] border border-[#F4D35E]/50'
                                  }`}
                                >
                                  <div className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                                    <Megaphone className="w-3 h-3" />
                                    <span>Buyer Request</span>
                                  </div>
                                  <div className="font-bold">
                                    {msg.requestReference.productName} ({msg.requestReference.quantityRequired})
                                  </div>
                                  <div className="opacity-90">
                                    {msg.requestReference.location}
                                    {msg.requestReference.budgetText ? ` · ${msg.requestReference.budgetText}` : ''}
                                  </div>
                                </div>
                              )}
                              <p className="leading-relaxed whitespace-pre-wrap">{messageText}</p>
                              <div
                                className={`flex items-center justify-end gap-1 text-[9px] tabular-nums ${
                                  isMe ? 'text-[#DFF4E4]/75' : 'text-[#0B3D2B]/50'
                                }`}
                              >
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {isMe && <CheckCheck className="w-3 h-3 text-[#A8E635]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {sendError && (
                    <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/25 text-rose-800 text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{sendError}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSendError(null)}
                        className="text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Quick Inquiry Templates */}
                  <div className="px-4 py-2 bg-white/60 border-t border-[#062B1F]/8 flex gap-2 overflow-x-auto">
                    {quickTemplates.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewMessageText(tmpl)}
                        className="px-3 py-1 bg-white/90 hover:bg-[#DFF4E4] border border-[#062B1F]/12 hover:border-[#145A38]/30 rounded-full text-[11px] text-[#062B1F] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                      >
                        {tmpl}
                      </button>
                    ))}
                  </div>

                  {/* Message Input Box */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 sm:p-4 border-t border-[#062B1F]/10 bg-white/80 backdrop-blur-md flex items-center gap-2"
                  >
                    <input
                      id="message-text-input"
                      type="text"
                      value={newMessageText}
                      onChange={e => setNewMessageText(e.target.value)}
                      placeholder={`Message ${activeRecipient.name}...`}
                      className="flex-1 px-4 py-2.5 bg-white/90 rounded-2xl border border-[#062B1F]/15 text-xs text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                    />
                    <LiquidGlassButton
                      id="send-direct-message-btn"
                      type="submit"
                      variant="lime"
                      size="sm"
                      disabled={!newMessageText.trim() || sending}
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </LiquidGlassButton>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#0B3D2B]/65 space-y-3">
                  <MessageSquare className="w-12 h-12 text-[#145A38]/35" />
                  <h3 className="font-extrabold text-[#062B1F] text-sm">Select or Start a 1-on-1 Chat</h3>
                  <p className="text-xs max-w-xs">
                    Choose an existing conversation or click below to message any farmer, fodder supplier, or buyer directly.
                  </p>
                  <LiquidGlassButton
                    type="button"
                    variant="emerald"
                    size="sm"
                    onClick={() => setShowNewChatPicker(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Start New 1-on-1 Chat</span>
                  </LiquidGlassButton>
                </div>
              )}
            </div>
          </div>
        </LiquidGlassCard>
      )}

      {/* New Chat Directory Picker Modal */}
      <LiquidGlassModal
        isOpen={showNewChatPicker}
        onClose={() => setShowNewChatPicker(false)}
        title="Start 1-on-1 Conversation"
        subtitle="Select a farmer, fodder supplier, or buyer to message"
        icon={<UserPlus className="w-5 h-5 text-[#A8E635]" />}
        maxWidthClass="max-w-md"
      >
        <div className="p-5 space-y-4 flex flex-col max-h-[75vh]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#0B3D2B]/45 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={directorySearch}
              onChange={e => setDirectorySearch(e.target.value)}
              placeholder="Search by name, farm, fodder, or city..."
              className="w-full pl-9 pr-3 py-2 bg-white/85 rounded-xl border border-[#062B1F]/15 text-xs text-[#062B1F] focus:outline-hidden focus:ring-2 focus:ring-[#145A38]/25"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#062B1F]/10 pr-1">
            {directoryUsers.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#0B3D2B]/55">
                No matching members found.
              </div>
            ) : (
              directoryUsers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => startChatWithUser(member)}
                  className="w-full p-3 flex items-center justify-between gap-3 hover:bg-[#DFF4E4]/65 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        member.avatar ||
                        'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=200'
                      }
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-2xl object-cover border border-white shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-[#062B1F] text-xs truncate">{member.name}</div>
                      <div className="text-[11px] text-[#0B3D2B]/70 truncate flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#145A38]">
                          {member.role === 'fodder_supplier' ? (
                            <Wheat className="w-3 h-3 text-amber-600" />
                          ) : member.role === 'farmer' ? (
                            <Sprout className="w-3 h-3 text-[#145A38]" />
                          ) : (
                            <ShoppingBag className="w-3 h-3 text-sky-700" />
                          )}
                          {getRoleBadgeLabel(member.role)}
                        </span>
                        {member.farmerProfile?.farmName && (
                          <span className="truncate">· {member.farmerProfile.farmName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#0B3D2B]/45 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </LiquidGlassModal>
    </div>
  );
};
