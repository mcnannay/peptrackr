import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

// Disable caching for index.html to force fresh UI after deploys
app.get('/', (req,res,next)=>{
  res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma','no-cache')
  res.set('Expires','0')
  next()
})

app.use(express.static(path.join(__dirname,'dist'), {
  maxAge: '1d', // cache static assets for a day
  etag: true
}))

app.get('/healthz',(req,res)=>res.json({ok:true}))
app.get('*',(req,res)=>{
  res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate')
  res.sendFile(path.join(__dirname,'dist','index.html'))
})
app.listen(80, ()=>console.log('PepTrackr listening on :80'))
