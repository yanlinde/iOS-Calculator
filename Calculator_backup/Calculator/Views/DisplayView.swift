import SwiftUI

/// 计算器显示区域 - 与Pencil设计一致
struct DisplayView: View {
    let currentResult: String
    let currentExpression: String
    let displayValue: String

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            // 第一行：结果（灰色，28pt）
            Text(currentResult.isEmpty ? " " : currentResult)
                .font(.system(size: 28, weight: .regular))
                .foregroundColor(Color(hex: "#bebebe"))
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity, alignment: .trailing)

            // 第二行：当前表达式（白色，48pt，粗体）
            Text(displayValue)
                .font(.system(size: 48, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.4)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }
}

#Preview {
    DisplayView(
        currentResult: "1,031.4",
        currentExpression: "1,031.4 +",
        displayValue: "1,031.4 +"
    )
    .background(Color.black)
}
