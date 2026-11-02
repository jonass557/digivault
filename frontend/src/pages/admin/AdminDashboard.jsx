import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Users, Store, Package, ShoppingCart, DollarSign, TrendingUp, Wallet, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { adminAPI } from '../../lib/api';
import { formatPrice } from '../../lib/utils';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard().then(res => res.data),
    refetchInterval: 30000,
  });

  const stats = [
    { title: 'Utilisateurs', value: data?.stats?.users || 0, icon: Users, color: 'text-blue-500' },
    { title: 'Vendeurs', value: data?.stats?.vendors || 0, icon: Store, color: 'text-green-500' },
    { title: 'Produits', value: data?.stats?.products || 0, icon: Package, color: 'text-purple-500' },
    { title: 'Commandes', value: data?.stats?.orders || 0, icon: ShoppingCart, color: 'text-orange-500' },
    { title: 'Revenus totaux', value: formatPrice(data?.stats?.revenue || 0), icon: DollarSign, color: 'text-green-600' },
    { title: 'Frais de retrait perçus', value: formatPrice(data?.stats?.withdrawalFees || 0), icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <>
      <Helmet><title>Admin Dashboard - DigitalMarket</title></Helmet>
      <div>
        <h1 className="text-3xl font-bold mb-8">Tableau de bord administrateur</h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Demandes en attente</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-muted rounded">
                  <span>Vendeurs en attente</span>
                  <span className="font-bold">{data?.stats?.pendingVendors || 0}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded">
                  <span>Produits en attente</span>
                  <span className="font-bold">{data?.stats?.pendingProducts || 0}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded">
                  <span>Retraits en attente</span>
                  <span className="font-bold text-orange-500">{data?.stats?.pendingWithdrawals?.count || 0}</span>
                </div>
                <div className="flex justify-between p-3 bg-primary/10 rounded">
                  <span>Montant retraits en attente</span>
                  <span className="font-bold text-primary">{formatPrice(data?.stats?.pendingWithdrawals?.total || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Meilleurs vendeurs</CardTitle></CardHeader>
            <CardContent>
              {data?.topVendors?.length > 0 ? (
                <div className="space-y-3">
                  {data.topVendors.slice(0, 5).map((vendor, i) => (
                    <div key={vendor.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium">{vendor.store_name}</p>
                        <p className="text-sm text-muted-foreground">{formatPrice(vendor.total_sales)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucun vendeur</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
