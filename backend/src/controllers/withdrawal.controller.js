import ikeepay from '../config/ikeepay.js';
import { Withdrawal, Commission, Setting, User, Notification } from '../models/index.js';
import { sendWithdrawalProcessedEmail } from '../utils/email.utils.js';

// Modèle de solde — le registre des retraits fait foi.
// Le vendeur crédite 100 % de ses ventes (Commission.vendor_amount, status
// 'available'). Ce qui a été demandé/versé est suivi via les Withdrawal ; on
// ne transitionne PAS les commissions au retrait, ce qui garantit des retraits
// partiels exacts (pas de sur-consommation liée à la granularité des commissions).

// Total crédité au vendeur (somme des commissions disponibles).
async function sumCredited(vendorId) {
  const result = await Commission.aggregate([
    { $match: { vendor_id: vendorId, status: 'available' } },
    { $group: { _id: null, total: { $sum: '$vendor_amount' } } }
  ]);
  return result[0]?.total || 0;
}

// Somme des retraits d'un vendeur pour un ensemble de statuts donné.
async function sumWithdrawals(vendorId, statuses) {
  const result = await Withdrawal.aggregate([
    { $match: { vendor_id: vendorId, status: { $in: statuses } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result[0]?.total || 0;
}

// Solde disponible = total crédité − (retraits en cours + déjà versés).
async function computeAvailableBalance(vendorId) {
  const [credited, locked] = await Promise.all([
    sumCredited(vendorId),
    sumWithdrawals(vendorId, ['pending', 'processing', 'completed'])
  ]);
  return Math.max(0, credited - locked);
}

// Get my withdrawals
export const getMyWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const total = await Withdrawal.countDocuments({ vendor_id: req.vendor._id });

    const withdrawals = await Withdrawal.find({ vendor_id: req.vendor._id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      withdrawals: withdrawals.map(w => ({ ...w, id: w._id })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my withdrawals error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get balance
export const getBalance = async (req, res) => {
  try {
    const [available, pending, totalResult, withdrawnResult] = await Promise.all([
      computeAvailableBalance(req.vendor._id),
      sumWithdrawals(req.vendor._id, ['pending', 'processing']),
      Commission.aggregate([
        { $match: { vendor_id: req.vendor._id } },
        { $group: { _id: null, total: { $sum: '$vendor_amount' } } }
      ]),
      Withdrawal.aggregate([
        { $match: { vendor_id: req.vendor._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // Taux de frais retenu par la plateforme au moment du retrait.
    const feeSetting = await Setting.findOne({ setting_key: 'withdrawal_fee_rate' });
    const feeRate = feeSetting ? parseFloat(feeSetting.setting_value) : 10;

    res.json({
      available,
      pending,
      total_earned: totalResult[0]?.total || 0,
      total_withdrawn: withdrawnResult[0]?.total || 0,
      withdrawal_fee_rate: feeRate
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Request withdrawal
export const requestWithdrawal = async (req, res) => {
  try {
    const {
      amount, payment_method, mobile_network, phone_number,
      bank_name, bank_account, bank_iban, notes
    } = req.body;

    // Montant minimum de retrait (paramètre admin).
    const minSetting = await Setting.findOne({ setting_key: 'min_withdrawal' });
    const minWithdrawal = minSetting ? parseInt(minSetting.setting_value) : 5000;

    const requested = parseFloat(amount);
    if (!requested || requested < minWithdrawal) {
      return res.status(400).json({
        error: `Le montant minimum de retrait est de ${minWithdrawal} FCFA`
      });
    }

    // Solde disponible réel (commissions − retraits déjà réservés).
    const availableBalance = await computeAvailableBalance(req.vendor._id);

    if (requested > availableBalance) {
      return res.status(400).json({
        error: `Solde insuffisant. Disponible: ${availableBalance} FCFA`
      });
    }

    // Validate payment method
    if (payment_method === 'mobile_money') {
      if (!mobile_network || !phone_number) {
        return res.status(400).json({ error: 'Réseau mobile et numéro requis' });
      }
    } else if (payment_method === 'bank_transfer') {
      if (!bank_name || !bank_account) {
        return res.status(400).json({ error: 'Informations bancaires requises' });
      }
    } else {
      return res.status(400).json({ error: 'Méthode de paiement invalide' });
    }

    // Calcul de la commission de retrait retenue par la plateforme.
    const feeSetting = await Setting.findOne({ setting_key: 'withdrawal_fee_rate' });
    const feeRate = feeSetting ? parseFloat(feeSetting.setting_value) : 10;
    const feeAmount = Math.round(requested * (feeRate / 100));
    const netAmount = requested - feeAmount;

    // Create withdrawal request.
    // NB : on ne bascule PLUS les commissions ici. Le solde disponible est
    // calculé dynamiquement (commissions − retraits réservés), ce qui autorise
    // les retraits partiels et évite l'ancien bug de bascule globale.
    const withdrawal = await Withdrawal.create({
      vendor_id: req.vendor._id,
      amount: requested,
      fee_rate: feeRate,
      fee_amount: feeAmount,
      net_amount: netAmount,
      payment_method,
      mobile_network: mobile_network || null,
      phone_number: phone_number || null,
      bank_name: bank_name || null,
      bank_account: bank_account || null,
      bank_iban: bank_iban || null,
      notes: notes || null
    });

    // Create notification for admin
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        user_id: admin._id,
        type: 'withdrawal',
        title: 'Nouvelle demande de retrait',
        message: `Demande de retrait de ${requested} FCFA par ${req.vendor.store_name}`,
        link: '/admin/withdrawals'
      });
    }

    res.status(201).json({
      message: 'Demande de retrait envoyée',
      withdrawal: {
        ...withdrawal.toObject(),
        id: withdrawal._id
      }
    });
  } catch (error) {
    console.error('Request withdrawal error:', error);
    res.status(500).json({ error: 'Erreur lors de la demande' });
  }
};

// Get all withdrawals (admin)
export const getAllWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const total = await Withdrawal.countDocuments(query);

    const withdrawals = await Withdrawal.find(query)
      .populate({
        path: 'vendor_id',
        select: 'store_name user_id',
        populate: { path: 'user_id', select: 'email first_name last_name' }
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const transformedWithdrawals = withdrawals.map(w => ({
      ...w,
      id: w._id,
      store_name: w.vendor_id?.store_name,
      email: w.vendor_id?.user_id?.email,
      first_name: w.vendor_id?.user_id?.first_name,
      last_name: w.vendor_id?.user_id?.last_name
    }));

    res.json({
      withdrawals: transformedWithdrawals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all withdrawals error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Process withdrawal (admin) — versement automatique via iKeePay à l'approbation.
export const processWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, transaction_reference } = req.body;

    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const withdrawal = await Withdrawal.findById(id)
      .populate({
        path: 'vendor_id',
        select: 'user_id store_name',
        populate: { path: 'user_id', select: 'email first_name' }
      });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing' && withdrawal.status !== 'failed') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
    }

    if (status === 'rejected') {
      // Rien à restaurer : les commissions n'ont pas été consommées à la demande.
      withdrawal.status = 'rejected';
      withdrawal.rejection_reason = rejection_reason || null;
      withdrawal.processed_by = req.user.id;
      withdrawal.processed_at = new Date();
      await withdrawal.save();

      await Notification.create({
        user_id: withdrawal.vendor_id.user_id._id,
        type: 'withdrawal',
        title: 'Retrait rejeté',
        message: `Votre demande de retrait a été rejetée. Raison: ${rejection_reason || 'non précisée'}`,
        link: '/vendor/withdrawals'
      });

      sendWithdrawalProcessedEmail(
        { email: withdrawal.vendor_id.user_id.email, first_name: withdrawal.vendor_id.user_id.first_name },
        { ...withdrawal.toObject(), rejection_reason },
        'rejected'
      );

      return res.json({ message: 'Demande rejetée' });
    }

    // status === 'completed' → déclenche le versement automatique iKeePay.
    // Le vendeur reçoit le NET (montant − frais de retrait plateforme).
    let payoutRef = transaction_reference || null;

    if (await ikeepay.isConfigured()) {
      try {
        const payout = await ikeepay.createPayout({
          amount: withdrawal.net_amount || withdrawal.amount,
          country: 'CI',
          operator: withdrawal.mobile_network ? withdrawal.mobile_network.toUpperCase() : undefined,
          phone_no: withdrawal.phone_number || undefined,
          recipient: withdrawal.bank_account || withdrawal.phone_number || undefined,
          external_reference: `WD-${withdrawal._id}`,
          description: `Retrait ${withdrawal.vendor_id.store_name || ''}`.trim()
        });
        payoutRef = payout.reference || payoutRef;
      } catch (payoutError) {
        // Échec du versement : on marque 'failed', sans consommer les commissions.
        withdrawal.status = 'failed';
        withdrawal.rejection_reason = payoutError.message;
        withdrawal.processed_by = req.user.id;
        withdrawal.processed_at = new Date();
        await withdrawal.save();

        return res.status(400).json({
          error: 'Le versement iKeePay a échoué',
          details: payoutError.message
        });
      }
    }

    // Versement réussi (ou passerelle non configurée → traitement manuel confirmé).
    // Le statut 'completed' du retrait suffit à faire baisser le solde disponible
    // (calculé dynamiquement) : aucune transition de commission n'est nécessaire.
    withdrawal.status = 'completed';
    withdrawal.rejection_reason = null;
    withdrawal.transaction_reference = payoutRef;
    withdrawal.processed_by = req.user.id;
    withdrawal.processed_at = new Date();
    await withdrawal.save();

    await Notification.create({
      user_id: withdrawal.vendor_id.user_id._id,
      type: 'withdrawal',
      title: 'Retrait effectué',
      message: `Votre retrait de ${withdrawal.amount} FCFA a été effectué (net reçu: ${withdrawal.net_amount} FCFA)`,
      link: '/vendor/withdrawals'
    });

    sendWithdrawalProcessedEmail(
      { email: withdrawal.vendor_id.user_id.email, first_name: withdrawal.vendor_id.user_id.first_name },
      { ...withdrawal.toObject() },
      'completed'
    );

    res.json({ message: 'Retrait approuvé et versé' });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
