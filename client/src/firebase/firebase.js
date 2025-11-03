import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAeLi6SxUGyYSajBeCUKxJXggmDXfoy6mo",
  authDomain: "homiqly-a9c38.firebaseapp.com",
  projectId: "homiqly-a9c38",
  storageBucket: "homiqly-a9c38.appspot.com",
  messagingSenderId: "150903426675",
  appId: "1:150903426675:web:36a99e12f1e960251c6406",
  vapidKey:
    "BC3Iv5RQmvzlXy0V3jt2BTgpP1-tH_nGOvgdECEtA5VB1BEox3Rt8asazaZe1gMQysPLmbQolUtPHBtp8f-1uqE",
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

export const requestFCMToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_KEY,
    });

    if (currentToken) {
      // console.log("🎯 FCM Token obtained:", currentToken);
      return currentToken;
    } else {
      console.warn(
        "⚠️ No registration token available. Request permission to generate one."
      );
      return null;
    }
  } catch (err) {
    // console.error("❌ An error occurred while retrieving token.", err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      // console.log("📲 Foreground Message received:", payload);
      resolve(payload);
    });
  });
