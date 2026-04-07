import Foundation

@MainActor
final class InMemoryCalculatorHistoryStore: CalculatorHistoryStore {
    private var items: [CalculatorHistoryItem]

    init(items: [CalculatorHistoryItem] = []) {
        self.items = items.sorted { $0.createdAt < $1.createdAt }
    }

    func loadHistory() throws -> [CalculatorHistoryItem] {
        items
    }

    func save(expression: String, result: String) throws -> [CalculatorHistoryItem] {
        items.append(
            CalculatorHistoryItem(
                id: UUID(),
                expression: expression,
                result: result,
                createdAt: .now
            )
        )

        if items.count > 10 {
            items.removeFirst(items.count - 10)
        }

        return items
    }
}
