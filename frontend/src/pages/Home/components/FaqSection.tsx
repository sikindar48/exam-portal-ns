import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    question: "Can I import students using CSV or Excel?",
    answer: "Yes, you can register and onboard candidates in bulk by uploading simple CSV or Excel sheets directly through the Student Management panel.",
  },
  {
    question: "Can I import questions in bulk?",
    answer: "Absolutely. The platform supports importing questions in bulk using CSV and Excel templates, allowing you to quickly seed folders and reference them in multiple tests.",
  },
  {
    question: "Can candidates take exams as guests?",
    answer: "Yes. You can enable guest mode and generate secure public links, allowing candidates to take exams instantly without having predefined user accounts.",
  },
  {
    question: "Does the platform support camera proctoring?",
    answer: "Yes. Our camera proctoring tracks faces to log violations (like face missing or multiple faces in the frame) in real time with snapshot evidence.",
  },
  {
    question: "Can I customize the portal with my organization's name and logo?",
    answer: "Yes. Custom branding features allow you to upload your own organization logo and customize the brand name across the student workspace and dashboards.",
  },
  {
    question: "Do you offer Pay Per Test plans?",
    answer: "Yes. Pay Per Test plans are perfect for organizations running one-off assessments, placement drives, or recruitment campaigns, without long-term commitments.",
  },
  {
    question: "Is there a Free Plan?",
    answer: "Yes, our generous Free Plan is free forever and includes up to 3 exams per month, 50 questions per exam, and 20 candidates per exam.",
  },
  {
    question: "What happens if a candidate loses internet connectivity during an exam?",
    answer: "Our system automatically buffers answers locally in the candidate's browser. If connection drops, they can continue writing, and the system syncs progress to our servers once connectivity is restored.",
  },
];

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 px-4 md:px-8 border-b border-slate-205 dark:border-slate-900 bg-slate-100/30 dark:bg-slate-900/10 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" } as React.CSSProperties}>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full select-none cursor-default">
            FAQ
          </Badge>
          <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-650 dark:text-slate-400 text-xs font-semibold">
            Everything you need to know about the portal and plans.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`border rounded-xl bg-white dark:bg-slate-900/40 transition-all duration-300 ${
                  isOpen 
                    ? "border-blue-500 shadow-md dark:shadow-blue-900/5 ring-1 ring-blue-500/20" 
                    : "border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-black uppercase tracking-wide text-slate-800 dark:text-white text-xs hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span className="leading-snug">{faq.question}</span>
                  <span className={`ml-4 p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-955" : ""}`}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-slate-650 dark:text-slate-400 text-xs border-t border-slate-100 dark:border-slate-900/60 pt-3.5 leading-relaxed font-medium animate-in fade-in duration-300">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
