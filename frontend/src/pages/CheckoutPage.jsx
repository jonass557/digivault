import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CreditCard, Smartphone, Loader2, Shield, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { useCartStore } from '../stores/cartStore';
import { paymentsAPI } from '../lib/api';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';

// Pays supportés (Mobile Money) — la devise est dérivée côté serveur.
const COUNTRIES = [
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'SN', name: 'Sénégal' },
  { code: 'BJ', name: 'Bénin' },
  { code: 'TG', name: 'Togo' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'ML', name: 'Mali' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'GH', name: 'Ghana' },
];

const OPERATORS = [
  { code: 'MTN', name: 'MTN Mobile Money' },
  { code: 'ORANGE', name: 'Orange Money' },
  { code: 'MOOV', name: 'Moov Money' },
  { code: 'WAVE', name: 'Wave' },
  { code: 'AIRTEL', name: 'Airtel Money' },
];

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState('MTN');
  const [country, setCountry] = useState('CI');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { items, getTotal, coupon, getDiscount, getNetTotal } = useCartStore();
  const total = getTotal();
  const discount = getDiscount();
  const netTotal = getNetTotal();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    setIsLoading(true);
    try {
      const response = await paymentsAPI.initialize({
        items: items.map(item => ({ product_id: item.id })),
        payment_method: paymentMethod,
        phone,
        operator: paymentMethod === 'mobile_money' ? operator : undefined,
        country,
        coupon_code: coupon?.code || undefined,
      });

      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        toast.error("Impossible d'obtenir le lien de paiement");
      }
    } catch (error) {
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Erreur lors du paiement');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Paiement - DigitalMarket</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Paiement</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payment form */}
          <div>
            <form onSubmit={handleSubmit}>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Méthode de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="mobile_money" id="mobile_money" />
                      <Label htmlFor="mobile_money" className="flex items-center gap-3 cursor-pointer flex-1">
                        <Smartphone className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">Mobile Money</p>
                          <p className="text-sm text-muted-foreground">MTN, Orange, Moov, Wave, Airtel</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">Carte bancaire</p>
                          <p className="text-sm text-muted-foreground">Visa, MasterCard</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Pays</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {paymentMethod === 'mobile_money' && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Mobile Money</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Opérateur</Label>
                      <Select value={operator} onValueChange={setOperator}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((o) => (
                            <SelectItem key={o.code} value={o.code}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Numéro de téléphone</Label>
                      <Input
                        type="tel"
                        placeholder="+225 XX XX XX XX XX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>Payer {formatPrice(netTotal)}</>
                )}
              </Button>
            </form>

            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Paiement sécurisé par iKeePay</span>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded bg-muted overflow-hidden shrink-0">
                      <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{item.name}</p>
                      <p className="text-primary font-bold">
                        {formatPrice(item.sale_price || item.price)}
                      </p>
                    </div>
                  </div>
                ))}

                <Separator />

                {coupon && discount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> {coupon.code}
                      </span>
                      <span className="text-primary">-{formatPrice(discount)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(netTotal)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
