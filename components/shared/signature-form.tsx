export function SignatureForm() {
  return (
    <div className="mt-6 space-y-3 text-[var(--ld-text-muted)] text-[16px]">
      <p>
        Naam:{" "}
        <span className="inline-block min-w-[12rem] border-b border-[var(--ld-border)] ml-2 align-baseline">
          &nbsp;
        </span>
      </p>
      <p>
        Datum:{" "}
        <span className="inline-block min-w-[12rem] border-b border-[var(--ld-border)] ml-2 align-baseline">
          &nbsp;
        </span>
      </p>
      <p>
        Handtekening:{" "}
        <span className="inline-block min-w-[12rem] border-b border-[var(--ld-border)] ml-2 align-baseline">
          &nbsp;
        </span>
      </p>
    </div>
  );
}
