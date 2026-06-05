import { startApp } from './app.js'

const PORT = process.env.PORT || 3000

async function main() {
  try {
    const app = await startApp()
    
    app.listen(PORT, () => {
      console.log(`服务器已启动: http://localhost:${PORT}`)
      console.log(`API 地址: http://localhost:${PORT}/api`)
    })
  } catch (err) {
    console.error('启动失败:', err)
    process.exit(1)
  }
}

main()
