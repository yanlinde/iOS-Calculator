import { motion } from 'framer-motion';
import { usePhotoUrlManager } from '../../hooks/usePhotoUrlManager';
import { usePhotoUrl } from '../../hooks/usePhotoUrl';
import type { UserPhoto } from '../../types/photo';

interface SNSHubProps {
  photos: UserPhoto[];
  onOpenPreview: () => void;
}

/**
 * SNSHub 底部缩略图计数器
 *
 * 显示已选照片的缩略图预览和数量
 * 点击展开 3x3 预览画布
 */
export function SNSHub({ photos, onOpenPreview }: SNSHubProps) {
  const keptCount = photos.length;

  // 最多显示 3 张最新照片
  const previewPhotos = photos.slice(0, 3);

  if (keptCount === 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onClick={onOpenPreview}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40
                 flex items-center gap-3 px-4 py-2
                 bg-slate-900/90 backdrop-blur-md
                 border border-slate-700/50
                 rounded-full shadow-lg
                 hover:bg-slate-800/90 transition-colors"
    >
      {/* 缩略图堆叠 */}
      <div className="flex -space-x-2">
        {previewPhotos.map((photo, index) => (
          <HubThumbnail
            key={photo.id}
            photo={photo}
            index={index}
            total={previewPhotos.length}
          />
        ))}
      </div>

      {/* 数量徽章 */}
      <div className="flex items-center gap-2">
        <span className="text-white font-medium text-sm">
          {keptCount} 张已选
        </span>
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </div>
    </motion.button>
  );
}

/**
 * Hub 缩略图项
 */
function HubThumbnail({
  photo,
  index,
  total,
}: {
  photo: UserPhoto;
  index: number;
  total: number;
}) {
  const { getOrCreateUrl, markForRevoke } = usePhotoUrlManager();

  const url = usePhotoUrl({
    photoId: photo.id,
    blobData: photo.blobData,
    isVisible: true,
    getOrCreateUrl,
    markForRevoke,
  });

  // 堆叠顺序：后面的在前面
  const zIndex = total - index;

  return (
    <div
      className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-800 shadow-md"
      style={{ zIndex }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-slate-700 animate-pulse" />
      )}
    </div>
  );
}
