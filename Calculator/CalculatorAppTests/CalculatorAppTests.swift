import XCTest
@testable import Calculator

@MainActor
final class CalculatorAppTests: XCTestCase {
    func testEvaluateRespectsOperatorPrecedence() throws {
        let result = try CalculatorEngine.evaluate("3+2-5*0")
        XCTAssertEqual(result, Decimal(5))
    }

    func testEvaluateSupportsDisplayOperatorsAndDecimals() throws {
        let result = try CalculatorEngine.evaluate("1,000+31.4×2")
        XCTAssertEqual(result, Decimal(string: "1062.8"))
    }

    func testPreviewResultIgnoresTrailingOperator() throws {
        let result = try CalculatorEngine.previewResult(for: "1,031.4 +")
        XCTAssertEqual(result, Decimal(string: "1031.4"))
    }

    func testEvaluateSupportsNegativeOperands() throws {
        let result = try CalculatorEngine.evaluate("5×-2")
        XCTAssertEqual(result, Decimal(-10))
    }

    func testPercentConvertsCurrentOperand() throws {
        let result = try CalculatorEngine.evaluate("100%")
        XCTAssertEqual(result, Decimal(1))
    }

    func testOperandPercentTransformer() throws {
        let result = try CalculatorOperandTransformer.applyPercent(to: "-50")
        XCTAssertEqual(result, "-0.5")
    }

    func testOperandToggleSignTransformer() throws {
        let result = try CalculatorOperandTransformer.toggleSign(for: "5")
        XCTAssertEqual(result, "-5")
    }

    func testDivideByZeroThrowsExpectedError() {
        XCTAssertThrowsError(try CalculatorEngine.evaluate("1÷0")) { error in
            XCTAssertEqual(error as? CalculatorError, .divideByZero)
        }
    }

    func testFormatterAppliesGroupingSeparators() {
        let value = Decimal(string: "1031.4") ?? .zero
        XCTAssertEqual(CalculatorFormatter.string(from: value), "1,031.4")
    }

    func testViewModelShowsRealtimePreviewBeforeEquals() {
        let viewModel = CalculatorViewModel()

        ["1", "0", "0", "0", "+", "3", "1", ".", "4", "+"].forEach(viewModel.handleTap)

        XCTAssertEqual(viewModel.mainDisplayText, "1,000 + 31.4 +")
        XCTAssertEqual(viewModel.previewText, "1,031.4")
    }

    func testViewModelShowsFinalResultAfterEqualsAndAppendsHistory() {
        let viewModel = CalculatorViewModel()

        ["3", "+", "2", "-", "5", "×", "0", "="].forEach(viewModel.handleTap)

        XCTAssertEqual(viewModel.mainDisplayText, "5")
        XCTAssertNil(viewModel.previewText)
        XCTAssertEqual(viewModel.historyItems.map(\.text), ["3 + 2 − 5 × 0 = 5"])
    }

    func testViewModelPercentAndToggleSignOperateOnCurrentOperand() {
        let viewModel = CalculatorViewModel()

        ["5", "0", "+/-", "%"].forEach(viewModel.handleTap)

        XCTAssertEqual(viewModel.mainDisplayText, "-0.5")
        XCTAssertEqual(viewModel.previewText, "-0.5")
    }

    func testViewModelLoadsPersistedHistoryOnConfigure() {
        let persistedItems = [
            CalculatorHistoryItem(id: UUID(), expression: "1 + 1", result: "2", createdAt: .now.addingTimeInterval(-10)),
            CalculatorHistoryItem(id: UUID(), expression: "2 + 2", result: "4", createdAt: .now)
        ]
        let store = InMemoryCalculatorHistoryStore(items: persistedItems)
        let viewModel = CalculatorViewModel()

        viewModel.configure(historyStore: store)

        XCTAssertEqual(viewModel.historyItems, persistedItems)
    }

    func testInMemoryHistoryStoreCapsAtTenItems() throws {
        let store = InMemoryCalculatorHistoryStore()

        for index in 1...12 {
            _ = try store.save(expression: "\(index)", result: "\(index)")
        }

        let items = try store.loadHistory()
        XCTAssertEqual(items.count, 10)
        XCTAssertEqual(items.first?.expression, "3")
        XCTAssertEqual(items.last?.expression, "12")
    }

    func testCurrentInputDisplayLayoutKeepsShortTextOnSingleLine() {
        let layout = CurrentInputDisplayLayout.make(for: "1 + 2", availableWidth: 300)

        XCTAssertEqual(layout.displayText, "1 + 2")
        XCTAssertEqual(layout.mode, .singleLine)
        XCTAssertFalse(layout.showsShowAll)
    }

    func testCurrentInputDisplayLayoutShrinksBeforeWrapping() {
        let layout = CurrentInputDisplayLayout.make(
            for: "1 + 2 + 3 + 4 + 5 + 6",
            availableWidth: 220
        )

        XCTAssertEqual(layout.mode, .singleLine)
        XCTAssertLessThan(layout.fontSize, CurrentInputDisplayLayout.maxFontSize)
        XCTAssertGreaterThanOrEqual(layout.fontSize, CurrentInputDisplayLayout.minFontSize)
        XCTAssertFalse(layout.displayText.contains("..."))
        XCTAssertFalse(layout.showsShowAll)
    }

    func testCurrentInputDisplayLayoutWrapsBeforeTruncating() {
        let layout = CurrentInputDisplayLayout.make(
            for: "1 + 2 + 3 + 4 + 5 + 67 + 8 + 9",
            availableWidth: 240
        )

        XCTAssertEqual(layout.mode, .multiLine)
        XCTAssertEqual(layout.displayText, "1 + 2 + 3 + 4 + 5 + 67 + 8 + 9")
        XCTAssertFalse(layout.showsShowAll)
    }

    func testCurrentInputDisplayLayoutTruncatesLeadingContentAfterThreeLines() {
        let layout = CurrentInputDisplayLayout.make(
            for: "1 + 2 + 3 + 4 + 5 + 67 + 8 + 9 + 10 + 11 + 12 + 13 + 14 + 15",
            availableWidth: 140
        )

        XCTAssertTrue(layout.displayText.hasPrefix("..."))
        XCTAssertEqual(layout.mode, .truncated)
        XCTAssertTrue(layout.showsShowAll)
    }
}
