import { Camera, type GalleryPhoto } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

export interface PickedPhoto {
  assetId: string;
  data: Blob;
  width: number;
  height: number;
  creationTime: number | null;
  originalFileName: string;
}

interface PhotoReference {
  assetId: string;
  path: string;
  webPath?: string;
  creationTime: number | null;
  originalFileName: string;
  // 延迟加载的数据
  data?: Blob;
  width?: number;
  height?: number;
}

/**
 * 照片选择器服务
 *
 * 优化为 Snapseed 模式：
 * 1. 先快速返回照片引用（元数据），立即显示在UI上
 * 2. 后台异步加载完整图片数据
 */
export class PhotoPickerService {
  /**
   * 检查相册权限
   */
  static async checkPermissions(): Promise<string> {
    const permission = await Camera.checkPermissions();
    return permission.photos;
  }

  /**
   * 请求相册权限
   */
  static async requestPermissions(): Promise<string> {
    const permission = await Camera.requestPermissions({
      permissions: ['photos'],
    });
    return permission.photos;
  }

  /**
   * 选择照片 - 使用 @capawesome/capacitor-file-picker (PHPickerViewController)
   * PHPickerViewController 使用独立进程，不需要照片库权限，理论上更快
   */
  static async pickPhotoReferences(options: {
    maxCount?: number;
  } = {}): Promise<PhotoReference[]> {
    const { maxCount = 500 } = options;
    const startTime = performance.now();

    try {
      console.log('[PhotoPicker] === 开始选择照片 (FilePicker) ===');

      // 使用 FilePicker.pickImages - iOS 15+ 使用 PHPickerViewController
      // 不需要权限，因为选择器在独立进程中运行
      console.log('[PhotoPicker] 调用 FilePicker.pickImages...');
      const pickStart = performance.now();
      const result = await FilePicker.pickImages({
        limit: maxCount,
        skipTranscoding: true, // 跳过转码，直接返回原图
        ordered: false,
      });
      const pickEnd = performance.now();
      console.log(`[PhotoPicker] FilePicker.pickImages 耗时: ${(pickEnd - pickStart).toFixed(2)}ms, 选中 ${result.files?.length || 0} 张照片`);

      // 立即返回照片引用（不包含实际图片数据）
      const mapStart = performance.now();
      const references: PhotoReference[] = (result.files || []).map((file, index) => {
        const assetId = file.path || `photo-${Date.now()}-${index}`;
        const originalFileName = file.name
          ? file.name.replace(/\.[^/.]+$/, '') // 移除扩展名
          : assetId;

        // 从 modifiedAt 提取时间（毫秒时间戳）
        const creationTime = file.modifiedAt || null;

        return {
          assetId,
          path: file.path || '',
          webPath: Capacitor.convertFileSrc(file.path || ''),
          creationTime,
          originalFileName,
          // FilePicker 已经返回尺寸信息
          width: file.width,
          height: file.height,
        };
      });
      const mapEnd = performance.now();
      console.log(`[PhotoPicker] 处理引用数据耗时: ${(mapEnd - mapStart).toFixed(2)}ms`);

      const totalTime = performance.now() - startTime;
      console.log(`[PhotoPicker] === 总计耗时: ${totalTime.toFixed(2)}ms ===`);

      return references;
    } catch (error) {
      console.error('选择照片失败:', error);
      throw error;
    }
  }

  /**
   * 加载单张照片的完整数据
   * 在需要显示时调用（延迟加载）
   */
  static async loadPhotoData(reference: PhotoReference): Promise<PickedPhoto | null> {
    try {
      let blob: Blob;

      if (reference.path && Capacitor.isNativePlatform()) {
        try {
          const fileData = await Filesystem.readFile({
            path: reference.path,
          });

          const base64Data = fileData.data as string;
          const byteCharacters = atob(base64Data);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          blob = new Blob([byteArray], { type: 'image/jpeg' });
        } catch (fsError) {
          const imageUrl = reference.webPath || Capacitor.convertFileSrc(reference.path);
          const response = await fetch(imageUrl);
          blob = await response.blob();
        }
      } else {
        const imageUrl = reference.webPath || reference.path;
        if (!imageUrl) return null;
        const response = await fetch(imageUrl);
        blob = await response.blob();
      }

      if (blob.size === 0) {
        throw new Error('获取到的图片数据为空');
      }

      // 获取尺寸
      const dimensions = await this.getImageDimensionsFromBlob(blob);

      return {
        assetId: reference.assetId,
        data: blob,
        width: dimensions.width,
        height: dimensions.height,
        creationTime: reference.creationTime,
        originalFileName: reference.originalFileName,
      };
    } catch (error) {
      console.error('[PhotoPicker] 加载照片数据失败:', error);
      return null;
    }
  }

