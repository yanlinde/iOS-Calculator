import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import type { UserPhoto } from '../../types/photo';

interface PhotoCardProps {
  photo: UserPhoto;
  rowHeight: number;
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onPhotoClick?: (photo: UserPhoto) => void;
}

function PhotoCard({ photo, rowHeight, onSwipeLeft, onSwipeRight, onPhotoClick }: PhotoCardProps) {
  // 使用 useMemo 立即计算 URL，避免 useEffect 的延迟
  const url = useMemo(() => {
    if (photo.localUrl) {
      return photo.localUrl;
    }
    if (photo.blobData) {
      return URL.createObjectURL(photo.blobData);
    }
    return null;
  }, [photo.localUrl, photo.blobData]);

  // 清理 blob URL
  useEffect(() => {
    return () => {
      if (url && !photo.localUrl) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url, photo.localUrl]);

  const x = useMotionValue(0);

  // 当照片状态变化时，重置 motion value
  useEffect(() => {
    x.set(0);
  }, [photo.status, x]);

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
  const swipeThreshold = windowWidth * 0.15;

  // 背景透明度
  const leftBgOpacity = useTransform(x, [-swipeThreshold, 0], [1, 0]);
  const rightBgOpacity = useTransform(x, [0, swipeThreshold], [0, 1]);

  const animateSwipe = useCallback((direction: 'left' | 'right') => {
    const targetX = direction === 'left' ? -windowWidth : windowWidth;

    const isRedundant =
      (direction === 'left' && photo.status === 'passed') ||
      (direction === 'right' && photo.status === 'normal');

    if (isRedundant) {
      animate(x, targetX, {
        duration: 0.2,
        ease: 'easeIn',
        onComplete: () => {
          x.set(0);
        }
      });
    } else {
      animate(x, targetX, {
        duration: 0.2,
        ease: 'easeIn',
        onComplete: () => {
          if (direction === 'left') {
            onSwipeLeft(photo.id);
          } else {
            onSwipeRight(photo.id);
          }
        }
      });
    }
  }, [x, windowWidth, photo.id, onSwipeLeft, onSwipeRight, photo.status]);

  const bind = useDrag(
    (state) => {
      const { movement: [mx], down, tap, elapsedTime } = state;

      if (tap && elapsedTime < 200) {
        onPhotoClick?.(photo);
        return;
      }

      const isLeftSwipe = mx < 0;
      const isRightSwipe = mx > 0;

      if (photo.status === 'passed' && isLeftSwipe) {
        if (!down) {
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
        }
        return;
      }

      if (photo.status === 'normal' && isRightSwipe) {
        if (!down) {
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
        }
        return;
      }

      if (down) {
        x.set(mx);
      } else {
        const distanceX = Math.abs(mx);
        if (distanceX > swipeThreshold) {
          animateSwipe(mx > 0 ? 'right' : 'left');
        } else {
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
        }
      }
    },
    {
      axis: 'x',
      preventScroll: false,
      pointer: { touch: true },
      filterTaps: true,
      tap: { threshold: 10 },
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const bindProps = bind();

  if (!url) {
    return (
      <div
        className="flex items-center justify-center bg-black"
        style={{ height: rowHeight }}
      >
        <div className="animate-pulse w-6 h-6 rounded-full bg-neutral-700" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden select-none" style={{ height: rowHeight }}>
      {/* 背景层 - 左滑红色（淘汰） */}
      <motion.div
        style={{ opacity: leftBgOpacity }}
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-3"
      >
        <span className="text-white font-bold text-sm">淘汰</span>
      </motion.div>

      {/* 背景层 - 右滑蓝色（恢复） */}
      <motion.div
        style={{ opacity: rightBgOpacity }}
        className="absolute inset-0 bg-blue-500 flex items-center justify-start pl-3"
      >
        <span className="text-white font-bold text-sm">恢复</span>
      </motion.div>

      {/* 照片层 - 可拖动 */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <motion.div
        {...bindProps as any}
        style={{ x, touchAction: 'pan-y', position: 'relative', zIndex: 10 }}
        className="w-full h-full bg-black flex items-center justify-center"
      >
        <img
          src={url}
          alt="Photo"
          className="w-full h-full"
          style={{ objectFit: 'contain', filter: photo.status === 'passed' ? 'saturate(0.7)' : undefined }}
          draggable={false}
          loading="lazy"
        />
        {/* 已淘汰照片遮罩 - 灰色半透明 */}
        {photo.status === 'passed' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: 'rgba(42, 42, 46, 0.5)' }}
          />
        )}
      </motion.div>
    </div>
  );
}

interface DoubleColumnGridProps {
  photos: UserPhoto[];
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onPhotoClick?: (photo: UserPhoto) => void;
}

const MAX_ROW_HEIGHT = 320;
const MIN_ROW_HEIGHT = 120; // 最小行高
const DEFAULT_ROW_HEIGHT = 200; // 默认行高（用于虚拟滚动预估）
const GAP = 1;

export function DoubleColumnGrid({ photos, onSwipeLeft, onSwipeRight, onPhotoClick }: DoubleColumnGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 将照片分成每行2个
  const rows = useMemo(() => {
    const result: UserPhoto[][] = [];
    for (let i = 0; i < photos.length; i += 2) {
      const row = [photos[i]];
      if (i + 1 < photos.length) {
        row.push(photos[i + 1]);
      }
      result.push(row);
    }
    return result;
  }, [photos]);

  // 预估行高（用于虚拟滚动的初始高度）
  const estimateSize = useCallback(() => DEFAULT_ROW_HEIGHT, []);

  // 虚拟滚动
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 3, // 预渲染上下各3行
    gap: GAP,
  });

  // 计算实际行高（每行根据照片比例计算）
  const rowHeights = useMemo(() => {
    const containerWidth = typeof window !== 'undefined' ? window.innerWidth / 2 - GAP / 2 : 187;

    return rows.map((row) => {
      let maxHeight = MIN_ROW_HEIGHT;

      row.forEach((photo) => {
        const { width, height } = photo.dimensions;
        if (width && height) {
          const scaledHeight = (height / width) * containerWidth;
          maxHeight = Math.max(maxHeight, scaledHeight);
        }
      });

      return Math.min(maxHeight, MAX_ROW_HEIGHT);
    });
  }, [rows]);

  // 当行高变化时重新测量
  useEffect(() => {
    virtualizer.measure();
  }, [rowHeights, virtualizer]);

  if (photos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-400">
        没有待筛选的照片
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ backgroundColor: '#2a2a2e' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((virtualRow) => {
            const rowIndex = virtualRow.index;
            const row = rows[rowIndex];
            const rowHeight = rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT;

            return (
              <div
                key={`row-${rowIndex}`}
                data-index={rowIndex}
                ref={virtualizer.measureElement}
                className="flex"
                style={{
                  gap: `${GAP}px`,
                  height: rowHeight,
                  marginBottom: GAP,
                }}
              >
                {row.map((photo) => (
                  <div key={photo.id} className="flex-1">
                    <PhotoCard
                      photo={photo}
                      rowHeight={rowHeight}
                      onSwipeLeft={onSwipeLeft}
                      onSwipeRight={onSwipeRight}
                      onPhotoClick={onPhotoClick}
                    />
                  </div>
                ))}
                {/* 如果行内只有1张照片，补齐空白占位 */}
                {row.length === 1 && <div className="flex-1 bg-neutral-900" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
