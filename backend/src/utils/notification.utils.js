import { Notification } from '../models/index.js';

// Service centralisé de création de notifications.
// Toutes les notifications de l'application doivent passer par ici (plutôt que
// d'appeler `Notification.create` en ligne) afin d'uniformiser le format et de
// pouvoir, plus tard, brancher les préférences utilisateur / e-mails / push.

// Crée une notification pour un utilisateur. Ne jette jamais : une notification
// ratée ne doit pas faire échouer l'action métier qui l'a déclenchée.
export const createNotification = async ({ user_id, type = 'system', title, message, link }) => {
  try {
    if (!user_id || !title || !message) return null;
    return await Notification.create({ user_id, type, title, message, link });
  } catch (error) {
    console.error('createNotification error:', error);
    return null;
  }
};

// Crée la même notification pour plusieurs utilisateurs (dédupliqués).
// Utilisé pour les notifications "de masse" (baisse de prix aux personnes ayant
// le produit en favori, nouveau produit d'un vendeur suivi, etc.).
export const notifyMany = async (userIds, payload) => {
  try {
    const ids = [...new Set((userIds || []).map((id) => id?.toString()).filter(Boolean))];
    if (ids.length === 0) return { count: 0 };
    const docs = ids.map((user_id) => ({
      user_id,
      type: payload.type || 'system',
      title: payload.title,
      message: payload.message,
      link: payload.link
    }));
    await Notification.insertMany(docs, { ordered: false });
    return { count: docs.length };
  } catch (error) {
    console.error('notifyMany error:', error);
    return { count: 0 };
  }
};

export default { createNotification, notifyMany };
