import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const displayName = user.name || user.email;

  return (
    <header className="bg-primary-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">
          SynthDetect
        </Link>
        <nav className="flex items-center gap-5">
          <Link to="/" className="text-sm hover:text-primary-200 transition">
            Аналіз
          </Link>
          <Link to="/history" className="text-sm hover:text-primary-200 transition">
            Історія
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-2 hover:text-primary-200 transition text-sm"
          >
            <Avatar user={user} size="sm" />
            <span className="hidden sm:inline">{displayName}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="bg-primary-700 hover:bg-primary-600 px-4 py-2 rounded transition text-sm"
          >
            Вийти
          </button>
        </nav>
      </div>
    </header>
  );
}
