import { motion } from "motion/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "What is JatriSwap?",
    answer: "JatriSwap is a secure, peer-to-peer marketplace designed to help travelers buy and sell train tickets. We use verification systems and escrow payments to ensure both buyers and sellers are protected."
  },
  {
    question: "How does the verification process work?",
    answer: "When a seller lists a ticket, they must upload proof of purchase or the ticket itself. Our system and moderation team review the submission to verify its authenticity before making the listing public. Sensitive PII is hidden."
  },
  {
    question: "What are the fees for buying or selling?",
    answer: "JatriSwap charges a small flat service fee of 5% on completed transactions to cover our secure escrow payment processing and operational costs. There are no fees to simply list a ticket."
  },
  {
    question: "How do Escrow Payments protect me?",
    answer: "When you purchase a ticket, your money is held securely in an escrow account. The seller does not receive the funds until you have successfully used the ticket or confirmed its validity, ensuring you get exactly what you paid for."
  },
  {
    question: "Can I get a refund?",
    answer: "If a ticket is found to be invalid or fraudulent, you are fully protected by our Escrow system and will receive a full refund. Standard cancellations depend on the seller's specified policy."
  },
  {
    question: "How do I receive my ticket after purchasing?",
    answer: "Once your payment is secured in escrow, the seller will transfer the digital ticket to you or provide the necessary PNR details. You can view all your purchased tickets in your Dashboard."
  }
];

const FAQ = () => {
  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="page-shell-md relative z-10">
        
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center md:items-end justify-between gap-6 border-b-4 border-foreground pb-8">
           <div>
             <h1 className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter text-foreground mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
               Help <span className="text-primary">&</span> FAQ
             </h1>
             <p className="font-mono text-sm uppercase font-bold tracking-widest text-muted-foreground">
               Everything you need to know about JatriSwap.
             </p>
           </div>
           <HelpCircle className="w-16 h-16 text-foreground hidden md:block" strokeWidth={1.5} />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-background border-4 border-foreground p-6 md:p-10 shadow-[12px_12px_0_0_rgba(0,0,0,1)] lg:shadow-[16px_16px_0_0_rgba(0,0,0,1)]"
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
