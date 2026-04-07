import type { UserPhoto } from '../../types/photo';

export type TabType = 'pending' | 'kept' | 'passed';

export interface SwipeViewProps {
  photos: UserPhoto[];
  startPhotoId?: string | null;
  onExit?: () => void;
}
