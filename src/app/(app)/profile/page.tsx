"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Shield, Key, Eye, EyeOff, BookOpen, Globe, AlertTriangle, Trash2, X } from "lucide-react";

// Earth image import
import earthPng from "@/../reference/地球.png";

// ── constants ──
const roleMap: Record<string, string> = {
  admin: "管理员", lead_researcher: "组长", researcher: "研究员", coder: "编码员", viewer: "观察员",
};
const ACADEMIC_QUOTES = [
  { text: "The archive is not a tomb; it is a living record of how the world speaks.", author: "OutEye Research" },
  { text: "Patterns do not emerge from noise — they emerge from patience.", author: "Discourse Studies" },
  { text: "Every headline is a data point; every article, a fragment of narrative.", author: "Media Analytics" },
  { text: "To read the world, one must first index it.", author: "Corpus Linguistics" },
  { text: "Frameworks do not constrain thought — they make thought visible.", author: "Coding Theory" },
  { text: "A single article whispers. A corpus speaks.", author: "Computational Discourse" },
  { text: "The map of discourse is drawn one annotation at a time.", author: "Qualitative Methods" },
  { text: "Sentiment is not opinion — it is weather. Measure it, don't judge it.", author: "NLP Research" },
  { text: "Consistency is the quiet engine of discovery.", author: "Research Practice" },
  { text: "Between the lines of news lies the architecture of understanding.", author: "Critical Discourse" },
  { text: "Data without framework is noise. Framework without data is speculation.", author: "Mixed Methods" },
  { text: "The researcher's craft: observe, annotate, reflect, repeat.", author: "Grounded Theory" },
  { text: "What we code today becomes the lens through which we see tomorrow.", author: "Content Analysis" },
  { text: "The most important signal is often the one we almost overlooked.", author: "Research Notes" },
  { text: "A corpus grows not by breadth alone, but by depth of attention.", author: "Corpus Design" },
];
const dayQuote = () => ACADEMIC_QUOTES[new Date().getDate() % ACADEMIC_QUOTES.length];

// ── terms of service ──
const TERMS_TEXT = `OutEye 2.0 用户服务协议

一、 服务性质
OutEye 2.0（以下简称"本平台"）是由研究团队开发的学术话语研究协作平台，旨在为英语主流媒体涉华报道的话语分析提供轻量化基础设施。

二、 数据使用条款
1. 本平台所采集、存储、分析的所有新闻语料，仅限用于学术科研目的，包括但不限于话语分析、内容分析、框架研究、叙事分析、情感分析等学术研究方法。
2. 用户不得将平台数据用于商业目的、新闻报道、舆论操控、政治宣传或任何非学术用途。
3. 用户不得将平台原始语料直接转载、发布或传播至公共网络空间。
4. 用户在学术出版物中使用本平台数据时，应注明数据来源为 OutEye 2.0 研究平台。

三、 用户责任
1. 用户应妥善保管账号密码，不得将账号共享给未经授权的人员。
2. 用户在研究过程中应遵守学术伦理规范，不得篡改数据或伪造分析结果。
3. 用户上传的补充语料应确保已获得合法使用权。

四、 数据安全
1. 本平台采用 Supabase 提供的行业标准数据加密与访问控制。
2. 用户研究数据归用户所在研究团队所有，平台不主张任何数据所有权。
3. 平台保留为改进服务质量而匿名化使用聚合统计数据的权利。

五、 免责声明
1. 本平台提供的 AI 分析结果仅供参考，不构成任何形式的专业建议。
2. 本平台不对因网络故障、第三方服务中断等原因导致的数据丢失承担责任。
3. 本平台保留随时更新本协议的权利，更新后的协议将在平台上公布。

通过使用本平台，即表示您已阅读并同意上述条款。`;

// ── Earth image with circular crop + fade-in + fallback ──
function EarthImage() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Graceful fallback: dark circle placeholder
    return (
      <div
        className="rounded-full bg-[rgba(4,14,36,0.9)] flex items-center justify-center"
        style={{ width: 160, height: 160 }}
      >
        <Globe className="h-10 w-10 text-[#4A90A4]/20" />
      </div>
    );
  }

  return (
    <img
      src={earthPng.src}
      alt="Earth"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      style={{
        width: 160,
        height: 160,
        borderRadius: "50%",
        objectFit: "cover",
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.5s ease",
        border: "1px solid rgba(74,144,164,0.12)",
      }}
    />
  );
}

