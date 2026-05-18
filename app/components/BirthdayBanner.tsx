export default function BirthdayBanner({ name }: { name: string }) {
  return (
    <section
      className="cg-card p-5 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--cg-cream) 0%, #f5d99a 100%)",
      }}
    >
      <div className="absolute -right-4 -top-4 text-7xl opacity-30 select-none">
        🎂
      </div>
      <div className="relative">
        <p
          className="text-xs uppercase tracking-wider font-semibold"
          style={{ color: "var(--cg-leaf-dark)" }}
        >
          Vandaag
        </p>
        <h2
          className="mt-1 text-xl font-bold"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          🎉 Gefeliciteerd, {name}!
        </h2>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--cg-ink)" }}
        >
          Je krijgt vandaag een <strong>gratis drankje van het huis</strong>.
          Laat je QR aan de barista zien — die zet het apart in van je stempelkaart.
        </p>
      </div>
    </section>
  );
}
