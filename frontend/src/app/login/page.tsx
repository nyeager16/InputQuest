import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div>Loading login...</div>}>
      <LoginClient />
    </Suspense>
  );
}
