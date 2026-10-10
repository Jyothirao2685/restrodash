'use client';

import React, { useState } from 'react';

interface HeroProps {
  onOpenGetStarted: () => void;
}

export function Hero({ onOpenGetStarted }: HeroProps) {
  const [activeTab, setActiveTab] = useState<'pos' | 'qr' | 'kds'>('pos');

  return (
    <section className="bg-[#ffffff] pt-16 pb-24 border-b border-[#dddddd]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Editorial Headline & Subtitle */}
        <div className="max-w-3xl mb-10">
          <h1 className="text-[38px] sm:text-[44px] lg:text-[48px] font-normal text-[#181d26] leading-[1.15] tracking-[-0.02em] mb-6">
            The offline-first operating system for high-volume restaurants.
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#333840] leading-[1.5] max-w-2xl">
            Run instant tableside billing, collaborative QR ordering, kitchen display screens, and thermal receipt printing on local counter hardware — with guaranteed zero-downtime continuity.
          </p>
        </div>

        {/* Signature Button Pair */}
        <div className="flex flex-wrap items-center gap-4 mb-16">
          <button onClick={onOpenGetStarted} className="btn-primary">
            Start with RestroDash
          </button>
          <a href="#qr-dining" className="btn-secondary">
            See Host-Peer QR System
          </a>
          <span className="text-[13px] text-[#41454d] ml-2">
            No credit card required • 10-minute automated setup
          </span>
        </div>

        {/* High-Density Editorial Product Showcase */}
        <div className="border border-[#dddddd] rounded-[12px] bg-[#ffffff] shadow-xs overflow-hidden">
          {/* Mock Window Top Bar */}
          <div className="bg-[#f8fafc] border-b border-[#dddddd] px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#dddddd]" />
                <span className="w-3 h-3 rounded-full bg-[#dddddd]" />
                <span className="w-3 h-3 rounded-full bg-[#dddddd]" />
              </div>
              <span className="text-[12px] font-medium text-[#181d26] pl-2 border-l border-[#dddddd]">
                RestroDash Desktop Node • Port 3001 Authoritative
              </span>
            </div>

            {/* Switcher Tabs */}
            <div className="flex items-center bg-[#ffffff] border border-[#dddddd] rounded-[8px] p-1 gap-1">
              <button
                onClick={() => setActiveTab('pos')}
                className={`px-3 py-1 text-[12px] font-medium rounded-[6px] transition-colors ${
                  activeTab === 'pos'
                    ? 'bg-[#181d26] text-[#ffffff]'
                    : 'text-[#333840] hover:text-[#181d26]'
                }`}
              >
                POS Terminal
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-3 py-1 text-[12px] font-medium rounded-[6px] transition-colors ${
                  activeTab === 'qr'
                    ? 'bg-[#181d26] text-[#ffffff]'
                    : 'text-[#333840] hover:text-[#181d26]'
                }`}
              >
                Table Host & Guests
              </button>
              <button
                onClick={() => setActiveTab('kds')}
                className={`px-3 py-1 text-[12px] font-medium rounded-[6px] transition-colors ${
                  activeTab === 'kds'
                    ? 'bg-[#181d26] text-[#ffffff]'
                    : 'text-[#333840] hover:text-[#181d26]'
                }`}
              >
                Kitchen KDS (:3002)
              </button>
            </div>

            {/* Offline Status Badge (Strictly Utilitarian) */}
            <div className="flex items-center gap-2 text-[12px] text-[#006400]">
              <span className="w-2 h-2 rounded-full bg-[#006400]" />
              <span className="font-medium">100% Local SQLite • 0ms Lag</span>
            </div>
          </div>

          {/* View Panels */}
          {activeTab === 'pos' && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#ffffff]">
              {/* Floor Plan & Tables (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#181d26]">
                    Main Dining Room (12 Tables Active)
                  </span>
                  <span className="text-[12px] text-[#41454d]">
                    Occupancy: 78% • Total Open: ₹18,450
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  <div className="border-2 border-[#181d26] rounded-[8px] p-3 bg-[#f8fafc] flex flex-col justify-between h-24 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[14px] text-[#181d26]">T-01</span>
                      <span className="text-[10px] bg-[#181d26] text-white px-1.5 py-0.5 rounded-[4px]">HOST ACTIVE</span>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#333840]">Host: Rohit S.</div>
                      <div className="text-[12px] font-medium text-[#181d26]">₹2,140 (4 items)</div>
                    </div>
                  </div>

                  <div className="border border-[#dddddd] rounded-[8px] p-3 bg-[#ffffff] flex flex-col justify-between h-24 hover:border-[#9297a0] cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[14px] text-[#181d26]">T-02</span>
                      <span className="text-[10px] text-[#006400] font-medium">SERVING</span>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#333840]">Server: Anita</div>
                      <div className="text-[12px] font-medium text-[#181d26]">₹3,890 (8 items)</div>
                    </div>
                  </div>

                  <div className="border border-[#dddddd] rounded-[8px] p-3 bg-[#ffffff] flex flex-col justify-between h-24 hover:border-[#9297a0] cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[14px] text-[#181d26]">T-03</span>
                      <span className="text-[10px] text-[#aa2d00] font-medium">BILL PRINTED</span>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#333840]">Split (2/2)</div>
                      <div className="text-[12px] font-medium text-[#181d26]">₹1,450 paid</div>
                    </div>
                  </div>

                  <div className="border border-dashed border-[#dddddd] rounded-[8px] p-3 bg-[#ffffff] flex flex-col justify-between h-24 hover:border-[#9297a0] cursor-pointer opacity-70">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[14px] text-[#41454d]">T-04</span>
                      <span className="text-[10px] text-[#41454d]">VACANT</span>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#41454d]">Seats 4</div>
                      <div className="text-[12px] text-[#41454d]">Ready to seat</div>
                    </div>
                  </div>
                </div>

                {/* Quick Item Category Bar */}
                <div className="border border-[#dddddd] rounded-[8px] p-3 bg-[#f8fafc] mt-2">
                  <div className="text-[12px] font-medium text-[#181d26] mb-2">
                    Popular Items • 1-Click Order Entry
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button className="border border-[#dddddd] bg-[#ffffff] rounded-[6px] p-2 text-left hover:border-[#181d26]">
                      <div className="text-[12px] font-medium text-[#181d26]">Cold Brew Nitro</div>
                      <div className="text-[11px] text-[#41454d]">₹280</div>
                    </button>
                    <button className="border border-[#dddddd] bg-[#ffffff] rounded-[6px] p-2 text-left hover:border-[#181d26]">
                      <div className="text-[12px] font-medium text-[#181d26]">Avocado Sourdough</div>
                      <div className="text-[11px] text-[#41454d]">₹420</div>
                    </button>
                    <button className="border border-[#dddddd] bg-[#ffffff] rounded-[6px] p-2 text-left hover:border-[#181d26]">
                      <div className="text-[12px] font-medium text-[#181d26]">Truffle Pasta</div>
                      <div className="text-[11px] text-[#41454d]">₹680</div>
                    </button>
                    <button className="border border-[#dddddd] bg-[#ffffff] rounded-[6px] p-2 text-left hover:border-[#181d26]">
                      <div className="text-[12px] font-medium text-[#181d26]">Basque Cheesecake</div>
                      <div className="text-[11px] text-[#41454d]">₹340</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Cart & Direct ESC/POS Print (5 cols) */}
              <div className="lg:col-span-5 border border-[#dddddd] rounded-[8px] p-4 bg-[#ffffff] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#dddddd]">
                    <div>
                      <span className="font-medium text-[14px] text-[#181d26]">Table T-01 Ticket</span>
                      <span className="text-[12px] text-[#41454d] block">Host: Rohit S. • 4 Guests</span>
                    </div>
                    <span className="text-[11px] bg-[#f8fafc] border border-[#dddddd] text-[#181d26] px-2 py-1 rounded-[4px]">
                      Order #1084
                    </span>
                  </div>

                  <div className="divide-y divide-[#dddddd] py-2">
                    <div className="py-2 flex items-center justify-between text-[13px]">
                      <div>
                        <div className="font-medium text-[#181d26]">1x Cold Brew Nitro</div>
                        <div className="text-[11px] text-[#41454d]">Added by Rohit (Host)</div>
                      </div>
                      <span className="font-medium text-[#181d26]">₹280.00</span>
                    </div>
                    <div className="py-2 flex items-center justify-between text-[13px]">
                      <div>
                        <div className="font-medium text-[#181d26]">2x Avocado Sourdough</div>
                        <div className="text-[11px] text-[#41454d]">Added by Guest (PIN 7429)</div>
                      </div>
                      <span className="font-medium text-[#181d26]">₹840.00</span>
                    </div>
                    <div className="py-2 flex items-center justify-between text-[13px]">
                      <div>
                        <div className="font-medium text-[#181d26]">1x Truffle Fries</div>
                        <div className="text-[11px] text-[#41454d]">Special: Extra dip</div>
                      </div>
                      <span className="font-medium text-[#181d26]">₹320.00</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#dddddd]">
                  <div className="flex justify-between text-[12px] text-[#333840] mb-1">
                    <span>Subtotal</span>
                    <span>₹1,440.00</span>
                  </div>
                  <div className="flex justify-between text-[12px] text-[#333840] mb-3">
                    <span>CGST + SGST (5%)</span>
                    <span>₹72.00</span>
                  </div>
                  <div className="flex justify-between text-[15px] font-medium text-[#181d26] mb-4">
                    <span>Total Amount</span>
                    <span>₹1,512.00</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-secondary text-[13px] py-2 px-3 text-center justify-center">
                      Split Bill
                    </button>
                    <button className="btn-primary text-[13px] py-2 px-3 text-center justify-center">
                      Print & Settle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#ffffff]">
              {/* Host Phone Mockup */}
              <div className="border border-[#dddddd] rounded-[8px] p-5 bg-[#f8fafc]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#dddddd]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#aa2d00]" />
                    <span className="font-medium text-[13px] text-[#181d26]">First Scan: Table Host</span>
                  </div>
                  <span className="text-[11px] bg-[#181d26] text-white px-2 py-0.5 rounded-[4px]">
                    PIN: 7429
                  </span>
                </div>
                <p className="text-[13px] text-[#333840] mb-3 leading-relaxed">
                  The first diner scanning Table T-01 becomes the <strong>Host (Table Master)</strong>. They control final checkout approval and share the generated 4-digit PIN with table companions.
                </p>
                <div className="border border-[#dddddd] bg-white rounded-[6px] p-3 text-[12px] text-[#181d26]">
                  <div className="font-medium mb-1">Host Controls:</div>
                  <ul className="list-disc list-inside space-y-1 text-[#333840]">
                    <li>View live orders added by companions</li>
                    <li>Accept / modify companion item requests</li>
                    <li>Exclusive checkout & payment authority</li>
                  </ul>
                </div>
              </div>

              {/* Guest Phone Mockup */}
              <div className="border border-[#dddddd] rounded-[8px] p-5 bg-[#f8fafc]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#dddddd]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#181d26]" />
                    <span className="font-medium text-[13px] text-[#181d26]">Second Scan: Companion Guest</span>
                  </div>
                  <span className="text-[11px] text-[#41454d]">Dining Together</span>
                </div>
                <p className="text-[13px] text-[#333840] mb-3 leading-relaxed">
                  Subsequent diners scanning Table T-01 are prompted with <em>&quot;Dining with friends? Enter 4-digit Code&quot;</em>. Once entered, they browse and add items into the synchronized cart.
                </p>
                <div className="border border-[#dddddd] bg-white rounded-[6px] p-3 text-[12px] text-[#181d26]">
                  <div className="font-medium mb-1">Companion Experience:</div>
                  <ul className="list-disc list-inside space-y-1 text-[#333840]">
                    <li>Direct live menu access on their own phone</li>
                    <li>Add/remove items in synchronized group cart</li>
                    <li>Zero app download or account signup required</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kds' && (
            <div className="p-6 bg-[#ffffff]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-medium text-[#181d26]">
                  Live Kitchen Display Screen (:3002) • Grill & Beverage Stations
                </span>
                <span className="text-[12px] text-[#006400] font-medium">3 Orders in Progress</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-[#dddddd] rounded-[8px] p-3 bg-[#f8fafc]">
                  <div className="flex items-center justify-between border-b border-[#dddddd] pb-2 mb-2">
                    <span className="font-medium text-[13px] text-[#181d26]">T-01 • #1084</span>
                    <span className="text-[11px] text-[#aa2d00] font-medium">04:12 elapsed</span>
                  </div>
                  <div className="text-[12px] text-[#333840] space-y-1 mb-3">
                    <div>1x Cold Brew Nitro</div>
                    <div>2x Avocado Sourdough (extra crisp)</div>
                  </div>
                  <button className="btn-primary w-full text-[12px] py-1.5 text-center justify-center">
                    Bump to Ready
                  </button>
                </div>

                <div className="border border-[#dddddd] rounded-[8px] p-3 bg-[#f8fafc]">
                  <div className="flex items-center justify-between border-b border-[#dddddd] pb-2 mb-2">
                    <span className="font-medium text-[13px] text-[#181d26]">T-02 • #1083</span>
                    <span className="text-[11px] text-[#333840]">08:45 elapsed</span>
                  </div>
                  <div className="text-[12px] text-[#333840] space-y-1 mb-3">
                    <div>1x Truffle Pasta</div>
                    <div>1x Woodfired Pizza Margherita</div>
                  </div>
                  <button className="btn-secondary w-full text-[12px] py-1.5 text-center justify-center">
                    Mark Preparing
                  </button>
                </div>

                <div className="border border-[#dddddd] rounded-[8px] p-3 bg-[#f8fafc]">
                  <div className="flex items-center justify-between border-b border-[#dddddd] pb-2 mb-2">
                    <span className="font-medium text-[13px] text-[#181d26]">Takeaway • #1082</span>
                    <span className="text-[11px] text-[#006400] font-medium">Ready</span>
                  </div>
                  <div className="text-[12px] text-[#333840] space-y-1 mb-3">
                    <div>2x Iced Latte</div>
                    <div>1x Basque Cheesecake</div>
                  </div>
                  <button className="btn-secondary w-full text-[12px] py-1.5 text-center justify-center">
                    Completed
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
