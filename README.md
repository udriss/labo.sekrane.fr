# SGIL - Système de Gestion de l'Information du Laboratoire

Un système de gestion de laboratoire scolaire moderne avec Next.js 14+, TypeScript, Prisma et WebSocket temps réel.

## 🚀 Fonctionnalités

- **Interface moderne** avec Material-UI et animations Framer Motion
- **Authentification sécurisée** avec NextAuth.js
- **Notifications temps réel** via WebSocket
- **Gestion des équipements** chimie et physique
- **Calendrier des séances** avec créneaux horaires
- **Gestion des consommables** et réactifs
- **Tableau de bord** avec métriques en temps réel

## 🏗️ Architecture

- **Frontend**: Next.js 14+ avec App Router, TypeScript, Material-UI
- **Backend**: API Routes Next.js + Serveur WebSocket intégré
- **Base de données**: MySQL avec Prisma ORM
- **Authentification**: NextAuth.js avec stratégie credentials
- **Temps réel**: WebSocket server intégré au serveur Next.js

## 📦 Installation

### Prérequis

- Node.js 18+
- MySQL 8.0+
- npm ou yarn

### Développement

1. **Clone du projet**

```bash
git clone <repository-url>
cd labo.sekrane.fr
```

2. **Installation des dépendances**

```bash
npm install
```

3. **Configuration de l'environnement**

```bash
# Copier la configuration de développement
cp .env.development .env.local
# Ou éditer directement .env avec vos paramètres
```

4. **Base de données**

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Optionnel: Seed des données de test
npm run db:seed
```

5. **Démarrage en développement**

```bash
# Avec le serveur TypeScript unifié (recommandé)
npm run dev

# Ou avec le script de développement
./dev.sh

# Ou via le script d'environnement
./deploy-env.sh dev
```

### Production

1. **Configuration de production**

```bash
# Copier et éditer la configuration de production
cp .env.production .env.local
# Éditer .env.local avec vos paramètres de production
```

2. **Déploiement**

```bash
# Déploiement automatique en production
./deploy-env.sh prod

