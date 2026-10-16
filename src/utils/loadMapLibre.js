// Loads MapLibre GL from our own static files (public/vendor) with a plain <script>
// tag, only when a map is needed. Lazy bundler chunks didn't load on iOS Safari.
const VERSION = '5.24.0';
const BASE = `/vendor/maplibre-gl@${VERSION}`;
let loading = null;

export default function loadMapLibre() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-maplibre]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${BASE}/maplibre-gl.css`;
      link.dataset.maplibre = '1';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = `${BASE}/maplibre-gl.js`;
    script.async = true;
    const timer = setTimeout(() => reject(new Error('MapLibre load timed out')), 20000);
    script.onload = () => {
      clearTimeout(timer);
      window.maplibregl ? resolve(window.maplibregl) : reject(new Error('MapLibre missing after load'));
    };
    script.onerror = () => { clearTimeout(timer); reject(new Error('MapLibre failed to load')); };
    document.head.appendChild(script);
  }).catch(err => { loading = null; throw err; });
  return loading;
}
