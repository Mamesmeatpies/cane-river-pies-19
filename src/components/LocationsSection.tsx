import { useState } from "react";
import { MapPin, Store } from "lucide-react";

import { storeLocations } from "@/data/storeLocations";

const locations = [
  {
    name: "Frenchy's Chicken",
    details: "Houston, TX — Multiple Locations",
    link: "https://frenchyschicken.com",
  },
  {
    name: "Frisco Fresh Market",
    details: "Ratcliff Premium Meats Booth",
    link: "https://friscofreshmarket.com",
  },
];

const LocationsSection = () => {
  const stateOptions = Array.from(
    new Map(storeLocations.map((store) => [store.stateAbbreviation, store.state])).entries(),
  ).map(([stateAbbreviation, state]) => ({ stateAbbreviation, state }));
  const [selectedStoreNumber, setSelectedStoreNumber] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const localStores = selectedState
    ? storeLocations.filter((store) => store.stateAbbreviation === selectedState)
    : [];
  const selectedStore = storeLocations.find((store) => store.storeNumber === selectedStoreNumber);

  return (
    <section id="locations" className="bg-cream-dark py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center md:mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Find Us</span>
          <h2 className="mt-3 mb-4 font-serif text-3xl font-bold text-foreground md:text-5xl">
            Where to Find Us
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            Pick up Mame's Cane River Meat Pies at these locations or order online.
          </p>
        </div>

        <div className="mx-auto mb-10 max-w-3xl rounded-lg border border-border bg-card p-5 shadow-md sm:p-6 md:mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cajun/10">
              <Store className="text-cajun" size={22} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-foreground">Available at these Walmart Locations</h3>
              <p className="text-sm text-muted-foreground">Choose your state, then choose a local store.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-cajun">State</span>
              <select
                value={selectedState}
                onChange={(event) => {
                  setSelectedState(event.target.value);
                  setSelectedStoreNumber("");
                }}
                aria-label="Select a state"
                className="h-12 w-full rounded-lg border border-border bg-background px-4 text-left text-sm text-foreground shadow-sm outline-none transition-all focus:ring-2 focus:ring-cajun/40 sm:text-base"
              >
                <option value="">Select a state</option>
                {stateOptions.map((stateOption) => (
                  <option key={stateOption.stateAbbreviation} value={stateOption.stateAbbreviation}>
                    {stateOption.state}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-cajun">
                Local Stores
              </span>
              <select
                value={selectedStoreNumber}
                onChange={(event) => setSelectedStoreNumber(event.target.value)}
                aria-label="Select a local Walmart store"
                disabled={!selectedState}
                className="h-12 w-full rounded-lg border border-border bg-background px-4 text-left text-sm text-foreground shadow-sm outline-none transition-all focus:ring-2 focus:ring-cajun/40 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
              >
                <option value="">{selectedState ? "Select a local store" : "Choose a state first"}</option>
                {localStores.map((store) => (
                  <option key={store.storeNumber} value={store.storeNumber}>
                    {store.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedStore ? (
            <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-cajun">
                Store #{selectedStore.storeNumber}
              </p>
              <p className="mt-1 font-serif text-lg font-bold text-foreground">Walmart {selectedStore.city}</p>
              <p className="mt-2 text-sm font-medium text-foreground">Address: {selectedStore.address}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedStore.city}, {selectedStore.state}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mx-auto mb-10 grid max-w-3xl gap-6 md:mb-12 md:grid-cols-2 md:gap-8">
          {locations.map((loc) => (
            <div
              key={loc.name}
              className="rounded-2xl border border-border bg-card p-6 text-center shadow-md transition-all duration-300 hover:shadow-xl sm:p-8"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cajun/10 mb-4">
                <MapPin className="text-cajun" size={24} />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">{loc.name}</h3>
              <p className="text-muted-foreground text-sm mb-6">{loc.details}</p>
              <a
                href={loc.link}
                target={loc.link !== "#" ? "_blank" : undefined}
                rel={loc.link !== "#" ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-full border-2 border-cajun px-6 py-2.5 text-sm font-semibold text-cajun transition-all hover:bg-cajun hover:text-cream"
              >
                Visit Location
              </a>
            </div>
          ))}
        </div>

        {/* Featured partner */}
        <div className="mx-auto max-w-2xl rounded-2xl bg-charcoal p-6 text-center shadow-xl sm:p-8 md:p-12">
          <span className="text-gold text-sm font-semibold uppercase tracking-widest">Featured Partner</span>
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-cream mt-3 mb-4">
            Ratcliff Premium Meats
          </h3>
          <p className="mx-auto mb-8 max-w-md text-sm text-cream/70 sm:text-base">
            Find our pies at the Ratcliff Premium Meats booth inside Frisco Fresh Market.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-center font-semibold text-charcoal transition-all hover:bg-gold-light hover:shadow-lg sm:px-8"
          >
            Ask About Pickup
          </a>
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;
