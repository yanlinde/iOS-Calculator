import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { usePhotoUrlManager } from '../../hooks/usePhotoUrlManager';
import { usePhotoUrl } from '../../hooks/usePhotoUrl';
import type { UserPhoto } from '../../types/photo';

interface DraggablePhotoProps {
  photo: UserPhoto;
  index: number;
}

/**
 * 可拖拽照片项
 *
 * 使用 @dnd-kit 实现拖拽排序
 */
export function DraggablePhoto({ photo, index }: DraggablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  // URL 管理
  const { getOrCreateUrl, markForRevoke } = usePhotoUrlManager();

  const url = usePhotoUrl({
    photoId: photo.id,
    blobData: photo.blobData,
    isVisible: true,
    getOrCreateUrl,
    markForRevoke,
  });

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      animate={{
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
      className={`
        aspect-square rounded-lg overflow-hidden
        ${isDragging ? 'cursor-grabbing ring-2 ring-blue-500' : 'cursor-grab'}
      `}
    >
      {url ? (
        <img
          src={url}
          alt={`Photo ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-slate-700 animate-pulse flex items-center justify-center">
          <span className="text-slate-500 text-xs">{index + 1}</span>
        </div>
      )}

      {/* 序号标签 */}
      <div className="absolute top-1 left-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-medium">{index + 1}</span>
      </div>
    </motion.div>
  );
}
