import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Trash2, Loader2, Ticket, Power } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { couponsAPI } from '../../lib/api';
import { formatPrice, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

const EMPTY = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  scope: 'all',
  min_order_amount: '',
  max_uses: '',
  max_uses_per_user: '',
  expires_at: '',
  new_customers_only: false,
};

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => couponsAPI.getAllAdmin().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => couponsAPI.createAdmin(data),
    onSuccess: () => {
      toast.success('Coupon plateforme créé');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setForm(EMPTY);
      setShowForm(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur lors de la création'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => couponsAPI.delete(id),
    onSuccess: () => {
      toast.success('Coupon supprimé');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => couponsAPI.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) {
      toast.error('Code et valeur requis');
      return;
    }
    createMutation.mutate({
      code: form.code.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      scope: form.scope,
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      max_uses_per_user: form.max_uses_per_user ? Number(form.max_uses_per_user) : null,
      expires_at: form.expires_at || null,
      new_customers_only: form.new_customers_only,
    });
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  return (
    <>
      <Helmet><title>Coupons & promotions - Admin</title></Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6" /> Coupons & promotions
          </h1>
          <p className="text-muted-foreground">Campagnes plateforme et coupons vendeurs.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-2" /> Coupon plateforme
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Créer un coupon plateforme</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="BIENVENUE" />
              </div>
              <div>
                <Label>Type de réduction</Label>
                <Select value={form.discount_type} onValueChange={set('discount_type')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valeur {form.discount_type === 'percentage' ? '(%)' : '(FCFA)'}</Label>
                <Input type="number" min="0" value={form.discount_value} onChange={set('discount_value')} />
              </div>
              <div>
                <Label>Montant minimum (FCFA)</Label>
                <Input type="number" min="0" value={form.min_order_amount} onChange={set('min_order_amount')} placeholder="0" />
              </div>
              <div>
                <Label>Utilisations max (total)</Label>
                <Input type="number" min="1" value={form.max_uses} onChange={set('max_uses')} placeholder="Illimité" />
              </div>
              <div>
                <Label>Max par client</Label>
                <Input type="number" min="1" value={form.max_uses_per_user} onChange={set('max_uses_per_user')} placeholder="Illimité" />
              </div>
              <div>
                <Label>Date d'expiration</Label>
                <Input type="date" value={form.expires_at} onChange={set('expires_at')} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="nco"
                  type="checkbox"
                  checked={form.new_customers_only}
                  onChange={(e) => setForm((f) => ({ ...f, new_customers_only: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="nco" className="cursor-pointer">Nouveaux clients uniquement</Label>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Créer
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
      ) : coupons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            Aucun coupon pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 font-mono font-bold text-lg">
                  <Tag className="w-5 h-5 text-primary" /> {c.code}
                </div>
                <Badge variant={c.owner_type === 'admin' ? 'default' : 'secondary'}>
                  {c.owner_type === 'admin' ? 'Plateforme' : c.store_name || 'Vendeur'}
                </Badge>
                <Badge variant={c.is_active ? 'default' : 'secondary'}>
                  {c.is_active ? 'Actif' : 'Inactif'}
                </Badge>
                <span className="text-sm">
                  {c.discount_type === 'percentage' ? `-${c.discount_value}%` : `-${formatPrice(c.discount_value)}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {c.used_count || 0}{c.max_uses ? `/${c.max_uses}` : ''} utilisé(s)
                </span>
                {c.expires_at && (
                  <span className="text-sm text-muted-foreground">Expire le {formatDate(c.expires_at)}</span>
                )}
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="icon" title={c.is_active ? 'Désactiver' : 'Activer'}
                    onClick={() => toggleActive.mutate({ id: c.id, is_active: !c.is_active })}>
                    <Power className={`w-4 h-4 ${c.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
