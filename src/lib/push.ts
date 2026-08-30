import { savePushSubscription } from './firebase/firestore';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPushPermissionAndSubscribe(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BIf_-55S_lFcLhr5RVYClhBN5062B4D83NHLx46x_TAHwxw0oYonBH1Y2X8YqFeIIGdHADx9KOUYvbLExuugMQY';
    if (!vapidPublicKey) {
      console.error('No VAPID public key available');
      return false;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    await savePushSubscription(userId, subscription);
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications', error);
    return false;
  }
}
