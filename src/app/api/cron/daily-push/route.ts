import { NextResponse } from 'next/server';
import webPush from 'web-push';
import { db } from '@/lib/firebase/config';
import { collectionGroup, getDocs } from 'firebase/firestore';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BIf_-55S_lFcLhr5RVYClhBN5062B4D83NHLx46x_TAHwxw0oYonBH1Y2X8YqFeIIGdHADx9KOUYvbLExuugMQY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'STRYBEY2VAU9rLvKgf5pZaPMGAa6zqU3EVkv4W2awy8';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:test@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const CRAZY_MESSAGES = [
  "Your watchlist is crying. Watch a movie tonight or else.",
  "You added 15 movies this week and watched 0. Be better.",
  "Are you ever going to watch that movie you swore you'd watch?",
  "Your review queue is looking thicker than a CVS receipt.",
  "Stop scrolling Instagram and start watching what you saved from Instagram."
];

export async function GET(request: Request) {
  // Optional: Verify the request is actually coming from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }

  try {
    const subscriptionsSnapshot = await getDocs(collectionGroup(db, 'push_subscriptions'));
    const subscriptions: any[] = [];
    subscriptionsSnapshot.forEach((doc) => {
      subscriptions.push(doc.data().subscription);
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscriptions found' });
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        const randomMsg = CRAZY_MESSAGES[Math.floor(Math.random() * CRAZY_MESSAGES.length)];
        return webPush.sendNotification(
          sub,
          JSON.stringify({
            title: 'Reelist Audit 🚨',
            body: randomMsg,
            icon: '/icon-192x192.png'
          })
        );
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;

    return NextResponse.json({ 
      success: true, 
      sent: successful, 
      total: subscriptions.length 
    });
  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
