import { useState, useEffect } from 'react'
import { adminFetch } from './AdminPanel'

interface Provider {
  id: number
  name: string
  provider_type: string
  base_url: string
  api_key: string
  api_mode: string
  is_active: number
  config_json?: any
  created_at: string
  updated_at: string
}

export function ProvidersManager() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchProviders = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/admin/providers')
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers)
      }
    } catch (err) {
      console.error('获取服务商列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  const handleToggleActive = async (provider: Provider) => {
    const res = await adminFetch(`/admin/providers/${provider.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: provider.is_active ? 0 : 1 }),
    })
    if (res.ok) fetchProviders()
  }

  const handleDelete = async (provider: Provider) => {
    if (!confirm(`确定要删除服务商 ${provider.name} 吗？`)) return

    const res = await adminFetch(`/admin/providers/${provider.id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchProviders()
    } else {
      const data = await res.json()
      alert(data.error || '删除失败')
    }
  }

  const handleSave = async (providerData: Partial<Provider>) => {
    const url = editingProvider ? `/admin/providers/${editingProvider.id}` : '/admin/providers'
    const method = editingProvider ? 'PUT' : 'POST'

    const res = await adminFetch(url, {
      method,
      body: JSON.stringify(providerData),
    })
    if (res.ok) {
      setEditingProvider(null)
      setShowAddModal(false)
      fetchProviders()
    } else {
      const data = await res.json()
      alert(data.error || '保存失败')
    }
  }

  const typeLabels: Record<string, string> = {
    openai: 'OpenAI 兼容',
    fal: 'fal.ai',
    custom: '自定义',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">服务商管理</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90"
        >
          添加服务商
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
      ) : providers.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">暂无服务商，请先添加</div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`p-4 rounded-lg ${
                provider.is_active ? 'bg-[var(--bg-tertiary)]' : 'bg-[var(--bg-tertiary)] opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                      {typeLabels[provider.provider_type] || provider.provider_type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      {provider.api_mode}
                    </span>
                    {!provider.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                        已禁用
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {provider.base_url} | API Key: {provider.api_key}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggleActive(provider)}
                    className={`px-2 py-1 text-xs rounded ${
                      provider.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {provider.is_active ? '启用' : '禁用'}
                  </button>
                  <button
                    onClick={() => setEditingProvider(provider)}
                    className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(provider)}
                    className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加/编辑服务商弹窗 */}
      {(showAddModal || editingProvider) && (
        <ProviderFormModal
          provider={editingProvider}
          onSave={handleSave}
          onClose={() => {
            setShowAddModal(false)
            setEditingProvider(null)
          }}
        />
      )}
    </div>
  )
}

function ProviderFormModal({
  provider,
  onSave,
  onClose,
}: {
  provider: Provider | null
  onSave: (data: Partial<Provider>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    provider_type: provider?.provider_type || 'openai',
    base_url: provider?.base_url || '',
    api_key: provider?.api_key || '',
    api_mode: provider?.api_mode || 'images',
    is_active: provider?.is_active ?? 1,
  })

  const handleSubmit = () => {
    if (!formData.name || !formData.base_url || !formData.api_key) {
      alert('请填写完整信息')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{provider ? '编辑服务商' : '添加服务商'}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="OpenAI"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">类型</label>
            <select
              value={formData.provider_type}
              onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="openai">OpenAI 兼容</option>
              <option value="fal">fal.ai</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">API 地址</label>
            <input
              type="text"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">API Key</label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">API 模式</label>
            <select
              value={formData.api_mode}
              onChange={(e) => setFormData({ ...formData, api_mode: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="images">Images API</option>
              <option value="responses">Responses API</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
            />
            启用
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:opacity-80"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
