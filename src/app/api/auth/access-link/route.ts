import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileById } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // Only admins can generate access links
  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可生成访问链接" }, { status: 403 });
  }

  const { email, expiresInHours = 24 } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "邮箱为必填项" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `访问链接已生成，有效期 ${expiresInHours} 小时`,
    link: data.properties?.email_otp,
  });
}
