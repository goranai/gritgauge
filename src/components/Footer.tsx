import Link from "next/link";
import { Github, Heart, Terminal } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-surface-800 bg-surface-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-5 h-5 text-brand-400" />
              <span className="font-bold text-white">GritGauge</span>
            </div>
            <p className="text-surface-400 text-sm leading-relaxed">
              AI-powered co-pilot for open-source maintainers. Automate the
              grind, focus on what matters.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-3">Links</h4>
            <ul className="space-y-2 text-sm text-surface-400">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contributing
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold text-white mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-surface-400">
              <li>
                <a
                  href="https://github.com/goranai/gritgauge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://github.com/goranai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Heart className="w-4 h-4" />
                  Follow @goranai
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-surface-800 text-center text-surface-500 text-sm">
          <p>
            Built with ❤️ for the open-source community. MIT Licensed.
            &copy; {new Date().getFullYear()} GritGauge.
          </p>
        </div>
      </div>
    </footer>
  );
}
