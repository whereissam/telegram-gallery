import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, KeyRound, ShieldCheck, Loader2, ArrowRight } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

type AuthStep = "phone" | "code" | "2fa";

const STEPS: { key: AuthStep; label: string; icon: typeof Phone }[] = [
  { key: "phone", label: "Phone", icon: Phone },
  { key: "code", label: "Code", icon: KeyRound },
  { key: "2fa", label: "2FA", icon: ShieldCheck },
];

interface AuthFormProps {
  onAuthenticated: () => void;
}

export function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retryFetch = async (
    url: string,
    options: RequestInit,
    maxRetries = 3
  ): Promise<Response> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetch(url, options);
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw new Error("Max retries exceeded");
  };

  const handleSendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await retryFetch(`${API_URL}/sendCode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send code");
      }

      const data = await response.json();
      setPhoneCodeHash(data.phone_code_hash);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await retryFetch(`${API_URL}/signIn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber,
          code: verificationCode,
          phone_code_hash: phoneCodeHash,
        }),
      });

      const data = await response.json();

      if (data.requiresPassword) {
        setStep("2fa");
      } else if (!response.ok) {
        throw new Error(data.error || "Failed to sign in");
      } else {
        onAuthenticated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await retryFetch(`${API_URL}/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify password");
      }
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (step === "phone") handleSendCode();
    else if (step === "code") handleSignIn();
    else handleVerify2FA();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleSubmit();
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle, hsl(199 89% 58%) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStepIndex;
            const isComplete = i < currentStepIndex;

            return (
              <div key={s.key} className="flex items-center gap-3">
                {i > 0 && (
                  <div
                    className="w-8 h-px transition-colors duration-500"
                    style={{
                      backgroundColor: isComplete
                        ? "hsl(199 89% 58%)"
                        : "hsl(220 13% 20%)",
                    }}
                  />
                )}
                <div
                  className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500"
                  style={{
                    background: isActive
                      ? "hsl(199 89% 58%)"
                      : isComplete
                        ? "hsl(199 89% 58% / 0.2)"
                        : "hsl(220 14% 14%)",
                    animation: isActive ? "step-pulse 2s ease-in-out infinite" : "none",
                  }}
                >
                  <Icon
                    className="w-4 h-4 transition-colors duration-300"
                    style={{
                      color: isActive
                        ? "hsl(220 20% 6%)"
                        : isComplete
                          ? "hsl(199 89% 58%)"
                          : "hsl(215 12% 50%)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight mb-1">
              {step === "phone" && "Connect to Telegram"}
              {step === "code" && "Enter verification code"}
              {step === "2fa" && "Two-step verification"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "phone" && "Enter your phone number to get started"}
              {step === "code" && "Check your Telegram app for the code"}
              {step === "2fa" && "Enter your cloud password"}
            </p>
          </div>

          <div className="space-y-4" onKeyDown={handleKeyDown}>
            {step === "phone" && (
              <Input
                type="tel"
                placeholder="+1 234 567 8900"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
                className="h-11 bg-secondary/50 border-border/50 text-base placeholder:text-muted-foreground/60"
                autoFocus
              />
            )}

            {step === "code" && (
              <Input
                type="text"
                placeholder="12345"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={loading}
                className="h-11 bg-secondary/50 border-border/50 text-base tracking-[0.3em] text-center font-mono placeholder:tracking-normal placeholder:text-muted-foreground/60"
                maxLength={6}
                autoFocus
              />
            )}

            {step === "2fa" && (
              <Input
                type="password"
                placeholder="Cloud password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 bg-secondary/50 border-border/50 text-base placeholder:text-muted-foreground/60"
                autoFocus
              />
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              className="w-full h-11 font-medium text-sm gap-2 bg-[hsl(199,89%,58%)] hover:bg-[hsl(199,89%,50%)] text-[hsl(220,20%,6%)] cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {step === "phone" && "Send Code"}
                  {step === "code" && "Verify"}
                  {step === "2fa" && "Unlock"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          Your session stays on this device only
        </p>
      </div>
    </div>
  );
}
