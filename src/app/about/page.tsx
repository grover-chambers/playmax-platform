import { SiteHeader, SiteFooter } from "@/components/layout";
import { LeadForm } from "@/components/lead-form";

const team = [
  { name: "Amina M.", role: "Account Manager", initials: "AM" },
  { name: "James K.", role: "Research Lead", initials: "JK" },
  { name: "Cynthia M.", role: "Creative Director", initials: "CM" },
  { name: "Dennis O.", role: "Media Operations", initials: "DO" },
];

const values = [
  {
    title: "Research-first",
    desc: "Every recommendation, every campaign, every brand we build starts with data. We never guess.",
  },
  {
    title: "End-to-end ownership",
    desc: "From the first research question to a live campaign on the street — one team, one brief, full accountability.",
  },
  {
    title: "Measured outcomes",
    desc: "If we can't measure it, we don't do it. Every engagement has clear KPIs and transparent reporting.",
  },
  {
    title: "Local expertise",
    desc: "We know Nairobi's streets, Kenya's markets, and East Africa's consumers — because we're from here.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-black">
        <div className="site-container pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="eyebrow mb-3 md:mb-4">About PlayMax</div>
          <h1 className="text-hero mb-6 md:mb-8">
            We find the market.
            <br />
            <span className="accent">You own it.</span>
          </h1>
          <p className="body-copy max-w-[620px]">
            PlayMax Agency is a Nairobi-based market intelligence and brand
            activation firm. We help manufacturers, suppliers, and market
            entrants understand, enter, and dominate Kenyan and East African
            markets.
          </p>
        </div>
      </section>

      <section className="bg-black-2">
        <div className="site-container section">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20">
            <div>
              <h2 className="text-section mb-8 md:mb-12">
                Born from a gap in the market
              </h2>
              <div className="flex flex-col gap-5 md:gap-6 body-copy">
                <p>
                  PlayMax started because we kept seeing the same problem:
                  brands spending big on campaigns without first understanding
                  the market they were trying to reach. Research firms gave
                  data, ad agencies gave creative, media owners gave space — but
                  nobody connected the dots.
                </p>
                <p>
                  We built PlayMax to close that gap. One team that does
                  research, builds strategy, and activates brands on the ground
                  — in Nairobi, Mombasa, Kisumu, and beyond. No handoffs, no
                  dropped balls.
                </p>
                <p>
                  Today we serve FMCG brands, agribusinesses, tech companies,
                  and market entrants from across the region. Whether
                  you&apos;re launching a new product or scaling an existing
                  one, we give you the intelligence and the execution to own
                  your market.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:gap-5 justify-center">
              <div className="stat-card">
                <div className="stat-num">120+</div>
                <div className="stat-label">Research engagements completed</div>
              </div>
              <div className="stat-row">
                <div className="stat-card">
                  <div className="stat-num">48</div>
                  <div className="stat-label">Media sites managed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">6</div>
                  <div className="stat-label">Active markets tracked</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black">
        <div className="site-container section">
          <div className="eyebrow mb-3 md:mb-4">What drives us</div>
          <h2 className="text-section mb-8 md:mb-12">Our values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-black-3 border border-[#1A1A1A] p-8 md:p-10 hover:border-yellow transition-colors"
              >
                <div className="text-[16px] md:text-[18px] font-semibold text-yellow mb-3 md:mb-4">
                  {v.title}
                </div>
                <div className="body-copy-sm">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black-2">
        <div className="site-container section">
          <div className="eyebrow mb-3 md:mb-4">The Team</div>
          <h2 className="text-section mb-8 md:mb-12">
            People who make it happen
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
            {team.map((member) => (
              <div key={member.name} className="stat-card text-center">
                <div className="user-avatar !w-16 !h-16 !text-[16px] md:!text-[18px] mx-auto mb-4 md:mb-5">
                  {member.initials}
                </div>
                <div className="text-[16px] md:text-[18px] font-semibold mb-1">
                  {member.name}
                </div>
                <div className="text-[13px] text-gray-5">{member.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black">
        <div className="site-container section">
          <div className="max-w-[500px] mx-auto text-center">
            <div className="eyebrow mb-3 md:mb-4">Work With Us</div>
            <h2 className="text-section mb-4 md:mb-6">
              Ready to find your market?
            </h2>
            <p className="body-copy-sm mb-8 md:mb-10">
              Send us a brief and we&apos;ll respond within one business day.
            </p>
            <LeadForm source="about-page" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
