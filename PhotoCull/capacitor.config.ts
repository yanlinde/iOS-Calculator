import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.photocull.app',
  appName: 'PhotoCull',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f172a',
    // 禁用滚动弹跳效果，更符合原生应用感觉
    scrollEnabled: false,
  },
  plugins: {
    Camera: {
      // iOS 权限描述
      ios: {
        usageDescription: 'PhotoCull 需要访问您的相册来导入和管理照片',
      },
    },
  },
};

export default config;
