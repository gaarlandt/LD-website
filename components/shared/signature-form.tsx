export function SignatureForm() {
  return (
    <div className="mt-6 space-y-3 text-[#141414]/70 text-[15px]">
      <p>
        Naam:{" "}
        <span className="inline-block min-w-[12rem] border-b border-[#141414]/30 ml-2 align-baseline">
          &nbsp;
        </span>
      </p>
      <p>
        Datum:{" "}
        <span className="inline-block min-w-[12rem] border-b border-[#141414]/30 ml-2 align-baseline">
          &nbsp;
        </span>
      </p>
      <p>
        Handtekening:{" "}
        <span className="inline-block min-w-[12rem] border-b border-[#141414]/30 ml-2 align-baseline">
          &nbsp;
        </span>
      </p>
    </div>
  );
}
