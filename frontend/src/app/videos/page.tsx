'use client';

import { useState, useEffect, useRef } from 'react';
import VideoList from '@/components/VideoList';
import { VideoWithScore } from '@/lib/api';

export default function VideosPage() {
  const [selected, setSelected] = useState<VideoWithScore | null>(null);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);
  const [leftWidthPercent, setLeftWidthPercent] = useState(100);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    if (selected) {
      setShowRight(true);
      if (!showLeft) setShowLeft(true);
      setLeftWidthPercent(66.66);
    }
  }, [selected]);

  const handleHideLeft = () => {
    if (!showRight || !selected) return;
    setShowLeft(false);
  };

  const handleHideRight = () => {
    if (!showLeft) return;
    setShowRight(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left;
    const newPercent = (offsetX / containerRect.width) * 100;
    if (newPercent >= 25 && newPercent <= 75) {
      setLeftWidthPercent(newPercent);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const startResizing = () => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div ref={containerRef} className="flex h-full relative select-none">
      {/* Left Panel */}
      {showLeft && (
        <div
          className="relative overflow-y-auto flex flex-col border-r px-4 py-2"
          style={{
            width: showRight ? `${leftWidthPercent}%` : '100%',
          }}
        >
          {/* Toolbar */}
          <div className="flex justify-between items-center p-2">
            <div />
            {showRight && (
              <button
                onClick={handleHideLeft}
                disabled={!selected}
                className="text-sm px-2 py-1 border rounded bg-white shadow disabled:opacity-50"
              >
                ⬅ Hide
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <VideoList
              selectedVideoId={selected?.video.id ?? null}
              onSelect={setSelected}
            />
          </div>
        </div>
      )}

      {/* Resizer */}
      {showLeft && showRight && (
        <div
          onMouseDown={startResizing}
          className="w-1 cursor-col-resize bg-gray-300 hover:bg-gray-400 transition"
        />
      )}

      {/* Right Panel */}
      {showRight && (
        <div
          className="relative overflow-y-auto flex flex-col px-4 py-2"
          style={{
            width: showLeft ? `${100 - leftWidthPercent}%` : '100%',
          }}
        >
          {/* Toolbar */}
          <div className="flex justify-between items-center p-2">
            {showLeft && (
              <button
                onClick={handleHideRight}
                className="text-sm px-2 py-1 border rounded bg-white shadow"
              >
                ➡ Hide
              </button>
            )}
            <div />
          </div>

          <div className="flex-1 overflow-y-auto">
            {selected ? (
              <div className="space-y-4">
                <div className="w-full aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selected.video.url}`}
                    title={selected.video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded"
                  ></iframe>
                </div>
                <h2 className="text-base font-semibold">{selected.video.title}</h2>
                <p className="text-sm text-gray-600">
                  Channel: {selected.video.channel.name}
                </p>
              </div>
            ) : (
              <p>Select a video from the list</p>
            )}
          </div>
        </div>
      )}

      {/* Show Left Panel Button */}
      {!showLeft && (
        <button
          onClick={() => setShowLeft(true)}
          className="absolute top-2 left-4 z-20 bg-white border rounded px-2 py-1 text-sm shadow"
        >
          ➡ Show List
        </button>
      )}

      {/* Show Right Panel Button */}
      {!showRight && selected && (
        <button
          onClick={() => setShowRight(true)}
          className="absolute top-2 right-4 z-20 bg-white border rounded px-2 py-1 text-sm shadow"
        >
          ⬅ Show Player
        </button>
      )}
    </div>
  );
}
