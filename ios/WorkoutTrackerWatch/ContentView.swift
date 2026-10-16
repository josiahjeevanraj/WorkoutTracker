import SwiftUI
import HealthKit

struct ContentView: View {
    @EnvironmentObject var workoutManager: WatchWorkoutManager

    var body: some View {
        if workoutManager.isRunning {
            ActiveWorkoutView()
        } else {
            StartView()
        }
    }
}

// MARK: - Start screen

struct StartView: View {
    @EnvironmentObject var workoutManager: WatchWorkoutManager

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart.fill")
                .font(.system(size: 36))
                .foregroundColor(.red)

            Text("Workout\nTracker")
                .font(.headline)
                .multilineTextAlignment(.center)

            Button(action: {
                workoutManager.requestAuthorization()
                workoutManager.startWorkout()
            }) {
                Text("Start")
                    .font(.title3.bold())
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.green)
                    .cornerRadius(40)
            }
            .buttonStyle(.plain)
        }
        .padding()
    }
}

// MARK: - Active workout screen

struct ActiveWorkoutView: View {
    @EnvironmentObject var workoutManager: WatchWorkoutManager

    private var zone: HeartZone { HeartZone.from(bpm: workoutManager.heartRate) }

    var body: some View {
        VStack(spacing: 8) {
            // Zone badge
            Text(zone.label.uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.black)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(zone.color)
                .cornerRadius(20)

            // BPM
            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(workoutManager.heartRate > 0 ? "\(workoutManager.heartRate)" : "—")
                    .font(.system(size: 52, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                Text("bpm")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            // Elapsed time
            Text(formattedTime(workoutManager.elapsedSeconds))
                .font(.system(size: 18, weight: .semibold, design: .monospaced))
                .foregroundColor(.gray)

            // Stop button
            Button(action: { workoutManager.stopWorkout() }) {
                Text("End")
                    .font(.footnote.bold())
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.red.opacity(0.85))
                    .cornerRadius(40)
            }
            .buttonStyle(.plain)
        }
        .padding()
    }

    private func formattedTime(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%02d:%02d", m, s)
    }
}

// MARK: - Heart zone model

struct HeartZone {
    let zone: Int
    let label: String
    let color: Color

    static func from(bpm: Int, maxHR: Int = 190) -> HeartZone {
        guard bpm > 0 else { return HeartZone(zone: 0, label: "No Signal", color: .gray) }
        let pct = Double(bpm) / Double(maxHR)
        switch pct {
        case ..<0.60: return HeartZone(zone: 1, label: "Recovery",  color: Color(red: 0.37, green: 0.64, blue: 0.98))
        case ..<0.70: return HeartZone(zone: 2, label: "Aerobic",   color: Color(red: 0.20, green: 0.83, blue: 0.60))
        case ..<0.80: return HeartZone(zone: 3, label: "Tempo",     color: Color(red: 0.98, green: 0.75, blue: 0.14))
        case ..<0.90: return HeartZone(zone: 4, label: "Threshold", color: Color(red: 0.98, green: 0.58, blue: 0.05))
        default:      return HeartZone(zone: 5, label: "Max",       color: Color(red: 0.94, green: 0.27, blue: 0.27))
        }
    }
}
