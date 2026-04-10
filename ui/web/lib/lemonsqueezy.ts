import { lemonSqueezyConfig } from '@ui/web/config'

interface CheckoutParams {
  storeId: string
  variantId: string
  email?: string
  userId?: string
}

/**
 * Build Lemon Squeezy checkout URL with pre-filled user data
 * No SDK needed - just URL construction with query params
 */
export function buildCheckoutUrl(params: CheckoutParams): string {
  const { storeId, variantId, email, userId } = params
  
  const baseUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${variantId}`
  const queryParams = new URLSearchParams()

  if (email) {
    queryParams.set('checkout[email]', email)
  }

  if (userId) {
    queryParams.set('checkout[custom][user_id]', userId)
  }

  const queryString = queryParams.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

/**
 * Open Lemon Squeezy checkout in a new window
 * Uses config from environment variables
 */
export function openCheckout(params: { email?: string; userId?: string }): void {
  const url = buildCheckoutUrl({
    storeId: lemonSqueezyConfig.storeId,
    variantId: lemonSqueezyConfig.variantId,
    ...params,
  })

  window.open(url, '_blank', 'noopener,noreferrer')
}
