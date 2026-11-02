import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { 
  Loader2, Key, ShieldCheck, CreditCard, Globe, Copy, Check, Eye, EyeOff, Save,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminAPI.getSettings().then(res => {
      setSettings(res.data);
      return res.data;
    }),
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success('Paramètres enregistrés avec succès');
      queryClient.invalidateQueries(['admin-settings']);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const webhookUrl = `${window.location.origin.replace('5173', '5000')}/api/payments/ikeepay/webhook`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success('URL de notification copiée');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <>
      <Helmet><title>Paramètres Plateforme - Admin DigiVault</title></Helmet>

      <div className="max-w-4xl space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Paramètres de la Plateforme</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les clés de paiement iKeePay, les taux de commission et les configurations globales.
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isLoading} 
            className="rounded-xl bg-violet-600 hover:bg-violet-500 shadow-md flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer les modifications
          </Button>
        </div>

        <div className="space-y-6">
          {/* Passerelle iKeePay H2H (Intégration directe) */}
          <Card className="border-violet-500/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-indigo-600" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Passerelle de Paiement iKeePay (H2H Direct)</CardTitle>
                  <CardDescription>
                    Configurez vos clés marchandes pour encaisser par Mobile Money (Orange, MTN, Wave, Moov) et verser les retraits vendeurs.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Intégration iKeePay H2H active</p>
                  <p>
                    L'authentification utilise l'en-tête standard <code className="bg-muted px-1 py-0.5 rounded text-primary">x-api-key: SECRET_KEY</code>. Les webhooks entrants sont protégés par validation cryptographique HMAC SHA-256 avec votre clé secrète.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-violet-500" />
                    <span>Clé Publique / Clé API (Optionnelle)</span>
                  </Label>
                  <Input 
                    placeholder="ikp_live_..." 
                    value={settings.ikeepay_api_key || ''} 
                    onChange={(e) => updateSetting('ikeepay_api_key', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Fournie dans votre portail marchand iKeePay.</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Clé Secrète iKeePay (SECRET_KEY) *</span>
                  </Label>
                  <div className="relative">
                    <Input 
                      type={showSecretKey ? 'text' : 'password'}
                      placeholder="sk_live_..." 
                      value={settings.ikeepay_secret_key || ''} 
                      onChange={(e) => updateSetting('ikeepay_secret_key', e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Utilisée pour signer les requêtes H2H et vérifier les webhooks.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Environnement iKeePay</Label>
                  <Select 
                    value={settings.ikeepay_env || 'live'} 
                    onValueChange={(val) => updateSetting('ikeepay_env', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Mode Production (Live)</SelectItem>
                      <SelectItem value="sandbox">Mode Test (Sandbox)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Devise Principale</Label>
                  <Select 
                    value={settings.ikeepay_currency || 'XOF'} 
                    onValueChange={(val) => updateSetting('ikeepay_currency', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XOF">XOF (Franc CFA UEMOA - CI, SN, BF...)</SelectItem>
                      <SelectItem value="XAF">XAF (Franc CFA CEMAC - CM, GA, CG...)</SelectItem>
                      <SelectItem value="GHS">GHS (Cedi Ghanéen)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nom Marchand (Apparaît au paiement)</Label>
                  <Input 
                    value={settings.ikeepay_site_name || 'DigiVault'} 
                    onChange={(e) => updateSetting('ikeepay_site_name', e.target.value)}
                  />
                </div>
              </div>

              {/* Webhook notification URL */}
              <div className="pt-2 border-t space-y-2">
                <Label>URL de Notification Webhook iKeePay</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={webhookUrl} 
                    className="font-mono text-xs bg-muted/60"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={copyWebhook}
                    className="flex-shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-4 h-4 text-emerald-500 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    Copier
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  À copier et renseigner dans la section <strong>Webhooks / Notifications</strong> de votre console iKeePay.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Commissions & Retraits */}
          <Card>
            <CardHeader>
              <CardTitle>Commissions et Retraits Vendeurs</CardTitle>
              <CardDescription>Définissez les règles financières de la marketplace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frais de retrait plateforme (%)</Label>
                  <Input 
                    type="number" 
                    value={settings.withdrawal_fee_rate ?? 10} 
                    onChange={(e) => updateSetting('withdrawal_fee_rate', parseFloat(e.target.value))} 
                  />
                  <p className="text-xs text-muted-foreground">
                    Pourcentage prélevé lors du versement automatisé du vendeur.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Montant minimum de retrait (FCFA)</Label>
                  <Input 
                    type="number" 
                    value={settings.min_withdrawal || 5000} 
                    onChange={(e) => updateSetting('min_withdrawal', parseFloat(e.target.value))} 
                  />
                  <p className="text-xs text-muted-foreground">
                    Seuil minimal pour qu'un créateur puisse demander un retrait.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Général */}
          <Card>
            <CardHeader>
              <CardTitle>Identité du Site</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de la plateforme</Label>
                  <Input 
                    value={settings.site_name || 'DigiVault'} 
                    onChange={(e) => updateSetting('site_name', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email de contact / Support</Label>
                  <Input 
                    value={settings.contact_email || ''} 
                    onChange={(e) => updateSetting('contact_email', e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Téléchargements sécurisés */}
          <Card>
            <CardHeader>
              <CardTitle>Protection des Téléchargements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tentatives max par produit acheté</Label>
                  <Input 
                    type="number" 
                    value={settings.max_downloads || 5} 
                    onChange={(e) => updateSetting('max_downloads', parseInt(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validité du lien temporaire (minutes)</Label>
                  <Input 
                    type="number" 
                    value={settings.download_link_expiry || 60} 
                    onChange={(e) => updateSetting('download_link_expiry', parseInt(e.target.value))} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
