export const RESULT_TABS = ['story', 'blog', 'instagram', 'facebook', 'carousel'] as const
export type ResultTab = (typeof RESULT_TABS)[number]

export function parseResultTab(raw: string | null): ResultTab {
  return RESULT_TABS.includes(raw as ResultTab) ? (raw as ResultTab) : 'story'
}
