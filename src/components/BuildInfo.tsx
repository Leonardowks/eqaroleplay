const BUILD_DATE = new Date().toISOString().split('T')[0];
const BUILD_VERSION = '3.1.0';

const BuildInfo = () => (
  <footer className="w-full border-t border-border/40 py-3 px-4 text-center text-xs text-muted-foreground/60">
    <span>EQA Roleplay v{BUILD_VERSION} • Build {BUILD_DATE} • Multi-tenant Edition</span>
  </footer>
);

export default BuildInfo;
