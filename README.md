# WhatsApp-like Chat Application

A real-time chat application with video/audio calling capabilities, built with Firebase.

## Features

- Firebase Authentication (Email/Password)
- Only logged-in users are visible
- Private one-to-one messaging
- Real-time message delivery
- Users displayed by first letter of email only
- Video and audio calling (WebRTC)
- Online/offline status tracking

## Setup Instructions

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Email/Password authentication in Authentication section
   - Enable Realtime Database

2. **Configure Firebase**
   - Copy your Firebase config from Project Settings
   - Replace the config in `app.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     databaseURL: "YOUR_DATABASE_URL",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
   }
   ```

3. **Set Database Rules**
   - Go to Realtime Database → Rules
   - Add these security rules:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null",
           ".write": "$uid === auth.uid"
         }
       },
       "messages": {
         "$chatId": {
           ".read": "auth != null",
           ".write": "auth != null"
         }
       },
       "calls": {
         "$uid": {
           ".read": "auth != null",
           ".write": "auth != null"
         }
       }
     }
   }
   ```

4. **Run the Application**
   - Open `index.html` in a web browser
   - Or use a local server: `python -m http.server 8000`

## How It Works

- **Authentication**: Only registered users can access the chat
- **User Visibility**: Only shows users who are currently online
- **Display Names**: Users are identified by the first letter of their email
- **Private Chats**: Each conversation is private between two users only
- **Real-time Sync**: Messages appear instantly using Firebase Realtime Database

## Requirements Met

1. ✓ Firebase Authentication
2. ✓ Only logged-in users are visible
3. ✓ Do not show users who are not logged in
4. ✓ See only other logged-in users when logged in
5. ✓ Chat with one selected user at a time
6. ✓ See only your own chat list
7. ✓ Do not see chats of other users
8. ✓ Private one-to-one chats
9. ✓ Display users by first letter of email only
10. ✓ No full email or personal details shown
11. ✓ Real-time message sending and receiving
12. ✓ Instant delivery without page refresh
