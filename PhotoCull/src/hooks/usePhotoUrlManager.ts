import { useRef, useCallback, useEffect } from 'react';

/**
 * 照片 URL 管理器 Hook
 *
 * 核心职责：
 * 1. 按需生成 URL.createObjectURL，避免一次性加载 500 张照片
 * 2. 及时销毁 URL.revokeObjectURL，防止内存泄漏
 * 3. 提供引用计数机制，确保安全释放
 *
 * 性能策略：
 * - 仅当照片进入视口时生成 URL
 * - 离开视口时延迟销毁（避免快速滚动时的频繁创建销毁）
 * - 组件卸载时批量清理所有 URL
 */
export function usePhotoUrlManager() {
  // 存储所有活跃的 URL 映射: photoId -> { url, blob }
  const urlMapRef = useRef<Map<string, { url: string; blob: Blob }>>(new Map());

  // 追踪即将被销毁的 URL（用于延迟清理）
  const pendingRevokeRef = useRef<Set<string>>(new Set());

  // 延迟清理的定时器
  const revokeTimerRef = useRef<number | null>(null);

  /**
   * 获取或创建照片的 Blob URL
   * @param photoId 照片唯一 ID
   * @param blob 图片 Blob 数据
   * @returns Blob URL
   */
  const getOrCreateUrl = useCallback((photoId: string, blob: Blob): string => {
    const existing = urlMapRef.current.get(photoId);

    if (existing) {
      // 如果该 URL 正在等待销毁，取消销毁
      pendingRevokeRef.current.delete(photoId);
      return existing.url;
    }

    // 创建新的 Blob URL
    const url = URL.createObjectURL(blob);
    urlMapRef.current.set(photoId, { url, blob });

    console.log(`[URL Manager] Created URL for ${photoId}, total: ${urlMapRef.current.size}`);

    return url;
  }, []);

  /**
   * 标记 URL 准备销毁（延迟执行，避免快速滚动时的抖动）
   * @param photoId 照片唯一 ID
   */
  const markForRevoke = useCallback((photoId: string) => {
    if (!urlMapRef.current.has(photoId)) return;

    pendingRevokeRef.current.add(photoId);

    // 延迟 500ms 后执行清理，避免快速滚动时的频繁创建销毁
    if (revokeTimerRef.current) {
      window.clearTimeout(revokeTimerRef.current);
    }

    revokeTimerRef.current = window.setTimeout(() => {
      executeRevoke();
    }, 500);
  }, []);

  /**
   * 立即销毁指定照片的 URL
   * @param photoId 照片唯一 ID
   */
  const revokeImmediately = useCallback((photoId: string) => {
    const entry = urlMapRef.current.get(photoId);
    if (entry) {
      URL.revokeObjectURL(entry.url);
      urlMapRef.current.delete(photoId);
      pendingRevokeRef.current.delete(photoId);

      console.log(`[URL Manager] Revoked URL for ${photoId}, remaining: ${urlMapRef.current.size}`);
    }
  }, []);

  /**
   * 执行待清理的 URL 销毁
   */
  const executeRevoke = useCallback(() => {
    pendingRevokeRef.current.forEach((photoId) => {
      const entry = urlMapRef.current.get(photoId);
      if (entry) {
        URL.revokeObjectURL(entry.url);
        urlMapRef.current.delete(photoId);
      }
    });

    const count = pendingRevokeRef.current.size;
    pendingRevokeRef.current.clear();

    if (count > 0) {
      console.log(`[URL Manager] Batch revoked ${count} URLs, remaining: ${urlMapRef.current.size}`);
    }
  }, []);

  /**
   * 批量销毁所有 URL（用于组件卸载时清理）
   */
  const revokeAll = useCallback(() => {
    // 取消待执行的定时器
    if (revokeTimerRef.current) {
      window.clearTimeout(revokeTimerRef.current);
      revokeTimerRef.current = null;
    }

    // 销毁所有活跃的 URL
    urlMapRef.current.forEach((entry, photoId) => {
      URL.revokeObjectURL(entry.url);
      console.log(`[URL Manager] Revoked URL for ${photoId}`);
    });

    const count = urlMapRef.current.size;
    urlMapRef.current.clear();
    pendingRevokeRef.current.clear();

    console.log(`[URL Manager] Revoked all ${count} URLs`);
  }, []);

  /**
   * 获取当前活跃的 URL 数量（用于调试）
   */
  const getActiveCount = useCallback(() => {
    return urlMapRef.current.size;
  }, []);

  // 组件卸载时清理所有 URL
  useEffect(() => {
    return () => {
      revokeAll();
    };
  }, [revokeAll]);

  return {
    getOrCreateUrl,
    markForRevoke,
    revokeImmediately,
    revokeAll,
    getActiveCount,
  };
}
