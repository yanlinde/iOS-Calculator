import { motion } from 'framer-motion';

interface CompareButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 对比模式触发按钮
 */
export function CompareButton({ onClick, disabled = false }: CompareButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 bg-slate-800 hover:bg-slate-700
        text-slate-300 font-medium rounded-full
        border border-slate-700
        flex items-center gap-2
        transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
      对比
    </motion.button>
  );
}
