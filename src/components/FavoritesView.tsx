import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Heart, ArrowLeft, ShoppingBag } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-stone-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500 fill-current" />
          <h1 className="text-xl font-bold text-stone-900">Your Saved Favorites</h1>
          <span className="text-xs font-semibold text-stone-500">({favoriteProducts.length} items)</span>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-stone-400">Loading saved items...</div>
      ) : favoriteProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <Heart className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-900 text-base">No saved products yet</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Click the heart icon on any fresh farm listing in the marketplace to save it for quick weekly reordering.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
          >
            Browse Marketplace
          </button>
        </div>
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
