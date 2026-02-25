import TTTHeader from "../components/TTTHeader";
import TTTFooter from "../components/TTTFooter";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <TTTHeader />
      <main className="flex-grow">{children}</main>
      <TTTFooter />
    </div>
  );
}
