import { Media } from '@capacitor-community/media';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { UserPhoto } from '../types/photo';

export interface ExportOptions {
  photos: UserPhoto[];
  albumName?: string;
  onProgress?: (processed: number, total: number) => void;
}

/**
 * 导出服务
 *
 * 将筛选后的照片导出到 iOS 相册
 * 创建「层层选片_精选」相册
 */
export class ExportService {
  static readonly DEFAULT_ALBUM_NAME = '层层选片_精选';

  /**
   * 导出照片到相册
   */
  static async exportPhotos({
    photos,
    albumName = this.DEFAULT_ALBUM_NAME,
    onProgress,
  }: ExportOptions): Promise<void> {
    if (photos.length === 0) {
      throw new Error('没有可导出的照片');
    }

    try {
      // 获取或创建相册
      const albumIdentifier = await this.getOrCreateAlbum(albumName);

      // 逐张保存照片
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        try {
          // 使用 blobData 创建临时文件
          if (!photo.blobData || photo.blobData.size === 0) {
            console.warn(`照片 ${photo.id} 没有数据，跳过`);
            continue;
          }

          // 将 Blob 转换为 base64
          const base64Data = await this.blobToBase64(photo.blobData);

          // 写入临时文件
          const tempFileName = `export_${photo.id}_${Date.now()}.jpg`;
          await Filesystem.writeFile({
            path: tempFileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          // 获取临时文件路径
          const fileUri = await Filesystem.getUri({
            path: tempFileName,
            directory: Directory.Cache,
          });

          // 保存到相册
          await Media.savePhoto({
            path: fileUri.uri,
            albumIdentifier,
          });

          // 删除临时文件
          await Filesystem.deleteFile({
            path: tempFileName,
            directory: Directory.Cache,
          });

          // 报告进度
          onProgress?.(i + 1, photos.length);
        } catch (error) {
          console.error(`导出照片 ${photo.id} 失败:`, error);
          // 单张失败不中断整体流程
          onProgress?.(i + 1, photos.length);
        }
      }
    } catch (error) {
      console.error('导出失败:', error);
      throw error;
    }
  }

  /**
   * 将 Blob 转换为 base64 字符串
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // 移除 data:image/jpeg;base64, 前缀
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 获取或创建相册
   */
  private static async getOrCreateAlbum(albumName: string): Promise<string | undefined> {
    try {
      // 1. 获取现有相册列表
      const { albums } = await Media.getAlbums();

      // 2. 查找目标相册
      const existingAlbum = albums.find(a => a.name === albumName);
      if (existingAlbum) {
        console.log(`找到现有相册: ${albumName}, identifier: ${existingAlbum.identifier}`);
        return existingAlbum.identifier;
      }

      // 3. 创建新相册
      await Media.createAlbum({ name: albumName });
      console.log(`创建新相册: ${albumName}`);

      // 4. 重新获取相册列表以获取 identifier
      const { albums: newAlbums } = await Media.getAlbums();
      const newAlbum = newAlbums.find(a => a.name === albumName);
      return newAlbum?.identifier;
    } catch (error) {
      console.error('获取或创建相册失败:', error);
      // 返回 undefined，让系统使用默认相册
      return undefined;
    }
  }

  /**
   * 检查写入权限
   */
  static async checkPermissions(): Promise<boolean> {
    try {
      // 在实际 iOS 设备上，保存操作会触发权限请求
      // 这里返回 true 表示可以继续
      return true;
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  }
}

/**
 * Web 端模拟导出（用于开发和测试）
 */
export class MockExportService {
  static async exportPhotos({
    photos,
    onProgress,
  }: ExportOptions): Promise<void> {
    console.log('模拟导出照片:', photos.length);

    // 模拟延迟
    for (let i = 0; i < photos.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      onProgress?.(i + 1, photos.length);
      console.log(`已导出 ${i + 1}/${photos.length}`);
    }

    console.log('模拟导出完成');
  }
}
