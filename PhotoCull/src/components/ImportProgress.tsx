import type { ImportProgress } from '../types/photo';

interface ImportProgressProps {
  progress: ImportProgress;
}

/**
 * 导入进度弹窗组件
 * 完全还原 Pencil 设计 - 导入进度弹窗
 */
export function ImportProgressView({ progress }: ImportProgressProps) {
  if (!progress.isImporting) return null;

  const percentage = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999 }}
    >
      {/* Dialog Card - 327px width, 174px height, 20px radius, white bg */}
      <div
        className="flex flex-col items-center"
        style={{
          width: '327px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '32px',
          gap: '20px'
        }}
      >
        {/* 标题 - "正在导入" */}
        <h3
          style={{
            fontFamily: 'Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            color: '#18181B',
            margin: 0
          }}
        >
          正在导入
        </h3>

        {/* 进度计数 - "已处理 X / Y 张，请稍等" */}
        <p
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '14px',
            fontWeight: 'normal',
            color: '#A1A1AA',
            margin: 0
          }}
        >
          已处理 {progress.processed} / {progress.total} 张，请稍等
        </p>

        {/* 进度条容器 */}
        <div
          className="w-full"
          style={{
            height: '8px',
            backgroundColor: '#F4F4F5',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          {/* 进度条填充 - 黑色 */}
          <div
            style={{
              height: '100%',
              backgroundColor: '#18181B',
              borderRadius: '4px',
              width: `${percentage}%`,
              transition: 'width 0.2s ease-out'
            }}
          />
        </div>
      </div>
    </div>
  );
}
