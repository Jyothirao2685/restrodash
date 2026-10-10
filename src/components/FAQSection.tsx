'use client';

import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What happens if our restaurant internet connection drops during rush hour?',
    answer:
      'Nothing stops. RestroDash runs an authoritative SQLite database engine directly on your local counter hardware (Port 3001). Cashier terminals, tableside waitstaff phones, KDS screens, and thermal receipt printers communicate over your local WiFi router without needing external WAN connectivity. When internet returns, data automatically syncs with your dedicated cloud backup.',
  },
  {
    question: 'How does Host-Peer QR table ordering prevent accidental or rogue orders?',
    answer:
      'The first diner scanning the table QR code is registered as the Table Master (Host). The system generates a clean 4-digit session code. Any dining companion scanning the same table can enter this 4-digit PIN to join the shared cart and propose items. However, checkout authority remains exclusively with the Host, ensuring zero rogue orders.',
  },
  {
    question: 'Is our restaurant data isolated from other businesses?',
    answer:
      'Yes. Unlike multi-tenant SaaS systems where thousands of restaurants share a single database table, RestroDash provisions an isolated, dedicated VPS instance with its own SQLite database and custom domain for every restaurant brand. Your sales figures, customer records, and menu data are completely private.',
  },
  {
    question: 'What POS hardware and thermal printers are compatible?',
    answer:
      'RestroDash supports all standard ESC/POS thermal printers (both 58mm and 80mm paper widths) connected via USB, Ethernet/LAN, or Serial. It runs on Windows, macOS, Linux, and Android/iOS tablet browsers. Our raw byte driver ensures crisp alignment tested against strict golden column oracles.',
  },
  {
    question: 'What is included in the ₹35,000 / month flat subscription?',
    answer:
      'The ₹35,000 / month subscription includes your dedicated cloud VPS instance, unlimited local POS terminals, unlimited QR scans, multi-station Kitchen Display System (KDS), automated daily encrypted cloud backups, and 24/7 dedicated engineering support. We charge 0% commission on orders.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-[#ffffff] border-b border-[#dddddd]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
            Frequently Asked Questions
          </span>
          <h2 className="text-[32px] sm:text-[36px] font-normal text-[#181d26] leading-[1.2] mb-4">
            Everything you need to know about RestroDash.
          </h2>
          <p className="text-[16px] text-[#333840]">
            Clear answers on offline reliability, QR ordering protocol, hardware, and pricing.
          </p>
        </div>

        <div className="divide-y divide-[#dddddd] border-t border-b border-[#dddddd]">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="py-6">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between text-left text-[16px] sm:text-[18px] font-normal text-[#181d26] hover:text-[#000000] focus:outline-hidden"
                >
                  <span className="pr-4">{faq.question}</span>
                  <span className="text-[20px] font-light text-[#41454d] flex-shrink-0">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-4 text-[14px] sm:text-[15px] text-[#333840] leading-relaxed pr-6">
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
