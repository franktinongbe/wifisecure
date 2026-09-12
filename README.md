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
