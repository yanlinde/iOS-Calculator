import { motion } from 'framer-motion';

interface ActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepAll: () => void;
  onPassAll: () => void;
  onClear: () => void;
}

/**
 * 操作菜单组件
 */
export function ActionMenu({
  isOpen,
  onClose,
  onKeepAll,
  onPassAll,
  onClear,
}: ActionMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 点击/滑动外部关闭菜单的透明遮罩 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onTouchStart={onClose}
      />

      {/* 折叠菜单 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute right-0 top-full mt-2 w-32 bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden z-50"
      >
        <button
          onClick={onKeepAll}
          className="w-full px-4 py-3 text-left text-sm text-blue-400 hover:bg-slate-700 transition-colors"
        >
          全部保留
        </button>
        <button
          onClick={onPassAll}
          className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors border-t border-slate-700"
        >
          全部淘汰
        </button>
        <button
          onClick={onClear}
          className="w-full px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border-t border-slate-700"
        >
          清空
        </button>
      </motion.div>
    </>
  );
}
