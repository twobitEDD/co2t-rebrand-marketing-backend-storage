import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, 'uploads')
const STORAGE_SECRET = process.env.STORAGE_SECRET || 'dev-storage-secret'

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`
    cb(null, name)
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

app.post('/upload', checkSecret, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  const baseUrl = filesBaseUrl()
  const url = `${baseUrl}/${req.file.filename}`
  res.json({ url, filename: req.file.filename })
})

app.get('/files/:filename', (req, res) => {
  const file = path.join(UPLOAD_DIR, req.params.filename)
  if (!fs.existsSync(file)) return res.status(404).send('Not found')
  res.sendFile(file)
})

app.listen(PORT, () => console.log(`Storage listening on ${PORT}`))
