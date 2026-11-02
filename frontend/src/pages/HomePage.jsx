import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowRight, FileText, Music, Video, Image, Code, Palette, 
  TrendingUp, ShieldCheck, Download, Zap, Sparkles, Star, CheckCircle2,
  Lock, CreditCard
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import ProductCard from '../components/ProductCard';
import HeroCarousel from '../components/HeroCarousel';
import { productsAPI, categoriesAPI, bannersAPI } from '../lib/api';
import { useThemeStore } from '../stores/themeStore';

const features = [
  {
    icon: ShieldCheck,
    title: 'Paiements H2H Sécurisés',
    desc: 'Mobile Money (MTN, Orange, Wave, Moov) & Carte bancaire avec chiffrement direct.',
  },
  {
    icon: Download,
    title: 'Téléchargements Instantanés',
    desc: 'Liens d\'accès uniques et temporaires générés immédiatement après confirmation.',
  },
  {
    icon: CheckCircle2,
    title: 'Créateurs & Vendeurs Validés',
    desc: 'Chaque vendeur et ressource numérique fait l\'objet d\'une vérification stricte.',
  },
  {
    icon: Zap,
    title: 'Support & Fiabilité 24/7',
    desc: 'Une infrastructure haute disponibilité pour vos transactions et fichiers.',
  },
];

const categoryIcons = {
  'templates-web': Code,
  'applications-mobile': Zap,
  'graphisme': Palette,
  'documents': FileText,
  'audio-video': Video,
  'e-books': FileText,
  'documents-textes': FileText,
  'audio': Music,
  'videos': Video,
  'images-graphisme': Image,
  'logiciels-code': Code,
  'assets-creatifs': Palette,
};

export default function HomePage() {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const { data: featuredProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productsAPI.getFeatured(8).then(res => res.data).catch(() => []),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll({ parent: 'null' }).then(res => res.data).catch(() => []),
  });

  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: () => bannersAPI.getActive().then(res => res.data).catch(() => []),
  });

  const categoryList = Array.isArray(categories) ? categories : [];
  const productList = Array.isArray(featuredProducts) ? featuredProducts : [];
  const bannerList = Array.isArray(banners) ? banners : [];

  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>DigiVault - Marketplace de Produits Digitaux & Ressources Numériques</title>
        <meta name="description" content="Achetez et vendez des ebooks, templates, musiques, vidéos, codes sources et ressources créatives sur DigiVault." />
      </Helmet>

      {/* Hero Carousel Banner (Gérée et administrée par l'administrateur) */}
      <HeroCarousel banners={bannerList} />

      {/* Features Bar */}
      <section className="py-12 border-b bg-muted/40 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card/60 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-1 tracking-tight">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Catalogue & Rayons</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Explorez par Catégorie</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Des milliers d'actifs numériques créés par les meilleurs talents
              </p>
            </div>
            <Link to="/products">
              <Button variant="outline" className="rounded-xl border-border/80 hover:border-primary">
                Voir toutes les catégories
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryList.map((cat) => {
              const Icon = categoryIcons[cat.slug] || FileText;
              return (
                <Link key={cat.id || cat._id} to={`/category/${cat.slug}`} className="group">
                  <Card className="h-full border-border/60 hover:border-primary/80 hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1 bg-card/70 overflow-hidden">
                    <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base mb-1 tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {cat.product_count !== undefined ? `${cat.product_count} produit${cat.product_count > 1 ? 's' : ''}` : 'Découvrir'}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 md:py-20 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Sélection Spéciale</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Produits Populaires & Tendances</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Les ressources les plus plébiscitées et achetées de la semaine
              </p>
            </div>
            <Link to="/products?sort=popular">
              <Button variant="outline" className="rounded-xl border-border/80 hover:border-primary">
                Tout voir
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse rounded-2xl overflow-hidden border-border/50">
                  <div className="aspect-[4/3] bg-muted/80" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded-md w-3/4" />
                    <div className="h-4 bg-muted rounded-md w-1/2" />
                    <div className="h-6 bg-muted rounded-md w-1/4 mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : productList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {productList.map((product) => (
                <ProductCard key={product.id || product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 p-8 border border-dashed rounded-2xl bg-card/40">
              <p className="text-muted-foreground mb-4">Aucun produit en vedette pour l'instant.</p>
              <Link to="/products">
                <Button variant="outline">Parcourir tout le catalogue</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Trust & Security Banner */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-slate-900 via-slate-900/90 to-violet-950/80 p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-violet-300 uppercase tracking-wider backdrop-blur-md">
                <Lock className="w-3.5 h-3.5" />
                <span>Paiements Certifiés iKeePay</span>
              </div>
              
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-snug">
                Achetez en toute sérénité avec vos moyens de paiement locaux
              </h2>
              
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                DigiVault intègre la technologie de paiement sécurisée iKeePay (H2H direct). Vos fonds et vos téléchargements sont garantis avec confirmation immédiate sur votre téléphone via MTN, Orange, Wave et Moov.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Validation instantanée</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Chiffrement SSL & Signature HMAC</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Garantie de téléchargement</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Become Vendor Call To Action */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 overflow-hidden text-white rounded-3xl">
            <CardContent className="p-8 sm:p-14 text-center max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Vous créez du contenu ou du code ? Vendez sur DigiVault
              </h2>
              <p className="text-base sm:text-lg text-white/90 leading-relaxed font-normal">
                Rejoignez la communauté grandissante de créateurs digitaux africains. Déposez vos templates, livres, sons et scripts, fixez vos prix et effectuez vos retraits directement sur votre numéro Mobile Money.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 justify-center">
                <Link to="/become-vendor">
                  <Button size="xl" className="bg-white text-violet-700 hover:bg-slate-100 font-bold rounded-xl px-8 shadow-lg transition-transform hover:scale-105">
                    Ouvrir ma boutique créateur
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button size="xl" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-6">
                    En savoir plus
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
