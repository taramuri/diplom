import { useState, FormEvent, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadAvatar, deleteAvatar } from '../api/profile';
import { Avatar } from '../components/Avatar';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

  if (!user) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const updates: { name?: string | null; email?: string } = {};
      if (name !== (user.name ?? '')) updates.name = name || null;
      if (email !== user.email) updates.email = email;

      if (Object.keys(updates).length === 0) {
        setSuccess('Без змін');
        setIsSaving(false);
        return;
      }

      const updated = await updateProfile(updates);
      setUser(updated);
      setSuccess('Профіль оновлено');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const details = err.response?.data?.details;
        if (Array.isArray(details)) setError(details.join('; '));
        else setError(err.response?.data?.error ?? 'Помилка');
      } else {
        setError('Невідома помилка');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Дозволено JPEG, PNG, WebP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Файл завеликий. Максимум 2 МБ');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
      setAvatarRefreshKey((k) => k + 1);
      setSuccess('Аватар оновлено');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Помилка завантаження');
      } else {
        setError('Невідома помилка');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    setError(null);
    try {
      const updated = await deleteAvatar();
      setUser(updated);
      setAvatarRefreshKey((k) => k + 1);
      setSuccess('Аватар видалено');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Помилка видалення');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Профіль</h1>

      {/* Аватар */}
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
              id="avatar-input"
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
          </div>
        </div>
      </div>

      {/* Дані */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Особисті дані</h2>

        <form onSubmit={handleSave} className="space-y-4">
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
              <p className="text-xs text-amber-700 mt-1">
                ⚠ Email не підтверджено
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary-900 text-white px-6 py-2 rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
          >
            {isSaving ? 'Збереження…' : 'Зберегти зміни'}
          </button>
        </form>
      </div>
    </div>
  );
}
