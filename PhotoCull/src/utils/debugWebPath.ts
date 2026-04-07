/**
 * 调试 webPath 工具
 * 用于验证 webPath 在不同平台上的实际值和显示效果
 */

export interface WebPathDebugInfo {
  assetId: string;
  path?: string;
  webPath?: string;
  webPathPrefix?: string;  // http://, file://, blob:, etc
  canDisplay: boolean;
  loadTime: number;
  width?: number;          // 图片实际宽度
  height?: number;         // 图片实际高度
  error?: string;
}

/**
 * 测试 webPath 是否能直接显示，并获取尺寸
 */
export async function testWebPathDisplay(webPath: string): Promise<{ canDisplay: boolean; loadTime: number; width?: number; height?: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const startTime = performance.now();

    img.onload = () => {
      resolve({
        canDisplay: true,
        loadTime: performance.now() - startTime,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      resolve({
        canDisplay: false,
        loadTime: performance.now() - startTime,
        error: 'Image failed to load',
      });
    };

    // 5秒超时
    setTimeout(() => {
      resolve({
        canDisplay: false,
        loadTime: 5000,
        error: 'Timeout',
      });
    }, 5000);

    img.src = webPath;
  });
}

/**
 * 获取 webPath 前缀类型
 */
export function getWebPathPrefix(webPath?: string): string {
  if (!webPath) return 'undefined';
  if (webPath.startsWith('blob:')) return 'blob';
  if (webPath.startsWith('file://')) return 'file';
  if (webPath.startsWith('http://')) return 'http';
  if (webPath.startsWith('https://')) return 'https';
  if (webPath.startsWith('capacitor://')) return 'capacitor';
  if (webPath.startsWith('content://')) return 'content';
  return 'other';
}

/**
 * 批量测试 webPath
 * 使用方式：选择照片后调用此函数
 */
export async function debugWebPaths(references: { assetId: string; path?: string; webPath?: string }[]): Promise<WebPathDebugInfo[]> {
  console.log('[WebPathDebug] ===== 开始测试 webPath =====');
  console.log(`[WebPathDebug] 测试数量: ${references.length}`);

  const results: WebPathDebugInfo[] = [];

  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    console.log(`[WebPathDebug] 测试第 ${i + 1}/${references.length} 张...`);

    const prefix = getWebPathPrefix(ref.webPath);
    const testResult = ref.webPath
      ? await testWebPathDisplay(ref.webPath)
      : { canDisplay: false, loadTime: 0, error: 'No webPath' };

    const info: WebPathDebugInfo = {
      assetId: ref.assetId,
      path: ref.path?.substring(0, 50) + '...',
      webPath: ref.webPath?.substring(0, 50) + '...',
      webPathPrefix: prefix,
      canDisplay: testResult.canDisplay,
      loadTime: testResult.loadTime,
      width: testResult.width,
      height: testResult.height,
      error: testResult.error,
    };

    results.push(info);

    console.log(`[WebPathDebug] ${i + 1}. prefix=${prefix}, size=${testResult.width}x${testResult.height}, loadTime=${testResult.loadTime.toFixed(2)}ms`);
  }

  console.log('[WebPathDebug] ===== 测试完成 =====');

  // 计算尺寸统计
  const displayedPhotos = results.filter(r => r.canDisplay && r.width && r.height);
  const avgWidth = displayedPhotos.length > 0
    ? Math.round(displayedPhotos.reduce((sum, r) => sum + (r.width || 0), 0) / displayedPhotos.length)
    : 0;
  const avgHeight = displayedPhotos.length > 0
    ? Math.round(displayedPhotos.reduce((sum, r) => sum + (r.height || 0), 0) / displayedPhotos.length)
    : 0;
  const minWidth = displayedPhotos.length > 0
    ? Math.min(...displayedPhotos.map(r => r.width || 0))
    : 0;
  const maxWidth = displayedPhotos.length > 0
    ? Math.max(...displayedPhotos.map(r => r.width || 0))
    : 0;

  console.log('[WebPathDebug] 汇总:', {
    total: results.length,
    canDisplay: results.filter(r => r.canDisplay).length,
    byPrefix: results.reduce((acc, r) => {
      acc[r.webPathPrefix!] = (acc[r.webPathPrefix!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    avgLoadTime: (results.filter(r => r.canDisplay).reduce((sum, r) => sum + r.loadTime, 0) / results.filter(r => r.canDisplay).length || 0).toFixed(2) + 'ms',
    // 新增尺寸统计
    avgSize: `${avgWidth}x${avgHeight}`,
    sizeRange: `${minWidth}~${maxWidth}px`,
    sampleSizes: displayedPhotos.slice(0, 3).map(r => `${r.width}x${r.height}`),
  });

  return results;
}

/**
 * 快速检查：webPath 是否能直接用
 */
export function canUseWebPathDirectly(references: { webPath?: string }[]): boolean {
  // 如果有任何一个有 webPath，就认为可以用
  return references.some(r => !!r.webPath);
}
