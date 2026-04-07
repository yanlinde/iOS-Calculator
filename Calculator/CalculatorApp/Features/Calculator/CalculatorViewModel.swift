import Combine
import Foundation
import UIKit

@MainActor
final class CalculatorViewModel: ObservableObject {
    @Published private(set) var historyItems: [CalculatorHistoryItem] = []
    @Published private(set) var previewText: String?
    @Published private(set) var mainDisplayText = "0"
    @Published var showInputLimitWarning = false
    @Published private(set) var selectedOperator: String? = nil

    var isShowingCurrentInput: Bool {
        !isShowingFinalResult && !isInErrorState
    }

    var isInitialState: Bool {
        elements.isEmpty && !isShowingFinalResult && !isInErrorState
    }

    /// 计算输入显示布局：优先单行缩放，必要时换行
    var displayLayout: CurrentInputDisplayLayout {
        let availableWidth = UIScreen.main.bounds.width - 48 // 减去左右padding

        // 1. 尝试48pt单行显示
        if fitsSingleLine(mainDisplayText, fontSize: 48, width: availableWidth) {
            return CurrentInputDisplayLayout(mode: .singleLine(fontSize: 48))
        }

        // 2. 计算需要的字号
        let requiredFontSize = calculateRequiredFontSize(
            for: mainDisplayText,
            maxFontSize: 48,
            width: availableWidth
        )

        // 3. 如果所需字号 >= 24pt，使用单行缩放显示
        if requiredFontSize >= 24 {
            return CurrentInputDisplayLayout(mode: .singleLine(fontSize: requiredFontSize))
        }

        // 4. 否则使用24pt多行显示
        return CurrentInputDisplayLayout(mode: .multiLine)
    }

    private func fitsSingleLine(_ text: String, fontSize: CGFloat, width: CGFloat) -> Bool {
        let font = UIFont.systemFont(ofSize: fontSize, weight: .semibold)
        let size = (text as NSString).size(withAttributes: [.font: font])
        // 减去8pt安全边距，避免计算误差导致省略号
        return size.width <= (width - 8)
    }

    private func calculateRequiredFontSize(for text: String, maxFontSize: CGFloat, width: CGFloat) -> CGFloat {
        // 二分查找合适的字号
        var low: CGFloat = 1
        var high: CGFloat = maxFontSize
        var bestSize: CGFloat = 1

        while low <= high {
            let mid = (low + high) / 2
            if fitsSingleLine(text, fontSize: mid, width: width) {
                bestSize = mid
                low = mid + 0.5
            } else {
                high = mid - 0.5
            }
        }

        return bestSize
    }

    private var elements: [String] = []
    private var isShowingFinalResult = false
    private var finalResultRaw: String?
    private var isInErrorState = false
    private var historyStore: CalculatorHistoryStore?
    private var hasLoadedHistory = false
    private let maxInputLength = 400

    func configure(historyStore: CalculatorHistoryStore) {
        self.historyStore = historyStore

        guard !hasLoadedHistory else {
            return
        }

        do {
            historyItems = try historyStore.loadHistory()
        } catch {
            historyItems = []
        }

        hasLoadedHistory = true
    }

    func handleTap(_ title: String) {
        switch title {
        case "0"..."9":
            selectedOperator = nil
            appendDigit(title)
        case ".":
            selectedOperator = nil
            appendDecimalPoint()
        case "+", "-", "−", "*", "×", "/", "÷":
            appendOperator(title)
        case "=":
            selectedOperator = nil
            finalizeExpression()
        case "C":
            selectedOperator = nil
            clear()
        case "⌫":
            selectedOperator = nil
            deleteBackward()
        case "%":
            selectedOperator = nil
            applyPercent()
        case "+/-":
            selectedOperator = nil
            toggleSign()
        default:
            break
        }
    }

    func clear() {
        elements = []
        finalResultRaw = nil
        isShowingFinalResult = false
        isInErrorState = false
        syncDisplayState()
    }

