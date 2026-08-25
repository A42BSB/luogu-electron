import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const tag = process.env.CNB_BRANCH || process.env.CNB_TAG
if (!tag) {
  console.error('No tag found')
  process.exit(1)
}

const ghToken = process.env.GH_TOKEN
const cnbToken = process.env.CNB_TOKEN
if (!ghToken || !cnbToken) {
  console.error('GH_TOKEN or CNB_TOKEN not set')
  process.exit(1)
}

const repo = 'A42Null/luogu-electron'
const cnbApi = 'https://cnb.cool/api/v1'
const ghApi = 'https://api.github.com'

const ghRelRes = await fetch(`${ghApi}/repos/${repo}/releases/tags/${tag}`, {
  headers: { Authorization: `token ${ghToken}`, Accept: 'application/vnd.github+json' }
})
if (!ghRelRes.ok) {
  console.error(`GitHub release not found: ${ghRelRes.status}`)
  process.exit(1)
}
const ghRel = await ghRelRes.json()

const cnbRelRes = await fetch(`${cnbApi}/repos/${repo}/releases`, {
  method: 'POST',
  headers: { Authorization: `token ${cnbToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ tag_name: tag, name: tag, draft: false, prerelease: tag.includes('-'), latest: true })
})
let cnbRelId
if (cnbRelRes.status === 201 || cnbRelRes.status === 200) {
  cnbRelId = (await cnbRelRes.json()).id
} else if (cnbRelRes.status === 409) {
  const getRes = await fetch(`${cnbApi}/repos/${repo}/releases/tags/${tag}`, {
    headers: { Authorization: `token ${cnbToken}`, Accept: 'application/json' }
  })
  cnbRelId = (await getRes.json()).id
} else {
  console.error(`CNB create release failed: ${cnbRelRes.status}`)
  process.exit(1)
}

await mkdir(distDir, { recursive: true })
for (const asset of ghRel.assets) {
  const localPath = path.join(distDir, asset.name)
  const buf = await fetch(asset.browser_download_url, {
    headers: { Authorization: `token ${ghToken}` }
  }).then(r => r.arrayBuffer())
  await writeFile(localPath, Buffer.from(buf))
  console.log(`Downloaded ${asset.name}`)
}

const files = await readdir(distDir)
for (const f of files) {
  const filePath = path.join(distDir, f)
  let content = await readFile(filePath)
  if (f === 'latest.yml') {
    const patched = content.toString().replace(/url: .*/g, `url: https://cnb.cool/A42Null/luogu-electron/-/releases/download/${tag}`)
    content = Buffer.from(patched)
    await writeFile(filePath, content)
    console.log('Patched latest.yml url to CNB')
  }
  const res = await fetch(`${cnbApi}/repos/${repo}/releases/${cnbRelId}/assets?name=${encodeURIComponent(f)}`, {
    method: 'POST',
    headers: {
      Authorization: `token ${cnbToken}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': content.length
    },
    body: content
  })
  if (!res.ok) {
    console.error(`Upload ${f} failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  console.log(`Uploaded ${f}`)
}

console.log('Done')