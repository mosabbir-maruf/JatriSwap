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
              Terms <span className="text-primary">&</span> Conditions
            </h1>
            <p className="font-mono text-sm uppercase font-bold tracking-widest text-muted-foreground">
              Last updated: May 16, 2026
            </p>
          </div>
        </div>

        <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 md:p-16">
            <div className="space-y-8">
              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">১. JatriSwap এর ভূমিকা</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  JatriSwap কোনো ট্রেন টিকিট বিক্রয়কারী প্রতিষ্ঠান নয়। আমরা কোনো টিকিট own, issue বা resell করি না। JatriSwap শুধুমাত্র buyer এবং seller এর মধ্যে একটি নিরাপদ মাধ্যম (facilitator) হিসেবে কাজ করে, যাতে অনলাইনে টিকিট কেনাবেচার সময় প্রতারণার ঝুঁকি কমানো যায়।
                </p>
              </section>
              
              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">২. User Generated Listing</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  Website এ প্রকাশিত সকল ticket listing সম্পূর্ণভাবে users দ্বারা প্রদানকৃত। টিকিটের মূল্য, seat, train, journey date এবং অন্যান্য তথ্যের দায়িত্ব সংশ্লিষ্ট seller এর। JatriSwap কোনো ticket এর ownership দাবি করে না।
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">৩. Verification Process</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  প্রতারণা কমানোর উদ্দেশ্যে JatriSwap ticket এর PNR এবং সংশ্লিষ্ট তথ্য যাচাই করার চেষ্টা করে। তবে railway system, ticket status বা পরবর্তী কোনো পরিবর্তনের জন্য JatriSwap দায়ী থাকবে না। Verification মানে শুধুমাত্র প্রদত্ত তথ্য অনুযায়ী ticket টি system এ বিদ্যমান কিনা তা যাচাই করা।
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">৪. Payment Handling</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  Buyer এবং seller এর নিরাপত্তার জন্য payment সাময়িকভাবে JatriSwap এর মাধ্যমে process হতে পারে। এটি শুধুমাত্র নিরাপদ transaction নিশ্চিত করার উদ্দেশ্যে করা হয়। JatriSwap কোনো financial institution বা escrow service নয়।
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">৫. Third Party Transaction</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  টিকিটের প্রকৃত transaction buyer এবং seller এর মধ্যেই সম্পন্ন হয়। JatriSwap কোনো ticket transfer, railway policy violation বা user এর ব্যক্তিগত কার্যকলাপের জন্য দায়ী নয়।
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">৬. Railway Policy Compliance</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  Users নিজ দায়িত্বে বাংলাদেশ রেলওয়ের সকল নীতিমালা মেনে চলবেন। কোনো ticket ব্যবহার, transfer বা cancellation সংক্রান্ত policy violation এর দায় সম্পূর্ণ user এর।
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">৭. Fraud & Misuse</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  কোনো ভুয়া তথ্য প্রদান, scam, fake payment, stolen account ব্যবহার বা প্রতারণামূলক কার্যকলাপ শনাক্ত হলে JatriSwap সংশ্লিষ্ট account suspend বা ban করার অধিকার সংরক্ষণ করে। প্রয়োজনে আইনশৃঙ্খলা বাহিনীর সাথে তথ্য শেয়ার করা হতে পারে।
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">৮. Limitation of Liability</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  JatriSwap কোনো যাত্রা বাতিল, train delay, railway server issue, ticket cancellation, user dispute বা indirect loss এর জন্য দায়ী থাকবে না। Users নিজেদের ঝুঁকিতে platform ব্যবহার করবেন।
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">৯. Terms পরিবর্তনের অধিকার</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  JatriSwap যেকোনো সময় পূর্ব নোটিশ ছাড়া এই Terms & Conditions পরিবর্তন, সংযোজন বা সংশোধন করার অধিকার সংরক্ষণ করে।
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-black uppercase tracking-tighter mb-4 text-foreground">১০. Contact</h2>
                <p className="font-sans text-base leading-relaxed font-bold text-muted-foreground">
                  যেকোনো প্রশ্ন বা অভিযোগের জন্য আমাদের official platform এর মাধ্যমে যোগাযোগ করুন।
                </p>
              </section>
            </div>
        </div>
      </div>
    </div>
  );
}
