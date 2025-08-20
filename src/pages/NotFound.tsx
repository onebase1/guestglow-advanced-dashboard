import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-accent/5">
      <div className="text-center space-y-8 p-8">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/c2a80098-fa71-470e-9d1e-eec01217f25a.png" 
            alt="GuestGlow Logo" 
            className="h-24 w-auto brightness-110 contrast-125"
          />
        </div>
        <div className="space-y-4">
          <h1 className="text-6xl font-light text-primary">404</h1>
          <p className="text-xl text-muted-foreground">Page not found</p>
        </div>
        <a 
          href="/" 
          className="inline-flex items-center px-6 py-3 text-primary hover:text-primary/80 border border-primary/20 rounded-full hover:bg-primary/5 transition-all duration-300"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
