import fs from 'fs'

it('file ends with a proper component closure', () => {
  const s = fs.readFileSync('src/components/InternalReviewKanban.tsx','utf8')
  expect(s.trim().endsWith('\n}')).toBe(true)
})