    private func appendDigit(_ digit: String) {
        resetForFreshInputIfNeeded()

        // 检查输入长度限制
        let currentExpression = formatExpression(elements)
        if currentExpression.count >= maxInputLength {
            showInputLimitWarning = true
            return
        }

        if elements.isEmpty || lastElementIsOperator {
            elements.append(digit)
        } else {
            let current = elements.removeLast()
            // 默认状态的0被覆盖
            if current == "0" {
                elements.append(digit)
            } else if current == "-0" {
                elements.append("-" + digit)
            } else {
                elements.append(current + digit)
            }
        }

        syncDisplayState()
    }

    private func appendDecimalPoint() {
        resetForFreshInputIfNeeded()

        if elements.isEmpty || lastElementIsOperator {
            elements.append("0.")
            syncDisplayState()
            return
        }

        let current = elements.removeLast()
        guard !current.contains(".") else {
            elements.append(current)
            return
        }

        if current == "-" {
            elements.append("-0.")
        } else {
            elements.append(current + ".")
        }

        syncDisplayState()
    }

    private func appendOperator(_ displayedOperator: String) {
        guard !isInErrorState else {
            return
        }

        let rawOperator = rawOperator(from: displayedOperator)

        if isShowingFinalResult, let finalResultRaw {
            elements = [finalResultRaw]
            isShowingFinalResult = false
        }

        // 默认状态下（elements为空），预设0作为操作数
        if elements.isEmpty {
            elements.append("0")
        }

        if lastElementIsOperator {
            elements[elements.count - 1] = rawOperator
        } else {
            elements.append(rawOperator)
        }

        // 设置选中的运算符（使用显示用的符号）
        selectedOperator = displayedOperator

        syncDisplayState()
    }

    private func finalizeExpression() {
        guard !isInErrorState else {
            return
        }

        // 连续按等号不生成新的历史记录
        guard !isShowingFinalResult else {
            return
        }

        let rawExpression = trimmedExpression
        guard !rawExpression.isEmpty else {
            return
        }

        do {
            let result = try CalculatorEngine.evaluate(rawExpression)
            let resultRaw = CalculatorFormatter.plainString(from: result)
            let resultDisplay = CalculatorFormatter.string(from: result)
            let expressionDisplay = formatExpression(trimmedElements)

            finalResultRaw = resultRaw
            elements = [resultRaw]
            isShowingFinalResult = true
            previewText = nil
            mainDisplayText = resultDisplay

            if let historyStore {
                do {
                    historyItems = try historyStore.save(expression: expressionDisplay, result: resultDisplay)
                } catch {
                    appendHistoryFallback(expression: expressionDisplay, result: resultDisplay)
                }
            } else {
                appendHistoryFallback(expression: expressionDisplay, result: resultDisplay)
            }
        } catch {
            enterErrorState()
        }
    }

    private func deleteBackward() {
        if isShowingFinalResult || isInErrorState {
            clear()
            return
        }

        guard !elements.isEmpty else {
            return
        }

        if lastElementIsOperator {
            elements.removeLast()
        } else {
            var operand = elements.removeLast()
            operand.removeLast()

            if operand == "-" || operand.isEmpty {
                // 删除后为空，恢复默认0
            } else {
                elements.append(operand)
            }
        }

        syncDisplayState()
    }

    private func applyPercent() {
        guard !isInErrorState else {
            return
        }

        if isShowingFinalResult, let finalResultRaw {
            elements = [finalResultRaw]
            isShowingFinalResult = false
        }

        guard let operand = currentOperand else {
            return
        }

        do {
            elements[elements.count - 1] = try CalculatorOperandTransformer.applyPercent(to: operand)
            syncDisplayState()
        } catch {
            enterErrorState()
        }
    }

    private func toggleSign() {
        if isInErrorState {
            return
        }

        if isShowingFinalResult, let finalResultRaw {
            elements = [finalResultRaw]
            isShowingFinalResult = false
        }

        guard let operand = currentOperand else {
            if elements.isEmpty {
                elements = ["-0"]
                syncDisplayState()
            }
            return
        }

        do {
            elements[elements.count - 1] = try CalculatorOperandTransformer.toggleSign(for: operand)
            syncDisplayState()
        } catch {
            enterErrorState()
        }
    }

