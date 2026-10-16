// Live run tracking is native-app only; index.js imports this module on every
// platform to register the native background task, so the web gets a no-op.
export async function startRunLocation() {
  return () => {};
}
