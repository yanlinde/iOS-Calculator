import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = CalculatorViewModel()

    // 按钮颜色定义
    private let numberColor = Color(hex: "#333333")
    private let functionColor = Color(hex: "#A5A5A5")
    private let operatorColor = Color(hex: "#FF9500")

    // 布局常量
    private let buttonSpacing: CGFloat = 10
    private let horizontalPadding: CGFloat = 16

    var body: some View {
        GeometryReader { geometry in
            let safeBottom = geometry.safeAreaInsets.bottom
            let safeTop = geometry.safeAreaInsets.top
            let totalHeight = geometry.size.height - safeTop - safeBottom

            // 按比例分配高度
            let historyHeight = totalHeight * 0.20
            let displayHeight = totalHeight * 0.15
            let buttonsHeight = totalHeight * 0.65

            // 根据按钮区域高度计算按钮大小（减少间距确保所有按钮可见）
            let innerButtonSpacing: CGFloat = 8
            let buttonSize = min(
                (geometry.size.width - horizontalPadding * 2 - innerButtonSpacing * 3) / 4,
                (buttonsHeight - innerButtonSpacing * 4) / 5
            ) * 0.95

            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 0) {
                    // 历史记录区域
                    HistoryView(history: viewModel.history)
                        .frame(height: historyHeight)

                    // 显示区域
                    DisplayView(
                        currentResult: viewModel.currentResult,
                        currentExpression: viewModel.currentExpression,
                        displayValue: viewModel.displayValue
                    )
                    .padding(.horizontal, 24)
                    .frame(height: displayHeight)

                    // 按钮网格 - 占用剩余空间
                    buttonsGrid(buttonSize: buttonSize)
                        .frame(height: buttonsHeight)
                        .padding(.horizontal, horizontalPadding)
                }
            }
        }
    }

    // MARK: - 按钮网格
    private func buttonsGrid(buttonSize: CGFloat) -> some View {
        VStack(spacing: 0) {
            Spacer()

            let innerButtonSpacing: CGFloat = 8

            VStack(spacing: innerButtonSpacing) {
                // 第一行: ⌫ C % ÷
                HStack(spacing: innerButtonSpacing) {
                    functionButton("⌫", textColor: .black, size: buttonSize, fontSize: buttonSize * 0.35) {
                        viewModel.deleteLast()
                    }
                    functionButton("C", textColor: .black, size: buttonSize, fontSize: buttonSize * 0.4) {
                        viewModel.clear()
                    }
                    functionButton("%", textColor: .black, size: buttonSize, fontSize: buttonSize * 0.4) {
                        viewModel.inputPercentage()
                    }
                    operatorButton("÷", size: buttonSize, fontSize: buttonSize * 0.45, isSelected: viewModel.selectedOperator == .divide) {
                        viewModel.inputOperator(.divide)
                    }
                }

                // 第二行: 7 8 9 ×
                HStack(spacing: innerButtonSpacing) {
                    numberButton("7", size: buttonSize)
                    numberButton("8", size: buttonSize)
                    numberButton("9", size: buttonSize)
                    operatorButton("×", size: buttonSize, fontSize: buttonSize * 0.45, isSelected: viewModel.selectedOperator == .multiply) {
                        viewModel.inputOperator(.multiply)
                    }
                }

                // 第三行: 4 5 6 −
                HStack(spacing: innerButtonSpacing) {
                    numberButton("4", size: buttonSize)
                    numberButton("5", size: buttonSize)
                    numberButton("6", size: buttonSize)
                    operatorButton("−", size: buttonSize, fontSize: buttonSize * 0.45, isSelected: viewModel.selectedOperator == .subtract) {
                        viewModel.inputOperator(.subtract)
                    }
                }

                // 第四行: 1 2 3 +
                HStack(spacing: innerButtonSpacing) {
                    numberButton("1", size: buttonSize)
                    numberButton("2", size: buttonSize)
                    numberButton("3", size: buttonSize)
                    operatorButton("+", size: buttonSize, fontSize: buttonSize * 0.45, isSelected: viewModel.selectedOperator == .add) {
                        viewModel.inputOperator(.add)
                    }
                }

                // 第五行: +/- 0 . =
                HStack(spacing: innerButtonSpacing) {
                    functionButton("+/-", textColor: .black, size: buttonSize, fontSize: buttonSize * 0.3) {
                        viewModel.toggleSign()
                    }

                    numberButton("0", size: buttonSize)
                    numberButton(".", size: buttonSize)

                    operatorButton("=", size: buttonSize, fontSize: buttonSize * 0.45, isSelected: false) {
                        viewModel.calculate()
                    }
                }
            }

            Spacer()
        }
    }

    // MARK: - 按钮组件

    private func numberButton(_ number: String, size: CGFloat) -> some View {
        Button(action: {
            if number == "." {
                viewModel.inputDecimal()
            } else {
                viewModel.inputNumber(number)
            }
        }) {
            Text(number)
                .font(.system(size: size * 0.4, weight: .regular))
                .foregroundColor(.white)
                .frame(width: size, height: size)
                .background(numberColor)
                .clipShape(Circle())
        }
        .buttonStyle(CalculatorButtonStyle())
    }

    private func functionButton(_ title: String, textColor: Color, size: CGFloat, fontSize: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: fontSize, weight: .medium))
                .foregroundColor(textColor)
                .frame(width: size, height: size)
                .background(functionColor)
                .clipShape(Circle())
        }
        .buttonStyle(CalculatorButtonStyle())
    }

    private func operatorButton(_ title: String, size: CGFloat, fontSize: CGFloat, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: fontSize, weight: .regular))
                .foregroundColor(isSelected ? operatorColor : .white)
                .frame(width: size, height: size)
                .background(isSelected ? .white : operatorColor)
                .clipShape(Circle())
        }
        .buttonStyle(CalculatorButtonStyle())
    }
}

// MARK: - 按钮样式
struct CalculatorButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .opacity(configuration.isPressed ? 0.7 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Color 扩展
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    ContentView()
}
