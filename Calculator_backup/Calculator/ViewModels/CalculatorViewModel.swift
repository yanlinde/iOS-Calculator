import Foundation
import Combine

/// 计算器视图模型
final class CalculatorViewModel: ObservableObject {

    // MARK: - Published Properties

    /// 当前显示值（第2行大字）
    @Published var displayValue: String = "0"

    /// 当前表达式（用于显示和历史记录）
    @Published var currentExpression: String = ""

    /// 当前结果（第1行小字）
    @Published var currentResult: String = ""

    /// 计算历史记录
    @Published var history: [HistoryRecord] = []

    // MARK: - Private Properties

    /// 当前输入的数字字符串
    private var currentInput: String = ""

    /// 运算栈：存储数字和运算符
    private var operationStack: [OperationItem] = []

    /// 上一个输入的运算符
    private var lastOperator: CalculatorOperator?

    /// 当前选中的运算符（用于UI高亮显示）
    var selectedOperator: CalculatorOperator? {
        return lastOperator
    }

    /// 是否刚刚按了等号
    private var justCalculated: Bool = false

    /// 是否显示错误
    private var hasError: Bool = false

    /// 历史记录存储Key
    private let historyKey = "calculator_history"

    /// 操作项枚举：数字或运算符
    private enum OperationItem {
        case number(Double)
        case `operator`(CalculatorOperator)

        var numberValue: Double? {
            if case .number(let value) = self {
                return value
            }
            return nil
        }

        var operatorValue: CalculatorOperator? {
            if case .operator(let op) = self {
                return op
            }
            return nil
        }
    }

    // MARK: - Initialization

    init() {
        loadHistory()
    }

    // MARK: - Input Methods

    /// 输入数字
    func inputNumber(_ number: String) {
        guard !hasError else { return }

        if justCalculated {
            // 刚计算完，开始新计算
            clear()
        }

        // 限制输入长度（最多12位数字）
        let digitsOnly = currentInput.filter { $0.isNumber }
        if digitsOnly.count >= 12 && !currentInput.contains(".") {
            return
        }

        if currentInput == "0" {
            currentInput = number
        } else if currentInput == "-" {
            currentInput = "-" + number
        } else {
            currentInput += number
        }

        updateDisplay()
        calculateRealtimeResult()
    }

    /// 输入小数点
    func inputDecimal() {
        guard !hasError else { return }

        if justCalculated {
            clear()
            currentInput = "0."
            updateDisplay()
            return
        }

        // 每个数字只能有一个小数点
        if !currentInput.contains(".") {
            if currentInput.isEmpty {
                currentInput = "0."
            } else {
                currentInput += "."
            }
            updateDisplay()
        }
    }

    /// 输入运算符
    func inputOperator(_ op: CalculatorOperator) {
        guard !hasError else {
            clear()
            return
        }

        // 如果有当前输入，先保存到栈
        if !currentInput.isEmpty {
            if let number = Double(currentInput) {
                operationStack.append(.number(number))
            }
            currentInput = ""
        }

        // 如果栈顶是运算符，替换它
        if let last = operationStack.last, last.operatorValue != nil {
            operationStack.removeLast()
        }

        operationStack.append(.operator(op))
        lastOperator = op
        justCalculated = false

        updateDisplay()
        calculateRealtimeResult()
    }

    /// 计算结果（按等号）
    func calculate() {
        // 如果之前有错误（如实时计算中检测到除零），显示错误并返回
        if hasError {
            displayValue = "不能这样计算"
            currentResult = ""
            operationStack = []
            lastOperator = nil
            justCalculated = true
            return
        }

        // 如果刚刚计算完，保持结果不变（连续按等号）
        if justCalculated {
            return
        }

        // 如果有当前输入，保存到栈
        if !currentInput.isEmpty {
            if let number = Double(currentInput) {
                operationStack.append(.number(number))
            }
            currentInput = ""
        }

        // 执行计算
        let result = evaluateExpression()

        // 更新显示
        if hasError {
            displayValue = "不能这样计算"
            currentResult = ""
            // 重置状态，但保持 hasError = true
            operationStack = []
            lastOperator = nil
            justCalculated = true
            return
        }

        // 保存到历史记录
        let expression = buildExpressionString()
        let formattedResult = formatNumber(result)
        addToHistory(expression: expression, result: formattedResult)

        displayValue = formatNumber(result)
        currentResult = ""

        // 重置状态
        operationStack = []
        lastOperator = nil
        justCalculated = true
    }

