import React, { useState, useEffect } from 'react';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import { User, AdminAuditLog } from '../types';
import { api } from '../services/api';
import { adminUpdateFarmerProfileInFirebase } from '../services/firebaseUsers';
import {
  User as UserIcon,
  Phone,
  MapPin,
  Sprout,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';

interface AdminEditFarmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: User | null;
  adminUser: User;
  onSaved: (updatedUser: User, auditLog?: AdminAuditLog) => void;
}

const PROVINCES = [
  'Harare',
  'Bulawayo',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands'
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

export const AdminEditFarmerModal: React.FC<AdminEditFarmerModalProps> = ({
  isOpen,
  onClose,
  farmer,
  adminUser,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [farmName, setFarmName] = useState('');
  const [province, setProvince] = useState('Harare');
  const [city, setCity] = useState('Harare');
  const [address, setAddress] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [bio, setBio] = useState('');
  const [practices, setPractices] = useState<string[]>([]);
  const [adminNote, setAdminNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && farmer) {
      setName(farmer.name || '');
      setPhone(farmer.phone || '');
      setFarmName(farmer.farmerProfile?.farmName || `${farmer.name}'s Farm`);
      setProvince(farmer.location?.province || 'Harare');
      setCity(farmer.location?.city || 'Harare');
      setAddress(farmer.farmerProfile?.address || farmer.location?.address || '');
      setFarmSize(farmer.farmerProfile?.farmSize || '');
      setBio(farmer.farmerProfile?.bio || farmer.farmerProfile?.farmDescription || '');
      setPractices(
        farmer.farmerProfile?.practices ||
          farmer.farmerProfile?.farmingPractices ||
          []
      );
      setAdminNote('');
      setErrorMsg('');
    }
  }, [isOpen, farmer]);

  if (!farmer) return null;

  const togglePractice = (tag: string) => {
    setPractices((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanFarmName = farmName.trim();
    const cleanCity = city.trim();
    const cleanAddress = address.trim();

    if (!cleanName) {
      setErrorMsg('Farmer full name is required.');
      return;
    }
    if (!cleanFarmName) {
      setErrorMsg('Farm / store name is required.');
      return;
    }
    if (!cleanCity) {
      setErrorMsg('City / district is required.');
      return;
    }

    setSaving(true);
    try {
      const nextLocation: User['location'] = {
        country: farmer.location?.country || 'Zimbabwe',
        province,
        city: cleanCity,
        community: farmer.location?.community,
        address: cleanAddress
      };

      const nextFarmerProfile = {
        ...(farmer.farmerProfile || {}),
        farmName: cleanFarmName,
        address: cleanAddress,
        bio: bio.trim(),
        farmDescription: bio.trim(),
        farmSize: farmSize.trim(),
        practices,
        farmingPractices: practices,
        whatsapp: cleanPhone || farmer.farmerProfile?.whatsapp
      };

      const apiResult = await api.adminUpdateFarmerProfile(farmer.id, {
        actingAdminId: adminUser.id,
        name: cleanName,
        phone: cleanPhone,
        email: farmer.email,
        avatar: farmer.avatar,
        role: farmer.role,
        location: nextLocation,
        farmerProfile: nextFarmerProfile,
        note: adminNote.trim() || undefined
      });

      await adminUpdateFarmerProfileInFirebase({
        targetUser: farmer,
        updates: {
          name: cleanName,
          phone: cleanPhone,
          location: nextLocation,
          farmerProfile: nextFarmerProfile
        },
        admin: { id: adminUser.id, name: adminUser.name },
        auditLog: apiResult.auditLog,
        note: adminNote.trim() || undefined
      });

      onSaved(apiResult.user, apiResult.auditLog);
      onClose();
    } catch (err: any) {
      console.error('Admin farmer profile update failed:', err);
      setErrorMsg(err?.message || 'Could not save farmer profile updates. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LiquidGlassModal
      id="admin-edit-farmer-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Farmer Information"
      subtitle={`Admin override for ${farmer.name} (${farmer.email})`}
      icon={<ShieldCheck className="w-5 h-5 text-[#A8E635]" />}
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-[#DFF4E4]/70 border border-[#145A38]/20 text-[#062B1F] font-medium">
          Changes saved here immediately synchronize to Firestore, Marketplace listings, and the farmer's active profile. All edits are logged in the Admin Audit Trail. Login credentials cannot be modified here.
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-[#145A38]" />
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] font-semibold focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
              required
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-[#145A38]" />
              <span>Phone Number</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+263 77 ..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] font-semibold focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5 text-[#145A38]" />
              <span>Farm / Business Name *</span>
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] font-semibold focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
              required
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">Farm Size</label>
            <input
              type="text"
              value={farmSize}
              onChange={(e) => setFarmSize(e.target.value)}
              placeholder="e.g. 15 Hectares"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#145A38]" />
              <span>Province *</span>
            </label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
            >
              {PROVINCES.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">City / District *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-bold text-[#062B1F] block mb-1">Physical Farm / Dispatch Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Plot number, road, district"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-bold text-[#062B1F] block mb-1">Farm Bio / Description</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-[#062B1F] block mb-1.5">Farming Practices</label>
          <div className="flex flex-wrap gap-1.5">
            {PRACTICE_TAGS.map((tag) => {
              const active = practices.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => togglePractice(tag)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#062B1F] text-[#A8E635]'
                      : 'bg-white/80 text-[#0B3D2B] border border-[#062B1F]/15 hover:bg-[#DFF4E4]/50'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="font-bold text-[#062B1F] block mb-1">Audit Reason / Admin Note (optional)</label>
          <input
            type="text"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="e.g. Approved support ticket sup-... phone correction"
            className="w-full px-3.5 py-2 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F]"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#062B1F]/10">
          <LiquidGlassButton type="button" variant="light" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </LiquidGlassButton>
          <LiquidGlassButton
            id="admin-save-farmer-info-btn"
            type="submit"
            variant="lime"
            size="sm"
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving Updates...' : 'Save Farmer Info'}</span>
          </LiquidGlassButton>
        </div>
      </form>
    </LiquidGlassModal>
  );
};
