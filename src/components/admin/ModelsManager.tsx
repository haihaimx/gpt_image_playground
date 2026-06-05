import { useState, useEffect } from 'react'
import { adminFetch } from './AdminPanel'

interface Model {
  id: number
  provider_id: number
  provider_name?: string
  provider_type?: string
  model_id: string
  display_name: string
  is_active: number
  supports_edit: number
  supports_mask: number
  supports_multi: number
  supports_stream: number
  allowed_sizes: string[]
  allowed_qualities: string[]
  allowed_formats: string[]
  max_n: number
  default_params: any
  daily_limit_per_user: number
  cost_per_use: number
  sort_order: number
}

interface Provider {
  id: number
  name: string
  provider_type: string
}

export function ModelsManager() {
  const [models, setModels] = useState<Model[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchModels = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/admin/models')
      if (res.ok) {
        const data = await res.json()
        setModels(data.models)
      }
    } catch (err) {
      console.error('获取模型列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProviders = async () => {
    try {
      const res = await adminFetch('/admin/providers')
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers)
      }
    } catch (err) {
      console.error('获取服务商列表失败:', err)
    }
  }

  useEffect(() => {
    fetchModels()
    fetchProviders()
  }, [])

  const handleToggleActive = async (model: Model) => {
    const res = await adminFetch(`/admin/models/${model.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: model.is_active ? 0 : 1 }),
    })
    if (res.ok) fetchModels()
  }

  const handleDelete = async (model: Model) => {
    if (!confirm(`确定要删除模型 ${model.display_name} 吗？`)) return

    const res = await adminFetch(`/admin/models/${model.id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchModels()
    } else {
      const data = await res.json()
      alert(data.error || '删除失败')
    }
  }

  const handleSave = async (modelData: Partial<Model>) => {
    const url = editingModel ? `/admin/models/${editingModel.id}` : '/admin/models'
    const method = editingModel ? 'PUT' : 'POST'

    const res = await adminFetch(url, {
      method,
      body: JSON.stringify(modelData),
    })
    if (res.ok) {
      setEditingModel(null)
      setShowAddModal(false)
      fetchModels()
    } else {
      const data = await res.json()
      alert(data.error || '保存失败')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">模型配置</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90"
        >
          添加模型
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
      ) : models.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">暂无模型，请先添加服务商和模型</div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                model.is_active ? 'bg-[var(--bg-tertiary)]' : 'bg-[var(--bg-tertiary)] opacity-50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{model.display_name}</span>
                  <span className="text-xs text-[var(--text-secondary)]">({model.model_id})</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    {model.provider_name}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  {model.provider_type} | 
                  编辑: {model.supports_edit ? '✓' : '✗'} | 
                  蒙版: {model.supports_mask ? '✓' : '✗'} | 
                  多图: {model.supports_multi ? '✓' : '✗'} |
                  每日限制: {model.daily_limit_per_user === -1 ? '无限' : model.daily_limit_per_user}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleToggleActive(model)}
                  className={`px-2 py-1 text-xs rounded ${
                    model.is_active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {model.is_active ? '启用' : '禁用'}
                </button>
                <button
                  onClick={() => setEditingModel(model)}
                  className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(model)}
                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加/编辑模型弹窗 */}
      {(showAddModal || editingModel) && (
        <ModelFormModal
          model={editingModel}
          providers={providers}
          onSave={handleSave}
          onClose={() => {
            setShowAddModal(false)
            setEditingModel(null)
          }}
        />
      )}
    </div>
  )
}

function ModelFormModal({
  model,
  providers,
  onSave,
  onClose,
}: {
  model: Model | null
  providers: Provider[]
  onSave: (data: Partial<Model>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    provider_id: model?.provider_id || (providers[0]?.id || 0),
    model_id: model?.model_id || '',
    display_name: model?.display_name || '',
    is_active: model?.is_active ?? 1,
    supports_edit: model?.supports_edit ?? 1,
    supports_mask: model?.supports_mask ?? 1,
    supports_multi: model?.supports_multi ?? 1,
    supports_stream: model?.supports_stream ?? 0,
    max_n: model?.max_n || 1,
    daily_limit_per_user: model?.daily_limit_per_user ?? -1,
    cost_per_use: model?.cost_per_use || 1,
    sort_order: model?.sort_order || 0,
  })

  const handleSubmit = () => {
    if (!formData.model_id || !formData.display_name) {
      alert('请填写模型ID和显示名称')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{model ? '编辑模型' : '添加模型'}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">服务商</label>
            <select
              value={formData.provider_id}
              onChange={(e) => setFormData({ ...formData, provider_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.provider_type})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">模型ID</label>
            <input
              type="text"
              value={formData.model_id}
              onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
              placeholder="gpt-image-1"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">显示名称</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="GPT Image 1"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">最大数量</label>
              <input
                type="number"
                value={formData.max_n}
                onChange={(e) => setFormData({ ...formData, max_n: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">每日限制</label>
              <input
                type="number"
                value={formData.daily_limit_per_user}
                onChange={(e) => setFormData({ ...formData, daily_limit_per_user: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">每次消耗</label>
              <input
                type="number"
                value={formData.cost_per_use}
                onChange={(e) => setFormData({ ...formData, cost_per_use: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">排序</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={!!formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              />
              启用
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={!!formData.supports_edit}
                onChange={(e) => setFormData({ ...formData, supports_edit: e.target.checked ? 1 : 0 })}
              />
              支持编辑
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={!!formData.supports_mask}
                onChange={(e) => setFormData({ ...formData, supports_mask: e.target.checked ? 1 : 0 })}
              />
              支持蒙版
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={!!formData.supports_multi}
                onChange={(e) => setFormData({ ...formData, supports_multi: e.target.checked ? 1 : 0 })}
              />
              支持多图
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={!!formData.supports_stream}
                onChange={(e) => setFormData({ ...formData, supports_stream: e.target.checked ? 1 : 0 })}
              />
              支持流式
            </label>
          </div>
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
