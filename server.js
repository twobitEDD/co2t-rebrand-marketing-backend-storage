import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Use /tmp on Railway/Vercel—ephemeral deploys often have read-only app dirs
const UPLOAD_DIR = process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL
  ? path.join(os.tmpdir(), 'co2t-uploads')
  : path.join(__dirname, 'uploads')
const STORAGE_SECRET = process.env.STORAGE_SECRET || 'dev-storage-secret'

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
// Verify writable at startup
try {
  const test = path.join(UPLOAD_DIR, '.write-check')
  fs.writeFileSync(test, 'ok')
  fs.unlinkSync(test)
} catch (e) {
  console.error('[startup] UPLOAD_DIR not writable:', UPLOAD_DIR, e.message)
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      cb(null, UPLOAD_DIR)
    } catch (e) {
      cb(e)
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB

const app = express()
app.use(cors())
app.use(express.json())

function checkSecret(req, res, next) {
  const secret = req.headers['x-storage-secret']
  if (!STORAGE_SECRET || secret !== STORAGE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

const PORT = process.env.PORT || 3002

function filesBaseUrl() {
  let base = (process.env.STORAGE_PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '')
  if (!base.endsWith('/files')) base += '/files'
  return base
}

app.get('/', (req, res) => res.status(200).json({ ok: true, service: 'co2t-storage' }))

app.post('/upload', checkSecret, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 10MB)' })
      }
      console.error('[upload] multer error:', err.code, err.message)
      return res.status(500).json({ error: err.message || 'Storage write failed' })
    }
    next()
  })
}, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })
    const baseUrl = filesBaseUrl()
    const url = `${baseUrl}/${req.file.filename}`
    res.json({ url, filename: req.file.filename })
  } catch (e) {
    console.error('[upload]', e.message)
    res.status(500).json({ error: e.message || 'Storage upload failed' })
  }
})

app.get('/files/:filename', (req, res) => {
  const file = path.join(UPLOAD_DIR, req.params.filename)
  if (!fs.existsSync(file)) return res.status(404).send('Not found')
  res.sendFile(file)
})

app.use((err, req, res, next) => {
  console.error('[error]', err?.message || err)
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
})

app.listen(PORT, () => console.log(`Storage listening on ${PORT}`))
