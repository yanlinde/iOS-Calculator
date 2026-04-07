import Foundation

enum CalculatorToken: Equatable {
    case number(Decimal)
    case `operator`(CalculatorOperator)
}
