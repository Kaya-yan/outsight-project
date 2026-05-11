import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { email, password, username } = await request.json();

  if (!email || !password || !username) {
    return NextResponse.json({ error: "邮箱、密码和用户名都是必填的" }, { status: 400 });
  }

  if (username.trim().length < 2) {
    return NextResponse.json({ error: "用户名至少需要两个字符" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少需要六位字符" }, { status: 400 });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  // 1. Try sign in with password
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInError) {
    return NextResponse.json({
      success: true,
      user: signInData.user,
      message: "登录成功",
    });
  }

  // 2. If login fails, try to auto-register
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: username.trim() },
    },
  });

  if (signUpError) {
    if (signUpError.code === "user_already_exists" || signUpError.status === 422) {
      return NextResponse.json({ error: "密码错误，请重试" }, { status: 400 });
    }
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  if (signUpData.session) {
    return NextResponse.json({
      success: true,
      user: signUpData.user,
      message: "账号已创建并登录",
    });
  }

  // signUp succeeded but no session — email confirmation likely required
  return NextResponse.json({
    success: true,
    user: signUpData.user,
    message: "账号已创建，请检查邮箱确认链接",
  });
}
