import { useState, useEffect, useRef } from 'react';

interface LoadingPageProps {
  isLoading: boolean;
}

/**
 * 过渡页面组件
 *
 * 功能：在照片导入期间显示全屏进度条
 * - 进度条从 0% 到 100% 需要 10 秒
 * - 线性增长，缓动效果
 * - 如果照片提前加载完成，立即关闭（由父组件控制）
 * - 如果 10 秒到了还没加载完，进度条保持在 100%
 */
export function LoadingPage({ isLoading }: LoadingPageProps) {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isCompleteRef = useRef(false);
  const hasStartedRef = useRef(false);
  const duration = 10000; // 10 秒

  // 组件挂载时立即开始进度条动画
  useEffect(() => {
    // 确保只启动一次
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    console.log('[LoadingPage] 进度条动画准备开始');

    // 重置状态
    setProgress(0);
    isCompleteRef.current = false;
    startTimeRef.current = Date.now();

    // 使用 requestAnimationFrame 实现平滑动画
    const animate = () => {
      if (isCompleteRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(newProgress);

      if (newProgress < 100 && !isCompleteRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // 双重 RAF 确保在浏览器渲染后下一帧立即开始
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.log('[LoadingPage] 进度条动画正式开始');
        animationRef.current = requestAnimationFrame(animate);
      });
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 当 isLoading 变为 false 时，停止动画
  useEffect(() => {
    if (!isLoading && !isCompleteRef.current) {
      console.log('[LoadingPage] 加载完成，停止动画');
      isCompleteRef.current = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [isLoading]);

  // 当 progress 达到 100% 时，保持在 100%
  useEffect(() => {
    if (progress >= 100 && isLoading && !isCompleteRef.current) {
      // 进度条已满，保持显示直到 isLoading 变为 false
      console.log('[LoadingPage] 进度条已达 100%，等待加载完成...');
    }
  }, [progress, isLoading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center" style={{ width: '263px' }}>
        {/* 标题 */}
        <h1
          className="text-[22px] font-bold text-[#18181B] mb-3"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          正在导入
        </h1>

        {/* 副标题 */}
        <p
          className="text-sm text-[#A1A1AA] mb-6"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          加速处理中，请稍等
        </p>

        {/* 进度条 */}
        <div
          className="w-full h-2 rounded overflow-hidden"
          style={{ backgroundColor: '#F4F4F5' }}
        >
          <div
            className="h-full rounded transition-none"
            style={{
              width: `${progress}%`,
              backgroundColor: '#18181B',
            }}
          />
        </div>
      </div>
    </div>
  );
}
