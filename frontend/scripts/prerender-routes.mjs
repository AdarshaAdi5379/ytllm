/**
 * SEO prerender route configuration.
 *
 * Each route defines a path that will be prerendered into dist/<path>/index.html
 * at build time. The prerender script visits each route, waits for React to render,
 * and captures the resulting HTML.
 *
 * To add a new SEO page:
 * 1. Create the React component in src/seo/pages/
 * 2. Add the route here with its metadata
 * 3. The prerender script handles the rest
 */

export const SITE_URL = 'https://www.scritur.space';

export const prerenderRoutes = [
  {
    path: 'ai-study-tool',
    title: 'AI Study Tool — Turn Any Content Into a Personalized Study Session | Scritur',
    description: 'Use Scritur\'s AI study tool to turn YouTube videos, PDFs, websites, and notes into flashcards, quizzes, and summaries. Study smarter with AI-powered learning.',
    canonical: 'https://www.scritur.space/ai-study-tool',
  },
  {
    path: 'ai-tutor',
    title: 'AI Tutor — Ask Questions About Any Document or Video | Scritur',
    description: 'Get instant answers from any YouTube video, PDF, or document. Scritur\'s AI tutor reads your content and answers questions with cited sources.',
    canonical: 'https://www.scritur.space/ai-tutor',
  },
  {
    path: 'ai-flashcard-generator',
    title: 'AI Flashcard Generator — Auto-Generate Flashcards from Notes, PDFs, and Videos | Scritur',
    description: 'Automatically generate flashcards from YouTube transcripts, PDF documents, and notes. Scritur uses AI to create effective study flashcards.',
    canonical: 'https://www.scritur.space/ai-flashcard-generator',
  },
  {
    path: 'ai-quiz-generator',
    title: 'AI Quiz Generator — Create Quizzes from Any Study Material | Scritur',
    description: 'Generate quizzes from any content — YouTube videos, PDFs, websites, and notes. Test your knowledge with AI-powered questions and track your progress.',
    canonical: 'https://www.scritur.space/ai-quiz-generator',
  },
];
