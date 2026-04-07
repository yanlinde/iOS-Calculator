import SwiftUI
import SwiftData
import UIKit

struct CalculatorScreen: View {
    @Environment(\.modelContext) private var modelContext
    @StateObject private var viewModel = CalculatorViewModel()
    @State private var showInputLimitAlert = false

    private let rows: [[String]] = [
        ["⌫", "C", "%", "÷"],
        ["7", "8", "9", "×"],
        ["4", "5", "6", "−"],
        ["1", "2", "3", "+"],
        ["+/-", "0", ".", "="]
    ]

    var body: some View {
        ZStack {
            CalculatorTheme.background
                .ignoresSafeArea()

            GeometryReader { geometry in
                let layout = CalculatorLayout(
                    screenSize: geometry.size,
                    rows: rows
                )

                ZStack(alignment: .bottom) {
                    // 主内容区域
                    MainContentView(
                        viewModel: viewModel,
                        layout: layout
                    )

                    // 键盘固定在底部
                    KeyboardView(
                        rows: rows,
                        buttonSize: layout.buttonSize,
                        buttonSpacing: layout.buttonSpacing,
                        keyboardWidth: layout.keyboardWidth,
                        keyboardHeight: layout.keyboardHeight,
                        screenWidth: layout.screenWidth,
                        selectedOperator: viewModel.selectedOperator,
                        handleTap: viewModel.handleTap
                    )
                }
            }
        }
        .task {
            viewModel.configure(historyStore: SwiftDataCalculatorHistoryStore(modelContext: modelContext))
        }
        .alert("输入提示", isPresented: $showInputLimitAlert) {
            Button("确定", role: .cancel) {}
        } message: {
            Text("输入过长，请分段计算")
        }
        .onReceive(viewModel.$showInputLimitWarning) { show in
            if show {
                showInputLimitAlert = true
            }
        }
    }
}

// MARK: - Layout Calculation

private struct CalculatorLayout {
    let screenWidth: CGFloat
    let screenHeight: CGFloat
    let buttonSize: CGFloat
    let buttonSpacing: CGFloat
    let keyboardWidth: CGFloat
    let keyboardHeight: CGFloat
    let historyHeight: CGFloat
    let inputMaxHeight: CGFloat
    let topSafeArea: CGFloat

    init(screenSize: CGSize, rows: [[String]]) {
        self.screenWidth = screenSize.width
        self.screenHeight = screenSize.height

        let maxButtonSize: CGFloat = 96
        let hPadding: CGFloat = 16
        self.buttonSpacing = 12
        self.buttonSize = min((screenWidth - hPadding * 2 - buttonSpacing * 3) / 4, maxButtonSize)
        self.keyboardWidth = buttonSize * 4 + buttonSpacing * 3
        self.keyboardHeight = buttonSize * 5 + buttonSpacing * 4 + 8 + 12

        self.topSafeArea = 8
        let availableHeight = screenHeight - keyboardHeight - topSafeArea
        self.historyHeight = min(max(availableHeight * 0.5, 80), 150)
        self.inputMaxHeight = min(max(availableHeight * 0.5, 60), 100)
    }
}

// MARK: - Main Content View

private struct MainContentView: View {
    @ObservedObject var viewModel: CalculatorViewModel
    let layout: CalculatorLayout

    var body: some View {
        VStack(spacing: 0) {
            Color.clear
                .frame(height: layout.topSafeArea)

            HistorySection(
                historyItems: viewModel.historyItems,
                historyHeight: layout.historyHeight
            )

            InputSection(
                viewModel: viewModel,
                inputMaxHeight: layout.inputMaxHeight
            )

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: layout.screenHeight)
    }
}

// MARK: - History Section

