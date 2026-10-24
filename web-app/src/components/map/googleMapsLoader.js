let mapsApiPromise;

// [MAP-003] Tải Google Maps JavaScript API một lần và dùng chung trong app.
export function loadGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return Promise.reject(new Error("missing-api-key"));
  if (window.google?.maps?.importLibrary) return window.google.maps.importLibrary("maps");
  if (mapsApiPromise) return mapsApiPromise;

  mapsApiPromise = new Promise((resolve, reject) => {
    const callbackName = "__q4GoogleMapsReady";
    const script = document.createElement("script");
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };
    script.async = true;
    script.onerror = () => {
      delete window[callbackName];
      mapsApiPromise = undefined;
      reject(new Error("google-maps-load-failed"));
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=${callbackName}&v=weekly`;
    document.head.appendChild(script);
  }).then((maps) => maps.importLibrary("maps"));

  return mapsApiPromise;
}
