/**
 * 手势提示组件
 */
export function GestureHint() {
  return (
    <div className="flex items-center justify-center gap-6 pb-2 text-slate-500 text-xs">
      <div className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>左滑淘汰</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>右滑保留</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>
    </div>
  );
}
