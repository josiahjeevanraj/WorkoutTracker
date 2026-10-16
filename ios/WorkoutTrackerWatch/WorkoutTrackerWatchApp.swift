import SwiftUI

@main
struct WorkoutTrackerWatchApp: App {
    @StateObject private var workoutManager = WatchWorkoutManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(workoutManager)
        }
    }
}
