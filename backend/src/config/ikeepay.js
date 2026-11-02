import axios from 'axios';
import crypto from 'crypto';

/**
 * iKeePay payment gateway adapter.
 *
 * Toute la configuration est pilotée par variables d'environnement afin de
 * pouvoir brancher les identifiants réels (clé API, chemins exacts des
 * endpoints) sans modifier le code. Les valeurs par défaut correspondent à ce
 * qui a été observé sur le portail iKeePay ; elles restent surchargables depuis
 * le dashboard marchand via les variables `IKEEPAY_*_PATH`.
 *
 * Base URL:  https://api.ikeepay.com
 * Docs:      https://www.ikeepay.com/developer
 */

const BASE_URL = process.env.IKEEPAY_BASE_URL || 'https://api.ikeepay.com';
const API_KEY = process.env.IKEEPAY_API_KEY || '';
const SECRET_KEY = process.env.IKEEPAY_SECRET_KEY || '';
const SITE_NAME = process.env.IKEEPAY_SITE_NAME || 'DigitalMarket';

const COLLECT_PATH = process.env.IKEEPAY_COLLECT_PATH || '/api/v1/payment/collect';
const STATUS_PATH = process.env.IKEEPAY_STATUS_PATH || '/api/v1/payment/status';
const PAYOUT_PATH = process.env.IKEEPAY_PAYOUT_PATH || '/api/v1/payout';

// Devise par pays (ISO alpha-2). Défaut XOF (UEMOA).
const XAF_COUNTRIES = ['CM', 'CG', 'CD', 'GA', 'TD', 'GQ'];

export const currencyForCountry = (country) => {
  const c = String(country || '').toUpperCase();
  if (XAF_COUNTRIES.includes(c)) return 'XAF';
  if (c === 'GH') return 'GHS';
  return 'XOF';
};

// True quand la passerelle est configurée avec une clé API.
export const isConfigured = () => Boolean(API_KEY);

// Client axios partagé, authentifié par Bearer token.
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: API_KEY ? `Bearer ${API_KEY}` : undefined,
  },
});

/**
 * Normalise un statut renvoyé par iKeePay vers SUCCESS | PENDING | FAILED.
 */
export const normalizeStatus = (raw) => {
  const s = String(raw || '').toUpperCase();
  if (['SUCCESS', 'SUCCESSFUL', 'ACCEPTED', 'COMPLETED', 'PAID', 'SUCCÈS'].includes(s)) {
    return 'SUCCESS';
  }
  if (['FAILED', 'REFUSED', 'CANCELLED', 'CANCELED', 'DECLINED', 'ERROR'].includes(s)) {
    return 'FAILED';
  }
  return 'PENDING';
};

/**
 * Extrait le noyau de données d'une réponse iKeePay, quelle que soit sa forme
 * ({ data: { data: {...} } }, { data: {...} } ou {...}).
 */
const unwrap = (payload) => {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.data && typeof payload.data === 'object') {
    if (payload.data.data && typeof payload.data.data === 'object') return payload.data.data;
    return payload.data;
  }
  return payload;
};

const pickLink = (data) =>
  data?.payment_link || data?.redirect_url || data?.link || data?.payment_url || null;

const pickReference = (data) =>
  data?.reference || data?.transaction_id || data?.trans_id || data?.id || null;

/**
 * Initialise une collecte de paiement (dépôt client) — Mobile Money ou carte.
 *
 * @returns {{ reference: string|null, payment_link: string|null, status: string, raw: object }}
 * @throws si la passerelle renvoie une erreur (message exploitable côté front).
 */
