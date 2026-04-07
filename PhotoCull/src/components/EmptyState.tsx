
import { useEffect, useState } from 'react';

interface EmptyStateProps {
  onImport: () => void;
}

interface Slogan {
  id: number;
  lines: string[];
}

// Slogan 版本列表
const SLOGANS: Slogan[] = [
  {
    id: 1,
    lines: ['在海量照片中', '找出你最爱的瞬间']
  },
  {
    id: 2,
    lines: ['在纠结选哪张吗', '让我们一起来搞定']
  }
];

/**
 * 空状态页面 - 完全还原 Pencil 设计
 * 设计参数来自 pencil-new.pen / WrVFk
 */
export function EmptyState({ onImport }: EmptyStateProps) {
  // 随机选择 Slogan
  const [currentSlogan, setCurrentSlogan] = useState<Slogan>(SLOGANS[0]);

  useEffect(() => {
    console.log('[EmptyState] Mounted at:', Date.now());
    // 随机选择一个 Slogan
    const randomIndex = Math.floor(Math.random() * SLOGANS.length);
    setCurrentSlogan(SLOGANS[randomIndex]);

    // 使用 vConsole 记录布局信息用于调试
    // @ts-ignore
    if (window.vconsole) {
      // @ts-ignore
      window.vconsole.log('[EmptyState] Screen width:', window.innerWidth);
      // @ts-ignore
      window.vconsole.log('[EmptyState] Selected slogan:', SLOGANS[randomIndex].lines);
    }
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        backgroundColor: '#FFFFFF',
        maxWidth: '402px',
        margin: '0 auto'
      }}
    >
      {/* Slogan 区域 - 高度 270px，padding [250, 24, 16, 24] */}
      <div
        className="flex-none flex items-center justify-center text-center"
        style={{
          height: '270px',
          paddingTop: '250px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '16px'
        }}
      >
        <h1
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '40px',
            fontWeight: 700,
            lineHeight: 1.3,
            color: '#D4D4D8',
            margin: 0
          }}
        >
          {currentSlogan.lines.map((line, index) => (
            <span key={currentSlogan.id + '-' + index}>
              {line}
              {index < currentSlogan.lines.length - 1 && <br />}
            </span>
          ))}
        </h1>
      </div>

      {/* Content 区域 - 垂直布局，gap 32px，padding [180, 24, 0, 24] */}
      <div
        className="flex-1 flex flex-col items-center"
        style={{
          paddingTop: '180px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '0',
          gap: '32px'
        }}
      >
        {/* 主文字 */}
        <h2
          className="text-center"
          style={{
            fontFamily: 'Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            color: '#18181B',
            margin: 0
          }}
        >
          添加照片，开始筛选
        </h2>

        {/* Add Button - 高度 56px，圆角 24px，gap 10px */}
        <button
          onClick={onImport}
          className="w-full flex items-center justify-center"
          style={{
            height: '56px',
            backgroundColor: '#18181B',
            borderRadius: '24px',
            gap: '10px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {/* Plus Icon - 22x22 */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>

          {/* Button Text */}
          <span
            style={{
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: '#FFFFFF'
            }}
          >
            添加照片
          </span>
        </button>
      </div>
    </div>
  );
}
