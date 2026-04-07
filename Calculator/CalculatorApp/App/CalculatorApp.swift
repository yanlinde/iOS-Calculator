import SwiftUI
import SwiftData

@main
struct CalculatorApp: App {
    private let sharedModelContainer: ModelContainer

    init() {
        do {
            let configuration = ModelConfiguration(
                isStoredInMemoryOnly: ProcessInfo.processInfo.arguments.contains("-ui-testing-use-in-memory-history")
            )
            sharedModelContainer = try ModelContainer(
                for: StoredCalculationHistoryItem.self,
                configurations: configuration
            )
        } catch {
            fatalError("Failed to create model container: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            CalculatorScreen()
        }
        .modelContainer(sharedModelContainer)
    }
}
