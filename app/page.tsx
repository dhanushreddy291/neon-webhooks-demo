'use client';

import { UserButton } from '@neondatabase/neon-js/auth/react/ui';
import { authClient } from '@/lib/auth/client';
import Link from 'next/link';

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      {session?.user ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center space-y-4 dark:bg-gray-800">
          <h1 className="text-2xl font-bold">Welcome, {session.user.email}</h1>
          <p className="text-gray-500 dark:text-gray-400">You successfully bypassed the default email provider!</p>
          <div className="flex justify-center mt-4">
            <UserButton size={"sm"} />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-8">Neon Auth Webhooks Demo</h1>
          <Link href="/auth/sign-up" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Sign In / Sign Up
          </Link>
        </div>
      )}
    </main>
  );
}