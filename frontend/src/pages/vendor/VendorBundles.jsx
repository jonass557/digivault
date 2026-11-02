import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package2, Plus, Trash2, Loader2, Layers } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { bundlesAPI, vendorsAPI } from '../../lib/api';
import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';

const EMPTY = { name: '', description: '', bundle_price: '', product_ids: [], status: 'published' };

export default function VendorBundles() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['vendor-bundles'],
    queryFn: () => bundlesAPI.getMine().then((r) => r.data),
  });

  const { data: productsData } = useQuery({
    queryKey: ['vendor-products-for-bundle'],
    queryFn: () => vendorsAPI.getMyProducts({ limit: 100, status: 'published' }).then((r) => r.data),
  });
  const myProducts = productsData?.products || [];

  const createMutation = useMutation({
    mutationFn: (data) => bundlesAPI.create(data),
    onSuccess: () => {
      toast.success('Pack créé');
      queryClient.invalidateQueries({ queryKey: ['vendor-bundles'] });
      setForm(EMPTY);
      setShowForm(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur lors de la création'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => bundlesAPI.delete(id),
    onSuccess: () => {
      toast.success('Pack supprimé');
      queryClient.invalidateQueries({ queryKey: ['vendor-bundles'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const toggleProduct = (id) => {
    setForm((f) => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter((p) => p !== id)
        : [...f.product_ids, id],
    }));
  };

  const selectedSum = myProducts
    .filter((p) => form.product_ids.includes(p.id))
    .reduce((s, p) => s + (p.sale_price || p.price), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.bundle_price) {
      toast.error('Nom et prix requis');
      return;
    }
    if (form.product_ids.length < 2) {
      toast.error('Sélectionnez au moins 2 produits');
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      description: form.description,
      bundle_price: Number(form.bundle_price),
      product_ids: form.product_ids,
      status: form.status,
    });
  };

  return (
    <>
      <Helmet><title>Mes packs - DigitalMarket</title></Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> Mes packs
          </h1>
          <p className="text-muted-foreground">Regroupez plusieurs produits à prix réduit.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau pack
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Créer un pack</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nom du pack</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Pack Business Starter" />
                </div>
                <div>
                  <Label>Prix du pack (FCFA)</Label>
                  <Input type="number" min="0" value={form.bundle_price} onChange={(e) => setForm((f) => ({ ...f, bundle_price: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>

              <div>
                <Label>Produits inclus (min. 2)</Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {myProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2">Aucun produit publié.</p>
                  )}
                  {myProducts.map((p) => (
                    <label key={p.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${form.product_ids.includes(p.id) ? 'border-primary bg-primary/5' : ''}`}>
                      <input type="checkbox" checked={form.product_ids.includes(p.id)} onChange={() => toggleProduct(p.id)} className="h-4 w-4" />
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                        {p.thumbnail && <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(p.sale_price || p.price)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {form.product_ids.length >= 2 && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  Valeur individuelle : <span className="font-medium">{formatPrice(selectedSum)}</span>
                  {form.bundle_price && Number(form.bundle_price) < selectedSum && (
                    <span className="text-primary ml-2">
                      → économie de {formatPrice(selectedSum - Number(form.bundle_price))}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Créer le pack
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY); }}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : bundles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            Aucun pack pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {bundles.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{b.name}</h3>
                    <Badge variant={b.status === 'published' ? 'default' : 'secondary'} className="mt-1">
                      {b.status === 'published' ? 'Publié' : b.status === 'draft' ? 'Brouillon' : 'Archivé'}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(b.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="mt-3 text-sm space-y-1">
                  <p>{b.product_count} produits</p>
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-primary">{formatPrice(b.bundle_price)}</span>
                    {b.savings > 0 && (
                      <span className="text-muted-foreground line-through">{formatPrice(b.compare_at_price)}</span>
                    )}
                    {b.savings_percent > 0 && <Badge variant="destructive">-{b.savings_percent}%</Badge>}
                  </p>
                  <p className="text-muted-foreground">{b.sales_count || 0} vente(s)</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
