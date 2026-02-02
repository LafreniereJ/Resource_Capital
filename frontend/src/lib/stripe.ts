
import Stripe from 'stripe';

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
  // @ts-ignore - API version might need to be explicitly set or omitted to use latest default
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});


// Exported constants removed to avoid client-side bundling of Stripe Node SDK.
// PRICING_TIERS has been moved to src/lib/pricing.ts

export async function getOrCreateCustomer(email: string, userId: string, name?: string) {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      supabaseUUID: userId,
    },
  });

  return customer;
}

export async function createCheckoutSession(params: {
  priceId: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: Stripe.Checkout.SessionCreateParams.Mode;
}) {
  const { priceId, customerId, successUrl, cancelUrl, mode = 'subscription' } = params;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
    },
  });

  return session;
}

export async function createCustomerPortal(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
