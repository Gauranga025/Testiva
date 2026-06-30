import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Lazily instantiate the Stripe client on first use, rather than at module
 * import time. This lets the app build and run normally when
 * STRIPE_SECRET_KEY isn't set (e.g. local dev without payments configured) —
 * the route using it will only fail if/when it's actually called, with a
 * clear error message, instead of crashing the build/import for every route.
 */
function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to your environment variables to use Stripe checkout.'
    );
  }

  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
      typescript: true,
    });
  }

  return _stripe;
}

// Proxy preserves the existing `stripe.checkout.sessions.create(...)` call
// style used elsewhere in the app — callers don't need to change anything.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient();
    return (client as any)[prop];
  },
});
