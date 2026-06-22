import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useBuilding } from "@/state/building";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const { isLoggedIn } = useBuilding.getState();
    if (isLoggedIn) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Delta Carbon — Sign in" }],
  }),
});

function LoginPage() {
  const login = useBuilding((s) => s.login);
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    login();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[320px] flex flex-col items-center gap-8">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#1a4731" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#111111" }}>
            Delta Carbon
          </h1>
          <p className="text-sm text-center leading-relaxed" style={{ color: "#6B7280" }}>
            Upfront carbon assessment.<br />First hour of design.
          </p>
        </div>

        {/* Google button */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors text-sm font-medium text-[#111111]"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        {/* Terms */}
        <p className="text-[10px] text-center" style={{ color: "#9CA3AF" }}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