    private func syncDisplayState() {
        if isInErrorState {
            previewText = nil
            mainDisplayText = "Error"
            return
        }

        if isShowingFinalResult, let finalResultRaw, let result = Decimal(string: finalResultRaw, locale: Locale(identifier: "en_US_POSIX")) {
            previewText = nil
            mainDisplayText = CalculatorFormatter.string(from: result)
            return
        }

        if elements.isEmpty {
            previewText = nil
            mainDisplayText = "0"
            return
        }

        mainDisplayText = formatExpression(elements)

        do {
            if let preview = try CalculatorEngine.previewResult(for: rawExpression) {
                previewText = CalculatorFormatter.string(from: preview)
            } else {
                previewText = nil
            }
        } catch CalculatorError.divideByZero {
            previewText = "Error"
        } catch {
            previewText = nil
        }
    }

    private func formatExpression(_ elements: [String]) -> String {
        guard !elements.isEmpty else {
            return "0"
        }

        return elements
            .map { element in
                if isOperator(element) {
                    return displayOperator(from: element)
                }

                return formatOperandForDisplay(element)
            }
            .joined(separator: " ")
    }

    private func formatOperandForDisplay(_ operand: String) -> String {
        let trailingDot = operand.hasSuffix(".")

        guard let decimal = Decimal(string: normalizedOperandForParsing(operand), locale: Locale(identifier: "en_US_POSIX")) else {
            return operand
        }

        let formatted = CalculatorFormatter.string(from: decimal)
        return trailingDot ? formatted + "." : formatted
    }

    private func normalizedOperandForParsing(_ operand: String) -> String {
        if operand.hasPrefix("-.") {
            return operand.replacingOccurrences(of: "-.", with: "-0.", options: .anchored)
        }

        if operand.hasPrefix(".") {
            return "0" + operand
        }

        return operand
    }

    private func enterErrorState() {
        isInErrorState = true
        isShowingFinalResult = false
        finalResultRaw = nil
        previewText = nil
        mainDisplayText = "Error"
    }

    private func resetForFreshInputIfNeeded() {
        if isInErrorState {
            clear()
            return
        }

        if isShowingFinalResult {
            clear()
        }
    }

    private func rawOperator(from displayedOperator: String) -> String {
        switch displayedOperator {
        case "−":
            return "-"
        case "×":
            return "*"
        case "÷":
            return "/"
        default:
            return displayedOperator
        }
    }

    private func displayOperator(from rawOperator: String) -> String {
        switch rawOperator {
        case "-":
            return "−"
        case "*":
            return "×"
        case "/":
            return "÷"
        default:
            return rawOperator
        }
    }

    private func isOperator(_ element: String) -> Bool {
        ["+", "-", "*", "/"].contains(element)
    }

    private var lastElementIsOperator: Bool {
        guard let last = elements.last else {
            return false
        }

        return isOperator(last)
    }

    private var currentOperand: String? {
        guard let last = elements.last, !isOperator(last) else {
            return nil
        }

        return last
    }

    private var rawExpression: String {
        elements.joined()
    }

    private var trimmedElements: [String] {
        var copy = elements
        while let last = copy.last, isOperator(last) {
            copy.removeLast()
        }
        return copy
    }

    private var trimmedExpression: String {
        trimmedElements.joined()
    }

    private func appendHistoryFallback(expression: String, result: String) {
        historyItems.append(
            CalculatorHistoryItem(
                id: UUID(),
                expression: expression,
                result: result,
                createdAt: .now
            )
        )

        if historyItems.count > 10 {
            historyItems.removeFirst(historyItems.count - 10)
        }
    }
}

// MARK: - Display Layout

struct CurrentInputDisplayLayout: Equatable {
    enum Mode: Equatable {
        case singleLine(fontSize: CGFloat)
        case multiLine
    }

    static let minFontSize: CGFloat = 24
    static let maxFontSize: CGFloat = 48

    let mode: Mode
    let fontSize: CGFloat

    init(mode: Mode) {
        self.mode = mode
        switch mode {
        case .singleLine(let size):
            self.fontSize = size
        case .multiLine:
            self.fontSize = CurrentInputDisplayLayout.minFontSize
        }
    }
}
