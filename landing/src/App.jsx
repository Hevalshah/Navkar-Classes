"use client";
import { useState } from "react";
import "./App.css";
import { BoldNavbar } from "@/ui/components/BoldNavbar";
import { BoldNavbarMobile } from "@/ui/components/BoldNavbarMobile";
import { Button } from "@/ui/components/Button";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import { FeatherLandmark, FeatherCheckCircle2, FeatherShield } from "@subframe/core";
import { BoldFooter } from "@/ui/components/BoldFooter";

function App() {
  const [count, setCount] = useState(0); // Currently unused

  return (
    <div className="flex w-full flex-col items-start bg-default-background">
      {/* Header Navbar */}
      <div className="flex w-full flex-col items-center justify-center gap-2 bg-default-background px-6 py-6 mobile:px-2 mobile:py-2">
        <BoldNavbar className="mobile:hidden" />
        <BoldNavbarMobile className="hidden mobile:flex" />
      </div>   

      {/* Hero Section */}
      <div className="flex w-full flex-col items-center justify-center gap-8 bg-default-background px-6 pt-40 pb-24">
        <h1 className="max-w-[1024px] text-center text-[92px] font-[900] leading-[84px] text-default-font -tracking-[0.04em] mobile:text-[62px] mobile:leading-[58px]">
          UNLEASH GALACTIC FREEDOM
        </h1>
        <p className="max-w-[576px] text-center text-[20px] font-[500] leading-[28px] text-subtext-color -tracking-[0.015em]">
          Transcend galactic boundaries. Whether you're pursuing nebula dreams or supporting kin across star systems, FinEdge propels your assets at the velocity of light itself.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Button size="large">Start today</Button>
          <Button variant="neutral-tertiary" size="large">How it works</Button>
        </div>
      </div>

      {/* Image Section */}
      <div className="flex w-full justify-center px-6 py-24">
        <img
          className="h-144 w-full max-w-[1280px] object-cover"
          src="https://res.cloudinary.com/subframe/image/upload/v1724690087/uploads/302/w2ra2yihpofsdy1h4uhy.png"
          alt="Galaxy Transfer"
        />
      </div>

      {/* Feature Sections */}
      {/* Repeatable blocks: feature (text + image) sections */}
      {/* Sections like: Warp-speed, Galactic Nexus, Hypercharge Yield */}
      {/* Keep the same structure as before, I can extract them into reusable components if you want */}

      {/* Trust Badges */}
      <div className="flex w-full justify-center px-6 py-24">
        <div className="flex max-w-[1280px] flex-wrap items-center justify-center gap-12">
          <FeatureBadge icon={<FeatherLandmark />} text="All cosmic assets securely stored in neutron vaults" />
          <FeatureBadge icon={<FeatherCheckCircle2 />} text="Certified and compliant with intergalactic protocols" />
          <FeatureBadge icon={<FeatherShield />} text="Regulated and licensed across all star systems" />
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="flex w-full justify-center bg-default-background px-6 py-24">
        <div className="flex max-w-[1280px] flex-wrap items-center justify-center gap-12">
          <div className="flex flex-col items-center justify-center gap-10">
            <h2 className="text-[72px] font-[900] text-center text-default-font mobile:text-[48px]">
              BUILT FOR FINANCIAL VOYAGERS
            </h2>
          </div>
          <div className="flex w-full max-w-[448px] flex-col items-start gap-6 rounded-3xl bg-brand-300 px-8 py-8">
            <p className="text-[28px] font-[600] leading-[36px] text-default-font">
              “It's the quantum leap in banking that global nomads and interstellar entrepreneurs have been waiting for.”
            </p>
            <div className="rounded-full bg-brand-900 px-6 py-4">
              <span className="text-white text-[16px] font-[600]">Captain Zara, Galactic Wanderer</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="flex w-full justify-center px-6 py-24">
        <div className="flex w-full max-w-[1280px] flex-col items-center gap-8 bg-brand-900 px-6 pt-28 pb-16 rounded-[32px]">
          <h2 className="text-center text-[72px] font-[900] leading-[68px] text-brand-300 mobile:text-[48px]">
            UNLEASH THE FINANCIAL MULTI-VERSE
          </h2>
          <p className="text-center text-white text-[20px] font-[500] leading-[28px]">
            We're crafting the ultimate portal for your interstellar wealth. Microscopic fees. Warp-speed simplicity. Quantum efficiency. Welcome to the future of finance.
          </p>
          <Button variant="brand-secondary" size="large">Activate your portal</Button>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full">
        <BoldFooter />
      </div>
    </div>
  );
}

export default App;

// 🔧 Helper component for trust badges
function FeatureBadge({ icon, text }: { icon: JSX.Element; text: string }) {
  return (
    <div className="flex min-w-[240px] items-center gap-4">
      <IconWithBackground size="x-large" icon={icon} />
      <span className="text-[16px] font-[500] leading-[24px] text-default-font">{text}</span>
    </div>
  );
}
