import type { ReactNode } from 'react';

export interface RelatedPage {
  href: string;
  label: string;
}

export interface SeoPageContent {
  meta: {
    title: string;
    description: string;
    canonical: string;
  };
  hero: {
    badge?: string;
    heading: string;
    headingAccent?: string;
    subheading: string;
    ctaText: string;
    ctaLink: string;
  };
  features: {
    icon: string;
    title: string;
    description: string;
  }[];
  howItWorks?: {
    step: number;
    title: string;
    description: string;
  }[];
  faq?: {
    question: string;
    answer: string;
  }[];
  comparison?: {
    heading: string;
    subheading: string;
    columns: {
      label: string;
      highlight?: boolean;
      rows: string[];
    }[];
  };
  cta?: {
    heading: string;
    subheading: string;
    buttonText: string;
    buttonLink: string;
  };
  relatedPages?: RelatedPage[];
  structuredData?: Record<string, unknown>[];
}

export const aiStudyToolContent: SeoPageContent = {
  meta: {
    title: 'AI Study Tool — Turn Any Content Into a Study Session | Scritur',
    description:
      "Scritur is an AI study tool that turns YouTube videos, PDFs, websites, and notes into summaries, flashcards, quizzes, and progress tracking. Study with AI — free.",
    canonical: 'https://www.scritur.space/ai-study-tool',
  },
  hero: {
    badge: 'AI-Powered Learning',
    heading: 'An AI Study Tool',
    headingAccent: 'That Turns Anything Into a Lesson',
    subheading:
      'Paste a YouTube link, upload a PDF, or add a website. Scritur reads your content and builds a study workspace with summaries, flashcards, quizzes, and progress tracking — so you can learn faster without switching between five different apps.',
    ctaText: 'Start Studying Free',
    ctaLink: '/',
  },
  features: [
    {
      icon: 'Youtube',
      title: 'YouTube Study Mode',
      description:
        'Paste any YouTube URL and Scritur pulls the full transcript. Ask questions about specific points, get summaries of key arguments, and jump to the exact timestamp — without scrubbing through an hour of video.',
    },
    {
      icon: 'FileText',
      title: 'PDF & Document Analysis',
      description:
        'Upload a textbook chapter, lecture notes, or research paper. Scritur chunks the text, indexes it, and lets you ask questions that are answered directly from your document — with page references.',
    },
    {
      icon: 'Globe',
      title: 'Website & Article Import',
      description:
        'Add any public URL. Scritur extracts the article content, strips the noise, and makes it part of your study workspace. Great for tutorials, documentation, and blog posts.',
    },
    {
      icon: 'Layers',
      title: 'Auto-Generated Flashcards',
      description:
        'Scritur identifies key definitions, concepts, and relationships in your content and creates flashcards automatically. Review with spaced repetition so you remember what you study.',
    },
    {
      icon: 'Brain',
      title: 'AI-Generated Quizzes',
      description:
        'Test yourself with quizzes built from your actual study materials. Multiple choice, short answer, and coding questions — not generic trivia, but questions grounded in the content you are learning.',
    },
    {
      icon: 'BarChart3',
      title: 'Progress & Revision Tracking',
      description:
        'See what you have studied, what you have mastered, and what needs review. Scritur tracks your learning across sessions and schedules revisions at the right intervals.',
    },
  ],
  howItWorks: [
    {
      step: 1,
      title: 'Import Your Content',
      description:
        'Paste a YouTube URL, upload a PDF or document, or add a website link. Scritur accepts the formats students actually use.',
    },
    {
      step: 2,
      title: 'AI Reads & Organizes',
      description:
        'Scritur processes your content, extracts key information, and builds a structured knowledge base you can interact with.',
    },
    {
      step: 3,
      title: 'Study Interactively',
      description:
        'Ask questions, review flashcards, take quizzes, and read AI-generated summaries — all grounded in the content you imported.',
    },
    {
      step: 4,
      title: 'Track & Retain',
      description:
        'Monitor your progress, review at spaced intervals, and build lasting knowledge instead of cramming and forgetting.',
    },
  ],
  faq: [
    {
      question: 'What is an AI study tool?',
      answer:
        'An AI study tool uses artificial intelligence to help you learn from your own materials. Instead of generating generic content, it reads the documents, videos, or articles you import and creates study aids — summaries, flashcards, quizzes, and Q&A — based on that specific content.',
    },
    {
      question: 'What content can I import into Scritur?',
      answer:
        'Scritur supports YouTube videos (via transcript extraction), PDF documents, Word files (.docx), PowerPoint presentations (.pptx), plain text, Markdown, GitHub repositories, and public website URLs. You can mix multiple sources in a single workspace.',
    },
    {
      question: 'How is this different from just asking ChatGPT about my notes?',
      answer:
        'Generic AI tools answer from their training data, which may include information unrelated to your materials. Scritur indexes YOUR content and answers exclusively from it. It also provides structured study tools — flashcards with spaced repetition, quizzes scored against your content, and progress tracking — that a chat interface does not offer.',
    },
    {
      question: 'Can I study across multiple sources at once?',
      answer:
        'Yes. Import a YouTube lecture, a textbook PDF, and a reference article into the same workspace. When you ask a question, Scritur searches across all your imported content and synthesizes an answer from the relevant sources.',
    },
    {
      question: 'Is Scritur free?',
      answer:
        'Yes. Scritur offers a free tier that includes content import, AI chat, flashcards, quizzes, and progress tracking. No credit card is required to get started.',
    },
    {
      question: 'Do I need to create an account?',
      answer:
        'You can start using Scritur immediately without an account. If you want to save your workspaces and track progress across devices, you can create a free account.',
    },
  ],
  relatedPages: [
    { href: '/ai-tutor', label: 'AI Tutor — Ask questions about any document or video' },
    { href: '/ai-flashcard-generator', label: 'AI Flashcard Generator — Auto-create flashcards from any content' },
    { href: '/ai-quiz-generator', label: 'AI Quiz Generator — Test your knowledge with AI-powered quizzes' },
  ],
  structuredData: [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Scritur',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://www.scritur.space/',
      description:
        'AI study tool that turns YouTube videos, PDFs, websites, and notes into summaries, flashcards, quizzes, and progress tracking.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is an AI study tool?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'An AI study tool uses artificial intelligence to help you learn from your own materials. Instead of generating generic content, it reads the documents, videos, or articles you import and creates study aids — summaries, flashcards, quizzes, and Q&A — based on that specific content.',
          },
        },
        {
          '@type': 'Question',
          name: 'What content can I import into Scritur?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Scritur supports YouTube videos (via transcript extraction), PDF documents, Word files (.docx), PowerPoint presentations (.pptx), plain text, Markdown, GitHub repositories, and public website URLs. You can mix multiple sources in a single workspace.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is this different from just asking ChatGPT about my notes?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Generic AI tools answer from their training data, which may include information unrelated to your materials. Scritur indexes YOUR content and answers exclusively from it. It also provides structured study tools — flashcards with spaced repetition, quizzes scored against your content, and progress tracking — that a chat interface does not offer.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I study across multiple sources at once?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Import a YouTube lecture, a textbook PDF, and a reference article into the same workspace. When you ask a question, Scritur searches across all your imported content and synthesizes an answer from the relevant sources.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Scritur free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Scritur offers a free tier that includes content import, AI chat, flashcards, quizzes, and progress tracking. No credit card is required to get started.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to create an account?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can start using Scritur immediately without an account. If you want to save your workspaces and track progress across devices, you can create a free account.',
          },
        },
      ],
    },
  ],
  cta: {
    heading: 'Study With Your Content, Not About It',
    subheading:
      'Import your first YouTube video, PDF, or article and see how Scritur turns it into an interactive study session. Free to start.',
    buttonText: 'Start Learning Free',
    buttonLink: '/',
  },
};

