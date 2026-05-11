import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="page-shell">
        <Button variant="ghost" render={<Link to="/" />} className="mb-8 h-12 rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase tracking-widest font-bold hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>

        <div className="mb-12 border-b-4 border-foreground pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter text-foreground mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
              Terms of <span className="text-primary">Service</span>
            </h1>
            <p className="font-mono text-sm uppercase font-bold tracking-widest text-muted-foreground">
              Last updated: October 24, 2023
            </p>
          </div>
        </div>

        <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 md:p-16">
            <div className="space-y-8">
              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">1. Acceptance of Terms</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  By accessing or using JatriSwap, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service. These terms apply to all visitors, users, and others who access or use the application.
                </p>
              </section>
              
              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">2. Description of Service</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground mb-4">
                  JatriSwap provides an online platform for users to list, buy, and sell train tickets. We act solely as a marketplace and are not a party to any transaction between buyers and sellers.
                </p>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  You understand and agree that the Platform is provided "AS-IS" and that JatriSwap assumes no responsibility for the timeliness, deletion, mis-delivery or failure to store any user communications or personalization settings.
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">3. User Obligations</h2>
                <div className="bg-muted p-6 border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <ul className="list-disc list-inside space-y-2 font-mono text-sm font-bold text-foreground">
                    <li>You must be at least 18 years old to use the Service.</li>
                    <li>You must provide accurate and complete registration information.</li>
                    <li>You are responsible for maintaining the confidentiality of your account.</li>
                    <li>You agree not to sell tickets above the original purchase price.</li>
                    <li>You agree to comply with all local railway laws and regulations.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">4. Ticket Authenticity</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  Selling fraudulent, modified, or otherwise invalid tickets is strictly prohibited and will result in immediate account termination. JatriSwap reserves the right to hold escrow funds if a dispute regarding authenticity arises.
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">5. Fees and Payments</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  Currently, our platform charges a 0% fee on transactions. All payments are processed securely through our verified escrow partners. JatriSwap holds the funds until the buyer successfully utilizes the ticket or confirms its transfer.
                </p>
              </section>
            </div>
        </div>
      </div>
    </div>
  );
}
