import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Mail, MessageCircle, MessageSquare, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPublicSupportPhone,
  getPublicWhatsAppLink,
  supportPhoneTelHref,
} from "@/src/lib/env/publicContact";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const channelIconClass = "bg-background border-2 border-foreground p-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] shrink-0";

function ContactChannelRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={channelIconClass}>{icon}</div>
      <div>
        <p className="font-mono text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">{title}</p>
        {children}
      </div>
    </div>
  );
}

const contactLinkClass =
  "font-sans font-bold text-foreground underline-offset-4 hover:underline";

const Contact = () => {
  const supportPhone = getPublicSupportPhone();
  const whatsapp = getPublicWhatsAppLink();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Directly submit since there's no real API
    setIsSubmitting(false);
    setIsSuccess(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="page-shell">
        <Button
          variant="ghost"
          render={<Link to="/" />}
          className="mb-8 h-12 rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase tracking-widest font-bold hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
          Back to Home
        </Button>

        <div className="mb-12 border-b-4 border-foreground pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
           <div>
             <h1 className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter text-foreground mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">Contact <span className="text-primary">Us</span></h1>
             <p className="font-mono text-sm uppercase font-bold tracking-widest text-muted-foreground">We're here to help with your ticket exchange.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
           
           {/* Contact Info */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
             className="lg:col-span-1 space-y-8"
           >
              <div className="bg-muted border-4 border-foreground p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                 <h3 className="font-heading text-2xl font-black uppercase tracking-tighter mb-8">Get in Touch</h3>
                 
                 <div className="space-y-6">
                    <ContactChannelRow icon={<Mail className="w-5 h-5 text-foreground" />} title="Email">
                      <p className="font-sans font-bold text-foreground">support@railswap.com</p>
                    </ContactChannelRow>

                    {supportPhone ? (
                      <ContactChannelRow icon={<Phone className="w-5 h-5 text-foreground" />} title="Phone">
                        <a href={supportPhoneTelHref(supportPhone)} className={contactLinkClass}>
                          {supportPhone}
                        </a>
                      </ContactChannelRow>
                    ) : null}

                    {whatsapp ? (
                      <ContactChannelRow icon={<MessageCircle className="w-5 h-5 text-emerald-600" />} title="WhatsApp">
                        <a
                          href={whatsapp.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={contactLinkClass}
                        >
                          {whatsapp.label}
                        </a>
                      </ContactChannelRow>
                    ) : null}

                    <ContactChannelRow icon={<MessageSquare className="w-5 h-5 text-foreground" />} title="Live Chat">
                      <p className="font-sans font-bold text-foreground">Available 24/7</p>
                    </ContactChannelRow>
                 </div>
              </div>

              <div className="bg-primary text-primary-foreground border-4 border-foreground p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                 <h3 className="font-heading text-xl font-black uppercase tracking-tighter mb-4">FAQ</h3>
                 <p className="font-mono text-xs font-bold leading-relaxed mb-6">Find quick answers to common questions about buying, selling, and verifications.</p>
                 <Button variant="outline" className="w-full h-12 rounded-none font-mono text-xs uppercase tracking-widest font-black border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-background text-foreground">
                    Visit Help Center
                 </Button>
              </div>
           </motion.div>

           {/* Contact Form */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="lg:col-span-2"
           >
              <div className="bg-background border-4 border-foreground p-8 md:p-12 shadow-[16px_16px_0_0_rgba(0,0,0,1)]">
                 <h2 className="font-heading text-3xl font-black uppercase tracking-tighter mb-8">Send a Message</h2>
                 
                 {isSuccess ? (
                    <div className="bg-emerald-100 border-2 border-emerald-900 p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-500 rounded-full mx-auto flex items-center justify-center border-4 border-emerald-900 mb-4">
                        <Send className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-heading text-2xl font-black uppercase tracking-tighter text-emerald-950">Message Sent!</h3>
                      <p className="font-mono text-sm tracking-wide text-emerald-900 font-bold">We'll get back to you within 24 hours.</p>
                      <Button onClick={() => setIsSuccess(false)} variant="outline" className="mt-8 rounded-none border-2 border-emerald-900 shadow-[4px_4px_0_0_rgba(6,78,59,1)] text-emerald-950 hover:bg-emerald-200">
                        Send Another Message
                      </Button>
                    </div>
                 ) : (
                   <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-3">
                           <Label htmlFor="name" className="font-mono text-xs uppercase tracking-widest font-black">Full Name</Label>
                           <Input 
                             id="name" 
                             required
                             value={formData.name}
                             onChange={(e) => setFormData({...formData, name: e.target.value})}
                             placeholder="John Doe" 
                             className="rounded-none h-14 border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-primary px-4 bg-muted/30"
                           />
                         </div>
                         <div className="space-y-3">
                           <Label htmlFor="email" className="font-mono text-xs uppercase tracking-widest font-black">Email Address</Label>
                           <Input 
                             id="email" 
                             type="email"
                             required
                             value={formData.email}
                             onChange={(e) => setFormData({...formData, email: e.target.value})}
                             placeholder="john@example.com" 
                             className="rounded-none h-14 border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-primary px-4 bg-muted/30"
                           />
                         </div>
                      </div>

                      <div className="space-y-3">
                         <Label htmlFor="subject" className="font-mono text-xs uppercase tracking-widest font-black">Subject</Label>
                         <Input 
                           id="subject" 
                           required
                           value={formData.subject}
                           onChange={(e) => setFormData({...formData, subject: e.target.value})}
                           placeholder="How can we help?" 
                           className="rounded-none h-14 border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-primary px-4 bg-muted/30"
                         />
                      </div>

                      <div className="space-y-3">
                         <Label htmlFor="message" className="font-mono text-xs uppercase tracking-widest font-black">Message</Label>
                         <Textarea 
                           id="message" 
                           required
                           value={formData.message}
                           onChange={(e) => setFormData({...formData, message: e.target.value})}
                           placeholder="Provide details about your inquiry..." 
                           className="rounded-none min-h-[200px] border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-primary p-4 bg-muted/30 font-sans resize-none"
                         />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full h-16 rounded-none font-mono text-sm uppercase tracking-widest font-black bg-foreground text-background shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all disabled:opacity-70"
                      >
                         {isSubmitting ? "Sending..." : "Send Message"}
                      </Button>
                   </form>
                 )}
              </div>
           </motion.div>
        </div>

      </div>
    </div>
  );
};

export default Contact;
