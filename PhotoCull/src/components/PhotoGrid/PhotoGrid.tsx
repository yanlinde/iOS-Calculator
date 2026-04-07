import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { UserPhoto } from '../../types/photo';

export type ActionType = 'keep' | 'pass';

interface ActionConfig {
  label: string;
  color: string;
}

const actionConfig: Record<ActionType, ActionConfig> = {
  keep: { label: '保留', color: 'text-blue-400' },
  pass: { label: '淘汰', color: 'text-red-400' },
};

interface PhotoGridProps {
  photos: UserPhoto[];
  emptyText: string;
  actionType?: ActionType;
  onAction?: (id: string) => void;
}

/**
 * 照片网格组件 - 双列布局
 * 用于显示已保留/已淘汰的照片列表
 */
export function PhotoGrid({ photos, emptyText, actionType, onAction }: PhotoGridProps) {
  const [loadedUrls, setLoadedUrls] = useState<Record<string, string>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const urls: Record<string, string> = {};
    photos.forEach((photo) => {
      if (photo.blobData) {
        urls[photo.id] = URL.createObjectURL(photo.blobData);
      }
    });
    setLoadedUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="p-2 grid grid-cols-2 gap-2">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="relative aspect-square bg-slate-800 rounded overflow-hidden"
        >
          {loadedUrls[photo.id] ? (
            <img
              src={loadedUrls[photo.id]}
              alt="Photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-slate-700 animate-pulse" />
            </div>
          )}

          {/* 操作按钮 */}
          {actionType && onAction && (
            <div className="absolute bottom-2 right-2">
              <button
                onClick={() => setOpenMenuId(openMenuId === photo.id ? null : photo.id)}
                className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {/* 展开菜单 */}
              {openMenuId === photo.id && (
                <>
                  {/* 点击外部关闭 */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenMenuId(null)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute bottom-full right-0 mb-2 w-24 bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        onAction(photo.id);
                        setOpenMenuId(null);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${actionConfig[actionType].color}`}
                    >
                      {actionConfig[actionType].label}
                    </button>
                  </motion.div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
