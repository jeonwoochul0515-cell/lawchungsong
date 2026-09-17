// 승인용 AI 생성 사진. 원본 PNG는 production 자산이 아니다 — public 반영은 prepare-pear-images.py가 한다.
//
// 자매 사이트(스토킹119/ibyeol119)에서 검증된 파이프라인을 청송law 톤으로 이식했다.
// 실행: node reference/pear-storyboard/higgsfield-photos.mjs submit   (생성 제출)
//       node reference/pear-storyboard/higgsfield-photos.mjs collect  (완료분 내려받기)
//
// 함정 — CLI 1.1.10은 PNG 업로드와 generated-image 레퍼런스 타입을 모두 거부한다.
// 장면 연속성은 텍스트 아트디렉션으로만 만든다. 픽셀 단위 동일 장면이라고 주장하지 않는다.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('./', import.meta.url))
const output = join(root, 'photos')
await mkdir(output, { recursive: true })
const manifestFile = join(output, 'manifest.json')

// 청송law 공통 아트디렉션 — 브랜드색(네이비 #1e3a8a / 골드 #b4975a)을 재질로 번역했다.
// 법조 클리셰(저울·의사봉·국장)와 가상 변호사 얼굴은 금지. 변호사 사진은 실사를 쓴다.
const shared =
  'Create a photographic scene using the following campaign description and shot direction. ' +
  'Materials: deep navy plaster, warm limestone, dark walnut wood, brushed brass and natural daylight. ' +
  'Photorealistic editorial photograph for a Korean law firm in Busan handling criminal defense, ' +
  'divorce and family matters, school violence cases, franchise and fair trade disputes, ' +
  'corporate rehabilitation and election law. Composed, authoritative and humane; calm and grounded, never intimidating. ' +
  'No text, logos, watermarks, scales of justice, gavels, national emblems, court seals, ' +
  'real personal information or fictional lawyer portraits. No people. Do not add interface elements. '

// 4개 장(章)의 기준 컷. 각 장은 wide 하나에서 detail·portrait로 파생된다.
const scenes = [
  {
    name: '01-arrival-wide', chapter: 1, title: '문제가 찾아온 날',
    prompt:
      'Early morning at the stone entrance hall of a Korean courthouse, seen from inside. ' +
      'A tall window casts a long shaft of light across polished limestone toward the viewer. ' +
      'The left 45 percent is quiet deep navy shadow reserved for a headline. ' +
      'No people, no signage. 35mm lens, restrained contrast, fine architectural texture.',
  },
  {
    name: '04-reading-wide', chapter: 2, title: '사건을 읽는다',
    prompt:
      'A dark walnut desk where document folders are laid out in chronological order, ' +
      'with a fountain pen and a closed law book at the right edge. ' +
      'Warm brass desk lamp light falls from the upper right; the surroundings drop into deep navy shadow. ' +
      'Papers are completely blank — absolutely no lettering, seals or personal information. ' +
      'The left 45 percent must be clean unobstructed deep navy wall in the same focal plane, ' +
      'reserved for typography. Nothing may stand between the camera and the desk: ' +
      'no blurred foreground object, no pillar, door frame or curtain edge intruding from the left. ' +
      'Shoot the whole scene in one continuous depth. 50mm lens, tactile paper fiber.',
  },
  {
    name: '07-standing-wide', chapter: 3, title: '법정에 선다',
    prompt:
      'The empty counsel table of a Korean courtroom just before the session opens, ' +
      'a slim microphone standing on it, the raised bench visible in soft focus behind. ' +
      'Dark walnut furniture, muted navy walls, no emblem or crest anywhere. ' +
      'Low angle from counsel seat height. Diffused ceiling light, upper frame falling dark. ' +
      'Right 40 percent left quiet for a headline. 35mm lens.',
  },
  {
    name: '10-after-wide', chapter: 4, title: '다시 일상으로',
    prompt:
      'An office door standing open toward an early morning city view of Busan, ' +
      'seen from the dark interior side so the doorway frames the bright outside. ' +
      'Backlit, deep navy interior shadow against warm sunrise light, no signboards or building text. ' +
      'The lower left is shadowed negative space for a closing line. 35mm lens, gentle haze.',
  },
  {
    name: '13-counsel-wide', chapter: 5, title: '마주 앉는 자리',
    prompt:
      'A private consultation room: two upholstered chairs facing each other across a small limestone table, ' +
      'a blank closed notebook and a ceramic cup on it, a linen-filtered window with greenery behind. ' +
      'Human-scale, welcoming and discreet. No people, no signs; not a depiction of an actual law office. ' +
      'Left half a quiet deep navy wall for a headline. 50mm editorial photography.',
  },
]

