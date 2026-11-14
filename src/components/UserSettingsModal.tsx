import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSellerRole } from '../types';
import { DeleteAccountModal } from './DeleteAccountModal';
import {
  X,
  User as UserIcon,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  ShieldCheck
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

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setProvince(user.location?.province || 'Harare');
      setCity(user.location?.city || 'Harare');
      setAddress(user.buyerProfile?.preferredDeliveryAddress || user.location?.address || '');
      setSavedMsg('');
      setErrorMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isSeller = isSellerRole(user.role);
  const isAdmin = user.role === 'admin';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    setSavedMsg('');
    try {
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        location: {
          ...(user.location || { country: 'Zimbabwe' }),
          country: user.location?.country || 'Zimbabwe',
          province,
          city: city.trim() || province,
          address: address.trim()
        },
        buyerProfile:
          user.role === 'buyer'
            ? {
                ...(user.buyerProfile || {}),
                preferredDeliveryAddress: address.trim()
              }
            : user.buyerProfile
      });
      setSavedMsg('Your settings have been updated.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">User Settings</h2>
              <p className="text-xs text-stone-500">
                Manage your personal profile, delivery details, and account preferences
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              aria-label="Close user settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {savedMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover border border-stone-300 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-stone-900 truncate">{user.name}</div>
                <div className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" />
                  <span>{user.email}</span>
                </div>
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-0.5 capitalize">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user.role.replace('_', ' ')} Account</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-stone-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+263 77 ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  Province
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">City / District</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Harare"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {!isSeller && (
                <div className="sm:col-span-2">
                  <label className="font-bold text-stone-700 block mb-1">
                    Default Delivery Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, suburb, landmarks"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>

          {/* Account Management / Danger Zone (Buyers & Farmers/Suppliers) */}
          {!isAdmin && (
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Account Management
                </div>
                <p className="text-[11px] text-stone-500">
                  Permanently close your FarmBridge account and remove personal data.
                </p>
              </div>
              <button
                type="button"
                id="user-settings-delete-account-btn"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline shrink-0 cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          )}
        </div>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={() => {
          setShowDeleteModal(false);
          onClose();
          if (onAccountDeleted) onAccountDeleted();
        }}
      />
    </>
  );
};
