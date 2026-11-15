import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSellerRole } from '../types';
import { DeleteAccountModal } from './DeleteAccountModal';
import { ContactSupportModal } from './ContactSupportModal';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
  User as UserIcon,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Settings,
  Lock,
  ChevronDown,
  ChevronUp,
  Headphones
} from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted?: () => void;
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

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  onAccountDeleted
}) => {
  const { user, updateUserProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState(user?.location?.province || 'Harare');
  const [city, setCity] = useState(user?.location?.city || 'Harare');
  const [address, setAddress] = useState(
    user?.buyerProfile?.preferredDeliveryAddress || user?.location?.address || ''
  );

  const [isEditExpanded, setIsEditExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setProvince(user.location?.province || 'Harare');
      setCity(user.location?.city || 'Harare');
      setAddress(user.buyerProfile?.preferredDeliveryAddress || user.location?.address || '');
      setIsEditExpanded(false);
      setSavedMsg('');
      setErrorMsg('');
    }
  }, [user, isOpen]);

  if (!user) return null;

  const isSeller = isSellerRole(user.role);
  const isAdmin = user.role === 'admin';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedMsg('');

    const cleanCity = city.trim();
    const cleanAddress = address.trim();
    if (isAdmin && !name.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }
    if (!cleanCity) {
      setErrorMsg('City / District cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        ...(isAdmin ? { name: name.trim(), phone: phone.trim() } : {}),
        location: {
          ...(user.location || { country: 'Zimbabwe' }),
          country: user.location?.country || 'Zimbabwe',
          province,
          city: cleanCity,
          address: cleanAddress
        },
        buyerProfile:
          user.role === 'buyer'
            ? {
                ...(user.buyerProfile || {}),
                preferredDeliveryAddress: cleanAddress
              }
            : user.buyerProfile
      });
      setSavedMsg('Changes saved successfully!');
      setIsEditExpanded(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <LiquidGlassModal
        isOpen={isOpen}
        onClose={onClose}
        title="User Settings"
        subtitle="Manage your personal profile, delivery details, and account preferences"
        icon={<Settings className="w-5 h-5 text-[#A8E635]" />}
        maxWidthClass="max-w-lg"
      >
        <div className="p-5 sm:p-7 space-y-5 text-xs">
          {savedMsg && (
            <div className="p-3.5 rounded-2xl bg-[#DFF4E4]/90 border border-[#145A38]/25 text-[#062B1F] font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#145A38] shrink-0" />
              <span>{savedMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-800 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Profile Summary Card */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/80 border border-white shadow-xs">
            <img
              src={user.avatar}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-cover border-2 border-[#A8E635]/60 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[#062B1F] truncate text-sm">{user.name}</div>
              <div className="text-[11px] text-[#0B3D2B]/70 flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#145A38] mt-0.5 capitalize">
                <ShieldCheck className="w-3 h-3" />
                <span>{user.role.replace('_', ' ')} Account</span>
              </div>
            </div>
          </div>

          {/* Locked Identity Section (Non-Admin Users) */}
          <div className="p-4 rounded-2xl bg-white/75 border border-[#062B1F]/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-extrabold text-[#062B1F] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#145A38]" />
                <span>Protected Identity Details</span>
              </div>
              {!isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                  <Lock className="w-2.5 h-2.5" />
                  Locked
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => isAdmin && setName(e.target.value)}
                  disabled={!isAdmin}
                  readOnly={!isAdmin}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    !isAdmin
                      ? 'bg-stone-100/90 border-[#062B1F]/10 text-[#062B1F]/75 cursor-not-allowed'
                      : 'bg-white/90 border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="text"
                  value={phone || (!isAdmin ? 'Not provided' : '')}
                  onChange={(e) => isAdmin && setPhone(e.target.value)}
                  disabled={!isAdmin}
                  readOnly={!isAdmin}
                  placeholder="+263 77 ..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    !isAdmin
                      ? 'bg-stone-100/90 border-[#062B1F]/10 text-[#062B1F]/75 cursor-not-allowed'
                      : 'bg-white/90 border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25'
                  }`}
                />
              </div>
            </div>

            {!isAdmin && (
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-[#062B1F]/8">
                <p className="text-[11px] text-[#0B3D2B]/75 leading-snug">
                  Full name and phone number can only be changed through FarmBridge Support.
                </p>
                <button
                  type="button"
                  id="settings-contact-support-btn"
                  onClick={() => setShowSupportModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#DFF4E4] hover:bg-[#145A38] text-[#062B1F] hover:text-white border border-[#145A38]/20 font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Contact Support to Update Details</span>
                </button>
              </div>
            )}
          </div>

          {/* Location Summary + Collapsible Edit Profile Section */}
          <div className="p-4 rounded-2xl bg-white/80 border border-[#062B1F]/10 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-extrabold text-[#062B1F] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Location &amp; Delivery Settings</span>
                </div>
                <p className="text-[11px] text-[#0B3D2B]/75 truncate mt-0.5">
                  {user.location?.city || city}, {user.location?.province || province}
                  {(user.buyerProfile?.preferredDeliveryAddress || user.location?.address)
                    ? ` · ${user.buyerProfile?.preferredDeliveryAddress || user.location?.address}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                id="user-settings-toggle-edit-btn"
                onClick={() => {
                  setIsEditExpanded((prev) => !prev);
                  setErrorMsg('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#062B1F]/6 hover:bg-[#145A38] text-[#062B1F] hover:text-white font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
              >
                <span>{isEditExpanded ? 'Minimize' : 'Edit Profile'}</span>
                {isEditExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {isEditExpanded && (
              <form onSubmit={handleSave} className="space-y-3.5 pt-3 border-t border-[#062B1F]/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      placeholder="Harare"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                      required
                    />
                  </div>

                  {!isSeller && (
                    <div className="sm:col-span-2">
                      <label className="font-bold text-[#062B1F] block mb-1">
                        Default Delivery Address
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street address, suburb, landmarks"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <LiquidGlassButton
                    type="button"
                    variant="light"
                    size="sm"
                    onClick={() => setIsEditExpanded(false)}
                    disabled={saving}
                  >
                    Cancel
                  </LiquidGlassButton>
                  <LiquidGlassButton
                    id="user-settings-save-changes-btn"
                    type="submit"
                    variant="emerald"
                    size="sm"
                    disabled={saving}
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </LiquidGlassButton>
                </div>
              </form>
            )}
          </div>

          {/* Account Management / Danger Zone (Buyers & Farmers/Suppliers) */}
          {!isAdmin && (
            <div className="pt-4 border-t border-[#062B1F]/10 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0B3D2B]/55">
                  Account Management
                </div>
                <p className="text-[11px] text-[#0B3D2B]/70">
                  Permanently close your FarmBridge account and remove personal data.
                </p>
              </div>
              <button
                type="button"
                id="user-settings-delete-account-btn"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline shrink-0 cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          )}
        </div>
      </LiquidGlassModal>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={() => {
          setShowDeleteModal(false);
          onClose();
          if (onAccountDeleted) onAccountDeleted();
        }}
      />

      <ContactSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </>
  );
};