// 각 장의 파생 컷 — detail(같은 장면에 더 다가선 컷)과 portrait(모바일 세로 재구성).
// portrait는 가로 컷의 크롭이 아니라 "다시 찍은 세로 사진"이어야 한다. 크롭으로 만들면
// 모바일에서 피사체가 잘리고 제목 자리가 사라진다 — 자매 사이트에서 확인된 함정이다.
const derived = [
  {
    name: '02-arrival-detail', chapter: 1, title: '문턱의 빛 — 전개', reference: '01-arrival-wide',
    prompt:
      'Move closer to the limestone threshold and the brass reveal at the wall base, keeping the lit window on the right. ' +
      'Light rakes across tactile stone and deep navy plaster; the left 45 percent stays uncluttered navy shadow for a headline. ' +
      '50mm lens, refined material texture, no foreground obstruction.',
  },
  {
    name: '03-arrival-portrait', chapter: 1, title: '들어서는 자리 — 세로 구도', reference: '01-arrival-wide', aspect: '9:16',
    prompt:
      'Create a genuinely recomposed vertical mobile photograph, not a narrow crop of the horizontal reference. ' +
      'The tall window and its shaft of light occupy the upper right half; the stone floor reads clearly below. ' +
      'Lower left and lower middle hold quiet navy space for a mobile title and button. 35mm lens, real proportions.',
  },
  {
    name: '05-reading-detail', chapter: 2, title: '기록의 결 — 전개', reference: '04-reading-wide',
    prompt:
      'Closer oblique tabletop angle of the same stepped stack of blank ivory documents, fountain pen and closed leather book. ' +
      'Show fine paper fiber and the warm falloff of the brass lamp. Objects sit in the right half, ' +
      'clean navy wall on the left. Papers must carry absolutely no lettering or seals. Nothing floats; everything rests on the desk.',
  },
  {
    name: '06-reading-portrait', chapter: 2, title: '사건을 읽는 자리 — 세로 구도', reference: '04-reading-wide', aspect: '9:16',
    prompt:
      'Recompose the same desk still life for a vertical mobile screen: stacked blank documents and the brass lamp ' +
      'in the upper half, generous plain navy wall in the bottom half for light text. ' +
      'Warm walnut and ivory against deep navy, realistic paper and brass, no text on any sheet.',
  },
  {
    name: '08-standing-detail', chapter: 3, title: '변론이 시작되는 지점 — 전개', reference: '07-standing-wide',
    prompt:
      'Close-up of the same brass gooseneck microphone on the walnut counsel table, its curve catching window light. ' +
      'The bench behind dissolves into soft navy shadow. Right 45 percent nearly empty for typography. ' +
      'Restrained contrast, real metal and wood, no emblem or crest.',
  },
  {
    name: '09-standing-portrait', chapter: 3, title: '법정에 서는 자리 — 세로 구도', reference: '07-standing-wide', aspect: '9:16',
    prompt:
      'Recompose the same courtroom into a vertical mobile frame: counsel table and brass microphone in the upper ' +
      'two thirds with the bench softly behind, bottom third shadowed navy negative space for a headline. ' +
      'Keep real architecture and scale. No people, no emblem, no signage.',
  },
  {
    name: '11-after-detail', chapter: 4, title: '문틈의 아침 — 전개', reference: '10-after-wide',
    prompt:
      'Move closer to the open door edge and brass hinge, with the warm sunrise city view compressed into the right third. ' +
      'Deep navy interior fills the left half as calm negative space. Backlit haze, real brass and walnut grain, ' +
      'no signboards or readable building text.',
  },
  {
    name: '12-after-portrait', chapter: 4, title: '다시 일상으로 — 세로 구도', reference: '10-after-wide', aspect: '9:16',
    prompt:
      'Recompose the same open doorway as a vertical mobile photograph: the bright morning city view fills the upper ' +
      'half through the doorway, the dark navy interior floor and wall fill the lower half for a closing line. ' +
      'Keep the doorway proportion believable. No text anywhere in the cityscape.',
  },
  {
    name: '14-counsel-detail', chapter: 5, title: '대화를 시작할 준비 — 전개', reference: '13-counsel-wide',
    prompt:
      'Move the camera closer to the same consultation table: the blank closed notebook and ceramic cup sharp at lower right, ' +
      'one upholstered chair and the linen-filtered window soft behind. Left half a quiet navy wall for a headline. ' +
      'Human-scale, welcoming and private, no person. 50mm editorial photography.',
  },
  {
    name: '15-counsel-portrait', chapter: 5, title: '마주 앉는 자리 — 세로 구도', reference: '13-counsel-wide', aspect: '9:16',
    prompt:
      'Recompose the same private consultation room as a vertical mobile photograph. Both chairs and the round stone table ' +
      'are readable in the upper two thirds, window with linen and greenery behind. Bottom third is softly shadowed navy ' +
      'negative space for a consultation button. Real architecture and proportion, no people, no signs.',
  },
]

