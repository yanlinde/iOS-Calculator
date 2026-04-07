import Foundation

enum CalculatorEngine {
    static func evaluate(_ expression: String) throws -> Decimal {
        let tokens = try tokenize(expression)
        let postfix = try makePostfix(from: tokens)
        return try evaluate(postfix: postfix)
    }

    static func previewResult(for expression: String) throws -> Decimal? {
        let trimmed = trimTrailingOperators(from: expression)
        guard !trimmed.isEmpty else {
            return nil
        }

        return try evaluate(trimmed)
    }

    static func tokenize(_ expression: String) throws -> [CalculatorToken] {
        let normalized = normalize(expression)
        guard !normalized.isEmpty else {
            throw CalculatorError.invalidExpression
        }

        let characters = Array(normalized)
        var index = 0
        var tokens: [CalculatorToken] = []
        var expectsOperand = true

        while index < characters.count {
            let character = characters[index]

            if expectsOperand {
                if character == "-" || character.isNumber || character == "." {
                    let (number, nextIndex) = try parseNumber(from: characters, start: index)
                    tokens.append(.number(number))
                    index = nextIndex
                    expectsOperand = false
                    continue
                }

                throw CalculatorError.invalidExpression
            }

            guard let op = operatorToken(for: character) else {
                throw CalculatorError.invalidExpression
            }

            tokens.append(.operator(op))
            index += 1
            expectsOperand = true
        }

        guard !expectsOperand else {
            throw CalculatorError.invalidExpression
        }

        return tokens
    }

    private static func makePostfix(from tokens: [CalculatorToken]) throws -> [CalculatorToken] {
        var output: [CalculatorToken] = []
        var operators: [CalculatorOperator] = []

        for token in tokens {
            switch token {
            case .number:
                output.append(token)
            case .operator(let current):
                while let top = operators.last, top.precedence >= current.precedence {
                    output.append(.operator(top))
                    operators.removeLast()
                }
                operators.append(current)
            }
        }

        while let remaining = operators.popLast() {
            output.append(.operator(remaining))
        }

        return output
    }

    private static func evaluate(postfix tokens: [CalculatorToken]) throws -> Decimal {
        var stack: [Decimal] = []

        for token in tokens {
            switch token {
            case .number(let value):
                stack.append(value)
            case .operator(let op):
                guard stack.count >= 2 else {
                    throw CalculatorError.invalidExpression
                }

                let rhs = stack.removeLast()
                let lhs = stack.removeLast()
                stack.append(try apply(op, lhs: lhs, rhs: rhs))
            }
        }

        guard stack.count == 1, let result = stack.first else {
            throw CalculatorError.invalidExpression
        }

        return result
    }

    private static func apply(_ op: CalculatorOperator, lhs: Decimal, rhs: Decimal) throws -> Decimal {
        switch op {
        case .add:
            return lhs + rhs
        case .subtract:
            return lhs - rhs
        case .multiply:
            return lhs * rhs
        case .divide:
            guard rhs != 0 else {
                throw CalculatorError.divideByZero
            }
            return lhs / rhs
        }
    }

    private static func parseNumber(from characters: [Character], start: Int) throws -> (Decimal, Int) {
        var index = start
        var buffer = ""
        var hasDigit = false
        var hasDecimalSeparator = false

        if characters[index] == "-" {
            buffer.append("-")
            index += 1
        }

        while index < characters.count {
            let character = characters[index]
            if character.isNumber {
                hasDigit = true
                buffer.append(character)
                index += 1
                continue
            }

            if character == "." {
                guard !hasDecimalSeparator else {
                    throw CalculatorError.invalidExpression
                }

                hasDecimalSeparator = true
                buffer.append(".")
                index += 1
                continue
            }

            break
        }

        guard hasDigit else {
            throw CalculatorError.invalidExpression
        }

        if buffer.hasPrefix(".") {
            buffer = "0" + buffer
        } else if buffer.hasPrefix("-.") {
            buffer = buffer.replacingOccurrences(of: "-.", with: "-0.", options: .anchored)
        } else if buffer.hasSuffix(".") {
            buffer += "0"
        }

        guard let decimal = Decimal(string: buffer, locale: Locale(identifier: "en_US_POSIX")) else {
            throw CalculatorError.invalidExpression
        }

        var percentCount = 0
        while index < characters.count, characters[index] == "%" {
            percentCount += 1
            index += 1
        }

        let value = (0..<percentCount).reduce(decimal) { partial, _ in
            partial / 100
        }

        return (value, index)
    }

    private static func normalize(_ expression: String) -> String {
        expression
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: ",", with: "")
            .replacingOccurrences(of: "×", with: "*")
            .replacingOccurrences(of: "÷", with: "/")
            .replacingOccurrences(of: "−", with: "-")
    }

    private static func trimTrailingOperators(from expression: String) -> String {
        var normalized = normalize(expression)

        while let last = normalized.last, operatorToken(for: last) != nil {
            normalized.removeLast()
        }

        return normalized
    }

    private static func operatorToken(for character: Character) -> CalculatorOperator? {
        switch character {
        case "+":
            return .add
        case "-":
            return .subtract
        case "*":
            return .multiply
        case "/":
            return .divide
        default:
            return nil
        }
    }
}
