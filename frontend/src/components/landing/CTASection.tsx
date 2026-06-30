import { useEffect, useRef, useState } from 'react';

interface CTASectionProps {
  onStartLearning: () => void;
}

const dotGridStyle = {
  backgroundImage: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

export function CTASection({ onStartLearning }: CTASectionProps) {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`bg-white py-28 lg:py-36 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <div
          className="rounded-3xl bg-gray-50 border border-gray-100 shadow-sm p-10 lg:p-16 text-center"
          style={dotGridStyle}
        >
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.15] tracking-tight">
            Stop Chatting With Content.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Start Building Knowledge That Lasts.
            </span>
          </h2>

          <p className="text-lg text-gray-500 max-w-xl mx-auto mt-6 leading-relaxed">
            KnowledgeOS helps you organize everything you learn into one intelligent workspace
            where you can understand complex topics, practice consistently, and remember what matters.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <button
              onClick={onStartLearning}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Start Learning Free
            </button>
            <button
              onClick={() => document.getElementById('product-showcase')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-3.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold text-base rounded-xl hover:shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              Explore Workspace
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-8">
            No credit card required · Early access available · Set up in under a minute
          </p>
        </div>
      </div>
    </section>
  );
}
