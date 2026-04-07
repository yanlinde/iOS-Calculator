import { useEffect, useState, useRef } from 'react';
import type { UserPhoto } from '../../types/photo';

interface VirtualPhotoGridProps {
  photos: UserPhoto[];
  onPhotoClick?: (photo: UserPhoto) => void;
  columns?: 1 | 2;
}

/**
 * 单张照片项组件 - 简化版
 */
function PhotoGridItem({
  photo,
  index,
  onClick,
}: {
  photo: UserPhoto;
  index: number;
  onClick?: (photo: UserPhoto) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (photo.blobData && photo.blobData.size > 0) {
      try {
        const newUrl = URL.createObjectURL(photo.blobData);
        urlRef.current = newUrl;
        setUrl(newUrl);
      } catch (err) {
        console.error(`Failed to create URL for photo ${index}:`, err);
      }
    }

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [photo.blobData, index]);

  return (
    <div
      className="relative bg-slate-800 overflow-hidden cursor-pointer group flex items-center justify-center"
      onClick={() => onClick?.(photo)}
    >
      {url ? (
        <img
          src={url}
          alt={`Photo ${index + 1}`}
          className="w-full h-auto object-contain transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-800">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700" />
            <div className="text-xs text-slate-500">{index + 1}</div>
          </div>
        </div>
      )}

      {photo.status === 'passed' && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 flex items-center justify-center shadow-md">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-[10px] text-white/80">
        {index + 1}
      </div>
    </div>
  );
}

/**
 * 照片网格组件
 */
export function VirtualPhotoGrid({ photos, onPhotoClick, columns = 2 }: VirtualPhotoGridProps) {

  if (photos.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-500">
        没有照片
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-slate-950 px-1 py-2">
      <div className={`grid gap-1 ${columns === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {photos.map((photo, index) => (
          <PhotoGridItem
            key={photo.id}
            photo={photo}
            index={index}
            onClick={onPhotoClick}
          />
        ))}
      </div>
    </div>
  );
}
