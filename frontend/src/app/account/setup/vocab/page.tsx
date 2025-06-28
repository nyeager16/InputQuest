import { Suspense } from 'react';
import VocabPage from './VocabPage';

export default function VocabPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VocabPage />
    </Suspense>
  );
}
