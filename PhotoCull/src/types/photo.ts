/**
 * 照片状态类型
 * - normal: 正常（未被淘汰的照片）
 * - passed: 已淘汰
 */
export type PhotoStatus = 'normal' | 'passed';

/**
 * 用户照片数据接口
 */
export interface UserPhoto {
  /** 随机唯一 ID，用于 React key */
  id: string;
  /** iOS 系统相册原始资产标识符 */
  assetId: string;
  /** 本地预览图 Blob URL（通过 URL.createObjectURL 生成） */
  localUrl: string | null;
  /** 照片状态 */
  status: PhotoStatus;
  /** 尺寸信息，用于 UI 布局适配与排序 */
  dimensions: {
    width: number;
    height: number;
  };
  /** EXIF 时间戳，用于按拍摄时间线排序，null 表示无拍摄时间 */
  creationTime: number | null;
  /** 原始文件数据，用于生成 Blob URL */
  blobData?: Blob;
  /** 原始文件名 */
  originalFileName?: string;
}

/**
 * 导入进度状态
 */
export interface ImportProgress {
  /** 是否正在导入 */
  isImporting: boolean;
  /** 已处理数量 */
  processed: number;
  /** 总数 */
  total: number;
  /** 百分比 (0-100) */
  percentage: number;
}

/**
 * URL 管理项，用于追踪每个照片 URL 的生命周期
 */
export interface UrlManagedItem {
  /** 照片 ID */
  photoId: string;
  /** Blob URL */
  url: string;
  /** 最后访问时间戳 */
  lastAccessed: number;
  /** 引用计数 */
  refCount: number;
}
