import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
  User as UserIcon,
  Camera,
  Upload,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  Sprout,
  Wheat
} from 'lucide-react';

interface FarmerProfileModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_AVATARS = [
  {
    label: 'Horticulture Producer',
    url: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
  },
  {
    label: 'Pastoral & Poultry',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400'
  },
  {
    label: 'Livestock Specialist',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
  },
  {
    label: 'Agronomy Manager',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'
  },
  {
    label: 'Organic Grower',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400'
  }
];

const PROVINCES = [
  'Harare',
  'Bulawayo',
  'Mashonaland East',
  'Mashonaland West',
  'Mashonaland Central',
  'Manicaland',
  'Midlands',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South'
];

const PRACTICE_TAGS = [
  '100% Organic',
  'Greenhouse Grown',
  'Drip Irrigated',
  'Free-Range Poultry',
  'F1 Hybrid Stock',
  'Regenerative Soil',
  'Chemical-Free',
  'Hydroponic',
  'Same-Day Harvest',
  'Sun-Cured Hay',
  'High-Protein Forage',
  'Silage & Concentrates'
];

export const FarmerProfileModal: React.FC<FarmerProfileModalProps> = ({
  onClose,
  onSuccess
}) => {
  const { user, updateUserProfile } = useAuth();
  const isFodderSupplier = user?.role === 'fodder_supplier';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || PRESET_AVATARS[0].url);
  const [phone, setPhone] = useState(user?.phone || '');
  const [farmName, setFarmName] = useState(
    user?.farmerProfile?.farmName ||
      `${user?.name || (isFodderSupplier ? 'Supplier' : 'Farmer')}'s ${isFodderSupplier ? 'Fodder Supply' : 'Farm'}`
  );
  const [bio, setBio] = useState(user?.farmerProfile?.bio || '');
  const [farmSize, setFarmSize] = useState(user?.farmerProfile?.farmSize || '15 Hectares');
  const [address, setAddress] = useState(user?.farmerProfile?.address || '');
  const [city, setCity] = useState(user?.location?.city || 'Harare');
  const [province, setProvince] = useState(user?.location?.province || 'Harare');
  const [community] = useState(user?.location?.community || 'Direct Delivery Area');
  const [whatsapp, setWhatsapp] = useState(user?.farmerProfile?.whatsapp || user?.phone || '');
  const [selectedPractices, setSelectedPractices] = useState<string[]>(
    user?.farmerProfile?.practices || ['100% Organic', 'Same-Day Harvest']
  );

  const [pickupInstructions, setPickupInstructions] = useState(
    user?.farmerProfile?.pickupInstructions || ''
  );

  const [ecocash, setEcocash] = useState(user?.farmerProfile?.paymentInfo?.ecocash || '');
  const [onemoney, setOnemoney] = useState(user?.farmerProfile?.paymentInfo?.onemoney || '');
  const [innbucks, setInnbucks] = useState(user?.farmerProfile?.paymentInfo?.innbucks || '');
  const [bankInfo, setBankInfo] = useState(user?.farmerProfile?.paymentInfo?.bankAccount || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const togglePractice = (tag: string) => {
    if (selectedPractices.includes(tag)) {
      setSelectedPractices(selectedPractices.filter((t) => t !== tag));
    } else {
      setSelectedPractices([...selectedPractices, tag]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      const updates: Partial<User> = {
        name: name.trim() || user.name,
        avatar,
        phone: phone.trim(),
        location: {
          country: 'Zimbabwe',
          province,
          city: city.trim(),
          community: community.trim(),
          address: address.trim()
        },
        farmerProfile: {
          ...(user.farmerProfile || {}),
          farmName: farmName.trim(),
          bio: bio.trim(),
          farmSize: farmSize.trim(),
          address: address.trim(),
          pickupInstructions: pickupInstructions.trim(),
          whatsapp: whatsapp.trim(),
          practices: selectedPractices,
          paymentInfo: {
            ecocash: ecocash.trim(),
            onemoney: onemoney.trim(),
            innbucks: innbucks.trim(),
            bankAccount: bankInfo.trim()
          }
        }
      };

      await updateUserProfile(updates);
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update farmer profile:', err);
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LiquidGlassModal
      id="farmer-profile-modal-dialog"
      isOpen
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      icon={
        isFodderSupplier ? (
          <Wheat className="w-5 h-5 text-[#F4D35E]" />
        ) : (
          <Sprout className="w-5 h-5 text-[#A8E635]" />
        )
      }
      title={
        isFodderSupplier ? 'Edit Fodder Supplier & Store Profile' : 'Edit Farmer & Farm Profile'
      }
      subtitle={`Update your public ${isFodderSupplier ? 'fodder depot' : 'produce store'}, contact numbers, and verified details`}
    >
      <span id="close-farmer-profile-modal-btn" className="sr-only" onClick={onClose} />

      <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-[#DFF4E4] border border-[#145A38]/25 text-[#062B1F] font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#145A38] shrink-0" />
            <span>Farmer profile and store settings saved successfully!</span>
          </div>
        )}

        {/* 1. Avatar Editor */}
        <div className="bg-[#DFF4E4]/45 p-4 rounded-2xl border border-[#145A38]/15 space-y-3">
          <label className="font-bold text-[#062B1F] block text-xs uppercase tracking-wider">
            Profile Picture / Farm Avatar
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={avatar}
                alt="Profile preview"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[#145A38] shadow-md bg-white"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-[#062B1F]/55 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Upload custom photo"
              >
                <Camera className="w-5 h-5 mb-0.5 text-[#A8E635]" />
                <span className="text-[10px] font-bold">Change</span>
              </button>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="Enter image URL or choose preset below"
                  className="flex-1 px-3 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-xs text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-white hover:bg-[#DFF4E4]/60 text-[#062B1F] border border-[#0B3D2B]/20 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Upload</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#0B3D2B]/70">
                <span className="inline-flex items-center gap-1 text-[#145A38] font-medium">
                  <Sparkles className="w-3 h-3 text-[#145A38]" />
                  Recommended size: <strong>400 × 400px (Square 1:1)</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-[#0B3D2B]/55 uppercase shrink-0">
                  Presets:
                </span>
                {PRESET_AVATARS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatar(preset.url)}
                    className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-transform shrink-0 cursor-pointer ${
                      avatar === preset.url
                        ? 'border-[#145A38] scale-110 shadow-xs'
                        : 'border-white/70 opacity-75 hover:opacity-100'
                    }`}
                    title={preset.label}
                  >
                    <img src={preset.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Name & Farm Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-[#062B1F] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#145A38]" />
                <span>Producer Full Name *</span>
              </label>
              <span className="text-[10px] font-semibold text-[#145A38] bg-[#DFF4E4] px-2 py-0.5 rounded-md border border-[#145A38]/20">
                Editable
              </span>
            </div>
            <input
              id="farmer-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tendai Moyo"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] font-semibold focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
              required
            />
            <p className="text-[10px] text-[#0B3D2B]/65 mt-1">
              Your primary producer and account contact name.
            </p>
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">
              Public Farm / Brand Name *
            </label>
            <input
              id="farmer-farm-name-input"
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g. GreenFields Organic Farm"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] font-semibold focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
              required
            />
            <p className="text-[10px] text-[#0B3D2B]/65 mt-1">
              Displayed across product listings, search results, and public store pages.
            </p>
          </div>
        </div>

        {/* 3. Contact Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-bold text-[#062B1F] block mb-1">Contact Phone *</label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-[#145A38]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263 77 123 4567"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F]"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">WhatsApp Direct</label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-[#145A38] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+263 71 890 1234"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#0B3D2B]/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                readOnly
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#0B3D2B]/12 bg-stone-100 text-stone-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* 4. Bio */}
        <div>
          <label className="font-bold text-[#062B1F] block mb-1">
            About Your Farm &amp; Practices
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell buyers about your agricultural methods, soil care, harvesting schedule, and quality guarantees..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
          />
        </div>

        {/* 5. Location */}
        <div className="bg-[#DFF4E4]/45 p-4 rounded-2xl border border-[#145A38]/15 space-y-3">
          <div className="font-bold text-[#062B1F] flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-[#145A38]" />
            <span>Location &amp; Farm Dispatch Hub</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-[#062B1F] block mb-1">Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
              >
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#062B1F] block mb-1">
                City / District
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Harare North"
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#062B1F] block mb-1">
                Farm Land Area / Size
              </label>
              <input
                type="text"
                value={farmSize}
                onChange={(e) => setFarmSize(e.target.value)}
                placeholder="e.g. 20 Hectares"
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#062B1F] block mb-1">
              Physical Farm Gate / Dispatch Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Plot 14, Golden Valley Agri Corridor, Old Mazowe Rd"
              className="w-full px-3.5 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#062B1F] block mb-1">
              Default Farm Pickup Instructions (for buyers collecting at farm)
            </label>
            <textarea
              rows={2}
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
              placeholder="e.g. Gate opens 7:00 AM – 5:00 PM Mon–Sat. Call 15 mins before arrival at the main shed."
              className="w-full px-3.5 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
            />
          </div>
        </div>

        {/* 6. Practices */}
        <div>
          <label className="font-bold text-[#062B1F] block mb-1.5">
            Farming Practices Badges
          </label>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_TAGS.map((tag) => {
              const active = selectedPractices.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => togglePractice(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-[#062B1F] text-[#A8E635] shadow-xs'
                      : 'bg-white/80 text-[#0B3D2B] hover:bg-[#DFF4E4]/60 border border-[#0B3D2B]/15'
                  }`}
                >
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#A8E635]" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. Payout Details */}
        <div className="bg-[#DFF4E4]/45 p-4 rounded-2xl border border-[#145A38]/15 space-y-3">
          <div className="font-bold text-[#062B1F] flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-[#145A38]" />
            <span>Receiving Payout Credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold text-[#062B1F] block mb-1">
                EcoCash Merchant / No.
              </label>
              <input
                type="text"
                value={ecocash}
                onChange={(e) => setEcocash(e.target.value)}
                placeholder="e.g. 0772 123 456"
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#062B1F] block mb-1">OneMoney No.</label>
              <input
                type="text"
                value={onemoney}
                onChange={(e) => setOnemoney(e.target.value)}
                placeholder="e.g. 0712 345 678"
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#062B1F] block mb-1">InnBucks Handle</label>
              <input
                type="text"
                value={innbucks}
                onChange={(e) => setInnbucks(e.target.value)}
                placeholder="e.g. INB-8839"
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#062B1F] block mb-1">
                Bank Name &amp; Acc No.
              </label>
              <input
                type="text"
                value={bankInfo}
                onChange={(e) => setBankInfo(e.target.value)}
                placeholder="e.g. CABS 100492812"
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0B3D2B]/10">
          <LiquidGlassButton variant="light" size="sm" onClick={onClose}>
            Cancel
          </LiquidGlassButton>
          <LiquidGlassButton
            id="save-farmer-profile-submit-btn"
            type="submit"
            variant="lime"
            size="sm"
            disabled={isSaving}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </LiquidGlassButton>
        </div>
      </form>
    </LiquidGlassModal>
  );
};
