# Frontend deployment

Netlify builds this directory as a static Vite site. It does not run the FastAPI backend or connect directly to MongoDB.

## Connect Netlify to the API

1. Deploy the `backend` directory as a Python web service on a host that can run FastAPI (for example, Render or Railway). Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` as the start command and `backend` as the working/root directory.
2. Set these backend environment variables in that host:
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `MONGODB_DB_NAME`: `q4_food_guide`
   - `FRONTEND_ORIGINS`: the exact Netlify site origin, such as `https://your-site.netlify.app` (no trailing slash). Include localhost origins too if you still develop locally.
   - Set the SMTP and JWT variables from `backend/.env.example` if the email and authentication features are used.
3. In Netlify, set `VITE_API_BASE_URL` to the deployed backend's public origin, for example `https://your-api.example.com` (no trailing slash), then trigger a new deploy. Vite embeds this value at build time.
4. Open `https://your-api.example.com/health/ready`. A `ready` response confirms that the API can reach MongoDB. Then reload the Netlify site and check its Network panel for `/api/v1/poi/load-all?lang=vi` returning HTTP 200.

For local development, copy `web-app/.env.example` to `web-app/.env.local`, and configure the backend using `backend/.env.example` copied to `backend/.env`.
