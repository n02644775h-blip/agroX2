import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  subscribeToFirebasePosts,
  toggleFirebasePostLike,
  incrementFirebasePostQuote
} from '../services/firebasePosts';
import { MediaPost } from '../types';
import { LiquidGlassCard, LiquidGlassButton } from './glass';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  MessageSquareQuote,
  MapPin,
  Tag,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Check,
  ExternalLink,
  Sprout
} from 'lucide-react';

interface CommunityShowcaseProps {
  onSelectFarmer: (farmerId: string) => void;
  onRequestQuote: (post: MediaPost) => void;
}

export const CommunityShowcase: React.FC<CommunityShowcaseProps> = ({
  onSelectFarmer,
  onRequestQuote
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(null);
  const [unmutedPostIds, setUnmutedPostIds] = useState<Record<string, boolean>>({});
  const [modalPost, setModalPost] = useState<MediaPost | null>(null);
  const [modalMediaIdx, setModalMediaIdx] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const mergePosts = (incoming: MediaPost[]) => {
    setPosts(prev => {
      const map = new Map<string, MediaPost>();
      for (const p of prev) map.set(p.id, p);
      for (const p of incoming) map.set(p.id, p);
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  useEffect(() => {
    let active = true;
    api
      .getMediaPosts()
      .then(list => {
        if (active && Array.isArray(list)) mergePosts(list);
      })
      .catch(err => console.warn('Could not load community posts:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsub = subscribeToFirebasePosts(
      undefined,
      fsPosts => {
        if (active && fsPosts.length > 0) mergePosts(fsPosts);
        if (active) setLoading(false);
      },
      err => console.warn('Community posts subscription warning:', err)
    );

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const handleToggleVideoPlay = (postId: string) => {
    const target = videoRefs.current[postId];
    if (!target) return;

    if (target.paused) {
      const entries = Object.entries(videoRefs.current) as [string, HTMLVideoElement | null][];
      entries.forEach(([id, el]) => {
        if (id !== postId && el && !el.paused) {
          el.pause();
        }
      });
      target.play().catch(() => {});
      setActiveVideoPostId(postId);
    } else {
      target.pause();
      if (activeVideoPostId === postId) setActiveVideoPostId(null);
    }
  };

  const handleToggleMute = (postId: string) => {
    const target = videoRefs.current[postId];
    const nextUnmuted = !unmutedPostIds[postId];
    if (target) {
      target.muted = !nextUnmuted;
    }
    setUnmutedPostIds(prev => ({ ...prev, [postId]: nextUnmuted }));
  };

  const handleLike = async (post: MediaPost) => {
    const actorId = user?.id || 'guest-browser';
    const alreadyLiked = (post.likedBy || []).includes(actorId);
    const nextLikedBy = alreadyLiked
      ? (post.likedBy || []).filter(id => id !== actorId)
      : [...(post.likedBy || []), actorId];

    const updatedPost: MediaPost = {
      ...post,
      likedBy: nextLikedBy,
      likesCount: nextLikedBy.length
    };
    setPosts(prev => prev.map(p => (p.id === post.id ? updatedPost : p)));
    if (modalPost?.id === post.id) setModalPost(updatedPost);

    try {
      await api.toggleMediaPostLike(post.id, actorId).catch(() => {});
      await toggleFirebasePostLike(post.id, actorId, post.likedBy || []);
    } catch {
      // ignore non-fatal sync error
    }
  };

  const handleShare = async (post: MediaPost) => {
    const url = `${window.location.origin}/?communityPost=${encodeURIComponent(post.id)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(prev => (prev === post.id ? null : prev)), 2200);
    } catch {
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(prev => (prev === post.id ? null : prev)), 2200);
    }
  };

  const handleQuote = async (post: MediaPost) => {
    if (user) {
      api.recordMediaPostQuote(post.id, user.id, user.name).catch(() => {});
      incrementFirebasePostQuote(post.id).catch(() => {});
    }
    setModalPost(null);
    onRequestQuote(post);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const distance = Math.max(320, Math.round(carouselRef.current.clientWidth * 0.8));
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth'
    });
  };

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  if (!loading && posts.length === 0) return null;

  return (
    <section
      id="farmbridge-community-section"
      className="space-y-6 pt-2 scroll-mt-20"
    >
      {/* Section Header & Carousel Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#145A38]">
            Community Stories
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#062B1F] tracking-tight">
            FarmBridge Community
          </h2>
          <p className="text-sm text-[#0B261C]/65">
            Discover what farmers are growing, producing, and sharing across the network.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollCarousel('left')}
            className="w-10 h-10 rounded-full lg-glass-light hover:bg-[#145A38] hover:text-white text-[#062B1F] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Previous community posts"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollCarousel('right')}
            className="w-10 h-10 rounded-full lg-glass-light hover:bg-[#145A38] hover:text-white text-[#062B1F] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Next community posts"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Carousel Container */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-96 rounded-3xl lg-glass-light animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div
          ref={carouselRef}
          className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth no-scrollbar"
        >
          {visiblePosts.map(post => {
            const lead = post.media?.[0];
            const actorId = user?.id || 'guest-browser';
            const isLiked = (post.likedBy || []).includes(actorId);
            const isVideoPlaying = activeVideoPostId === post.id;
            const isUnmuted = Boolean(unmutedPostIds[post.id]);
            const mediaFailed = failedImages[`post-${post.id}`];
            const avatarFailed = failedImages[`avatar-${post.id}`];

            return (
              <LiquidGlassCard
                key={post.id}
                variant="light"
                interactive
                className="snap-start shrink-0 w-[85vw] sm:w-[320px] md:w-[336px] overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="p-4 flex items-center justify-between gap-2 border-b border-[#145A38]/10">
                  <button
                    type="button"
                    onClick={() => onSelectFarmer(post.farmerId)}
                    className="flex items-center gap-2.5 min-w-0 text-left group cursor-pointer"
                  >
                    {post.farmerAvatar && !avatarFailed ? (
                      <img
                        src={post.farmerAvatar}
                        alt={post.farmerName}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages(prev => ({ ...prev, [`avatar-${post.id}`]: true }))
                        }
                        className="w-9 h-9 rounded-full object-cover border border-[#145A38]/20 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#DFF4E4] border border-[#145A38]/20 flex items-center justify-center text-xs font-bold text-[#145A38] shrink-0">
                        {(post.farmName || post.farmerName).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#062B1F] group-hover:text-[#145A38] truncate">
                        {post.farmName || post.farmerName}
                      </div>
                      <div className="text-[11px] text-[#0B261C]/55 flex items-center gap-1 truncate">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        {post.location && (
                          <>
                            <span>·</span>
                            <MapPin className="w-3 h-3 text-[#145A38] shrink-0" />
                            <span className="truncate">{post.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  {post.price !== undefined && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#DFF4E4] text-xs font-extrabold text-[#062B1F] shrink-0 tabular-nums">
                      ${post.price.toFixed(2)}
                      {post.unit ? `/${post.unit}` : ''}
                    </span>
                  )}
                </div>

                {/* Media Viewport */}
                <div className="relative aspect-[4/3] bg-[#DFF4E4]/40 overflow-hidden group">
                  {lead?.type === 'video' ? (
                    <>
                      <video
                        ref={el => {
                          videoRefs.current[post.id] = el;
                        }}
                        src={lead.url}
                        poster={lead.thumbnailUrl}
                        muted={!isUnmuted}
                        playsInline
                        preload="metadata"
                        onEnded={() => setActiveVideoPostId(null)}
                        onClick={() => handleToggleVideoPlay(post.id)}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleMute(post.id)}
                          className="w-8 h-8 rounded-full bg-[#062B1F]/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-[#062B1F] cursor-pointer"
                          aria-label={isUnmuted ? 'Mute video' : 'Unmute video'}
                        >
                          {isUnmuted ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <VolumeX className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleVideoPlay(post.id)}
                          className="w-8 h-8 rounded-full bg-[#A8E635] text-[#062B1F] flex items-center justify-center shadow-md cursor-pointer"
                          aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                        >
                          {isVideoPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                      </div>
                    </>
                  ) : lead?.url && !mediaFailed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setModalMediaIdx(0);
                        setModalPost(post);
                      }}
                      className="w-full h-full block text-left cursor-pointer"
                    >
                      <img
                        src={lead.url}
                        alt={post.caption}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages(prev => ({ ...prev, [`post-${post.id}`]: true }))
                        }
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#145A38]">
                      <Sprout className="w-8 h-8 opacity-70" />
                    </div>
                  )}

                  {post.media.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalMediaIdx(0);
                        setModalPost(post);
                      }}
                      className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-[#062B1F]/80 backdrop-blur-md text-white text-[11px] font-bold cursor-pointer"
                    >
                      +{post.media.length - 1} more
                    </button>
                  )}
                </div>

                {/* Caption & Interactions */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setModalMediaIdx(0);
                        setModalPost(post);
                      }}
                      className="text-left block w-full cursor-pointer"
                    >
                      <p className="text-sm font-bold text-[#062B1F] line-clamp-2 hover:text-[#145A38] transition-colors leading-snug">
                        {post.caption}
                      </p>
                    </button>

                    {post.productName && (
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#145A38]">
                        <Tag className="w-3 h-3" />
                        <span>{post.productName}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#145A38]/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleLike(post)}
                          className={`inline-flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
                            isLiked ? 'text-rose-600' : 'text-[#0B261C]/65 hover:text-rose-600'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                          <span className="tabular-nums">{post.likesCount || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(post)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B261C]/65 hover:text-[#145A38] transition-colors cursor-pointer"
                        >
                          {copiedPostId === post.id ? (
                            <>
                              <Check className="w-4 h-4 text-[#145A38]" />
                              <span className="text-[#145A38]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              <span>Share</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setModalMediaIdx(0);
                          setModalPost(post);
                        }}
                        className="text-xs font-semibold text-[#0B261C]/65 hover:text-[#145A38] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <LiquidGlassButton
                      variant="emerald"
                      size="sm"
                      className="w-full"
                      onClick={() => handleQuote(post)}
                    >
                      <MessageSquareQuote className="w-3.5 h-3.5" />
                      <span>Request a Quote</span>
                    </LiquidGlassButton>
                  </div>
                </div>
              </LiquidGlassCard>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-1">
          <LiquidGlassButton
            variant="light"
            size="sm"
            onClick={() => setVisibleCount(c => c + 8)}
          >
            Load More Community Posts ({posts.length - visibleCount} remaining)
          </LiquidGlassButton>
        </div>
      )}

      {/* Full-View Post Detail Modal */}
      {modalPost && (
        <div
          className="fixed inset-0 z-50 bg-[#062B1F]/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setModalPost(null)}
        >
          <div
            className="bg-[#F8FAF7]/95 backdrop-blur-2xl rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 max-h-[90vh] border border-white/80"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative bg-[#062B1F] flex items-center justify-center min-h-[260px] md:min-h-[420px]">
              {(() => {
                const item = modalPost.media?.[modalMediaIdx] || modalPost.media?.[0];
                if (!item) return null;
                return item.type === 'video' ? (
                  <video
                    src={item.url}
                    poster={item.thumbnailUrl}
                    controls
                    muted={!unmutedPostIds[modalPost.id]}
                    playsInline
                    preload="metadata"
                    className="w-full h-full max-h-[65vh] object-contain"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={modalPost.caption}
                    referrerPolicy="no-referrer"
                    className="w-full h-full max-h-[65vh] object-contain"
                  />
                );
              })()}

              {modalPost.media.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setModalMediaIdx(idx =>
                        idx === 0 ? modalPost.media.length - 1 : idx - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setModalMediaIdx(idx => (idx + 1) % modalPost.media.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-semibold">
                    {modalMediaIdx + 1} / {modalPost.media.length}
                  </div>
                </>
              )}
            </div>

            <div className="p-5 sm:p-6 flex flex-col justify-between overflow-y-auto space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-[#145A38]/12 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const fId = modalPost.farmerId;
                      setModalPost(null);
                      onSelectFarmer(fId);
                    }}
                    className="flex items-center gap-3 text-left group cursor-pointer"
                  >
                    <img
                      src={modalPost.farmerAvatar}
                      alt={modalPost.farmerName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-[#145A38]/25"
                    />
                    <div>
                      <div className="font-bold text-sm text-[#062B1F] group-hover:text-[#145A38]">
                        {modalPost.farmName}
                      </div>
                      <div className="text-xs text-[#0B261C]/60">
                        {modalPost.farmerName} · {new Date(modalPost.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalPost(null)}
                    className="p-2 rounded-full text-[#0B261C]/50 hover:text-[#062B1F] hover:bg-[#DFF4E4]/60 cursor-pointer"
                    aria-label="Close post details"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {modalPost.location && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#145A38]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{modalPost.location}</span>
                  </div>
                )}

                <h3 className="text-base font-extrabold text-[#062B1F] leading-snug">
                  {modalPost.caption}
                </h3>

                {modalPost.description && (
                  <p className="text-xs sm:text-sm text-[#0B261C]/75 leading-relaxed">
                    {modalPost.description}
                  </p>
                )}

                {(modalPost.productName || modalPost.price !== undefined) && (
                  <div className="p-3.5 rounded-2xl lg-glass-mint border border-[#145A38]/15 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#062B1F]">
                      <Tag className="w-4 h-4 text-[#145A38]" />
                      <span>{modalPost.productName || modalPost.taggedProductName || 'Featured Produce'}</span>
                    </div>
                    {modalPost.price !== undefined && (
                      <span className="font-extrabold text-sm text-[#145A38] tabular-nums">
                        ${modalPost.price.toFixed(2)}
                        {modalPost.unit ? `/${modalPost.unit}` : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#145A38]/12 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleLike(modalPost)}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                        (modalPost.likedBy || []).includes(user?.id || 'guest-browser')
                          ? 'text-rose-600'
                          : 'text-[#0B261C]/65 hover:text-rose-600'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          (modalPost.likedBy || []).includes(user?.id || 'guest-browser')
                            ? 'fill-rose-500'
                            : ''
                        }`}
                      />
                      <span>{modalPost.likesCount || 0} Likes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(modalPost)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B261C]/65 hover:text-[#145A38] cursor-pointer"
                    >
                      {copiedPostId === modalPost.id ? (
                        <>
                          <Check className="w-4 h-4 text-[#145A38]" />
                          <span className="text-[#145A38]">Link copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Copy Share Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const fId = modalPost.farmerId;
                      setModalPost(null);
                      onSelectFarmer(fId);
                    }}
                    className="text-xs font-bold text-[#145A38] hover:underline cursor-pointer"
                  >
                    Visit Farm Profile →
                  </button>
                </div>

                <LiquidGlassButton
                  variant="lime"
                  size="lg"
                  className="w-full"
                  onClick={() => handleQuote(modalPost)}
                >
                  <MessageSquareQuote className="w-4 h-4" />
                  <span>Request a Quote from {modalPost.farmName}</span>
                </LiquidGlassButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
