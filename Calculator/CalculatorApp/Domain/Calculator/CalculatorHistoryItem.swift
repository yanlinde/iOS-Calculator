import Foundation

struct CalculatorHistoryItem: Identifiable, Equatable {
    let id: UUID
    let expression: String
    let result: String
    let createdAt: Date

    var text: String {
        "\(expression) = \(result)"
    }
}
