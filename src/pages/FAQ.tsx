import { useEffect } from "react";
import { motion } from "motion/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "১. JatriSwap কী?",
    answer: "JatriSwap হলো একটি নিরাপদ প্ল্যাটফর্ম যেখানে মানুষ ট্রেনের টিকিট নিরাপদভাবে কিনতে ও বিক্রি করতে পারে — প্রতারণার ঝুঁকি ছাড়াই।"
  },
  {
    question: "২. JatriSwap কীভাবে কাজ করে?",
    answer: "যিনি টিকিট বিক্রি করবেন তিনি প্রথমে আমাদের কাছে টিকিট জমা দিবেন। আর যিনি কিনবেন তিনি আমাদের কাছে payment করবেন। এরপর আমরা: Railway website থেকে PNR দিয়ে টিকিট verify করি, টিকিটটি original কিনা নিশ্চিত হই, Buyer কে verified ticket প্রদান করি, Seller এর তথ্য buyer এর সাথে শেয়ার করি, তারপর seller কে payment release করি।"
  },
  {
    question: "৩. এখানে প্রতারণার সুযোগ কেন কম?",
    answer: "কারণ buyer এবং seller কেউই সরাসরি একে অপরকে payment বা ticket দেয় না। JatriSwap মাঝখানে trusted mediator হিসেবে কাজ করে এবং verification ছাড়া কোনো transaction সম্পন্ন করে না।"
  },
  {
    question: "৪. টিকিট original কিনা কীভাবে বুঝবেন?",
    answer: "আমরা বাংলাদেশ রেলওয়ের official system থেকে PNR নম্বর দিয়ে টিকিট যাচাই করি। Verification ছাড়া কোনো টিকিট buyer এর কাছে দেওয়া হয় না।"
  },
  {
    question: "৫. Buyer কি seller এর তথ্য দেখতে পারবেন?",
    answer: "হ্যাঁ। Transaction complete হওয়ার সময় buyer কে seller এর প্রয়োজনীয় তথ্য প্রদান করা হবে।"
  },
  {
    question: "৬. Seller কবে payment পাবেন?",
    answer: "Buyer successfully verified ticket পাওয়ার পর seller এর payment release করা হবে।"
  },
  {
    question: "৭. JatriSwap কি বাংলাদেশ রেলওয়ের অফিসিয়াল website?",
    answer: "না। JatriSwap কোনো সরকারি website নয়। এটি একটি নিরাপদ মাধ্যম যা মানুষকে প্রতারণামুক্তভাবে ট্রেন টিকিট কেনাবেচা করতে সাহায্য করে।"
  },
  {
    question: "৮. কেন JatriSwap ব্যবহার করবেন?",
    answer: "প্রতারণামুক্ত transaction, Ticket verification system, Secure payment handling, Trusted middleman service, Buyer & seller দুজনেরই নিরাপত্তা।"
  },
  {
    question: "৯. আমি কীভাবে টিকিট sell করতে পারি?",
    answer: "Website এ গিয়ে ticket details submit করুন। আমাদের team verification process শুরু করবে এবং buyer পাওয়া গেলে আপনাকে notify করা হবে।"
  },
  {
    question: "১০. JatriSwap ব্যবহার করতে কোনো অতিরিক্ত charge লাগে?",
    answer: "বর্তমান charge বা service fee website এ উল্লেখ করা থাকবে। Transaction এর আগে সব তথ্য পরিষ্কারভাবে জানিয়ে দেওয়া হবে।"
  }
];

const FAQ_JSON_LD_ID = "jatriswap-faq-jsonld";

const FAQ = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = FAQ_JSON_LD_ID;
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById(FAQ_JSON_LD_ID)?.remove();
    };
  }, []);

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="page-shell-md relative z-10">
        
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center md:items-end justify-between gap-6 border-b-4 border-foreground pb-8">
           <div>
              <h1 className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter text-foreground mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                Help <span className="text-primary">&</span> FAQ
              </h1>
              <p className="font-mono text-sm uppercase font-bold tracking-widest text-muted-foreground">
                Last updated: May 16, 2026
              </p>
           </div>
           <HelpCircle className="w-16 h-16 text-foreground hidden md:block" strokeWidth={1.5} />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-background border-4 border-foreground p-6 md:p-10 shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:shadow-[12px_12px_0_0_rgba(0,0,0,1)] lg:shadow-[16px_16px_0_0_rgba(0,0,0,1)]"
        >
           <Accordion type="single" collapsible className="w-full space-y-4">
             {faqs.map((faq, index) => (
               <AccordionItem key={index} value={`item-${index}`} className="border-2 border-foreground bg-muted/40 data-[state=open]:bg-primary/5 px-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                 <AccordionTrigger className="hover:no-underline font-heading font-black text-xl md:text-xl uppercase tracking-tighter text-left">
                   {faq.question}
                 </AccordionTrigger>
                 <AccordionContent className="font-mono text-sm md:text-sm font-bold leading-relaxed text-muted-foreground pb-6">
                   {faq.answer}
                 </AccordionContent>
               </AccordionItem>
             ))}
           </Accordion>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: 0.2 }}
           className="mt-16 bg-primary text-primary-foreground border-4 border-foreground p-8 md:p-12 shadow-[8px_8px_0_0_rgba(0,0,0,1)] text-center flex flex-col items-center"
        >
            <h3 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4">Still have questions?</h3>
            <p className="font-mono text-sm uppercase font-bold tracking-widest mb-8 max-w-lg">
              Our support team is available 24/7 to help you with any issues or concerns.
            </p>
            <Button render={<Link to="/contact" />} size="lg" className="h-16 px-10 rounded-none font-mono text-sm uppercase tracking-widest font-black bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
               Contact Support <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
        </motion.div>

      </div>
    </div>
  );
};

export default FAQ;
