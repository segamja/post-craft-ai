import { describe, expect, it } from 'vitest'
import { buildAliasMap, mapAiBlocks, normalizeHashtags, resolveRef, toAiBlocks, toVerificationItems } from './alias'

let seq = 0
const newId = () => `b${++seq}`

describe('UT-02 별칭 매핑', () => {
  const map = buildAliasMap(['uuid-a', 'uuid-b'])

  it('position 순서대로 IMG1, IMG2… 를 부여한다', () => {
    expect(map.toAlias.get('uuid-a')).toBe('IMG1')
    expect(map.toId.get('IMG2')).toBe('uuid-b')
  })

  it('알 수 없는 별칭의 이미지 블록은 제거하고, 모든 블록에 id를 부여한다', () => {
    seq = 0
    const { blocks, dropped } = mapAiBlocks(
      [
        { type: 'heading', level: 2, text: 'h' },
        { type: 'image', imageRef: 'IMG2', caption: 'c' },
        { type: 'image', imageRef: 'IMG9', caption: null },
        { type: 'paragraph', text: 'p' },
      ],
      map,
      newId,
    )
    expect(dropped).toEqual(['IMG9'])
    expect(blocks).toEqual([
      { id: 'b1', type: 'heading', level: 2, text: 'h' },
      { id: 'b2', type: 'image', imageId: 'uuid-b', caption: 'c' },
      { id: 'b3', type: 'paragraph', text: 'p' },
    ])
  })

  it('별칭 표기 흔들림을 허용하고, 없는 별칭·null은 null', () => {
    expect(resolveRef(' img1 ', map)).toBe('uuid-a')
    expect(resolveRef('[IMG2]', map)).toBe('uuid-b')
    expect(resolveRef('IMG3', map)).toBeNull()
    expect(resolveRef(null, map)).toBeNull()
  })

  it('도메인 블록 → AI 블록 변환 시 매핑 없는 이미지는 빠진다', () => {
    expect(
      toAiBlocks(
        [
          { id: '1', type: 'image', imageId: 'uuid-a', caption: null },
          { id: '2', type: 'image', imageId: 'deleted', caption: null },
        ],
        map,
      ),
    ).toEqual([{ type: 'image', imageRef: 'IMG1', caption: null }])
  })

  it('확인 필요 항목에 id와 resolved=false를 붙인다', () => {
    seq = 0
    expect(toVerificationItems([{ text: '영업시간', reason: '확인 안 됨' }], newId)).toEqual([
      { id: 'b1', text: '영업시간', reason: '확인 안 됨', resolved: false },
    ])
  })

  it('해시태그: # 제거, 공백 제거, 중복 제거, 개수 제한', () => {
    expect(normalizeHashtags(['#제주 여행', '제주여행', '##맛집', '', '바다'], 2)).toEqual(['제주여행', '맛집'])
  })
})
