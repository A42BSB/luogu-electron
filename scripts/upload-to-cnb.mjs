import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const tag = process.env.CNB_TAG || process.env.CI_COMMIT_TAG
if (!tag) {
  console.error('No tag found, skipping release')
  process.exit(0)
}

const token = process.env.CNB_TOKEN
if (!token) {
  console.error('CNB_TOKEN not set')
  process.exit(1)
}

const repo = 'A42Null/luogu-electron'
const apiBase = 'https://cnb.cool/api/v1'

// 创建 Release
const releaseBody = {
  tag_name: tag,
  name: tag,
  draft: false,
  prerelease: tag.includes('-')
}

let releaseId
const createRes = await fetch(`${apiBase}/repos/${repo}/releases`, {
  method: 'POST',
  headers: {
    'Authorization': `token ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify(releaseBody)
})

if (createRes.status === 201 || createRes.status === 200) {
  const data = await createRes.json()
  releaseId = data.id
  console.log(`Release created: ${releaseId}`)
} else if (createRes.status === 409) {
  // Release 已存在，获取 ID
  const getRes = await fetch(`${apiBase}/repos/${repo}/releases/tags/${tag}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/json' }
  })
  const data = await getRes.json()
  releaseId = data.id
  console.log(`Release exists: ${releaseId}`)
} else {
  console.error(`Create release failed: ${createRes.status} ${await createRes.text()}`)
  process.exit(1)
}

// 上传产物
const files = await readdir(distDir)
// 修正 latest.yml 里的 url 指向 CNB
const latestYmlPath = path.join(distDir, 'latest.yml')
try {
  let yml = await readFile(latestYmlPath, 'utf-8')
  yml = yml.replace(/url: .*/g, `url: https://cnb.cool/A42Null/luogu-electron/-/releases/download/${tag}`)
  await import('fs/promises').then(fs => fs.writeFile(latestYmlPath, yml))
  console.log('Patched latest.yml url to CNB')
} catch (_) {}
for (const file of files) {
  const filePath = path.join(distDir, file)
  const content = await readFile(filePath)
  console.log(`Uploading ${file}...`)
  const uploadRes = await fetch(`${apiBase}/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(file)}`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': content.length
    },
    body: content
  })
  if (!uploadRes.ok) {
    console.error(`Failed to upload ${file}: ${uploadRes.status} ${await uploadRes.text()}`)
    process.exit(1)
  }
  console.log(`Uploaded ${file}`)
}

console.log('All artifacts uploaded to CNB Release')