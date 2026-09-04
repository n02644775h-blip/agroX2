import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import {
  X,
  User as UserIcon,
  Camera,
  Upload,
  Lock,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  ShieldCheck,
  CreditCard,
  Layers,
  Sprout
} from 'lucide-react';

interface FarmerProfileModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_AVATARS = [
  { label: 'Horticulture Producer', url: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400' },
  { label: 'Pastoral & Poultry', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400' },
  { label: 'Livestock Specialist', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' },
  { label: 'Agronomy Manager', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400' },
  { label: 'Organic Grower', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400' }
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
  'Same-Day Harvest'
];

export const FarmerProfileModal: React.FC<FarmerProfileModalProps> = ({ onClose, onSuccess }) => {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || PRESET_AVATARS[0].url);
  const [phone, setPhone] = useState(user?.phone || '');
  const [farmName, setFarmName] = useState(user?.farmerProfile?.farmName || `${user?.name || 'Farmer'}'s Farm`);
  const [bio, setBio] = useState(user?.farmerProfile?.bio || '');
  const [farmSize, setFarmSize] = useState(user?.farmerProfile?.farmSize || '15 Hectares');
  const [address, setAddress] = useState(user?.farmerProfile?.address || '');
  const [city, setCity] = useState(user?.location?.city || 'Harare');
  const [province, setProvince] = useState(user?.location?.province || 'Harare');
  const [community, setCommunity] = useState(user?.location?.community || 'Direct Delivery Area');
  const [whatsapp, setWhatsapp] = useState(user?.farmerProfile?.whatsapp || user?.phone || '');
  const [selectedPractices, setSelectedPractices] = useState<string[]>(
    user?.farmerProfile?.practices || ['100% Organic', 'Same-Day Harvest']
  );
  
  // Payment credentials
  const [ecocash, setEcocash] = useState(user?.farmerProfile?.paymentInfo?.ecocash || '');
  const [innbucks, setInnbucks] = useState(user?.farmerProfile?.paymentInfo?.innbucks || '');
  const [bankInfo, setBankInfo] = useState(user?.farmerProfile?.paymentInfo?.bankAccount || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const togglePractice = (tag: string) => {
    if (selectedPractices.includes(tag)) {
      setSelectedPractices(selectedPractices.filter(t => t !== tag));
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
          whatsapp: whatsapp.trim(),
          practices: selectedPractices,
          paymentInfo: {
            ecocash: ecocash.trim(),
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        id="farmer-profile-modal-dialog"
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-6 border border-stone-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-xl">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg">
                Edit Farmer & Farm Profile
              </h2>
              <p className="text-xs text-emerald-200/80">
                Update your public produce store, contact numbers, and verified farm details
              </p>
            </div>
          </div>
          <button
            id="close-farmer-profile-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Farmer profile and store settings saved successfully!</span>
            </div>
          )}

          {/* 1. Profile Picture / Avatar Editor */}
          <div className="bg-stone-50 p-4.5 rounded-2xl border border-stone-200 space-y-3">
            <label className="font-bold text-stone-900 block text-xs uppercase tracking-wider">
              Profile Picture / Farm Avatar
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={avatar}
                  alt="Profile preview"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-emerald-600 shadow-md bg-white"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Upload custom photo"
                >
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-bold">Change</span>
                </button>
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    placeholder="Enter image URL or choose preset below"
                    className="flex-1 px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                    className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Recommended size: <strong>400 × 400px (Square 1:1)</strong>
                  </span>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase shrink-0">Presets:</span>
                  {PRESET_AVATARS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatar(preset.url)}
                      className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-transform shrink-0 ${
                        avatar === preset.url ? 'border-emerald-600 scale-110 shadow-xs' : 'border-stone-200 opacity-70 hover:opacity-100'
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

          {/* 2. Full Name & Farm Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FULL NAME - FULLY EDITABLE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-stone-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Producer Full Name *
                </label>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Editable
                </span>
              </div>
              <input
                id="farmer-name-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Tendai Moyo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Your primary producer and account contact name.
              </p>
            </div>

            {/* FARM NAME - EDITABLE */}
            <div>
              <label className="font-bold text-stone-700 block mb-1">Public Farm / Brand Name *</label>
              <input
                id="farmer-farm-name-input"
                type="text"
                value={farmName}
                onChange={e => setFarmName(e.target.value)}
                placeholder="e.g. GreenFields Organic Farm"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Displayed across product listings, search results, and public store pages.
              </p>
            </div>
          </div>

          {/* 3. Contact Numbers (Phone, WhatsApp, Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Contact Phone *</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+263 77 123 4567"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-stone-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">WhatsApp Direct</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="+263 71 890 1234"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* 4. Bio & Farm Story */}
          <div>
            <label className="font-bold text-stone-700 block mb-1">About Your Farm & Practices</label>
            <textarea
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell buyers about your agricultural methods, soil care, harvesting schedule, and quality guarantees..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* 5. Location & Dispatch Address */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="font-bold text-stone-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>Location & Farm Dispatch Hub</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Province</label>
                <select
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-stone-900"
                >
                  {PROVINCES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">City / District</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Harare North"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-stone-900"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Farm Land Area / Size</label>
                <input
                  type="text"
                  value={farmSize}
                  onChange={e => setFarmSize(e.target.value)}
                  placeholder="e.g. 20 Hectares"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Physical Farm Gate / Dispatch Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Plot 14, Golden Valley Agri Corridor, Old Mazowe Rd"
                className="w-full px-3.5 py-2 bg-white rounded-xl border border-stone-300 text-stone-900"
              />
            </div>
          </div>

          {/* 6. Farming Practices & Badges */}
          <div>
            <label className="font-bold text-stone-700 block mb-1.5">Farming Practices Badges</label>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_TAGS.map(tag => {
                const active = selectedPractices.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => togglePractice(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Payout Details */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="font-bold text-stone-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>Receiving Payout Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">EcoCash Merchant / No.</label>
                <input
                  type="text"
                  value={ecocash}
                  onChange={e => setEcocash(e.target.value)}
                  placeholder="e.g. 0772 123 456 / EC-994"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-stone-900"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">InnBucks Handle</label>
                <input
                  type="text"
                  value={innbucks}
                  onChange={e => setInnbucks(e.target.value)}
                  placeholder="e.g. INB-8839"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-stone-900"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Bank Name & Acc No.</label>
                <input
                  type="text"
                  value={bankInfo}
                  onChange={e => setBankInfo(e.target.value)}
                  placeholder="e.g. CABS 100492812"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-stone-900"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-farmer-profile-submit-btn"
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-all shadow-md active:scale-98 disabled:bg-stone-300 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
