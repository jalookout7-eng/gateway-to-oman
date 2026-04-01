import { Hero } from "@/components/landing/Hero";
import { WhyOman } from "@/components/landing/WhyOman";
import { Sectors } from "@/components/landing/Sectors";
import { TrackRecord } from "@/components/landing/TrackRecord";
import { WhoWeHelp } from "@/components/landing/WhoWeHelp";
import { CoreServices } from "@/components/landing/CoreServices";
import { Opportunities } from "@/components/landing/Opportunities";
import { WhyWorkWithUs } from "@/components/landing/WhyWorkWithUs";
import { FounderMission } from "@/components/landing/FounderMission";
import { ContactCTA } from "@/components/landing/ContactCTA";

export default function Home() {
  return (
    <main>
      <Hero />
      <WhyOman />
      <Sectors />
      <TrackRecord />
      <WhoWeHelp />
      <CoreServices />
      <Opportunities />
      <WhyWorkWithUs />
      <FounderMission />
      <ContactCTA />
    </main>
  );
}
