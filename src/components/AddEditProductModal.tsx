import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { mobileService } from '../services/mobileService';
import { compressImage } from '../utils/imageCompressor';
import { saveProductToFirebase } from '../services/firebaseProducts';
import { Product, ProductCategory, ProductUnit } from '../types';
import {
  X,
  Package,
  Leaf,
  Calendar,
  Image as ImageIcon,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Camera as CameraIcon,
  Upload,
  Sparkles,
  ChevronDown,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';

interface AddEditProductModalProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess: (product: Product) => void;
}

const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'cat-veg', name: 'Vegetables', slug: 'vegetables', icon: 'Carrot', description: 'Fresh vegetables & leafy greens' },
  { id: 'cat-fruits', name: 'Fruits', slug: 'fruits', icon: 'Apple', description: 'Orchard and fresh fruits' },
  { id: 'cat-breeding', name: 'Breeding (Crossbreeds & Hybrids)', slug: 'breeding', icon: 'Dna', description: 'High-yield crossbred livestock and hybrid seeds' },
  { id: 'cat-poultry', name: 'Poultry & Game Birds', slug: 'poultry', icon: 'Bird', description: 'Chickens, ducks, turkeys, and game birds' },
  { id: 'cat-livestock', name: 'Livestock & Small Ruminants', slug: 'livestock', icon: 'Beef', description: 'Cattle, goats, sheep, and pigs' },
  { id: 'cat-dairy', name: 'Dairy & Farm Eggs', slug: 'dairy-eggs', icon: 'Egg', description: 'Fresh milk, artisanal cheeses, and farm eggs' },
  { id: 'cat-grains', name: 'Grains, Cereals & Legumes', slug: 'grains', icon: 'Wheat', description: 'Maize, sorghum, millet, and dry beans' },
  { id: 'cat-tubers', name: 'Tubers & Root Crops', slug: 'tubers', icon: 'Sprout', description: 'Potatoes, sweet potatoes, and cassava' },
  { id: 'cat-honey', name: 'Honey & Natural Specialties', slug: 'honey', icon: 'Sparkles', description: 'Pure raw honey and bee products' }
];