    /// 切换正负号
    func toggleSign() {
        guard !hasError else { return }

        if justCalculated {
            // 对当前结果显示值切换正负
            if let value = Double(displayValue.replacingOccurrences(of: ",", with: "")) {
                let newValue = -value
                displayValue = formatNumber(newValue)
                currentInput = String(newValue)
                justCalculated = false
            }
            return
        }

        if currentInput.isEmpty || currentInput == "0" {
            // 没有输入时，创建负数输入
            currentInput = "-"
            updateDisplay()
            return
        }

        if currentInput.hasPrefix("-") {
            currentInput.removeFirst()
        } else {
            currentInput = "-" + currentInput
        }

        updateDisplay()
        calculateRealtimeResult()
    }

    /// 输入百分比
    func inputPercentage() {
        guard !hasError else { return }

        let value: Double
        if justCalculated {
            value = Double(displayValue) ?? 0
            justCalculated = false
        } else if !currentInput.isEmpty {
            value = Double(currentInput) ?? 0
        } else {
            return
        }

        // 数学逻辑：x% = x / 100
        let result = value / 100
        currentInput = String(result)
        updateDisplay()
        calculateRealtimeResult()
    }

    /// 退格删除（删除最后一个字符）
    func deleteLast() {
        backspace()
    }

    /// 退格删除
    func backspace() {
        guard !hasError else {
            clear()
            return
        }

        if justCalculated {
            clear()
            return
        }

        if !currentInput.isEmpty {
            currentInput.removeLast()
            if currentInput.isEmpty || currentInput == "-" {
                currentInput = ""
                displayValue = "0"
            } else {
                updateDisplay()
            }
            calculateRealtimeResult()
        }
    }

    /// 全部清除
    func clear() {
        currentInput = ""
        operationStack = []
        lastOperator = nil
        displayValue = "0"
        currentExpression = ""
        currentResult = ""
        hasError = false
        justCalculated = false
    }

    // MARK: - Private Methods

    /// 更新显示
    private func updateDisplay() {
        if !currentInput.isEmpty {
            displayValue = formatInput(currentInput)
        } else if let lastNumber = operationStack.last?.numberValue {
            displayValue = formatNumber(lastNumber)
        } else {
            displayValue = "0"
        }

        // 构建表达式字符串
        currentExpression = buildExpressionString()
    }

    /// 构建表达式字符串用于显示
    private func buildExpressionString() -> String {
        var parts: [String] = []

        for item in operationStack {
            switch item {
            case .number(let value):
                parts.append(formatNumber(value))
            case .operator(let op):
                parts.append(op.rawValue)
            }
        }

        if !currentInput.isEmpty {
            parts.append(formatInput(currentInput))
        }

        return parts.joined(separator: " ")
    }

    /// 实时计算结果（第1行显示）
    private func calculateRealtimeResult() {
        guard !operationStack.isEmpty else {
            currentResult = ""
            return
        }

        // 创建临时栈用于计算
        var tempStack = operationStack

        // 如果有当前输入，加入临时栈
        if !currentInput.isEmpty, let number = Double(currentInput) {
            tempStack.append(.number(number))
        }

        // 需要至少一个运算符和两个数字才能计算
        let operators = tempStack.filter { $0.operatorValue != nil }
        let numbers = tempStack.filter { $0.numberValue != nil }

        guard operators.count >= 1 && numbers.count >= 2 else {
            currentResult = ""
            return
        }

        let result = evaluateStack(tempStack)

        if !hasError {
            currentResult = formatNumber(result)
        }
    }

    /// 计算表达式结果
    private func evaluateExpression() -> Double {
        return evaluateStack(operationStack)
    }

