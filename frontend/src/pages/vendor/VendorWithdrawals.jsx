import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Wallet, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { withdrawalsAPI } from '../../lib/api';
import { formatPrice, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function VendorWithdrawals() {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mobile_money');
  const [network, setNetwork] = useState('mtn');
  const [phone, setPhone] = useState('');
  const queryClient = useQueryClient();

  const { data: balance } = useQuery({
    queryKey: ['vendor-balance'],
    queryFn: () => withdrawalsAPI.getBalance().then(res => res.data),
  });

  const { data: withdrawals } = useQuery({
    queryKey: ['vendor-withdrawals'],
    queryFn: () => withdrawalsAPI.getMyWithdrawals({ limit: 20 }).then(res => res.data),
  });

  const feeRate = balance?.withdrawal_fee_rate ?? 10;
  const requested = parseFloat(amount) || 0;
  const feeAmount = Math.round(requested * (feeRate / 100));
  const netAmount = requested - feeAmount;

  const handleRequest = async () => {
    setIsLoading(true);
    try {
      await withdrawalsAPI.request({
        amount: parseFloat(amount),
        payment_method: method,
        mobile_network: network,
        phone_number: phone,
      });
      toast.success('Demande envoyée !');
      setOpen(false);
      queryClient.invalidateQueries(['vendor-balance', 'vendor-withdrawals']);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors = { pending: 'warning', processing: 'secondary', completed: 'success', rejected: 'destructive' };

  return (
    <>
      <Helmet><title>Retraits - DigitalMarket</title></Helmet>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Retraits</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Wallet className="w-4 h-4 mr-2" /> Demander un retrait</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Demande de retrait</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Solde disponible</p>
                  <p className="text-2xl font-bold text-primary">{formatPrice(balance?.available || 0)}</p>
                </div>
                <div>
                  <Label>Montant (FCFA)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                {requested > 0 && (
                  <div className="p-3 rounded-lg border text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frais de retrait ({feeRate}%)</span>
                      <span>-{formatPrice(feeAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Montant net reçu</span>
                      <span className="text-primary">{formatPrice(netAmount)}</span>
                    </div>
                  </div>
                )}
                <div>
                  <Label>Réseau</Label>
                  <Select value={network} onValueChange={setNetwork}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                      <SelectItem value="orange">Orange Money</SelectItem>
                      <SelectItem value="moov">Moov Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Numéro de téléphone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 XX XX XX XX XX" />
                </div>
                <Button className="w-full" onClick={handleRequest} disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Demander
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card><CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Disponible</p>
            <p className="text-2xl font-bold text-primary">{formatPrice(balance?.available || 0)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-2xl font-bold">{formatPrice(balance?.pending || 0)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Total retiré</p>
            <p className="text-2xl font-bold">{formatPrice(balance?.total_withdrawn || 0)}</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Historique des retraits</CardTitle></CardHeader>
          <CardContent>
            {withdrawals?.withdrawals?.length > 0 ? (
              <div className="space-y-4">
                {withdrawals.withdrawals.map((w) => (
                  <div key={w.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{formatPrice(w.amount)}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(w.created_at)} • {w.phone_number}</p>
                    </div>
                    <Badge variant={statusColors[w.status]}>{w.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucun retrait</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
