'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { copy } from '@/content/copy';

export function DemoSection() {
  const [formStartTime, setFormStartTime] = useState<number>(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    restaurant: '',
    city: '',
    email: '',
    interest: 'both',
    website: '', // honeypot
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const restaurantInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormStartTime(Date.now());
  }, []);

  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required.';
        if (value.trim().length < 2) return 'Please enter at least 2 characters.';
        return null;
      case 'phone': {
        const digits = value.replace(/\D/g, '');
        if (!digits) return 'Phone number is required.';
        if (digits.length < 7 || digits.length > 15) return 'Please enter a valid phone number.';
        return null;
      }
      case 'restaurant':
        if (!value.trim()) return 'Restaurant name is required.';
        return null;
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Please enter a valid email address.';
        }
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (field: string) => {
    const error = validateField(field, formData[field as keyof typeof formData]);
    setErrors((prev) => ({
      ...prev,
      [field]: error || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const newErrors: Record<string, string> = {};
    ['name', 'phone', 'restaurant', 'email'].forEach((field) => {
      const err = validateField(field, formData[field as keyof typeof formData]);
      if (err) newErrors[field] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus first error
      if (newErrors.name) nameInputRef.current?.focus();
      else if (newErrors.phone) phoneInputRef.current?.focus();
      else if (newErrors.restaurant) restaurantInputRef.current?.focus();
      else if (newErrors.email) emailInputRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          formStartTime,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setServerError(data.error || 'Unable to submit. Please call us at +91 98765 43210.');
      }
    } catch {
      setServerError('Connection error. Please call us directly at +91 98765 43210.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo" className="relative z-20 px-6 scroll-mt-[88px] -mb-32">
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-[#F4F1EA] text-[#181818] rounded-[32px] p-8 sm:p-14 border border-[#E6E1D6] shadow-demo-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column (cols 1 to 5): H2, Subtext, and Working QR Code */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-normal leading-[1.15] text-[#181818] tracking-[-0.02em] mb-4">
                  {copy.demoForm.h2}
                </h2>
                <p className="text-[17px] font-normal leading-[1.6] text-[#5A564D] mb-10 max-w-sm">
                  {copy.demoForm.sub}
                </p>
              </div>

              {/* Working QR Code (Desktop only) */}
              <div className="hidden lg:flex flex-col items-start pt-6 border-t border-[#E6E1D6]">
                <div className="relative w-[160px] h-[160px] bg-[#FFFFFF] rounded-[16px] p-2 border border-[#E6E1D6] mb-3">
                  <Image
                    src="/qr-demo.png"
                    alt="QR code to open demo request form on mobile phone"
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <span className="text-[14px] font-normal text-[#5A564D]">
                  {copy.demoForm.qrCaption}
                </span>
              </div>
            </div>

            {/* Right Column (cols 6 to 12): The Form */}
            <div className="lg:col-span-7 bg-[#FFFFFF] rounded-[20px] p-6 sm:p-8 border border-[#E6E1D6]">
              {submitted ? (
                <div className="py-12 text-center" role="alert">
                  <div className="w-12 h-12 rounded-full bg-[#1F7A4D] text-[#FFFFFF] flex items-center justify-center mx-auto mb-4 text-[20px]">
                    ✓
                  </div>
                  <h3 className="text-[24px] font-medium text-[#181818] mb-2">
                    Request received.
                  </h3>
                  <p className="text-[17px] text-[#5A564D] max-w-md mx-auto">
                    Thanks, {formData.name}. We will call you at {formData.phone} within one business day to set a demo time.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {serverError && (
                    <div className="mb-6 p-4 rounded-[12px] bg-[#FFF0EF] border border-[#B3261E] text-[#B3261E] text-[14px]" role="alert">
                      {serverError}
                    </div>
                  )}

                  {/* Honeypot Field */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                      type="text"
                      id="website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    {/* Name Field */}
                    <div>
                      <label htmlFor="name" className="block text-[14px] font-medium text-[#181818] mb-1.5">
                        {copy.demoForm.fields.name} <span className="text-[#B3261E]">*</span>
                      </label>
                      <input
                        ref={nameInputRef}
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        onBlur={() => handleBlur('name')}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                        className={`w-full px-4 py-3 rounded-[12px] border text-[15px] bg-[#FFFFFF] text-[#181818] focus:outline-hidden ${
                          errors.name
                            ? 'border-[#B3261E] focus:border-[#B3261E]'
                            : 'border-[#8A857B] focus:border-[#181818]'
                        }`}
                      />
                      {errors.name && (
                        <p id="name-error" className="mt-1 text-[13px] text-[#B3261E]">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label htmlFor="phone" className="block text-[14px] font-medium text-[#181818] mb-1.5">
                        {copy.demoForm.fields.phone} <span className="text-[#B3261E]">*</span>
                      </label>
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        id="phone"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        onBlur={() => handleBlur('phone')}
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                        className={`w-full px-4 py-3 rounded-[12px] border text-[15px] bg-[#FFFFFF] text-[#181818] focus:outline-hidden ${
                          errors.phone
                            ? 'border-[#B3261E] focus:border-[#B3261E]'
                            : 'border-[#8A857B] focus:border-[#181818]'
                        }`}
                      />
                      {errors.phone && (
                        <p id="phone-error" className="mt-1 text-[13px] text-[#B3261E]">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    {/* Restaurant Field */}
                    <div>
                      <label htmlFor="restaurant" className="block text-[14px] font-medium text-[#181818] mb-1.5">
                        {copy.demoForm.fields.restaurant} <span className="text-[#B3261E]">*</span>
                      </label>
                      <input
                        ref={restaurantInputRef}
                        type="text"
                        id="restaurant"
                        required
                        value={formData.restaurant}
                        onChange={(e) => setFormData({ ...formData, restaurant: e.target.value })}
                        onBlur={() => handleBlur('restaurant')}
                        aria-invalid={!!errors.restaurant}
                        aria-describedby={errors.restaurant ? 'restaurant-error' : undefined}
                        className={`w-full px-4 py-3 rounded-[12px] border text-[15px] bg-[#FFFFFF] text-[#181818] focus:outline-hidden ${
                          errors.restaurant
                            ? 'border-[#B3261E] focus:border-[#B3261E]'
                            : 'border-[#8A857B] focus:border-[#181818]'
                        }`}
                      />
                      {errors.restaurant && (
                        <p id="restaurant-error" className="mt-1 text-[13px] text-[#B3261E]">
                          {errors.restaurant}
                        </p>
                      )}
                    </div>

                    {/* City Field */}
                    <div>
                      <label htmlFor="city" className="block text-[14px] font-medium text-[#181818] mb-1.5">
                        {copy.demoForm.fields.city}
                      </label>
                      <input
                        type="text"
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 rounded-[12px] border border-[#8A857B] text-[15px] bg-[#FFFFFF] text-[#181818] focus:outline-hidden focus:border-[#181818]"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="mb-5">
                    <label htmlFor="email" className="block text-[14px] font-medium text-[#181818] mb-1.5">
                      {copy.demoForm.fields.email}
                    </label>
                    <input
                      ref={emailInputRef}
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onBlur={() => handleBlur('email')}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      className={`w-full px-4 py-3 rounded-[12px] border text-[15px] bg-[#FFFFFF] text-[#181818] focus:outline-hidden ${
                        errors.email
                          ? 'border-[#B3261E] focus:border-[#B3261E]'
                          : 'border-[#8A857B] focus:border-[#181818]'
                      }`}
                    />
                    {errors.email && (
                      <p id="email-error" className="mt-1 text-[13px] text-[#B3261E]">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Interest Radio Options */}
                  <div className="mb-6">
                    <span className="block text-[14px] font-medium text-[#181818] mb-2.5">
                      {copy.demoForm.fields.interest}
                    </span>
                    <div className="flex flex-wrap gap-6 text-[15px] text-[#181818]">
                      {copy.demoForm.interestOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="interest"
                            value={opt.value}
                            checked={formData.interest === opt.value}
                            onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                            className="w-4 h-4 text-[#181818] accent-[#181818]"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button (Ink on light band) */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-ink w-full py-3.5 text-[15px]"
                  >
                    {loading ? 'Submitting...' : copy.demoForm.cta}
                  </button>

                  <p className="mt-3 text-[13px] text-[#5A564D] text-center">
                    {copy.demoForm.consent}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
