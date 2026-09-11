export default function AuthLayout({ children }: Readonly<LayoutProps<"/">>) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(1100px 460px at 50% 0%, var(--color-subtle), var(--color-bg))",
      }}
    >
      {children}
    </div>
  );
}
