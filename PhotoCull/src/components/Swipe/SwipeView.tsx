import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { SwipeList } from './SwipeList';
import { DoubleColumnGrid } from './DoubleColumnGrid';
import { CompletionView } from './CompletionView';
import { PhotoDetailModal } from '../PhotoDetail/PhotoDetailModal';
import { usePhotoProcessing } from '../../hooks/usePhotoProcessing';
import { usePhotoStore } from '../../stores/photoStore';
import { usePhotoImport } from '../../hooks/usePhotoImport';
import { ExportService, MockExportService } from '../../services/exportService';
import type { UserPhoto } from '../../types/photo';

type ViewMode = 'single' | 'double';
type TabType = 'normal' | 'passed';

/**
 * 已淘汰照片项组件 - 正确处理 Blob URL 生命周期
 */
interface PassedPhotoItemProps {
  photo: UserPhoto;
  onClick: () => void;
}

function PassedPhotoItem({ photo, onClick }: PassedPhotoItemProps) {
  const url = useMemo(() => {
    // 优先使用 localUrl (webPath)，可立即显示
    if (photo.localUrl) {
      return photo.localUrl;
    }
    // 否则使用 blobData
    if (photo.blobData) {
      return URL.createObjectURL(photo.blobData);
    }
    return null;
  }, [photo.localUrl, photo.blobData]);

  useEffect(() => {
    return () => {
      // 只清理 blob URL，不清理 localUrl
      if (url && !photo.localUrl) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url, photo.localUrl]);

  return (
    <div
      className="relative aspect-square bg-neutral-800 overflow-hidden"
      onClick={onClick}
    >
      {url && (
        <img
          src={url}
          alt="Photo"
          className="w-full h-full object-cover grayscale"
        />
      )}
      {/* 灰色半透明遮罩 */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(42, 42, 46, 0.5)' }}
      >
        <span className="text-white font-bold">已淘汰</span>
      </div>
    </div>
  );
}

/**
 * 照片筛选页面
 * 新逻辑：只保留 normal 和 passed 两种状态
 * - normal: 未淘汰的照片（可以导出）
 * - passed: 已淘汰的照片
 */
export function SwipeView({ photos: _photos, startPhotoId, onExit }: { photos?: UserPhoto[]; startPhotoId?: string | null; onExit?: () => void }) {
  // 本地状态
  const [activeTab, setActiveTab] = useState<TabType>('normal');
  const [viewMode, setViewMode] = useState<ViewMode>('double');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 大图弹窗状态
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 确认弹窗状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Store
  const allPhotos = usePhotoStore((state) => state.photos);
  const clearPhotos = usePhotoStore((state) => state.clearPhotos);
  const showProcessed = usePhotoStore((state) => state.showProcessed);
  const getFilteredPhotos = usePhotoStore((state) => state.getFilteredPhotos);

  // 获取过滤后的照片列表
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredPhotos = useMemo(() => getFilteredPhotos(), [allPhotos, showProcessed]);

  // 预加载图片缓存
  const preloadedImages = useRef<Set<string>>(new Set());

  // 预加载图片到浏览器缓存
  const preloadImage = useCallback((imageUrl: string): void => {
    if (preloadedImages.current.has(imageUrl)) return;

    const img = new Image();
    img.onload = () => {
      preloadedImages.current.add(imageUrl);
    };
    img.src = imageUrl;
  }, []);

  // 后台预加载所有照片的完整图片
  useEffect(() => {
    // 使用 requestIdleCallback 在浏览器空闲时预加载
    const preloadPhotos = () => {
      filteredPhotos.forEach((photo, index) => {
        // 延迟加载，避免阻塞 UI
        setTimeout(() => {
          if (photo.localUrl) {
            preloadImage(photo.localUrl);
          }
        }, index * 50); // 每张照片间隔 50ms
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(preloadPhotos, { timeout: 2000 });
    } else {
      // 降级方案：延迟 1 秒后开始预加载
      setTimeout(preloadPhotos, 1000);
    }
  }, [filteredPhotos, preloadImage]);

  // 使用自定义 Hook 处理照片筛选逻辑
  const {
    remainingPhotos,
    isComplete,
    canUndo: _canUndo,
    handleSwipeLeft,
    handleSwipeRight,
    handleUndo,
    handlePassAll: _handlePassAll,
    resetProcessing: _resetProcessing,
  } = usePhotoProcessing({ photos: filteredPhotos, startPhotoId });

  // 使用照片导入 Hook
  const { importPhotos } = usePhotoImport();

  // 统计 - normal 和 passed 照片
  const normalPhotos = useMemo(
    () => allPhotos.filter((p) => p.status === 'normal'),
    [allPhotos]
  );
  const passedPhotos = useMemo(
    () => allPhotos.filter((p) => p.status === 'passed'),
    [allPhotos]
  );
  const normalCount = normalPhotos.length;
  const passedCount = passedPhotos.length;

  // 删除已淘汰照片
  const removePassedPhotos = usePhotoStore((state) => state.removePassedPhotos);

  const handleRemovePassed = useCallback(() => {
    if (passedCount === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: '提示',
      message: `清除${passedCount}张照片？`,
      onConfirm: () => {
        removePassedPhotos();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  }, [passedCount, removePassedPhotos]);

  // 导出 normal 照片
  const handleExport = useCallback(async () => {
    if (normalCount === 0) {
      setConfirmDialog({
        isOpen: true,
        title: '提示',
        message: '没有可导出的照片',
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: '提示',
      message: `导出${normalCount}张照片到系统相册？`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

        try {
          const isCapacitor =
            typeof (window as any).Capacitor !== 'undefined' &&
            (window as any).Capacitor.isNativePlatform?.();

          if (isCapacitor) {
            await ExportService.exportPhotos({
              photos: normalPhotos,
              onProgress: (processed, total) => {
                console.log(`[SwipeView] Export progress: ${processed}/${total}`);
              },
            });
            setConfirmDialog({
              isOpen: true,
              title: '提示',
              message: `成功导出 ${normalCount} 张照片到「层层选片_精选」相册`,
              onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
            });
          } else {
            await MockExportService.exportPhotos({
              photos: normalPhotos,
              onProgress: (processed, total) => {
                console.log(`[SwipeView] Export progress: ${processed}/${total}`);
              },
            });

            for (const photo of normalPhotos) {
              if (photo.blobData) {
                const url = URL.createObjectURL(photo.blobData);
                const a = document.createElement('a');
                a.href = url;
                a.download = `photocull_${photo.id}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }
            setConfirmDialog({
              isOpen: true,
              title: '提示',
              message: `已下载 ${normalCount} 张照片`,
              onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
            });
          }
        } catch (error) {
          console.error('导出失败:', error);
          setConfirmDialog({
            isOpen: true,
            title: '提示',
            message: '导出失败，请检查相册权限',
            onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  }, [normalPhotos, normalCount]);

  // 清空照片
  const handleClear = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: '提示',
      message: '要清空所有照片吗？此操作不可撤销',
      onConfirm: () => {
        clearPhotos();
        onExit?.();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  }, [clearPhotos, onExit]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (remainingPhotos[0]) {
            handleSwipeLeft(remainingPhotos[0].id);
          }
          break;
        case 'ArrowRight':
          // 仅 passed 照片支持右滑恢复
          if (remainingPhotos[0]?.status === 'passed') {
            handleSwipeRight(remainingPhotos[0].id);
          }
          break;
        case 'Backspace':
          handleUndo();
          break;
        case 'Escape':
          onExit?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipeLeft, handleSwipeRight, handleUndo, isComplete, onExit, remainingPhotos]);

  // 处理照片点击 - 打开大图弹窗
  const handlePhotoClick = useCallback((photo: UserPhoto) => {
    setSelectedPhoto(photo);
    setIsDetailModalOpen(true);
  }, []);

  // 关闭大图弹窗
  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedPhoto(null);
  }, []);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: '#050505' }}>
      {/* 顶部导航栏 */}
      <header
        className="flex-none"
        style={{
          backgroundColor: '#050505',
          paddingTop: 'env(safe-area-inset-top, 47px)',
          paddingLeft: 'max(12px, env(safe-area-inset-left))',
          paddingRight: 'max(12px, env(safe-area-inset-right))',
          paddingBottom: '6px'
        }}
      >
        <div className="flex items-center justify-between" style={{ height: '44px' }}>
          {/* 左侧视图切换 */}
          <div
            className="flex"
            style={{
              backgroundColor: '#18181B',
              borderRadius: '16px',
              padding: '2px',
              gap: '2px',
              height: '32px'
            }}
          >
            {/* 双列视图按钮（左边） */}
            <button
              onClick={() => setViewMode('double')}
              className="flex items-center justify-center"
              style={{
                width: '36px',
                height: '28px',
                backgroundColor: viewMode === 'double' ? '#444444' : 'transparent',
                borderRadius: '14px',
                boxShadow: viewMode === 'double' ? '0 1px 6px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'double' ? '#FFFFFF' : '#71717A'} strokeWidth="2">
                <rect x="3" y="4" width="8" height="16" rx="2" />
                <rect x="13" y="4" width="8" height="16" rx="2" />
              </svg>
            </button>
            {/* 单列视图按钮（右边） */}
            <button
              onClick={() => setViewMode('single')}
              className="flex items-center justify-center"
              style={{
                width: '36px',
                height: '28px',
                backgroundColor: viewMode === 'single' ? '#444444' : 'transparent',
                borderRadius: '14px',
                boxShadow: viewMode === 'single' ? '0 1px 6px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'single' ? '#FFFFFF' : '#71717A'} strokeWidth="2">
                <rect x="6" y="4" width="12" height="16" rx="2" />
              </svg>
            </button>
          </div>

          {/* 中间 - 左划淘汰，右划撤销 */}
          <span
            style={{
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '13px',
              color: '#A1A1AA',
              fontWeight: 'normal',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            左划淘汰，右划撤销
          </span>

          {/* 右侧按钮 - 菜单 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>


      {/* 内容区域 */}
      <main className="flex-1 overflow-auto relative" style={{ touchAction: 'pan-y' }}>
        {activeTab === 'normal' ? (
          isComplete ? (
            <CompletionView
              keptCount={normalCount}
              passedCount={passedCount}
              onViewKept={() => {}}
              onViewPassed={() => setActiveTab('passed')}
              onAddMore={importPhotos}
            />
          ) : viewMode === 'single' ? (
            <SwipeList
              photos={filteredPhotos}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onPhotoClick={handlePhotoClick}
            />
          ) : (
            <DoubleColumnGrid
              photos={filteredPhotos}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onPhotoClick={handlePhotoClick}
            />
          )
        ) : (
          // 已淘汰页面
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-4">
              {passedPhotos.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-400">
                  还没有淘汰的照片
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {passedPhotos.map((photo) => (
                    <PassedPhotoItem
                      key={photo.id}
                      photo={photo}
                      onClick={() => handlePhotoClick(photo)}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* 返回筛选按钮 */}
            {normalCount > 0 && (
              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={() => setActiveTab('normal')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
                >
                  返回筛选 {normalCount}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 底部操作栏 */}
      <div
        className="flex-none flex items-center justify-center"
        style={{
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          paddingTop: '12px',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          backgroundColor: '#050505',
          gap: '12px'
        }}
      >
        {/* 已淘汰 清除 按钮 */}
        <button
          onClick={handleRemovePassed}
          disabled={passedCount === 0}
          className="flex-1 py-3 rounded-full text-center"
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '13px',
            color: passedCount > 0 ? '#FFFFFF' : '#52525B',
            backgroundColor: '#18181B',
            border: 'none',
            cursor: passedCount > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 'normal',
          }}
        >
          已淘汰{passedCount} 清除
        </button>
        {/* 剩余 导出 按钮 */}
        <button
          onClick={handleExport}
          disabled={normalCount === 0}
          className="flex-1 py-3 rounded-full text-center"
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '13px',
            color: normalCount > 0 ? '#FFFFFF' : '#52525B',
            backgroundColor: normalCount > 0 ? '#132a58' : '#18181B',
            border: 'none',
            cursor: normalCount > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 'normal',
          }}
        >
          剩余{normalCount} 导出
        </button>
      </div>

      {/* 更多菜单弹窗 - 白色卡片设计 */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-50 flex flex-col items-center"
            style={{
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="flex flex-col items-center overflow-hidden"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                width: '327px',
                padding: '24px 0',
              }}
            >
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  importPhotos();
                }}
                className="w-full py-4 text-center transition-colors hover:bg-gray-50"
                style={{
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '16px',
                  color: '#18181B',
                  fontWeight: 'normal',
                }}
              >
                添加照片
              </button>
              <div
                style={{
                  width: '160px',
                  height: '1px',
                  backgroundColor: '#EBEBEB',
                }}
              />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleClear();
                }}
                className="w-full py-4 text-center transition-colors hover:bg-gray-50"
                style={{
                  fontFamily: 'Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '16px',
                  color: '#18181B',
                  fontWeight: 'normal',
                }}
              >
                全部清空
              </button>
            </div>
          </div>
        </>
      )}

      {/* 确认弹窗 */}
      {confirmDialog.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div
            className="flex flex-col items-center"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '327px',
              padding: '32px',
              gap: '24px',
            }}
          >
            <span
              style={{
                fontFamily: 'Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '22px',
                fontWeight: 700,
                color: '#18181B',
              }}
            >
              {confirmDialog.title}
            </span>
            <span
              className="text-center"
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '16px',
                fontWeight: 'normal',
                color: '#18181B',
              }}
            >
              {confirmDialog.message}
            </span>
            <div
              className="flex justify-center"
              style={{ gap: '16px' }}
            >
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex items-center justify-center transition-colors active:scale-95"
                style={{
                  width: '120px',
                  height: '48px',
                  backgroundColor: '#F4F4F5',
                  borderRadius: '24px',
                  fontFamily: 'Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#18181B',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex items-center justify-center transition-colors active:scale-95"
                style={{
                  width: '120px',
                  height: '48px',
                  backgroundColor: '#18181B',
                  borderRadius: '24px',
                  fontFamily: 'Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 大图弹窗 */}
      <PhotoDetailModal
        photo={selectedPhoto}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
}
