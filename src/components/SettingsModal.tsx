import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore, exportData, importData, clearData, type SettingsTab } from '../store'
import { normalizeAgentMaxToolRounds } from '../lib/apiProfiles'
import { DEFAULT_AGENT_MAX_TOOL_ROUNDS, type AppSettings } from '../types'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { usePreventBackgroundScroll } from '../hooks/usePreventBackgroundScroll'
import Select from './Select'
import { Checkbox } from './Checkbox'
import { CloseIcon, GithubIcon, ExportIcon, ImportIcon, TrashIcon } from './icons'

export default function SettingsModal() {
  const showSettings = useStore((s) => s.showSettings)
  const settingsTabRequest = useStore((s) => s.settingsTabRequest)
  const setShowSettings = useStore((s) => s.setShowSettings)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const setConfirmDialog = useStore((s) => s.setConfirmDialog)
  const showToast = useStore((s) => s.showToast)
  const importInputRef = useRef<HTMLInputElement>(null)
  const settingsScrollBoundaryRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<AppSettings>(settings)
  const [agentMaxToolRoundsInput, setAgentMaxToolRoundsInput] = useState(String(settings.agentMaxToolRounds))
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [exportConfig, setExportConfig] = useState(true)
  const [exportTasks, setExportTasks] = useState(true)
  const [importConfig, setImportConfig] = useState(true)
  const [importTasks, setImportTasks] = useState(true)
  const [clearConfig, setClearConfig] = useState(true)
  const [clearTasks, setClearTasks] = useState(true)
  const [isImportingData, setIsImportingData] = useState(false)

  const wasSettingsOpenRef = useRef(false)

  useEffect(() => {
    if (!showSettings) {
      wasSettingsOpenRef.current = false
      return
    }
    if (wasSettingsOpenRef.current) return
    wasSettingsOpenRef.current = true
    setDraft(settings)
    setAgentMaxToolRoundsInput(String(settings.agentMaxToolRounds))
  }, [showSettings, settings])

  useEffect(() => {
    if (showSettings && settingsTabRequest) setActiveTab(settingsTabRequest)
  }, [settingsTabRequest, showSettings])

  const commitSettings = useCallback((nextDraft: AppSettings) => {
    setDraft(nextDraft)
    setSettings(nextDraft)
  }, [setSettings])

  const handleClose = useCallback(() => {
    const normalizedAgentMaxToolRounds = agentMaxToolRoundsInput.trim() === ''
      ? DEFAULT_AGENT_MAX_TOOL_ROUNDS
      : normalizeAgentMaxToolRounds(agentMaxToolRoundsInput, draft.agentMaxToolRounds)
    setAgentMaxToolRoundsInput(String(normalizedAgentMaxToolRounds))
    if (normalizedAgentMaxToolRounds !== draft.agentMaxToolRounds) {
      commitSettings({ ...draft, agentMaxToolRounds: normalizedAgentMaxToolRounds })
    }
    setShowSettings(false)
  }, [agentMaxToolRoundsInput, draft, commitSettings, setShowSettings])

  const commitAgentMaxToolRounds = useCallback(() => {
    const value = agentMaxToolRoundsInput.trim() === ''
      ? DEFAULT_AGENT_MAX_TOOL_ROUNDS
      : normalizeAgentMaxToolRounds(agentMaxToolRoundsInput, draft.agentMaxToolRounds)
    setAgentMaxToolRoundsInput(String(value))
    if (value !== draft.agentMaxToolRounds) commitSettings({ ...draft, agentMaxToolRounds: value })
  }, [agentMaxToolRoundsInput, draft, commitSettings])

  useCloseOnEscape(showSettings, handleClose)
  usePreventBackgroundScroll(showSettings, settingsScrollBoundaryRef)

  if (!showSettings) return null

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsImportingData(true)
      try {
        const imported = await importData(file, { importConfig, importTasks })
        if (imported) {
          const nextDraft = useStore.getState().settings
          setDraft(nextDraft)
        }
      } finally {
        setIsImportingData(false)
      }
    }
    if (importInputRef.current) importInputRef.current.value = ''
  }

  const handleClearAllData = async () => {
    await clearData({ clearConfig, clearTasks })
    const nextDraft = useStore.getState().settings
    setDraft(nextDraft)
    showToast('所选数据已清除', 'success')
  }

  return (
    <div data-no-drag-select className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-overlay-in"
        onClick={handleClose}
      />
      <div
        ref={settingsScrollBoundaryRef}
        className="relative z-10 w-full max-w-3xl rounded-2xl sm:rounded-3xl border border-white/50 bg-white/95 shadow-2xl ring-1 ring-black/5 animate-modal-in dark:border-white/[0.08] dark:bg-gray-900/95 dark:ring-white/10 flex h-[90vh] sm:h-[600px] flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 p-4 sm:p-5 border-b border-gray-100 dark:border-white/[0.08]">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设置
          </h3>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-gray-400 dark:text-gray-500 font-mono select-none">v{__APP_VERSION__}</span>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
              aria-label="关闭"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          {/* Sidebar */}
          <div className="w-full sm:w-44 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02]">
            <nav className="flex-1 overflow-x-auto sm:overflow-y-auto custom-scrollbar p-2 sm:p-3 space-x-1 sm:space-x-0 sm:space-y-1 flex sm:flex-col">
              {[
                { key: 'general' as const, label: '习惯配置', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" /> },
                { key: 'agent' as const, label: 'Agent 配置', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 14h2M20 14h2M15 13v2M9 13v2" /></> },
                { key: 'data' as const, label: '数据管理', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /> },
                { key: 'about' as const, label: '关于', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap flex-shrink-0 flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg sm:rounded-xl transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-white/[0.08] shadow-sm text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {tab.icon}
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent relative overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6">

              {/* 习惯配置 */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="hidden sm:block">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="block text-sm text-gray-600 dark:text-gray-300">任务提交方式</span>
                      <div className="w-32">
                        <Select
                          value={draft.enterSubmit ? 'enter' : 'ctrl-enter'}
                          onChange={(val) => commitSettings({ ...draft, enterSubmit: val === 'enter' })}
                          options={[
                            { label: 'Enter', value: 'enter' },
                            { label: navigator.userAgent.includes('Mac') ? 'Cmd + Enter' : 'Ctrl + Enter', value: 'ctrl-enter' }
                          ]}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.06] text-xs transition-all duration-200 shadow-sm text-gray-700 dark:text-gray-200 outline-none"
                        />
                      </div>
                    </div>
                    <div data-selectable-text className="text-xs text-gray-500 dark:text-gray-500">
                      选择 Enter 提交时，使用 Shift + Enter 换行；否则直接 Enter 换行。
                    </div>
                  </div>
                  <div className="block">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="block text-sm text-gray-600 dark:text-gray-300">提交任务后清空输入框</span>
                      <button
                        type="button"
                        onClick={() => commitSettings({ ...draft, clearInputAfterSubmit: !draft.clearInputAfterSubmit })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${draft.clearInputAfterSubmit ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        role="switch"
                        aria-checked={draft.clearInputAfterSubmit}
                        aria-label="提交任务后清空输入框"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${draft.clearInputAfterSubmit ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                      </button>
                    </div>
                    <div data-selectable-text className="text-xs text-gray-500 dark:text-gray-500">
                      开启后，提交成功创建任务时会清空提示词和参考图。
                    </div>
                  </div>
                  <div className="block">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="block text-sm text-gray-600 dark:text-gray-300">参考图编辑按钮</span>
                      <div className="w-32">
                        <Select
                          value={draft.referenceImageEditAction}
                          onChange={(val) => commitSettings({ ...draft, referenceImageEditAction: val as AppSettings['referenceImageEditAction'] })}
                          options={[
                            { label: '询问', value: 'ask' },
                            { label: '替换参考图', value: 'replace-reference' },
                            { label: '添加遮罩', value: 'add-mask' },
                          ]}
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.06] text-xs transition-all duration-200 shadow-sm text-gray-700 dark:text-gray-200 outline-none"
                        />
                      </div>
                    </div>
                    <div data-selectable-text className="text-xs text-gray-500 dark:text-gray-500">
                      控制未添加遮罩的参考图点击编辑按钮时，是每次询问、直接替换参考图，还是直接添加遮罩。
                    </div>
                  </div>
                  <div className="block">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="block text-sm text-gray-600 dark:text-gray-300">重启后加载上次的输入框</span>
                      <button
                        type="button"
                        onClick={() => commitSettings({ ...draft, persistInputOnRestart: !draft.persistInputOnRestart })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${draft.persistInputOnRestart ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        role="switch"
                        aria-checked={draft.persistInputOnRestart}
                        aria-label="重启后加载上次的输入框"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${draft.persistInputOnRestart ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                      </button>
                    </div>
                    <div data-selectable-text className="text-xs text-gray-500 dark:text-gray-500">
                      关闭后，不再持久化提示词和参考图，下次启动会使用空输入框。
                    </div>
                  </div>
                  <div className="block">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="block text-sm text-gray-600 dark:text-gray-300">成功任务仍然展示重试按钮</span>
                      <button
                        type="button"
                        onClick={() => commitSettings({ ...draft, alwaysShowRetryButton: !draft.alwaysShowRetryButton })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${draft.alwaysShowRetryButton ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        role="switch"
                        aria-checked={draft.alwaysShowRetryButton}
                        aria-label="成功任务仍然展示重试按钮"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${draft.alwaysShowRetryButton ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                      </button>
                    </div>
                    <div data-selectable-text className="text-xs text-gray-500 dark:text-gray-500">
                      开启后，即使任务成功生成，也会在任务卡片和详情页显示重试按钮。
                    </div>
                  </div>
                  <div className="block">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="block text-sm text-gray-600 dark:text-gray-300">发送消息后自动滚动到底部</span>
                      <button
                        type="button"
                        onClick={() => commitSettings({ ...draft, agentScrollToBottomAfterSubmit: !draft.agentScrollToBottomAfterSubmit })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${draft.agentScrollToBottomAfterSubmit ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        role="switch"
                        aria-checked={draft.agentScrollToBottomAfterSubmit}
                        aria-label="发送消息后自动滚动到底部"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${draft.agentScrollToBottomAfterSubmit ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                      </button>
                    </div>
                    <div data-selectable-text className="text-xs text-gray-500 dark:text-gray-500">
                      开启后，在 Agent 模式发送消息成功后会自动滚动到对话底部。
                    </div>
                  </div>
                </div>
              )}

              {/* Agent 配置 */}
              {activeTab === 'agent' && (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-600 dark:text-gray-300">最大工具调用轮数</span>
                    <input
                      value={agentMaxToolRoundsInput}
                      onChange={(e) => setAgentMaxToolRoundsInput(e.target.value)}
                      onBlur={commitAgentMaxToolRounds}
                      type="number"
                      min={1}
                      max={50}
                      className="w-full rounded-xl border border-gray-200/70 bg-white/60 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:focus:border-blue-500/50"
                    />
                    <div data-selectable-text className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-500">
                      默认 15。用于限制 Agent 连续调用工具时的最大轮数，防止无限循环。
                    </div>
                  </label>
                  <div className="block">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="block text-sm text-gray-600 dark:text-gray-300">网络搜索</span>
                      <button
                        type="button"
                        onClick={() => {
                          const agentMaxToolRounds = agentMaxToolRoundsInput.trim() === ''
                            ? DEFAULT_AGENT_MAX_TOOL_ROUNDS
                            : normalizeAgentMaxToolRounds(agentMaxToolRoundsInput, draft.agentMaxToolRounds)
                          setAgentMaxToolRoundsInput(String(agentMaxToolRounds))
                          commitSettings({ ...draft, agentMaxToolRounds, agentWebSearch: !draft.agentWebSearch })
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${draft.agentWebSearch ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        role="switch"
                        aria-checked={draft.agentWebSearch}
                        aria-label="网络搜索"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${draft.agentWebSearch ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                      </button>
                    </div>
                    <div data-selectable-text className="text-xs text-gray-500 dark:text-gray-500">
                      启用 Responses API 的 <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] dark:bg-white/[0.06]">web_search</code> 工具。模型每次调用此工具会产生少量固定价格的额外计费。
                    </div>
                  </div>
                </div>
              )}

              {/* 数据管理 */}
              {activeTab === 'data' && (
                <div className="space-y-4">
                  <div className="rounded-xl sm:rounded-2xl bg-gray-50/80 p-3 sm:p-4 border border-gray-200/60 dark:bg-white/[0.02] dark:border-white/[0.05] flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div className="text-xs sm:text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                      所有的任务记录和生成的图片均仅保存在您的浏览器本地。如果您需要清理浏览器站点数据、重置浏览器或使用其他设备，请先导出备份。
                    </div>
                  </div>

                  <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 dark:border-white/[0.06] dark:bg-white/[0.02] space-y-3 sm:space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <ExportIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">导出数据</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      <Checkbox checked={exportConfig} onChange={setExportConfig} label="包含配置" />
                      <Checkbox checked={exportTasks} onChange={setExportTasks} label="包含任务和图片" />
                    </div>
                    <button
                      onClick={() => exportData({ exportConfig, exportTasks })}
                      disabled={!exportConfig && !exportTasks}
                      className="w-full rounded-xl bg-gray-100/80 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 disabled:hover:bg-gray-100/80 disabled:hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1] dark:hover:text-white dark:disabled:hover:bg-white/[0.06] dark:disabled:hover:text-gray-300 flex items-center justify-center gap-2"
                    >
                      导出所选数据
                    </button>
                  </div>

                  <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3 sm:p-4 dark:border-white/[0.06] dark:bg-white/[0.02] space-y-3 sm:space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <ImportIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">导入数据</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      <Checkbox checked={importConfig} onChange={setImportConfig} label="包含配置" />
                      <Checkbox checked={importTasks} onChange={setImportTasks} label="包含任务和图片" />
                    </div>
                    <button
                      onClick={() => importInputRef.current?.click()}
                      disabled={(!importConfig && !importTasks) || isImportingData}
                      className="w-full rounded-xl bg-gray-100/80 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 disabled:hover:bg-gray-100/80 disabled:hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1] dark:hover:text-white dark:disabled:hover:bg-white/[0.06] dark:disabled:hover:text-gray-300 flex items-center justify-center gap-2"
                    >
                      {isImportingData ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          导入中...
                        </>
                      ) : (
                        '从 ZIP 导入所选数据'
                      )}
                    </button>
                    <input ref={importInputRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
                  </div>

                  <div className="rounded-xl sm:rounded-2xl border border-red-100/50 bg-red-50/30 p-3 sm:p-4 dark:border-red-500/10 dark:bg-red-500/5 space-y-3 sm:space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <TrashIcon className="w-4 h-4 text-red-500/90 dark:text-red-400" />
                      <h4 className="text-sm font-bold text-red-500/90 dark:text-red-400">清除数据</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      <Checkbox checked={clearConfig} onChange={setClearConfig} label="包含配置" tone="danger" />
                      <Checkbox checked={clearTasks} onChange={setClearTasks} label="包含任务和图片" tone="danger" />
                    </div>
                    <button
                      onClick={() =>
                        setConfirmDialog({
                          title: '清空所选数据',
                          message: '确定要清空所选的数据吗？此操作不可恢复。',
                          action: () => handleClearAllData(),
                        })
                      }
                      disabled={!clearConfig && !clearTasks}
                      className="w-full rounded-xl border border-red-200/60 bg-red-50/50 px-4 py-2.5 text-sm font-medium text-red-500 transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50 disabled:hover:bg-red-50/50 disabled:hover:border-red-200/60 disabled:hover:text-red-500 dark:border-red-500/15 dark:bg-red-500/5 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 dark:hover:text-red-300 dark:disabled:hover:bg-red-500/5 dark:disabled:hover:border-red-500/15 dark:disabled:hover:text-red-400"
                    >
                      清空所选数据
                    </button>
                  </div>
                </div>
              )}

              {/* 关于 */}
              {activeTab === 'about' && (
                <div className="flex h-full min-h-[250px] sm:min-h-[300px] flex-col items-center justify-center pb-6 sm:pb-8 px-4 sm:px-6">
                  <a
                    href="https://github.com/CookSleep/gpt_image_playground"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center outline-none"
                  >
                    <div className="mb-4 sm:mb-5 flex h-16 w-16 sm:h-[88px] sm:w-[88px] items-center justify-center rounded-full border border-gray-200/80 bg-gray-50/50 text-gray-800 transition-colors group-hover:bg-gray-100 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-100 dark:group-hover:bg-white/[0.06]">
                      <GithubIcon className="h-9 w-9 sm:h-11 sm:w-11" />
                    </div>
                    <h4 className="text-base sm:text-[17px] font-bold text-gray-800 dark:text-gray-100">GPT Image Playground</h4>
                    <p className="mt-1 sm:mt-1.5 text-xs sm:text-[13px] text-gray-500 transition-colors group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300">
                      @CookSleep
                    </p>
                  </a>
                  
                  <p className="mt-6 sm:mt-8 mb-5 sm:mb-6 max-w-[360px] text-center text-xs sm:text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                    本项目的成长离不开每一位用户的使用、反馈、贡献与支持，感谢一路有你。
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    <a
                      href="https://github.com/CookSleep/gpt_image_playground/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gray-100/80 px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 hover:text-gray-900 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
                    >
                      <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      反馈问题
                    </a>
                    <a
                      href="https://www.ifdian.net/a/cooksleep"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gray-100/80 px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 hover:text-gray-900 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
                    >
                      <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      赞助作者
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
