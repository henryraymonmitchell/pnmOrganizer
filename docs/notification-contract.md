# Notification delivery contract

The browser client asks for notification permission from the PNM profile and registers `/notification-sw.js`. Device subscription and delivery remain server-side responsibilities.

## Required backend capabilities

1. Store a Web Push subscription for the authenticated user, including its endpoint and encryption keys.
2. Send notifications only from a server route or Supabase Edge Function using a secret VAPID private key. Never expose a sender secret to the browser.
3. Enforce Row Level Security: a user may create, view, or revoke only their own device subscriptions.
4. Create notification records on new chapter-to-PNM messages and shortly before a planned event begins. The server resolves recipients; clients must never provide arbitrary recipient IDs.

## Push payload

```json
{
  "title": "New message from Delta Upsilon",
  "body": "A rush chair replied to your question.",
  "url": "/pnm/message?chapter=Delta%20Upsilon",
  "tag": "message:uuid"
}
```

## In-app updates

When message and event-plan tables are connected, subscribe through Supabase Realtime with the authenticated user's Row Level Security policies. Realtime keeps an open portal current; Web Push reaches the device while the portal is backgrounded or closed.