const SAMPLE_AGRI_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800', label: 'Roma Tomatoes' },
  { url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=800', label: 'Hybrid Maize' },
  { url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800', label: 'Breeding Roadrunner' },
  { url: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800', label: 'Boer Goat Buck' },
  { url: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=800', label: 'Crossbred Heifer' },
  { url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=800', label: 'Farm Fresh Eggs' },
  { url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800', label: 'Pure Raw Honey' },
  { url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=800', label: 'Hass Avocados' }
];

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  product,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ProductCategory[]>(DEFAULT_CATEGORIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressingImg, setIsCompressingImg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || 'cat-veg');
  const [price, setPrice] = useState<string>(product?.price !== undefined ? product.price.toString() : '');
  const [unit, setUnit] = useState<ProductUnit>(product?.unit || 'kg');
  const [quantityAvailable, setQuantityAvailable] = useState<string>(
    product?.quantityAvailable !== undefined ? product.quantityAvailable.toString() : '50'
  );
  const [minOrderQuantity, setMinOrderQuantity] = useState<string>(
    product?.minOrderQuantity !== undefined ? product.minOrderQuantity.toString() : '1'
  );
  const [isOrganic, setIsOrganic] = useState<boolean>(product?.isOrganic ?? true);
  const [description, setDescription] = useState(product?.description || '');
  const [harvestDate, setHarvestDate] = useState(
    product?.harvestDate ? product.harvestDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState(
    product?.expiryDate ? product.expiryDate.split('T')[0] : ''
  );
  const [additionalNotes, setAdditionalNotes] = useState(product?.additionalNotes || '');
  const [imageUrl, setImageUrl] = useState(product?.images?.[0] || SAMPLE_AGRI_IMAGES[0].url);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    api.getCategories()
      .then(cats => {
        if (isMounted && cats && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch(err => {
        console.warn('Using default categories fallback:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const handleProcessFile = async (file: File) => {
    try {
      setIsCompressingImg(true);
      setErrorMsg('');
      const compressed = await compressImage(file, 1000, 1000, 0.82);
      setImageUrl(compressed);
      mobileService.triggerHaptic('light');
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setErrorMsg('Failed to process image file. Please try another photo.');
    } finally {
      setIsCompressingImg(false);
    }
  };

  const handleCaptureCamera = async () => {
    try {
      setIsCompressingImg(true);
      setErrorMsg('');
      const photo = await mobileService.capturePhoto('camera');
      if (photo) {
        const compressed = await compressImage(photo, 1000, 1000, 0.82);
        setImageUrl(compressed);
        mobileService.triggerHaptic('light');
      }
    } catch (err: any) {
      console.warn('Camera capture error:', err);
      // Fallback: trigger file input
      fileInputRef.current?.click();
    } finally {
      setIsCompressingImg(false);
    }
  };

  const handleCapturePhotos = async () => {
    try {
      setIsCompressingImg(true);
      setErrorMsg('');
      const photo = await mobileService.capturePhoto('photos');
      if (photo) {
        const compressed = await compressImage(photo, 1000, 1000, 0.82);
        setImageUrl(compressed);
        mobileService.triggerHaptic('light');
      }
    } catch (err: any) {
      console.warn('Gallery pick error:', err);
      fileInputRef.current?.click();
    } finally {
      setIsCompressingImg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a produce or item name.');
      return;
    }
    const numPrice = parseFloat(price);
    const numQty = parseFloat(quantityAvailable);
    const numMin = parseFloat(minOrderQuantity);

    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Please enter a valid price greater than $0.00.');
      return;
    }
    if (isNaN(numQty) || numQty < 0) {
      setErrorMsg('Please enter a valid available quantity.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const selectedCategoryObj = categories.find(c => c.id === category) || DEFAULT_CATEGORIES.find(c => c.id === category);
      
      const farmerId = user?.id || 'farmer-1';
      const farmerName = user?.name || 'Chiredzi Green Harvest';
      const farmName = user?.farmerProfile?.farmName || `${farmerName}'s Farm`;
      const farmerAvatar = user?.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400';
      const location = {
        province: user?.location?.province || 'Harare',
        city: user?.location?.city || 'Harare',
        community: user?.location?.community || 'Direct Market',
        address: user?.farmerProfile?.address || 'Direct Farm Gate'
      };

      const payload: Partial<Product> = {
        id: product?.id,
        name: name.trim(),
        category: category || 'cat-veg',
        categoryName: selectedCategoryObj?.name || 'Vegetables',
        description: description.trim() || `${name.trim()} freshly harvested from ${farmName}`,
        price: numPrice,
        unit,
        quantityAvailable: numQty,
        minOrderQuantity: numMin || 1,
        isOrganic,
        images: [imageUrl],
        harvestDate: harvestDate ? new Date(harvestDate).toISOString() : new Date().toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        farmerId,
        farmerName,
        farmName,
        farmerAvatar,
        location,
        availability: numQty <= 0 ? 'out_of_stock' : numQty <= 10 ? 'low_stock' : 'available'
      };

      // 1. Save directly to Firebase Firestore
      const savedFbProduct = await saveProductToFirebase(payload);

      // 2. Also sync to backend API store
      let resultProduct: Product = savedFbProduct;
      try {
        if (product?.id) {
          resultProduct = await api.updateProduct(product.id, payload);
        } else {
          resultProduct = await api.createProduct(payload as any);
        }
      } catch (apiErr) {
        console.warn('API sync warning, using Firestore product:', apiErr);
      }

      setSuccessNotice(true);
      mobileService.triggerHaptic('medium');
      setTimeout(() => {
        onSuccess(resultProduct || savedFbProduct);
      }, 600);
    } catch (err: any) {
      console.error('Failed to save product listing:', err);
      setErrorMsg(err?.message || 'Failed to save product listing. Please check the form and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="add-edit-product-dialog"
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-6 border border-stone-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/60 border border-emerald-400/40 flex items-center justify-center text-emerald-200">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base sm:text-lg">
                {product ? 'Edit Agricultural Listing' : 'List New Farm Produce / Livestock'}
              </h2>
              <p className="text-[11px] text-emerald-200/90">
                Direct farm gate listing with instant photo upload & real-time buyer visibility
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {successNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Listing uploaded and published successfully! Syncing live across the marketplace...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Produce / Variety Name *</label>
              <input
                id="product-name-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Fresh Red Roma Tomatoes, Boer Goat Buck"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Category *</label>
              <div className="relative">
                <select
                  id="product-category-select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium appearance-none pr-8 cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Price, Unit, Stock & Min Order */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Price ($ USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="1.50"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 font-bold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Unit of Measure *</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 bg-white font-medium"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="head">Head (Livestock / Sires)</option>
                <option value="animal">Animal (Individual)</option>
                <option value="pair">Breeding Pair (Male & Female)</option>
                <option value="bird">Bird (Poultry / Pullet / Cockerel)</option>
                <option value="bag_50kg">50kg Seed / Grain Bag</option>
                <option value="bag">Standard Bag</option>
                <option value="tray">Egg Tray (30pk)</option>
                <option value="bunch">Fresh Bunch</option>
                <option value="crate">Crate (Wooden/Plastic)</option>
                <option value="litre">Litre (L)</option>
                <option value="piece">Per Piece</option>
                <option value="dozen">Per Dozen</option>
                <option value="box">Per Box</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Available Quantity *</label>
              <input
                type="number"
                min="0"
                value={quantityAvailable}
                onChange={e => setQuantityAvailable(e.target.value)}
                placeholder="50"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 font-bold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Min Order Qty</label>
              <input
                type="number"
                min="1"
                value={minOrderQuantity}
                onChange={e => setMinOrderQuantity(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900"
              />
            </div>
          </div>

          {/* Special Breeding & Hybrid Genetics Guidance */}
          {category === 'cat-breeding' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Crossbreed & Hybrid Listing Advice</strong>
                <span>
                  Highlight parent genetics (e.g. Kuroiler × Roadrunner, Boer × Matabele), age/stage, vaccination status, and expected hybrid performance (egg yield, drought resilience, growth rate).
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="font-bold text-stone-700 block mb-1">Product Description & Harvest / Lineage Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe breed characteristics, pedigree, vaccinations, growth rate, soil/organic practices, and collection details..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Image Selection with Native Camera, Gallery & Drag-and-Drop Auto-Compression */}
          <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 block">Product Photo (Mobile Camera & Gallery Upload)</label>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Auto-compressed & optimized
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={imageUrl}
                  alt="Produce preview"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-600 bg-stone-100 shadow-md"
                />
                {isCompressingImg && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-bold">
                    <Loader2 className="w-5 h-5 animate-spin mb-1" />
                    <span>Compressing...</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureCamera}
                    disabled={isCompressingImg}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
                  >
                    <CameraIcon className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCapturePhotos}
                    disabled={isCompressingImg}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Gallery</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-all active:scale-95">
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Upload File</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFile(file);
                      }}
                    />
                  </label>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleProcessFile(file);
                  }}
                  className={`border-2 border-dashed rounded-xl p-2.5 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-stone-300 hover:border-emerald-400 bg-white/50 text-stone-500'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-[11px] font-medium">
                    Drag & drop high-res image here or click to browse (JPG, PNG, WebP)
                  </span>
                </div>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="Or paste direct image URL (e.g. https://...)"
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="pt-1">
              <span className="text-[11px] font-bold text-stone-600 block mb-1.5">
                Quick Sample Produce Images:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1.5">
                {SAMPLE_AGRI_IMAGES.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    title={img.label}
                    onClick={() => {
                      setImageUrl(img.url);
                      mobileService.triggerHaptic('light');
                    }}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      imageUrl === img.url ? 'border-emerald-600 ring-2 ring-emerald-600/30 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Harvest & Expiry Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Harvest / Collection Date</label>
              <input
                type="date"
                value={harvestDate}
                onChange={e => setHarvestDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Best Before / Expiry (Optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900"
              />
            </div>
          </div>

          {/* Organic Certified Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={isOrganic}
              onChange={e => setIsOrganic(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
            />
            <div>
              <span className="font-bold text-stone-900 text-xs flex items-center gap-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                100% Organic Certified / Grown without Synthetic Chemicals
              </span>
              <p className="text-[11px] text-stone-500">Adds the verified green organic badge to your listing</p>
            </div>
          </label>

          {/* Submit */}
          <div className="pt-2">
            <button
              id="save-product-listing-btn"
              type="submit"
              disabled={isSubmitting || isCompressingImg}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing Listing to Firestore...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{product ? 'Update Product Listing' : 'Publish Product to Marketplace'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
