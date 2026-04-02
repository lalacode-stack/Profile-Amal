# Firebase Setup

1. Salin `firebase-config.example.js` kepada `firebase-config.js`.
2. Isi nilai Firebase project anda dan tukar `enabled` kepada `true`.
3. Aktifkan `Authentication > Email/Password` dalam Firebase Console.
4. Aktifkan Firestore Database.
5. Cipta seorang admin user melalui Firebase Authentication.
6. Buka `admin.html` dan login menggunakan email/password admin tersebut.

Cadangan Firestore rules:

```
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
