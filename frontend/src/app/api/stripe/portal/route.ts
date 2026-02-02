
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createCustomerPortal } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { returnUrl } = await req.json();

    // Get customer ID from DB
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      // Fallback: Check if we can find them in Stripe by email (could happen in edge cases)
      return new NextResponse('No active subscription found', { status: 404 });
    }

    const session = await createCustomerPortal(
      subscription.stripe_customer_id,
      returnUrl
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
