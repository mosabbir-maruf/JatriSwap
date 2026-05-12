import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CookiePolicy() {
  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="page-shell">
        <Button variant="ghost" render={<Link to="/" />} className="mb-8 h-12 rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase tracking-widest font-bold hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>

        <div className="mb-12 border-b-4 border-foreground pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex items-start gap-4">
            <Cookie className="w-10 h-10 md:w-14 md:h-14 text-primary shrink-0 mt-1" aria-hidden />
            <div>
              <h1 className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter text-foreground mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                Cookie <span className="text-primary">Policy</span>
              </h1>
              <p className="font-mono text-sm uppercase font-bold tracking-widest text-muted-foreground">
                Last updated: October 24, 2023
              </p>
            </div>
          </div>
        </div>

        <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 md:p-16">
            <div className="space-y-8">
              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">1. What are cookies?</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
                </p>
              </section>
              
              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">2. How we use cookies</h2>
                <div className="bg-muted p-6 border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-foreground">
                  <p className="font-sans text-base leading-relaxed font-bold mb-4">
                    Our platform uses cookies for several reasons:
                  </p>
                  <ul className="list-disc list-inside space-y-2 font-mono text-sm font-bold">
                    <li><strong>Essential Cookies:</strong> Required to enable core site functionality such as secure user login and escrow payments.</li>
                    <li><strong>Functional Cookies:</strong> Allowing us to analyze site usage so we can measure and improve performance.</li>
                    <li><strong>Personalization Cookies:</strong> Used by advertising companies to serve ads that are relevant to your interests.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">3. Managing cookies</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground mb-4">
                  You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. If you disable or refuse cookies, please note that some parts of this website may become inaccessible or not function properly.
                </p>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  For more information about how to manage cookies on your device, please visit the help pages of your respective browser.
                </p>
              </section>
            </div>
        </div>
      </div>
    </div>
  );
}