private struct HistorySection: View {
    let historyItems: [CalculatorHistoryItem]
    let historyHeight: CGFloat

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .trailing, spacing: 12) {
                    Spacer(minLength: 0)

                    ForEach(Array(historyItems.enumerated()), id: \.element.id) { index, item in
                        HistoryItemRow(item: item, index: index)
                            .id(item.id)
                    }

                    // 底部锚点，确保滚动到最底部
                    Color.clear
                        .frame(height: 1)
                        .id("historyBottomAnchor")
                }
                .frame(maxWidth: .infinity, alignment: .bottomTrailing)
                .padding(.horizontal, 24)
            }
            .accessibilityIdentifier("calculator.history.scroll")
            .onChange(of: historyItems.count) {
                scrollToBottom(proxy: proxy)
            }
            .onChange(of: historyItems.last?.text) {
                scrollToBottom(proxy: proxy)
            }
        }
        .frame(height: historyHeight)
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        // 延迟滚动，确保多行文本布局完成
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            withAnimation(.easeOut(duration: 0.2)) {
                proxy.scrollTo("historyBottomAnchor", anchor: .bottom)
            }
        }
    }
}

// MARK: - Input Section

private struct InputSection: View {
    @ObservedObject var viewModel: CalculatorViewModel
    let inputMaxHeight: CGFloat

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            // 预览结果区：固定高度，避免布局跳动
            ZStack(alignment: .trailing) {
                // 背景占位，确保高度始终一致
                Color.clear
                    .frame(height: 34)

                if !viewModel.isInitialState, let previewText = viewModel.previewText {
                    Text(previewText)
                        .font(.system(size: 28, weight: .regular))
                        .foregroundStyle(CalculatorTheme.previewText)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .accessibilityIdentifier("calculator.preview")
                        .modifier(LongPressCopyModifier(textToCopy: previewText))
                }
            }

            // 当前输入区：始终使用输入样式显示
            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    CurrentInputDisplayView(
                        text: viewModel.mainDisplayText,
                        layout: viewModel.displayLayout
                    )
                    .id("mainDisplayContent")
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                }
                .onChange(of: viewModel.mainDisplayText) {
                    withAnimation(.easeOut(duration: 0.1)) {
                        proxy.scrollTo("mainDisplayContent", anchor: .bottom)
                    }
                }
            }
            .frame(maxHeight: inputMaxHeight)
        }
        .padding(.horizontal, 24)
    }
}

// MARK: - Keyboard View

private struct KeyboardView: View {
    let rows: [[String]]
    let buttonSize: CGFloat
    let buttonSpacing: CGFloat
    let keyboardWidth: CGFloat
    let keyboardHeight: CGFloat
    let screenWidth: CGFloat
    let selectedOperator: String?
    let handleTap: (String) -> Void

    var body: some View {
        VStack(spacing: buttonSpacing) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: buttonSpacing) {
                    ForEach(row, id: \.self) { title in
                        CalculatorButton(
                            title: title,
                            size: buttonSize,
                            isSelected: selectedOperator == title
                        ) {
                            handleTap(title)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, (screenWidth - keyboardWidth) / 2)
        .padding(.bottom, 12)
        .padding(.top, 12)
        .frame(height: keyboardHeight)
    }
}

// MARK: - Long Press Copy Modifier

private struct LongPressCopyModifier: ViewModifier {
    let textToCopy: String
    @State private var showCopyButton = false

    func body(content: Content) -> some View {
        content
            .contentShape(Rectangle())
            .onLongPressGesture {
                let impactFeedback = UIImpactFeedbackGenerator(style: .light)
                impactFeedback.impactOccurred()
                showCopyButton = true
            }
            .overlay(
                GeometryReader { geometry in
                    ZStack {
                        if showCopyButton {
                            // 半透明遮罩
                            Color.black.opacity(0.001)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .onTapGesture {
                                    showCopyButton = false
                                }

                            // 复制按钮居中显示
                            CopyButton {
                                UIPasteboard.general.string = textToCopy
                                showCopyButton = false
                                let notificationFeedback = UINotificationFeedbackGenerator()
                                notificationFeedback.notificationOccurred(.success)
                            }
                            .position(
                                x: geometry.size.width / 2,
                                y: geometry.size.height / 2
                            )
                        }
                    }
                }
            )
    }
}

private struct CopyButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: "doc.on.doc")
                    .font(.system(size: 14))
                Text("复制")
                    .font(.system(size: 14, weight: .medium))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                Color(red: 60/255, green: 60/255, blue: 60/255)
                    .cornerRadius(8)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
    }
}

