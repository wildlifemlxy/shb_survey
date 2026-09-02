# WWF Project Management System

A web platform for coordinating WWF Singapore's field conservation programs — survey data collection, event scheduling, photo galleries, and Telegram bot notifications — currently supporting two initiatives:

- **Straw-Headed Bulbul** — wildlife monitoring through survey walks, event coordination, and photo documentation across Singapore's nature reserves and parks.
- **Rifle Range Road** — a conservation survey workspace for observations, field events, and project activity.

## Tech Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS, MUI, AG Grid
- Google Maps / Leaflet for map views
- Socket.IO client, Chart.js/D3 for analytics

**Backend**
- Node.js (Express)
- MongoDB (Mongoose)
- Socket.IO for realtime updates
- JWT-based auth with MFA support
- Google APIs (Drive/Calendar) and Telegram Bot integration
- Nodemailer for email notifications

## Project Structure

```
wwf-project-management-system/
├── backend/node/          # Express API server
│   ├── Controller/        # Per-project controllers (RifleRangeRoad, strawHeadedBulbul)
│   ├── routes/             # Express route definitions
│   ├── Database/           # MongoDB connection setup
│   ├── models/             # Mongoose models
│   ├── middleware/          # Connection pooling, rate limiting
│   ├── cron/               # Scheduled jobs (event updates, Telegram bot)
│   ├── services/            # Notification service, etc.
│   └── Telegram/            # Telegram bot implementation
└── frontend/               # React + Vite single-page app
    └── src/
        ├── components/      # Feature components (Map, Charts, Dashboard, Gallery, etc.)
        ├── config/          # API and map configuration
        ├── data/            # Project registry and static data
        ├── services/        # API client services
        └── Settings/        # Telegram bot / chat settings UI
```

## Prerequisites

- Node.js ≥ 22
- npm
- A MongoDB database (e.g. MongoDB Atlas)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/wildlifemlxy/wwf-project-management-system.git
cd wwf-project-management-system
```

### 2. Backend setup

```bash
cd backend/node
npm install
```

Create a `.env` file in `backend/node/` (this file is git-ignored) with the variables listed in [Environment Variables](#environment-variables).

```bash
npm run dev     # starts with nodemon
# or
npm start       # starts once via node ./bin/www
```

The API runs on `http://localhost:3001` by default.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3000` and points at the backend URL configured in [src/config/apiConfig.js](frontend/src/config/apiConfig.js).

## Environment Variables

Backend (`backend/node/.env`):

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | API server port (default `3001`) |
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | Secret used to sign JWTs (min 32 chars) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials for gallery upload |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Refresh token for the authorized Google account |
| `GOOGLE_FOLDER_ID` | Google Drive folder ID used by the gallery |
| `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | SMTP credentials for outgoing notification emails |
| `FRONTEND_URL` | Deployed frontend URL, used for CORS/email links |

> **Never commit real values for these variables.** Use a local `.env` file (already git-ignored) and store production secrets in your hosting provider's secrets manager (e.g. Azure Web App Application Settings).

## Deployment

The project is set up to deploy to Azure:
- **Backend** → Azure Web App (Node.js)
- **Frontend** → Azure Static Web Apps

`azure-webapp-config.env` in the repo root is a **template** describing which Application Settings to configure on Azure — it should never contain real secrets once populated for actual use.

## Security Notes

- Google service account keys belong in `backend/node/keys/`, which is git-ignored.
- Rotate any credential immediately if it is ever committed to version control, even temporarily.

## Contributing

1. Create a feature branch from `dev`.
2. Make your changes and test locally against both frontend and backend.
3. Open a pull request describing the change.
