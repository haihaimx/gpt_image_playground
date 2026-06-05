import { useState, useEffect } from 'react'
import { adminFetch } from './AdminPanel'

interface Settings {
  site: { name: string; description: string }
  registration: { enabled: boolean; needApproval: boolean; defaultDailyLimit: number; defaultMonthlyLimit: number }
  upload: { maxSizeMb: number; maxReferenceImages: number }
  rate_limit: { enabled: boolean; maxRequestsPerMinute: number; maxRequestsPerHour: number }
  email: { enabled: boolean; host: string; port: number; secure: boolean; user: string; pass: string; from: string }
}

export function SettingsManager() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('site')

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
      }
    } catch (err) {
      console.error('获取设置失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (key: string, value: any) => {
    setSaving(true)
    try {
      const res = await adminFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        alert('保存成功')
        fetchSettings()
      } else {
        const data = await res.json()
        alert(data.error || '保存失败')
      }
    } catch (err) {
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
  }

  if (!settings) {
    return <div className="text-center py-8 text-red-400">获取设置失败</div>
  }

  const sections = [
    { key: 'site', label: '站点信息' },
    { key: 'registration', label: '注册设置' },
    { key: 'upload', label: '上传限制' },
    { key: 'rate_limit', label: '频率限制' },
    { key: 'email', label: '邮箱配置' },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">系统设置</h2>
      
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeSection === section.key
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] hover:opacity-80'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'site' && (
        <SiteSettings settings={settings.site} onSave={(v) => handleSave('site', v)} saving={saving} />
      )}
      {activeSection === 'registration' && (
        <RegistrationSettings settings={settings.registration} onSave={(v) => handleSave('registration', v)} saving={saving} />
      )}
      {activeSection === 'upload' && (
        <UploadSettings settings={settings.upload} onSave={(v) => handleSave('upload', v)} saving={saving} />
      )}
      {activeSection === 'rate_limit' && (
        <RateLimitSettings settings={settings.rate_limit} onSave={(v) => handleSave('rate_limit', v)} saving={saving} />
      )}
      {activeSection === 'email' && (
        <EmailSettings settings={settings.email} onSave={(v) => handleSave('email', v)} saving={saving} />
      )}
    </div>
  )
}

function SiteSettings({ settings, onSave, saving }: { settings: any; onSave: (v: any) => void; saving: boolean }) {
  const [name, setName] = useState(settings?.name || '')
  const [description, setDescription] = useState(settings?.description || '')

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1">站点名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">站点描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <button
        onClick={() => onSave({ name, description })}
        disabled={saving}
        className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function RegistrationSettings({ settings, onSave, saving }: { settings: any; onSave: (v: any) => void; saving: boolean }) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? true)
  const [needApproval, setNeedApproval] = useState(settings?.needApproval ?? false)
  const [defaultDailyLimit, setDefaultDailyLimit] = useState(settings?.defaultDailyLimit || 50)
  const [defaultMonthlyLimit, setDefaultMonthlyLimit] = useState(settings?.defaultMonthlyLimit || 1000)

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        开放注册
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={needApproval}
          onChange={(e) => setNeedApproval(e.target.checked)}
        />
        注册需要审批
      </label>
      <div>
        <label className="block text-sm mb-1">默认每日限额</label>
        <input
          type="number"
          value={defaultDailyLimit}
          onChange={(e) => setDefaultDailyLimit(Number(e.target.value))}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">默认每月限额</label>
        <input
          type="number"
          value={defaultMonthlyLimit}
          onChange={(e) => setDefaultMonthlyLimit(Number(e.target.value))}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <button
        onClick={() => onSave({ enabled, needApproval, defaultDailyLimit, defaultMonthlyLimit })}
        disabled={saving}
        className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function UploadSettings({ settings, onSave, saving }: { settings: any; onSave: (v: any) => void; saving: boolean }) {
  const [maxSizeMb, setMaxSizeMb] = useState(settings?.maxSizeMb || 50)
  const [maxReferenceImages, setMaxReferenceImages] = useState(settings?.maxReferenceImages || 16)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1">单张图片最大大小 (MB)</label>
        <input
          type="number"
          value={maxSizeMb}
          onChange={(e) => setMaxSizeMb(Number(e.target.value))}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">最大参考图数量</label>
        <input
          type="number"
          value={maxReferenceImages}
          onChange={(e) => setMaxReferenceImages(Number(e.target.value))}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <button
        onClick={() => onSave({ maxSizeMb, maxReferenceImages })}
        disabled={saving}
        className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function RateLimitSettings({ settings, onSave, saving }: { settings: any; onSave: (v: any) => void; saving: boolean }) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? true)
  const [maxRequestsPerMinute, setMaxRequestsPerMinute] = useState(settings?.maxRequestsPerMinute || 30)
  const [maxRequestsPerHour, setMaxRequestsPerHour] = useState(settings?.maxRequestsPerHour || 200)

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        启用频率限制
      </label>
      <div>
        <label className="block text-sm mb-1">每分钟最大请求数</label>
        <input
          type="number"
          value={maxRequestsPerMinute}
          onChange={(e) => setMaxRequestsPerMinute(Number(e.target.value))}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">每小时最大请求数</label>
        <input
          type="number"
          value={maxRequestsPerHour}
          onChange={(e) => setMaxRequestsPerHour(Number(e.target.value))}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <button
        onClick={() => onSave({ enabled, maxRequestsPerMinute, maxRequestsPerHour })}
        disabled={saving}
        className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function EmailSettings({ settings, onSave, saving }: { settings: any; onSave: (v: any) => void; saving: boolean }) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false)
  const [host, setHost] = useState(settings?.host || 'smtp.qq.com')
  const [port, setPort] = useState(settings?.port || 465)
  const [secure, setSecure] = useState(settings?.secure ?? true)
  const [user, setUser] = useState(settings?.user || '')
  const [pass, setPass] = useState(settings?.pass || '')
  const [from, setFrom] = useState(settings?.from || '')

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        启用邮件服务
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">SMTP 服务器</label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">端口</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={secure}
          onChange={(e) => setSecure(e.target.checked)}
        />
        SSL/TLS
      </label>
      <div>
        <label className="block text-sm mb-1">用户名</label>
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">密码/授权码</label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">发件人地址</label>
        <input
          type="text"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
      </div>
      <button
        onClick={() => onSave({ enabled, host, port, secure, user, pass, from })}
        disabled={saving}
        className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}
