import type { UserImage } from '@shared/domain'
import { useEffect, useState } from 'react'
import { getImageBlob } from './imageRepo'

/**
 * 화면 표시용 URL (명세 ResolvedImage.displayUrl 대응, DB에 저장하지 않음).
 * upload: IndexedDB Blob → Object URL (언마운트 시 해제) / unsplash: hotlink URL
 */
export function useImageUrl(image: Pick<UserImage, 'id' | 'source' | 'status' | 'unsplash'> | null) {
  const [url, setUrl] = useState<string | null>(null)
  const id = image?.id
  const ready = image?.status === 'ready'
  const external = image?.source === 'unsplash' ? (image.unsplash?.externalUrl ?? null) : null

  useEffect(() => {
    if (!id || !ready || external) return
    let objectUrl: string | null = null
    let cancelled = false
    void getImageBlob(id).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [id, ready, external])

  return external ?? url
}
