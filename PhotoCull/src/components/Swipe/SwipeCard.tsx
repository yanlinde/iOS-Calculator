import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import type { UserPhoto } from '../../types/photo';

interface SwipeCardProps {
  photo: UserPhoto;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  hasNextPhoto?: boolean;
  isActive?: boolean;
  style?: React.CSSProperties;
}

/**
 * 可滑动卡片组件
 *
 * 核心功能：
 * 1. 手势拖拽：使用 @use-gesture/react 处理滑动
 * 2. 动画效果：使用 framer-motion 实现飞入飞出
 * 3. 视觉反馈：滑动时显示红/蓝色遮罩
 * 4. 阈值判断：超过屏幕宽度 30% 触发决策
 */
export function SwipeCard({
  photo,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  hasNextPhoto = false,
  isActive = true,
  style,
}: SwipeCardProps) {
  // 直接创建 URL，不使用 state 和 useEffect
  const url = useMemo(() => {
    if (photo.blobData) {
      return URL.createObjectURL(photo.blobData);
    }
    return null;
  }, [photo.id]);

  // 组件卸载时清理 URL
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  // 获取屏幕尺寸（用于计算阈值）
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
  const swipeThreshold = windowWidth * 0.25; // 25% 屏幕宽度触发
  const swipeUpThreshold = windowHeight * 0.2; // 20% 屏幕高度触发向上滑动

  // 动画控制
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-windowWidth, 0, windowWidth], [-15, 0, 15]);

  // 遮罩透明度
  const leftOverlayOpacity = useTransform(x, [-swipeThreshold, 0], [1, 0]);
  const rightOverlayOpacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  // 下滑遮罩透明度（y > 0 表示向下滑动）
  const downOverlayOpacity = useTransform(y, [0, swipeUpThreshold], [0, 1]);

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);

  // 卡片容器 ref
  const cardRef = useRef<HTMLDivElement>(null);

  /**
   * 执行滑出动画
   */
  const animateSwipe = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      if (direction === 'up') {
        // 向上滑动触发对比
        animate(y, -windowHeight, {
          duration: 0.25,
          ease: 'easeIn',
          onComplete: () => {
            onSwipeUp?.();
            animate(y, 0, { duration: 0 });
          },
        });
        return;
      }

      if (direction === 'down') {
        // 向下滑动跳过当前照片
        animate(y, windowHeight, {
          duration: 0.25,
          ease: 'easeIn',
          onComplete: () => {
            onSwipeDown?.();
            animate(y, 0, { duration: 0 });
          },
        });
        return;
      }

      const targetX = direction === 'left' ? -windowWidth - 100 : windowWidth + 100;

      // 执行飞出动画
      animate(x, targetX, {
        duration: 0.25,
        ease: 'easeIn',
        onComplete: () => {
          if (direction === 'left') {
            onSwipeLeft();
          } else {
            onSwipeRight();
          }
        },
      });

      animate(y, 50, { duration: 0.25, ease: 'easeIn' });
    },
    [windowWidth, windowHeight, x, y, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  /**
   * 处理拖拽手势
   */
  const bind = useDrag(
    (state) => {
      const {
        movement: [, my],
        velocity: [vx],
        direction: [dx],
        offset: [ox],
        down,
        tap,
      } = state;

      // 点击不处理
      if (tap) return;

      // 更新拖拽状态
      setIsDragging(down);

      if (down) {
        // 拖拽中：跟随手指
        x.set(ox);
        y.set(my * 0.3); // Y轴移动幅度较小
      } else {
        // 拖拽结束：判断是否触发决策
        const velocityX = Math.abs(vx);
        const velocityY = Math.abs(state.velocity[1]);
        const distanceX = Math.abs(ox);
        const distanceY = Math.abs(my);
        const isFastSwipeX = velocityX > 0.5;
        const isFastSwipeY = velocityY > 0.5;

        // 检查向上滑动（对比模式）
        if (hasNextPhoto && onSwipeUp && (distanceY > swipeUpThreshold || isFastSwipeY) && my < 0) {
          animateSwipe('up');
          return;
        }

        // 检查向下滑动（跳过当前照片）
        if (distanceY > swipeUpThreshold || isFastSwipeY) {
          if (my > 0) {
            // my > 0 表示向下滑动
            animateSwipe('down');
            return;
          }
        }

        // 检查左右滑动
        if (distanceX > swipeThreshold || isFastSwipeX) {
          // 触发滑出
          const direction = ox > 0 || (dx > 0 && isFastSwipeX) ? 'right' : 'left';
          animateSwipe(direction);
        } else {
          // 回弹到中心
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
          animate(y, 0, { type: 'spring', stiffness: 300, damping: 25 });
        }
      }
    },
    {
      axis: undefined, // 允许自由方向拖拽
      bounds: { left: -windowWidth, right: windowWidth, top: -windowHeight, bottom: windowHeight },
      rubberband: 0.1,
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const bindProps = bind() as any;

  return (
    <motion.div
      ref={cardRef}
      {...bindProps}
      style={{
        x,
        y,
        rotate,
        cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
        ...style,
      }}
      className="absolute inset-0 flex items-center justify-center touch-none select-none"
    >
      {/* 卡片容器 - 自适应照片比例，全宽显示 */}
      <div className="relative w-full bg-slate-900 overflow-hidden shadow-2xl">
        {/* 照片显示 - 始终按原始比例完整展示 */}
        {url ? (
          <img
            src={url}
            alt="Photo"
            className="w-full h-auto object-contain bg-black"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-700" />
              <div className="text-slate-500">加载中...</div>
            </div>
          </div>
        )}

        {/* 左滑遮罩（淘汰） */}
        <motion.div
          style={{ opacity: leftOverlayOpacity }}
          className="absolute inset-0 bg-gradient-to-r from-red-500/40 to-transparent flex items-center justify-start p-8"
        >
          <div className="bg-red-500 rounded-full p-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </motion.div>

        {/* 右滑遮罩（保留） */}
        <motion.div
          style={{ opacity: rightOverlayOpacity }}
          className="absolute inset-0 bg-gradient-to-l from-blue-500/40 to-transparent flex items-center justify-end p-8"
        >
          <div className="bg-blue-500 rounded-full p-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </motion.div>

        {/* 下滑遮罩（跳过） */}
        <motion.div
          style={{ opacity: downOverlayOpacity }}
          className="absolute inset-0 bg-gradient-to-b from-yellow-500/40 to-transparent flex items-start justify-center pt-8"
        >
          <div className="bg-yellow-500 rounded-full p-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </motion.div>

        {/* 照片信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="text-white/80 text-sm">
            {photo.creationTime
              ? new Date(photo.creationTime).toLocaleDateString('zh-CN')
              : '未知时间'}
          </div>
          <div className="text-white/60 text-xs mt-1">
            {photo.dimensions.width} × {photo.dimensions.height}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
