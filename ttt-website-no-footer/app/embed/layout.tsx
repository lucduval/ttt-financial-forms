import Script from "next/script";

export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-0">
      {children}
      <Script id="embed-resize" strategy="afterInteractive">{`
        (function () {
          var lastHeight = 0;
          function postHeight() {
            var h = document.documentElement.scrollHeight;
            if (h !== lastHeight) {
              lastHeight = h;
              window.parent.postMessage(
                { type: "ttt-embed-resize", height: h },
                "*"
              );
            }
          }
          var ro = new ResizeObserver(postHeight);
          ro.observe(document.body);
          setInterval(postHeight, 500);
          postHeight();
        })();
      `}</Script>
    </div>
  );
}
