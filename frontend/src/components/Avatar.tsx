import { useEffect, useState } from 'react';
import { loadAvatar } from '../api/profile';
import { User } from '../types';

interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  refreshKey?: number; // змінюй щоб форсити перезавантаження після upload
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-32 w-32 text-3xl',
};

function getInitials(user: User): string {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return user.name.substring(0, 2).toUpperCase();
  }
  return user.email.substring(0, 2).toUpperCase();
}

export function Avatar({ user, size = 'md', refreshKey }: AvatarProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    if (user.has_avatar) {
      loadAvatar()
        .then((u) => {
          revoked = u;
          setUrl(u);
        })
        .catch(() => setUrl(null));
    } else {
      setUrl(null);
    }
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [user.has_avatar, user.id, refreshKey]);

  const sizeClass = sizeClasses[size];

  if (url) {
    return (
      <img
        src={url}
        alt={user.name || user.email}
        className={`${sizeClass} rounded-full object-cover border border-gray-200`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary-700 text-white flex items-center justify-center font-semibold border border-primary-800`}
    >
      {getInitials(user)}
    </div>
  );
}
