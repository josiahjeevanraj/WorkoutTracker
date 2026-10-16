import Foundation
import HealthKit
import WatchConnectivity

class WatchWorkoutManager: NSObject, ObservableObject {
    let healthStore = HKHealthStore()

    @Published var heartRate: Int = 0
    @Published var isRunning: Bool = false
    @Published var elapsedSeconds: Int = 0

    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var timer: Timer?

    // MARK: - Permissions

    func requestAuthorization() {
        let typesToShare: Set<HKSampleType> = [HKObjectType.workoutType()]
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { _, _ in }
        setupWatchConnectivity()
    }

    // MARK: - Workout control

    func startWorkout() {
        let config = HKWorkoutConfiguration()
        config.activityType = .traditionalStrengthTraining
        config.locationType = .indoor

        do {
            session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            builder = session?.associatedWorkoutBuilder()
            builder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: config
            )
            session?.delegate = self
            builder?.delegate = self
            session?.startActivity(with: Date())
            builder?.beginCollection(withStart: Date()) { _, _ in }
            DispatchQueue.main.async { self.isRunning = true }
            startTimer()
        } catch {
            print("Failed to start workout: \(error)")
        }
    }

    func stopWorkout() {
        session?.end()
        stopTimer()
        DispatchQueue.main.async {
            self.isRunning = false
            self.heartRate = 0
        }
    }

    // MARK: - Timer

    private func startTimer() {
        elapsedSeconds = 0
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            DispatchQueue.main.async { self.elapsedSeconds += 1 }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    // MARK: - WatchConnectivity

    private func setupWatchConnectivity() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    private func sendHeartRate(_ bpm: Int) {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["heartRate": bpm, "timestamp": Date().timeIntervalSince1970],
            replyHandler: nil,
            errorHandler: nil
        )
    }
}

// MARK: - HKWorkoutSessionDelegate

extension WatchWorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession,
                        didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState,
                        date: Date) {}

    func workoutSession(_ workoutSession: HKWorkoutSession,
                        didFailWithError error: Error) {
        print("Workout session error: \(error)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WatchWorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilder(_ builder: HKLiveWorkoutBuilder,
                        didCollectDataOf types: Set<HKSampleType>) {
        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate),
              types.contains(hrType) else { return }

        let stats = builder.statistics(for: hrType)
        let bpm = stats?.mostRecentQuantity()?.doubleValue(for: HKUnit(from: "count/min")) ?? 0
        let rounded = Int(bpm.rounded())

        DispatchQueue.main.async { self.heartRate = rounded }
        sendHeartRate(rounded)
    }

    func workoutBuilderDidCollectEvent(_ builder: HKLiveWorkoutBuilder) {}
}

// MARK: - WCSessionDelegate

extension WatchWorkoutManager: WCSessionDelegate {
    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {}
}
