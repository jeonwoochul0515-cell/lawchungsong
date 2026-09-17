#!/usr/bin/env node
// 힉스필드 i2v 원본(mp4)을 스크롤 시퀀스용 webp 프레임으로 굽는다.
// 원본 mp4는 reference/ 아래에 남고 배포되지 않는다 — 배포되는 것은 여기서 나온 프레임뿐이다.
//
// 왜 mp4를 그대로 쓰지 않는가: <video>는 스크롤 위치에 맞춰 프레임을 정확히 세우지 못한다.
// currentTime을 밀어도 키프레임 단위로 튀고, iOS는 사용자 제스처 없이 seek이 막힌다.
// 프레임을 낱장으로 깔면 스크롤 좌표 → 프레임 인덱스가 1:1로 떨어진다.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir, mkdir, rm, writeFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('../', import.meta.url))
const films = join(root, 'reference', 'pear-storyboard', 'films')
const target = join(root, 'images', 'pear', 'seq')

// 데스크톱은 촘촘하게, 모바일은 성기게. 모바일에서 30장을 받게 하면 첫 화면이 늦어진다.
const variants = [
  { key: 'w', width: 1280, step: 4, quality: 62 },  // 121프레임 중 매 4장 → 31장
  { key: 'm', width: 720, step: 6, quality: 58 },   // 매 6장 → 21장
]

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })

const sources = (await readdir(films)).filter((f) => f.endsWith('.mp4')).sort()
if (!sources.length) throw new Error('원본 mp4가 없다: ' + films)

const manifest = { generated: new Date().toISOString().slice(0, 10), scenes: [] }

for (const file of sources) {
  const name = file.replace(/\.mp4$/, '')
  const scene = { name, variants: {} }
  for (const v of variants) {
    const dir = join(target, name, v.key)
    await mkdir(dir, { recursive: true })
    await exec('ffmpeg', [
      '-v', 'error', '-y', '-i', join(films, file),
      // not(mod(n,step)) — 균등 간격으로 솎아낸다. 앞뒤가 잘리지 않도록 select는 프레임 번호 기준.
      '-vf', `select='not(mod(n\\,${v.step}))',scale=${v.width}:-2`,
      // 함정 — libwebp는 기본값이 애니메이션 webp라 시퀀스가 한 장으로 묶인다.
      // `-f image2`로 낟장 출력을 강제해야 한다.
      '-vsync', '0', '-c:v', 'libwebp', '-compression_level', '6', '-quality', String(v.quality),
      '-f', 'image2', join(dir, 'f%03d.webp'),
    ], { timeout: 300000 })
    const frames = (await readdir(dir)).filter((f) => f.endsWith('.webp')).sort()
    if (frames.length < 10) throw new Error('프레임이 너무 적다: ' + name + '/' + v.key + ' = ' + frames.length)
    let bytes = 0
    for (const f of frames) bytes += (await stat(join(dir, f))).size
    scene.variants[v.key] = { width: v.width, frames: frames.length, bytes, pattern: `/images/pear/seq/${name}/${v.key}/f%03d.webp` }
    console.log(`${name}/${v.key}  ${frames.length}프레임  ${(bytes / 1024).toFixed(0)}KB  (장당 ${(bytes / frames.length / 1024).toFixed(1)}KB)`)
  }
  manifest.scenes.push(scene)
}

await writeFile(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const total = manifest.scenes.reduce((a, s) => a + s.variants.w.bytes + s.variants.m.bytes, 0)
console.log(`\n장면 ${manifest.scenes.length}개, 합계 ${(total / 1024 / 1024).toFixed(2)}MB`)
