// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  
  apiKey: "AIzaSyDNJOR2RQYkN6nOKWuDSqpnWYgXeHiDThw",

  authDomain: "operrate-notifications.firebaseapp.com",

  projectId: "operrate-notifications",

  storageBucket: "operrate-notifications.firebasestorage.app",

  messagingSenderId: "845475939973",

  appId: "1:845475939973:web:652471730304ce8599cbec",

  measurementId: "G-881EJ72XEZ"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png', // Add an icon if you have one
    badge: '/badge-72x72.png'   // Add a badge if you have one
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
