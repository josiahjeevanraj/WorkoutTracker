// Live run tracking is native-app only (browser GPS stops when the phone locks).
// This stub keeps the tracker and its GPS code out of the web bundle.
const RunTracker = () => null;

export default RunTracker;
