import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 仅在开发环境启用 vConsole 调试工具
if (import.meta.env.DEV) {
  void import('vconsole').then((VConsoleModule) => {
    const VConsole = VConsoleModule.default
    new VConsole()

    // 设置 vConsole 按钮为半透明
    const style = document.createElement('style')
    style.textContent = `
      #__vconsole .vc-switch {
        opacity: 0.5 !important;
      }
    `
    document.head.appendChild(style)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
