'use client';

interface VideoWordTagsProps {
  words: string[];
}

export default function VideoWordTags({ words }: VideoWordTagsProps) {
  if (!words.length) return null;

  return (
    <div className="mt-6">
      <div className="border-t border-gray-300 pt-4">
        <h3 className="text-base font-medium text-center text-gray-700 mb-4">
          New Words
        </h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {words.map((word, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded text-sm font-medium select-text"
              style={{
                backgroundColor: '#e0f7fa',
                color: '#00695c',
              }}
            >
              {word}
            </span>
          ))}
        </div>
        <div className="border-t border-gray-300 mt-4" />
      </div>
    </div>
  );
}
