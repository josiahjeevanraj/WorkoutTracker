import Foundation
import WatchConnectivity
import React

@objc(WatchBridge)
class WatchBridge: RCTEventEmitter {

    private var hasListeners = false

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: - RCTEventEmitter

    override static func requiresMainQueueSetup() -> Bool { false }

    override func supportedEvents() -> [String] {
        ["onHeartRateUpdate"]
    }

    override func startObserving() { hasListeners = true }
    override func stopObserving()  { hasListeners = false }
}

// MARK: - WCSessionDelegate

extension WatchBridge: WCSessionDelegate {

    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any]) {
        guard hasListeners, let bpm = message["heartRate"] as? Int else { return }
        sendEvent(withName: "onHeartRateUpdate", body: [
            "bpm": bpm,
            "timestamp": message["timestamp"] ?? Date().timeIntervalSince1970,
        ])
    }

    func session(_ session: WCSession,
                 activationDidCompleteWith state: WCSessionActivationState,
                 error: Error?) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
}
