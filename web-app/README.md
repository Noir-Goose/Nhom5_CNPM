# Frontend deployment

The frontend is a Vite single-page application. Deploy the `web-app` directory as a Vercel project with the Vite preset, `npm run build` as the build command, and `dist` as the output directory. The included `vercel.json` rewrites app routes such as `/login` and `/admin` to `index.html`.

## Connect Vercel to the Railway API

In Vercel, open **Project Settings → Environment Variables** and add:

- Key: `VITE_API_BASE_URL`
- Value: the Railway backend origin, for example `https://nhom5cnpm-production.up.railway.app`
- Environments: Production; add Preview too if preview deployments should use the API.

Use only the backend origin: do not append `/api/v1` or an endpoint path, and do not add a trailing slash. The frontend adds the API paths itself. Vite embeds environment variables at build time, so redeploy after changing this value.

On Railway, set `FRONTEND_ORIGINS` to the exact frontend origins allowed to call the API, separated by commas and without trailing slashes. Include the Vercel production domain and any Preview domain you actively use. Preview URLs can change between deployments.

## Map provider

The map uses Leaflet with OpenStreetMap tiles. It does not require a Google Maps API key or Google Cloud billing. Keep the visible OpenStreetMap attribution in the map. Follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/) when using the public tile server.

## Local development

Copy `.env.example` to `.env.local`, then set `VITE_API_BASE_URL` to the local backend origin (default `http://localhost:8000`). Configure the backend with the variables in `backend/.env.example`.
