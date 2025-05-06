export default function AboutPage() {
  return (
    <div className="pt-5">
      <header className="text-center bg-gray-800 text-white py-10 px-5">
        <h1 className="text-4xl sm:text-3xl font-bold m-0">About</h1>
      </header>

      <section className="max-w-3xl mx-auto my-10 px-5 text-center space-y-10">
        <div className="pb-5 border-b border-gray-200 last:border-none">
          <h2 className="text-2xl sm:text-xl text-gray-800 mb-2 font-semibold">What is Input?</h2>
          <p className="text-base sm:text-sm text-gray-600">
            In language learning, input refers to the language that a learner is exposed to through reading,
            listening, or observing. This contrasts to output, which is language that learners actively
            produce through speaking or writing. Both are vital to a well-rounded language learning routine.
          </p>
        </div>

        <div className="pb-5 border-b border-gray-200 last:border-none">
          <h2 className="text-2xl sm:text-xl text-gray-800 mb-2 font-semibold">What is Comprehensible Input?</h2>
          <p className="text-base sm:text-sm text-gray-600">
            Comprehensible Input is language that is slightly above the learner's current level of understanding.
            It mimics how we acquire our first language: through exposure to language we can make sense of,
            even if we don't understand every word or structure.
          </p>
        </div>

        <div className="pb-5 border-b border-gray-200 last:border-none">
          <h2 className="text-2xl sm:text-xl text-gray-800 mb-2 font-semibold">
            How Can I Use InputQuest to Find Comprehensible Input?
          </h2>
          <p className="text-base sm:text-sm text-gray-600">
            The <strong>Videos</strong> page is sorted by Comprehensible Input Percentage, which is the percentage
            of words in a given video that a user knows. This measure is shown to the left of each video title and
            can be filtered on the top of the screen. The ideal percentage comes down to personal preference and
            generally ranges anywhere from 80% to 98%. On the <strong>Watch</strong> page, you are given a custom
            queue of video clips tailored to a percentage of your choosing.
          </p>
        </div>

        <div className="pb-5 border-b border-gray-200 last:border-none">
          <h2 className="text-2xl sm:text-xl text-gray-800 mb-2 font-semibold">
            How Can I Use InputQuest to Learn Vocabulary?
          </h2>
          <p className="text-base sm:text-sm text-gray-600">
            The <strong>Learn</strong> page shows the most common words in our database that the user does not already
            know. Traditionally, databases of common words in a given language take data from a variety of different
            input sources like books. By narrowing this down to videos, you end up learning vocabulary that is most
            applicable to spoken language. By clicking a video on the <strong>Videos</strong> page, you can also see the
            most common words in that video that you do not already know. On the <strong>Review</strong> page, you can
            review words that you've already been exposed to via flashcards based on the FSRS algorithm. Reviewing
            vocabulary in this way is vital to long-term memory and is highly recommended.
          </p>
        </div>
      </section>
    </div>
  );
}
