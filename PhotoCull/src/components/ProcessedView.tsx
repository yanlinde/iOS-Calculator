import { useState, useEffect } from 'react';
import type { UserPhoto } from '../types/photo';

interface ProcessedViewProps {
  keptPhotos: UserPhoto[];
  passedPhotos: UserPhoto[];
  onExport: () => void;
  onViewPassed: () => void;
  onBackToPending: () => void;
}

/**
 * 已处理页面
 * 根据「已处理」设计重新开发
 * 显示已保留的照片网格，提供导出和查看已淘汰入口
 */
export function ProcessedView({
  keptPhotos,
  passedPhotos,
  onExport,
  onViewPassed,
  onBackToPending,
}: ProcessedViewProps) {
  const [loadedUrls, setLoadedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls: Record<string, string> = {};
    keptPhotos.forEach((photo) => {
      if (photo.blobData) {
        urls[photo.id] = URL.createObjectURL(photo.blobData);
      }
    });
    setLoadedUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [keptPhotos]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部导航栏 - 包含安全区域适配 */}
      <header
        className="flex-none flex flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top, 47px)',
          paddingBottom: '10px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E6E6E6',
        }}
      >
        <div
          className="flex items-center"
          style={{
            height: '44px',
            paddingLeft: 'max(8px, env(safe-area-inset-left))',
            paddingRight: 'max(8px, env(safe-area-inset-right))',
          }}
        >
        {/* 左侧 - 已保留数量 + 导出按钮 */}
        <div className="flex items-center" style={{ gap: '14px' }}>
          <span
            style={{
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: '#18181B',
            }}
          >
            已保留 {keptPhotos.length}
          </span>
          <button
            onClick={onExport}
            className="flex items-center justify-center transition-colors"
            style={{
              backgroundColor: '#18181B',
              borderRadius: '22px',
              height: '34px',
              padding: '0 18px',
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '15px',
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              导出
            </span>
          </button>
        </div>

        {/* 右侧 - 已淘汰入口 */}
        <div className="flex-1 flex items-center justify-end">
          <button
            onClick={onViewPassed}
            className="flex items-center gap-1"
          >
            <span
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: '#787878',
              }}
            >
              已淘汰 {passedPhotos.length}
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#787878"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        </div>
      </header>

      {/* 照片网格 - 3列布局，下移10px */}
      <main className="flex-1 overflow-auto" style={{ marginTop: '20px' }}>
        {keptPhotos.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-400">
            还没有保留的照片
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              backgroundColor: '#FFFFFF',
            }}
          >
            {keptPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative bg-neutral-100"
                style={{ aspectRatio: '1/1' }}
              >
                {loadedUrls[photo.id] ? (
                  <img
                    src={loadedUrls[photo.id]}
                    alt="Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-neutral-300 animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 底部标签栏 */}
      <footer
        className="flex-none"
        style={{
          backgroundColor: '#050505',
          padding: '10px 12px 16px 12px',
          borderTop: '1px solid #27272A',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        }}
      >
        <div className="flex" style={{ gap: '8px', height: '50px' }}>
          {/* 待筛选标签 - 非激活 */}
          <button
            onClick={onBackToPending}
            className="flex-1 flex items-center justify-center"
            style={{
              backgroundColor: 'transparent',
              borderRadius: '18px',
              height: '100%',
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: '#A1A1AA',
              }}
            >
              待筛选 0
            </span>
          </button>

          {/* 已筛选标签 - 激活 */}
          <div
            className="flex-1 flex items-center justify-center"
            style={{
              backgroundColor: '#18181B',
              borderRadius: '18px',
              height: '100%',
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              已筛选 {keptPhotos.length + passedPhotos.length}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
