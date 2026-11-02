import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Check, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { adminAPI } from '../../lib/api';
import { formatPrice, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function AdminWithdrawals() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: () => adminAPI.getAllWithdrawals({ status: 'pending' }).then(res => res.data),
  });

  const handleProcess = async (id, status) => {
    try {
      await adminAPI.processWithdrawal(id, { status });
      toast.success(`Retrait ${status === 'completed' ? 'approuvé' : 'rejeté'}`);
      queryClient.invalidateQueries(['admin-withdrawals']);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  return (
    <>
      <Helmet><title>Retraits - Admin - DigitalMarket</title></Helmet>
      <div>
        <h1 className="text-3xl font-bold mb-8">Demandes de retrait</h1>
        {isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-24" />)}</div>
        ) : data?.withdrawals?.length > 0 ? (
          <div className="space-y-4">
            {data.withdrawals.map((w) => (
              <Card key={w.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{w.store_name}</p>
                    <p className="text-sm text-muted-foreground">{w.email} • {w.phone_number}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(w.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-primary">{formatPrice(w.amount)}</p>
                    {w.fee_amount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Frais {formatPrice(w.fee_amount)} • Net {formatPrice(w.net_amount)}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">{w.mobile_network?.toUpperCase() || w.payment_method}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleProcess(w.id, 'completed')}>
                      <Check className="w-4 h-4 mr-1" /> Approuver
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleProcess(w.id, 'rejected')}>
                      <X className="w-4 h-4 mr-1" /> Rejeter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-12 text-center text-muted-foreground">Aucune demande en attente</CardContent></Card>
        )}
      </div>
    </>
  );
}
