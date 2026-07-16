import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db, users, processedStripeEvents } from '@/db';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as any;
      const userId = session.client_reference_id;

      if (!userId) {
        return NextResponse.json({ error: 'No client_reference_id in session' }, { status: 400 });
      }

      // Check for duplicate event
      const [existingEvent] = await db
        .select()
        .from(processedStripeEvents)
        .where(eq(processedStripeEvents.eventId, event.id));

      if (existingEvent) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // Credit the user's account in a transaction
      await db.transaction(async (tx) => {
        // Mark event as processed
        await tx.insert(processedStripeEvents).values({
          eventId: event.id,
          eventType: event.type,
        });

        // Increment user credits (assuming 1000 credits per subscription)
        await tx
          .update(users)
          .set({ credits: sql`${users.credits} + 1000` })
          .where(eq(users.id, parseInt(userId)));
      });

      break;
    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true });
}
