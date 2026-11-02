# DigitalMarket - Marketplace de Produits Digitaux

Une marketplace complète pour la vente de produits digitaux (ebooks, templates, musiques, vidéos, scripts, etc.) avec validation des vendeurs, système de commissions, téléchargements sécurisés et paiements intégrés.

## 🚀 Fonctionnalités

### Pour les Clients
- 🛒 Navigation et recherche de produits
- 🛍️ Panier et paiement sécurisé (Mobile Money & Carte)
- 📥 Téléchargements instantanés avec liens sécurisés
- ❤️ Liste de favoris
- ⭐ Système d'avis et notes
- 👤 Gestion du compte

### Pour les Vendeurs
- 📊 Dashboard avec statistiques de ventes
- 📦 Gestion des produits (CRUD)
- 💰 Suivi des revenus et retraits
- 📈 Rapports de ventes

### Pour les Administrateurs
- 🎛️ Dashboard administrateur complet
- ✅ Validation des vendeurs et produits
- 💳 Gestion des retraits
- 👥 Gestion des utilisateurs
- 📁 Gestion des catégories
- 🖼️ Gestion des bannières
- 📝 Gestion du blog
- ⚙️ Paramètres du site

## 🛠️ Stack Technique

### Frontend
- **React 18** + Vite
- **TailwindCSS** pour le styling
- **Shadcn/UI** pour les composants
- **React Query** pour la gestion des données
- **React Router** pour le routing
- **Zustand** pour le state management
- **React Hook Form** + Zod pour les formulaires

### Backend
- **Node.js** + Express
- **MongoDB** + Mongoose
- **JWT** pour l'authentification
- **Cloudinary** pour le stockage de fichiers
- **Nodemailer** pour les emails
- **iKeePay** pour les paiements (dépôts + retraits)

## 📁 Structure du Projet

```
DigitalMarket/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration (DB, Cloudinary)
│   │   ├── controllers/     # Logique métier
│   │   ├── database/        # Schema SQL et seeds
│   │   ├── middleware/      # Auth, erreurs
│   │   ├── routes/          # Routes API
│   │   ├── utils/           # Utilitaires (email, tokens)
│   │   └── server.js        # Point d'entrée
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Composants UI
│   │   ├── layouts/         # Layouts (Main, Admin, Vendor)
│   │   ├── lib/             # API, utils
│   │   ├── pages/           # Pages de l'app
│   │   ├── stores/          # State management
│   │   └── App.jsx
│   ├── index.html
│   └── package.json
│
└── README.md
```

## 🚦 Installation

### Prérequis
- Node.js 18+
- MongoDB 6+ (local ou MongoDB Atlas)
- Compte Cloudinary
- Compte iKeePay (clé API marchand)

### Backend

```bash
cd backend
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (MONGODB_URI, IKEEPAY_*, etc.)

# Ajouter les données de test (crée les comptes + réglages par défaut)
npm run seed

# Démarrer le serveur
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## ⚙️ Configuration

### Variables d'environnement Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database (MongoDB)
MONGODB_URI=mongodb://127.0.0.1:27017/digitalmarket

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# iKeePay
IKEEPAY_BASE_URL=https://api.ikeepay.com
IKEEPAY_API_KEY=your_api_key
IKEEPAY_SECRET_KEY=your_secret_key
IKEEPAY_SITE_NAME=DigitalMarket
IKEEPAY_COLLECT_PATH=/api/v1/payment/collect
IKEEPAY_STATUS_PATH=/api/v1/payment/status
IKEEPAY_PAYOUT_PATH=/api/v1/payout
IKEEPAY_NOTIFY_URL=https://your-api.onrender.com/api/payments/ikeepay/webhook
IKEEPAY_RETURN_URL=https://your-frontend.vercel.app/payment/success
IKEEPAY_CANCEL_URL=https://your-frontend.vercel.app/payment/cancel

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@digitalmarket.com

# Frontend
FRONTEND_URL=http://localhost:5173

# Téléchargements sécurisés
DOWNLOAD_LINK_EXPIRE_MINUTES=60
MAX_DOWNLOAD_ATTEMPTS=5
```

> La commission plateforme (`withdrawal_fee_rate`) et le retrait minimum
> (`min_withdrawal`) sont stockés en base et **configurables depuis le
> dashboard administrateur** (`/admin/settings`).

