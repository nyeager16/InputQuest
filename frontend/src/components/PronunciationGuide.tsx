import { FC, useState } from 'react';

interface PronunciationGuideProps {
  language: string;
  word: string;
}

const pronunciationMap: Record<string, Record<string, string>> = {
  pl: {
    a: 'test1',
    b: 'test2',
    // Add more mappings as needed
  },
};

const PronunciationGuide: FC<PronunciationGuideProps> = ({ language, word }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!pronunciationMap[language]) {
    return <p className="text-red-500">Pronunciation Guide Not Found</p>;
  }

  const toggleOpen = () => setIsOpen((prev) => !prev);

  return (
    <div className="w-full">
      <div className="w-full rounded bg-gray-200 overflow-hidden">
        <div
          className="px-4 py-2 cursor-pointer text-center font-medium"
          onClick={toggleOpen}
        >
          Show Pronunciation Guide
        </div>
        {isOpen && (
          <div className="bg-gray-100 px-4 py-3 space-y-1 border-t border-gray-300">
            {word.split('').map((char, index) => {
              const guide = pronunciationMap[language][char];
              if (!guide) return null;
              return (
                <p key={index} className="whitespace-pre">
                  /{char}/: {guide}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PronunciationGuide;
