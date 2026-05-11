import { useState, FormEvent, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
} from '../api/profile';
import { Avatar } from '../components/Avatar';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { checkPasswordStrength } from '../utils/passwordStrength';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Avatar
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!user) return null;

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);
    try {
      const updates: { name?: string | null; email?: string } = {};
      if (name !== (user.name ?? '')) updates.name = name || null;
      if (email !== user.email) updates.email = email;

      if (Object.keys(updates).length === 0) {
        setProfileSuccess('Без змін');
        setIsSavingProfile(false);
        return;
      }

      const updated = await updateProfile(updates);
      setUser(updated);
      setProfileSuccess('Профіль оновлено');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const details = err.response?.data?.details;
        if (Array.isArray(details)) setProfileError(details.join('; '));
        else setProfileError(err.response?.data?.error ?? 'Помилка');
      } else {
        setProfileError('Невідома помилка');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Дозволено JPEG, PNG, WebP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Файл завеликий. Максимум 2 МБ');
      return;
    }

    setAvatarError(null);
    setIsUploading(true);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
      setAvatarRefreshKey((k) => k + 1);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setAvatarError(err.response?.data?.error ?? 'Помилка завантаження');
      } else {
        setAvatarError('Невідома помилка');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarError(null);
    try {
      const updated = await deleteAvatar();
      setUser(updated);
      setAvatarRefreshKey((k) => k + 1);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setAvatarError(err.response?.data?.error ?? 'Помилка видалення');
      }
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Нові паролі не співпадають');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('Новий пароль має відрізнятись від поточного');
      return;
    }

    const strength = checkPasswordStrength(newPassword, { email: user.email, name: user.name });
    if (!strength.isValid) {
      setPasswordError('Виправ помилки в паролі: ' + strength.issues.join('; '));
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Пароль успішно змінено');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (data?.details?.issues && Array.isArray(data.details.issues)) {
          setPasswordError('Пароль: ' + data.details.issues.join('; '));
        } else {
          setPasswordError(data?.error ?? 'Помилка');
        }
      } else {
        setPasswordError('Невідома помилка');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Профіль</h1>

      {/* Avatar */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Аватар</h2>
        <div className="flex items-center gap-6">
          <Avatar user={user} size="xl" refreshKey={avatarRefreshKey} />
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition disabled:opacity-50 text-sm"
            >
              {isUploading ? 'Завантаження…' : 'Завантажити фото'}
            </button>
            {user.has_avatar && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Видалити фото
              </button>
            )}
            <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP — до 2 МБ</p>
            {avatarError && <p className="text-xs text-red-600 mt-1">{avatarError}</p>}
          </div>
        </div>
      </div>

      {/* Profile data */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Особисті дані</h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Імʼя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Як до тебе звертатись"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            {!user.email_verified && (
              <p className="text-xs text-amber-700 mt-1">⚠ Email не підтверджено</p>
            )}
          </div>

          {profileError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded text-sm">
              {profileSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingProfile}
            className="bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
          >
            {isSavingProfile ? 'Збереження…' : 'Зберегти зміни'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Зміна паролю</h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Поточний пароль
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Новий пароль
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              autoComplete="new-password"
            />
            <PasswordStrengthMeter
              password={newPassword}
              userInfo={{ email: user.email, name: user.name }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Повтори новий пароль
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              autoComplete="new-password"
            />
            {confirmNewPassword && newPassword !== confirmNewPassword && (
              <p className="text-xs text-red-600 mt-1">Паролі не співпадають</p>
            )}
          </div>

          {passwordError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded text-sm">
              {passwordSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
          >
            {isChangingPassword ? 'Зміна…' : 'Змінити пароль'}
          </button>
        </form>
      </div>
    </div>
  );
}
