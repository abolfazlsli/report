"use client";

import { CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import { Avatar, Button, Flex, Popconfirm, Typography, Upload } from "antd";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { prepareAvatar, uploadAvatar, useAvatarUrl } from "@/lib/avatar";
import type { User, UserBrief } from "@/lib/types";
import { useAction } from "./ui";

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("‌");

/** Profile photo, or the user's initials when they haven't set one. */
export function UserAvatar({ user, size = 32, style }: { user: UserBrief; size?: number; style?: React.CSSProperties }) {
  const src = useAvatarUrl(user.id, user.avatar_version);
  return (
    <Avatar
      size={size}
      src={src ?? undefined}
      alt={user.full_name}
      style={{ background: src ? undefined : "linear-gradient(135deg,#6366f1,#a855f7)", flexShrink: 0, fontSize: size * 0.38, ...style }}
    >
      {initials(user.full_name)}
    </Avatar>
  );
}

const MAX_INPUT = 10 * 1024 * 1024; // before resizing; the stored photo is ~20-40KB

/** Large avatar with upload / remove controls for the signed-in user. */
export function AvatarEditor() {
  const { user, updateUser } = useAuth();
  const run = useAction();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function pick(file: File) {
    setBusy(true);
    await run(async () => {
      if (!file.type.startsWith("image/")) throw new Error("لطفاً یک فایل تصویری انتخاب کنید");
      if (file.size > MAX_INPUT) throw new Error("حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد");
      updateUser(await uploadAvatar(await prepareAvatar(file)));
    }, "عکس پروفایل ذخیره شد");
    setBusy(false);
  }

  return (
    <Flex vertical align="center" gap={12}>
      <div style={{ position: "relative" }}>
        <UserAvatar user={user} size={104} style={{ boxShadow: "0 8px 24px rgba(79,70,229,0.25)" }} />
        <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} beforeUpload={(f) => (pick(f), false)} disabled={busy}>
          <Button
            shape="circle"
            type="primary"
            icon={<CameraOutlined />}
            loading={busy}
            aria-label="انتخاب عکس پروفایل"
            style={{ position: "absolute", bottom: 0, insetInlineStart: 0, border: "3px solid var(--surface)" }}
          />
        </Upload>
      </div>
      <Flex gap={8}>
        <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} beforeUpload={(f) => (pick(f), false)} disabled={busy}>
          <Button size="small" icon={<CameraOutlined />} disabled={busy}>
            {user.avatar_version ? "تغییر عکس" : "افزودن عکس"}
          </Button>
        </Upload>
        {user.avatar_version && (
          <Popconfirm
            title="عکس پروفایل حذف شود؟"
            okText="حذف"
            cancelText="انصراف"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              setBusy(true);
              await run(async () => updateUser(await api<User>("/auth/avatar", { method: "DELETE" })), "عکس حذف شد");
              setBusy(false);
            }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={busy}>
              حذف
            </Button>
          </Popconfirm>
        )}
      </Flex>
      <Typography.Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>
        JPG، PNG یا WebP — تصویر به‌صورت مربعی برش می‌خورد.
      </Typography.Text>
    </Flex>
  );
}
