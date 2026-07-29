
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  onModuleInit() {
    // Check if it's already initialized to prevent errors during NestJS hot-reloads
    if (!admin.apps.length) {
      this.firebaseApp = admin.initializeApp({
        projectId: 'ssc-prep-auth',
      });
      console.log('🔥 Firebase Admin Initialized Successfully');
    } else {
      this.firebaseApp = admin.app();
    }
  }

  // We expose this method so our AuthGuard can access Firebase Auth
  getAuth() {
    return this.firebaseApp.auth();
  }
}
