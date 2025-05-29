'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="flex flex-col items-center justify-center h-screen px-4">
        {showIntro && (
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-5xl md:text-7xl font-bold text-center"
          >
            InputQuest
          </motion.h1>
        )}

        {showIntro && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-4 text-xl md:text-2xl text-center"
          >
            A modern comprehensible input solution for language learners
          </motion.p>
        )}

        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="mt-8 space-y-4 w-full max-w-xs"
          >
            <Link href="/signup" className="block">
              <button className="w-full text-lg py-3 px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer">
                Sign Up
              </button>
            </Link>
            <Link href="/login" className="block">
              <button className="w-full text-lg py-3 px-6 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition cursor-pointer">
                Log In
              </button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gray-100 py-20 px-6 md:px-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">What is Comprehensible Input?</h2>
        <p className="text-lg md:text-xl max-w-3xl mx-auto">
          In language learning, input refers to the language a learner is exposed to through reading, listening, or observing.
          Comprehensible Input is language that is at or slightly above the learner's current level of understanding. It mimics how we acquire our first language: through exposure to language we can make sense of, even if we don't understand every word or structure.
        </p>
        <h2 className="text-3xl md:text-4xl font-bold mt-16 mb-6">Why InputQuest?</h2>
        <p className="text-lg md:text-xl max-w-3xl mx-auto">
          InputQuest is a comprehensive platform built around the Comprehensible Input methodology. It combines smart vocabulary tracking with flashcards, videos, and AI-powered feedback. Whether you're a beginner or advanced learner, our system adapts to your level and optimizes retention through spaced repetition and interactive content.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-xl font-semibold mb-2">Smart Vocabulary Recommendations</h3>
            <p>Focus on practical, high-frequency words that boost your real-world comprehension and help you understand videos faster.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-xl font-semibold mb-2">Adaptive Comprehension</h3>
            <p>Watch content tailored to your skill level and interests, and answer questions to reinforce understanding.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-xl font-semibold mb-2">Retention Optimized</h3>
            <p>Our spaced repetition system ensures optimal long-term retention of vocabulary.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
