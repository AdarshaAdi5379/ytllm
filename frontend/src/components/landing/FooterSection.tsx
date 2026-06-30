import { Github, Linkedin, Twitter } from 'lucide-react';

interface FooterLinkProps {
  label: string;
  href: string;
  badge?: string;
  isActive?: boolean;
}

function FooterLink({ label, href, badge }: FooterLinkProps) {
  const classes = badge
    ? 'text-gray-400 cursor-default'
    : 'text-gray-500 hover:text-gray-900 transition-colors duration-200 cursor-pointer';

  return (
    <li>
      <a
        href={badge ? undefined : href}
        className={`text-sm ${classes} focus-visible:outline-none focus-visible:text-gray-900`}
        aria-disabled={!!badge}
        tabIndex={badge ? -1 : 0}
      >
        {label}
        {badge && (
          <span className="ml-1.5 text-[10px] text-gray-300 font-medium">{badge}</span>
        )}
      </a>
    </li>
  );
}

const productLinks = [
  { label: 'Home', href: '#' },
  { label: 'Documentation', href: '#' },
  { label: 'Changelog', href: '#', badge: 'Coming Soon' },
  { label: 'Roadmap', href: '#', badge: 'Coming Soon' },
];

const resourceLinks = [
  { label: 'GitHub Repository', href: '#' },
  { label: 'Report an Issue', href: '#' },
  { label: 'Contact', href: '#' },
  { label: 'Early Access', href: '#' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy', href: '#' },
  { label: 'Delete Account', href: '#' },
];

const socialLinks = [
  { icon: Github, label: 'GitHub', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Twitter, label: 'X (Twitter)', href: '#' },
];

export function FooterSection() {
  return (
    <footer className="bg-white border-t border-gray-100 py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1 — Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xs">K</span>
              </div>
              <span className="font-bold text-sm text-gray-900">KnowledgeOS</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-xs">
              An AI powered learning workspace that helps you understand, practice, and remember everything you learn.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200 focus-visible:outline-none focus-visible:text-gray-600"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Column 2 — Product */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>

          {/* Column 3 — Resources */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>

          {/* Column 4 — Legal */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400 text-center sm:text-left">
            &copy; 2026 KnowledgeOS. Built for people who want to learn deeply.
          </p>
          <p className="text-xs text-gray-400 font-mono">v0.1.0</p>
        </div>
      </div>
    </footer>
  );
}
