"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle } from "lucide-react";

interface LeadFormProps {
  source?: string;
  intent?: string;
}

export function LeadForm({ source = "website", intent }: LeadFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      company: formData.get("company") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || null,
      service_interest: formData.get("service_interest") as string,
      description: (formData.get("description") as string) || null,
      source,
      intent: intent || (formData.get("service_interest") as string),
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) setSubmitted(true);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-black-2 border border-[#2a2a2a] rounded-lg p-10 flex flex-col items-center justify-center text-center gap-4">
        <CheckCircle className="w-12 h-12 text-green" />
        <div className="font-display text-[22px] font-bold">
          Brief received!
        </div>
        <p className="body-copy-sm">
          We&apos;ll get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      <div className="font-display text-[22px] font-bold mb-1.5">
        Send us a brief
      </div>
      <p className="body-copy-sm !text-gray-5">
        We&apos;ll respond within one business day with a project brief and a
        quote.
      </p>

      {/* Name + Company row */}
      <div className="grid grid-cols-2 gap-7 max-md:grid-cols-1">
        <div className="flex flex-col gap-2">
          <label className="form-label">Your name</label>
          <input
            name="name"
            required
            className="form-input border-b border-gray-300 focus:border-pm-yellow bg-transparent py-3 px-4 outline-none transition-colors duration-250 placeholder:text-gray-400 !rounded-none !border-t-0 !border-l-0 !border-r-0"
            placeholder="Jane Mwangi"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="form-label">Company</label>
          <input
            name="company"
            required
            className="form-input border-b border-gray-300 focus:border-pm-yellow bg-transparent py-3 px-4 outline-none transition-colors duration-250 placeholder:text-gray-400 !rounded-none !border-t-0 !border-l-0 !border-r-0"
            placeholder="Acme Ltd"
          />
        </div>
      </div>

      {/* Email + Phone row */}
      <div className="grid grid-cols-2 gap-7 max-md:grid-cols-1">
        <div className="flex flex-col gap-2">
          <label className="form-label">Email</label>
          <input
            name="email"
            type="email"
            required
            className="form-input border-b border-gray-300 focus:border-pm-yellow bg-transparent py-3 px-4 outline-none transition-colors duration-250 placeholder:text-gray-400 !rounded-none !border-t-0 !border-l-0 !border-r-0"
            placeholder="jane@company.co.ke"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="form-label">
            Phone <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            className="form-input border-b border-gray-300 focus:border-pm-yellow bg-transparent py-3 px-4 outline-none transition-colors duration-250 placeholder:text-gray-400 !rounded-none !border-t-0 !border-l-0 !border-r-0"
            placeholder="+254 741 953 190"
          />
        </div>
      </div>

      {/* Service interest */}
      <div className="flex flex-col gap-2">
        <label className="form-label">I&apos;m interested in</label>
        <select
          name="service_interest"
          required
          defaultValue=""
          className="form-select border-b border-gray-300 focus:border-pm-yellow bg-transparent py-3 px-4 outline-none transition-colors duration-250 !rounded-none !border-t-0 !border-l-0 !border-r-0"
        >
          <option value="" disabled>
            Select a service
          </option>
          <option value="Market Research">Market Research</option>
          <option value="Brand Strategy & Identity">
            Brand Strategy & Identity
          </option>
          <option value="Billboard / Screen Rental">
            Billboard / Screen Rental
          </option>
          <option value="Event Activation">Event Activation</option>
          <option value="Data & Analytics">Data & Analytics</option>
          <option value="Campaign Management">Campaign Management</option>
          <option value="Multiple services">Multiple services</option>
        </select>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <label className="form-label">Brief description</label>
        <textarea
          name="description"
          rows={4}
          className="form-textarea border-b border-gray-300 focus:border-pm-yellow bg-transparent py-3 px-4 outline-none transition-colors duration-250 placeholder:text-gray-400 resize-none !rounded-none !border-t-0 !border-l-0 !border-r-0"
          placeholder="What market are you trying to reach, and what's the goal?"
        />
      </div>

      {/* Submit — extra mt-6 for breathing room */}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 self-start bg-pm-black text-pm-yellow font-semibold px-8 py-4 text-sm transition-all duration-250 hover:bg-pm-yellow hover:text-pm-black hover:scale-[1.02] disabled:opacity-60"
      >
        <span className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          {loading ? "Sending..." : "Send Message"}
        </span>
      </button>
    </form>
  );
}
