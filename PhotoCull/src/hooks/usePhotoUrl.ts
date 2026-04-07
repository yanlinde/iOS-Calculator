import { useEffect, useState, useRef } from 'react';

interface UsePhotoUrlOptions {
  photoId: string;
  blobData?: Blob;
  isVisible: boolean;
  getOrCreateUrl: (id: string, blob: Blob) => string;
  markForRevoke: (id: string) => void;
}

/**
 * 单张照片 URL 管理 Hook
 *
 * 根据照片的可见性状态自动管理 URL 的生命周期：
 * - 当照片进入视口 (isVisible = true) 时，生成 Blob URL
 * - 当照片离开视口 (isVisible = false) 时，标记为待销毁
 * - 组件卸载时立即清理
 *
 * @param options 配置项
 * @returns 当前可用的 URL 或 null
 */
export function usePhotoUrl({
  photoId,
  blobData,
  isVisible,
  getOrCreateUrl,
  markForRevoke,
}: UsePhotoUrlOptions): string | null {
  const [url, setUrl] = useState<string | null>(null);

  // 使用 ref 追踪当前状态，避免闭包问题
  const urlRef = useRef<string | null>(null);
  const isVisibleRef = useRef(isVisible);
  const blobRef = useRef(blobData);

  // 更新 ref
  useEffect(() => {
    isVisibleRef.current = isVisible;
    blobRef.current = blobData;
  }, [isVisible, blobData]);

  // 处理可见性变化
  useEffect(() => {
    if (isVisible && blobData) {
      // 进入视口：创建 URL
      const newUrl = getOrCreateUrl(photoId, blobData);
      urlRef.current = newUrl;
      setUrl(newUrl);
    } else if (!isVisible && urlRef.current) {
      // 离开视口：标记为待销毁
      markForRevoke(photoId);
      urlRef.current = null;
      setUrl(null);
    }

    // 清理函数：组件卸载或 photoId 变化时立即释放
    return () => {
      if (urlRef.current) {
        markForRevoke(photoId);
        urlRef.current = null;
      }
    };
  }, [isVisible, photoId, blobData, getOrCreateUrl, markForRevoke]);

  return url;
}
