"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { validPin } from "@/lib/username";

export function ChangePinForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    if (!validPin(next)) {
      setMessage("PIN baru harus 8 angka dan tidak boleh menggunakan pola yang mudah ditebak.");
      return;
    }
    if (next !== confirm) {
      setMessage("Konfirmasi PIN baru tidak sama.");
      return;
    }
    if (current === next) {
      setMessage("PIN baru harus berbeda dari PIN sebelumnya.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true
      });
      if (error) {
        setMessage(error.status === 429
          ? "Terlalu banyak percobaan. Silakan coba kembali beberapa saat lagi."
          : "PIN lama salah atau perubahan PIN gagal. Periksa kembali.");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setSuccess(true);
      setMessage("PIN berhasil diubah. Sesi login di perangkat lain telah dicabut.");
    } catch {
      setMessage("Tidak dapat mengganti PIN. Periksa koneksi internet dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="stack-form" style={{ padding: 24, maxWidth: 480, marginTop: 0 }}>
    <label>PIN saat ini
      <input value={current} type="password" inputMode="numeric" autoComplete="current-password"
        minLength={8} maxLength={8} pattern="[0-9]{8}" required
        placeholder="8 angka PIN saat ini"
        onChange={e=>setCurrent(e.target.value.replace(/\D/g, "").slice(0, 8))} />
    </label>
    <label>PIN baru
      <input value={next} type="password" inputMode="numeric" autoComplete="new-password"
        minLength={8} maxLength={8} pattern="[0-9]{8}" required
        placeholder="Buat 8 angka PIN baru"
        onChange={e=>setNext(e.target.value.replace(/\D/g, "").slice(0, 8))} />
    </label>
    <label>Konfirmasi PIN baru
      <input value={confirm} type="password" inputMode="numeric" autoComplete="new-password"
        minLength={8} maxLength={8} pattern="[0-9]{8}" required
        placeholder="Ulangi PIN baru"
        onChange={e=>setConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))} />
    </label>
    {message && <p role="status" className={success ? "success-notice" : "form-error"}>{message}</p>}
    <button className="primary-button" type="submit" disabled={busy}>
      {busy ? "Menyimpan perubahan..." : "Simpan PIN Baru"}
    </button>
    <p className="small-muted">Gunakan PIN unik untuk akun ini. Hindari angka berurutan, angka berulang, dan tanggal lahir.</p>
  </form>;
}
