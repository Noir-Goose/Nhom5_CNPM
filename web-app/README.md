# Frontend deployment

Vercel builds this directory as a static Vite site. It does not run the FastAPI backend or connect directly to MongoDB.

## Connect the frontend to the API and Google Maps

1. Deploy the `backend` directory as a Python web service on a host that can run FastAPI (for example, Render or Railway). Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` as the start command and `backend` as the working/root directory.
2. Set these backend environment variables in that host:
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `MONGODB_DB_NAME`: `q4_food_guide`
   - `FRONTEND_ORIGINS`: the exact Netlify site origin, such as `https://your-site.netlify.app` (no trailing slash). Include localhost origins too if you still develop locally.
   - Set the SMTP and JWT variables from `backend/.env.example` if the email and authentication features are used.
3. In Vercel, set `VITE_API_BASE_URL` to the deployed backend's public origin, for example `https://your-api.example.com` (no trailing slash).
4. In Google Cloud, enable the Maps JavaScript API, attach billing, create a browser API key, and restrict it to the Maps JavaScript API and your website referrers. For this app, add `https://nhom5-cnpm.vercel.app/*`; add `http://localhost:5173/*` only for local development.
5. In Vercel, set `VITE_GOOGLE_MAPS_API_KEY` to that restricted browser key, then redeploy. Vite embeds both `VITE_*` values in the frontend at build time, so never put server credentials in them.
6. Open `https://your-api.example.com/health/ready`. A `ready` response confirms that the API can reach MongoDB. Then check the browser Network panel for `/api/v1/poi/load-all?lang=vi` returning HTTP 200 and Google Maps JavaScript API loading successfully.

For local development, copy `web-app/.env.example` to `web-app/.env.local`, and configure the backend using `backend/.env.example` copied to `backend/.env`.

Official Google setup and key security guides: [Get an API key](https://developers.google.com/maps/documentation/javascript/get-api-key) and [Maps Platform security best practices](https://developers.google.com/maps/api-security-best-practices).
