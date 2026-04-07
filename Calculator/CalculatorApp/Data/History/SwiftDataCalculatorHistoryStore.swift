import Foundation
import SwiftData

@MainActor
struct SwiftDataCalculatorHistoryStore: CalculatorHistoryStore {
    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    func loadHistory() throws -> [CalculatorHistoryItem] {
        let descriptor = FetchDescriptor<StoredCalculationHistoryItem>(
            sortBy: [SortDescriptor(\.createdAt, order: .forward)]
        )

        return try modelContext.fetch(descriptor).map(Self.makeHistoryItem)
    }

    func save(expression: String, result: String) throws -> [CalculatorHistoryItem] {
        let item = StoredCalculationHistoryItem(expression: expression, result: result)
        modelContext.insert(item)

        let descriptor = FetchDescriptor<StoredCalculationHistoryItem>(
            sortBy: [SortDescriptor(\.createdAt, order: .forward)]
        )
        let items = try modelContext.fetch(descriptor)

        if items.count > 10 {
            for staleItem in items.prefix(items.count - 10) {
                modelContext.delete(staleItem)
            }
        }

        try modelContext.save()
        return try loadHistory()
    }

    private static func makeHistoryItem(from storedItem: StoredCalculationHistoryItem) -> CalculatorHistoryItem {
        CalculatorHistoryItem(
            id: storedItem.id,
            expression: storedItem.expression,
            result: storedItem.result,
            createdAt: storedItem.createdAt
        )
    }
}
