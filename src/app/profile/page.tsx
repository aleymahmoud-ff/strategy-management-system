"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/fetch";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(session?.user.name ?? "");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(session?.user.image ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!session) return null;

  const initials = session.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be under 2MB" });
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      let imageData: string | null | undefined = undefined;
      if (photoFile) {
        const reader = new FileReader();
        imageData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(photoFile);
        });
      } else if (photoPreview === null && session?.user.image) {
        imageData = null; // explicitly removing photo
      }

      const res = await apiFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, image: imageData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update profile");
      }

      await updateSession();
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters" });
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-8 py-10">
      <h1 className="font-heading text-2xl font-bold text-text-hd">Profile Settings</h1>
      <p className="mt-1 text-[13px] text-text-sub">Manage your account details and preferences</p>

      {message && (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-[13px] ${
            message.type === "success"
              ? "border-green/20 bg-green/5 text-green"
              : "border-red/20 bg-red-bg text-red"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Photo Section */}
      <section id="photo" className="mt-8 scroll-mt-20">
        <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-sub">Profile Photo</h2>
        <div className="mt-4 flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-bg-mid">
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Profile"
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-brown">{initials}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-border bg-bg-mid px-3.5 py-2 text-[12px] font-semibold text-text-bd transition-all hover:border-brown/30 hover:text-brown"
              >
                Upload Photo
              </button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="rounded-lg border border-border bg-bg-mid px-3.5 py-2 text-[12px] font-semibold text-red transition-all hover:border-red/30"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-mut">JPG, PNG or WebP. Max 2MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
        </div>
      </section>

      {/* Profile Details */}
      <form onSubmit={handleSaveProfile} className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-sub">Account Details</h2>
        <div className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">Role</label>
            <input
              type="text"
              value={ROLE_LABELS[session.user.role] ?? session.user.role}
              disabled
              className="rounded-lg border border-border bg-bg-mid px-3.5 py-2.5 text-[13px] text-text-sub"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page transition-all hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="mt-12 border-t border-border pt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-sub">Change Password</h2>
        <div className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page transition-all hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Change Password"}
        </button>
      </form>
    </main>
  );
}

const ROLE_LABELS: Record<string, string> = {
  STRATEGY_MANAGER: "Strategy Manager",
  FUNCTION_HEAD: "Function Head",
  EXECUTIVE: "Executive",
};