// ── source bar chart ──
const BAR_COLORS = ["#4A90A4", "#5DAD93", "#2D3436", "#7F8A93", "#E67E22", "#4A6FA5"];
function SourceBars({ byMedia }: { byMedia: Record<string, number> }) {
  const entries = Object.entries(byMedia).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  if (entries.length === 0) return <p className="text-xs text-[#95A5A6] py-4 text-center">暂无语料数据</p>;
  return (
    <div className="space-y-2">
      {entries.map(([name, count], i) => (
        <div key={name} className="flex items-center gap-2">
          <span className="text-[11px] text-[#7F8A93] w-16 text-right shrink-0 truncate">{name}</span>
          <div className="flex-1 h-4 bg-[#F0F2F5] rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-700 ease-out"
              style={{ width: `${(count / max) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
            />
          </div>
          <span className="text-[11px] font-mono text-[#2D3436] w-10 shrink-0">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ── page component ──
export default function ProfilePage() {
  const { profile } = useAuthStore();
  const { stats, fetchStats } = useDashboardStore();
  const [motto, setMotto] = useState("");
  const [editingMotto, setEditingMotto] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // Terms modal
  const [showTerms, setShowTerms] = useState(false);
  // Delete dialog
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (!profile) {
    return <div className="max-w-lg py-12"><p className="text-sm text-[#7F8A93] text-center">未登录</p></div>;
  }

  const initials = (profile.display_name || profile.username).slice(0, 2).toUpperCase();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null);
    if (!currentPassword) return setPwMsg({ type: "error", text: "请输入当前密码" });
    if (newPassword.length < 6) return setPwMsg({ type: "error", text: "新密码至少需要六位字符" });
    if (newPassword !== confirmPassword) return setPwMsg({ type: "error", text: "两次输入的新密码不一致" });
    setPwSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const json = await res.json();
      if (res.ok) { setPwMsg({ type: "success", text: "密码修改成功" }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
      else setPwMsg({ type: "error", text: json.error ?? "密码修改失败" });
    } catch { setPwMsg({ type: "error", text: "网络连接失败" }); }
    finally { setPwSubmitting(false); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== profile!.email) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST" });
      if (res.ok) window.location.href = "/login";
      else alert("注销失败，请重试");
    } catch { alert("网络连接失败"); }
    finally { setDeleting(false); }
  }

  const quote = dayQuote();

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ═══ User Identity Banner ═══ */}
      <div className="flex items-center gap-4 p-5 bg-white rounded-lg border border-[#E2E5E9] shadow-sm">
        <Avatar size="lg">
          <AvatarFallback className="bg-[#4A90A4] text-white text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-[#2D3436]">{profile.display_name || profile.username}</h1>
            <Badge className="text-[10px]">{roleMap[profile.role] ?? profile.role}</Badge>
          </div>
          <p className="text-xs text-[#7F8A93] mt-0.5 flex items-center gap-1"><Mail className="h-3 w-3" />{profile.email}</p>
          <div className="mt-2 flex items-center gap-2">
            {editingMotto ? (
              <form onSubmit={(e) => { e.preventDefault(); setEditingMotto(false); }} className="flex items-center gap-2 flex-1">
                <Input value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="输入你的研究格言..." className="h-7 text-xs border-[#E2E5E9] flex-1" autoFocus />
                <Button type="submit" size="sm" className="h-7 text-xs bg-[#4A90A4] text-white">保存</Button>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingMotto(false)}>取消</Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setEditingMotto(true)}>
                <BookOpen className="h-3.5 w-3.5 text-[#95A5A6]" />
                <span className={`text-xs ${motto ? "text-[#2D3436] italic" : "text-[#95A5A6]"}`}>
                  {motto || "点击设置研究格言..."}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Daily Academic Quote ═══ */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#4A90A4]/5 to-transparent rounded-lg border-l-2 border-[#4A90A4]">
        <p className="text-sm text-[#2D3436] italic">&ldquo;{quote.text}&rdquo;</p>
        <p className="text-[11px] text-[#95A5A6] mt-1">— {quote.author}</p>
      </div>

      {/* ═══ Main 2-Column Layout ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left column (3/5) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Profile Info Card */}
          <Card className="border-[#E2E5E9] shadow-sm">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-[#2D3436] mb-4 flex items-center gap-2"><User className="h-4 w-4 text-[#4A90A4]" />个人资料</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[#7F8A93] text-xs">用户名</span><p className="text-[#2D3436]">{profile.username}</p></div>
                <div><span className="text-[#7F8A93] text-xs">邮箱</span><p className="text-[#2D3436] truncate">{profile.email}</p></div>
                <div><span className="text-[#7F8A93] text-xs">角色</span><p className="text-[#2D3436]">{roleMap[profile.role] ?? profile.role}</p></div>
                <div><span className="text-[#7F8A93] text-xs">机构</span><p className="text-[#2D3436]">{profile.institution || "未设置"}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card className="border-[#E2E5E9] shadow-sm">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-[#2D3436] mb-4 flex items-center gap-2"><Key className="h-4 w-4 text-[#4A90A4]" />修改密码</h2>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="relative">
                  <Input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-9 pr-9 border-[#E2E5E9] text-sm focus-visible:ring-[#4A90A4]" placeholder="当前密码" />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#95A5A6]">{showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
                <div className="relative">
                  <Input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-9 pr-9 border-[#E2E5E9] text-sm focus-visible:ring-[#4A90A4]" placeholder="新密码（至少6位）" />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#95A5A6]">{showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-9 border-[#E2E5E9] text-sm focus-visible:ring-[#4A90A4]" placeholder="确认新密码" />
                {pwMsg && <p className={`text-xs rounded px-3 py-2 ${pwMsg.type === "success" ? "text-[#5DAD93] bg-[#5DAD93]/5" : "text-[#E67E22] bg-[#E67E22]/5"}`}>{pwMsg.text}</p>}
                <Button type="submit" disabled={pwSubmitting} className="h-9 text-sm w-full bg-[#4A90A4] hover:bg-[#3D7D8F] text-white">{pwSubmitting ? "修改中..." : "修改密码"}</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column (2/5) — Globe + Source Distribution */}
        <div className="lg:col-span-2">
          <Card className="border-[#E2E5E9] shadow-sm">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-[#2D3436] mb-1 flex items-center gap-2"><Globe className="h-4 w-4 text-[#4A90A4]" />语料来源分布</h2>
              <p className="text-xs text-[#7F8A93] mb-4">团队语料库 · 共 {stats?.totalArticles ?? 0} 篇</p>
              <div className="flex justify-center my-4">
                <EarthImage />
              </div>
              <div className="pt-4 border-t border-[#F0F2F5]">
                <SourceBars byMedia={stats?.byMedia ?? {}} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Terms of Service ═══ */}
      <Card className="border-[#E2E5E9] shadow-sm cursor-pointer hover:border-[#4A90A4]/30 transition-colors" onClick={() => setShowTerms(true)}>
        <CardContent className="p-4 flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-[#4A90A4]" />
          <div className="flex-1"><p className="text-sm text-[#2D3436]">用户服务协议</p><p className="text-xs text-[#7F8A93]">查看 OutEye 2.0 使用条款与数据政策</p></div>
          <span className="text-[#95A5A6] text-xs">查看 →</span>
        </CardContent>
      </Card>

      {/* ═══ Danger Zone ═══ */}
      <Card className="border-[#E67E22]/20 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-[#E67E22]" />
            <div><p className="text-sm font-medium text-[#E67E22]">危险操作区</p><p className="text-xs text-[#7F8A93]">注销账号后所有个人数据将被永久删除，不可恢复</p></div>
          </div>
          <Button variant="outline" className="h-8 text-xs text-[#E67E22] border-[#E67E22]/30 hover:bg-[#E67E22]/5" onClick={() => setShowDelete(true)}><Trash2 className="h-3.5 w-3.5 mr-1" />注销账号</Button>
        </CardContent>
      </Card>

      {/* ═══ Terms Modal ═══ */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowTerms(false)} />
          <Card className="relative z-10 w-full max-w-lg max-h-[80vh] border-[#E2E5E9] shadow-lg overflow-hidden flex flex-col">
            <CardContent className="p-5 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#2D3436]">OutEye 2.0 用户服务协议</h3>
                <button onClick={() => setShowTerms(false)} className="text-[#95A5A6] hover:text-[#2D3436]"><X className="h-4 w-4" /></button>
              </div>
              <pre className="text-xs text-[#2D3436] whitespace-pre-wrap font-sans leading-relaxed">{TERMS_TEXT}</pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Delete Confirmation Modal ═══ */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }} />
          <Card className="relative z-10 w-full max-w-md border-[#E67E22]/20 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5 text-[#E67E22]" /><h3 className="text-sm font-semibold text-[#2D3436]">确认注销账号</h3></div>
              <div className="space-y-2 mb-5 text-xs text-[#7F8A93] bg-[#E67E22]/5 rounded-md p-3">
                <p>• 此操作将永久删除您的账号、个人资料及所有关联数据。</p>
                <p>• 注销后不可恢复，不可重新激活。</p>
                <p>• 请确认您已备份所有需要保留的研究数据。</p>
              </div>
              <div className="space-y-1.5 mb-5">
                <label className="text-xs text-[#7F8A93]">请输入您的邮箱 <span className="font-mono font-semibold text-[#2D3436]">{profile.email}</span> 以确认注销</label>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={profile.email} className="h-9 text-sm border-[#E2E5E9] focus-visible:ring-[#E67E22] font-mono" autoComplete="off" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-9 text-xs" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}>取消</Button>
                <Button disabled={deleteConfirm !== profile.email || deleting} onClick={handleDeleteAccount} className="h-9 text-xs text-white bg-[#E67E22] hover:bg-[#D46E1A] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed">{deleting ? "注销中..." : "确认注销"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
