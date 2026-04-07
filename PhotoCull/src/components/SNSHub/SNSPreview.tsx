import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggablePhoto } from './DraggablePhoto';
import { ExportButton } from '../Export/ExportButton';
import type { UserPhoto } from '../../types/photo';

interface SNSPreviewProps {
  photos: UserPhoto[];
  isOpen: boolean;
  onClose: () => void;
  onReorder: (photos: UserPhoto[]) => void;
}

/**
 * SNS 预览模态框
 *
 * 展示 3x3 九宫格预览，支持拖拽排序
 * 模拟朋友圈/Instagram 预览效果
 */
export function SNSPreview({
  photos,
  isOpen,
  onClose,
  onReorder,
}: SNSPreviewProps) {
  // 本地状态管理照片顺序
  const [orderedPhotos, setOrderedPhotos] = useState<UserPhoto[]>(photos);

  // 当 photos 变化时更新本地状态
  useState(() => {
    setOrderedPhotos(photos);
  });

  // 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动 8px 后触发拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * 处理拖拽结束
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setOrderedPhotos((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          const newOrder = arrayMove(items, oldIndex, newIndex);

          // 通知父组件更新顺序
          onReorder(newOrder);

          return newOrder;
        });
      }
    },
    [onReorder]
  );

  // 生成占位格子（补齐 9 宫格）
  const placeholderCount = Math.max(0, 9 - orderedPhotos.length);
  const placeholders = Array.from({ length: placeholderCount }, (_, i) => i);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
        >
          {/* 头部 */}
          <header className="flex-none flex items-center justify-between px-4 py-4 safe-area-top mt-[60px]">
            <div>
              <h2 className="text-lg font-semibold text-white">朋友圈预览</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {orderedPhotos.length} / 9 张照片
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          {/* 3x3 网格 */}
          <main className="flex-1 flex items-center justify-center p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedPhotos.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="w-full max-w-[360px] aspect-square grid grid-cols-3 gap-1">
                  {/* 已选照片 */}
                  {orderedPhotos.map((photo, index) => (
                    <DraggablePhoto
                      key={photo.id}
                      photo={photo}
                      index={index}
                    />
                  ))}

                  {/* 占位格子 */}
                  {placeholders.map((i) => (
                    <div
                      key={`placeholder-${i}`}
                      className="aspect-square bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center"
                    >
                      <svg
                        className="w-8 h-8 text-slate-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </main>

          {/* 底部提示和导出按钮 */}
          <footer className="flex-none px-6 pb-8 pt-4 safe-area-bottom">
            {/* 导出按钮 */}
            <div className="flex justify-center mb-4">
              <ExportButton
                photos={orderedPhotos}
                variant="primary"
              />
            </div>

            <p className="text-slate-400 text-sm text-center">
              长按拖拽可调整照片顺序
            </p>
            <p className="text-slate-500 text-xs mt-2 text-center">
              建议按视觉风格统一排列，第一张最能代表整组风格
            </p>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
