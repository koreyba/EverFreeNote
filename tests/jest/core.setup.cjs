afterEach(() => {
  jest.clearAllMocks()
})

jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html, config) => {
      if (!config?.ALLOWED_TAGS) {
        return html
      }

      if (config.ALLOWED_TAGS.length === 0) {
        return html.replace(/<[^>]*>/g, '')
      }

      return html
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/<(object|embed|form|input|button)[^>]*>/gi, '')
    }),
  },
}))
