import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CreditCard, Smartphone, Loader2, ShieldCheck, Tag, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { useCartStore } from '../stores/cartStore';
import { paymentsAPI } from '../lib/api';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';

// Pays supportés (Mobile Money H2H)
const COUNTRIES = [
  { code: 'CI', name: "Côte d'Ivoire (+225)", currency: 'XOF' },
  { code: 'SN', name: 'Sénégal (+221)', currency: 'XOF' },
  { code: 'CM', name: 'Cameroun (+237)', currency: 'XAF' },
  { code: 'BF', name: 'Burkina Faso (+226)', currency: 'XOF' },
  { code: 'BJ', name: 'Bénin (+229)', currency: 'XOF' },
  { code: 'TG', name: 'Togo (+228)', currency: 'XOF' },
  { code: 'ML', name: 'Mali (+223)', currency: 'XOF' },
  { code: 'GA', name: 'Gabon (+241)', currency: 'XAF' },
  { code: 'CD', name: 'RDC (+243)', currency: 'XAF' },
  { code: 'GH', name: 'Ghana (+233)', currency: 'GHS' },
];

const OPERATORS = [
  { code: 'ORANGE', name: 'Orange Money' },
  { code: 'MTN', name: 'MTN Mobile Money' },
  { code: 'WAVE', name: 'Wave' },
  { code: 'MOOV', name: 'Moov Money' },
  { code: 'AIRTEL', name: 'Airtel Money' },
  { code: 'MOBICASH', name: 'Mobicash' },
];

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState('ORANGE');
  const [country, setCountry] = useState('CI');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { items, getTotal, coupon, getDiscount, getNetTotal, clearCart } = useCartStore();
  const total = getTotal();
  const discount = getDiscount();
  const netTotal = getNetTotal();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    if (paymentMethod === 'mobile_money' && !phone.trim()) {
      toast.error('Veuillez renseigner votre numéro de téléphone');
      return;
    }

    setIsLoading(true);
    try {
      const response = await paymentsAPI.initialize({
        items: items.map(item => ({ product_id: item.id || item._id })),
        payment_method: paymentMethod,
        phone: phone.trim(),
        operator: paymentMethod === 'mobile_money' ? operator : undefined,
        country,
        otp: otp ? otp.trim() : undefined,
        coupon_code: coupon?.code || undefined,
      });

      const data = response.data;

      // Cas 1 : Lien de redirection fourni (Wave, Orange, Carte...)
      if (data.payment_url) {
        clearCart();
        window.location.href = data.payment_url;
        return;
      }

      // Cas 2 : Push USSD direct envoyé sur le mobile du client
      clearCart();
      toast.success('Paiement initié ! Veuillez valider l\'invite sur votre téléphone.');
      navigate(`/payment/success?order=${data.order_number}`);
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
        <title>Paiement Sécurisé - DigiVault</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Finaliser votre commande</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paiement chiffré et instantané opéré par iKeePay. Vos fichiers seront accessibles dès validation.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Payment form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">1. Moyen de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid sm:grid-cols-2 gap-3">
                    <div className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'mobile_money' ? 'border-violet-500 bg-violet-500/5' : 'hover:bg-muted/40'}`}>
                      <RadioGroupItem value="mobile_money" id="mobile_money" />
                      <Label htmlFor="mobile_money" className="flex items-center gap-3 cursor-pointer flex-1">
                        <Smartphone className="w-5 h-5 text-violet-500" />
                        <div>
                          <p className="font-semibold text-sm">Mobile Money</p>
                          <p className="text-xs text-muted-foreground">Orange, MTN, Wave, Moov</p>
                        </div>
                      </Label>
                    </div>

                    <div className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-violet-500 bg-violet-500/5' : 'hover:bg-muted/40'}`}>
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                        <CreditCard className="w-5 h-5 text-violet-500" />
                        <div>
                          <p className="font-semibold text-sm">Carte bancaire</p>
                          <p className="text-xs text-muted-foreground">Visa, MasterCard</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">2. Coordonnées de paiement</CardTitle>
                  <CardDescription>Sélectionnez votre pays et votre opérateur Mobile Money</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold">Pays de paiement</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name} ({c.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod === 'mobile_money' && (
                    <>
                      <div>
                        <Label className="text-xs font-semibold">Opérateur Mobile Money</Label>
                        <Select value={operator} onValueChange={setOperator}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((o) => (
                              <SelectItem key={o.code} value={o.code}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold">Numéro de téléphone du compte</Label>
                        <Input
                          type="tel"
                          placeholder="Ex: 0700000000 (sans indicatif)"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-1"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Le débit s'effectuera sur ce numéro. Vous recevrez une notification sur votre téléphone.
                        </p>
                      </div>

                      {(country === 'BF' || operator === 'ORANGE') && (
                        <div>
                          <Label className="text-xs font-semibold">Code OTP (Optionnel / Si requis par l'opérateur)</Label>
                          <Input
                            type="text"
                            placeholder="Code secret ou OTP généré"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="mt-1 font-mono tracking-widest"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Ex: Pour Orange BF ou pour les paiements exigeant un code de validation préalable.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                size="xl" 
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-600/25 rounded-xl py-4" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Traitement du paiement en cours...
                  </>
                ) : (
                  <>Payer en toute sécurité • {formatPrice(netTotal)}</>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>Paiement chiffré SSL 256 bits via la passerelle certifiée iKeePay</span>
              </div>
            </form>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-5">
            <Card className="sticky top-24 border-border/70 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Votre commande</CardTitle>
                <CardDescription>{items.length} produit{items.length > 1 ? 's' : ''} numérique{items.length > 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {items.map((item) => {
                    const itemId = item.id || item._id;
                    return (
                      <div key={itemId} className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/40">
                          <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                          <p className="text-violet-500 font-bold text-sm">
                            {formatPrice(item.sale_price || item.price)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {coupon && discount > 0 && (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sous-total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> Coupon ({coupon.code})
                      </span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total à payer</span>
                  <span className="text-violet-500">{formatPrice(netTotal)}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/40 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Téléchargement direct garanti</span>
                  </div>
                  <p>Vos liens sécurisés seront immédiatement disponibles dans votre espace client.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
