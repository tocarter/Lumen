"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";

export default function SignInView() {
  const [google, setGoogle] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setGoogle(Boolean(d.configured)))
      .catch(() => setGoogle(false));
  }, []);

  return (
    <div className="signin">
      <div className="signin-card">
        <BrandMark size={64} />
        <h1>Lumen</h1>
        <p>Your assignments on one dark board. Focus when you are ready to work.</p>
        {google ? (
          <p style={{ marginTop: 24 }}>
            <button className="btn-gold" type="button" onClick={() => signIn("google")}>
              Continue with Google
            </button>
          </p>
        ) : (
          <p className="meta" style={{ marginTop: 24 }}>
            Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to web/.env.local for Google Sign-In.
            Until then you can use a local profile.
          </p>
        )}
        <p>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => {
              window.localStorage.setItem("lumen.guest", "1");
              window.location.reload();
            }}
          >
            Continue without Google
          </button>
        </p>
      </div>
    </div>
  );
}
