import IframeResizer from "./IframeResizer";

export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Suppress internal scrollbars — the parent iframe height is set via postMessage instead */}
      <style>{`html, body { overflow: hidden !important; margin: 0; padding: 0; }`}</style>
      <div className="w-full" data-embed-content>
        {children}
        <IframeResizer />
      </div>
    </>
  );
}
