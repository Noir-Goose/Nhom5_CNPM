let mapsApiPromise;

async function loadLibraries(maps) {
  const [mapsLibrary, markerLibrary, coreLibrary] = await Promise.all([
    maps.importLibrary("maps"),
    maps.importLibrary("marker"),
    maps.importLibrary("core"),
  ]);
  return { ...mapsLibrary, ...markerLibrary, ...coreLibrary };
}

// [MAP-003] Tải Google Maps JavaScript API một lần và dùng chung trong app.
export function loadGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return Promise.reject(new Error("missing-api-key"));
  if (window.google?.maps?.importLibrary) return loadLibraries(window.google.maps);
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
  }).then((maps) => {
    // Marker and SymbolPath live in separate Maps JS libraries. Importing only
    // `maps` leaves `mapsLibrary.Marker` undefined and crashes the whole view.
    return loadLibraries(maps);
  }).catch((error) => {
    mapsApiPromise = undefined;
    throw error;
  });

  return mapsApiPromise;
}
