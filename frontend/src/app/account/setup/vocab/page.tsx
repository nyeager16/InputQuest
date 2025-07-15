import { Suspense } from 'react';
import VocabPage from './VocabPage';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VocabPageWrapper() {
  return (
    <Suspense fallback={<LoadingSpinner size={6} />}>
      <VocabPage />
    </Suspense>
  );
}