export const aiTutorContent: SeoPageContent = {
  meta: {
    title: 'AI Tutor Online — Ask Questions About Your Study Material | Scritur',
    description:
      "Scritur's AI tutor reads your YouTube videos, PDFs, and documents, then answers your questions with cited sources. Ask anything about the material you are studying.",
    canonical: 'https://www.scritur.space/ai-tutor',
  },
  hero: {
    badge: 'Instant, Cited Answers',
    heading: 'An AI Tutor That',
    headingAccent: 'Actually Reads Your Material',
    subheading:
      'Paste a YouTube lecture, upload a textbook chapter, or add any document. Then ask questions and get precise answers drawn from that specific content — with citations you can verify.',
    ctaText: 'Ask Your First Question',
    ctaLink: '/',
  },
  features: [
    {
      icon: 'MessageSquare',
      title: 'Ask About Your Own Content',
      description:
        'Type questions in plain language about the videos, PDFs, or articles you have imported. The tutor answers from your material, not from the open internet.',
    },
    {
      icon: 'Shield',
      title: 'Cited, Grounded Answers',
      description:
        'Every answer points back to the specific section of your content it came from. If the answer is not in your materials, the tutor says so instead of guessing.',
    },
    {
      icon: 'Clock',
      title: 'Timestamp References for Videos',
      description:
        'When you ask about a YouTube lecture, the tutor cites the exact timestamp. Jump directly to the moment in the video being referenced.',
    },
    {
      icon: 'RefreshCw',
      title: 'Follow-Up Questions',
      description:
        'Ask clarifying questions, request simpler explanations, or dig deeper into a concept. The tutor remembers the full conversation and builds on previous answers.',
    },
    {
      icon: 'Layers',
      title: 'Multi-Source Answers',
      description:
        'Import a lecture video, a textbook PDF, and a reference article. Ask a question and the tutor synthesizes an answer from all three sources.',
    },
    {
      icon: 'FileText',
      title: 'Export Your Q&A',
      description:
        'Save your study conversations as PDF or DOCX files. Useful for review, sharing with study groups, or keeping a record of what you have covered.',
    },
  ],
  howItWorks: [
    {
      step: 1,
      title: 'Add Your Study Material',
      description:
        'Paste a YouTube URL, upload a PDF or document, or add a website link. The tutor reads whatever you provide.',
    },
    {
      step: 2,
      title: 'Ask a Question',
      description:
        'Type what you want to understand. Ask for explanations, summaries, comparisons, or specific details from your content.',
    },
    {
      step: 3,
      title: 'Get a Cited Answer',
      description:
        'The tutor responds with an answer drawn from your material, along with a citation showing exactly where it came from.',
    },
    {
      step: 4,
      title: 'Keep Going',
      description:
        'Follow up with more questions. Ask for simpler terms, deeper detail, or connections between concepts across your sources.',
    },
  ],
  faq: [
    {
      question: 'What is an AI tutor?',
      answer:
        'An AI tutor is an AI-powered assistant that helps you understand your study material. Unlike a general chatbot, an AI tutor reads the specific documents, videos, or articles you provide and answers questions based on that content. It acts like a knowledgeable study partner who has read everything you are working through and can explain it in different ways.',
    },
    {
      question: 'How is an AI tutor different from ChatGPT?',
      answer:
        'ChatGPT answers from its general training data, which may not match your specific course materials. An AI tutor like Scritur indexes YOUR content and answers exclusively from it. That means answers are grounded in the actual lecture, textbook, or article you are studying — not generic knowledge that may or may not apply. Scritur also provides source citations so you can verify every answer.',
    },
    {
      question: 'What can I ask the AI tutor about?',
      answer:
        'You can ask for explanations of concepts, summaries of sections, comparisons between ideas, definitions of terms, connections across chapters, or clarifications of anything you do not understand. The tutor works with whatever content you import — it does not have predetermined limits on question types.',
    },
    {
      question: 'Does the tutor work with YouTube videos?',
      answer:
        'Yes. Paste any YouTube URL and Scritur extracts the transcript. You can then ask questions about the lecture, request summaries of specific sections, or ask for explanations of concepts discussed in the video. Timestamps are included in citations so you can jump to the relevant moment.',
    },
    {
      question: 'Can I ask follow-up questions?',
      answer:
        'Yes. The AI tutor maintains the full conversation context. If you ask "Can you explain that more simply?" or "How does this connect to what we discussed earlier?", it understands the reference and responds accordingly.',
    },
    {
      question: 'What file formats does the AI tutor support?',
      answer:
        'YouTube videos (via transcript extraction), PDF documents, Word files (.docx), PowerPoint presentations (.pptx), plain text, Markdown, GitHub repositories, and public website URLs. You can combine multiple sources in a single workspace.',
    },
    {
      question: 'Is Scritur free to use as an AI tutor?',
      answer:
        'Yes. Scritur offers a free tier that includes content import, AI tutor Q&A, flashcards, quizzes, and progress tracking. No credit card is required.',
    },
  ],
  relatedPages: [
    { href: '/ai-study-tool', label: 'AI Study Tool — Turn any content into a study session' },
    { href: '/ai-flashcard-generator', label: 'AI Flashcard Generator — Auto-create flashcards from your material' },
    { href: '/ai-quiz-generator', label: 'AI Quiz Generator — Test what you have learned' },
  ],
  structuredData: [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Scritur',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://www.scritur.space/',
      description:
        'AI tutor that reads your YouTube videos, PDFs, and documents, then answers questions with cited sources.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is an AI tutor?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'An AI tutor is an AI-powered assistant that helps you understand your study material. Unlike a general chatbot, an AI tutor reads the specific documents, videos, or articles you provide and answers questions based on that content. It acts like a knowledgeable study partner who has read everything you are working through and can explain it in different ways.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is an AI tutor different from ChatGPT?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ChatGPT answers from its general training data, which may not match your specific course materials. An AI tutor like Scritur indexes YOUR content and answers exclusively from it. That means answers are grounded in the actual lecture, textbook, or article you are studying — not generic knowledge that may or may not apply. Scritur also provides source citations so you can verify every answer.',
          },
        },
        {
          '@type': 'Question',
          name: 'What can I ask the AI tutor about?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can ask for explanations of concepts, summaries of sections, comparisons between ideas, definitions of terms, connections across chapters, or clarifications of anything you do not understand. The tutor works with whatever content you import — it does not have predetermined limits on question types.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does the tutor work with YouTube videos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Paste any YouTube URL and Scritur extracts the transcript. You can then ask questions about the lecture, request summaries of specific sections, or ask for explanations of concepts discussed in the video. Timestamps are included in citations so you can jump to the relevant moment.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I ask follow-up questions?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The AI tutor maintains the full conversation context. If you ask "Can you explain that more simply?" or "How does this connect to what we discussed earlier?", it understands the reference and responds accordingly.',
          },
        },
        {
          '@type': 'Question',
          name: 'What file formats does the AI tutor support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'YouTube videos (via transcript extraction), PDF documents, Word files (.docx), PowerPoint presentations (.pptx), plain text, Markdown, GitHub repositories, and public website URLs. You can combine multiple sources in a single workspace.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Scritur free to use as an AI tutor?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Scritur offers a free tier that includes content import, AI tutor Q&A, flashcards, quizzes, and progress tracking. No credit card is required.',
          },
        },
      ],
    },
  ],
  cta: {
    heading: 'Understand Your Material, Not Just Memorize It',
    subheading:
      'Import a video, document, or article and start asking questions. The AI tutor reads your content and helps you actually understand it.',
    buttonText: 'Try the AI Tutor Free',
    buttonLink: '/',
  },
};

