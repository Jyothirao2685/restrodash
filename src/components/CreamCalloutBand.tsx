'use client';

import React, { useState } from 'react';

export function CreamCalloutBand() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  return (
    <section id="qr-dining" className="py-24 bg-[#ffffff]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-[#f5e9d4] rounded-[16px] p-8 sm:p-14 md:p-16 border border-[#dddddd]/60">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
              Architected for Group Diners
            </span>
            <h2 className="text-[32px] sm:text-[38px] font-normal text-[#181d26] leading-[1.2] mb-4">
              Single-scan host. Seamless 4-digit PIN for companions.
            </h2>
            <p className="text-[16px] text-[#333840] leading-relaxed">
              Traditional QR ordering fails when multiple diners at the same table open separate tabs or spam duplicate orders. RestroDash solves this with our Host-Peer collaboration protocol.
            </p>
          </div>

          {/* 3 Step Interactive Walkthrough */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Steps Navigation (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div
                onClick={() => setActiveStep(1)}
                className={`p-4 rounded-[8px] cursor-pointer transition-all border ${
                  activeStep === 1
                    ? 'bg-[#ffffff] border-[#181d26] shadow-xs'
                    : 'bg-[#ffffff]/50 border-transparent hover:bg-[#ffffff]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium ${
                    activeStep === 1 ? 'bg-[#181d26] text-[#ffffff]' : 'bg-[#dddddd] text-[#181d26]'
                  }`}>
                    1
                  </span>
                  <h4 className="text-[15px] font-medium text-[#181d26]">
                    First Scan: Table Host Assigned
                  </h4>
                </div>
                <p className="text-[13px] text-[#333840] mt-2 ml-9">
                  The first guest to scan the QR automatically claims Table Master status and generates a session PIN.
                </p>
              </div>

              <div
                onClick={() => setActiveStep(2)}
                className={`p-4 rounded-[8px] cursor-pointer transition-all border ${
                  activeStep === 2
                    ? 'bg-[#ffffff] border-[#181d26] shadow-xs'
                    : 'bg-[#ffffff]/50 border-transparent hover:bg-[#ffffff]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium ${
                    activeStep === 2 ? 'bg-[#181d26] text-[#ffffff]' : 'bg-[#dddddd] text-[#181d26]'
                  }`}>
                    2
                  </span>
                  <h4 className="text-[15px] font-medium text-[#181d26]">
                    Companions Enter 4-Digit Code
                  </h4>
                </div>
                <p className="text-[13px] text-[#333840] mt-2 ml-9">
                  Friends scanning the table see <em>&quot;Dining with friends?&quot;</em> and enter the PIN to join the live table cart.
                </p>
              </div>

              <div
                onClick={() => setActiveStep(3)}
                className={`p-4 rounded-[8px] cursor-pointer transition-all border ${
                  activeStep === 3
                    ? 'bg-[#ffffff] border-[#181d26] shadow-xs'
                    : 'bg-[#ffffff]/50 border-transparent hover:bg-[#ffffff]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium ${
                    activeStep === 3 ? 'bg-[#181d26] text-[#ffffff]' : 'bg-[#dddddd] text-[#181d26]'
                  }`}>
                    3
                  </span>
                  <h4 className="text-[15px] font-medium text-[#181d26]">
                    Single Checkout Authority
                  </h4>
                </div>
                <p className="text-[13px] text-[#333840] mt-2 ml-9">
                  Peers add desired appetizers and drinks; the Host approves and checks out to the POS in one unified order.
                </p>
              </div>
            </div>

            {/* Interactive Preview Canvas (7 cols) */}
            <div className="lg:col-span-7 bg-[#ffffff] rounded-[12px] border border-[#dddddd] p-6 shadow-xs">
              {activeStep === 1 && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#dddddd] mb-4">
                    <span className="text-[13px] font-medium text-[#181d26]">
                      Host Device View • Table T-03
                    </span>
                    <span className="text-[11px] bg-[#aa2d00] text-white px-2 py-0.5 rounded">
                      TABLE HOST
                    </span>
                  </div>
                  <div className="p-4 bg-[#f8fafc] border border-[#dddddd] rounded-[8px] mb-4">
                    <div className="text-[12px] text-[#41454d] mb-1">Session Active • Share with companions</div>
                    <div className="text-[28px] font-mono tracking-widest font-medium text-[#181d26]">
                      7 4 2 9
                    </div>
                    <div className="text-[11px] text-[#006400] mt-1">
                      ✓ Connected directly to counter node on :3003
                    </div>
                  </div>
                  <div className="text-[13px] text-[#333840] space-y-1">
                    <div>• Full menu navigation unlocked</div>
                    <div>• Instant bill preview with real-time tax calculation</div>
                    <div>• Authority to add, remove, and trigger kitchen ticket</div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#dddddd] mb-4">
                    <span className="text-[13px] font-medium text-[#181d26]">
                      Companion Device View • Table T-03
                    </span>
                    <span className="text-[11px] bg-[#181d26] text-white px-2 py-0.5 rounded">
                      PEER GUEST
                    </span>
                  </div>
                  <div className="p-4 bg-[#f8fafc] border border-[#dddddd] rounded-[8px] mb-4 text-center">
                    <div className="text-[14px] font-medium text-[#181d26] mb-1">
                      Dining with friends?
                    </div>
                    <div className="text-[12px] text-[#41454d] mb-3">
                      Ask your table host for the 4-digit session code.
                    </div>
                    <div className="inline-flex gap-2">
                      <span className="w-10 h-10 border border-[#181d26] bg-white rounded flex items-center justify-center font-mono font-medium text-[16px]">7</span>
                      <span className="w-10 h-10 border border-[#181d26] bg-white rounded flex items-center justify-center font-mono font-medium text-[16px]">4</span>
                      <span className="w-10 h-10 border border-[#181d26] bg-white rounded flex items-center justify-center font-mono font-medium text-[16px]">2</span>
                      <span className="w-10 h-10 border border-[#181d26] bg-white rounded flex items-center justify-center font-mono font-medium text-[16px]">9</span>
                    </div>
                  </div>
                  <div className="text-[13px] text-[#333840] space-y-1">
                    <div>• Instant synchronization without registration</div>
                    <div>• Propose dishes directly into the shared host cart</div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#dddddd] mb-4">
                    <span className="text-[13px] font-medium text-[#181d26]">
                      Live Synchronized Cart • Table T-03
                    </span>
                    <span className="text-[11px] text-[#006400] font-medium">
                      2 Peers Connected
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between p-2 bg-[#f8fafc] border border-[#dddddd] rounded text-[13px]">
                      <div>
                        <span className="font-medium text-[#181d26]">2x Pour Over Coffee</span>
                        <span className="text-[11px] text-[#41454d] block">Added by Host (Rohit)</span>
                      </div>
                      <span className="font-medium text-[#181d26]">₹440</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#f8fafc] border border-[#dddddd] rounded text-[13px]">
                      <div>
                        <span className="font-medium text-[#181d26]">1x Wild Mushroom Tart</span>
                        <span className="text-[11px] text-[#41454d] block">Added by Peer (PIN 7429)</span>
                      </div>
                      <span className="font-medium text-[#181d26]">₹520</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#dddddd] flex items-center justify-between">
                    <div>
                      <span className="text-[12px] text-[#41454d]">Total Table Cart: </span>
                      <span className="font-medium text-[#181d26]">₹960.00</span>
                    </div>
                    <button className="btn-primary text-[12px] py-2 px-4">
                      Host Confirm & Fire Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
