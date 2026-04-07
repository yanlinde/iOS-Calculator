import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExportService, MockExportService } from '../../services/exportService';
import type { UserPhoto } from '../../types/photo';

interface ExportButtonProps {
  photos: UserPhoto[];
  variant?: 'primary' | 'secondary' | 'icon';
  className?: string;
}

/**
 * 导出按钮组件
 *
 * 触发导出流程，显示导出状态
 */
export function ExportButton({
  photos,
  variant = 'primary',
  className = '',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });

  const handleExport = useCallback(async () => {
    if (photos.length === 0) {
      alert('没有可导出的照片');
      return;
    }

    setIsExporting(true);
    setProgress({ processed: 0, total: photos.length });

    try {
      // 检测是否在 Capacitor 环境
      const isCapacitor =
        typeof (window as any).Capacitor !== 'undefined' &&
        (window as any).Capacitor.isNativePlatform?.();

      if (isCapacitor) {
        // 真实导出到相册
        await ExportService.exportPhotos({
          photos,
          onProgress: (processed, total) => {
            setProgress({ processed, total });
          },
        });
      } else {
        // Web 端模拟导出
        await MockExportService.exportPhotos({
          photos,
          onProgress: (processed, total) => {
            setProgress({ processed, total });
          },
        });

        // Web 端下载照片
        await downloadPhotos(photos);
      }

      // 导出成功
      setTimeout(() => {
        setIsExporting(false);
        alert(`成功导出 ${photos.length} 张照片到「层层选片_精选」相册`);
      }, 500);
    } catch (error) {
      console.error('导出失败:', error);
      setIsExporting(false);
      alert('导出失败，请检查相册权限');
    }
  }, [photos]);

  // Web 端：下载照片到本地
  const downloadPhotos = async (photos: UserPhoto[]) => {
    for (const photo of photos) {
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
  };

  const buttonContent = (
    <>
      {/* 导出图标 */}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>

      {variant !== 'icon' && (
        <span>
          导出精选集
          {photos.length > 0 && ` (${photos.length})`}
        </span>
      )}
    </>
  );

  const baseStyles =
    'flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary:
      'px-4 py-2.5 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white rounded-full shadow-lg',
    secondary:
      'px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-sm',
    icon: 'w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full',
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        onClick={handleExport}
        disabled={isExporting || photos.length === 0}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      >
        {isExporting ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {variant !== 'icon' && (
              <span>
                导出中 {progress.processed}/{progress.total}
              </span>
            )}
          </>
        ) : (
          buttonContent
        )}
      </motion.button>

      {/* 导出进度覆盖层 */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-6 w-80 shadow-2xl border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4">
              正在导出照片
            </h3>

            <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    progress.total > 0
                      ? (progress.processed / progress.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="text-center mt-3">
              <span className="text-2xl font-bold text-green-500">
                {progress.total > 0
                  ? Math.round((progress.processed / progress.total) * 100)
                  : 0}
                %
              </span>
            </div>

            <p className="text-sm text-slate-400 text-center mt-2">
              {progress.processed} / {progress.total} 张
            </p>

            <p className="text-xs text-slate-500 text-center mt-4">
              正在保存到「层层选片_精选」相册
            </p>
          </div>
        </div>
      )}
    </>
  );
}
