importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAeLi6SxUGyYSajBeCUKxJXggmDXfoy6mo",
  authDomain: "homiqly-a9c38.firebaseapp.com",
  projectId: "homiqly-a9c38",
  storageBucket: "homiqly-a9c38.appspot.com",
  messagingSenderId: "150903426675",
  appId: "1:150903426675:web:36a99e12f1e960251c6406",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('📥 Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
