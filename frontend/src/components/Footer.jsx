import { Link } from 'react-router-dom';
import { ShieldCheck, Facebook, Twitter, Instagram, Mail, Lock, CreditCard } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/25">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">
                Digi<span className="text-violet-400">Vault</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              La plateforme sécurisée de référence pour l'achat et la vente de produits digitaux, templates, codes sources et ressources graphiques en Afrique.
            </p>

            {/* Badges de paiement */}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Paiements direct H2H sécurisés
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-300">
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">Orange Money</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">MTN MoMo</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">Wave</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">Moov Money</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">Visa / Mastercard</span>
              </div>
            </div>
          </div>

          {/* Produits */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Rayons</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link to="/category/templates-web" className="hover:text-violet-400 transition-colors">Templates Web</Link></li>
              <li><Link to="/category/applications-mobile" className="hover:text-violet-400 transition-colors">Applications Mobile</Link></li>
              <li><Link to="/category/graphisme" className="hover:text-violet-400 transition-colors">Graphisme & UI/UX</Link></li>
              <li><Link to="/category/documents" className="hover:text-violet-400 transition-colors">Documents & Ebooks</Link></li>
              <li><Link to="/category/audio-video" className="hover:text-violet-400 transition-colors">Audio & Vidéo</Link></li>
              <li><Link to="/products" className="hover:text-violet-400 transition-colors">Tous les produits</Link></li>
            </ul>
          </div>

          {/* Liens utiles */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Plateforme</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link to="/become-vendor" className="text-violet-400 font-medium hover:underline">Devenir Vendeur</Link></li>
              <li><Link to="/about" className="hover:text-violet-400 transition-colors">À propos de DigiVault</Link></li>
              <li><Link to="/blog" className="hover:text-violet-400 transition-colors">Blog & Guides</Link></li>
              <li><Link to="/contact" className="hover:text-violet-400 transition-colors">Support & Contact</Link></li>
              <li><Link to="/vendors" className="hover:text-violet-400 transition-colors">Créateurs certifiés</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Restez informé</h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Recevez les nouveaux templates et les réductions flash directement.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Merci pour votre inscription !'); }} className="space-y-2">
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="votre@email.com" 
                  className="bg-slate-900 border-slate-800 text-sm text-white placeholder:text-slate-500 rounded-xl" 
                  required 
                />
                <Button type="submit" size="icon" className="bg-violet-600 hover:bg-violet-500 rounded-xl flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-14 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} DigiVault. Tous droits réservés. Propulsé pour les créateurs numériques africains.
          </p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-violet-400">Conditions Générales</Link>
            <Link to="/privacy" className="hover:text-violet-400">Confidentialité</Link>
            <Link to="/contact" className="hover:text-violet-400">Aide & Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