  /**
   * 批量加载照片数据（带进度回调）
   * 后台异步执行
   */
  static async loadPhotosData(
    references: PhotoReference[],
    onProgress?: (processed: number, total: number, photo: PickedPhoto) => void
  ): Promise<PickedPhoto[]> {
    const photos: PickedPhoto[] = [];

    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
      try {
        const photo = await this.loadPhotoData(ref);
        if (photo) {
          photos.push(photo);
          // 每加载完一张就回调，让UI可以实时更新
          onProgress?.(i + 1, references.length, photo);
        }
      } catch (error) {
        console.error('[PhotoPicker] 加载照片失败:', error);
      }
    }

    return photos;
  }

  /**
   * 从 Blob 获取图片尺寸
   */
  private static getImageDimensionsFromBlob(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('无法加载图片获取尺寸'));
      };

      img.src = url;
    });
  }

  // ========== 兼容性：保留旧方法 ==========

  /**
   * 选择照片（旧方法，用于兼容）
   */
  static async pickPhotos(options: { maxCount?: number } = {}): Promise<GalleryPhoto[]> {
    const { maxCount = 500 } = options;

    try {
      const permission = await this.requestPermissions();
      if (permission === 'denied') {
        throw new Error('相册权限被拒绝');
      }

      const result = await Camera.pickImages({
        limit: maxCount,
      });

      return result.photos || [];
    } catch (error) {
      console.error('选择照片失败:', error);
      throw error;
    }
  }

  /**
   * 处理选中的照片（旧方法，用于兼容）
   */
  static async processPhotos(
    images: GalleryPhoto[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<PickedPhoto[]> {
    const photos: PickedPhoto[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        const photo = await this.processImage(image);
        if (photo) {
          photos.push(photo);
        }
      } catch (error) {
        console.error('[PhotoPicker] 处理照片失败:', error);
      }
      onProgress?.(i + 1, images.length);
    }

    return photos;
  }

  private static async processImage(image: GalleryPhoto): Promise<PickedPhoto | null> {
    try {
      let blob: Blob;

      if (image.path && Capacitor.isNativePlatform()) {
        try {
          const fileData = await Filesystem.readFile({ path: image.path });
          const base64Data = fileData.data as string;
          const byteCharacters = atob(base64Data);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          blob = new Blob([byteArray], { type: 'image/jpeg' });
        } catch (fsError) {
          const imageUrl = image.webPath || Capacitor.convertFileSrc(image.path!);
          const response = await fetch(imageUrl);
          blob = await response.blob();
        }
      } else {
        const imageUrl = image.webPath || image.path || '';
        if (!imageUrl) return null;
        const response = await fetch(imageUrl);
        blob = await response.blob();
      }

      if (blob.size === 0) {
        throw new Error('获取到的图片数据为空');
      }

      const dimensions = await this.getImageDimensionsFromBlob(blob);
      const assetId = image.path || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const originalFileName = image.path
        ? image.path.split('/').pop()?.split('.')[0] || assetId
        : assetId;

      return {
        assetId,
        data: blob,
        width: dimensions.width,
        height: dimensions.height,
        creationTime: null,
        originalFileName,
      };
    } catch (error) {
      console.error('[PhotoPicker] 处理图片失败:', error);
      return null;
    }
  }
}

/**
 * 模拟照片选择器（用于开发和测试）
 */
export class MockPhotoPickerService {
  static async pickPhotos(options: { count?: number } = {}): Promise<PickedPhoto[]> {
    const { count = 50 } = options;
    const photos: PickedPhoto[] = [];

    for (let i = 0; i < count; i++) {
      const canvas = document.createElement('canvas');
      const isLandscape = Math.random() > 0.5;
      canvas.width = isLandscape ? 1920 : 1080;
      canvas.height = isLandscape ? 1080 : 1920;

      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const hue1 = Math.floor(Math.random() * 360);
      const hue2 = (hue1 + 40) % 360;
      gradient.addColorStop(0, `hsl(${hue1}, 70%, 50%)`);
      gradient.addColorStop(1, `hsl(${hue2}, 70%, 30%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'white';
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, canvas.width / 2, canvas.height / 2);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8);
      });

      photos.push({
        assetId: `mock-photo-${i}`,
        data: blob,
        width: canvas.width,
        height: canvas.height,
        creationTime: null,
        originalFileName: `IMG_MOCK_${i + 1}`,
      });
    }

    return photos;
  }
}
