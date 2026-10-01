import type { ContentBlock, UUID, VerificationItem } from './domain.js'
import type { AiBlockT, AiVerificationT } from './schemas/ai.js'

// 이미지 별칭 매핑 (명세 §10.4). AI에게는 IMG1… 만 보여주고, 응답은 요청 단위 맵으로 UUID로 되돌린다.
// 맵에 없는 별칭은 버린다 (블록 제거, 슬라이드·커버는 null).

export interface AliasMap {
  toAlias: Map<UUID, string>
  toId: Map<string, UUID>
}

export const aliasOf = (index: number) => `IMG${index + 1}`

/** imageIds는 position 순서여야 한다 → IMG1 = 첫 번째 사진 */
export function buildAliasMap(imageIds: UUID[]): AliasMap {
  const toAlias = new Map<UUID, string>()
  const toId = new Map<string, UUID>()
  imageIds.forEach((id, i) => {
    toAlias.set(id, aliasOf(i))
    toId.set(aliasOf(i), id)
  })
  return { toAlias, toId }
}

/** 별칭 표기 흔들림 허용: "img1", " IMG1 ", "[IMG1]" → "IMG1" */
const normalizeRef = (ref: string) => ref.trim().replace(/^\[|\]$/g, '').toUpperCase()

export function resolveRef(ref: string | null, map: AliasMap): UUID | null {
  return ref === null ? null : (map.toId.get(normalizeRef(ref)) ?? null)
}

export interface MappedBlocks {
  blocks: ContentBlock[]
  /** 맵에 없어 버린 별칭 (경고 로그용) */
  dropped: string[]
}

/** AI 블록 → 도메인 블록. 블록 id는 이 단계에서 부여한다 */
export function mapAiBlocks(blocks: AiBlockT[], map: AliasMap, newId: () => UUID): MappedBlocks {
  const dropped: string[] = []
  const out: ContentBlock[] = []
  for (const b of blocks) {
    if (b.type === 'image') {
      const imageId = resolveRef(b.imageRef, map)
      if (!imageId) {
        dropped.push(b.imageRef)
        continue
      }
      out.push({ id: newId(), type: 'image', imageId, caption: b.caption })
    } else if (b.type === 'heading') {
      out.push({ id: newId(), type: 'heading', level: b.level, text: b.text })
    } else {
      out.push({ id: newId(), type: 'paragraph', text: b.text })
    }
  }
  return { blocks: out, dropped }
}

/** 도메인 블록 → AI 입력 블록 (플랫폼 생성 시 Story를 넘길 때) */
export function toAiBlocks(blocks: ContentBlock[], map: AliasMap): AiBlockT[] {
  return blocks.flatMap((b): AiBlockT[] => {
    if (b.type === 'image') {
      const imageRef = map.toAlias.get(b.imageId)
      return imageRef ? [{ type: 'image', imageRef, caption: b.caption }] : []
    }
    if (b.type === 'heading') return [{ type: 'heading', level: b.level, text: b.text }]
    return [{ type: 'paragraph', text: b.text }]
  })
}

export const toVerificationItems = (items: AiVerificationT[], newId: () => UUID): VerificationItem[] =>
  items.map((v) => ({ id: newId(), text: v.text, reason: v.reason, resolved: false }))

/** "#제주 여행" → "제주여행", 중복 제거, 개수 제한 */
export function normalizeHashtags(tags: string[], max: number): string[] {
  const seen = new Set<string>()
  for (const t of tags) {
    const tag = t.replace(/^#+/, '').replace(/\s+/g, '')
    if (tag) seen.add(tag)
    if (seen.size >= max) break
  }
  return [...seen]
}
