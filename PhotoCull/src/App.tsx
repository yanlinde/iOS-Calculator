import { useState, useMemo } from 'react';
import { usePhotoStore } from './stores/photoStore';
import { usePhotoImport } from './hooks/usePhotoImport';
import { SwipeView } from './components/Swipe';
import { EmptyState } from './components/EmptyState';

/**
 * PhotoCull 主应用组件
 *
 * 功能：滑动筛选照片（唯一视图模式）
 */
function App() {
  // 滑动模式起始照片 ID
  const [swipeStartPhotoId, setSwipeStartPhotoId] = useState<string | null>(null);

  // Store
  const photos = usePhotoStore((state) => state.photos);

  // 使用照片导入 Hook（无需回调）
  const { importPhotos } = usePhotoImport();

  // 获取 normal 照片
  const normalPhotos = useMemo(() => {
    return photos.filter((p) => p.status === 'normal');
  }, [photos]);

  // 退出滑动筛选
  const handleSwipeExit = () => {
    setSwipeStartPhotoId(null);
  };

  // 空状态
  if (photos.length === 0) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col overflow-hidden">
        <EmptyState onImport={importPhotos} />
      </div>
    );
  }

  // 有照片时：显示 SwipeView
  return (
    <SwipeView
      photos={normalPhotos}
      startPhotoId={swipeStartPhotoId}
      onExit={handleSwipeExit}
    />
  );
}

export default App;
