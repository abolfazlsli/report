"use client";

import { useEffect, useState } from "react";
import { API_URL, ApiError, getToken } from "./api";
import type { User } from "./types";

/*
 * Photos are served only to signed-in users, so an <img src> can't load them
 * directly (no Authorization header). We fetch them once as blobs and share
 * the object URL; the version in the key changes whenever the photo does.
 */
const cache = new Map<string, Promise<string | null>>();

export function avatarObjectUrl(userId: number, version: number): Promise<string | null> {
  const key = `${userId}:${version}`;
  let p = cache.get(key);
  if (!p) {
    const token = getToken();
    p = fetch(`${API_URL}/auth/users/${userId}/avatar?v=${version}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? URL.createObjectURL(b) : null))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}

export function useAvatarUrl(userId: number | undefined, version: number | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!userId || !version) {
      setUrl(null);
      return;
    }
    let live = true;
    avatarObjectUrl(userId, version).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [userId, version]);
  return url;
}

const SIZE = 256;

/** Center-crop to a square, scale to 256px and re-encode as JPEG (also drops EXIF/location data). */
export async function prepareAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ApiError(400, "این فایل تصویر معتبری نیست");
  });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background in JPEG
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new ApiError(400, "پردازش تصویر ناموفق بود"))), "image/jpeg", 0.88),
  );
}

export async function uploadAvatar(blob: Blob): Promise<User> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/avatar`, {
      method: "PUT",
      headers: { "Content-Type": blob.type || "image/jpeg", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: blob,
    });
  } catch {
    throw new ApiError(0, "ارتباط با سرور برقرار نشد");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.detail ?? "بارگذاری تصویر ناموفق بود");
  return body as User;
}
