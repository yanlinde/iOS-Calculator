import Foundation

/// 计算器运算符枚举
enum CalculatorOperator: String, CaseIterable {
    case add = "+"
    case subtract = "−"
    case multiply = "×"
    case divide = "÷"
    case equal = "="

    /// 优先级：乘除 > 加减
    var priority: Int {
        switch self {
        case .multiply, .divide:
            return 2
        case .add, .subtract:
            return 1
        case .equal:
            return 0
        }
    }
}

/// 历史记录模型
struct HistoryRecord: Codable, Identifiable {
    let id: UUID
    let expression: String
    let result: String
    let timestamp: Date

    init(expression: String, result: String) {
        self.id = UUID()
        self.expression = expression
        self.result = result
        self.timestamp = Date()
    }

    /// 显示文本：表达式 = 结果
    var displayText: String {
        return "\(expression) = \(result)"
    }
}
