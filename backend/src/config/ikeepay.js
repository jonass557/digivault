import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { getSetting } from '../utils/setting.utils.js';

/**
 * Passerelle de Paiement iKeePay - Intégration H2H (Payin, Payout, Webhooks & Verification)
 * 
 * Documentation H2H :
 * - Endpoint Live : https://api.ikeepay.com
 * - Header d'authentification : x-api-key: SECRET_KEY
 * - Encaissement (Payin) : POST /h2h-payin
 * - Retrait (Payout) : POST /h2h-payout
 * - Vérification : GET /h2h-verify/:reference
 * - Webhooks : POST avec signature HMAC SHA-256 dans l'en-tête 'x-ikeepay-signature'
 * 
 * Les clés sont chargées dynamiquement depuis la base de données (Table Setting),
 * permettant à l'administrateur de les modifier depuis son tableau de bord,
 * avec fallback sur les variables d'environnement (.env).
 */

// Devise par pays (ISO alpha-2). Défaut XOF (UEMOA).
const XAF_COUNTRIES = ['CM', 'CG', 'CD', 'GA', 'TD', 'GQ'];

export const currencyForCountry = (country, defaultCurrency = 'XOF') => {
  const c = String(country || '').toUpperCase();
  if (XAF_COUNTRIES.includes(c)) return 'XAF';
  if (c === 'GH') return 'GHS';
  return defaultCurrency || 'XOF';
};

/**
 * Récupère la configuration iKeePay actuelle (Base de données avec repli sur .env).
 */
export const getIkeepayConfig = async () => {
  let dbSecretKey, dbApiKey, dbSiteName, dbEnv, dbCurrency;
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      [dbSecretKey, dbApiKey, dbSiteName, dbEnv, dbCurrency] = await Promise.all([
        getSetting('ikeepay_secret_key'),
        getSetting('ikeepay_api_key'),
        getSetting('ikeepay_site_name'),
        getSetting('ikeepay_env'),
        getSetting('ikeepay_currency'),
      ]);
    } catch (err) {
      // Fallback silently to process.env if DB error
    }
  }

  const secretKey = (dbSecretKey || process.env.IKEEPAY_SECRET_KEY || '').trim();
  const apiKey = (dbApiKey || process.env.IKEEPAY_API_KEY || '').trim();
  const baseUrl = (process.env.IKEEPAY_BASE_URL || 'https://api.ikeepay.com').replace(/\/+$/, '');
  const siteName = (dbSiteName || process.env.IKEEPAY_SITE_NAME || 'DigiVault').trim();
  const env = dbEnv || process.env.IKEEPAY_ENV || 'live';
  const defaultCurrency = dbCurrency || 'XOF';

  return {
    secretKey,
    apiKey,
    baseUrl,
    siteName,
    env,
    defaultCurrency,
    isConfigured: Boolean(secretKey || apiKey),
  };
};

/**
 * Vérifie si la passerelle est configurée.
 */
export const isConfigured = async () => {
  const conf = await getIkeepayConfig();
  return conf.isConfigured;
};

/**
 * Normalise un statut renvoyé par iKeePay vers SUCCESS | PENDING | FAILED.
 */
export const normalizeStatus = (raw) => {
  const s = String(raw || '').toUpperCase();
  if (['COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'ACCEPTED', 'PAID', 'SUCCÈS'].includes(s)) {
    return 'SUCCESS';
  }
  if (['FAILED', 'REFUSED', 'CANCELLED', 'CANCELED', 'DECLINED', 'ERROR', 'ÉCHEC'].includes(s)) {
    return 'FAILED';
  }
  return 'PENDING';
};

/**
 * Formatage d'un numéro de téléphone propre pour les passerelles mobiles (sans '+', uniquement chiffres).
 */
const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '');
};

/**
 * 1. Encaissement (Payin) H2H
 * Endpoint : POST /h2h-payin
 * Headers : x-api-key: SECRET_KEY
 */
