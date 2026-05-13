"use client";

import { useEffect, useState } from "react";
import ClientOnboardingForm from "@/app/components/ClientOnboardingForm";
import ServiceSelection from "@/app/components/ServiceSelection";
import SimpleOnboardingForm from "@/app/components/SimpleOnboardingForm";

export default function OnboardingPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ref")) {
      setSelectedService("tax");
    }
  }, []);

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
  };

  const handleBack = () => {
    setSelectedService(null);
  };

  return (
    <div className="w-full pt-2 pb-8 sm:pt-6 sm:pb-12">
      {!selectedService && (
        <ServiceSelection onSelect={handleServiceSelect} hideHeader={hideHeader} />
      )}

      {selectedService === "accounting" && (
        <ClientOnboardingForm onBack={handleBack} />
      )}

      {selectedService && selectedService !== "accounting" && (
        <SimpleOnboardingForm serviceType={selectedService} onBack={handleBack} />
      )}
    </div>
  );
}
