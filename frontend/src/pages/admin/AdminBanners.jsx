import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Plus, Trash2, Loader2, Image as ImageIcon, ExternalLink, Eye, Sliders, Check, X, Edit3 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { adminAPI, uploadAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminBanners() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState('');
  const [link, setLink] = useState('');
  const [buttonText, setButtonText] = useState('Découvrir');
  const [position, setPosition] = useState('home_hero');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: banners, isLoading: loadingBanners } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => adminAPI.getAllBanners().then(res => res.data),
  });

  const bannerList = Array.isArray(banners) ? banners : [];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file, 'banners');
      setImage(res.data.url);
      toast.success('Image téléchargée avec succès');
    } catch (err) {
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !image.trim()) {
      toast.error('Le titre et l\'image sont obligatoires');
      return;
    }

    setIsLoading(true);
    try {
      await adminAPI.createBanner({
        title,
        subtitle,
        image,
        link: link || '/products',
        button_text: buttonText || 'Découvrir',
        position,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive
      });
      toast.success('Bannière ajoutée avec succès');
      setOpen(false);
      resetForm();
      queryClient.invalidateQueries(['admin-banners']);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setImage('');
    setLink('');
    setButtonText('Découvrir');
    setPosition('home_hero');
    setSortOrder(0);
    setIsActive(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette bannière ?')) return;
    try {
      await adminAPI.deleteBanner(id);
      toast.success('Bannière supprimée');
      queryClient.invalidateQueries(['admin-banners']);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <>
      <Helmet><title>Gestion des Bannières - Admin DigiVault</title></Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bannières & Carrousel d'accueil</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les bannières affichées dans le carrousel principal de la page d'accueil (position : Carrousel Hero).
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-violet-600 hover:bg-violet-500 shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une bannière
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouvelle bannière</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div>
                  <Label>Titre principal *</Label>
                  <Input 
                    placeholder="Ex: Le coffre-fort numérique des créateurs" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                  />
                </div>

                <div>
                  <Label>Sous-titre / Description</Label>
                  <Input 
                    placeholder="Ex: Achetez et vendez vos templates et ebooks en direct" 
                    value={subtitle} 
                    onChange={(e) => setSubtitle(e.target.value)} 
                  />
                </div>

                <div>
                  <Label>Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home_hero">Carrousel Accueil (Hero Top)</SelectItem>
                      <SelectItem value="home_secondary">Section Secondaire Accueil</SelectItem>
                      <SelectItem value="sidebar">Barre latérale (Sidebar)</SelectItem>
                      <SelectItem value="footer">Pied de page (Footer)</SelectItem>
                      <SelectItem value="popup">Pop-up promotionnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Image de la bannière (URL ou Fichier) *</Label>
                  <div className="flex gap-2 mb-2">
                    <Input 
                      placeholder="https://images.unsplash.com/..." 
                      value={image} 
                      onChange={(e) => setImage(e.target.value)} 
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Ou importer un fichier :</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      disabled={isUploading}
                      className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:font-medium"
                    />
                    {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  </div>
                  {image && (
                    <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-border">
                      <img src={image} alt="Aperçu" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Lien cible</Label>
                    <Input 
                      placeholder="/products" 
                      value={link} 
                      onChange={(e) => setLink(e.target.value)} 
                    />
                  </div>
                  <div>
                    <Label>Texte du bouton</Label>
                    <Input 
                      placeholder="Découvrir" 
                      value={buttonText} 
                      onChange={(e) => setButtonText(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center pt-2">
                  <div>
                    <Label>Ordre d'affichage</Label>
                    <Input 
                      type="number" 
                      value={sortOrder} 
                      onChange={(e) => setSortOrder(e.target.value)} 
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      checked={isActive} 
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Actif immédiatement</Label>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4 bg-violet-600 hover:bg-violet-500" 
                  onClick={handleCreate} 
                  disabled={isLoading || isUploading}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer la bannière
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Banners Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bannerList.map((banner) => {
            const bannerId = banner.id || banner._id;
            return (
              <Card key={bannerId} className="overflow-hidden border-border/70 hover:shadow-lg transition-all duration-200">
                <div className="aspect-video bg-muted relative overflow-hidden group">
                  <img 
                    src={banner.image} 
                    alt={banner.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant={banner.is_active ? 'default' : 'secondary'} className={banner.is_active ? 'bg-emerald-600' : ''}>
                      {banner.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className="bg-slate-900/80 text-white border-white/20 text-xs">
                      {banner.position === 'home_hero' ? 'Carrousel Accueil' : banner.position}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-base line-clamp-1">{banner.title}</h3>
                    {banner.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{banner.subtitle}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span className="inline-flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      {banner.link || '/products'}
                    </span>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive/10 h-8 px-2"
                      onClick={() => handleDelete(bannerId)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {bannerList.length === 0 && !loadingBanners && (
          <div className="text-center py-16 border border-dashed rounded-2xl bg-card/40">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">Aucune bannière configurée pour l'instant.</p>
            <p className="text-xs text-muted-foreground/80 mt-1 mb-4">
              Le carrousel d'accueil utilise actuellement les diapositives DigiVault par défaut.
            </p>
            <Button onClick={() => setOpen(true)} variant="outline">
              Créer la première bannière
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
