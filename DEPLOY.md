# Deployment Guide

This guide details the deployment configuration for both the FastAPI backend on [Render](https://render.com) and the React/Vite frontend on [Vercel](https://vercel.com).

---

## 1. Backend Deployment (Render)

Deploy the backend as a **Web Service** on Render.

### Settings
- **Name**: `weather-backend` (or your preferred name)
- **Root Directory**: `backend`
- **Environment / Runtime**: `Python 3` (Python version `3.12` is defined in `backend/.python-version`)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/api/health`

### Environment Variables
| Variable | Description | Example / Recommended Value |
|---|---|---|
| `ALLOWED_ORIGINS` | Comma-separated list of permitted CORS origins. (Requests matching regex `https://.*\.vercel\.app` are also allowed automatically). | `https://your-frontend.vercel.app,http://localhost:5173` |

---

## 2. Frontend Deployment (Vercel)

Deploy the frontend as a project on Vercel.

### Settings
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables
| Variable | Description | Example / Recommended Value |
|---|---|---|
| `VITE_API_URL` | Base URL of the deployed backend service (no trailing slash). | `https://weather-backend.onrender.com` |

---

## 3. Environment Variables Summary

1. **`ALLOWED_ORIGINS`** (Backend on Render):
   - Configures backend CORS allowed origins.
   - Defaults to `http://localhost:5173,http://127.0.0.1:5173` if unset.
   - Automatically permits Vercel preview deployment URLs (`https://.*\.vercel\.app`).

2. **`VITE_API_URL`** (Frontend on Vercel):
   - Sets the API target URL for all frontend HTTP requests.
   - For local development, set in `frontend/.env` (see `frontend/.env.example`).
