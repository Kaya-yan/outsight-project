import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "请填写当前密码和新密码" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少需要六位字符" }, { status: 400 });
  }

  // Re-authenticate with current password to verify identity
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (reauthError) {
    return NextResponse.json({ error: "当前密码错误" }, { status: 400 });
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "密码已修改" });
}