export const createCollect = async ({
  amount,
  currency,
  operator,
  country,
  phone_no,
  external_reference,
  customer_email,
  description,
}) => {
  if (!isConfigured()) {
    throw new Error('Passerelle de paiement non configurée (IKEEPAY_API_KEY manquant).');
  }

  const resolvedCountry = String(country || 'CI').toUpperCase();
  const body = {
    amount: Math.round(Number(amount)),
    currency: currency || currencyForCountry(resolvedCountry),
    operator: operator ? String(operator).toUpperCase() : undefined,
    country: resolvedCountry,
    phone_no: phone_no || undefined,
    external_reference,
    customer_email: customer_email || undefined,
    description: description || `Paiement ${SITE_NAME}`,
    site_name: SITE_NAME,
    notify_url: process.env.IKEEPAY_NOTIFY_URL || undefined,
    return_url: process.env.IKEEPAY_RETURN_URL
      ? `${process.env.IKEEPAY_RETURN_URL}?order=${external_reference}`
      : undefined,
    cancel_url: process.env.IKEEPAY_CANCEL_URL || undefined,
  };

  try {
    const { data } = await client.post(COLLECT_PATH, body);

    // iKeePay renvoie `status:false` en cas d'échec métier.
    if (data && data.status === false) {
      throw new Error(data.message || 'Erreur de la passerelle iKeePay');
    }

    const core = unwrap(data);
    return {
      reference: pickReference(core) || external_reference,
      payment_link: pickLink(core),
      status: normalizeStatus(core.status || core.state),
      raw: data,
    };
  } catch (error) {
    if (error.response) {
      const msg = error.response.data?.message || error.response.data?.error;
      throw new Error(msg || `iKeePay collect a échoué (HTTP ${error.response.status})`);
    }
    throw error;
  }
};

/**
 * Vérifie l'état d'une transaction auprès d'iKeePay.
 *
 * @returns {{ status: 'SUCCESS'|'PENDING'|'FAILED', reference: string|null, raw: object }}
 */
export const verifyTransaction = async (reference) => {
  if (!isConfigured()) {
    throw new Error('Passerelle de paiement non configurée (IKEEPAY_API_KEY manquant).');
  }

  try {
    const { data } = await client.post(STATUS_PATH, {
      reference,
      external_reference: reference,
    });

    const core = unwrap(data);
    return {
      status: normalizeStatus(core.status || core.state),
      reference: pickReference(core) || reference,
      raw: data,
    };
  } catch (error) {
    if (error.response) {
      const msg = error.response.data?.message || error.response.data?.error;
      throw new Error(msg || `iKeePay status a échoué (HTTP ${error.response.status})`);
    }
    throw error;
  }
};

/**
 * Déclenche un versement (payout / retrait) vers un bénéficiaire.
 *
 * @returns {{ reference: string|null, status: 'SUCCESS'|'PENDING'|'FAILED', raw: object }}
 * @throws si le payout est refusé (aucune commission ne doit alors être consommée).
 */
export const createPayout = async ({
  amount,
  currency,
  operator,
  country,
  phone_no,
  recipient,
  external_reference,
  description,
}) => {
  if (!isConfigured()) {
    throw new Error('Passerelle de paiement non configurée (IKEEPAY_API_KEY manquant).');
  }

  const resolvedCountry = String(country || 'CI').toUpperCase();
  const body = {
    amount: Math.round(Number(amount)),
    currency: currency || currencyForCountry(resolvedCountry),
    operator: operator ? String(operator).toUpperCase() : undefined,
    country: resolvedCountry,
    phone_no: phone_no || undefined,
    recipient: recipient || undefined,
    external_reference,
    description: description || `Retrait ${SITE_NAME}`,
    site_name: SITE_NAME,
  };

  try {
    const { data } = await client.post(PAYOUT_PATH, body);

    if (data && data.status === false) {
      throw new Error(data.message || 'Le versement iKeePay a été refusé');
    }

    const core = unwrap(data);
    const status = normalizeStatus(core.status || core.state);

    if (status === 'FAILED') {
      throw new Error(core.message || 'Le versement iKeePay a échoué');
    }

    return {
      reference: pickReference(core) || external_reference,
      status,
      raw: data,
    };
  } catch (error) {
    if (error.response) {
      const msg = error.response.data?.message || error.response.data?.error;
      throw new Error(msg || `iKeePay payout a échoué (HTTP ${error.response.status})`);
    }
    throw error;
  }
};

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook iKeePay.
 * Si aucun secret n'est configuré, renvoie null (l'appelant doit alors
 * re-vérifier le statut directement via `verifyTransaction`).
 */
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  if (!SECRET_KEY) return null;
  if (!signatureHeader) return false;

  const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  const expected = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signatureHeader));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

export default {
  isConfigured,
  currencyForCountry,
  normalizeStatus,
  createCollect,
  verifyTransaction,
  createPayout,
  verifyWebhookSignature,
};
