import { useCallback } from 'react';
import { PhotoPickerService } from '../services/photoPicker';
import { usePhotoStore } from '../stores/photoStore';
import type { UserPhoto } from '../types/photo';

/**
 * 照片导入 Hook - Snapseed 极速模式
 *
 * 选择照片后**立即**用 webPath 显示列表，无需等待
 * Blob 数据只在导出时需要，届时再按需加载
 */
export function usePhotoImport() {
  const addPhotos = usePhotoStore((state) => state.addPhotos);

  const importPhotos = useCallback(async () => {
    const totalStart = performance.now();
    console.log('[PhotoImport] ===== 开始导入流程 =====');

    try {
      // 1. 选择照片 - 只获取引用（包含 webPath）
      console.log('[PhotoImport] 调用 pickPhotoReferences...');
      const pickStart = performance.now();
      const references = await PhotoPickerService.pickPhotoReferences({
        maxCount: 500,
      });
      const pickEnd = performance.now();
      console.log(`[PhotoImport] pickPhotoReferences 完成，耗时: ${(pickEnd - pickStart).toFixed(2)}ms`);

      if (references.length === 0) {
        console.log('[PhotoImport] 未选择任何照片');
        return;
      }

      // 2. 立即添加照片到 store（用 webPath 直接显示，瞬间完成）
      // FilePicker 已经返回尺寸信息，直接使用
      const mapStart = performance.now();
      const tempPhotos: Omit<UserPhoto, 'id' | 'status'>[] = references.map((ref) => ({
        assetId: ref.assetId,
        localUrl: ref.webPath || null,
        dimensions: {
          width: ref.width || 0,
          height: ref.height || 0,
        },
        creationTime: ref.creationTime,
        originalFileName: ref.originalFileName,
      }));
      const mapEnd = performance.now();
      console.log(`[PhotoImport] 映射照片数据耗时: ${(mapEnd - mapStart).toFixed(2)}ms`);

      // 立即更新 store，触发 UI 渲染
      const storeStart = performance.now();
      addPhotos(tempPhotos);
      const storeEnd = performance.now();
      console.log(`[PhotoImport] addPhotos 调用耗时: ${(storeEnd - storeStart).toFixed(2)}ms`);

      const totalTime = performance.now() - totalStart;
      console.log(`[PhotoImport] ===== 导入流程总计: ${totalTime.toFixed(2)}ms =====`);
    } catch (error) {
      console.error('[PhotoImport] 导入失败:', error);
      alert('导入照片失败: ' + (error as Error).message);
    }
  }, [addPhotos]);

  return { importPhotos };
}