export const aiFlashcardGeneratorContent: SeoPageContent = {
  meta: {
    title: 'AI Flashcard Generator — Make Flashcards from PDFs, Videos & Notes | Scritur',
    description:
      'Generate flashcards from YouTube videos, PDFs, websites, and notes in seconds. Scritur is a free AI flashcard generator with spaced repetition built in.',
    canonical: 'https://www.scritur.space/ai-flashcard-generator',
  },
  hero: {
    badge: 'AI-Powered Flashcards',
    heading: 'AI Flashcard Generator',
    headingAccent: 'From Any Study Material',
    subheading:
      'Paste a YouTube link, upload a PDF, or add your notes. Scritur reads your content and creates question-and-answer flashcards in seconds — so you can start reviewing instead of making cards.',
    ctaText: 'Generate Flashcards Free',
    ctaLink: '/',
  },
  features: [
    {
      icon: 'Zap',
      title: 'Generate in Seconds',
      description:
        'Import your content and get flashcards almost instantly. Scritur identifies key definitions, concepts, and relationships and turns them into reviewable cards.',
    },
    {
      icon: 'FileText',
      title: 'Works with PDFs & Documents',
      description:
        'Upload a textbook chapter, lecture slides, or study notes. The AI flashcard generator reads your document and pulls out the material worth reviewing.',
    },
    {
      icon: 'Youtube',
      title: 'Flashcards from YouTube Lectures',
      description:
        'Paste any YouTube URL. Scritur extracts the transcript and creates flashcards from the key points discussed in the video.',
    },
    {
      icon: 'Repeat',
      title: 'Spaced Repetition Built In',
      description:
        'Generated cards are automatically scheduled for review at increasing intervals. You see cards right before you are likely to forget them, which helps with long-term retention.',
    },
    {
      icon: 'Pencil',
      title: 'Edit Every Card',
      description:
        'Modify the question, answer, or difficulty of any generated flashcard. Add your own cards too. The AI generation is a starting point you can refine.',
    },
    {
      icon: 'Target',
      title: 'Track What You Know',
      description:
        'See which cards you have mastered and which need more review. Focus your study time on the concepts that are not sticking yet.',
    },
  ],
  howItWorks: [
    {
      step: 1,
      title: 'Import Your Material',
      description:
        'Add a PDF, YouTube video, website, or any document to Scritur. The flashcard generator reads whatever you provide.',
    },
    {
      step: 2,
      title: 'AI Creates Flashcards',
      description:
        'Scritur analyzes your content and generates question-and-answer pairs for the key concepts, terms, and ideas.',
    },
    {
      step: 3,
      title: 'Review & Edit',
      description:
        'Look through the generated cards. Edit any card you want to change, delete ones you do not need, or add your own.',
    },
    {
      step: 4,
      title: 'Study with Spaced Repetition',
      description:
        'Use the built-in review system. Cards appear at spaced intervals based on how well you know them.',
    },
  ],
  faq: [
    {
      question: 'What is an AI flashcard generator?',
      answer:
        'An AI flashcard generator is a tool that reads your study material — like a PDF, video transcript, or notes — and automatically creates question-and-answer flashcards from it. Instead of spending hours writing cards by hand, you import your content and the AI identifies the key concepts worth reviewing.',
    },
    {
      question: 'How do I make flashcards from a PDF?',
      answer:
        'Upload your PDF to Scritur. The AI reads the document, identifies important concepts and definitions, and generates flashcards from the content. You can then review, edit, or add to the generated cards.',
    },
    {
      question: 'Can I make flashcards from YouTube videos?',
      answer:
        'Yes. Paste any YouTube URL and Scritur extracts the transcript. It then creates flashcards from the key points, definitions, and concepts discussed in the video.',
    },
    {
      question: 'Can I edit the generated flashcards?',
      answer:
        'Yes. Every generated card is fully editable. You can change the question, rewrite the answer, adjust the difficulty, or delete cards that are not relevant. You can also add your own cards from scratch.',
    },
    {
      question: 'How is generating flashcards from my own material better than using a pre-made deck?',
      answer:
        'Pre-made flashcard decks cover generic topics. When you generate cards from your specific textbook, lecture notes, or course material, the cards match exactly what you are studying. The questions and answers come from the same source you will be tested on.',
    },
    {
      question: 'What is spaced repetition and does Scritur support it?',
      answer:
        'Spaced repetition is a review method where you see flashcards at gradually increasing intervals — soon after learning, then a day later, then a few days later, and so on. Research shows this is more effective for long-term retention than reviewing everything at once. Scritur schedules your reviews automatically.',
    },
    {
      question: 'Is this AI flashcard generator free?',
      answer:
        'Yes. Scritur offers a free tier that includes content import, flashcard generation, spaced repetition review, quizzes, and progress tracking. No credit card is required.',
    },
  ],
  relatedPages: [
    { href: '/ai-study-tool', label: 'AI Study Tool — Turn any content into a complete study session' },
    { href: '/ai-tutor', label: 'AI Tutor — Ask questions about your study material' },
    { href: '/ai-quiz-generator', label: 'AI Quiz Generator — Test your knowledge with generated quizzes' },
  ],
  structuredData: [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Scritur',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://www.scritur.space/',
      description:
        'AI flashcard generator that creates flashcards from YouTube videos, PDFs, websites, and notes with built-in spaced repetition.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is an AI flashcard generator?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'An AI flashcard generator is a tool that reads your study material — like a PDF, video transcript, or notes — and automatically creates question-and-answer flashcards from it. Instead of spending hours writing cards by hand, you import your content and the AI identifies the key concepts worth reviewing.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I make flashcards from a PDF?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Upload your PDF to Scritur. The AI reads the document, identifies important concepts and definitions, and generates flashcards from the content. You can then review, edit, or add to the generated cards.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I make flashcards from YouTube videos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Paste any YouTube URL and Scritur extracts the transcript. It then creates flashcards from the key points, definitions, and concepts discussed in the video.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I edit the generated flashcards?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Every generated card is fully editable. You can change the question, rewrite the answer, adjust the difficulty, or delete cards that are not relevant. You can also add your own cards from scratch.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is generating flashcards from my own material better than using a pre-made deck?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pre-made flashcard decks cover generic topics. When you generate cards from your specific textbook, lecture notes, or course material, the cards match exactly what you are studying. The questions and answers come from the same source you will be tested on.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is spaced repetition and does Scritur support it?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Spaced repetition is a review method where you see flashcards at gradually increasing intervals — soon after learning, then a day later, then a few days later, and so on. Research shows this is more effective for long-term retention than reviewing everything at once. Scritur schedules your reviews automatically.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is this AI flashcard generator free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Scritur offers a free tier that includes content import, flashcard generation, spaced repetition review, quizzes, and progress tracking. No credit card is required.',
          },
        },
      ],
    },
  ],
  cta: {
    heading: 'Stop Making Flashcards by Hand',
    subheading:
      'Import your study material and let the AI generate flashcards for you. Then review with spaced repetition and actually remember what you learn.',
    buttonText: 'Start Generating Flashcards',
    buttonLink: '/',
  },
};

