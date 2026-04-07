import { motion } from 'framer-motion';

interface CompletionViewProps {
  keptCount: number;
  passedCount: number;
  onViewKept: () => void;
  onViewPassed: () => void;
  onAddMore?: () => void;
}

/**
 * 筛选完成视图
 * 根据「待筛选-空」设计重新开发
 */
export function CompletionView({
  keptCount,
  passedCount,
  onViewKept,
  onViewPassed,
  onAddMore,
}: CompletionViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full w-full bg-white flex flex-col items-center justify-center px-6"
    >
      {/* 标题 */}
      <h2
        className="text-xl font-semibold mb-9"
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          color: '#18181B',
        }}
      >
        筛选完成
      </h2>

      {/* 按钮组 */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* 查看已保留按钮 - 深色背景 */}
        <button
          onClick={onViewKept}
          className="w-full flex items-center justify-center py-4 rounded-[22px] transition-colors"
          style={{
            backgroundColor: '#18181B',
            height: '56px',
          }}
        >
          <span
            className="text-white font-medium"
            style={{
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '15px',
            }}
          >
            查看已保留 {keptCount > 0 ? keptCount : ''}
          </span>
        </button>

        {/* 查看已淘汰按钮 - 浅灰背景 */}
        <button
          onClick={onViewPassed}
          className="w-full flex items-center justify-center py-4 rounded-[20px] transition-colors"
          style={{
            backgroundColor: '#F4F4F5',
            border: '1px solid #E4E4E7',
            height: '52px',
          }}
        >
          <span
            className="font-medium"
            style={{
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '15px',
              color: '#18181B',
            }}
          >
            查看已淘汰 {passedCount > 0 ? passedCount : ''}
          </span>
        </button>

        {/* 继续添加照片按钮 - 白色背景带边框 */}
        <button
          onClick={onAddMore}
          className="w-full flex items-center justify-center py-4 rounded-[20px] transition-colors"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D4D4D8',
            height: '52px',
          }}
        >
          <span
            className="font-medium"
            style={{
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '15px',
              color: '#18181B',
            }}
          >
            继续添加照片
          </span>
        </button>
      </div>
    </motion.div>
  );
}
