import Foundation

enum CalculatorFormatter {
    static func string(from value: Decimal) -> String {
        // 对于非常大的整数，直接格式化避免精度丢失
        let stringValue = (value as NSDecimalNumber).stringValue

        // 分离整数部分和小数部分
        let parts = stringValue.split(separator: ".", maxSplits: 1)
        let integerPart = String(parts[0])

        // 格式化整数部分（添加千位分隔符）
        let formattedInteger = formatIntegerWithGrouping(integerPart)

        if parts.count > 1 {
            return formattedInteger + "." + parts[1]
        }

        return formattedInteger
    }

    private static func formatIntegerWithGrouping(_ integer: String) -> String {
        guard integer.count > 3 else { return integer }

        var result = ""
        let characters = Array(integer)
        let count = characters.count

        for (index, char) in characters.enumerated() {
            if index > 0 && (count - index) % 3 == 0 {
                result.append(",")
            }
            result.append(char)
        }

        return result
    }

    static func plainString(from value: Decimal) -> String {
        let number = value as NSDecimalNumber
        return number.stringValue
    }
}
