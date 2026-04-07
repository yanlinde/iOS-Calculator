import XCTest
@testable import Calculator

final class CalculatorViewModelTests: XCTestCase {
    var viewModel: CalculatorViewModel!

    override func setUp() {
        super.setUp()
        viewModel = CalculatorViewModel()
    }

    override func tearDown() {
        viewModel = nil
        super.tearDown()
    }

    func testAddition() {
        viewModel.inputNumber("1")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("2")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "3")
    }

    func testSubtraction() {
        viewModel.inputNumber("5")
        viewModel.inputOperator(.subtract)
        viewModel.inputNumber("3")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "2")
    }

    func testMultiplication() {
        viewModel.inputNumber("4")
        viewModel.inputOperator(.multiply)
        viewModel.inputNumber("5")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "20")
    }

    func testDivision() {
        viewModel.inputNumber("10")
        viewModel.inputOperator(.divide)
        viewModel.inputNumber("2")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "5")
    }

    func testDecimalAddition() {
        viewModel.inputNumber("1")
        viewModel.inputDecimal()
        viewModel.inputNumber("5")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("2")
        viewModel.inputDecimal()
        viewModel.inputNumber("5")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "4")
    }

    func testDecimalDivision() {
        viewModel.inputNumber("5")
        viewModel.inputDecimal()
        viewModel.inputNumber("5")
        viewModel.inputOperator(.divide)
        viewModel.inputNumber("2")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "2.75")
    }

    func testNegativeResult() {
        viewModel.toggleSign()
        viewModel.inputNumber("5")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("3")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "-2")
    }

    func testToggleSignAndCalculate() {
        viewModel.inputNumber("10")
        viewModel.toggleSign()
        viewModel.inputOperator(.multiply)
        viewModel.inputNumber("5")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "-50")
    }

    func testContinuousAddition() {
        viewModel.inputNumber("1")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("2")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("3")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "6")
    }

    func testMixedOperations() {
        viewModel.inputNumber("10")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("5")
        viewModel.inputOperator(.multiply)
        viewModel.inputNumber("2")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "20")
    }

    func testPercentageMathLogic() {
        viewModel.inputNumber("100")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("10")
        viewModel.inputPercentage()
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "100.1")
    }

    func testPercentageMultiplication() {
        viewModel.inputNumber("100")
        viewModel.inputOperator(.multiply)
        viewModel.inputNumber("10")
        viewModel.inputPercentage()
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "10")
    }

    func testDivisionByZero() {
        viewModel.inputNumber("5")
        viewModel.inputOperator(.divide)
        viewModel.inputNumber("0")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "不能这样计算")
    }

    func testDivisionByZeroThenContinue() {
        viewModel.inputNumber("5")
        viewModel.inputOperator(.divide)
        viewModel.inputNumber("0")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "不能这样计算")
        viewModel.clear()
        viewModel.inputNumber("10")
        viewModel.inputOperator(.divide)
        viewModel.inputNumber("2")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "5")
    }

    func testRealtimeResult() {
        viewModel.inputNumber("1")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("1")
        XCTAssertEqual(viewModel.currentResult, "2")
        XCTAssertEqual(viewModel.currentExpression, "1 + 1")
    }

    func testAfterEquals() {
        viewModel.inputNumber("1")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("1")
        viewModel.calculate()
        XCTAssertEqual(viewModel.currentResult, "")
        XCTAssertEqual(viewModel.displayValue, "2")
    }

    func testThousandsSeparator() {
        viewModel.inputNumber("1000")
        viewModel.inputOperator(.multiply)
        viewModel.inputNumber("1000")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "1,000,000")
    }

    func testClearAll() {
        viewModel.inputNumber("123")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("456")
        viewModel.clear()
        XCTAssertEqual(viewModel.displayValue, "0")
        XCTAssertEqual(viewModel.currentExpression, "")
        XCTAssertEqual(viewModel.currentResult, "")
    }

    func testBackspace() {
        viewModel.inputNumber("123")
        viewModel.backspace()
        XCTAssertEqual(viewModel.displayValue, "12")
        viewModel.backspace()
        XCTAssertEqual(viewModel.displayValue, "1")
        viewModel.backspace()
        XCTAssertEqual(viewModel.displayValue, "0")
    }

    func testVeryLargeNumber() {
        viewModel.inputNumber("9999999999999")
        viewModel.inputOperator(.multiply)
        viewModel.inputNumber("10")
        viewModel.calculate()
        XCTAssertTrue(viewModel.displayValue.contains("e"))
    }

    func testDecimalLimit() {
        viewModel.inputNumber("1")
        viewModel.inputOperator(.divide)
        viewModel.inputNumber("3")
        viewModel.calculate()
        let decimalPart = viewModel.displayValue.split(separator: ".").last ?? ""
        XCTAssertLessThanOrEqual(decimalPart.count, 10)
    }

    func testRepeatedEquals() {
        viewModel.inputNumber("5")
        viewModel.inputOperator(.add)
        viewModel.inputNumber("3")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "8")
        viewModel.calculate()
        XCTAssertEqual(viewModel.displayValue, "8")
    }

    func testMultipleDecimals() {
        viewModel.inputNumber("1")
        viewModel.inputDecimal()
        viewModel.inputNumber("5")
        viewModel.inputDecimal()
        viewModel.inputNumber("2")
        XCTAssertEqual(viewModel.displayValue, "1.52")
    }
}
