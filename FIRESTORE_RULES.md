Gunakan rules ini dalam Firebase Console > Firestore Database > Rules:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /siteContent/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Langkah:
1. Buka `Firestore Database`
2. Buka tab `Rules`
3. Paste rules di atas
4. Klik `Publish`
