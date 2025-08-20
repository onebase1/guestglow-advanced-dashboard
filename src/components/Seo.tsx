import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  jsonLd?: Record<string, any>;
}

export const Seo: React.FC<SeoProps> = ({ title, description, canonicalPath, jsonLd }) => {
  useEffect(() => {
    // Title
    if (title) document.title = title;

    // Meta description
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }

    // Canonical
    const canonicalHref = `${window.location.origin}${canonicalPath ?? window.location.pathname}`;
    let linkEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.setAttribute('rel', 'canonical');
      document.head.appendChild(linkEl);
    }
    linkEl.setAttribute('href', canonicalHref);

    // JSON-LD structured data
    const scriptId = 'seo-jsonld';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    if (jsonLd) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, canonicalPath, jsonLd]);

  return null;
};

export default Seo;
