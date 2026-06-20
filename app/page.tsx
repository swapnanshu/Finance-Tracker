'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleAuthProvider } from '@/src/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Dashboard from '@/components/dashboard';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const { user, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('googleAccessToken', credential.accessToken);
      }
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">Artha Kosha</CardTitle>
            <CardDescription className="text-gray-500 mt-2">
              Your autonomous personal accountant. Track, categorize, and grow your wealth effortlessly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center flex-col gap-4 mt-4">
             <Button onClick={handleSignIn} size="lg" className="w-full font-medium">
               Sign in with Google
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Dashboard />;
}
