export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
  
export const POS_CATEGORIES: { [label: string]: string[] } = {
  noun: ['subst'],
  verb: ['inf'],
  adj: ['adj'],
  adv: ['adv'],
  pron: ['ppron', 'siebie'],
  prep: ['prep'],
  part: ['part'],
  int: ['interj'],
  other: [],
};

export const POS_COLORS: { [label: string]: string } = {
  noun: 'bg-blue-500',
  verb: 'bg-green-500',
  adj: 'bg-purple-500',
  adv: 'bg-yellow-500',
  pron: 'bg-pink-500',
  prep: 'bg-indigo-500',
  part: 'bg-gray-500',
  int: 'bg-red-500',
  other: 'bg-black',
};

export const getPOSLabel = (tag: string): string => {
  for (const [label, prefixes] of Object.entries(POS_CATEGORIES)) {
    if (prefixes.some((prefix) => tag.startsWith(prefix))) {
      return label;
    }
  }
  return 'other';
};