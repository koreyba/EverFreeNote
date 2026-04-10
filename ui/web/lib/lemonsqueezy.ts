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
 * URL-based approach chosen for simplicity and reliability:
 * - No SDK dependency - fewer potential failure points
 * - Direct control over checkout parameters
 * - Standard Lemon Squeezy URL parameter format
 *
 * Parameters:
 * - checkout[email]: Prefills customer email to streamline checkout
 * - checkout[custom][user_id]: Passed to webhook for subscription-user linking
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
 * Open Lemon Squeezy checkout in a new window.
 *
 * Opens in new tab (_blank) to preserve app state and allow users to return easily.
 * Config values (storeId, variantId) come from environment variables.
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
