VIDEO PLATFORM - React + Vite + FastAPI + AWS

Estructura:
frontend/ = React + Vite
backend/ = FastAPI

BACKEND:
1. Entrar a backend
2. Crear/activar venv
3. pip install -r requirements.txt
4. Copiar .env.example a .env
5. Completar DATABASE_URL, AWS_REGION, VIDEOS_BUCKET y THUMBNAILS_BUCKET
6. Ejecutar:
   python -m uvicorn main:app --reload

API:
http://127.0.0.1:8000/docs

FRONTEND:
1. Entrar a frontend
2. npm install
3. npm run dev

SPA:
http://localhost:5173

AWS todavía no está configurado en este ZIP. Los buckets y RDS se conectan mediante .env.
