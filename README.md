# WiFiSecure – Surveillance du réseau Wi-Fi public

WiFiSecure est une plateforme de suivi et de sécurisation du réseau Wi‑Fi public d'une bibliothèque. Elle permet de collecter des sessions réseau, surveiller les usages en temps réel, détecter des alertes et gérer le personnel via une interface sécurisée.

## Stack Technique

- Frontend : Next.js, React, TypeScript, Tailwind CSS
- Backend : Express + TypeScript
- Base de données : PostgreSQL
- Authentification : sessions sécurisées avec rôles admin / agent
- Déploiement local : Docker Compose

## Structure proposée

```text
wifisecure/
├── apps/
│   ├── api/
│   └── web/
├── prisma/
├── docker-compose.yml
├── .env.example
├── README.md
└── package.json
```

## Prérequis

- Node.js 20+
- npm
- Docker + Docker Compose

## Démarrage rapide avec Docker

1. Copier le fichier d'exemple des variables d'environnement :

```bash
cp .env.example .env
```

2. Lancer la stack complète :

```bash
docker compose up --build
```

3. Ouvrir l'application :
   - Frontend : http://localhost:3000
   - API : http://localhost:4000
   - PostgreSQL : localhost:5432

### Configuration en production

Configurez `DATABASE_URL`, `DIRECT_URL` et `SESSION_SECRET` dans l'environnement de déploiement. `DATABASE_URL` peut utiliser le pooler Supabase en mode transaction (port 6543) pour Prisma. Les sessions utilisent `DIRECT_URL` par défaut ; avec Supabase, configurez-le en mode session (port 5432), compatible avec les connexions persistantes. Vous pouvez définir `SESSION_DATABASE_URL` si l'API a besoin d'une autre URL persistante pour les sessions. Le frontend Docker transmet `/api/*` à l'API via `API_INTERNAL_URL` (par défaut `http://api:4000`). Sur Netlify, déployez l'API Express séparément et configurez `API_INTERNAL_URL` dans les variables d'environnement Netlify avec son URL HTTPS publique ; le build échoue explicitement si cette variable manque. `NEXT_PUBLIC_API_URL` peut rester vide pour conserver ce proxy same-origin.

Avant le premier démarrage, appliquez les migrations (`npx prisma migrate deploy --schema prisma/schema.prisma`) et créez les comptes administrateur et agent dans la base de production. Le seed de démonstration local efface les données existantes : ne l'exécutez pas sur une base de production. Vérifiez ensuite `GET /health` et les logs API si une requête renvoie une erreur 500.

## Initialisation de la base locale

Si vous n'utilisez pas Docker, vous pouvez lancer PostgreSQL localement, puis exécuter :

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Comptes de démonstration

Le seed crée un compte administrateur et un compte agent :

- admin@bibliotheque.bj / admin123
- agent@bibliotheque.bj / agent123

## Endpoints API principaux

- `POST /api/sessions/ingest`
- `GET /api/sessions`
- `GET /api/stats/live`
- `GET /api/stats/summary`
- `GET /api/alerts`
- `GET /api/export?format=csv&period=day|week|month`

## Règles d'alerte

- Volume d'une session > seuil configuré (2 Go par défaut)
- Domaine DNS présent dans la liste noire (`domaines_bloques`)

## Script de seed

Le script insert 100+ sessions sur 7 jours et génère des alertes réalistes pour tester le tableau de bord.

## Déploiement réseau réel

Le service `apps/ingestor` peut être ajouté pour parser des journaux pfSense/OpenNDS et alimenter l'API d'ingestion. Cette version MVP inclut l'API d'ingestion et le système de seed de démonstration.

## Scripts utiles

```bash
npm install
npm run dev
npm run build
npm run test
```

## Router data collection

The dashboard reads sessions stored in PostgreSQL and refreshes every 15 seconds. To accept events from a router or collector, add a long random key to the root `.env` file:

```env
WIFI_INGEST_TOKEN=replace-with-a-long-random-secret
```

