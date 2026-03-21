import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Clock,
  MapPin,
  Users,
  FileText,
  UserCircle,
  Menu,
  X
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // track whether the public logo loaded successfully
  const [logoLoaded, setLogoLoaded] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['MD', 'AM', 'TL', 'EMPLOYEE'] },

    { name: 'Team Management', href: '/team', icon: Users, roles: ['MD', 'AM', 'TL'] },

    { name: 'Attendance', href: '/attendance', icon: Clock, roles: ['MD', 'AM', 'TL', 'EMPLOYEE'] },

    { name: 'Live Location', href: '/live-location', icon: MapPin, roles: ['MD', 'AM', 'TL'] },

    { name: 'Leads', href: '/leads', icon: FileText, roles: ['MD', 'AM', 'TL', 'EMPLOYEE'] },
    { name: 'Companies', href: '/companies', icon: Building2, roles: ['MD', 'AM', 'TL', 'EMPLOYEE'] },
    { name: 'About Us', href: '/about', icon: FileText, roles: ['MD', 'AM', 'TL', 'EMPLOYEE'] },
    { name: 'Profile', href: '/profile', icon: UserCircle, roles: ['MD', 'AM', 'TL', 'EMPLOYEE'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    user && item.roles.includes(user.role)
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'MD': return 'bg-purple-100 text-purple-700';
      case 'TL': return 'bg-blue-100 text-blue-700';
      case 'Employee': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden relative">
            <img
              src="/logo.jpeg"
              alt="Direct Paisa"
              className="absolute inset-0 w-full h-full object-cover"
              onLoad={() => setLogoLoaded(true)}
              onError={(e) => {
                setLogoLoaded(false);
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            {!logoLoaded && (
              <div className="z-10 flex items-center justify-center w-full h-full bg-orange-500">
                <span className="text-white">₹</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-gray-900">Direct Paisa</h1>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-600 hover:text-gray-900"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200
        transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden relative">
                <img
                  src="/logo.jpeg"
                  alt="Direct Paisa"
                  className="absolute inset-0 w-full h-full object-cover"
                  onLoad={() => setLogoLoaded(true)}
                  onError={(e) => {
                    setLogoLoaded(false);
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                {!logoLoaded && (
                  <div className="z-10 flex items-center justify-center w-full h-full bg-orange-500">
                    <span className="text-white">₹</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-gray-900">Direct Paisa</h2>
                <p className="text-gray-500 text-sm">Portal</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-gray-900">{user?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-lg text-xs ${getRoleBadgeColor(user?.role || '')}`}>
                  {user?.role}
                </span>
                {/* removed teamName logic as it is not in the schema */}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => {
                        navigate(item.href);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <Icon size={20} />
                      <span>{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
