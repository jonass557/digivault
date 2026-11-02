import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Search, ShoppingCart, User, Menu, X,
  Moon, Sun, Heart, LogOut, Settings, Package, LayoutDashboard,
  ChevronDown, Bell
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
import { getInitials, formatRelativeTime } from '../lib/utils';
import { notificationsAPI } from '../lib/api';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, isAuthenticated, logout } = useAuthStore();
  const cartCount = useCartStore((state) => state.getCount());
  const { theme, toggleTheme } = useThemeStore();

  // Compteur de notifications non lues (rafraîchi périodiquement).
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsAPI.getUnreadCount().then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });
  const unreadCount = unreadData?.count || 0;

  const { data: notifData } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => notificationsAPI.getAll({ limit: 8 }).then((r) => r.data),
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
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:block text-xl font-bold gradient-text">DigitalMarket</span>
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
              Vendeurs
            </Link>
            <Link to="/blog" className="text-sm font-medium hover:text-primary transition-colors">
              Blog
            </Link>
          </nav>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher des produits..."
                className="pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden sm:flex">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Notifications */}
            {isAuthenticated && (
              <DropdownMenu onOpenChange={handleOpenNotifications}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs" variant="destructive">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="font-medium">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Aucune notification</p>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`flex flex-col items-start gap-0.5 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                      >
                        <span className="font-medium text-sm">{n.title}</span>
                        <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                        <span className="text-xs text-muted-foreground/70">{formatRelativeTime(n.created_at)}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback>{getInitials(user?.first_name, user?.last_name)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block">{user?.first_name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Mon compte
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/orders" className="cursor-pointer">
                      <Package className="w-4 h-4 mr-2" /> Mes commandes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/wishlist" className="cursor-pointer">
                      <Heart className="w-4 h-4 mr-2" /> Favoris
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'vendor' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/vendor/dashboard" className="cursor-pointer">
                          <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard vendeur
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin/dashboard" className="cursor-pointer">
                          <Settings className="w-4 h-4 mr-2" /> Administration
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Connexion</Button>
                </Link>
                <Link to="/register" className="hidden sm:block">
                  <Button size="sm" variant="gradient">Inscription</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
            <nav className="flex flex-col gap-2">
              <Link to="/products" className="px-3 py-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Produits
              </Link>
              <Link to="/templates" className="px-3 py-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Templates
              </Link>
              <Link to="/vendors" className="px-3 py-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Vendeurs
              </Link>
              <Link to="/blog" className="px-3 py-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Blog
              </Link>
              <Link to="/become-vendor" className="px-3 py-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Devenir vendeur
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
