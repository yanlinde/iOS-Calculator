import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhotoStatus } from '../../types/photo';

interface UndoToastProps {
  status: PhotoStatus | null;
  onUndo: () => void;
}

/**
 * 撤销提示组件
 *
 * 显示最后一次操作的结果，提供撤销按钮
 * 3 秒后自动消失
 */
export function UndoToast({ status, onUndo }: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (status) {
      setIsVisible(true);
      setCountdown(3);

      // 倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsVisible(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status]);

  const handleUndo = () => {
    setIsVisible(false);
    onUndo();
  };

  if (!status) return null;

  // 新逻辑：只有两种状态
  const message = status === 'normal' ? '已恢复' : '已淘汰';
  const iconColor = status === 'normal' ? 'text-blue-500' : 'text-red-500';
  const bgColor = status === 'normal' ? 'bg-blue-500/10' : 'bg-red-500/10';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`flex items-center gap-4 px-5 py-3 ${bgColor} backdrop-blur-md rounded-full border border-white/10 shadow-lg`}>
            {/* 状态图标 */}
            <div className={iconColor}>
              {status === 'normal' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            {/* 消息 */}
            <span className="text-white font-medium">{message}</span>

            {/* 分隔线 */}
            <div className="w-px h-4 bg-white/20" />

            {/* 撤销按钮 */}
            <button
              onClick={handleUndo}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              撤销
            </button>

            {/* 倒计时指示器 */}
            <div className="w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center">
              <span className="text-xs text-white/60">{countdown}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
