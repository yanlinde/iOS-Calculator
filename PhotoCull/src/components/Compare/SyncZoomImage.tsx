import { useRef } from 'react';
import { motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import type { UserPhoto } from '../../types/photo';

interface SyncZoomImageProps {
  photo: UserPhoto;
  url: string | null;
  /** 全局缩放值 (MotionValue) */
  globalScale: MotionValue<number>;
  /** 全局 X 位移 (MotionValue) */
  globalX: MotionValue<number>;
  /** 全局 Y 位移 (MotionValue) */
  globalY: MotionValue<number>;
  /** 当缩放变化时触发 (scale, centerX, centerY) */
  onScaleChange?: (scale: number, centerX: number, centerY: number) => void;
  /** 当平移变化时触发 (deltaX, deltaY) */
  onPanChange?: (deltaX: number, deltaY: number) => void;
  /** 是否激活 */
  isActive?: boolean;
}

/**
 * 同步缩放图片组件
 *
 * 核心功能：
 * 1. 接收全局缩放/位移状态并应用
 * 2. 处理手势（捏合缩放、拖拽平移）
 * 3. 将手势转换为全局状态变更
 */
export function SyncZoomImage({
  photo,
  url,
  globalScale,
  globalX,
  globalY,
  onScaleChange,
  onPanChange,
  isActive = true,
}: SyncZoomImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 本地手势状态（用于流畅的手势响应）
  const localScale = useMotionValue(1);
  const localX = useMotionValue(0);
  const localY = useMotionValue(0);

  // 合并全局和本地状态
  const scale = useTransform(() => globalScale.get() * localScale.get());
  const x = useTransform(() => globalX.get() + localX.get());
  const y = useTransform(() => globalY.get() + localY.get());

  // 判断照片方向
  const isLandscape = photo.dimensions.width > photo.dimensions.height;

  // 处理手势
  const bind = useGesture(
    {
      // 拖拽平移
      onDrag: ({ offset: [ox, oy], delta: [dx, dy], pinching }) => {
        if (pinching) return; // 捏合时不处理拖拽

        localX.set(ox);
        localY.set(oy);

        // 同步到全局
        onPanChange?.(dx, dy);
      },
      onDragEnd: ({ offset: [ox, oy] }) => {
        // 拖拽结束时，将本地状态合并到全局
        globalX.set(globalX.get() + ox);
        globalY.set(globalY.get() + oy);
        localX.set(0);
        localY.set(0);
      },

      // 捏合缩放
      onPinch: ({ offset: [s], origin: [ox, oy], first, memo }) => {
        if (first) {
          // 记录初始状态
          return {
            initialScale: globalScale.get(),
            initialX: globalX.get(),
            initialY: globalY.get(),
          };
        }

        if (!memo) return;

        // 计算新的缩放值
        const newScale = memo.initialScale * s;
        const clampedScale = Math.max(0.5, Math.min(3, newScale));

        // 计算缩放中心点（相对于容器）
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const centerX = ox - rect.left;
          const centerY = oy - rect.top;

          // 同步到全局
          onScaleChange?.(clampedScale, centerX, centerY);
        }

        return memo;
      },

      // 双击重置
      onDoubleClick: () => {
        globalScale.set(1);
        globalX.set(0);
        globalY.set(0);
        localScale.set(1);
        localX.set(0);
        localY.set(0);
      },
    },
    {
      drag: {
        enabled: isActive,
        from: () => [localX.get(), localY.get()],
      },
      pinch: {
        enabled: isActive,
        scaleBounds: { min: 0.5, max: 3 },
      },
    }
  );

  return (
    <div
      ref={containerRef}
      {...bind()}
      className="relative w-full h-full overflow-hidden bg-slate-900 touch-none"
      style={{ cursor: isActive ? 'grab' : 'default' }}
    >
      {url ? (
        <motion.img
          src={url}
          alt="Photo"
          className={`w-full h-full ${isLandscape ? 'object-cover' : 'object-contain'}`}
          draggable={false}
          style={{
            scale,
            x,
            y,
            transformOrigin: 'center center',
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-800">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-700" />
            <div className="text-slate-500">加载中...</div>
          </div>
        </div>
      )}

      {/* 缩放提示 */}
      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/70 pointer-events-none">
        双击重置
      </div>
    </div>
  );
}
