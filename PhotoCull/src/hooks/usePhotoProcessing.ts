import { useCallback, useRef, useState, useMemo } from 'react';
import { usePhotoStore } from '../stores/photoStore';
import type { UserPhoto } from '../types/photo';

interface UsePhotoProcessingOptions {
  photos: UserPhoto[];
  startPhotoId?: string | null;
  onComplete?: () => void;
}

interface UsePhotoProcessingReturn {
  // 状态
  remainingPhotos: UserPhoto[];
  isComplete: boolean;
  processedCount: number;
  canUndo: boolean;

  // 操作
  handleSwipeLeft: (id: string) => void;
  handleSwipeRight: (id: string) => void;
  handleUndo: () => void;
  handlePassAll: () => void;
  resetProcessing: () => void;
}

/**
 * 照片处理 Hook
 * 管理照片筛选流程的状态和逻辑
 *
 * 新逻辑：
 * - normal 照片：支持左滑淘汰
 * - passed 照片：支持右滑恢复为 normal
 */
export function usePhotoProcessing(options: UsePhotoProcessingOptions): UsePhotoProcessingReturn {
  const { photos, startPhotoId } = options;

  // 本地状态
  const [isComplete, setIsComplete] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Store 操作
  const updatePhotoStatus = usePhotoStore((state) => state.updatePhotoStatus);
  const undoLastAction = usePhotoStore((state) => state.undoLastAction);
  const passAllPhotos = usePhotoStore((state) => state.passAllPhotos);
  const getNormalPhotos = usePhotoStore((state) => state.getNormalPhotos);

  // Refs
  const processedIdsRef = useRef<Set<string>>(new Set());
  const sortedPhotosRef = useRef<UserPhoto[]>([]);
  const lastStartPhotoIdRef = useRef<string | null | undefined>(null);

  // 检测新会话
  const isNewSession = startPhotoId !== lastStartPhotoIdRef.current;

  if (isNewSession) {
    processedIdsRef.current.clear();
    lastStartPhotoIdRef.current = startPhotoId;

    // 初始化排序
    if (photos.length === 0) {
      sortedPhotosRef.current = [];
    } else if (!startPhotoId) {
      sortedPhotosRef.current = [...photos];
    } else {
      const startIndex = photos.findIndex((p) => p.id === startPhotoId);
      if (startIndex <= 0) {
        sortedPhotosRef.current = [...photos];
      } else {
        sortedPhotosRef.current = [
          ...photos.slice(startIndex),
          ...photos.slice(0, startIndex),
        ];
      }
    }
  }

  // 确保初始值
  if (sortedPhotosRef.current.length === 0 && photos.length > 0) {
    sortedPhotosRef.current = [...photos];
  }

  // 剩余照片
  const remainingPhotos = useMemo(() => {
    return sortedPhotosRef.current.filter((p) => !processedIdsRef.current.has(p.id));
  }, [refreshCounter]);

  // 是否可以撤销
  const canUndo = processedIdsRef.current.size > 0;

  // 处理单张照片 - 左滑淘汰（仅 normal 照片支持）
  const handleSwipeLeft = useCallback((id: string) => {
    updatePhotoStatus(id, 'passed');
    processedIdsRef.current.add(id);
    setRefreshCounter((prev) => prev + 1);

    // 使用 store 获取实际 normal 数量（状态已更新）
    const normalPhotos = getNormalPhotos();

    // 如果只剩0张 normal，标记完成
    if (normalPhotos.length === 0) {
      setIsComplete(true);
    }
  }, [updatePhotoStatus, getNormalPhotos]);

  // 处理单张照片 - 右滑恢复为 normal（仅 passed 照片支持）
  const handleSwipeRight = useCallback((id: string) => {
    updatePhotoStatus(id, 'normal');
    processedIdsRef.current.add(id);
    setRefreshCounter((prev) => prev + 1);

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [updatePhotoStatus]);

  // 撤销
  const handleUndo = useCallback(() => {
    const lastProcessedId = Array.from(processedIdsRef.current).pop();
    if (lastProcessedId) {
      undoLastAction();
      processedIdsRef.current.delete(lastProcessedId);
      setRefreshCounter((prev) => prev + 1);
      setIsComplete(false);
    }
  }, [undoLastAction]);

  // 全部淘汰
  const handlePassAll = useCallback(() => {
    passAllPhotos();
    remainingPhotos.forEach((photo) => {
      processedIdsRef.current.add(photo.id);
    });
    setRefreshCounter((prev) => prev + 1);
    setIsComplete(true);
  }, [passAllPhotos, remainingPhotos]);

  // 重置
  const resetProcessing = useCallback(() => {
    processedIdsRef.current.clear();
    setRefreshCounter(0);
    setIsComplete(false);
  }, []);

  return {
    remainingPhotos,
    isComplete,
    processedCount: processedIdsRef.current.size,
    canUndo,
    handleSwipeLeft,
    handleSwipeRight,
    handleUndo,
    handlePassAll,
    resetProcessing,
  };
}