The collector sends `POST /api/sessions/ingest` with the `x-wifi-ingest-token` header and a JSON body such as:

```json
{
  "identifiant_usager": "U-102",
  "appareil": "smartphone",
  "debut": "2026-09-24T10:00:00.000Z",
  "fin": null,
  "volume_octets": 1024000,
  "domaine_dns": "research.example",
  "adresse_ip": "192.168.10.42",
  "adresse_mac": "AA:BB:CC:DD:EE:FF",
  "navigateur": "Mozilla/5.0 ..."
}
```

Without a router or collector, seeded rows are demo data and do not represent live network traffic. Expose the API over HTTPS on a trusted network.

## Incident response: WhatsApp and UniFi

Add these variables to the root `.env` file. Never commit real tokens or API keys:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ADMIN_PHONE=
WHATSAPP_GRAPH_API_VERSION=
WHATSAPP_ALERT_TEMPLATE=
WHATSAPP_TEMPLATE_LANGUAGE=fr
UNIFI_API_BASE_URL=https://unifi-controller.example
UNIFI_API_KEY=
UNIFI_SITE_ID=
```

Create and approve a WhatsApp Business Cloud API utility template whose body contains seven placeholders, in order: user ID, infraction, device type, IP address, MAC address, browser, and event date/time. The application sends that template for each new alert. A template must exist before the app can send it.

Configure a UniFi Network integration API key and site ID. Set `UNIFI_API_BASE_URL` to the Network API base; on a UniFi OS console this may include `/proxy/network`. Administrators perform block/unblock actions directly in WiFiSecure from the Alerts page or the `Liste Jaune` page; WiFiSecure sends the corresponding action to the controller in the background. Without a MAC address or reachable/configured UniFi API, the operation is rejected and the database is not marked as blocked.

## Archives quotidiennes des connexions

L'API archive automatiquement chaque jour à minuit (fuseau `Africa/Porto-Novo`) les sessions réseau de la journée précédente, avec leurs alertes associées. Un rattrapage de la journée précédente est tenté au démarrage de l'API. Les archives sont des fichiers JSON privés dans Supabase Storage, consultables et téléchargeables depuis la page **Archives** réservée aux administrateurs.

Dans Supabase Storage, créez un bucket **privé** nommé `connection-archives` (ou renseignez un autre nom dans `SUPABASE_ARCHIVE_BUCKET`). L'API utilise `SUPABASE_URL` et `SUPABASE_SECRET_KEY` côté serveur ; cette clé ne doit jamais être exposée au frontend. La page Archives signale si le bucket ou les identifiants ne sont pas configurés. Le listing affiche jusqu'aux 1000 fichiers les plus récents.

## Actualités de la bibliothèque

Après authentification, les usagers sont dirigés vers `/actualites`. Ils y voient uniquement les actualités publiées. Les administrateurs disposent de la même page dans la navigation : ils peuvent rédiger, modifier, publier, dépublier ou supprimer une information. Les brouillons restent visibles uniquement pour les administrateurs. Appliquez la migration `20260924143000_library_news` avant de déployer cette fonctionnalité.

Le formulaire accepte un nombre non limité de fichiers, quels que soient leur type et leur extension. Chaque fichier peut peser jusqu'à 50 Mo ; la quantité totale reste soumise au quota de stockage du projet Supabase. Le serveur crée ou configure automatiquement un bucket privé dédié, nommé `library-news` par défaut (modifiable via `SUPABASE_NEWS_BUCKET`), avec les restrictions de type MIME désactivées. Les téléchargements restent authentifiés et sont forcés en pièces jointes binaires pour empêcher l'exécution de fichiers actifs dans le navigateur. Appliquez la migration `20260924160000_news_attachments` pour activer les pièces jointes.

`Liste Jaune` is the incident register: it lists every recorded network alert with the user/device details collected at ingestion and the current block state for that MAC address.

The collector must send `adresse_ip`, `adresse_mac`, and `navigateur` with each session event for those incident details to appear. UniFi does not provide a browser user-agent from its client record, so the captive portal/collector must provide it.
