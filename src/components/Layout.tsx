
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Users, Radio, LogOut, Map } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tropels', label: 'Atlas de Tropeles', icon: Users },
    { path: '/signals', label: 'Feed de Señales', icon: Radio },
    { path: '/sectors', label: 'Sectores', icon: Map },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-panel md:rounded-none md:border-t-0 md:border-b-0 md:border-l-0 flex flex-col md:fixed h-auto md:h-screen z-20">
        <div className="p-6 flex items-center gap-3 border-b border-surfaceBorder">
          <Activity className="w-6 h-6 text-primary" />
          <span className="font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            TROPELCARE
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,229,255,0.1)]' 
                    : 'text-textMuted hover:bg-surfaceBorder/50 hover:text-textMain'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-surfaceBorder">
          <div className="flex items-center justify-between px-4 py-3 bg-surface border border-surfaceBorder rounded-lg">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-textMain truncate">{user?.displayName}</span>
              <span className="text-xs text-textMuted truncate">{user?.teamCode}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-textMuted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden min-h-[calc(100vh-80px)] md:min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
