import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({});
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
      toast.success('Paramètres enregistrés');
      queryClient.invalidateQueries(['admin-settings']);
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <>
      <Helmet><title>Paramètres - Admin - DigitalMarket</title></Helmet>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Paramètres</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Général</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom du site</Label>
                <Input value={settings.site_name || ''} onChange={(e) => updateSetting('site_name', e.target.value)} />
              </div>
              <div>
                <Label>Email de contact</Label>
                <Input value={settings.contact_email || ''} onChange={(e) => updateSetting('contact_email', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Commissions et paiements</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Frais de retrait (%)</Label>
                <Input type="number" value={settings.withdrawal_fee_rate ?? 10} onChange={(e) => updateSetting('withdrawal_fee_rate', parseFloat(e.target.value))} />
                <p className="text-sm text-muted-foreground mt-1">
                  Pourcentage retenu par la plateforme sur chaque retrait vendeur.
                </p>
              </div>
              <div>
                <Label>Taux de commission à la vente (%)</Label>
                <Input type="number" value={settings.commission_rate ?? 10} onChange={(e) => updateSetting('commission_rate', parseFloat(e.target.value))} />
                <p className="text-sm text-muted-foreground mt-1">
                  Conservé pour référence. La commission est actuellement prélevée au retrait.
                </p>
              </div>
              <div>
                <Label>Retrait minimum (FCFA)</Label>
                <Input type="number" value={settings.min_withdrawal || 5000} onChange={(e) => updateSetting('min_withdrawal', parseFloat(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Téléchargements</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nombre max de téléchargements</Label>
                <Input type="number" value={settings.max_downloads || 5} onChange={(e) => updateSetting('max_downloads', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Expiration du lien (minutes)</Label>
                <Input type="number" value={settings.download_link_expiry || 60} onChange={(e) => updateSetting('download_link_expiry', parseInt(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer les paramètres
          </Button>
        </div>
      </div>
    </>
  );
}
