import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserPhoto } from '../../types/photo';

interface PhotoDetailModalProps {
  photo: UserPhoto | null;
  isOpen: boolean;
  onClose: () => void;
}

const MIN_SCALE = 1;
// 双击放大的最大倍数（最多3倍）
const DOUBLE_TAP_MAX_SCALE = 3;
// 动态计算的最大缩放比例（基于照片原始尺寸，用于双指缩放）

export function PhotoDetailModal({
  photo,
  isOpen,
  onClose,
}: PhotoDetailModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  // 图片加载状态，用于淡入效果
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // 使用 ref 直接操作 DOM 实现高性能缩放和拖动
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const isPinchingRef = useRef(false);
  const isPanningRef = useRef(false);
  const startDistanceRef = useRef(0);
  const startScaleRef = useRef(1);
  const currentScaleRef = useRef(1);
  const lastTouchEndTimeRef = useRef(0);
  const touchCountRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const clickTimeoutRef = useRef<number | null>(null);
  const isDoubleTapRef = useRef(false);
  // 记录整个手势周期是否发生过操作（缩放/拖动），在 Touch Start 时重置，所有手指离开后重置
  const hasGestureOccurredRef = useRef(false);

  // 拖动相关的 refs
  const startTouchRef = useRef<{ x: number; y: number } | null>(null);
  const startTranslateRef = useRef({ x: 0, y: 0 });
  const currentTranslateRef = useRef({ x: 0, y: 0 });
  const imageSizeRef = useRef({ width: 0, height: 0 });
  const containerSizeRef = useRef({ width: 0, height: 0 });
  // 动态计算的最大缩放比例（基于照片原始尺寸）
  const maxScaleRef = useRef(3);

  // 预加载图片
  const preloadImage = useCallback((imageUrl: string): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // 即使失败也继续
      img.src = imageUrl;
    });
  }, []);

  // 生成图片 URL - 优先使用 localUrl (webPath)
  useEffect(() => {
    if (!isOpen || !photo) return;

    // 优先使用 localUrl (webPath)，可立即显示
    if (photo.localUrl) {
      // 预加载完成后再显示，避免加载中的空白
      preloadImage(photo.localUrl).then(() => {
        setUrl(photo.localUrl);
      });
      return;
    }
    // 否则使用 blobData
    if (photo.blobData) {
      const newUrl = URL.createObjectURL(photo.blobData);
      preloadImage(newUrl).then(() => {
        setUrl(newUrl);
      });
      return () => URL.revokeObjectURL(newUrl);
    }
  }, [photo?.localUrl, photo?.blobData, isOpen, preloadImage]);

  // 关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setTranslateX(0);
      setTranslateY(0);
      setIsImageLoaded(false);
      currentScaleRef.current = 1;
      currentTranslateRef.current = { x: 0, y: 0 };
      isPinchingRef.current = false;
      isPanningRef.current = false;
      isDraggingRef.current = false;
      isDoubleTapRef.current = false;
      hasGestureOccurredRef.current = false;
      startTouchRef.current = null;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      if (imageWrapperRef.current) {
        imageWrapperRef.current.style.transform = 'scale(1) translate(0px, 0px)';
      }
    }
  }, [isOpen]);

  // 获取容器和图片原始尺寸（scale=1 时的尺寸）
  const updateDimensions = useCallback(() => {
    if (imageWrapperRef.current) {
      const container = imageWrapperRef.current.parentElement;
      if (container) {
        containerSizeRef.current = {
          width: container.clientWidth,
          height: container.clientHeight,
        };
      }
      const img = imageWrapperRef.current.querySelector('img');
      if (img) {
        // 获取图片的自然尺寸（原始尺寸）
        const naturalWidth = (img as HTMLImageElement).naturalWidth;
        const naturalHeight = (img as HTMLImageElement).naturalHeight;

        if (naturalWidth > 0 && naturalHeight > 0) {
          // 计算图片在 scale=1 时的实际显示尺寸（考虑 object-fit: contain）
          const containerAspect = containerSizeRef.current.width / containerSizeRef.current.height;
          const imageAspect = naturalWidth / naturalHeight;

          let baseWidth: number;
          let baseHeight: number;

          if (imageAspect > containerAspect) {
            // 图片更宽，以容器宽度为基准
            baseWidth = containerSizeRef.current.width;
            baseHeight = baseWidth / imageAspect;
          } else {
            // 图片更高，以容器高度为基准
            baseHeight = containerSizeRef.current.height;
            baseWidth = baseHeight * imageAspect;
          }

          imageSizeRef.current = {
            width: baseWidth,
            height: baseHeight,
          };

          // 计算最大缩放比例：最大可以放大到原始尺寸
          // 即 maxScale = max(原始宽度/显示宽度, 原始高度/显示高度)
          const scaleX = naturalWidth / baseWidth;
          const scaleY = naturalHeight / baseHeight;
          maxScaleRef.current = Math.max(scaleX, scaleY);
          console.log('[updateDimensions] maxScale:', maxScaleRef.current, 'natural:', naturalWidth, 'x', naturalHeight, 'display:', baseWidth, 'x', baseHeight);
        }
      }
    }
  }, []);

  // 计算拖动边界
  const clampTranslate = useCallback((x: number, y: number, scaleValue: number) => {
    if (scaleValue <= 1) return { x: 0, y: 0 };

    const scaledImageWidth = imageSizeRef.current.width * scaleValue;
    const scaledImageHeight = imageSizeRef.current.height * scaleValue;

    // 计算可拖动的最大距离
    const maxX = Math.max(0, (scaledImageWidth - containerSizeRef.current.width) / 2);
    const maxY = Math.max(0, (scaledImageHeight - containerSizeRef.current.height) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // 计算哪些方向可以拖动
  const getPanDirections = useCallback((scaleValue: number) => {
    if (scaleValue <= 1) return { canPanX: false, canPanY: false };

    const scaledImageWidth = imageSizeRef.current.width * scaleValue;
    const scaledImageHeight = imageSizeRef.current.height * scaleValue;

    // 只有在缩放后的图片尺寸大于容器尺寸时，才允许在该方向拖动
    const canPanX = scaledImageWidth > containerSizeRef.current.width;
    const canPanY = scaledImageHeight > containerSizeRef.current.height;

    return { canPanX, canPanY };
  }, []);

  // 应用缩放边界
  const clampScale = useCallback((targetScale: number) => {
    return Math.max(MIN_SCALE, Math.min(maxScaleRef.current, targetScale));
  }, []);

  // 直接设置 DOM transform，无延迟
  const applyTransform = useCallback((targetScale: number, x: number, y: number) => {
    if (imageWrapperRef.current) {
      imageWrapperRef.current.style.transform = `translate(${x}px, ${y}px) scale(${targetScale})`;
    }
  }, []);

  // 使用 requestAnimationFrame 节流更新 React state
  const updateScaleState = useCallback((targetScale: number) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      setScale(targetScale);
    });
  }, []);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Touch Start 处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // 只有当是第一个手指时，才重置手势状态
    if (e.touches.length === 1) {
      hasGestureOccurredRef.current = false;
      isDraggingRef.current = false;
    }
    touchCountRef.current = e.touches.length;

    // 双指缩放开始
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      startDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      startScaleRef.current = currentScaleRef.current;
      return;
    }

    // 单指拖动开始（仅在放大状态下）
    if (e.touches.length === 1 && currentScaleRef.current > 1) {
      isPanningRef.current = true;
      startTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      startTranslateRef.current = { ...currentTranslateRef.current };
      updateDimensions();
    }
  }, [updateDimensions]);

  // Touch Move 处理 - 直接操作 DOM，无 React 延迟
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // 双指缩放
    if (e.touches.length === 2 && isPinchingRef.current) {
      e.preventDefault();

      // 标记为发生了手势操作（缩放），不应触发单击
      hasGestureOccurredRef.current = true;
      isDraggingRef.current = true;

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);

      const scaleRatio = currentDistance / startDistanceRef.current;
      const newScale = clampScale(startScaleRef.current * scaleRatio);

      // 直接更新 DOM，零延迟
      currentScaleRef.current = newScale;
      const clampedTranslate = clampTranslate(
        currentTranslateRef.current.x,
        currentTranslateRef.current.y,
        newScale
      );
      currentTranslateRef.current = clampedTranslate;
      applyTransform(newScale, clampedTranslate.x, clampedTranslate.y);
      updateScaleState(newScale);
      return;
    }

    // 单指拖动（仅在放大状态下）
    if (e.touches.length === 1 && isPanningRef.current && currentScaleRef.current > 1) {
      e.preventDefault();

      const touch = e.touches[0];
      const deltaX = touch.clientX - (startTouchRef.current?.x ?? 0);
      const deltaY = touch.clientY - (startTouchRef.current?.y ?? 0);

      // 如果实际发生了移动，标记为拖动状态
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        hasGestureOccurredRef.current = true;
        isDraggingRef.current = true;
      }

      // 获取可拖动方向
      const { canPanX, canPanY } = getPanDirections(currentScaleRef.current);

      const newX = canPanX ? startTranslateRef.current.x + deltaX : startTranslateRef.current.x;
      const newY = canPanY ? startTranslateRef.current.y + deltaY : startTranslateRef.current.y;

      // 应用边界限制
      const clamped = clampTranslate(newX, newY, currentScaleRef.current);
      currentTranslateRef.current = clamped;

      // 直接更新 DOM
      applyTransform(currentScaleRef.current, clamped.x, clamped.y);

      setTranslateX(clamped.x);
      setTranslateY(clamped.y);
    }
  }, [clampScale, clampTranslate, applyTransform, updateScaleState]);

  // Touch End 处理
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now();

    // 双指结束，回弹处理
    if (isPinchingRef.current && e.touches.length < 2) {
      isPinchingRef.current = false;

      const clampedScale = clampScale(currentScaleRef.current);
      currentScaleRef.current = clampedScale;

      // 如果缩放回 1，重置位置
      if (clampedScale <= 1) {
        currentTranslateRef.current = { x: 0, y: 0 };
        setTranslateX(0);
        setTranslateY(0);
      }

      // 使用 CSS transition 实现平滑回弹
      if (imageWrapperRef.current) {
        imageWrapperRef.current.style.transition = 'transform 0.2s ease-out';
        applyTransform(clampedScale, currentTranslateRef.current.x, currentTranslateRef.current.y);
        // 清除 transition
        setTimeout(() => {
          if (imageWrapperRef.current) {
            imageWrapperRef.current.style.transition = '';
          }
        }, 200);
      }
      updateScaleState(clampedScale);

      // 双指操作结束后，标记为不应触发单击
      // 只有最后一个手指也离开屏幕时才重置
      if (e.touches.length === 0) {
        isDraggingRef.current = true;
      }
    }

    // 拖动结束
    if (isPanningRef.current && e.touches.length === 0) {
      isPanningRef.current = false;
      startTouchRef.current = null;

      // 应用边界限制并平滑回弹
      const clamped = clampTranslate(
        currentTranslateRef.current.x,
        currentTranslateRef.current.y,
        currentScaleRef.current
      );

      if (clamped.x !== currentTranslateRef.current.x || clamped.y !== currentTranslateRef.current.y) {
        currentTranslateRef.current = clamped;
        setTranslateX(clamped.x);
        setTranslateY(clamped.y);

        if (imageWrapperRef.current) {
          imageWrapperRef.current.style.transition = 'transform 0.2s ease-out';
          applyTransform(currentScaleRef.current, clamped.x, clamped.y);
          setTimeout(() => {
            if (imageWrapperRef.current) {
              imageWrapperRef.current.style.transition = '';
            }
          }, 200);
        }
      }

      // 拖动结束后，标记为不应触发单击
      isDraggingRef.current = true;
    }

    // 双击检测 - 时间阈值 300ms
    const DOUBLE_TAP_THRESHOLD = 300;
    const timeSinceLastTouch = now - lastTouchEndTimeRef.current;
    const isDoubleTap = timeSinceLastTouch < DOUBLE_TAP_THRESHOLD && touchCountRef.current === 1 && lastTouchEndTimeRef.current > 0;

    if (isDoubleTap) {
      // 检测到双击，标记为双击并取消单击 timeout
      isDoubleTapRef.current = true;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      const willZoomIn = currentScaleRef.current <= MIN_SCALE * 1.05;
      // 双击放大：最多放大3倍，如果原始尺寸不足3倍则按实际能放大的比例
      const targetScale = Math.min(maxScaleRef.current, DOUBLE_TAP_MAX_SCALE);
      const newScale = willZoomIn ? targetScale : MIN_SCALE;
      currentScaleRef.current = newScale;

      // 双击放大时，如果放大则保持当前位置，如果缩小则重置位置
      if (!willZoomIn) {
        currentTranslateRef.current = { x: 0, y: 0 };
        setTranslateX(0);
        setTranslateY(0);
      } else {
        updateDimensions();
      }

      // 双击使用平滑动画
      if (imageWrapperRef.current) {
        imageWrapperRef.current.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        applyTransform(newScale, currentTranslateRef.current.x, currentTranslateRef.current.y);
        setTimeout(() => {
          if (imageWrapperRef.current) {
            imageWrapperRef.current.style.transition = '';
          }
        }, 250);
      }
      setScale(newScale);
      lastTouchEndTimeRef.current = 0;

      // 重置双击标记（延迟，防止影响后续操作）
      setTimeout(() => {
        isDoubleTapRef.current = false;
      }, 100);
    } else {
      // 不是双击，检查是否发生了手势操作
      // 如果发生了缩放或拖动，不触发单击关闭
      if (hasGestureOccurredRef.current) {
        // 发生了手势操作，重置状态但不触发单击
        lastTouchEndTimeRef.current = now;
      } else {
        // 没有发生手势操作，设置单击 timeout
        lastTouchEndTimeRef.current = now;
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        // 增加单击延迟到 300ms，与双击检测窗口保持一致
        clickTimeoutRef.current = window.setTimeout(() => {
          // 执行单击操作（关闭弹窗）
          // 只有当没有进行任何手势操作时才关闭
          if (!hasGestureOccurredRef.current && !isDoubleTapRef.current) {
            handleClose();
          }
          clickTimeoutRef.current = null;
        }, 300);
      }
    }

    // 只有当所有手指都离开后才重置手势状态
    if (e.touches.length === 0) {
      touchCountRef.current = 0;
      isDraggingRef.current = false;
      hasGestureOccurredRef.current = false;
    }
  }, [clampScale, clampTranslate, applyTransform, updateScaleState, updateDimensions, handleClose]);


  // 清理 RAF 和 timeout
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  if (!photo) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: '#2a2a2e' }}
        >
          {/* 图片展示区域 */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {url ? (
              <div
                ref={imageWrapperRef}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  willChange: 'transform',
                  transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                  opacity: isImageLoaded ? 1 : 0,
                  transition: 'opacity 0.15s ease-out',
                }}
              >
                <img
                  src={url}
                  alt="Photo"
                  onLoad={() => {
                    setIsImageLoaded(true);
                    updateDimensions();
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              </div>
            ) : (
              <div className="animate-pulse w-12 h-12 rounded-full bg-neutral-600" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
