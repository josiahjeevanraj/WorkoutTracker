// Browser GPS for outdoor runs (stops when the page is hidden or the phone locks).
// Same interface as runLocation.js: startRunLocation(onFix, onError) -> stop().
export const isBackgroundCapable = false;

export async function startRunLocation(onFix, onError) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.({ code: 0, message: 'Location is not available in this browser.' });
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    pos => onFix(pos.coords, pos.timestamp),
    err => onError?.({
      code: err.code,
      message: err.code === 1 ? 'Location permission was denied. Allow it in your browser settings.' : 'Waiting for GPS…',
    }),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
