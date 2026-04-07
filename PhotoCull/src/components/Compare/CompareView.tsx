import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { SyncZoomImage } from './SyncZoomImage';
import type { UserPhoto } from '../../types/photo';

interface CompareViewProps {
  leftPhoto: UserPhoto;
  rightPhoto: UserPhoto;
  onSelectLeft: () => void;
  onSelectRight: () => void;
  onExit: () => void;
}

/**
 * 双图对比视图
 *
 * 核心功能：
 * 1. 左右分屏显示两张照片
 * 2. 全局缩放状态管理
 * 3. "选它"决策按钮
 */
export function CompareView({
  leftPhoto,
  rightPhoto,
  onSelectLeft,
  onSelectRight,
  onExit,
}: CompareViewProps) {
  // 自己管理 URL
  const [leftUrl, setLeftUrl] = useState<string | null>(null);
  const [rightUrl, setRightUrl] = useState<string | null>(null);

  // 根据当前照片宽高比决定布局方向
  // 宽高比 >= 1（横屏/正方形）使用上下布局，< 1（竖屏）使用左右布局
  const isHorizontalLayout = leftPhoto.dimensions.width / leftPhoto.dimensions.height >= 1;

  useEffect(() => {
    if (leftPhoto.blobData) {
      const url = URL.createObjectURL(leftPhoto.blobData);
      setLeftUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [leftPhoto.id, leftPhoto.blobData]);

  useEffect(() => {
    if (rightPhoto.blobData) {
      const url = URL.createObjectURL(rightPhoto.blobData);
      setRightUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [rightPhoto.id, rightPhoto.blobData]);

  const containerRef = useRef<HTMLDivElement>(null);

  // 全局缩放/位移状态（共享给两张图片）
  const globalScale = useMotionValue(1);
  const globalX = useMotionValue(0);
  const globalY = useMotionValue(0);

  /**
   * 处理缩放变化
   */
  const handleScaleChange = useCallback(
    (newScale: number, centerX: number, centerY: number) => {
      // 限制缩放范围
      const clampedScale = Math.max(0.5, Math.min(3, newScale));

      // 获取当前缩放值
      const currentScale = globalScale.get();
      if (currentScale === 0) return;

      // 计算缩放比例
      const scaleRatio = clampedScale / currentScale;

      // 获取容器尺寸
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // 根据布局方向决定单张照片的容器尺寸
      const containerWidth = isHorizontalLayout ? rect.width : rect.width / 2;
      const containerHeight = isHorizontalLayout ? rect.height / 2 : rect.height;

      // 计算缩放中心点的相对位置（0-1）
      const relativeCenterX = centerX / containerWidth;
      const relativeCenterY = centerY / containerHeight;

      // 计算新的位移，保持缩放中心点位置
      const newX =
        centerX -
        relativeCenterX * containerWidth * scaleRatio +
        (globalX.get() - centerX + relativeCenterX * containerWidth) *
          scaleRatio;
      const newY =
        centerY -
        relativeCenterY * containerHeight * scaleRatio +
        (globalY.get() - centerY + relativeCenterY * containerHeight) *
          scaleRatio;

      // 应用新状态
      globalScale.set(clampedScale);
      globalX.set(newX);
      globalY.set(newY);
    },
    [globalScale, globalX, globalY, isHorizontalLayout]
  );

  /**
   * 处理平移变化
   */
  const handlePanChange = useCallback(
    (deltaX: number, deltaY: number) => {
      // 累加到全局位移
      globalX.set(globalX.get() + deltaX);
      globalY.set(globalY.get() + deltaY);
    },
    [globalX, globalY]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full w-full bg-slate-950 flex flex-col overflow-hidden"
    >
      {/* 顶部导航 */}
      <header className="flex-none flex items-center justify-between px-4 py-3 safe-area-top bg-slate-900/80 backdrop-blur-md border-b border-slate-800 mt-[60px]">
        <div>
          <h2 className="text-lg font-semibold text-white">照片对比</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {isHorizontalLayout ? '上下布局：横屏照片对比' : '左右布局：竖屏照片对比'} · 双指缩放同步
          </p>
        </div>
        <button
          onClick={onExit}
          className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </header>

      {/* 对比区域 - 根据宽高比自动切换布局 */}
      <main
        ref={containerRef}
        className={`flex-1 flex overflow-hidden ${isHorizontalLayout ? 'flex-col' : 'flex-row'}`}
      >
        {/* 第一张照片（当前/上） */}
        <div className={`flex-1 relative ${isHorizontalLayout ? 'border-b' : 'border-r'} border-slate-700`}>
          <SyncZoomImage
            photo={leftPhoto}
            url={leftUrl}
            globalScale={globalScale}
            globalX={globalX}
            globalY={globalY}
            onScaleChange={handleScaleChange}
            onPanChange={handlePanChange}
          />

          {/* 标签 */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white font-medium">
            {isHorizontalLayout ? '上' : '左'}
          </div>

          {/* 选它按钮 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={onSelectLeft}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              选它
            </motion.button>
          </div>
        </div>

        {/* 第二张照片（下一张/下） */}
        <div className="flex-1 relative">
          <SyncZoomImage
            photo={rightPhoto}
            url={rightUrl}
            globalScale={globalScale}
            globalX={globalX}
            globalY={globalY}
            onScaleChange={handleScaleChange}
            onPanChange={handlePanChange}
          />

          {/* 标签 */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white font-medium">
            {isHorizontalLayout ? '下' : '右'}
          </div>

          {/* 选它按钮 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={onSelectRight}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              选它
            </motion.button>
          </div>
        </div>
      </main>

      {/* 底部提示 */}
      <footer className="flex-none px-6 py-4 safe-area-bottom bg-slate-900/80 backdrop-blur-md border-t border-slate-800 text-center">
        <p className="text-slate-400 text-sm">
          双指捏合缩放 · 拖拽平移 · 双击重置
        </p>
      </footer>
    </motion.div>
  );
}
