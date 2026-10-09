import { Suspense } from "react";
import IframeResizer from "./IframeResizer";
import HubBackLink from "./HubBackLink";

export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Allow body to scroll as a fallback when the parent iframe isn't resized
          to match content height (mobile Safari can lag, and some hosts cap
          iframe height). The parent still receives FORM_HEIGHT via postMessage,
          so when resizing works the body fits its viewport and no scrollbar shows. */}
      <style>{`html, body { margin: 0; padding: 0; }`}</style>
      <div className="w-full" data-embed-content>
        <Suspense fallback={null}>
          <HubBackLink />
        </Suspense>
        {children}
        <IframeResizer />
      </div>
    </>
  );
}
