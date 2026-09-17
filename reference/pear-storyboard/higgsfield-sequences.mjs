// 기준컷을 image-to-video로 움직여 연속 프레임을 얻는다.
// 스크롤 시퀀스의 생명은 프레임 간 연속성이다 — 같은 프롬프트로 사진을 여러 장 뽑으면
// 매 장이 다른 장면이 되어 깜빡인다. 한 장의 사진에서 출발한 영상만이 진짜로 이어진다.
//
// 실행: node reference/pear-storyboard/higgsfield-sequences.mjs upload   (기준컷 업로드)
//       node reference/pear-storyboard/higgsfield-sequences.mjs submit   (i2v 제출)
//       node reference/pear-storyboard/higgsfield-sequences.mjs collect  (mp4 내려받기)
//
// 함정 — `--start-image`에 로컬 경로를 주면 S3 서명이 깨진다(CLI 1.1.10).
// `higgsfield upload create`로 먼저 올려 UUID를 받아 넘겨야 한다.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('./', import.meta.url))
const photos = join(root, 'photos')
const output = join(root, 'films')
await mkdir(output, { recursive: true })
const manifestFile = join(output, 'manifest.json')

// 카메라 무브는 느릴수록 좋다. 스크롤에 맞춰 사람이 직접 스크럽하는 화면이라,
// 원본이 빠르면 조금만 굴려도 장면이 확 튄다.
const shots = [
  {
    name: '01-arrival', source: '01-arrival-wide',
    prompt:
      'Extremely slow, steady dolly-in toward the tall lit window at the end of the stone hall. ' +
      'Locked tripod feel, no handheld shake, no rack focus, no cuts. The light shaft creeps slightly across the floor. ' +
      'Nothing enters or leaves the frame. No people, no text, no camera flare.',
  },
  {
    name: '04-reading', source: '04-reading-wide',
    prompt:
      'Extremely slow lateral drift to the right across the walnut desk, revealing the stepped blank documents. ' +
      'Locked, level move, no rotation, no zoom, no cuts. Lamp light stays constant. ' +
      'Papers remain completely blank. No people, no text appearing.',
  },
  {
    name: '07-standing', source: '07-standing-wide',
    prompt:
      'Extremely slow push-in toward the brass microphone on the counsel table, the bench staying soft behind. ' +
      'Locked tripod feel, no shake, no focus pull, no cuts. Ambient light unchanged. ' +
      'No people enter, no emblem or text appears.',
  },
  {
    name: '10-after', source: '10-after-wide',
    prompt:
      'Extremely slow dolly forward toward the open doorway and the morning city beyond. ' +
      'Locked, level move, no rotation, no exposure change, no cuts. The door does not move. ' +
      'No people, no birds, no signage or readable text appearing.',
  },
  {
    name: '13-counsel', source: '13-counsel-wide',
    prompt:
      'Extremely slow arc to the right around the small round table, chairs holding their position in frame. ' +
      'Smooth gimbal-on-rails feel, no bounce, no zoom, no cuts. Curtain and foliage stay almost still. ' +
      'No people sit down, no text appears.',
  },
]

let manifest
try {
  manifest = JSON.parse(await readFile(manifestFile, 'utf8'))
} catch (e) {
  if (e.code !== 'ENOENT') throw e
  manifest = { provider: 'Higgsfield', model: 'kling3_0', mode: 'std', duration: 5, purpose: '스크롤 시퀀스용 연속 프레임 원본', films: [] }
}
const save = () => writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n')

async function cli(args, timeout = 300000) {
  const { stdout } = await exec(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', '$cliArgs = ConvertFrom-Json $env:HF_ARGS; & higgsfield @cliArgs; exit $LASTEXITCODE'],
    { env: { ...process.env, HF_ARGS: JSON.stringify([...args, '--json']) }, timeout, maxBuffer: 8 * 1024 * 1024 },
  )
  return JSON.parse(stdout)
}

const entry = (name) => manifest.films.find((x) => x.name === name)

const mode = process.argv[2] || 'collect'

if (mode === 'upload') {
  for (const shot of shots) {
    if (entry(shot.name)?.upload_id) continue
    const up = await cli(['upload', 'create', join(photos, shot.source + '.png')])
    if (!up.id) throw new Error('업로드 응답에 id가 없다: ' + shot.name)
    manifest.films.push({ name: shot.name, source: shot.source, upload_id: up.id, status: 'uploaded' })
    await save()
    console.log('업로드', shot.name, up.id)
  }
} else if (mode === 'submit') {
  for (const shot of shots) {
    const film = entry(shot.name)
    if (!film?.upload_id) throw new Error('먼저 upload를 돌려야 한다: ' + shot.name)
    if (film.id) continue
    const args = ['kling3_0', '--prompt', shot.prompt, '--start-image', film.upload_id, '--duration', '5', '--mode', 'std', '--sound', 'off', '--aspect-ratio', '16:9']
    const cost = await cli(['generate', 'cost', ...args])
    // 영상은 사진보다 10배 비싸다. 단가가 더 뛰면 조용히 소진되기 전에 여기서 멈춘다.
    if (typeof cost.credits !== 'number' || cost.credits > 10) throw new Error('예상 밖 생성 비용: ' + JSON.stringify(cost))
    const ids = await cli(['generate', 'create', ...args])
    if (!Array.isArray(ids) || ids.length !== 1) throw new Error('작업 접수 응답이 예상과 다르다: ' + JSON.stringify(ids))
    Object.assign(film, { id: ids[0], prompt: shot.prompt, estimated_credits: cost.credits, status: 'submitted' })
    await save()
    console.log('제출', shot.name, ids[0], cost.credits, '크레딧')
  }
} else if (mode === 'collect') {
  for (const film of manifest.films) {
    const target = join(output, film.name + '.mp4')
    try { await access(target); if (film.status === 'completed') continue } catch {}
    let job = await cli(['generate', 'get', film.id])
    if (job.status !== 'completed') job = await cli(['generate', 'wait', film.id, '--timeout', '15m', '--interval', '10s'], 960000)
    if (job.status !== 'completed' || !job.result_url) throw new Error('생성이 끝나지 않았다: ' + film.name + ' (' + job.status + ')')
    const response = await fetch(job.result_url)
    if (!response.ok) throw new Error('내려받기 실패 ' + response.status + ': ' + film.name)
    const data = Buffer.from(await response.arrayBuffer())
    // mp4 시그니처(ftyp) 검사 — 오류 HTML을 영상으로 착각해 저장하지 않는다.
    if (data.length < 10000 || data.subarray(4, 8).toString('ascii') !== 'ftyp') throw new Error('mp4가 아니다: ' + film.name)
    await writeFile(target, data)
    Object.assign(film, { status: job.status, file: film.name + '.mp4', bytes: data.length, created_at: job.created_at })
    await save()
    console.log('내려받음', film.name, data.length.toLocaleString(), 'bytes')
  }
} else throw new Error('upload, submit, collect 중 하나여야 한다')
