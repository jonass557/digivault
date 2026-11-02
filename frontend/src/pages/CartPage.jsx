import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShoppingCart, Trash2, ArrowRight, ShoppingBag, Tag, X, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { couponsAPI } from '../lib/api';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';

export default function CartPage() {
  const { items, removeItem, clearCart, getTotal, coupon, applyCoupon, removeCoupon, getDiscount, getNetTotal } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const total = getTotal();
  const discount = getDiscount();
  const netTotal = getNetTotal();

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour utiliser un coupon');
      return;
    }
    setValidating(true);
    try {
      const res = await couponsAPI.validate(couponCode.trim(), items.map((i) => i.id));
      if (res.data.valid) {
        applyCoupon(res.data);
        toast.success(`Coupon appliqué : -${formatPrice(res.data.discount_amount)}`);
        setCouponCode('');
      } else {
        toast.error(res.data.error || 'Coupon invalide');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Coupon invalide');
    } finally {
      setValidating(false);
    }
  };

  if (!items || items.length === 0) {
    return (
      <>
        <Helmet>
          <title>Panier - DigitalMarket</title>
        </Helmet>
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-12 pb-8">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Votre panier est vide</h2>
              <p className="text-muted-foreground mb-6">
                Découvrez nos produits et ajoutez-les à votre panier.
              </p>
              <Link to="/products">
                <Button>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Voir les produits
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Panier (${items.length}) - DigitalMarket`}</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Panier ({items.length})</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.slug}`} className="font-semibold hover:text-primary line-clamp-2">
                        {item.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.store_name}</p>
                      <div className="mt-2">
                        {item.sale_price ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{formatPrice(item.sale_price)}</span>
                            <span className="text-sm text-muted-foreground line-through">{formatPrice(item.price)}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-primary">{formatPrice(item.price)}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={clearCart}>
              <Trash2 className="w-4 h-4 mr-2" />
              Vider le panier
            </Button>
          </div>

          {/* Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                {/* Coupon */}
                {coupon ? (
                  <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="font-medium">{coupon.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-medium">-{formatPrice(discount)}</span>
                      <button onClick={removeCoupon} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <Input
                      placeholder="Code promo"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="h-9"
                    />
                    <Button type="submit" variant="outline" size="sm" disabled={validating || !couponCode.trim()}>
                      {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
                    </Button>
                  </form>
                )}

                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Réduction</span>
                    <span className="text-primary">-{formatPrice(discount)}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(netTotal)}</span>
                </div>
              </CardContent>
              <CardFooter>
                {isAuthenticated ? (
                  <Link to="/checkout" className="w-full">
                    <Button className="w-full" size="lg">
                      Passer la commande
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/login" state={{ from: { pathname: '/checkout' } }} className="w-full">
                    <Button className="w-full" size="lg">
                      Se connecter pour commander
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
