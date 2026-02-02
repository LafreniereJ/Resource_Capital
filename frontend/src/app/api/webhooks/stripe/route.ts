
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PRICING_TIERS } from '@/lib/pricing';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_role_key'
);

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('Stripe-Signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        console.error(`Webhook signature verification failed:`, error.message);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const subscription = event.data.object as Stripe.Subscription;

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const subscriptionId = session.subscription as string;
                const customerId = session.customer as string;
                const userId = session.metadata?.supabaseUUID;

                if (!userId) {
                    console.error('No userId in session metadata');
                    break;
                }

                // Fetch subscription details to know which price was bought
                const subDetails = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
                const priceId = subDetails.items.data[0].price.id;

                // Determine tier based on priceId
                let tier = 'silver';
                if (priceId === PRICING_TIERS.GOLD.priceId) tier = 'gold';
                if (priceId === PRICING_TIERS.PLATINUM.priceId) tier = 'platinum';

                // Upsert subscription
                await supabaseAdmin
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        tier: tier,
                        status: subDetails.status,
                        current_period_end: new Date((subDetails as any).current_period_end * 1000).toISOString(),
                        cancel_at_period_end: subDetails.cancel_at_period_end,
                    });
                break;
            }

            case 'customer.subscription.updated': {
                const subId = subscription.id;
                // @ts-ignore
                const priceId = subscription.items?.data[0]?.price?.id;

                // Determine tier
                let tier = 'silver';
                if (priceId === PRICING_TIERS.GOLD.priceId) tier = 'gold';
                if (priceId === PRICING_TIERS.PLATINUM.priceId) tier = 'platinum';
                // If canceled/inactive, maybe we should downgrade?
                // Logic: if status is not active, accessing tier might be restricted by status check in frontend.
                // But for DB consistency, if status is canceled, we keep tier as is until end of period.

                // Find user by stripe_customer_id (since we don't have metadata here usually)
                // Alternatively, we stored stripe_subscription_id in DB, so update by that.

                await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        tier: tier,
                        status: subscription.status,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                    })
                    .eq('stripe_subscription_id', subId);
                break;
            }

            case 'customer.subscription.deleted': {
                const subId = subscription.id;

                // Downgrade to silver
                await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        tier: 'silver',
                        status: subscription.status, // 'canceled'
                        stripe_subscription_id: null,
                        current_period_end: new Date().toISOString(), // Ended
                    })
                    .eq('stripe_subscription_id', subId);
                break;
            }
        }
    } catch (error: any) {
        console.error('Error handling webhook event:', error);
        return new NextResponse('Webhook handler failed', { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}
