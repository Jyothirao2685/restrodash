'use client';

import React from 'react';

export function DemoGridSection() {
  return (
    <section id="features" className="py-24 bg-[#ffffff] border-b border-[#dddddd]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-[32px] sm:text-[36px] font-normal text-[#181d26] leading-[1.2] mb-4">
            Engineered around the real dining room floor.
          </h2>
          <p className="text-[16px] text-[#333840] leading-relaxed">
            RestroDash is built from ground-level restaurant workflows — handling real-world chaos like spotty guest WiFi, group order coordination, and split billing with zero friction.
          </p>
        </div>

        {/* 4-Card Demo Grid with Signature Pastel Surfaces */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Peach Surface - Host-Peer QR Dining */}
          <div className="bg-[#fcab79] rounded-[12px] p-6 sm:p-8 flex flex-col justify-between border border-[#dddddd]/40">
            <div className="mb-6">
              <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
                Patented Dining Flow
              </span>
              <h3 className="text-[22px] font-medium text-[#181d26] mb-3 leading-snug">
                Host-Peer Collaborative QR Dining
              </h3>
              <p className="text-[14px] text-[#181d26]/85 leading-relaxed">
                The first guest to scan the QR code becomes the <strong>Host (Table Master)</strong>. Companions enter a simple 4-digit code to collaborate on the shared cart, while checkout authority remains with the host.
              </p>
            </div>

            {/* UI Fragment */}
            <div className="bg-[#ffffff] rounded-[8px] p-4 border border-[#dddddd] shadow-xs text-[#181d26]">
              <div className="flex items-center justify-between pb-2 border-b border-[#dddddd] mb-3 text-[12px]">
                <div className="font-medium">Table T-05 • Host: Vikram K.</div>
                <div className="bg-[#f8fafc] px-2 py-0.5 border border-[#dddddd] rounded text-[11px]">
                  PIN: 4819
                </div>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span>1x Smoked Butter Chicken</span>
                  <span className="text-[#41454d]">Vikram (Host)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>2x Garlic Naan</span>
                  <span className="text-[#41454d]">Peer #1 (Joined)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>1x Mango Lassi</span>
                  <span className="text-[#41454d]">Peer #2 (Joined)</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-[#dddddd] flex items-center justify-between text-[11px] text-[#006400]">
                <span>✓ Synchronized Real-Time Cart</span>
                <span className="font-medium">Host Approved</span>
              </div>
            </div>
          </div>

          {/* Card 2: Mint Surface - Multi-Station Kitchen KDS */}
          <div className="bg-[#a8d8c4] rounded-[12px] p-6 sm:p-8 flex flex-col justify-between border border-[#dddddd]/40">
            <div className="mb-6">
              <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
                Zero Cloud Lag
              </span>
              <h3 className="text-[22px] font-medium text-[#181d26] mb-3 leading-snug">
                Multi-Station Kitchen Display (KDS)
              </h3>
              <p className="text-[14px] text-[#181d26]/85 leading-relaxed">
                Orders route automatically to station-specific screens (Grill, Saute, Bar, Bakery) on Port 3002. Chefs tap to bump stages with zero roundtrip delay.
              </p>
            </div>

            {/* UI Fragment */}
            <div className="bg-[#ffffff] rounded-[8px] p-4 border border-[#dddddd] shadow-xs text-[#181d26]">
              <div className="flex items-center justify-between pb-2 border-b border-[#dddddd] mb-3 text-[12px]">
                <div className="font-medium">Station: Main Hot Line</div>
                <div className="text-[11px] text-[#006400] font-medium">● WebSocket Live</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="border border-[#dddddd] rounded p-2 bg-[#f8fafc]">
                  <div className="font-medium text-[#181d26]">Ticket #104</div>
                  <div className="text-[11px] text-[#aa2d00]">03m 15s • Priority</div>
                  <div className="text-[11px] text-[#333840] mt-1">2x Ribeye Steak (Med)</div>
                </div>
                <div className="border border-[#dddddd] rounded p-2 bg-[#f8fafc]">
                  <div className="font-medium text-[#181d26]">Ticket #105</div>
                  <div className="text-[11px] text-[#333840]">01m 20s • Normal</div>
                  <div className="text-[11px] text-[#333840] mt-1">1x Truffle Risotto</div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-[#dddddd] text-right">
                <span className="text-[11px] text-[#41454d]">1-Click Bump to Expeditor</span>
              </div>
            </div>
          </div>

          {/* Card 3: Yellow Surface - Waitstaff Handheld & Split Billing */}
          <div className="bg-[#f4d35e] rounded-[12px] p-6 sm:p-8 flex flex-col justify-between border border-[#dddddd]/40">
            <div className="mb-6">
              <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
                Instant Tableside Flow
              </span>
              <h3 className="text-[22px] font-medium text-[#181d26] mb-3 leading-snug">
                Tableside Mobile & Instant Split Billing
              </h3>
              <p className="text-[14px] text-[#181d26]/85 leading-relaxed">
                Servers can take orders on any phone or tablet browser, punch modifications, split bills itemized or evenly across guests, and trigger thermal receipts in seconds.
              </p>
            </div>

            {/* UI Fragment */}
            <div className="bg-[#ffffff] rounded-[8px] p-4 border border-[#dddddd] shadow-xs text-[#181d26]">
              <div className="flex items-center justify-between pb-2 border-b border-[#dddddd] mb-2 text-[12px]">
                <div className="font-medium">Split Bill • Table T-08 (3 Ways)</div>
                <div className="text-[11px] font-medium">Total: ₹3,600</div>
              </div>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between bg-[#f8fafc] p-1.5 rounded border border-[#dddddd]">
                  <span>Guest 1 (UPI / GPay)</span>
                  <span className="font-medium text-[#006400]">₹1,200 (Paid)</span>
                </div>
                <div className="flex items-center justify-between bg-[#f8fafc] p-1.5 rounded border border-[#dddddd]">
                  <span>Guest 2 (Card Terminal)</span>
                  <span className="font-medium text-[#006400]">₹1,200 (Paid)</span>
                </div>
                <div className="flex items-center justify-between bg-[#f8fafc] p-1.5 rounded border border-[#dddddd]">
                  <span>Guest 3 (Cash)</span>
                  <span className="font-medium text-[#aa2d00]">₹1,200 (Pending)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Mustard Surface - Dedicated Tenant Isolation */}
          <div className="bg-[#d9a441] rounded-[12px] p-6 sm:p-8 flex flex-col justify-between border border-[#dddddd]/40">
            <div className="mb-6">
              <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
                Enterprise Isolation
              </span>
              <h3 className="text-[22px] font-medium text-[#181d26] mb-3 leading-snug">
                Dedicated VPS & Isolated Database
              </h3>
              <p className="text-[14px] text-[#181d26]/85 leading-relaxed">
                Every restaurant brand gets its own dedicated cloud instance and custom domain. No shared multi-tenant database risks, no noisy neighbors, and zero cross-tenant contamination.
              </p>
            </div>

            {/* UI Fragment */}
            <div className="bg-[#ffffff] rounded-[8px] p-4 border border-[#dddddd] shadow-xs text-[#181d26]">
              <div className="flex items-center justify-between pb-2 border-b border-[#dddddd] mb-3 text-[12px]">
                <div className="font-medium">Instance: olivebistro.restrodash.in</div>
                <div className="text-[11px] text-[#006400] font-medium">Dedicated VPS</div>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#333840]">Database Engine</span>
                  <span className="font-medium">Isolated SQLite + Encrypted Sync</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#333840]">SSL & Domain</span>
                  <span className="font-medium">Auto-Renewed Let&apos;s Encrypt</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#333840]">Daily Backup</span>
                  <span className="font-medium text-[#006400]">Automated (03:00 AM)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
