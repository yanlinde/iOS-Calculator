import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { UserPhoto, PhotoStatus, ImportProgress } from '../types/photo';

interface PhotoStoreState {
  // 照片列表
  photos: UserPhoto[];
  // 导入进度
  importProgress: ImportProgress;
  // 选中的照片 ID（用于对比模式）
  selectedPhotoIds: string[];
  // 是否展示已淘汰的照片
  showProcessed: boolean;
}

interface PhotoStoreActions {
  // 添加照片（批量）
  addPhotos: (photos: Omit<UserPhoto, 'id' | 'status'>[]) => void;
  // 更新照片状态
  updatePhotoStatus: (id: string, status: PhotoStatus) => void;
  // 更新照片数据（用于延迟加载）
  updatePhotoData: (assetId: string, data: Partial<UserPhoto>) => void;
  // 设置导入进度
  setImportProgress: (progress: Partial<ImportProgress>) => void;
  // 重置导入进度
  resetImportProgress: () => void;
  // 清空所有照片
  clearPhotos: () => void;
  // 获取 normal 状态的照片
  getNormalPhotos: () => UserPhoto[];
  // 获取 passed 状态的照片
  getPassedPhotos: () => UserPhoto[];
  // 撤销最后一次操作（Undo 栈）
  undoLastAction: () => void;
  // 添加操作到 Undo 栈
  pushUndoState: () => void;
  // 批量淘汰所有 normal 照片
  passAllPhotos: () => void;
  // 设置是否展示已淘汰的照片
  setShowProcessed: (show: boolean) => void;
  // 获取 filtered 照片列表（根据 showProcessed 决定）
  getFilteredPhotos: () => UserPhoto[];
  // 删除所有 passed 状态的照片
  removePassedPhotos: () => void;
}

const initialImportProgress: ImportProgress = {
  isImporting: false,
  processed: 0,
  total: 0,
  percentage: 0,
};

// 从 localStorage 读取 showProcessed 设置
const getInitialShowProcessed = (): boolean => {
  try {
    const saved = localStorage.getItem('photocull_show_processed');
    return saved !== null ? JSON.parse(saved) : true; // 默认勾选
  } catch {
    return true;
  }
};

// Undo 栈，最多保存 10 步
const undoStack: UserPhoto[][] = [];
const MAX_UNDO_SIZE = 10;

export const usePhotoStore = create<PhotoStoreState & PhotoStoreActions>((set, get) => ({
  // 初始状态
  photos: [],
  importProgress: initialImportProgress,
  selectedPhotoIds: [],
  showProcessed: getInitialShowProcessed(),

  // 添加照片
  addPhotos: (newPhotos) => {
    console.log('[PhotoStore] addPhotos called, count:', newPhotos.length, 'at:', Date.now());
    const startTime = Date.now();

    const photosWithMetadata: UserPhoto[] = newPhotos.map((photo) => ({
      ...photo,
      id: uuidv4(),
      status: 'normal',
    }));
    console.log('[PhotoStore] Mapped photos with metadata, time:', Date.now() - startTime, 'ms');

    set((state) => {
      console.log('[PhotoStore] Inside set callback, time:', Date.now() - startTime, 'ms');
      // 合并并按拍摄时间排序
      const combined = [...state.photos, ...photosWithMetadata];
      console.log('[PhotoStore] Combined array, time:', Date.now() - startTime, 'ms');

      // 排序逻辑：
      // 1. 有拍摄时间的按时间降序（最新的在前，越久远的越在后）
      // 2. 无拍摄时间的（null）按 assetId 正序排列
      combined.sort((a, b) => {
        // 如果都有时间，按时间降序（最新的在前）
        if (a.creationTime !== null && b.creationTime !== null) {
          return b.creationTime - a.creationTime;
        }
        // 如果 a 有时间，b 没有，a 排前面
        if (a.creationTime !== null) return -1;
        // 如果 b 有时间，a 没有，b 排前面
        if (b.creationTime !== null) return 1;
        // 都没有时间，按 assetId 正序
        return a.assetId.localeCompare(b.assetId);
      });

      return { photos: combined };
    });
  },

  // 更新照片状态
  updatePhotoStatus: (id, status) => {
    // 先保存 Undo 状态
    get().pushUndoState();

    set((state) => {
      const newPhotos = state.photos.map((photo) =>
        photo.id === id ? { ...photo, status } : photo
      );
      return { photos: newPhotos };
    });
  },

  // 更新照片数据（用于延迟加载）
  updatePhotoData: (assetId, data) => {
    set((state) => {
      const newPhotos = state.photos.map((photo) =>
        photo.assetId === assetId ? { ...photo, ...data } : photo
      );
      return { photos: newPhotos };
    });
  },

  // 设置导入进度
  setImportProgress: (progress) => {
    set((state) => ({
      importProgress: {
        ...state.importProgress,
        ...progress,
        percentage: progress.total
          ? Math.round((progress.processed || state.importProgress.processed) / progress.total * 100)
          : state.importProgress.percentage,
      },
    }));
  },

  // 重置导入进度
  resetImportProgress: () => {
    set({ importProgress: initialImportProgress });
  },

  // 清空所有照片
  clearPhotos: () => {
    undoStack.length = 0; // 清空 Undo 栈
    set({ photos: [], selectedPhotoIds: [] });
  },

  // 获取 normal 照片
  getNormalPhotos: () => {
    return get().photos.filter((p) => p.status === 'normal');
  },

  // 获取 passed 照片
  getPassedPhotos: () => {
    return get().photos.filter((p) => p.status === 'passed');
  },

  // 添加状态到 Undo 栈
  pushUndoState: () => {
    const currentPhotos = get().photos;
    undoStack.push([...currentPhotos]);

    // 限制栈大小
    if (undoStack.length > MAX_UNDO_SIZE) {
      undoStack.shift();
    }
  },

  // 撤销操作
  undoLastAction: () => {
    if (undoStack.length === 0) return;

    const previousState = undoStack.pop();
    if (previousState) {
      set({ photos: previousState });
    }
  },

  // 批量淘汰所有 normal 照片
  passAllPhotos: () => {
    // 先保存 Undo 状态
    get().pushUndoState();

    set((state) => ({
      photos: state.photos.map((photo) =>
        photo.status === 'normal' ? { ...photo, status: 'passed' as PhotoStatus } : photo
      ),
    }));
  },

  // 设置是否展示已淘汰的照片
  setShowProcessed: (show) => {
    set({ showProcessed: show });
    // 持久化到 localStorage
    try {
      localStorage.setItem('photocull_show_processed', JSON.stringify(show));
    } catch {
      // 忽略 localStorage 错误
    }
  },

  // 获取 filtered 照片列表
  getFilteredPhotos: () => {
    const state = get();
    if (state.showProcessed) {
      // 展示所有照片
      return state.photos;
    }
    // 仅展示 normal 照片
    return state.photos.filter((p) => p.status === 'normal');
  },

  // 删除所有 passed 状态的照片
  removePassedPhotos: () => {
    set((state) => ({
      photos: state.photos.filter((p) => p.status !== 'passed'),
    }));
  },
}));
