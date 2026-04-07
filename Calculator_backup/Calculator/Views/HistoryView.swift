import SwiftUI

/// 历史记录视图 - 与Pencil设计一致
struct HistoryView: View {
    let history: [HistoryRecord]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .trailing, spacing: 8) {
                // 显示历史记录，最新的在最上面
                ForEach(history.prefix(6)) { record in
                    Text(record.displayText)
                        .font(.system(size: 16, weight: .regular))
                        .foregroundColor(Color(hex: "#A5A5A5"))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    HistoryView(history: [
        HistoryRecord(expression: "1,250 × 4", result: "5,000"),
        HistoryRecord(expression: "5,000 + 120", result: "5,120"),
        HistoryRecord(expression: "5,120 / 2", result: "2,560")
    ])
    .background(Color.black)
    .frame(height: 200)
}
