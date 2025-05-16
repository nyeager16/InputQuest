type ScoreBoxProps = {
  score: number;
};

export default function ScoreBox({ score }: ScoreBoxProps) {
  return (
    <div className="min-w-[40px] px-2 py-1 text-xs text-center rounded bg-gray-100 text-gray-700 shadow-sm">
      {score}
    </div>
  );
}
