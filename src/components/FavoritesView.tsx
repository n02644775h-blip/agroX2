import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { LiquidGlassCard, LiquidGlassButton } from './glass';
import { Heart, ArrowLeft } from 'lucide-react';

interface FavoritesViewProps {
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ onBack, onSelectProduct }) => {
  const { user, favorites } = useAuth();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getFavorites(user.id)
      .then(res => setFavoriteProducts(res))
      .catch(err => console.error('Failed to load favorites:', err))
      .finally(() => setLoading(false));
  }, [user, favorites]);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <LiquidGlassButton variant="light" size="xs" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </LiquidGlassButton>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#062B1F]">Your Saved Favorites</h1>
            <span className="text-xs font-semibold text-[#145A38] tabular-nums">
              {favoriteProducts.length} saved items
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#0B261C]/55">Loading saved items...</div>
      ) : favoriteProducts.length === 0 ? (
        <LiquidGlassCard variant="mint" className="p-12 text-center space-y-4">
          <Heart className="w-12 h-12 text-[#145A38]/40 mx-auto" />
          <h3 className="font-extrabold text-[#062B1F] text-base">No saved products yet</h3>
          <p className="text-xs text-[#0B261C]/65 max-w-sm mx-auto">
            Tap the heart icon on any fresh farm listing in the marketplace to save it for quick weekly reordering.
          </p>
          <LiquidGlassButton variant="emerald" size="sm" onClick={onBack}>
            Browse Marketplace
          </LiquidGlassButton>
        </LiquidGlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favoriteProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};
