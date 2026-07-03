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
      <div className="card !bg-black-2 !border-black-4 p-10 flex flex-col items-center justify-center text-center gap-4">
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
    <form
      onSubmit={handleSubmit}
      className="card !bg-black-2 !border-black-4 p-10 max-md:p-6"
    >
      <div className="font-display text-[22px] font-bold mb-1.5">
        Send us a brief
      </div>
      <div className="body-copy-sm mb-7">
        We&apos;ll get back to you within one business day.
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
        <div>
          <label className="form-label">Your name</label>
          <input
            name="name"
            required
            className="form-input"
            placeholder="Jane Mwangi"
          />
        </div>
        <div>
          <label className="form-label">Company</label>
          <input
            name="company"
            required
            className="form-input"
            placeholder="Acme Ltd"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
        <div>
          <label className="form-label">Email</label>
          <input
            name="email"
            type="email"
            required
            className="form-input"
            placeholder="jane@company.co.ke"
          />
        </div>
        <div>
          <label className="form-label">
            Phone <span className="text-gray-5 font-normal">(optional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            className="form-input"
            placeholder="+254 700 000 000"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">I&apos;m interested in</label>
        <select
          name="service_interest"
          required
          defaultValue=""
          className="form-select"
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

      <div className="mb-4">
        <label className="form-label">Brief description</label>
        <textarea
          name="description"
          rows={4}
          className="form-textarea"
          placeholder="What market are you trying to reach, and what's the goal?"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="form-submit flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Send className="w-4 h-4" />
        {loading ? "Sending..." : "Send Brief →"}
      </button>
    </form>
  );
}
