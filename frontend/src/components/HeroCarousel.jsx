import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './ui/button';

const DEFAULT_SLIDES = [
  {
    id: 'default-1',
    badge: 'Nouveauté 2026',
    title: 'Le coffre-fort numérique des créateurs d\'Afrique',
    subtitle: 'Achetez et vendez des ebooks, templates, applications, musiques et ressources créatives avec paiements Mobile Money & Carte bancaire sécurisés.',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
    primary_btn_text: 'Explorer les créations',
    primary_btn_link: '/products',
    secondary_btn_text: 'Ouvrir ma boutique',
    secondary_btn_link: '/become-vendor',
    gradient: 'from-violet-950/90 via-slate-900/80 to-slate-950/95',
    accent: 'text-violet-400',
  },
  {
    id: 'default-2',
    badge: 'Templates Web & Mobile',
    title: 'Propulsez vos projets tech en un temps record',
    subtitle: 'Des dizaines de templates React, Next.js, Flutter et Tailwind vérifiés, prêts à être déployés pour vos clients et startups.',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80',
    primary_btn_text: 'Voir les templates',
    primary_btn_link: '/category/templates-web',
    secondary_btn_text: 'Découvrir le code',
    secondary_btn_link: '/products',
    gradient: 'from-indigo-950/90 via-slate-900/80 to-slate-950/95',
    accent: 'text-indigo-400',
  },
  {
    id: 'default-3',
    badge: 'Monétisation Instantanée',
    title: 'Vendez vos produits digitaux et encaissez en direct',
    subtitle: 'Rejoignez DigiVault et touchez des clients dans toute l\'Afrique de l\'Ouest et Centrale avec MTN, Orange Money, Moov et Wave.',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1600&auto=format&fit=crop&q=80',
    primary_btn_text: 'Devenir vendeur',
    primary_btn_link: '/become-vendor',
    secondary_btn_text: 'Comment ça marche',
    secondary_btn_link: '/about',
    gradient: 'from-amber-950/90 via-slate-900/80 to-slate-950/95',
    accent: 'text-amber-400',
  },
];

export default function HeroCarousel({ banners = [] }) {
  // Combiner les bannières ajoutées par l'administrateur (position: home_hero)
  const heroBanners = Array.isArray(banners)
    ? banners.filter((b) => b && (b.position === 'home_hero' || !b.position) && b.is_active !== false)
    : [];

  const slides = heroBanners.length > 0
    ? heroBanners.map((b, idx) => ({
        id: b.id || b._id || `banner-${idx}`,
        badge: 'En vedette',
        title: b.title,
        subtitle: b.subtitle || 'Découvrez nos meilleures sélections de produits digitaux vérifiés.',
        image: b.image && !b.image.includes('placehold')
          ? b.image
          : DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].image,
        primary_btn_text: b.button_text || 'Découvrir',
        primary_btn_link: b.link || '/products',
        secondary_btn_text: 'Devenir vendeur',
        secondary_btn_link: '/become-vendor',
        gradient: DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].gradient,
        accent: DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].accent,
      }))
    : DEFAULT_SLIDES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef(null);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    timeoutRef.current = setTimeout(() => {
      nextSlide();
    }, 5500);
    return () => clearTimeout(timeoutRef.current);
  }, [currentIndex, isPaused, slides.length]);

  const activeSlide = slides[currentIndex] || slides[0];

  return (
    <div
      className="relative overflow-hidden bg-slate-950 border-b border-slate-800 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image Carousel with cross-fade */}
      <div className="absolute inset-0">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt=""
              className="w-full h-full object-cover object-center filter brightness-[0.45] scale-105 transform transition-transform duration-10000 ease-out"
            />
            {/* Rich gradient overlays */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-600/15 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      {/* Slide Content */}
      <div className="relative container mx-auto px-4 py-20 sm:py-28 md:py-36 min-h-[520px] md:min-h-[600px] flex flex-col justify-center">
        <div className="max-w-3xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{activeSlide.badge}</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-sm">
            {activeSlide.title}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-200/90 leading-relaxed max-w-2xl font-normal">
            {activeSlide.subtitle}
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap gap-4 items-center">
            <Link to={activeSlide.primary_btn_link}>
              <Button
                size="xl"
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-xl shadow-violet-600/30 rounded-xl px-7 py-3.5 text-base transition-all transform hover:-translate-y-0.5"
              >
                {activeSlide.primary_btn_text}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            {activeSlide.secondary_btn_link && (
              <Link to={activeSlide.secondary_btn_link}>
                <Button
                  size="xl"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md font-medium rounded-xl px-6 py-3.5 text-base transition-all"
                >
                  {activeSlide.secondary_btn_text}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Arrows (visible if more than 1 slide) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Diapositive précédente"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/60 hover:bg-slate-900/90 border border-white/15 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Diapositive suivante"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/60 hover:bg-slate-900/90 border border-white/15 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Bottom Indicators & Slide Counter */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Aller au slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-8 bg-violet-400 shadow-sm shadow-violet-400'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
