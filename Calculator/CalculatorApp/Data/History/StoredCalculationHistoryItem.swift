import Foundation
import SwiftData

@Model
final class StoredCalculationHistoryItem {
    var id: UUID
    var expression: String
    var result: String
    var createdAt: Date

    init(id: UUID = UUID(), expression: String, result: String, createdAt: Date = .now) {
        self.id = id
        self.expression = expression
        self.result = result
        self.createdAt = createdAt
    }
}