# Ou manuel
npm run build
npm run start
```

## 🔧 Configuration

### Variables d'environnement

#### Développement (.env.development)

```env
NODE_ENV=development
DATABASE_URL="mysql://user:password@localhost:3306/labo_lims_dev"
NEXTAUTH_URL=http://localhost:8006
AUTH_SECRET=dev-secret-key
PORT=8006
NEXT_PUBLIC_WS_URL=ws://localhost:8006/ws
```

#### Production (.env.production)

```env
NODE_ENV=production
DATABASE_URL="mysql://user:password@production-host:3306/labo_lims_prod"
NEXTAUTH_URL=https://labo.sekrane.fr
AUTH_SECRET=secure-production-secret-32-chars-min
PORT=8006
NEXT_PUBLIC_WS_URL=/ws
```

### ⚠️ Note sur `prisma.config.ts` et le chargement des `.env`

Depuis l'introduction de `prisma.config.ts`, Prisma **désactive le chargement automatique** des fichiers `.env`. Sans précaution, les commandes comme `npx prisma migrate deploy` peuvent échouer avec:

```
Environment variable not found: DATABASE_URL
```

Pour éviter cela, le projet charge désormais manuellement les variables dans `prisma.config.ts` en respectant la priorité suivante:

1. `.env.local`
2. `.env.development` (si `NODE_ENV=development`)
3. `.env`

Si vous utilisez un autre mécanisme (docker, systemd, CI), assurez-vous que `DATABASE_URL` est réellement présente dans l'environnement avant d'exécuter les commandes Prisma.

#### CI / Intégration Continue

Dans un pipeline (GitHub Actions / GitLab CI), exportez explicitement la variable:

```bash
export DATABASE_URL="mysql://user:pass@host:3306/dbname"
npx prisma migrate deploy
```

Optionnel: intégrer [dotenvx](https://dotenvx.com) pour chiffrer/distribuer les secrets:

```bash
npx dotenvx run -- npx prisma migrate status
```

Le script `scripts/check-prisma-drift.sh` tente déjà de sourcer `.env.local` ou `.env` si `DATABASE_URL` est absente.

#### Production

Préférez l'injection de variables d'environnement système (service, container) plutôt que `.env` commité. Exemple systemd:

```
[Service]
Environment=NODE_ENV=production
Environment=DATABASE_URL=mysql://user:pass@db-host:3306/labo_2
Environment=AUTH_SECRET=...long...
```

Après toute modification du schéma:

```bash
npx prisma migrate deploy
npx prisma generate   # (sécurité pour régénérer le client)
```

En cas d'erreur persistante, vérifier:

- `echo $DATABASE_URL` dans le shell CI/serveur
- Absence d'un second `prisma.config.ts` conflictuel
- Droits réseau du conteneur / service vers MySQL

## 🛠️ Scripts disponibles

### Serveur

- `npm run dev` - Développement avec serveur TS unifié
- `npm run dev:js` - Développement avec serveur JS
- `npm run start` - Production avec serveur TS
- `npm run start:js` - Production avec serveur JS
- `npm run build` - Build de production

### Base de données

- `npm run db:generate` - Générer le client Prisma
- `npm run db:migrate` - Appliquer les migrations
- `npm run db:push` - Push du schéma vers la DB
- `npm run db:seed` - Alimenter la DB avec des données de test

### Développement

- `npm run lint` - Vérification ESLint
- `npm run format` - Formatage avec Prettier
- `npm run test` - Tests unitaires
- `npm run e2e` - Tests end-to-end

## 🌐 WebSocket

Le serveur WebSocket est intégré au serveur Next.js sur le même port (8006 en interne, proxifié par Apache) :

- **Endpoint interne**: `/ws` (derrière Apache => wss://labo.sekrane.fr/ws)
- **Fonctionnalités**: Notifications temps réel, diffusion, messages privés
- **Reconnexion automatique** avec heartbeat

## 🔐 Authentification

### Comptes de test (développement)

- **Admin**: `admin@labo.fr` / `admin123`
- **Professeur**: `prof@labo.fr` / `prof123`
- **Technicien**: `tech@labo.fr` / `tech123`

### Rôles

- `ADMIN` - Administration complète
- `PROFESSEUR` - Gestion des séances et matériel
- `TECHNICIEN` - Maintenance et gestion des stocks
- `ELEVE` - Consultation et réservations

## 📱 Interface

### Pages principales

- `/` - Tableau de bord
- `/signin` - Connexion (interface Material-UI moderne)
- `/chimie` - Gestion laboratoire de chimie
- `/physique` - Gestion laboratoire de physique
- `/materiel` - Gestion des équipements
- `/consommables` - Gestion des stocks
- `/calendrier` - Planning des séances

### Composants

- **NavbarLIMS** - Navigation principale avec notifications
- **AppShell** - Layout principal avec sidebar
- **TimeslotEditor** - Éditeur de créneaux horaires
- **NotificationItem** - Composant de notification temps réel

## 🔍 API

### Endpoints principaux

- `GET /api/user` - Informations utilisateur
- `GET /api/equipment` - Liste des équipements
- `GET /api/consumables` - Liste des consommables
- `GET /api/timeslots` - Créneaux horaires
- `POST /api/notifications` - Envoi de notifications
- `WebSocket /api/notifications/ws` - Connexion temps réel

## 🚨 Dépannage

### Problèmes courants

1. **Erreurs WebSocket**

```bash
# Vérifier les ports
netstat -tulpn | grep :8006
# Redémarrer le serveur
./deploy-env.sh dev
```

2. **Problèmes de session**

```bash
# Vérifier la configuration NextAuth
cat .env.local | grep NEXTAUTH
# Vider les cookies du navigateur
```

3. **Erreurs de base de données**

```bash
# Vérifier la connexion
npm run db:push
# Regénérer le client
npm run db:generate
```

## 📈 Développement

### Structure du projet

```
├── app/                    # Pages Next.js (App Router)
│   ├── api/               # API Routes
│   ├── signin/            # Page de connexion
│   └── layout.tsx         # Layout principal
├── components/            # Composants React
│   ├── layout/           # Composants de layout
│   ├── notifications/    # Système de notifications
│   └── timeslots/        # Gestion des créneaux
├── lib/                  # Utilitaires et services
│   ├── hooks/           # Hooks React personnalisés
│   ├── services/        # Services (DB, WebSocket)
│   └── types/           # Types TypeScript
├── prisma/              # Schéma et migrations DB
└── scripts/             # Scripts de serveur
    ├── ws-server.ts     # Serveur unifié TS
    └── ws-server.js     # Serveur unifié JS
```

## 🤝 Support

Pour le support technique:

- **Issues GitHub**: Pour les bugs et demandes de fonctionnalités
- **Documentation**: Wiki du projet
- **Contact**: admin@sekrane.fr

2. Install dependencies

```bash
npm install
```

3. Generate Prisma client and run dev

```bash
npm run db:generate
npm run dev
```

## Scripts

- dev, build, start
- lint, format
- test, test:watch, e2e, e2e:ui
- db:generate, db:migrate, db:push, db:seed

## Tech

- Next.js 14 App Router
- TypeScript, ESLint/Prettier
- MUI v5, Emotion
- Prisma (MySQL)
- NextAuth
- Jest + Testing Library, Playwright

## Structure

See folders under `app`, `components`, `lib`, `prisma`, `scripts`, `sql`.
