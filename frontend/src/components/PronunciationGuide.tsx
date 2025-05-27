import { FC } from 'react';

interface PronunciationGuideProps {
  language: string;
  word: string;
}

const pronunciationMap: Record<string, Record<string, string>> = {
  pl: {
    a: 'test1',
    b: 'test2',
  },
};

const PronunciationGuide: FC<PronunciationGuideProps> = ({ language, word }) => {
  if (!pronunciationMap[language]) {
    return <p className="text-red-500">Pronunciation Guide Not Found</p>;
  }

  return (
    <div className="bg-gray-100 p-3 rounded space-y-1">
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
  );
};

export default PronunciationGuide;