// MARK: - Current Input Display View

private struct CurrentInputDisplayView: View {
    let text: String
    let layout: CurrentInputDisplayLayout

    var body: some View {
        // 使用 FlowLayoutText 处理换行逻辑
        FlowLayoutText(
            text: text,
            fontSize: layout.fontSize
        )
        .modifier(LongPressCopyModifier(textToCopy: text))
    }
}

private struct SingleLineLabel: UIViewRepresentable {
    let text: String
    let fontSize: CGFloat

    func makeUIView(context: Context) -> UILabel {
        let label = UILabel()
        label.textAlignment = .right
        label.textColor = .white
        label.numberOfLines = 1
        label.font = .systemFont(ofSize: fontSize, weight: .semibold)
        label.accessibilityIdentifier = "calculator.mainDisplay"
        return label
    }

    func updateUIView(_ label: UILabel, context: Context) {
        label.font = .systemFont(ofSize: fontSize, weight: .semibold)
        label.text = text
    }
}

private struct FlowLayoutText: View {
    let text: String
    let fontSize: CGFloat

    var body: some View {
        let rows = calculateRows()
        let availableWidth = UIScreen.main.bounds.width - 48

        // 检查单行是否超宽
        let singleRow = rows.joined(separator: " ")
        let isOverflow = !fitsInWidth(singleRow, width: availableWidth)

        // 如果只有一行且不超宽，使用 UILabel 确保和默认状态完全一致
        if rows.count == 1 && !isOverflow {
            SingleLineLabel(
                text: rows[0],
                fontSize: fontSize
            )
            .contentShape(Rectangle())
        } else {
            // 多行或超宽时，使用 FlowLayout 分行显示
            VStack(alignment: .trailing, spacing: 4) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    Text(row)
                        .font(.system(size: fontSize, weight: .semibold))
                        .foregroundStyle(CalculatorTheme.primaryText)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .accessibilityIdentifier("calculator.mainDisplay")
        }
    }

    private func calculateRows() -> [String] {
        // 解析表达式为单元：[数字, 运算符, 数字, ...]
        let units = parseUnits(from: text)
        guard !units.isEmpty else { return [text] }

        // 贪婪算法分行
        let availableWidth = UIScreen.main.bounds.width - 48 // 减去左右padding
        var rows: [String] = []
        var currentRow = ""

        for unit in units {
            // 如果当前单元本身就超宽（如超长数字），需要拆分
            if !fitsInWidth(unit, width: availableWidth) {
                // 先保存当前行
                if !currentRow.isEmpty {
                    rows.append(currentRow)
                    currentRow = ""
                }
                // 拆分超长单元
                let splitUnits = splitLongUnit(unit, width: availableWidth)
                rows.append(contentsOf: splitUnits)
                continue
            }

            let testRow = currentRow.isEmpty ? unit : currentRow + " " + unit

            if fitsInWidth(testRow, width: availableWidth) {
                currentRow = testRow
            } else {
                if !currentRow.isEmpty {
                    rows.append(currentRow)
                }
                currentRow = unit
            }
        }

        if !currentRow.isEmpty {
            rows.append(currentRow)
        }

        return rows.isEmpty ? [text] : rows
    }

    private func splitLongUnit(_ unit: String, width: CGFloat) -> [String] {
        var result: [String] = []
        var current = ""

        for char in unit {
            let test = current + String(char)
            if fitsInWidth(test, width: width) {
                current = test
            } else {
                if !current.isEmpty {
                    result.append(current)
                }
                current = String(char)
            }
        }

        if !current.isEmpty {
            result.append(current)
        }

        return result.isEmpty ? [unit] : result
    }

    private func parseUnits(from text: String) -> [String] {
        var units: [String] = []
        var current = ""

        for char in text {
            let str = String(char)
            if ["+", "−", "×", "÷"].contains(str) {
                if !current.isEmpty {
                    units.append(current)
                    current = ""
                }
                units.append(str)
            } else if str == " " {
                // 跳过空格，已处理
            } else {
                current.append(char)
            }
        }

        if !current.isEmpty {
            units.append(current)
        }

        return units
    }

