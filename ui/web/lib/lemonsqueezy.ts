import { lemonSqueezyConfig } from "@ui/web/config";

interface CheckoutParams {
  storeId: string;
  variantId: string;
  email?: string;
  userId?: string;
}

/**
 * Build Lemon Squeezy checkout URL with pre-filled user data.
 *
 * Uses Lemon Squeezy's checkout URL parameters to prefill email and pass custom user_id.
 * No SDK needed - simple URL construction is more reliable and doesn't add dependencies.
 */
export function buildCheckoutUrl(params: CheckoutParams): string {
  const { storeId, variantId, email, userId } = params;

  const baseUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${variantId}`;
  const queryParams = new URLSearchParams();

  if (email) {
    // Prefill customer email to speed up checkout
    queryParams.set("checkout[email]", email);
  }

  if (userId) {
    // Pass user ID as custom data - webhook will use this to link subscription to user
    queryParams.set("checkout[custom][user_id]", userId);
  }

  const queryString = queryParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Open Lemon Squeezy checkout in a new window
 * Uses config from environment variables
 */
export function openCheckout(params: {
  email?: string;
  userId?: string;
}): void {
  const url = buildCheckoutUrl({
    storeId: lemonSqueezyConfig.storeId,
    variantId: lemonSqueezyConfig.variantId,
    ...params,
  });

  window.open(url, "_blank", "noopener,noreferrer");
}
