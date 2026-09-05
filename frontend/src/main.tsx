import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root')!;

// Prerendered static pages already have rendered HTML in #root.
// Skip SPA hydration to avoid overwriting the prerendered content.
if (rootEl.children.length > 0) {
  // no-op — static HTML is the final output
} else {
  const prerenderRoute = (window as unknown as Record<string, unknown>).__PRERENDER_ROUTE__ as string | undefined;

  if (prerenderRoute) {
    // Build-time prerender: the server injected __PRERENDER_ROUTE__ before React loaded.
    // Render only the requested SEO page component, not the full SPA.
    const seoPages: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
      'ai-study-tool': React.lazy(() => import('./seo/pages/ai-study-tool')),
      'ai-tutor': React.lazy(() => import('./seo/pages/ai-tutor')),
      'ai-flashcard-generator': React.lazy(() => import('./seo/pages/ai-flashcard-generator')),
      'ai-quiz-generator': React.lazy(() => import('./seo/pages/ai-quiz-generator')),
    };
    const SeoPage = seoPages[prerenderRoute];
    if (SeoPage) {
      ReactDOM.createRoot(rootEl).render(
        <React.Suspense fallback={null}>
          <SeoPage />
        </React.Suspense>
      );
    }
  } else {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 2,
          staleTime: 1000 * 60 * 5,
        },
      },
    });

    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '8px',
                background: '#1a1a1a',
                color: '#fff',
                fontSize: '14px',
              },
            }}
          />
          <Analytics />
        </QueryClientProvider>
      </React.StrictMode>
    );
  }
}
