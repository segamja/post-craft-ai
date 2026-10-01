import type {
  BlogOutT,
  CarouselOutT,
  FacebookOutT,
  ImageAnalysisOutT,
  InstagramOutT,
  StoryOutT,
} from '../../shared/schemas/ai.js'
import type {
  GenerateCarouselRequestT,
  GeneratePlatformRequestT,
  GenerateStoryRequestT,
} from '../../shared/schemas/api.js'

// OpenAI Mock (명세 §24.3). 키 없이 전체 흐름을 개발·테스트하기 위한 결정적 응답.
// 입력의 별칭과 설명을 그대로 사용해 스키마를 만족하는 결과를 만든다.

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const firstLine = (s: string) => s.trim().split(/\n|\.|!/)[0]?.trim() || '오늘의 기록'

export const mockAnalyze = (): ImageAnalysisOutT => ({
  description: '[Mock] 밝은 자연광 아래 촬영된 사진입니다. 화면 중앙에 주요 피사체가 있고 배경은 부드럽게 흐려져 있습니다.',
  tags: ['풍경', '자연광', '여유'],
  detectedText: null,
  suggestedAlt: '[Mock] 자연광 아래 촬영된 사진',
})

export function mockStory({ project, images }: GenerateStoryRequestT): StoryOutT {
  const title = clip(firstLine(project.sourceDescription), 80)
  return {
    title,
    summary: clip(`[Mock] ${project.sourceDescription.trim() || '사진으로 남긴 하루의 기록입니다.'}`, 300),
    blocks: images.flatMap((img, i) => [
      { type: 'heading' as const, level: 2 as const, text: `${i + 1}. ${clip(img.description, 40)}` },
      { type: 'image' as const, imageRef: img.alias, caption: clip(img.description, 60) },
      { type: 'paragraph' as const, text: `[Mock] ${img.description}` },
    ]),
    verificationItems: [{ text: '방문 날짜', reason: '사진과 설명에서 확인되지 않음' }],
  }
}

export function mockPlatform({ platform, story, images }: GeneratePlatformRequestT): BlogOutT | InstagramOutT | FacebookOutT {
  const tags = ['일상기록', '사진일기', '오늘']
  if (platform === 'blog') {
    return {
      title: clip(story.title || '블로그 글', 80),
      coverImageRef: images[0]?.alias ?? null,
      blocks: story.blocks.length ? story.blocks : [{ type: 'paragraph', text: story.summary || '[Mock]' }],
      hashtags: tags,
      verificationItems: [],
    }
  }
  if (platform === 'instagram') {
    return {
      caption: clip(`[Mock] ${story.title}\n\n${story.summary}`, 2200),
      hashtags: [...tags, '인스타그램'],
      verificationItems: [],
    }
  }
  return {
    caption: clip(`[Mock] ${story.summary}`, 500),
    mediaImageRefs: images.map((i) => i.alias),
    hashtags: tags.slice(0, 2),
    verificationItems: [],
  }
}

export function mockCarousel({ images, story, slideCount }: GenerateCarouselRequestT): CarouselOutT {
  return {
    slides: Array.from({ length: slideCount }, (_, i) => ({
      imageRef: images[i]?.alias ?? null,
      title: clip(i === 0 ? story.title || '표지' : `${i + 1}번째 장면`, 40),
      body: clip(images[i]?.description ?? story.summary, 200),
    })),
  }
}
