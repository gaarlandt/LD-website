const items = [
  { value: "Gratis", label: "meedoen, altijd" },
  { value: "Eigen code", label: "óf betaalde opdracht" },
  { value: "Verdien", label: "mee met je content" },
  { value: "Persoonlijk", label: "contact, geen gedoe" },
];

export function PartnersTrust() {
  return (
    <section className="bg-white border-b border-[var(--ld-border)] px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-x-14 gap-y-7 text-center">
        {items.map(({ value, label }) => (
          <div key={value} className="text-[15px] text-[var(--ld-text-muted)]">
            <b className="block font-heading font-bold text-2xl text-[var(--ld-text)] tracking-tight">
              {value}
            </b>
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
