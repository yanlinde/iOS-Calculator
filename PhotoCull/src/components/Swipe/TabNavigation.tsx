import type { TabType } from './types';

interface TabNavigationProps {
  activeTab: TabType;
  remainingCount: number;
  keptCount: number;
  passedCount: number;
  onTabChange: (tab: TabType) => void;
}

/**
 * Tab 导航组件
 */
export function TabNavigation({
  activeTab,
  remainingCount,
  keptCount,
  passedCount,
  onTabChange,
}: TabNavigationProps) {
  const tabs: { id: TabType; label: string; count: number; activeClass: string }[] = [
    {
      id: 'pending',
      label: '待处理',
      count: remainingCount,
      activeClass: 'bg-slate-700 text-white',
    },
    {
      id: 'passed',
      label: '已淘汰',
      count: passedCount,
      activeClass: 'bg-red-500/20 text-red-400',
    },
    {
      id: 'kept',
      label: '已保留',
      count: keptCount,
      activeClass: 'bg-blue-500/20 text-blue-400',
    },
  ];

  return (
    <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab.id
              ? tab.activeClass
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {tab.label}
          <span className="ml-1">{tab.count}</span>
        </button>
      ))}
    </div>
  );
}