let manifest
try {
  manifest = JSON.parse(await readFile(manifestFile, 'utf8'))
} catch (e) {
  if (e.code !== 'ENOENT') throw e
  manifest = {
    provider: 'Higgsfield',
    model: 'nano_banana_pro',
    purpose: '승인용 AI 생성 사진 — 실제 사무실·법정·사건·변호사 사진이 아니다',
    site: 'chang-hee.kim',
    images: [],
  }
}
const save = () => writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n')

async function cli(args, timeout = 120000) {
  const { stdout } = await exec(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', '$cliArgs = ConvertFrom-Json $env:HF_ARGS; & higgsfield @cliArgs; exit $LASTEXITCODE'],
    { env: { ...process.env, HF_ARGS: JSON.stringify([...args, '--json']) }, timeout, maxBuffer: 8 * 1024 * 1024 },
  )
  return JSON.parse(stdout)
}

async function submit(entry, prompt, aspect) {
  if (manifest.images.some((x) => x.name === entry.name)) return
  const args = ['nano_banana_pro', '--prompt', prompt, '--aspect-ratio', aspect, '--resolution', '2k']
  const cost = await cli(['generate', 'cost', ...args])
  // 크레딧 가드 — 요금제가 바뀌어 장당 단가가 뛰면 조용히 소진되지 않고 여기서 멈춘다.
  if (typeof cost.credits !== 'number' || cost.credits > 2) throw new Error('예상 밖 생성 비용: ' + JSON.stringify(cost))
  const ids = await cli(['generate', 'create', ...args])
  if (!Array.isArray(ids) || ids.length !== 1) throw new Error('작업 접수 응답이 예상과 다르다: ' + JSON.stringify(ids))
  manifest.images.push({ ...entry, id: ids[0], estimated_credits: cost.credits, prompt, aspect_ratio: aspect, status: 'submitted' })
  await save()
  console.log('제출', entry.name, ids[0], cost.credits, '크레딧')
}

async function collect(image) {
  const target = join(output, image.name + '.png')
  try { await access(target); if (image.status === 'completed') return } catch {}
  let job = await cli(['generate', 'get', image.id])
  if (job.status !== 'completed') job = await cli(['generate', 'wait', image.id, '--timeout', '8m', '--interval', '5s'], 510000)
  if (job.status !== 'completed' || !job.result_url) throw new Error('생성이 끝나지 않았다: ' + image.name + ' (' + job.status + ')')
  const response = await fetch(job.result_url)
  if (!response.ok) throw new Error('내려받기 실패 ' + response.status + ': ' + image.name)
  const data = Buffer.from(await response.arrayBuffer())
  // PNG 시그니처 검사 — 오류 페이지 HTML을 이미지로 착각해 저장하는 사고를 막는다.
  if (data.length < 1000 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('PNG가 아니다: ' + image.name)
  await writeFile(target, data)
  Object.assign(image, { status: job.status, width: job.params.width, height: job.params.height, file: image.name + '.png', created_at: job.created_at })
  await save()
  console.log('내려받음', image.name, data.length.toLocaleString(), 'bytes')
}

const mode = process.argv[2] || 'collect'
if (mode === 'submit') {
  for (const scene of scenes) await submit({ name: scene.name, chapter: scene.chapter, title: scene.title }, shared + 'Campaign description: ' + scene.prompt, '16:9')
} else if (mode === 'derive') {
  for (const entry of derived) {
    const base = manifest.images.find((x) => x.name === entry.reference)
    if (!base) throw new Error('기준컷이 없다: ' + entry.reference)
    // 장면 연속성은 기준컷 프롬프트를 다시 깔고 새 샷 지시로 덮어써 만든다.
    const prompt = base.prompt + ' IMPORTANT NEW SHOT DIRECTION, overriding the previous framing and aspect ratio: ' + entry.prompt
    await submit({ name: entry.name, chapter: entry.chapter, title: entry.title, reference: entry.reference, reference_mode: 'text-only; CLI가 이미지 레퍼런스를 거부한다' }, prompt, entry.aspect || '16:9')
  }
} else if (mode === 'collect') {
  for (const image of manifest.images) await collect(image)
} else throw new Error('submit, derive, collect 중 하나여야 한다')
