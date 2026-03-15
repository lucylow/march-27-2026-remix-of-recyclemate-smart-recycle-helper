const Footer = () => {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-xs">R</span>
          </div>
          <span className="font-semibold tracking-tight">RecycleMate</span>
        </div>
        <p className="font-mono text-xs text-muted-foreground tracking-wider">
          UN SDG 12 — RESPONSIBLE CONSUMPTION & PRODUCTION
        </p>
        <p className="text-sm text-muted-foreground">
          © 2026 RecycleMate
        </p>
      </div>
    </footer>
  );
};

export default Footer;
