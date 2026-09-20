# Weather Website

A full-stack weather web application with a Python backend and a React (Vite) frontend.

## Project Structure

```
weather-website/
├── backend/
│   ├── .env.example
│   ├── main.py
│   ├── requirements.txt
│   └── weather_core.py
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── .gitignore
└── README.md
```

## Getting Started

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```
