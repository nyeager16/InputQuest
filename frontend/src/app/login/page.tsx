import { Suspense } from 'react';
import LoginClient from './LoginClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<LoadingSpinner size={6} />}>
      <LoginClient />
    </Suspense>
  );
}
