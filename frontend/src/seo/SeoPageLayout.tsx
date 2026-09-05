import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface SeoPageLayoutProps {
  children: ReactNode;
}

export function SeoPageLayout({ children }: SeoPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-gray-100">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="font-bold text-lg text-gray-900 tracking-tight">Scritur</span>
        </a>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            Sign In
          </a>
          <a
            href="/"
            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg transition-all shadow-sm"
          >
            Get Started
          </a>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-gray-50 border-t border-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xs">K</span>
              </div>
              <span className="font-bold text-sm text-gray-900">Scritur</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-gray-500">
              <a href="/ai-study-tool" className="hover:text-gray-900 transition-colors">AI Study Tool</a>
              <a href="/ai-tutor" className="hover:text-gray-900 transition-colors">AI Tutor</a>
              <a href="/ai-flashcard-generator" className="hover:text-gray-900 transition-colors">Flashcards</a>
              <a href="/ai-quiz-generator" className="hover:text-gray-900 transition-colors">Quizzes</a>
            </nav>
            <p className="text-xs text-gray-400">&copy; 2026 Scritur. Built for people who want to learn deeply.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface SeoHeroProps {
  badge?: string;
  heading: string;
  headingAccent?: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
}

export function SeoHero({ badge, heading, headingAccent, subheading, ctaText, ctaLink }: SeoHeroProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 lg:pt-24 pb-16 lg:pb-20">
      <div className="max-w-3xl">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-sm font-medium text-indigo-700 mb-6">
            <Sparkles size={14} />
            {badge}
          </div>
        )}
        <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-6">
          {heading}
          {headingAccent && (
            <>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                {headingAccent}
              </span>
            </>
          )}
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mb-10">
          {subheading}
        </p>
        <a
          href={ctaLink}
          className="inline-block px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          {ctaText}
        </a>
      </div>
    </section>
  );
}

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface SeoFeaturesProps {
  features: Feature[];
}

export function SeoFeatures({ features }: SeoFeaturesProps) {
  return (
    <section className="bg-gray-50 py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight text-center mb-12">
          Everything You Need to Learn Effectively
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
                <span className="text-indigo-600 text-lg font-bold">{feature.icon[0]}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}

interface SeoHowItWorksProps {
  steps: HowItWorksStep[];
}

export function SeoHowItWorks({ steps }: SeoHowItWorksProps) {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                {s.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface FaqItem {
  question: string;
  answer: string;
}

interface SeoFaqProps {
  items: FaqItem[];
}

export function SeoFaq({ items }: SeoFaqProps) {
  return (
    <section className="bg-gray-50 py-16 lg:py-20">
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.question} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface ComparisonColumn {
  label: string;
  highlight?: boolean;
  rows: string[];
}

interface SeoComparisonProps {
  heading: string;
  subheading: string;
  columns: ComparisonColumn[];
}

export function SeoComparison({ heading, subheading, columns }: SeoComparisonProps) {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight mb-4">{heading}</h2>
          <p className="text-lg text-gray-500">{subheading}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {columns.map((col, colIdx) => (
            <div key={col.label}>
              {colIdx === 0 && (
                <div className={`grid grid-cols-${columns.length} border-b border-gray-100`}>
                  {columns.map((c) => (
                    <div
                      key={c.label}
                      className={`p-4 text-sm font-semibold text-center ${c.highlight ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'}`}
                    >
                      {c.label}
                    </div>
                  ))}
                </div>
              )}
              {colIdx === 0 &&
                col.rows.map((_, rowIdx) => (
                  <div key={rowIdx} className={`grid grid-cols-${columns.length} border-b border-gray-50 last:border-b-0`}>
                    {columns.map((c) => (
                      <div
                        key={c.label}
                        className={`p-4 text-sm text-center ${c.highlight ? 'bg-indigo-50/50 text-indigo-700 font-medium' : 'text-gray-600'}`}
                      >
                        {c.rows[rowIdx]}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface SeoCtaProps {
  heading: string;
  subheading: string;
  buttonText: string;
  buttonLink: string;
}

export function SeoCta({ heading, subheading, buttonText, buttonLink }: SeoCtaProps) {
  return (
    <section className="bg-indigo-600 py-16 lg:py-20">
      <div className="max-w-3xl mx-auto px-6 lg:px-12 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-4">
          {heading}
        </h2>
        <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
          {subheading}
        </p>
        <a
          href={buttonLink}
          className="inline-block px-8 py-3.5 bg-white hover:bg-gray-100 text-indigo-600 font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          {buttonText}
        </a>
      </div>
    </section>
  );
}
