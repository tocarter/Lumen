export default function FocusMiniLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html,body{background:transparent!important;min-height:0}`}</style>
      {children}
    </>
  );
}
