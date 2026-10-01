// OpenAI 키 형태(sk-..., sk-proj-...). 앞 글자가 영숫자면 제외해 "mask-image-…" 같은 오탐을 막는다.
export const SECRET_PATTERN = /(?<![A-Za-z0-9])sk-(?:proj-)?[A-Za-z0-9_-]{20,}/
