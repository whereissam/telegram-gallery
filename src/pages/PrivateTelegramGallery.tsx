import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Image {
  id: number;
  url: string;
  caption: string;
}

const API_URL = "http://localhost:3000/api";

export function PrivateTelegramGallery() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>("");

  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");

  const handleSendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await retryFetch(`${API_URL}/sendCode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send code");
      }

      const data = await response.json();
      setPhoneCodeHash(data.phone_code_hash);
      setShowCodeInput(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Connection failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const retryFetch = async (
    url: string,
    options: RequestInit,
    maxRetries = 3
  ) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            "Keep-Alive": "timeout=5, max=1000",
          },
        });
        return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await retryFetch(`${API_URL}/signIn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          code: verificationCode,
          phone_code_hash: phoneCodeHash,
        }),
      });

      const data = await response.json();

      if (data.requiresPassword) {
        setNeedsPassword(true);
      } else if (!response.ok) {
        throw new Error(data.error || "Failed to sign in");
      } else {
        setIsAuthenticated(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedMessages = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: "GET",
        credentials: "include", // Include session cookie
      });

      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();
      setImages(
        data.messages.map((msg: any) => ({
          id: msg.id,
          url: msg.imageUrl,
          caption: msg.caption || `Image ${msg.id}`,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch images");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/verify-2fa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify password");
      }

      setIsAuthenticated(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Password verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeout = 30000
  ) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;
    if (isAuthenticated && mounted) {
      fetchSavedMessages();
    }
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Connect to Telegram</h2>
            <div className="space-y-4">
              {!showCodeInput ? (
                <Input
                  type="tel"
                  placeholder="Phone number (e.g., +1234567890)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                />
              ) : needsPassword ? (
                <Input
                  type="password"
                  placeholder="Enter your 2FA password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              ) : (
                <Input
                  type="text"
                  placeholder="Verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={loading}
                />
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button
                onClick={
                  needsPassword
                    ? handlePasswordSubmit
                    : showCodeInput
                      ? handleSignIn
                      : handleSendCode
                }
                className="w-full"
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : needsPassword
                    ? "Verify Password"
                    : showCodeInput
                      ? "Sign In"
                      : "Send Code"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Your Private Gallery</h1>
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search your images..."
            className="max-w-md"
          />
          <Button
            variant="outline"
            onClick={fetchSavedMessages}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading your images...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="relative aspect-video mb-2">
                  <img
                    src={image.url}
                    alt={image.caption}
                    className="object-cover rounded-lg"
                  />
                </div>
                <p className="text-sm text-gray-600">{image.caption}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
