import { useState, useEffect } from 'react'
import { adminFetch } from './AdminPanel'

interface Image {
  id: number
  user_id: number
  username?: string
  nickname?: string
  task_id?: number
  image_hash: string
  file_path: string
  thumbnail_path?: string
  file_size?: number
  width?: number
  height?: number
  mime_type?: string
  source: string
  created_at: string
}

function getImageUrl(filePath: string): string {
  return '/' + filePath.replace(/^data\//, '')
}

export function ImagesManager() {
  const [images, setImages] = useState<Image[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [userIdFilter, setUserIdFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<Image | null>(null)

  const fetchImages = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (userIdFilter) params.set('userId', userIdFilter)
      if (sourceFilter) params.set('source', sourceFilter)

      const res = await adminFetch(`/admin/images?${params}`)
      if (res.ok) {
        const data = await res.json()
        setImages(data.images)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('获取图片列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [page, userIdFilter, sourceFilter])

  const handleDelete = async (image: Image) => {
    if (!confirm(`确定要删除图片 #${image.id} 吗？`)) return

    const res = await adminFetch(`/admin/images/${image.id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchImages()
    } else {
      const data = await res.json()
      alert(data.error || '删除失败')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const sourceLabels: Record<string, string> = {
    upload: '上传',
    generated: '生成',
    mask: '蒙版',
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">图片管理</h2>
        <div className="text-sm text-[var(--text-secondary)]">共 {total} 张图片</div>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          placeholder="用户ID"
          value={userIdFilter}
          onChange={(e) => { setUserIdFilter(e.target.value); setPage(1) }}
          className="w-24 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">全部来源</option>
          <option value="upload">上传</option>
          <option value="generated">生成</option>
          <option value="mask">蒙版</option>
        </select>
      </div>

      {/* 图片网格 */}
      {loading ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">暂无图片</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative bg-[var(--bg-tertiary)] rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <div className="aspect-square">
                <img
                  src={getImageUrl(image.file_path)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end">
                <div className="w-full p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <div>#{image.id} | {image.username || `用户#${image.user_id}`}</div>
                  <div>{sourceLabels[image.source] || image.source}</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(image)
                }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-[var(--bg-tertiary)] disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded bg-[var(--bg-tertiary)] disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* 图片详情弹窗 */}
      {selectedImage && (
        <ImageDetailModal
          image={selectedImage}
          onDelete={() => {
            handleDelete(selectedImage)
            setSelectedImage(null)
          }}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  )
}

function ImageDetailModal({ image, onDelete, onClose }: { image: Image; onDelete: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">图片详情 #{image.id}</h3>
          <button onClick={onClose} className="text-2xl leading-none">&times;</button>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <img
              src={getImageUrl(image.file_path)}
              alt=""
              className="w-full rounded-lg"
            />
          </div>
          <div className="w-full md:w-64 space-y-3 text-sm">
            <div>
              <span className="text-[var(--text-secondary)]">ID: </span>
              {image.id}
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">用户: </span>
              {image.username || `#${image.user_id}`}
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">来源: </span>
              {image.source === 'upload' ? '上传' : image.source === 'generated' ? '生成' : '蒙版'}
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">大小: </span>
              {image.file_size ? `${(image.file_size / 1024).toFixed(1)} KB` : '-'}
            </div>
            {image.width && image.height && (
              <div>
                <span className="text-[var(--text-secondary)]">尺寸: </span>
                {image.width} x {image.height}
              </div>
            )}
            <div>
              <span className="text-[var(--text-secondary)]">类型: </span>
              {image.mime_type || '-'}
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">哈希: </span>
              <span className="text-xs break-all">{image.image_hash}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">创建时间: </span>
              {image.created_at}
            </div>
            <button
              onClick={onDelete}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
            >
              删除此图片
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
