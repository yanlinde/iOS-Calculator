import { useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import type { UserPhoto } from '../../types/photo';

interface SwipeListItemProps {
  photo: UserPhoto;
  index: number;
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onPhotoClick?: (photo: UserPhoto) => void;
}

// 根据照片比例计算容器高度（横图时减小高度）
const MAX_HEIGHT = 480;
const MIN_HEIGHT = 280;

function calculateContainerHeight(width: number, height: number): number {
  if (!width || !height) return MAX_HEIGHT;

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
  const aspectRatio = height / width;

  // 根据屏幕宽度和照片比例计算高度
  const calculatedHeight = windowWidth * aspectRatio;

  // 限制在最小和最大高度之间
  return Math.max(MIN_HEIGHT, Math.min(calculatedHeight, MAX_HEIGHT));
}

function SwipeListItem({
  photo,
  index,
  onSwipeLeft,
  onSwipeRight,
  onPhotoClick,
}: SwipeListItemProps) {
  const [url, setUrl] = useState<string | null>(null);

  // 根据照片比例计算容器高度
  const containerHeight = calculateContainerHeight(
    photo.dimensions.width,
    photo.dimensions.height
  );

  useEffect(() => {
    // 优先使用 localUrl (webPath)，可立即显示
    if (photo.localUrl) {
      setUrl(photo.localUrl);
      return;
    }
    // 否则使用 blobData
    if (photo.blobData) {
      const newUrl = URL.createObjectURL(photo.blobData);
      setUrl(newUrl);
      return () => URL.revokeObjectURL(newUrl);
    }
  }, [photo.localUrl, photo.blobData]);

  const x = useMotionValue(0);

  // 当照片状态变化时，重置 motion value
  useEffect(() => {
    x.set(0);
  }, [photo.status, x]);

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
  const swipeThreshold = windowWidth * 0.25;

  // 背景透明度：与双列视图保持一致
  const leftBgOpacity = useTransform(x, [-swipeThreshold, 0], [1, 0]);
  const rightBgOpacity = useTransform(x, [0, swipeThreshold], [0, 1]);

  const animateSwipe = useCallback((direction: 'left' | 'right') => {
    const targetX = direction === 'left' ? -windowWidth : windowWidth;

    // 检查是否是重复操作（同一状态）
    const isRedundant =
      (direction === 'left' && photo.status === 'passed') ||
      (direction === 'right' && photo.status === 'normal');

    if (isRedundant) {
      // 重复操作：先飞出去，然后重置回原点
      animate(x, targetX, {
        duration: 0.2,
        ease: 'easeIn',
        onComplete: () => {
          // 重置位置，但不触发状态变更
          x.set(0);
        }
      });
    } else {
      // 正常操作：飞出去并更新状态
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

      // 点击检测：只有当没有拖动（tap为true）且时间很短时才认为是点击
      if (tap && elapsedTime < 200) {
        onPhotoClick?.(photo);
        return;
      }

      // 新逻辑：
      // - normal 照片：只支持左滑（淘汰）
      // - passed 照片：只支持右滑（恢复为 normal）
      const isLeftSwipe = mx < 0;
      const isRightSwipe = mx > 0;

      if (photo.status === 'passed' && isLeftSwipe) {
        // passed 照片禁止左滑
        if (!down) {
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
        }
        return;
      }

      if (photo.status === 'normal' && isRightSwipe) {
        // normal 照片禁止右滑
        if (!down) {
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
        }
        return;
      }

      if (down) {
        // 拖动时：movement 与手指位移1:1，实现真正的跟手
        x.set(mx);
      } else {
        // 释放时：判断是否超过阈值
        const distanceX = Math.abs(mx);

        if (distanceX > swipeThreshold) {
          if (mx > 0) {
            animateSwipe('right');
          } else {
            animateSwipe('left');
          }
          return;
        }

        // 未超过阈值，回弹
        animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
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
      <div className="w-full flex items-center justify-center bg-black" style={{ height: containerHeight }}>
        <div className="animate-pulse w-8 h-8 rounded-full bg-neutral-700" />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden select-none">
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

      {/* 照片层 - 可拖动，高度根据照片比例动态计算 */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <motion.div
        {...bindProps as any}
        style={{ x, touchAction: 'pan-y', height: containerHeight, position: 'relative', zIndex: 10 }}
        className="w-full bg-black flex items-center justify-center"
      >
        <img
          src={url}
          alt={`Photo ${index + 1}`}
          className="w-full h-full object-contain"
          draggable={false}
          style={{ filter: photo.status === 'passed' ? 'saturate(0.7)' : undefined }}
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

interface SwipeListProps {
  photos: UserPhoto[];
  onSwipeLeft: (id: string) => void;
  onSwipeRight: (id: string) => void;
  onPhotoClick?: (photo: UserPhoto) => void;
}

export function SwipeList({
  photos,
  onSwipeLeft,
  onSwipeRight,
  onPhotoClick,
}: SwipeListProps) {
  if (photos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        没有待筛选的照片
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#2a2a2e' }}>
      <div className="flex flex-col" style={{ gap: '1px' }}>
        {photos.map((photo, index) => (
          <SwipeListItem
            key={photo.id}
            photo={photo}
            index={index}
            onSwipeLeft={onSwipeLeft}
            onSwipeRight={onSwipeRight}
            onPhotoClick={onPhotoClick}
          />
        ))}
      </div>
    </div>
  );
}