export const createCollect = async ({
  amount,
  currency,
  operator,
  country = 'CI',
  phone_no,
  external_reference,
  customer_email,
  otp,
  description,
}) => {
  const config = await getIkeepayConfig();
  if (!config.isConfigured) {
    throw new Error('Passerelle iKeePay non configurée. Veuillez renseigner la clé secrète dans le tableau de bord administrateur.');
  }

  const resolvedCountry = String(country || 'CI').toUpperCase();
  const resolvedCurrency = currency || currencyForCountry(resolvedCountry, config.defaultCurrency);
  const resolvedPhone = cleanPhoneNumber(phone_no);
  const resolvedOperator = operator ? String(operator).toUpperCase() : 'ORANGE';

  const payload = {
    amount: Math.round(Number(amount)),
    currency: resolvedCurrency,
    country: resolvedCountry,
    phoneNumber: resolvedPhone,
    operator: resolvedOperator,
    external_reference,
    customer_email: customer_email || undefined,
    ...(otp ? { otp: String(otp) } : {}),
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': config.secretKey || config.apiKey,
  };

  try {
    const url = `${config.baseUrl}/h2h-payin`;
    const response = await axios.post(url, payload, { headers, timeout: 35000 });
    const data = response.data;

    if (data && data.status === false) {
      throw new Error(data.message || 'Erreur lors de l\'encaissement iKeePay H2H');
    }

    const core = data?.data || data;
    const paymentLink = core?.payment_link || data?.payment_link || null;
    const reference = core?.provider_reference || core?.external_reference || external_reference;
    const status = normalizeStatus(core?.status || data?.status);

    return {
      reference,
      provider_reference: core?.provider_reference || null,
      payment_link: paymentLink,
      status,
      raw: data,
    };
  } catch (error) {
    if (error.response) {
      const errorMsg = error.response.data?.message || error.response.data?.error || `Erreur iKeePay HTTP ${error.response.status}`;
      throw new Error(errorMsg);
    }
    throw error;
  }
};

/**
 * 2. Retrait (Payout) H2H
 * Endpoint : POST /h2h-payout
 * Headers : x-api-key: SECRET_KEY
 */
export const createPayout = async ({
  amount,
  currency,
  operator,
  country = 'CI',
  phone_no,
  external_reference,
}) => {
  const config = await getIkeepayConfig();
  if (!config.isConfigured) {
    throw new Error('Passerelle iKeePay non configurée. Veuillez renseigner la clé secrète dans le tableau de bord administrateur.');
  }

  const resolvedCountry = String(country || 'CI').toUpperCase();
  const resolvedCurrency = currency || currencyForCountry(resolvedCountry, config.defaultCurrency);
  const resolvedPhone = cleanPhoneNumber(phone_no);
  const resolvedOperator = operator ? String(operator).toUpperCase() : 'ORANGE';

  const payload = {
    amount: Math.round(Number(amount)),
    currency: resolvedCurrency,
    country: resolvedCountry,
    phoneNumber: resolvedPhone,
    operator: resolvedOperator,
    external_reference,
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': config.secretKey || config.apiKey,
  };

  try {
    const url = `${config.baseUrl}/h2h-payout`;
    const response = await axios.post(url, payload, { headers, timeout: 35000 });
    const data = response.data;

    if (data && (data.status === false || data.status === 'failed')) {
      throw new Error(data.message || 'Le retrait iKeePay a été refusé par l\'opérateur.');
    }

    const core = data?.data || data;
    const status = normalizeStatus(core?.status || data?.status);

    if (status === 'FAILED') {
      throw new Error(core?.message || 'Échec du retrait vendeur sur le compte mobile.');
    }

    return {
      reference: core?.provider_reference || core?.external_reference || external_reference,
      provider_reference: core?.provider_reference || null,
      status,
      raw: data,
    };
  } catch (error) {
    if (error.response) {
      const errorMsg = error.response.data?.message || error.response.data?.error || `Erreur retrait iKeePay HTTP ${error.response.status}`;
      throw new Error(errorMsg);
    }
    throw error;
  }
};

/**
 * 3. Vérification de transaction H2H
 * Endpoint : GET /h2h-verify/:reference
 * Headers : x-api-key: SECRET_KEY
 */
export const verifyTransaction = async (reference) => {
  const config = await getIkeepayConfig();
  if (!config.isConfigured) {
    throw new Error('Passerelle iKeePay non configurée.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': config.secretKey || config.apiKey,
  };

  try {
    const url = `${config.baseUrl}/h2h-verify/${encodeURIComponent(reference)}`;
    const response = await axios.get(url, { headers, timeout: 25000 });
    const data = response.data;

    const core = data?.data || data;
    const status = normalizeStatus(core?.status);

    return {
      status,
      external_reference: core?.external_reference || reference,
      provider_reference: core?.provider_reference || null,
      amount: core?.amount,
      currency: core?.currency,
      operator: core?.operator,
      raw: data,
    };
  } catch (error) {
    if (error.response) {
      const errorMsg = error.response.data?.message || error.response.data?.error || `Vérification iKeePay HTTP ${error.response.status}`;
      throw new Error(errorMsg);
    }
    throw error;
  }
};

/**
 * 4. Webhook : Sécurité & Vérification (HMAC SHA-256)
 * En-tête : X-Ikeepay-Signature
 */
export const verifyWebhookSignature = async (rawBody, signatureHeader) => {
  const config = await getIkeepayConfig();
  const secretKey = config.secretKey || config.apiKey;

  if (!secretKey) return null; // Clé non configurée
  if (!signatureHeader) return false;

  const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  const expected = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signatureHeader));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

export default {
  getIkeepayConfig,
  isConfigured,
  currencyForCountry,
  normalizeStatus,
  createCollect,
  createPayout,
  verifyTransaction,
  verifyWebhookSignature,
};
