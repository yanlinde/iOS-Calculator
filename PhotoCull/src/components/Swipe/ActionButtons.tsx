import { motion } from 'framer-motion';

interface ActionButtonsProps {
  onPass: () => void;
  onKeep: () => void;
  disabled?: boolean;
}

/**
 * 底部操作按钮组件
 *
 * 设计规范：
 * - 按钮热区不小于 44x44pt（iOS 规范）
 * - 红色 X 按钮：淘汰
 * - 蓝色心形按钮：保留
 * - 点击时有缩放动画反馈
 */
export function ActionButtons({ onPass, onKeep, disabled = false }: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-8 pb-safe">
      {/* 淘汰按钮（X） */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        onClick={onPass}
        disabled={disabled}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center
          bg-slate-800 border-2 border-red-500/50
          shadow-lg shadow-red-500/20
          transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/10 active:bg-red-500/20'}
        `}
        style={{ minWidth: '64px', minHeight: '64px' }} // 确保 44pt+ 热区
      >
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </motion.button>

      {/* 保留按钮（心形） */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        onClick={onKeep}
        disabled={disabled}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center
          bg-blue-600 border-2 border-blue-400
          shadow-lg shadow-blue-500/30
          transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500 active:bg-blue-700'}
        `}
        style={{ minWidth: '64px', minHeight: '64px' }}
      >
        <svg
          className="w-8 h-8 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </motion.button>
    </div>
  );
}
