import {
  SeoPageLayout,
  SeoHero,
  SeoFeatures,
  SeoHowItWorks,
  SeoFaq,
  SeoCta,
} from './SeoPageLayout';
import type { SeoPageContent } from './seo-content';

interface SeoPageProps {
  content: SeoPageContent;
}

export function SeoPage({ content }: SeoPageProps) {
  const { meta, hero, features, howItWorks, faq, cta, relatedPages, structuredData } = content;

  return (
    <SeoPageLayout>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={meta.canonical} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.canonical} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />

      {structuredData?.map((sd, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }} />
      ))}

      <SeoHero
        badge={hero.badge}
        heading={hero.heading}
        headingAccent={hero.headingAccent}
        subheading={hero.subheading}
        ctaText={hero.ctaText}
        ctaLink={hero.ctaLink}
      />
      <SeoFeatures features={features} />
      {howItWorks && <SeoHowItWorks steps={howItWorks} />}
      {faq && <SeoFaq items={faq} />}
      {relatedPages && relatedPages.length > 0 && (
        <section className="bg-white py-16 lg:py-20">
          <div className="max-w-5xl mx-auto px-6 lg:px-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight text-center mb-12">
              Explore More Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPages.map((page) => (
                <a
                  key={page.href}
                  href={page.href}
                  className="group block bg-gray-50 border border-gray-100 rounded-xl p-6 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                >
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
                    {page.label}
                  </h3>
                  <span className="text-sm text-indigo-600 font-medium">Learn more &rarr;</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
      {cta && (
        <SeoCta
          heading={cta.heading}
          subheading={cta.subheading}
          buttonText={cta.buttonText}
          buttonLink={cta.buttonLink}
        />
      )}
    </SeoPageLayout>
  );
}
