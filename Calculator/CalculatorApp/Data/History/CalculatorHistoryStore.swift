import Foundation

@MainActor
protocol CalculatorHistoryStore {
    func loadHistory() throws -> [CalculatorHistoryItem]
    func save(expression: String, result: String) throws -> [CalculatorHistoryItem]
}
