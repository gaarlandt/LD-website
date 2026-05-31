// Renders a JSON-LD <script>. Server component — no client bundle impact.
//
// SECURITY: dangerouslySetInnerHTML is the canonical (and only correct) way
// to emit JSON-LD in React — `<script>{json}</script>` would HTML-escape the
// JSON and break parsing. It is safe HERE because:
//   1. `data` is exclusively our own trusted, build-time schema objects
//      (no user input ever reaches this component), and
//   2. we escape every "<" to "<", which neutralises any </script>,
//      <!-- or <script breakout regardless of payload.
// Do not pass user-controlled data to this component.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
