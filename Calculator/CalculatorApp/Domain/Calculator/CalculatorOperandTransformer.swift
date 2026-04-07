import Foundation

enum CalculatorOperandTransformer {
    static func toggleSign(for operand: String) throws -> String {
        let decimal = try decimal(from: operand)
        return CalculatorFormatter.plainString(from: decimal * -1)
    }

    static func applyPercent(to operand: String) throws -> String {
        let decimal = try decimal(from: operand)
        return CalculatorFormatter.plainString(from: decimal / 100)
    }

    private static func decimal(from operand: String) throws -> Decimal {
        let normalized = operand
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalized.isEmpty else {
            throw CalculatorError.invalidOperand
        }

        let adjusted: String
        if normalized.hasPrefix(".") {
            adjusted = "0" + normalized
        } else if normalized.hasPrefix("-.") {
            adjusted = normalized.replacingOccurrences(of: "-.", with: "-0.", options: .anchored)
        } else if normalized.hasSuffix(".") {
            adjusted = normalized + "0"
        } else {
            adjusted = normalized
        }

        guard let decimal = Decimal(string: adjusted, locale: Locale(identifier: "en_US_POSIX")) else {
            throw CalculatorError.invalidOperand
        }

        return decimal
    }
}
