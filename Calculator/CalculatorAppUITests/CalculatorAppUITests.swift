import XCTest

final class CalculatorAppUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("-ui-testing-use-in-memory-history")
        app.launch()
    }

    func testPreviewTransitionsToFinalResultAfterEquals() {
        tapSequence(["1", "0", "0", "0", "plus", "3", "1", "decimal", "4", "plus"])

        XCTAssertEqual(app.staticTexts["calculator.mainDisplay"].label, "1,000 + 31.4 +")
        XCTAssertEqual(app.staticTexts["calculator.preview"].label, "1,031.4")

        tapSequence(["2", "equals"])

        XCTAssertEqual(app.staticTexts["calculator.mainDisplay"].label, "1,033.4")
        XCTAssertFalse(app.staticTexts["calculator.preview"].exists)
    }

    func testHistoryKeepsNewestItemAtBottom() {
        tapSequence(["1", "plus", "1", "equals"])
        tapSequence(["2", "plus", "2", "equals"])

        XCTAssertEqual(app.staticTexts["calculator.history.item.0"].label, "1 + 1 = 2")
        XCTAssertEqual(app.staticTexts["calculator.history.item.1"].label, "2 + 2 = 4")
    }

    private func tapSequence(_ identifiers: [String]) {
        for identifier in identifiers {
            app.buttons["calculator.button.\(identifier)"].tap()
        }
    }
}