## 📚 API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Profil utilisateur
- `POST /api/auth/forgot-password` - Mot de passe oublié
- `POST /api/auth/reset-password` - Réinitialiser mot de passe

### Products
- `GET /api/products` - Liste des produits
- `GET /api/products/:slug` - Détails produit
- `POST /api/products` - Créer produit (vendor)
- `PUT /api/products/:id` - Modifier produit
- `DELETE /api/products/:id` - Supprimer produit

### Orders
- `GET /api/orders/my-orders` - Mes commandes
- `GET /api/orders/my-downloads` - Mes téléchargements

### Payments
- `POST /api/payments/initialize` - Initialiser paiement (dépôt)
- `POST /api/payments/ikeepay/webhook` - Webhook iKeePay
- `GET /api/payments/ikeepay/verify/:reference` - Vérifier une transaction
- `GET /api/payments/status/:order_number` - Statut d'une commande

### Vendors
- `POST /api/vendors/apply` - Demande vendeur
- `GET /api/vendors/me/dashboard` - Dashboard vendeur
- `GET /api/vendors/me/products` - Produits du vendeur

### Admin
- `GET /api/admin/dashboard` - Dashboard admin
- `GET /api/admin/users` - Liste utilisateurs
- `PUT /api/vendors/admin/requests/:id` - Traiter demande vendeur

## 🔐 Rôles et Permissions

| Rôle | Permissions |
|------|-------------|
| **client** | Acheter, télécharger, avis |
| **vendor** | + Vendre, gérer produits, retraits |
| **admin** | + Gérer tout le site |

## 💳 Paiements

Le système utilise **iKeePay** pour les paiements :
- Mobile Money (MTN, Orange, Moov, Wave, Airtel)
- Cartes bancaires (Visa, MasterCard)

### Modèle de commission

- Le vendeur crédite **100 %** du prix de vente lors d'un achat.
- La plateforme retient un **pourcentage sur chaque retrait** (`withdrawal_fee_rate`),
  configurable depuis le dashboard administrateur.
- Les retraits vendeurs sont **versés automatiquement** via l'API payout iKeePay
  lors de l'approbation par l'administrateur (le vendeur reçoit le montant net).

## 📥 Téléchargements Sécurisés

- Liens temporaires (expire après 60 min)
- Limite de 5 téléchargements par achat
- Stockage sécurisé sur Cloudinary

## 🎨 Thème

L'application supporte le mode sombre/clair avec les couleurs principales :
- Primary: Violet (#7c3aed)
- Couleurs personnalisables via CSS variables

## 📧 Notifications Email

Emails automatiques pour :
- Confirmation d'inscription
- Confirmation de commande
- Approbation/rejet vendeur
- Traitement de retrait
- Nouvelle vente (vendeur)

## 🔧 Scripts Disponibles

### Backend
```bash
npm start        # Production
npm run dev      # Développement
npm run seed     # Données de test + réglages par défaut
```

### Frontend
```bash
npm run dev      # Développement
npm run build    # Production
npm run preview  # Prévisualisation build
```

## 🚀 Déploiement

### Backend → Render

Le fichier `render.yaml` à la racine décrit le service (Blueprint Render).

1. Sur Render : **New → Blueprint**, sélectionner le dépôt.
2. Render détecte `render.yaml` (rootDir `backend`, health check `/api/health`).
3. Renseigner les variables marquées `sync: false` (`MONGODB_URI`, `CLOUDINARY_*`,
   `SMTP_*`, `FRONTEND_URL`, `IKEEPAY_API_KEY`, `IKEEPAY_SECRET_KEY`, les `IKEEPAY_*_URL`).

### Frontend → Vercel

1. Sur Vercel : **New Project**, importer le dépôt.
2. **Root Directory = `frontend`** (Vercel lit alors `frontend/vercel.json`, framework Vite).
3. Définir la variable `VITE_API_URL = https://<votre-api>.onrender.com/api`.
4. Ajouter le domaine Vercel dans `FRONTEND_URL` (backend Render) pour le CORS.

## 📝 Licence

MIT License - Libre d'utilisation et de modification.

## 👥 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

Développé avec ❤️ pour la communauté africaine de créateurs digitaux.
