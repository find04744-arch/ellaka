// Ellaka Service Worker
// এটা মূলত ২টা কাজ করে:
// ১) সাইটকে "ইনস্টলযোগ্য" (PWA) বানায়, যাতে "Add to Home Screen" কাজ করে
// ২) মূল পেজটা ক্যাশ করে রাখে, যাতে ইন্টারনেট দুর্বল/না থাকলেও অ্যাপ পুরোপুরি সাদা/ব্ল্যাংক না হয়ে
//    অন্তত শেষবার লোড হওয়া ভার্সনটা দেখাতে পারে

const CACHE_NAME = 'ellaka-cache-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ইনস্টল হওয়ার সময় মূল ফাইলগুলো ক্যাশে রাখা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// পুরনো ক্যাশ ভার্সন মুছে ফেলা (নতুন আপডেট এলে)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// নেটওয়ার্ক-ফার্স্ট স্ট্র্যাটেজি: সবসময় আগে ইন্টারনেট থেকে নতুন ডেটা আনার চেষ্টা করবে
// (যাতে Supabase-এর লাইভ ডেটা সবসময় আপ-টু-ডেট থাকে), ইন্টারনেট না থাকলে তখনই ক্যাশ থেকে দেখাবে
self.addEventListener('fetch', (event) => {
  // শুধু GET রিকোয়েস্ট এবং আমাদের নিজস্ব ডোমেইনের রিকোয়েস্ট handle করব
  // (Supabase/CDN/API কলগুলো ব্রাউজারের স্বাভাবিক নিয়মেই চলবে, ক্যাশ করব না)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
