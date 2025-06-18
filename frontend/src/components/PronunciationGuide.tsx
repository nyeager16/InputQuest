import { FC, useState } from 'react';

interface PronunciationGuideProps {
  language: string;
  word: string; // IPA string
}

interface PronunciationData {
  englishEquivalent: string;
}

const pronunciationMap: Record<string, Record<string, PronunciationData>> = {
  pl: {
    'a': { englishEquivalent: 'a in father' },
    'ɔ': { englishEquivalent: 'aw in law' },
    'ɛ': { englishEquivalent: 'e in bed' },
    'k': { englishEquivalent: 'k in kite' },
    'r': { englishEquivalent: 'rolled r' },
    't': { englishEquivalent: 't in top' },
    'n': { englishEquivalent: 'n in no' },
    'ɨ': { englishEquivalent: 'i in roses (Polish y)' },
    'i': { englishEquivalent: 'ee in see' },
    'ɲ': { englishEquivalent: 'ny in canyon' },
    'j': { englishEquivalent: 'y in yes' },
    's': { englishEquivalent: 's in sun' },
    'v': { englishEquivalent: 'v in voice' },
    'p': { englishEquivalent: 'p in pot' },
    'l': { englishEquivalent: 'l in let' },
    'u': { englishEquivalent: 'oo in boot' },
    'ã': { englishEquivalent: 'a in “father” with nasal air (like French “sans”)' },
    't͡ɕ': { englishEquivalent: 'ch in cheese (palatalized)' },
    'd': { englishEquivalent: 'd in dog' },
    'm': { englishEquivalent: 'm in man' },
    'ɛ̃': { englishEquivalent: 'e in “men” with nasal air (like French “vin”)' },
    'ʃ': { englishEquivalent: 'sh in shut' },
    'ɔ̃': { englishEquivalent: 'aw in “law” with nasal air (like French “nom”)' },
    'b': { englishEquivalent: 'b in bat' },
    't͡ʃ': { englishEquivalent: 'ch in church' },
    't͡s': { englishEquivalent: 'ts in cats' },
    'z': { englishEquivalent: 'z in zoo' },
    'w': { englishEquivalent: 'w in wet' },
    'ɡ': { englishEquivalent: 'g in go' },
    'f': { englishEquivalent: 'f in fan' },
    'ɕ': { englishEquivalent: 'sh in sheep (palatalized)' },
    'c': { englishEquivalent: 'ts in bits (voiceless)' },
    'vʲ': { englishEquivalent: 'v in “view” (palatalized)' },
    'lʲ': { englishEquivalent: 'l in “leap” (light/palatalized)' },
    'ʒ': { englishEquivalent: 's in pleasure' },
    'x': { englishEquivalent: 'ch in loch (voiceless)' },
    'ĩ': { englishEquivalent: 'nasalized ee' },
    'mʲ': { englishEquivalent: 'm in “music” (palatalized)' },
    'pʲ': { englishEquivalent: 'p in “pew” (palatalized)' },
    'ʲ': { englishEquivalent: 'palatalization marker (like y)' },
    'sʲ': { englishEquivalent: 's in “suit” (palatalized)' },
    'd͡ʑ': { englishEquivalent: 'j in jeep (palatalized)' },
    'bʲ': { englishEquivalent: 'b in “beauty” (palatalized)' },
    'ɛ̇̃': { englishEquivalent: 'e in “net” with nasal and central quality' },
    'ɨ̃': { englishEquivalent: 'i in “roses” with nasal air' },
    'w̃': { englishEquivalent: 'w in “win” with nasal airflow' },
    'rʲ': { englishEquivalent: 'r in “real” (light rolled)' },
    'ũ': { englishEquivalent: 'oo in “boot” with nasal air' },
    'fʲ': { englishEquivalent: 'f in “few” (palatalized)' },
    'ŋ': { englishEquivalent: 'ng in sing' }
  },
};

// Normalization: maps alternate or marked tokens to base tokens
const normalizationMap: Record<string, string> = {
  'ɛ̇': 'ɛ',
  'xʲ': 'x',
  't͡ɕʲ': 't͡ɕ',
  'd͡ʑʲ': 'd͡ʑ',
  'l̩': 'l',
  'm̩': 'm',
  'tr̥': 'tr',
  'ts̪': 't͡s'
};

function normalizeToken(token: string): string {
  return normalizationMap[token] || token;
}

function tokenizeIPA(ipa: string): string[] {
  ipa = ipa.replace(/[ˈˌ‿]/g, '');

  const tokens: string[] = [];
  let i = 0;

  while (i < ipa.length) {
    const ch = ipa[i];

    if ((ipa[i + 1] === '\u0361' || ipa[i + 1] === '\u035C') && ipa[i + 2]) {
      tokens.push(ipa[i] + ipa[i + 1] + ipa[i + 2]);
      i += 3;
      continue;
    }

    if (ipa[i + 2] === '\u032F') {
      tokens.push(ipa[i] + ipa[i + 1] + ipa[i + 2]);
      i += 3;
      continue;
    }

    let token = ch;
    while (i + 1 < ipa.length && /\p{Mark}/u.test(ipa[i + 1])) {
      token += ipa[++i];
    }
    if (i + 1 < ipa.length && /\p{Modifier_Letter}/u.test(ipa[i + 1])) {
      token += ipa[++i];
    }

    tokens.push(token);
    i++;
  }

  return tokens;
}

const PronunciationGuide: FC<PronunciationGuideProps> = ({ language, word }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!word) {
    return;
  }

  const langData = pronunciationMap[language];
  if (!langData) {
    return;
  }

  const tokens = tokenizeIPA(word);

  return (
    <div className="w-full">
      <div className="w-full rounded bg-gray-200 overflow-hidden">
        <div
          className="px-4 py-2 cursor-pointer text-center font-medium"
          onClick={() => setIsOpen(!isOpen)}
        >
          Pronunciation Guide
        </div>
        {isOpen && (
          <div className="bg-gray-100 px-4 py-3 border-t border-gray-300 space-y-0">
            <div className="w-full max-w-md mx-auto">
              <p className="text-center text-lg font-semibold">
                /{tokenizeIPA(word).map((t) => normalizeToken(t)).join('')}/
              </p>
              {tokens.map((token, index) => {
                const normalized = normalizeToken(token);
                const guide = langData[normalized];
                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row justify-between items-center border-b py-2"
                  >
                    <span className="text-l">/{normalized}/</span>
                    <span className="text-sm text-gray-700">
                      {guide?.englishEquivalent || 'No match found'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PronunciationGuide;