export const aiQuizGeneratorContent: SeoPageContent = {
  meta: {
    title: 'AI Quiz Generator — Create Quizzes from PDFs, Videos & Notes | Scritur',
    description:
      'Generate quizzes from YouTube videos, PDFs, websites, and notes. Scritur is a free AI quiz generator that creates questions from your study material.',
    canonical: 'https://www.scritur.space/ai-quiz-generator',
  },
  hero: {
    badge: 'Test What You Know',
    heading: 'AI Quiz Generator',
    headingAccent: 'From Any Study Material',
    subheading:
      'Paste a YouTube link, upload a PDF, or add your notes. Scritur reads your content and creates quizzes with multiple choice, short answer, and coding questions — all drawn from the material you are studying.',
    ctaText: 'Generate a Quiz Free',
    ctaLink: '/',
  },
  features: [
    {
      icon: 'HelpCircle',
      title: 'Multiple Question Types',
      description:
        'Get multiple choice, short answer, and coding questions generated from your content. The question types match what you are likely to see on an actual exam or assignment.',
    },
    {
      icon: 'FileText',
      title: 'Quizzes from PDFs & Documents',
      description:
        'Upload a textbook chapter, lecture slides, or study notes. The AI quiz generator reads your document and creates questions from the key concepts and facts.',
    },
    {
      icon: 'Youtube',
      title: 'Quizzes from YouTube Lectures',
      description:
        'Paste any YouTube URL. Scritur extracts the transcript and generates quiz questions from the material covered in the video.',
    },
    {
      icon: 'CheckCircle',
      title: 'Instant Scoring & Explanations',
      description:
        'See your score immediately after finishing a quiz. Every answer includes an explanation so you understand why an answer is correct — not just which one was right.',
    },
    {
      icon: 'RefreshCw',
      title: 'Generate New Quizzes Anytime',
      description:
        'Take the same quiz again with different questions, or generate fresh quizzes targeting specific topics. Practice without running out of material.',
    },
    {
      icon: 'BarChart3',
      title: 'See Where You Are Weak',
      description:
        'Quiz results show which topics you understand and which ones need more work. Use that to focus your study time on the right areas.',
    },
  ],
  howItWorks: [
    {
      step: 1,
      title: 'Import Your Material',
      description:
        'Add a PDF, YouTube video, website, or document to Scritur. The AI quiz generator reads whatever you provide.',
    },
    {
      step: 2,
      title: 'Set Your Preferences',
      description:
        'Choose the question types, number of questions, and difficulty level. You can also set a time limit for practice under pressure.',
    },
    {
      step: 3,
      title: 'Take the Quiz',
      description:
        'Answer questions generated from your actual study material. Every question is grounded in the content you imported.',
    },
    {
      step: 4,
      title: 'Review & Identify Gaps',
      description:
        'Check your score, read the explanations for each answer, and see which topics need more review.',
    },
  ],
  faq: [
    {
      question: 'What is an AI quiz generator?',
      answer:
        'An AI quiz generator is a tool that reads your study material — like a PDF, video transcript, or notes — and automatically creates quiz questions from it. Instead of finding or writing practice questions yourself, you import your content and the AI generates questions that test your understanding of that specific material.',
    },
    {
      question: 'How do I create a quiz from a PDF?',
      answer:
        'Upload your PDF to Scritur. The AI reads the document, identifies the key concepts and facts, and generates quiz questions from the content. You can choose the question types, number of questions, and difficulty level before generating.',
    },
    {
      question: 'Can I generate quizzes from YouTube videos?',
      answer:
        'Yes. Paste any YouTube URL and Scritur extracts the transcript. It then creates quiz questions from the material covered in the lecture or tutorial.',
    },
    {
      question: 'What types of questions does the AI generate?',
      answer:
        'Scritur can generate multiple choice questions, short answer questions, and coding challenges. The question types are selected based on your content and preferences.',
    },
    {
      question: 'Are the quiz questions based on my actual content?',
      answer:
        'Yes. All questions are generated exclusively from the material you import. The AI identifies important concepts, facts, and relationships in your content and creates questions to test your understanding of them.',
    },
    {
      question: 'Can I retake quizzes or generate new ones?',
      answer:
        'Yes. You can regenerate quizzes from the same content with different questions, or retake the same quiz to reinforce what you have learned. There is no limit on how many quizzes you can generate.',
    },
    {
      question: 'How is this different from using a general AI chatbot for practice questions?',
      answer:
        'A general chatbot generates questions from its training data, which may not match your specific course material. Scritur generates questions exclusively from the content you import — your textbook, lecture notes, or video. It also provides scoring, answer explanations, and progress tracking that a chat interface does not offer.',
    },
    {
      question: 'Is this AI quiz generator free?',
      answer:
        'Yes. Scritur offers a free tier that includes content import, quiz generation, scoring, answer explanations, and progress tracking. No credit card is required.',
    },
  ],
  relatedPages: [
    { href: '/ai-study-tool', label: 'AI Study Tool — Turn any content into a complete study session' },
    { href: '/ai-tutor', label: 'AI Tutor — Ask questions about your study material' },
    { href: '/ai-flashcard-generator', label: 'AI Flashcard Generator — Auto-create flashcards from your material' },
  ],
  structuredData: [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Scritur',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://www.scritur.space/',
      description:
        'AI quiz generator that creates quizzes from YouTube videos, PDFs, websites, and notes with instant scoring and explanations.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is an AI quiz generator?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'An AI quiz generator is a tool that reads your study material — like a PDF, video transcript, or notes — and automatically creates quiz questions from it. Instead of finding or writing practice questions yourself, you import your content and the AI generates questions that test your understanding of that specific material.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I create a quiz from a PDF?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Upload your PDF to Scritur. The AI reads the document, identifies the key concepts and facts, and generates quiz questions from the content. You can choose the question types, number of questions, and difficulty level before generating.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I generate quizzes from YouTube videos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Paste any YouTube URL and Scritur extracts the transcript. It then creates quiz questions from the material covered in the lecture or tutorial.',
          },
        },
        {
          '@type': 'Question',
          name: 'What types of questions does the AI generate?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Scritur can generate multiple choice questions, short answer questions, and coding challenges. The question types are selected based on your content and preferences.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are the quiz questions based on my actual content?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. All questions are generated exclusively from the material you import. The AI identifies important concepts, facts, and relationships in your content and creates questions to test your understanding of them.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I retake quizzes or generate new ones?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. You can regenerate quizzes from the same content with different questions, or retake the same quiz to reinforce what you have learned. There is no limit on how many quizzes you can generate.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is this different from using a general AI chatbot for practice questions?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A general chatbot generates questions from its training data, which may not match your specific course material. Scritur generates questions exclusively from the content you import — your textbook, lecture notes, or video. It also provides scoring, answer explanations, and progress tracking that a chat interface does not offer.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is this AI quiz generator free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Scritur offers a free tier that includes content import, quiz generation, scoring, answer explanations, and progress tracking. No credit card is required.',
          },
        },
      ],
    },
  ],
  cta: {
    heading: 'Test Yourself Before the Test Tests You',
    subheading:
      'Import your study material and generate a quiz in seconds. Find out what you know and what you still need to work on.',
    buttonText: 'Generate Your First Quiz',
    buttonLink: '/',
  },
};
