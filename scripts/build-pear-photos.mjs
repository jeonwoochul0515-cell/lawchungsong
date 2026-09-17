#!/usr/bin/env node
// 승인된 힉스필드 원본 PNG를 배포용 webp로 굽는다. 원본은 reference/ 아래에 그대로 남는다.
// 원본은 장당 6MB짜리 2752px PNG라 절대 배포 자산이 될 수 없다.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('../', import.meta.url))
const source = join(root, 'reference', 'pear-storyboard', 'photos')
const target = join(root, 'images', 'pear')

// wide/detail은 가로 1600, portrait는 세로 화면용이라 가로 960이면 충분하다.
const widthFor = (name) => (name.endsWith('-portrait') ? 960 : 1600)

await mkdir(target, { recursive: true })
const manifest = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8'))
const done = manifest.images.filter((x) => x.status === 'completed').sort((a, b) => a.name.localeCompare(b.name))
if (!done.length) throw new Error('완료된 원본이 없다')

const rows = []
for (const image of done) {
  const width = widthFor(image.name)
  const out = join(target, image.name + '.webp')
  await exec('ffmpeg', [
    '-v', 'error', '-y', '-i', join(source, image.name + '.png'),
    '-vf', `scale=${width}:-2`, '-c:v', 'libwebp', '-compression_level', '6', '-quality', '72',
    '-f', 'image2', out,
  ], { timeout: 180000 })
  const bytes = (await stat(out)).size
  rows.push({ file: image.name + '.webp', chapter: image.chapter, title: image.title, width, bytes })
  console.log(`${image.name.padEnd(22)} ${width}px  ${(bytes / 1024).toFixed(0)}KB`)
}

await writeFile(join(target, 'manifest.json'), JSON.stringify({
  provider: manifest.provider,
  model: manifest.model,
  notice: 'AI 생성 콘셉트 이미지 — 실제 사무실·법정·사건·의뢰인 사진이 아니다',
  photos: rows,
}, null, 2) + '\n')
console.log(`\n${rows.length}장, 합계 ${(rows.reduce((a, r) => a + r.bytes, 0) / 1024 / 1024).toFixed(2)}MB`)