    private func fitsInWidth(_ text: String, width: CGFloat) -> Bool {
        let font = UIFont.systemFont(ofSize: fontSize, weight: .semibold)
        let size = (text as NSString).size(withAttributes: [.font: font])
        // 减去8pt安全边距，避免计算误差导致省略号
        return size.width <= (width - 8)
    }
}

private struct HistoryItemRow: View {
    let item: CalculatorHistoryItem
    let index: Int

    var body: some View {
        Text(item.text)
            .font(.system(size: 16, weight: .regular))
            .foregroundStyle(CalculatorTheme.historyText)
            .frame(maxWidth: .infinity, alignment: .trailing)
            .multilineTextAlignment(.trailing)
            .lineSpacing(2)
            .accessibilityIdentifier("calculator.history.item.\(index)")
    }
}

private struct CalculatorButtonStyle: ButtonStyle {
    @Binding var isPressed: Bool
    let isOperator: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .onChange(of: configuration.isPressed) { newValue in
                isPressed = newValue
            }
    }
}

private struct CalculatorButton: View {
    let title: String
    let size: CGFloat
    let isSelected: Bool
    let action: () -> Void

    @State private var isPressed = false

    private var isOperator: Bool {
        ["÷", "×", "−", "+", "="].contains(title)
    }

    private var isUtility: Bool {
        ["⌫", "C", "%", "+/-"].contains(title)
    }

    private var defaultFillColor: Color {
        if isUtility {
            return CalculatorTheme.utilityButton
        }
        if isOperator {
            return CalculatorTheme.operatorButton
        }
        return CalculatorTheme.numberButton
    }

    private var selectedFillColor: Color {
        // 选中时反色：白底
        .white
    }

    private var defaultTextColor: Color {
        if isUtility {
            return .black
        }
        return .white
    }

    private var selectedTextColor: Color {
        // 选中时反色：黄色符号
        CalculatorTheme.operatorButton
    }

    private var pressedFillColor: Color {
        // 按下时颜色往更浅（更亮）变化
        if isUtility {
            return Color(red: 220/255, green: 220/255, blue: 220/255) // 更浅的灰色
        }
        if isOperator {
            return Color(red: 1.0, green: 200/255, blue: 120/255) // 更浅的橙色
        }
        return Color(red: 90/255, green: 90/255, blue: 90/255) // 更浅的深灰
    }

    private var fillColor: Color {
        if isSelected {
            return selectedFillColor
        }
        if isPressed {
            return pressedFillColor
        }
        return defaultFillColor
    }

    private var textColor: Color {
        isSelected ? selectedTextColor : defaultTextColor
    }

    private var fontSize: CGFloat {
        // 字体大小与按钮大小成比例
        let baseSize = size / 78.0
        let baseFontSize: CGFloat
        switch title {
        case "+/-":
            baseFontSize = 24
        case "⌫", "C", "%":
            baseFontSize = 28
        case "÷", "×", "−", "+", "=":
            baseFontSize = 36
        default:
            baseFontSize = 32
        }
        return baseFontSize * baseSize
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(fillColor)
                .animation(.none, value: fillColor)

            Text(title)
                .font(.system(size: fontSize, weight: .medium))
                .foregroundStyle(textColor)
                // 调整运算符的视觉居中（往上偏移）
                .offset(y: isOperator ? -2 : 0)
        }
        .frame(width: size, height: size)
        .contentShape(Circle())
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    isPressed = true
                }
                .onEnded { _ in
                    isPressed = false
                    action()
                }
        )
        .accessibilityIdentifier("calculator.button.\(accessibilitySuffix)")
    }

    private var accessibilitySuffix: String {
        switch title {
        case "+":
            return "plus"
        case "−":
            return "minus"
        case "×":
            return "multiply"
        case "÷":
            return "divide"
        case "=":
            return "equals"
        case "%":
            return "percent"
        case "+/-":
            return "toggleSign"
        case "⌫":
            return "delete"
        case "C":
            return "clear"
        case ".":
            return "decimal"
        default:
            return title
        }
    }
}