    /// 计算栈的结果（支持数学优先级）
    private func evaluateStack(_ stack: [OperationItem]) -> Double {
        guard !stack.isEmpty else { return 0 }

        // 先处理乘除（优先级2）
        var tempStack = stack
        var i = 0
        while i < tempStack.count {
            if let op = tempStack[i].operatorValue, op.priority == 2 {
                // 找到乘除运算符，计算它
                guard i > 0, i + 1 < tempStack.count,
                      let left = tempStack[i - 1].numberValue,
                      let right = tempStack[i + 1].numberValue else {
                    i += 1
                    continue
                }

                let result: Double
                switch op {
                case .multiply:
                    result = left * right
                case .divide:
                    if right == 0 {
                        hasError = true
                        return 0
                    }
                    result = left / right
                default:
                    i += 1
                    continue
                }

                // 替换为计算结果
                tempStack[i - 1] = .number(result)
                tempStack.removeSubrange(i...i + 1)
                // 不增加i，继续检查当前位置
            } else {
                i += 1
            }
        }

        // 再处理加减（优先级1）
        i = 0
        while i < tempStack.count {
            if let op = tempStack[i].operatorValue, op.priority == 1 {
                // 找到加减运算符，计算它
                guard i > 0, i + 1 < tempStack.count,
                      let left = tempStack[i - 1].numberValue,
                      let right = tempStack[i + 1].numberValue else {
                    i += 1
                    continue
                }

                let result: Double
                switch op {
                case .add:
                    result = left + right
                case .subtract:
                    result = left - right
                default:
                    i += 1
                    continue
                }

                // 替换为计算结果
                tempStack[i - 1] = .number(result)
                tempStack.removeSubrange(i...i + 1)
            } else {
                i += 1
            }
        }

        // 返回最终结果
        return tempStack.first?.numberValue ?? 0
    }

    /// 格式化数字显示
    private func formatNumber(_ number: Double) -> String {
        // 检查是否为极大数或极小数，使用科学计数法
        if abs(number) >= 1e12 || (abs(number) < 1e-10 && number != 0) {
            return String(format: "%.6e", number)
        }

        // 检查是否为整数
        if number == floor(number) && !number.isInfinite && !number.isNaN {
            return formatInteger(Int64(number))
        }

        // 格式化小数，最多10位小数
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 10
        formatter.minimumFractionDigits = 0
        formatter.usesGroupingSeparator = true

        return formatter.string(from: NSNumber(value: number)) ?? "0"
    }

    /// 格式化整数，添加千分位
    private func formatInteger(_ number: Int64) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.usesGroupingSeparator = true
        return formatter.string(from: NSNumber(value: number)) ?? "0"
    }

    /// 格式化输入字符串
    private func formatInput(_ input: String) -> String {
        // 处理负数
        var isNegative = false
        var cleanInput = input
        if cleanInput.hasPrefix("-") {
            isNegative = true
            cleanInput.removeFirst()
        }

        // 如果只有负号，直接返回
        if cleanInput.isEmpty {
            return input
        }

        // 分割整数和小数部分
        let parts = cleanInput.split(separator: ".", maxSplits: 1)
        let integerPart = String(parts[0])
        let decimalPart = parts.count > 1 ? String(parts[1]) : nil

        // 格式化整数部分
        guard let number = Int64(integerPart) else {
            return input
        }

        var result = formatInteger(number)
        if isNegative {
            result = "-" + result
        }

        // 保留小数部分
        if let decimal = decimalPart {
            result += "." + decimal
        } else if cleanInput.hasSuffix(".") {
            result += "."
        }

        return result
    }

    // MARK: - History Management

    /// 添加到历史记录
    private func addToHistory(expression: String, result: String) {
        let record = HistoryRecord(expression: expression, result: result)
        history.insert(record, at: 0)

        // 最多保留20条
        if history.count > 20 {
            history = Array(history.prefix(20))
        }

        saveHistory()
    }

    /// 保存历史记录
    private func saveHistory() {
        if let encoded = try? JSONEncoder().encode(history) {
            UserDefaults.standard.set(encoded, forKey: historyKey)
        }
    }

    /// 加载历史记录
    private func loadHistory() {
        guard let data = UserDefaults.standard.data(forKey: historyKey),
              let decoded = try? JSONDecoder().decode([HistoryRecord].self, from: data) else {
            return
        }
        history = decoded
    }
}
