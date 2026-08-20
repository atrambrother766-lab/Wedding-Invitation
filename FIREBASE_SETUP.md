# Enable shared invitations

This app is ready to synchronize data with a Firebase Realtime Database. A public hosted site and a Firebase database are both required before a WhatsApp link can work on other devices.

1. Publish this folder at an HTTPS address, for example `https://your-domain.example/invitation/`.
2. Create a Firebase Realtime Database in a Firebase project you control.
3. Copy the database URL, such as `https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app`, into `databaseUrl` in [sync-config.js](sync-config.js).
4. Set a unique `invitationId` in the same file, for example `akash-vaishnavi-2026`.
5. In Admin Dashboard, open **WhatsApp वर शेअर करा**, enter the published HTTPS address, and save it. The app adds the invitation ID automatically and shares that guest link.

The app keeps Guests read-only in its UI. Before a production launch, protect database writes with Firebase Authentication and Realtime Database Rules or a server-side API; the existing browser-only Admin password cannot protect a public database by itself.
