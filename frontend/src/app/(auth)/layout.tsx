export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#181d24] text-white">
      <style>{`
        html, body {
          background-color: #181d24 !important;
          color: #ffffff !important;
        }
      `}</style>
      {children}
    </div>
  );
}
