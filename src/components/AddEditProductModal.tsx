import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { mobileService } from '../services/mobileService';
import { dataUrlToBlob } from '../utils/imageCompressor';
import { uploadMediaAsset, deleteFirebaseStorageFile } from '../services/firebaseStorage';
import { saveProductToFirebase } from '../services/firebaseProducts';
import { Product, ProductCategory, ProductUnit } from '../types';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
  Package,
  Leaf,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Camera as CameraIcon,
  Upload,
  Sparkles,
  ChevronDown,
  Loader2,
  X,
  RotateCcw
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
  { id: 'cat-fodder', name: 'Fodder & Animal Feed', slug: 'fodder', icon: 'Wheat', description: 'Lucerne hay bales, maize silage, Rhodes grass, stockfeed concentrates & forage' },
  { id: 'cat-tubers', name: 'Tubers & Root Crops', slug: 'tubers', icon: 'Sprout', description: 'Potatoes, sweet potatoes, and cassava' },
  { id: 'cat-honey', name: 'Honey & Natural Specialties', slug: 'honey', icon: 'Sparkles', description: 'Pure raw honey and bee products' }
];

const SAMPLE_AGRI_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800', label: 'Roma Tomatoes' },
  { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800', label: 'Lucerne Hay & Forage' },
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusNote, setUploadStatusNote] = useState<string>('');
  const [photoUploadedBanner, setPhotoUploadedBanner] = useState<string>('');
  const [failedPhotoFile, setFailedPhotoFile] = useState<File | null>(null);
  const [uploadedStoragePath, setUploadedStoragePath] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  const isFodderSupplier = user?.role === 'fodder_supplier';
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(
    product?.category || (isFodderSupplier ? 'cat-fodder' : 'cat-veg')
  );
  const [price, setPrice] = useState<string>(
    product?.price !== undefined ? product.price.toString() : ''
  );
  const [unit, setUnit] = useState<ProductUnit>(
    product?.unit || (isFodderSupplier ? 'bale' : 'kg')
  );
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
  const [additionalNotes] = useState(product?.additionalNotes || '');
  const [imageUrl, setImageUrl] = useState(
    product?.images?.[0] ||
      (isFodderSupplier ? SAMPLE_AGRI_IMAGES[1].url : SAMPLE_AGRI_IMAGES[0].url)
  );
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort();
      }
      if (previewObjectUrl) {
        try {
          URL.revokeObjectURL(previewObjectUrl);
        } catch {}
      }
    };
  }, [previewObjectUrl]);

  useEffect(() => {
    let isMounted = true;
    api
      .getCategories()
      .then((cats) => {
        if (isMounted && cats && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch((err) => {
        console.warn('Using default categories fallback:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancelPhotoUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }
    setIsUploadingPhoto(false);
    setUploadProgress(0);
    setUploadStatusNote('');
    if (previewObjectUrl) {
      try {
        URL.revokeObjectURL(previewObjectUrl);
      } catch {}
      setPreviewObjectUrl(null);
    }
  };

  const handleProcessFile = async (file: File) => {
    if (isUploadingPhoto) return;
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
    }
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    const tempPreviewUrl = URL.createObjectURL(file);
    setPreviewObjectUrl(tempPreviewUrl);
    setIsUploadingPhoto(true);
    setUploadProgress(5);
    setUploadStatusNote('Preparing photo...');
    setPhotoUploadedBanner('');
    setFailedPhotoFile(null);
    setErrorMsg('');

    try {
      const previousStoragePath = uploadedStoragePath;
      const result = await uploadMediaAsset({
        file,
        fileName: file.name,
        folder: 'products',
        userId: user?.id || 'farmer-1',
        allowVideo: false,
        compressImages: true,
        maxDimension: 1200,
        signal: controller.signal,
        onProgress: (pct) => setUploadProgress(pct),
        onStatusNote: (note) => setUploadStatusNote(note)
      });

      if (result.canceled) {
        return;
      }

      if (!result.ok || !result.url) {
        setFailedPhotoFile(file);
        setErrorMsg(result.errorMessage || 'Failed to upload product photo. Please try again.');
        return;
      }

      if (previousStoragePath && previousStoragePath !== result.storagePath) {
        void deleteFirebaseStorageFile(previousStoragePath);
      }
      setUploadedStoragePath(result.storagePath);
      setImageUrl(result.url);
      setPhotoUploadedBanner('Photo uploaded successfully!');
      mobileService.triggerHaptic('light');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Product photo upload failed:', err);
        setFailedPhotoFile(file);
        setErrorMsg(err?.message || 'Failed to process image file. Please try another photo.');
      }
    } finally {
      uploadAbortRef.current = null;
      setIsUploadingPhoto(false);
      setUploadProgress(0);
      setUploadStatusNote('');
      setPreviewObjectUrl(null);
      try {
        URL.revokeObjectURL(tempPreviewUrl);
      } catch {}
    }
  };

  const handleCaptureCamera = async () => {
    try {
      setErrorMsg('');
      const photo = await mobileService.capturePhoto('camera');
      if (photo) {
        const blob = dataUrlToBlob(photo);
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        await handleProcessFile(file);
      }
    } catch (err: any) {
      console.warn('Camera capture error:', err);
      fileInputRef.current?.click();
    }
  };

  const handleCapturePhotos = async () => {
    try {
      setErrorMsg('');
      const photo = await mobileService.capturePhoto('photos');
      if (photo) {
        const blob = dataUrlToBlob(photo);
        const file = new File([blob], `gallery_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        await handleProcessFile(file);
      }
    } catch (err: any) {
      console.warn('Gallery pick error:', err);
      fileInputRef.current?.click();
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
      const selectedCategoryObj =
        categories.find((c) => c.id === category) ||
        DEFAULT_CATEGORIES.find((c) => c.id === category);

      const farmerId = user?.id || 'farmer-1';
      const farmerName = user?.name || 'Chiredzi Green Harvest';
      const farmName = user?.farmerProfile?.farmName || `${farmerName}'s Farm`;
      const farmerAvatar =
        user?.avatar ||
        'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400';
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
        description:
          description.trim() || `${name.trim()} freshly harvested from ${farmName}`,
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
        sellerRole: user?.role || (category === 'cat-fodder' ? 'fodder_supplier' : 'farmer'),
        location,
        availability: numQty <= 0 ? 'out_of_stock' : numQty <= 10 ? 'low_stock' : 'available'
      };

      const savedFbProduct = await saveProductToFirebase(payload);

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
      setErrorMsg(
        err?.message || 'Failed to save product listing. Please check the form and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LiquidGlassModal
      id="add-edit-product-dialog"
      isOpen
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      icon={<Package className="w-5 h-5 text-[#A8E635]" />}
      title={
        product
          ? 'Edit Agricultural Listing'
          : isFodderSupplier
            ? 'List Fodder, Hay Bales & Animal Feed'
            : 'List New Farm Produce / Livestock'
      }
      subtitle="Direct farm gate listing with instant photo upload & real-time buyer visibility"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
        {successNotice && (
          <div className="p-3.5 rounded-2xl bg-[#DFF4E4] border border-[#145A38]/25 text-[#062B1F] font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#145A38] shrink-0" />
            <span>
              Listing uploaded and published successfully! Syncing live across the marketplace...
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-[#062B1F] block mb-1">
              Produce / Variety Name *
            </label>
            <input
              id="product-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fresh Red Roma Tomatoes, Boer Goat Buck"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25 font-medium"
              required
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">Category *</label>
            <div className="relative">
              <select
                id="product-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#0B3D2B]/20 text-[#062B1F] bg-white/85 focus:outline-none focus:ring-2 focus:ring-[#145A38]/25 font-medium appearance-none pr-8 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#0B3D2B]/55 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-bold text-[#062B1F] block mb-1">Price ($ USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1.50"
              className="w-full px-3 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] font-bold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">Unit of Measure *</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as ProductUnit)}
              className="w-full px-3 py-2 rounded-xl border border-[#0B3D2B]/20 text-[#062B1F] bg-white/85 font-medium"
            >
              <option value="kg">Kilogram (kg)</option>
              <option value="bale">Bale (Hay / Lucerne / Straw)</option>
              <option value="ton">Metric Ton (t)</option>
              <option value="bundle">Fodder Bundle</option>
              <option value="head">Head (Livestock / Sires)</option>
              <option value="animal">Animal (Individual)</option>
              <option value="pair">Breeding Pair (Male &amp; Female)</option>
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
            <label className="font-bold text-[#062B1F] block mb-1">Available Quantity *</label>
            <input
              type="number"
              min="0"
              value={quantityAvailable}
              onChange={(e) => setQuantityAvailable(e.target.value)}
              placeholder="50"
              className="w-full px-3 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] font-bold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">Min Order Qty</label>
            <input
              type="number"
              min="1"
              value={minOrderQuantity}
              onChange={(e) => setMinOrderQuantity(e.target.value)}
              placeholder="1"
              className="w-full px-3 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F]"
            />
          </div>
        </div>

        {category === 'cat-breeding' && (
          <div className="p-3.5 rounded-2xl bg-[#DFF4E4] border border-[#145A38]/25 text-[#062B1F] text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#145A38] shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Crossbreed &amp; Hybrid Listing Advice</strong>
              <span>
                Highlight parent genetics (e.g. Kuroiler × Roadrunner, Boer × Matabele),
                age/stage, vaccination status, and expected hybrid performance.
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="font-bold text-[#062B1F] block mb-1">
            Product Description &amp; Harvest / Lineage Notes
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe breed characteristics, pedigree, vaccinations, growth rate, soil/organic practices, and collection details..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
          />
        </div>

        <div className="space-y-3 bg-[#DFF4E4]/45 p-4 rounded-2xl border border-[#145A38]/15">
          <div className="flex items-center justify-between">
            <label className="font-bold text-[#062B1F] block">
              Product Photo (Mobile Camera &amp; Gallery Upload)
            </label>
            <span className="text-[11px] text-[#145A38] font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Auto-compressed &amp; optimized
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={previewObjectUrl || imageUrl}
                alt="Produce preview"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-[#145A38] bg-white shadow-md"
              />
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-[#062B1F]/75 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-bold">
                  <Loader2 className="w-5 h-5 animate-spin mb-1 text-[#A8E635]" />
                  <span className="tabular-nums">{uploadProgress}%</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCaptureCamera}
                  disabled={isUploadingPhoto}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#145A38] hover:bg-[#0B3D2B] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <CameraIcon className="w-3.5 h-3.5" />
                  <span>Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleCapturePhotos}
                  disabled={isUploadingPhoto}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#062B1F] hover:bg-[#0B3D2B] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#A8E635]" />
                  <span>Gallery</span>
                </button>

                <label className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#0B3D2B]/20 hover:bg-[#DFF4E4]/50 text-[#062B1F] rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-all">
                  <Upload className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Upload File</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    disabled={isUploadingPhoto}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void handleProcessFile(file);
                    }}
                  />
                </label>
              </div>

              {isUploadingPhoto && (
                <div className="p-2.5 rounded-xl bg-white/90 border border-[#145A38]/20 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#062B1F]">
                    <span className="truncate">{uploadStatusNote || 'Uploading photo...'}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tabular-nums font-bold text-[#145A38]">{uploadProgress}%</span>
                      <button
                        type="button"
                        onClick={handleCancelPhotoUpload}
                        className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#DFF4E4] overflow-hidden">
                    <div
                      className="h-full bg-[#145A38] transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {photoUploadedBanner && !isUploadingPhoto && (
                <div className="p-2 rounded-xl bg-[#DFF4E4] border border-[#145A38]/25 text-[#062B1F] text-[11px] font-bold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                    <span>{photoUploadedBanner}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhotoUploadedBanner('')}
                    className="text-[#145A38] hover:text-[#062B1F] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {failedPhotoFile && !isUploadingPhoto && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleProcessFile(failedPhotoFile)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#145A38] text-white font-bold text-[11px] hover:bg-[#0B3D2B] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Photo Upload</span>
                  </button>
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleProcessFile(file);
                }}
                className={`border-2 border-dashed rounded-xl p-2.5 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-[#145A38] bg-[#DFF4E4] text-[#062B1F]'
                    : 'border-[#0B3D2B]/20 hover:border-[#145A38] bg-white/75 text-[#0B3D2B]/70'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-[11px] font-medium">
                  Drag &amp; drop high-res image here or click to browse (JPG, PNG, WebP)
                </span>
              </div>

              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste direct image URL (e.g. https://...)"
                className="w-full px-3 py-1.5 rounded-xl border border-[#0B3D2B]/20 bg-white text-[#062B1F] text-xs focus:outline-none focus:ring-1 focus:ring-[#145A38]"
              />
            </div>
          </div>

          <div className="pt-1">
            <span className="text-[11px] font-bold text-[#0B3D2B]/80 block mb-1.5">
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
                  className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    imageUrl === img.url
                      ? 'border-[#145A38] ring-2 ring-[#A8E635] scale-105'
                      : 'border-white/70 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-[#062B1F] block mb-1">
              Harvest / Collection Date
            </label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F]"
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">
              Best Before / Expiry (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F]"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#DFF4E4]/65 border border-[#145A38]/20 cursor-pointer">
          <input
            type="checkbox"
            checked={isOrganic}
            onChange={(e) => setIsOrganic(e.target.checked)}
            className="w-4 h-4 text-[#145A38] rounded-sm focus:ring-[#145A38]"
          />
          <div>
            <span className="font-bold text-[#062B1F] text-xs flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-[#145A38]" />
              100% Organic Certified / Grown without Synthetic Chemicals
            </span>
            <p className="text-[11px] text-[#0B3D2B]/70">
              Adds the verified green organic badge to your listing
            </p>
          </div>
        </label>

        <div className="pt-2">
          <LiquidGlassButton
            id="save-product-listing-btn"
            type="submit"
            variant="lime"
            size="lg"
            disabled={isSubmitting || isUploadingPhoto}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Listing to Firestore...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {product ? 'Update Product Listing' : 'Publish Product to Marketplace'}
                </span>
              </>
            )}
          </LiquidGlassButton>
        </div>
      </form>
    </LiquidGlassModal>
  );
};
