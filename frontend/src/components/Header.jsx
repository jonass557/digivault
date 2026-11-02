import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, User, Menu, X,
  Moon, Sun, Heart, LogOut, Settings, Package, LayoutDashboard,
  ChevronDown, Bell, ShieldCheck, Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useThemeStore } from '../stores/themeStore';
import { getInitials } from '../lib/utils';
import { notificationsAPI } from '../lib/api';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, isAuthenticated, logout } = useAuthStore();
  const cartCount = useCartStore((state) => (Array.isArray(state.items) ? state.items.length : 0));
  const { theme, toggleTheme } = useThemeStore();

  // Compteur de notifications non lues (rafraîchi périodiquement).
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsAPI.getUnreadCount().then((r) => r.data).catch(() => ({ count: 0 })),
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });
  const unreadCount = unreadData?.count || 0;

  const { data: notifData } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => notificationsAPI.getAll({ limit: 8 }).then((r) => r.data).catch(() => ({ notifications: [] })),
    enabled: isAuthenticated,
  });
  const notifications = notifData?.notifications || [];

  const handleOpenNotifications = async (open) => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationsAPI.markAsRead(notif.id);
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
      } catch { /* silencieux */ }
    }
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAll = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    } catch { /* silencieux */ }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo DigiVault */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-600/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="hidden sm:block text-2xl font-extrabold tracking-tight">
              Digi<span className="text-violet-600 dark:text-violet-400">Vault</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/products" className="text-sm font-medium hover:text-primary transition-colors">
              Produits
            </Link>
            <Link to="/templates" className="text-sm font-medium hover:text-primary transition-colors">
              Templates
            </Link>
            <Link to="/vendors" className="text-sm font-medium hover:text-primary transition-colors">
              Créateurs
            </Link>
            <Link to="/blog" className="text-sm font-medium hover:text-primary transition-colors">
              Blog
            </Link>
          </nav>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher templates, ebooks, scripts..."
                className="pl-10 pr-4 h-10 rounded-xl bg-muted/50 border-border/70 focus-visible:ring-violet-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Actions right */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl w-9 h-9">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Notifications (si connecté) */}
            {isAuthenticated && (
              <DropdownMenu onOpenChange={handleOpenNotifications}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-xl w-9 h-9">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between p-3 border-b text-sm font-semibold">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAll} className="text-xs text-primary hover:underline font-normal">
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-muted-foreground">Aucune notification</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id || n._id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 text-xs cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5 font-medium' : ''}`}
                        >
                          <p className="font-semibold text-foreground">{n.title}</p>
                          <p className="text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Cart Button */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative rounded-xl w-9 h-9" aria-label="Panier">
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 rounded-xl pl-2 pr-2.5 h-9">
                    <Avatar className="w-6 h-6 border border-border">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="text-[10px] bg-violet-500/20 text-violet-400 font-bold">
                        {getInitials(user?.first_name, user?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-xs font-medium">{user?.first_name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-semibold text-sm">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer text-xs">
                      <User className="w-4 h-4 mr-2" /> Mon compte
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/orders" className="cursor-pointer text-xs">
                      <Package className="w-4 h-4 mr-2" /> Mes achats & Téléchargements
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/wishlist" className="cursor-pointer text-xs">
                      <Heart className="w-4 h-4 mr-2" /> Favoris
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'vendor' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/vendor/dashboard" className="cursor-pointer text-xs text-violet-500 font-medium">
                          <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard Vendeur
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin/dashboard" className="cursor-pointer text-xs text-violet-500 font-medium">
                          <Settings className="w-4 h-4 mr-2" /> Administration
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive text-xs">
                    <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs h-9">Connexion</Button>
                </Link>
                <Link to="/register" className="hidden sm:block">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs h-9 font-medium shadow-sm">
                    Rejoindre
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="md:hidden rounded-xl w-9 h-9" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t space-y-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher sur DigiVault..."
                  className="pl-9 h-10 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
            <nav className="flex flex-col gap-1 text-sm font-medium">
              <Link to="/products" className="px-3 py-2 rounded-xl hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Tous les produits
              </Link>
              <Link to="/templates" className="px-3 py-2 rounded-xl hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Templates Web & Mobile
              </Link>
              <Link to="/vendors" className="px-3 py-2 rounded-xl hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Créateurs certifiés
              </Link>
              <Link to="/blog" className="px-3 py-2 rounded-xl hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Blog & Conseils
              </Link>
              <Link to="/become-vendor" className="px-3 py-2 rounded-xl text-violet-500 font-semibold hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Vendre mes créations
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
