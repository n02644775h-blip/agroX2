// Centralized friendly Firebase Authentication Error Message Translator

export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred. Please try again.';

  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in the Firebase Console. Please enable Email/Password under Firebase Console > Authentication > Sign-in method.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Your password is too weak. Please choose a password with at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account was found with this email.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Authentication popup was closed before completing.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign back in to perform this sensitive action.';
    default:
      if (message.includes('auth/invalid-credential') || message.includes('INVALID_LOGIN_CREDENTIALS')) {
        return 'Incorrect email or password.';
      }
      if (message.includes('network') || message.includes('Network')) {
        return 'Network error. Please check your internet connection.';
      }
      return message || 'Authentication failed. Please verify your details.';
  }
}
