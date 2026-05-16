import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="page-shell">
        <Button variant="ghost" render={<Link to="/" />} className="mb-8 h-12 rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase tracking-widest font-bold hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>

        <div className="mb-12 border-b-4 border-foreground pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter text-foreground mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
              Privacy <span className="text-primary">Policy</span>
            </h1>
            <p className="font-mono text-sm uppercase font-bold tracking-widest text-muted-foreground">
              Last updated: October 24, 2023
            </p>
          </div>
        </div>

        <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 md:p-16">
            <div className="space-y-8">
              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">1. Information We Collect</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground mb-4">
                  We collect information to provide better services to all our users. When you sign up for JatriSwap, we collect personal information you give us such as your name, email address, physical address, and telephone number.
                </p>
                <div className="bg-muted p-6 border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <h3 className="font-heading text-lg font-black uppercase tracking-tighter mb-2">We also collect:</h3>
                  <ul className="list-disc list-inside space-y-2 font-mono text-sm font-bold text-foreground">
                    <li>Log information</li>
                    <li>Device information.</li>
                    <li>Location information.</li>
                    <li>Ticket transaction details.</li>
                  </ul>
                </div>
              </section>
              
              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">2. How We Use Information</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  We use the information we collect from all our services to provide, maintain, protect and improve them, to develop new ones, and to protect JatriSwap and our users. We also use this information to offer you tailored content – like giving you more relevant search results.
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">3. Information We Share</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground mb-4">
                  We do not share personal information with companies, organizations and individuals outside of JatriSwap unless one of the following circumstances applies:
                </p>
                <ul className="list-disc list-inside space-y-2 font-sans font-bold text-muted-foreground mb-4">
                  <li><strong>With your consent:</strong> We will share personal information with companies, organizations or individuals outside of JatriSwap when we have your consent to do so.</li>
                  <li><strong>For legal reasons:</strong> We will share personal information if we have a good-faith belief that access, use, preservation or disclosure of the information is reasonably necessary.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">4. Information Security</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  We work hard to protect JatriSwap and our users from unauthorized access to or unauthorized alteration, disclosure or destruction of information we hold. We use secure escrow payments and encrypt many of our services using SSL.
                </p>
              </section>
            </div>
        </div>
      </div>
    </div>
  );
}
