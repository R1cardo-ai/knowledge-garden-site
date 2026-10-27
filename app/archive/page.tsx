'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  FileUp,
  FolderOpen,
  History,
  LayoutGrid,
  List,
  Medal,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { withBasePath } from '@/lib/site-path';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { transitionTheme } from '@/lib/theme-transition';

type EntryType = 'knowledge' | 'award';
type EntryFormat = 'note' | 'book' | 'course' | 'article' | 'video' | 'project';
type ViewMode = 'all' | EntryType;
type UpdateLog = { version: string; date: string; title: string; items: string[] };

type Entry = {
  id: string;
  type: EntryType;
  format: EntryFormat;
  title: string;
  category: string;
  date: string;
  summary: string;
  tags: string[];
  color: string;
  notes?: string;
  source?: string;
  issuer?: string;
  awardLevel?: string;
  role?: string;
  proof?: string;
  related?: string;
  updatedAt?: number;
};
type PendingConfirmation =
  | { kind: 'delete'; entry: Entry }
  | { kind: 'import'; entries: Entry[]; replaceCount: number };

type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: object;
  execute: (input: unknown) => unknown;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
};

type ModelContext = {
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

function randomizeCount(value: string, locked: number) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return [...value].map((char, index) => /[A-Z0-9]/i.test(char) && index >= locked ? chars[Math.floor(Math.random() * chars.length)] : char).join('');
}

function AnimatedCount({ value, initialScramble = false, delay = 0 }: { value: number; initialScramble?: boolean; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [scrambleValue, setScrambleValue] = useState<string | null>(null);
  const hasScrambled = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      setScrambleValue(null);
      return;
    }
    if (initialScramble && !hasScrambled.current) {
      let frame = 0;
      let startTime = 0;
      const target = String(value).padStart(2, '0');
      const timer = window.setTimeout(() => {
        hasScrambled.current = true;
        const step = (time: number) => {
          if (!startTime) startTime = time;
          const progress = Math.min((time - startTime) / 620, 1);
          const locked = Math.floor(progress * target.length);
          setScrambleValue(progress >= 1 ? null : randomizeCount(target, locked));
          if (progress < 1) frame = window.requestAnimationFrame(step);
          else setDisplayValue(value);
        };
        frame = window.requestAnimationFrame(step);
      }, delay);
      return () => { window.clearTimeout(timer); window.cancelAnimationFrame(frame); };
    }
    let frame = 0;
    let startTime = 0;
    const startValue = displayValue;
    const duration = 820;
    const step = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(startValue + (value - startValue) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
    // Keep the starting point at the last rendered value when the total changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialScramble, delay]);

  return <span aria-hidden="true">{scrambleValue ?? String(displayValue).padStart(2, '0')}</span>;
}

function ScrambledVersion({ value, trigger }: { value: string; trigger: number }) {
  const [displayValue, setDisplayValue] = useState(value.replace(/^v/, ''));
  useEffect(() => {
    if (!trigger) return;
    const target = value.replace(/^v/, '');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplayValue(target); return; }
    let frame = 0;
    let startTime = 0;
    const tick = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / 420, 1);
      setDisplayValue(progress >= 1 ? target : randomizeCount(target, Math.floor(progress * target.length)));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, trigger]);
  return <span className="archive-release-index" aria-hidden="true">{displayValue}</span>;
}

const starterEntries: Entry[] = [];

const colorStyles: Record<string, string> = { coral: 'card-coral', sky: 'card-sky', lilac: 'card-lilac', mint: 'card-mint', gold: 'card-gold' };
const currentVersion = 'v1.0.195';
const defaultBackgroundImage = '';
const backgroundImageStorageKey = 'knowledge-garden-background-image';
const backgroundOpacityStorageKey = 'knowledge-garden-background-opacity';
const sidebarCollapsedStorageKey = 'knowledge-garden-sidebar-collapsed';
const themeStorageKey = 'theme';
const themeDefaultMigrationKey = 'knowledge-garden-dark-default-v1';
const updateLogs: UpdateLog[] = [
  { version: 'v1.0.195', date: '2026.10.28', title: '让 Pages.dev 正确处理旧项目站点路径', items: ['将 /knowledge-garden-site/* 旧地址重定向到根路径下对应页面', '让 Cloudflare 先运行应用路由，避免静态资源层提前返回 404'] },
  { version: 'v1.0.194', date: '2026.10.28', title: '确保弹窗中的校验提示清晰可见', items: ['把提示渲染到页面顶层，避免添加记录等对话框遮住校验反馈', '为提示添加状态语义，让视觉与辅助技术都能及时读取反馈'] },
  { version: 'v1.0.193', date: '2026.10.28', title: '修复项目站点前缀下的页面跳转', items: ['为 Cloudflare Pages 根目录部署增加仓库路径重写，修复首页、档案和样张请求落入 404', '为应用内与静态样张链接统一加入可配置路径前缀，兼容 GitHub Pages 子路径部署'] },
  { version: 'v1.0.192', date: '2026.10.27', title: '提高等高线背景的清晰度', items: ['增强桌面与窄屏的背景线条对比，让等高线更容易辨认', '打开详情和弹窗时继续降低底纹，保持正文清晰'] },
  { version: 'v1.0.191', date: '2026.10.27', title: '让筛选菜单沿展开方向顺滑进入', items: ['修正筛选菜单对齐触发器时方向属性为 none，导致滑入距离归零的问题', '统一菜单、弹窗和抽屉的展开节奏，让成长轨迹和背景设置同步舒展'] },
  { version: 'v1.0.190', date: '2026.10.27', title: '让筛选菜单和折叠面板顺滑展开', items: ['恢复筛选下拉的淡入与轻微位移动画，并统一弹层节奏', '为成长轨迹和背景设置补上可收起的展开过渡'] },
  { version: 'v1.0.189', date: '2026.10.27', title: '放慢版本号反馈并整理数字间距', items: ['将版本号悬停填色延长到 1.25 秒', '减轻大号数字负字距，避免字符挤压，并按桌面宽度调整字号'] },
  { version: 'v1.0.188', date: '2026.10.27', title: '修复全站数字字体加载', items: ['修正字体文件的加载声明，让日期、版本、统计和正文数字实际使用 Saira', '保持中文回退到中文无衬线字体，代码里的非数字字符继续使用等宽字体'] },
  { version: 'v1.0.187', date: '2026.10.27', title: '全站数字统一使用 Saira', items: ['将正文、日期、版本、统计、交互样张与代码中的阿拉伯数字统一使用 Saira', '保持中文回退到中文无衬线字体，代码里的非数字字符继续使用等宽字体'] },
  { version: 'v1.0.186', date: '2026.10.27', title: '统一中英文和数字字体体系', items: ['根据展示模板，将拉丁字母与字段数字统一到自托管可变 Saira', '让中文标题与阅读内容使用一致的中文无衬线字体回退'] },
  { version: 'v1.0.185', date: '2026.10.27', title: '补充档案列表与成长轨迹反馈', items: ['让记录行在列表切换和筛选时逐行进入，悬停与聚焦时突出索引和操作位置', '为快速记录类型切换与成长轨迹展开增加短促状态反馈'] },
  { version: 'v1.0.184', date: '2026.10.27', title: '为总览首屏补齐展示动效', items: ['加入字标与黄色标语擦入、读数锁定和最新版本交互填色', '让最近更新条平滑循环，并增加线稿与斜纹背板反向视差'] },
  { version: 'v1.0.183', date: '2026.10.27', title: '增加数字递增与封面视差反馈', items: ['让档案统计数字在载入和数据变化时平滑递增', '为线稿面板增加轻量鼠标视差、光线跟随和更新索引扫光'] },
  { version: 'v1.0.182', date: '2026.10.27', title: '为档案总览增加分层动效', items: ['让封面、档案线稿与最近更新依次进入视野', '为线稿描绘、卡片显现和控件反馈增加轻量动效，并尊重减少动态效果设置'] },
  { version: 'v1.0.181', date: '2026.10.27', title: '提高顶部键盘焦点可见度', items: ['让命令栏按钮在深浅主题下都使用高对比焦点框'] },
  { version: 'v1.0.180', date: '2026.10.27', title: '提高宽桌面档案线稿占比', items: ['让档案纸张轮廓接近线稿面板的一半宽度', '按桌面宽度平滑放大，并受视口高度约束'] },
  { version: 'v1.0.179', date: '2026.10.27', title: '让首页字标跨桌面断点连续缩放', items: ['从 1024px 桌面宽度起连续放大 KNOWLEDGE 主字标', '消除 1279–1280px 切换时的字号突跳'] },
  { version: 'v1.0.178', date: '2026.10.27', title: '放大宽桌面档案线稿', items: ['裁去档案插图视口的多余留白，让纸张轮廓更接近参考图占比', '1280px 以上桌面按宽度渐进增加绘图区高度'] },
  { version: 'v1.0.177', date: '2026.10.27', title: '放大宽桌面首页主视觉字标', items: ['让 KNOWLEDGE 字标在宽桌面上接近参考图的编辑式尺度', '保留标题、中文标语和档案线稿的清晰间距'] },
  { version: 'v1.0.176', date: '2026.10.27', title: '对齐宽桌面展区与正文边距', items: ['让 1280px 以上的首页封面和更新条使用与正文列相同的左右栏距', '避免背景条带轻微伸出可视画布边缘'] },
  { version: 'v1.0.175', date: '2026.10.27', title: '启用自托管 Saira 桌面字形', items: ['修正字体变量引用，使首页字标、英文眉标、日期和版本号实际使用自托管 Saira', '中文标题与正文保留易读的系统黑体回退'] },
  { version: 'v1.0.174', date: '2026.10.27', title: '去掉档案界面的装饰投影', items: ['移除详情、确认、筛选弹层和提示条的投影，用细边界分层', '去掉档案线稿的黄色投影，保留原有线稿和斜纹结构'] },
  { version: 'v1.0.173', date: '2026.10.27', title: '收齐中等桌面封面与内容列边缘', items: ['在 1024–1279px 桌面宽度下统一封面、更新条和最新更新区的左右边距', '避免展示背景越过内容列边界并被外层裁切'] },
  { version: 'v1.0.172', date: '2026.10.27', title: '修正浅色主题下的桌面展陈配色', items: ['切换浅色主题时让首页封面、档案线稿面板和最新更新区同步切换为纸白与墨色', '保留深色命令栏、黄色当前项和深色主题默认状态'] },
  { version: 'v1.0.171', date: '2026.10.27', title: '修正窄桌面成长轨迹的卡片宽度', items: ['在中等桌面宽度下让成长轨迹占满侧栏列', '避免里程碑标题与获奖名称被挤成窄栏换行'] },
  { version: 'v1.0.170', date: '2026.10.27', title: '区分档案页与记录区标题', items: ['知识页记录区改为“全部知识条目”，获奖页改为“全部获奖记录”', '总览继续显示“最近收集”，避免页面标题在档案页内重复'] },
  { version: 'v1.0.169', date: '2026.10.27', title: '减弱深色档案页等高线的存在感', items: ['进一步降低知识页和获奖页背景线条的不透明度', '让快速记录、筛选器与档案卡片保持优先层级'] },
  { version: 'v1.0.168', date: '2026.10.27', title: '再降低深色桌面的等高线对比', items: ['降低卡片、列表与档案页留白区的白色纹理强度', '让档案卡片和文字重新成为工作区视觉主体'] },
  { version: 'v1.0.167', date: '2026.10.27', title: '为知识与成果页整理紧凑档案首屏', items: ['只在总览保留完整展陈封面与更新展区', '知识库和获奖页改用紧凑标题区，让记录更早进入首屏'] },
  { version: 'v1.0.166', date: '2026.10.27', title: '收敛深色列表的等高线背景', items: ['统一桌面卡片、列表和折叠导航状态的背景纹理强度', '减轻白色纹理对记录行和正文的干扰'] },
  { version: 'v1.0.165', date: '2026.10.27', title: '修正深色成长轨迹的悬停对比', items: ['折叠成长轨迹时保持标题按钮与石墨面板同色系', '深色悬停文字和图标维持浅色对比，展开状态仍使用黄色标记'] },
  { version: 'v1.0.164', date: '2026.10.27', title: '提亮深色空结果图标', items: ['将无匹配搜索状态的文件夹图标改为中灰色，与石墨面板拉开对比', '空状态标题、说明与黄色添加入口保持原样'] },
  { version: 'v1.0.163', date: '2026.10.27', title: '恢复首页顶部的三色定位条', items: ['修正桌面主题隐藏页首标记后的层叠遗漏，恢复 3px 品红、信号黄与薄荷色分段线', '标记位于导航顶部，不遮挡按钮或正文'] },
  { version: 'v1.0.162', date: '2026.10.27', title: '统一深色表单的滚动条对比', items: ['深色模式下让桌面滚动轨道融入石墨面板，滑块保持清晰可见', '浅色主题滚动条颜色不变'] },
  { version: 'v1.0.161', date: '2026.10.27', title: '为最近更新索引加入浅纸色对比带', items: ['参照展示页把最近更新条带切换为浅纸底和深色文字，黄色版本牌保持醒目', '主页、档案卡片和其余主画布继续使用石墨深色'] },
  { version: 'v1.0.160', date: '2026.10.27', title: '用信号黄强调首页档案标语', items: ['参照展示页为首页第二行核心标语加上黄底深字，强化封面识别点', '保持标题正文清晰，开始记录仍是唯一填充式快捷主操作'] },
  { version: 'v1.0.159', date: '2026.10.27', title: '收敛最近更新条带的桌面滚动提示', items: ['隐藏横向索引的浏览器滚动轨道，避免滚动条压过更新信息', '保留更新按钮的横向滚动、键盘访问和版本跳转'] },
  { version: 'v1.0.158', date: '2026.10.27', title: '将最近更新索引恢复为单行横向条带', items: ['清除历史桌面规则对更新索引的多行网格覆盖，改为可横向浏览的单行版本条带', '保持每条更新均可点击并进入对应版本记录'] },
  { version: 'v1.0.157', date: '2026.10.27', title: '修正首页最新版本大字的裁切', items: ['为完整版本编号重新分配桌面展示宽度，并按窄桌面视口缩放字号', '保留最新更新说明、档案记录及交互入口'] },
  { version: 'v1.0.156', date: '2026.10.27', title: '重构首页为展陈式档案封面', items: ['将桌面导航收拢至顶部，把档案字标、等高线主视觉和记录入口编入宽幅封面', '使用真实档案数量与最新更新组成首页信息带，记录、搜索筛选和本地保存逻辑保持可用'] },
  { version: 'v1.0.155', date: '2026.10.26', title: '提高成长轨迹切换按钮的图标对比', items: ['让深色主题下的黄色展开按钮使用深色箭头', '核对当前页面的黄色底块，消除浅色字样残留'] },
  { version: 'v1.0.154', date: '2026.10.26', title: '修正深色筛选菜单的高亮文字', items: ['让排序与筛选菜单中的黄色高亮项使用深色文字和图标', '保持选项内容、键盘操作与当前排序不变'] },
  { version: 'v1.0.153', date: '2026.10.26', title: '修正深色主操作悬停时的文字颜色', items: ['让添加记录、快速保存和空档案添加入口在黄色悬停底色上保持深色文字', '保留原有尺寸、焦点和按下状态'] },
  { version: 'v1.0.152', date: '2026.10.26', title: '收敛档案封面的黄色标题背景', items: ['移除首页非操作标题上的整行黄色底块，改用白字延续清晰的标题层级', '让信号黄更集中于主要入口、选中项与当前位置'] },
  { version: 'v1.0.151', date: '2026.10.26', title: '提高深色删除确认按钮的文字对比', items: ['浅红色删除确认按钮改用深色文字，避免白字在浅底上不清楚', '悬停时维持深红底白字的危险操作提示'] },
  { version: 'v1.0.150', date: '2026.10.26', title: '修正深色编辑表单的标签与保存操作', items: ['加亮字段名称和内容形式标签，让表单在石墨底色上可读', '让保存记录与保存修改保持信号黄主操作状态'] },
  { version: 'v1.0.149', date: '2026.10.26', title: '提高深色档案辅助文字的可读性', items: ['加亮快速记录说明，避免其在石墨底色上过暗', '加亮记录卡片标签，保留标题、摘要和操作的原有层级'] },
  { version: 'v1.0.148', date: '2026.10.26', title: '修正桌面样张的深色等高线背景', items: ['移除设计样张页深色模式中带白底的地形图片，改用只呈现浅色线条的背景层', '让样张标题和说明始终位于纹理上方，并修正黄底标记与悬停操作的文字对比'] },
  { version: 'v1.0.147', date: '2026.10.26', title: '将档案主页切换为深色等高线界面', items: ['把桌面档案画布、记录面板和筛选控件统一到石墨深色层级', '反转地形底纹，只让浅色等高线浮现在深色背景上', '首次应用时启用深色主题，之后仍可通过主题按钮选择外观'] },
  { version: 'v1.0.146', date: '2026.10.26', title: '放大档案封面右侧的线稿主视觉', items: ['重新平衡桌面封面两侧宽度，让原创档案线稿更醒目', '在较宽桌面端放大线稿显示范围，标题和档案数据继续保持清楚'] },
  { version: 'v1.0.145', date: '2026.10.26', title: '让个人档案主页拥有更鲜明的展示封面', items: ['将大字标、档案说明与原创文件线稿编排成炭黑展示区', '把开始记录、浏览知识库和版本记录做成可直接操作的入口', '用真实更新记录组成首页索引条，原有知识数据与筛选能力不变'] },
  { version: 'v1.0.144', date: '2026.10.26', title: '给长更新日志留出完整的桌面边距', items: ['日志弹窗在矮桌面视口内保持上下留白', '历史列表在弹窗内滚动，搜索与关闭操作持续可见'] },
  { version: 'v1.0.143', date: '2026.10.26', title: '把桌面网页样张和外观预设整合进知识花园', items: ['新增展示、阅读、控制台、部件、动效和规则对照六个桌面页面', '提供四组预设与六项独立外观参数的预览入口', '主站与样张共用浅深主题，网页资源和字体在本地加载'] },
  { version: 'v1.0.142', date: '2026.10.26', title: '让文件选择入口只保留可见的键盘操作', items: ['隐藏的导入与背景文件输入不再占用 Tab 停靠点', '继续通过有清晰名称的“导入”和“更换图片”按钮打开文件选择'] },
  { version: 'v1.0.141', date: '2026.10.26', title: '确保已选控件聚焦时仍清楚可见', items: ['为已选中的记录类型和视图切换保留墨色内框焦点提示', '让选择状态与键盘位置同时可辨，切角不裁掉焦点边界'] },
  { version: 'v1.0.140', date: '2026.10.26', title: '提高深色顶栏的键盘焦点可见度', items: ['顶栏键盘焦点使用纸白外框，与炭黑背景保持清楚对比', '导入与主要操作增加墨色内框，确保切角按钮聚焦时仍容易识别'] },
  { version: 'v1.0.139', date: '2026.10.26', title: '收敛标题区的装饰性黄色线条', items: ['桌面标题下方的黄色细线改为墨色结构线', '保留标题定位标记、当前导航和主要操作的黄色填充'] },
  { version: 'v1.0.138', date: '2026.10.26', title: '让成长轨迹回到中性色分隔', items: ['桌面成长轨迹卡片的装饰性黄条改为中性分隔线', '将信号黄留给当前项、重要标记和主要操作'] },
  { version: 'v1.0.137', date: '2026.10.26', title: '提高空档案状态的桌面可读性', items: ['加深无结果和空档案说明文字，并拉开标题与说明的字号层级', '保留清楚的添加入口，搜索与筛选逻辑不变'] },
  { version: 'v1.0.136', date: '2026.10.26', title: '让年份水印退到统计信息之后', items: ['把桌面年份改为浅墨描边字，减轻填充大字对标题右侧的视觉重量', '保留真实年份和档案统计位置，让前景数字保持清楚'] },
  { version: 'v1.0.135', date: '2026.10.26', title: '移除与知识档案无关的默认人物图', items: ['首页默认回到纸色画布与地形纹理，不再叠加通用动漫人物图', '保留自定义背景上传、本地保存、透明度调节与恢复默认能力'] },
  { version: 'v1.0.134', date: '2026.10.26', title: '整理记录表单与详情操作', items: ['统一表单、详情抽屉和确认对话框的操作控件，并提高遮罩对内容焦点的引导', '扩大清除搜索、关联记录和证明链接的可操作区域，危险操作继续使用红色表达'] },
  { version: 'v1.0.133', date: '2026.10.26', title: '统一桌面导航与记录操作反馈', items: ['为侧栏导航、背景设置、成长轨迹和详情入口补齐清楚的悬停、按下与键盘焦点状态', '删除按钮仅在悬停或键盘焦点时显示红色风险提示，并完善禁用状态'] },
  { version: 'v1.0.132', date: '2026.10.26', title: '统一桌面端新增、筛选与视图控件', items: ['统一主要操作、筛选器和视图切换的尺寸及悬停、按下和键盘焦点状态', '用清楚的状态标记显示非默认筛选，并补齐搜索与控件组的辅助名称'] },
  { version: 'v1.0.131', date: '2026.10.26', title: '让桌面内容面板回到直角和平面', items: ['快速记录、知识条目与成长轨迹使用直角边缘和细线层级', '移除容器的悬浮位移与硬投影，让黄色集中标示当前状态和主要操作'] },
  { version: 'v1.0.130', date: '2026.10.26', title: '收敛首屏标题区的黄色装饰', items: ['将标题说明改为纯纸色底板与墨色边界，避免渐变和黄色细线影响对比', '保留黄色实心定位标记，并移除其外发光效果'] },
  { version: 'v1.0.129', date: '2026.10.26', title: '为首屏档案统计增加纸面底板', items: ['给真实知识与获奖数量增加方形浅纸底板，减轻背景纹理叠加', '保留年份水印、记录总数与原有信息位置'] },
  { version: 'v1.0.128', date: '2026.10.26', title: '提高桌面页脚辅助信息的可读性', items: ['加深页脚说明文字并放大一级，滚动到长页面底部时也容易识别', '保留当前日期、本地保存与 JSON 备份等真实信息'] },
  { version: 'v1.0.127', date: '2026.10.26', title: '整理首屏的地形纹理与年份层级', items: ['桌面等高线更清晰，打开详情或弹窗时适度减弱', '将浅灰年份移至标题右侧，强化海报层次并减少与主标题重叠'] },
  { version: 'v1.0.126', date: '2026.10.26', title: '收紧短条目的桌面详情栏', items: ['详情面板按内容高度显示并在视口内居中', '较长笔记限制最大高度，保留面板内滚动'] },
  { version: 'v1.0.125', date: '2026.10.26', title: '让展开侧栏时的筛选布局覆盖宽桌面', items: ['标题与筛选工具在所有桌面宽度下保持上下分区', '筛选行限定最大宽度，减少超宽屏上的无效拉伸'] },
  { version: 'v1.0.124', date: '2026.10.26', title: '让列表记录更适合连续扫读', items: ['桌面记录行改用纯白底，避免地形纹理穿过正文', '悬停时切换浅纸灰，保留清楚的当前操作反馈'] },
  { version: 'v1.0.123', date: '2026.10.26', title: '统一桌面筛选菜单的几何边界', items: ['下拉菜单改用直角边框与短阴影，和档案面板保持一致', '增大选项行高，选中态继续使用信号黄'] },
  { version: 'v1.0.122', date: '2026.10.26', title: '提高更新日志的阅读对比度', items: ['桌面端历史说明提高字号与行距，长列表更容易扫读', '日期使用更清楚的中性灰，保留最新版本的黄色标识'] },
  { version: 'v1.0.121', date: '2026.10.26', title: '收紧桌面详情栏的阅读宽度', items: ['调整详情侧栏宽度，减少长行并多保留档案背景上下文', '保留右侧滑出方式、编辑与删除操作'] },
  { version: 'v1.0.120', date: '2026.10.26', title: '为主标题留出清晰的纸面区域', items: ['标题下方铺一层轻透纸色，柔化最粗的地形线', '用窄信号黄竖线呼应档案版式，纹理在标题区外继续可见'] },
  { version: 'v1.0.119', date: '2026.10.26', title: '整理展开侧栏时的记录筛选区', items: ['在中等桌面宽度下将栏目标题与筛选工具分成清楚的上下层级', '筛选、排序和视图切换保持在同一行，保留原有操作'] },
  { version: 'v1.0.118', date: '2026.10.26', title: '让桌面地形等高线更清楚', items: ['提高背景纹理的明暗对比与显示范围', '打开详情或编辑弹窗时仍降低纹理，保持正文可读'] },
  { version: 'v1.0.117', date: '2026.10.26', title: '新档案从真实记录开始', items: ['移除内置的示例知识与荣誉，空白档案显示真实空状态', '继续读取并保留浏览器里已有的本地记录'] },
  { version: 'v1.0.116', date: '2026.10.26', title: '修正页脚日期说明', items: ['将当前日期标注为“当前日期”，不再误称记录最后更新时间', '保留浏览器本地保存和 JSON 备份说明'] },
  { version: 'v1.0.115', date: '2026.10.26', title: '让弹窗遮罩保持清晰利落', items: ['移除弹窗背后的柔焦，保留页面结构细节', '略微加深纯色遮罩，确保弹窗内容仍是阅读焦点'] },
  { version: 'v1.0.114', date: '2026.10.26', title: '提高档案栏目眉标的可读性', items: ['记录区与成长轨迹的英文标签放大一级', '保留编号、计数与中英标题层级'] },
  { version: 'v1.0.113', date: '2026.10.26', title: '统一记录分类与日期的字段分隔', items: ['知识和获奖条目都用竖线区分类别与日期', '让不同桌面宽度下的档案元信息保持一致'] },
  { version: 'v1.0.112', date: '2026.10.26', title: '加强桌面标题的年度轮廓层', items: ['略微提高真实年份描边的可见度，补足标题区的海报层次', '年份仍置于内容之后，不覆盖标题和统计信息'] },
  { version: 'v1.0.111', date: '2026.10.26', title: '加深桌面等高线的辨识度', items: ['进一步提高地形线在浅色纸面上的对比和显色', '标题缓冲区与弹层继续降低纹理强度，保持文字清楚'] },
  { version: 'v1.0.110', date: '2026.10.26', title: '让中等桌面筛选工具保持同一行', items: ['收窄搜索、筛选和排序控件的占宽，避免视图切换单独换行', '保持完整中文选项与原有筛选逻辑'] },
  { version: 'v1.0.109', date: '2026.10.26', title: '提高桌面记录摘要的阅读舒适度', items: ['卡片摘要放大一级并放宽行距，保留原有两行预览', '列表摘要同步加大字号与行距，仍保持单行快速扫读'] },
  { version: 'v1.0.108', date: '2026.10.26', title: '让桌面列表成为连续的档案目录', items: ['列表记录改用细横线连续分隔，减少逐条卡片边框', '悬停与键盘聚焦仍以浅白底和信号黄边条明确当前位置'] },
  { version: 'v1.0.107', date: '2026.10.26', title: '让桌面等高线背景更清楚', items: ['放大地形底图，让细线在桌面画布上保持清晰可辨', '收窄标题周围的淡化范围，同时保留标题阅读空间'] },
  { version: 'v1.0.106', date: '2026.10.26', title: '让弹层保留更多页面背景细节', items: ['桌面遮罩的模糊收敛为轻微柔化，并稍微加深中性遮罩', '弹窗仍保持前景对比，打开时也能辨认页面布局与地形纹理'] },
  { version: 'v1.0.105', date: '2026.10.26', title: '统一不同桌面宽度下的字段分隔线', items: ['将分类与日期的细竖线覆盖到全部桌面断点', '平板和手机布局继续使用原有紧凑分隔'] },
  { version: 'v1.0.104', date: '2026.10.26', title: '让添加入口横跨桌面卡片记录区', items: ['卡片视图的新增入口改为轻量横向操作行，填补记录区的剩余宽度', '保留黄色加号与原有添加逻辑，列表视图不变'] },
  { version: 'v1.0.103', date: '2026.10.26', title: '聚焦快速记录时保留黄色操作标记', items: ['悬停或键盘聚焦记录区时，左侧黄色识别条保持可见', '外框仍提供清楚的交互反馈'] },
  { version: 'v1.0.102', date: '2026.10.26', title: '让详情面板操作栏落在面板底部', items: ['桌面短内容详情将编辑和删除操作对齐到面板下方', '长内容仍在详情面板内滚动，不改动记录字段'] },
  { version: 'v1.0.101', date: '2026.10.26', title: '让分类与日期的分界更容易识别', items: ['记录列表的分类和日期之间使用清晰的细竖线与留白', '不改动现有条目内容，卡片和列表共享同一元信息样式'] },
  { version: 'v1.0.100', date: '2026.10.26', title: '为主标题留出更清晰的地形纹理缓冲区', items: ['扩大标题周围等高线的柔化范围，避免深色线条穿过文字', '其余桌面画布继续保留增强后的清晰地形细节'] },
  { version: 'v1.0.99', date: '2026.10.26', title: '进一步强化桌面等高线的明暗辨识度', items: ['提高地形底图的灰阶反差，让浅色区域的线纹更容易辨认', '保留标题周围的柔化区域，避免纹理干扰标题与正文'] },
  { version: 'v1.0.98', date: '2026.10.26', title: '区分删除警示与快照导入操作颜色', items: ['红色仅用于删除确认，表示移除记录的风险', '导入覆盖使用信号黄主按钮，与主要档案操作保持一致'] },
  { version: 'v1.0.97', date: '2026.10.26', title: '提高桌面更新日志的浏览密度', items: ['略微收紧历史条目的上下间距，首屏可多浏览一条记录', '保留搜索、日期和版本标题的清楚层级'] },
  { version: 'v1.0.96', date: '2026.10.26', title: '统一删除与快照覆盖的站内确认', items: ['删除和导入覆盖都显示与档案界面一致的确认弹窗', '覆盖提示说明将替换的实际记录数量，取消后保留当前档案'] },
  { version: 'v1.0.95', date: '2026.10.26', title: '为删除操作加入清楚的站内确认', items: ['确认弹窗显示实际将被移除的记录名称', '取消后保留当前档案，删除按钮以红色标明风险'] },
  { version: 'v1.0.94', date: '2026.10.26', title: '为详情面板补上清楚的档案类型眉标', items: ['详情顶部按真实记录类型显示知识记录或获奖记录', '与原有标题、日期和内容字段保持清晰层级'] },
  { version: 'v1.0.93', date: '2026.10.26', title: '在桌面新增记录时固定保存操作区', items: ['长表单滚动时，取消与保存按钮保持在弹窗可视范围内', '字段仍可滚动查看，主要操作始终清楚可见'] },
  { version: 'v1.0.92', date: '2026.10.26', title: '让记录卡片的删除入口更容易发现', items: ['略微放大桌面卡片上的删除图标并提高默认可见度', '悬停或键盘聚焦时仍以红色明确提示删除操作'] },
  { version: 'v1.0.91', date: '2026.10.26', title: '让桌面等高线延伸到更多内容区域', items: ['扩大地形底图在桌面画布上的覆盖范围', '提高黑白线纹对比度，同时维持正文与操作区的白底'] },
  { version: 'v1.0.90', date: '2026.10.26', title: '提高桌面记录标签的可读性', items: ['知识卡片与列表中的主题标签从 10px 提高到 11px', '保留标签的原有排列、灰阶和分类关系'] },
  { version: 'v1.0.89', date: '2026.10.26', title: '放大桌面记录卡片的分类与日期', items: ['卡片元信息从 11px 调整为 12px，扫读记录时更清楚', '保留正文摘要、编号和标签的原有层级'] },
  { version: 'v1.0.88', date: '2026.10.26', title: '让详情元数据按字段数量自适应排布', items: ['单条元数据记录使用完整栏宽，减少右侧无内容的空格', '多项字段继续自动分成易读的桌面网格'] },
  { version: 'v1.0.87', date: '2026.10.26', title: '给宽桌面搜索留出更充足的输入宽度', items: ['将 1440px 以上桌面搜索框从 128px 放宽到 160px', '中等桌面仍沿用原宽度，避免挤压筛选工具'] },
  { version: 'v1.0.86', date: '2026.10.26', title: '提高桌面详情正文与字段的可读性', items: ['详情摘要与笔记使用更舒适的正文尺寸和行距', '元数据标签和值各放大一级，字段内容保持不变'] },
  { version: 'v1.0.85', date: '2026.10.26', title: '让获奖档案列表获得完整桌面宽度', items: ['获奖页收起重复展示相同荣誉的侧栏时间线，让记录列表铺满内容区', '成长轨迹继续在总览与知识库中查看'] },
  { version: 'v1.0.84', date: '2026.10.26', title: '整理更新日志的标题层级', items: ['在日志标题上方加入与内容相符的英文分区眉标', '保留现有版本搜索、条目数量和时间线内容'] },
  { version: 'v1.0.83', date: '2026.10.26', title: '为新增记录面板加入清晰的操作标识', items: ['桌面记录表单顶部使用信号黄细条，与主要操作状态保持一致', '保留表单现有字段顺序、尺寸和保存流程'] },
  { version: 'v1.0.82', date: '2026.10.26', title: '让桌面等高线在标题区也更清晰', items: ['加深地形底图的灰阶对比，并略微加粗等高线', '缩小标题周围的淡化范围，同时保留正文阅读对比'] },
  { version: 'v1.0.81', date: '2026.10.26', title: '提高桌面记录摘要的阅读字号', items: ['卡片摘要放大一级，列表摘要同步提高字号', '继续使用真实摘要并保留原有行数截断'] },
  { version: 'v1.0.80', date: '2026.10.26', title: '让分类筛选跟随当前档案视图', items: ['分类选项只列出当前知识、获奖或总览中的真实分类', '切换视图时清除不适用的分类，避免筛选结果意外为空'] },
  { version: 'v1.0.79', date: '2026.10.26', title: '让获奖记录默认使用项目形式', items: ['获奖表单和快速记录以项目作为默认内容形式', '知识记录继续默认使用笔记，仍可在完整表单中手动选择其他形式'] },
  { version: 'v1.0.78', date: '2026.10.26', title: '在记录表单中显示中文内容类型', items: ['内容形式选择器改为显示笔记、书籍、课程等本地化名称', '保存的数据值与详情页展示保持原样'] },
  { version: 'v1.0.77', date: '2026.10.26', title: '让桌面列表也能预览记录摘要', items: ['列表行在标题下显示一行真实摘要，扫读时更容易判断内容', '长摘要自动截断，卡片视图继续保留两行预览'] },
  { version: 'v1.0.76', date: '2026.10.26', title: '进一步加深桌面等高线背景', items: ['提高地形纹理在纸色画布上的对比与显色', '收窄主标题周围的柔化范围，弹层仍保持较低纹理强度'] },
  { version: 'v1.0.75', date: '2026.10.26', title: '为更新日志加入快速检索', items: ['可按版本、日期、标题或更新内容查找历史条目', '显示匹配数量，并为无结果状态提供清除搜索入口'] },
  { version: 'v1.0.74', date: '2026.10.26', title: '优化收起侧栏时的品牌标识', items: ['折叠桌面侧栏时用清楚的方形字标替代被压缩的品牌文字', '展开状态继续显示完整中英文品牌名称'] },
  { version: 'v1.0.73', date: '2026.10.26', title: '扩大桌面记录卡的操作热区', items: ['加大查看详情与删除记录的可点击区域', '延续原有位置、键盘焦点和悬停反馈'] },
  { version: 'v1.0.72', date: '2026.10.26', title: '在记录卡片中展示摘要预览', items: ['桌面卡片显示真实摘要的两行内容，便于快速判断记录', '列表布局与小屏显示维持原有密度'] },
  { version: 'v1.0.71', date: '2026.10.26', title: '为主标题留出清晰的阅读区', items: ['在标题周围柔化等高线，保留其他留白区域的地形细节', '详情与编辑弹层继续沿用低干扰背景'] },
  { version: 'v1.0.70', date: '2026.10.26', title: '让桌面等高线背景更明显', items: ['提高纸色画布上的地形线对比与可见度', '打开详情或编辑弹层时仍适度减弱纹理'] },
  { version: 'v1.0.69', date: '2026.10.26', title: '区分空档案与筛选无结果状态', items: ['按当前栏目显示更贴合的首次记录说明', '空状态新增入口跟随当前知识或获奖记录类型'] },
  { version: 'v1.0.68', date: '2026.10.26', title: '为无匹配结果提供直接新增入口', items: ['在桌面空状态中添加当前类型对应的新增操作', '保留现有快速记录、搜索和筛选逻辑'] },
  { version: 'v1.0.67', date: '2026.10.26', title: '为收起侧栏的图标补上名称提示', items: ['导航图标悬停时显示对应的栏目名称', '保留侧栏展开时的标签与真实记录计数'] },
  { version: 'v1.0.66', date: '2026.10.26', title: '让长表单滚动时仍能关闭', items: ['保持桌面获奖表单关闭控件固定在可见区域', '让表单内容在视口内独立滚动，底部保存入口保持可达'] },
  { version: 'v1.0.65', date: '2026.10.26', title: '让桌面长表单在视口内完整浏览', items: ['为高屏不足时的获奖表单启用内部滚动', '保留字段分组和底部保存操作，不改变手机端布局'] },
  { version: 'v1.0.64', date: '2026.10.26', title: '提高桌面详情页日期信息的可读性', items: ['将桌面记录日期调整为更清楚的中性灰', '保留分类标签和标题之间的辅助信息层级'] },
  { version: 'v1.0.63', date: '2026.10.26', title: '修正桌面列表中的记录编号位置', items: ['将记录序号移至列表行上沿，避开右侧标签', '仅调整桌面列表密度，卡片视图与移动端布局不变'] },
  { version: 'v1.0.62', date: '2026.10.26', title: '进一步强化桌面等高线背景', items: ['提高总览、知识库与获奖页的地形线可见度', '保留正文区域清晰度，详情与编辑弹层仍降低纹理浓度'] },
  { version: 'v1.0.61', date: '2026.10.26', title: '避免宽桌面排序标签被截断', items: ['将排序器的显示宽度让回完整中文标签', '同步收窄搜索框，视图切换仍留在同一行'] },
  { version: 'v1.0.60', date: '2026.10.26', title: '让宽桌面筛选工具保持同一行', items: ['收紧知识库搜索与筛选控件的宽度和间距', '保留中等宽度下的自然换行，避免标题和操作互相挤压'] },
  { version: 'v1.0.59', date: '2026.10.26', title: '完整显示更新日志时间线节点', items: ['为滚动日志列表留出节点显示空间', '保留版本顺序、时间和现有说明内容'] },
  { version: 'v1.0.58', date: '2026.10.26', title: '为详情日期避开弹层关闭控件', items: ['给详情顶部的日期预留关闭按钮空间', '维持清楚的方形关闭边界与原有档案顺序'] },
  { version: 'v1.0.57', date: '2026.10.26', title: '让弹层关闭入口更清楚并补全中文辅助标签', items: ['详情和表单弹层使用方形边界标识关闭控件', '悬停时反馈信号黄，屏幕阅读标签统一为“关闭”'] },
  { version: 'v1.0.56', date: '2026.10.26', title: '让地形纹理跟随知识档案视图切换', items: ['将知识库与获奖页的地图取景变化接到真实背景纹理层', '切换时短暂平移纹理，减少动态效果模式下不播放位移动效'] },
  { version: 'v1.0.55', date: '2026.10.26', title: '补齐桌面主要操作的按下反馈', items: ['快速记录、添加、导航和视图切换增加短促按压反馈', '保持信号黄选中状态与键盘焦点样式'] },
  { version: 'v1.0.54', date: '2026.10.26', title: '减少桌面首屏区块之间的空白', items: ['略微收紧标题区、快速记录和档案列表的垂直间距', '保留标题字号、记录卡片尺寸和移动端样式'] },
  { version: 'v1.0.53', date: '2026.10.26', title: '加深桌面等高线，让地形层次更清晰', items: ['进一步提高浅色画布上的地形线对比', '列表和侧栏收起状态增强显示，详情与编辑时降低纹理浓度'] },
  { version: 'v1.0.52', date: '2026.10.26', title: '让桌面等高线在浅色画布上更清楚', items: ['略微加深总览与档案列表的等高线层', '打开详情或编辑时降低纹理强度，维持文字阅读清晰'] },
  { version: 'v1.0.51', date: '2026.10.26', title: '提高桌面等高线背景的可见度', items: ['加深等高线对比并提高总览页显色', '列表和侧栏收起时进一步增强，详情与编辑界面保留清晰空间'] },
  { version: 'v1.0.50', date: '2026.10.26', title: '把知识卡片静态侧边色收回灰阶', items: ['默认卡片侧边改用中性灰，获奖记录维持深灰识别', '悬停与键盘聚焦时再用信号黄明确反馈'] },
  { version: 'v1.0.49', date: '2026.10.26', title: '避免中等桌面宽度下筛选区挤压标题', items: ['允许筛选工具组收缩并在自身范围内换行', '宽屏控件顺序和各自固定宽度保持不变'] },
  { version: 'v1.0.48', date: '2026.10.26', title: '让快速记录眉标对应所选档案类型', items: ['知识与获奖快速记录分别显示对应的英文栏目标签', '保留相同的输入布局和保存行为'] },
  { version: 'v1.0.47', date: '2026.10.26', title: '在首屏展示真实档案分类计数', items: ['用实际知识与获奖记录数替换泛化辅助短句', '数量由现有条目实时计算并使用等宽数字'] },
  { version: 'v1.0.46', date: '2026.10.26', title: '将总览状态标签改为真实保存方式', items: ['移除没有对应状态数据的 ACTIVE 标记', '总览页明确标注浏览器本地保存方式'] },
  { version: 'v1.0.45', date: '2026.10.26', title: '让顶部新增入口跟随当前记录类型', items: ['知识库页默认打开知识表单，获奖记录页默认打开获奖表单', '总览页沿用快速记录器中当前选择的类型'] },
  { version: 'v1.0.44', date: '2026.10.26', title: '为记录表单增加档案字段分组', items: ['按核心字段、来源背景和笔记详情划分长表单', '保留原有输入项、校验与保存流程'] },
  { version: 'v1.0.43', date: '2026.10.26', title: '加强更新日志最新条目的文字层级', items: ['当前版本日期和标题提高对比与字重', '历史更新说明继续采用较轻的灰阶文字'] },
  { version: 'v1.0.42', date: '2026.10.26', title: '突出当前版本并收敛更新日志强调色', items: ['仅当前版本徽标与时间线节点使用信号黄', '历史版本、节点和列表标记改用中性灰阶'] },
  { version: 'v1.0.41', date: '2026.10.25', title: '让快速记录提示对应所选类型', items: ['获奖记录提示改为荣誉或成果名称', '知识记录继续显示学习笔记示例与补充说明'] },
  { version: 'v1.0.40', date: '2026.10.25', title: '让记录区档案标签跟随内容类型', items: ['知识视图显示知识记录标签，获奖视图显示获奖档案标签', '总览沿用综合记录标签，条目数使用当前筛选结果'] },
  { version: 'v1.0.39', date: '2026.10.25', title: '让快速记录跟随当前档案视图', items: ['进入知识库时默认选择知识记录', '进入获奖记录时默认选择获奖类型，总览保留当前类型'] },
  { version: 'v1.0.38', date: '2026.10.25', title: '统一获奖档案的首屏说明', items: ['将右侧辅助短句同步切换为成果记录语境', '知识与总览视图保留原有发现归档说明'] },
  { version: 'v1.0.37', date: '2026.10.25', title: '让获奖档案使用对应的标题文案', items: ['获奖视图的首屏标题改为成果回顾语境', '总览与知识库继续使用知识整理文案'] },
  { version: 'v1.0.36', date: '2026.10.25', title: '让首页档案眉标对应当前内容', items: ['切换知识库或获奖记录时同步更新英文档案类别', '总览继续标识为个人档案，年份仍取当前实际日期'] },
  { version: 'v1.0.35', date: '2026.10.25', title: '为桌面标题分隔线加入信号黄刻度', items: ['在首屏标题下沿用短黄线标记内容起点', '保留整条灰色基准线与原有标题间距'] },
  { version: 'v1.0.34', date: '2026.10.25', title: '再加强桌面等高线的可见度', items: ['提高宽屏背景纹理的显色与明暗对比', '列表视图和侧栏收起时进一步增强纹理，打开详情时适当减弱'] },
  { version: 'v1.0.33', date: '2026.10.25', title: '收拢删除操作的提示颜色', items: ['将删除红与浅红背景放入统一主题令牌', '让记录卡片与详情中的删除按钮使用同一颜色规则'] },
  { version: 'v1.0.32', date: '2026.10.25', title: '明确桌面删除操作的反馈', items: ['仅在删除按钮悬停或键盘聚焦时显示红色反馈', '保留删除确认，其他界面状态继续使用黑白灰与信号黄'] },
  { version: 'v1.0.31', date: '2026.10.25', title: '统一档案编号和状态字段字体', items: ['将记录编号、背景设置眉标、首屏状态与页脚统一使用档案字体令牌', '保持正文和中文信息原有的阅读字体回退'] },
  { version: 'v1.0.30', date: '2026.10.25', title: '统一档案主题的颜色与字体令牌', items: ['将主要颜色、字体、切角和底纹强度收拢到主题定义区', '为终末地档案主题与当前页面深度保留明确的变量覆盖'] },
  { version: 'v1.0.29', date: '2026.10.25', title: '提升详情字段的阅读清晰度', items: ['加深桌面详情字段标签的文字颜色', '放大详情字段值字号，保持原始资料内容不变'] },
  { version: 'v1.0.28', date: '2026.10.25', title: '提高成长轨迹小字对比度', items: ['桌面时间线日期与荣誉分类改用清晰的次级文字色', '保留原有节点、时间顺序和记录内容'] },
  { version: 'v1.0.27', date: '2026.10.25', title: '让详情元数据更像档案字段', items: ['桌面详情抽屉改用细线分隔字段，减少嵌套方框', '保留内容形式、来源及获奖信息的真实字段展示'] },
  { version: 'v1.0.26', date: '2026.10.25', title: '整理记录卡片的字段分隔', items: ['在桌面记录条目中用竖线区分分类与日期', '保持分类、日期的原始内容和移动端排版不变'] },
  { version: 'v1.0.25', date: '2026.10.25', title: '让档案年份参与首屏构图', items: ['提高真实年份轮廓字的桌面可见度，补足海报式标题层次', '让轮廓字继续留在标题与状态信息之后，不遮挡阅读'] },
  { version: 'v1.0.24', date: '2026.10.25', title: '统一档案信息眉标的层级', items: ['为主要英文分区标签加入一致的前缀，便于快速辨认栏目起点', '保留中英文标题、日期和真实条目数的既有对应关系'] },
  { version: 'v1.0.23', date: '2026.10.25', title: '增强桌面等高线背景的辨识度', items: ['提高桌面等高线纹理的可见度，并去除底图中的彩色线条', '按当前视图状态调整纹理强弱，保证正文与操作区清晰'] },
  { version: 'v1.0.22', date: '2026.10.25', title: '优化桌面档案标题与筛选显示', items: ['为桌面英文标签加入自托管 Saira 字体', '修正筛选器选项标签，使用清晰的中文名称'] },
  { version: 'v1.0.21', date: '2026.10.25', title: '加宽桌面侧栏并提升导航可读性', items: ['移除侧栏中的图形 Logo，保留清晰的知识花园文字品牌', '加宽桌面侧栏并放大导航、个人空间和本地保存说明文字', '修正侧栏内容横向溢出，取消水平滚动条'] },
  { version: 'v1.0.20', date: '2026.10.25', title: '重整侧栏品牌铭牌与本地档案状态区', items: ['保留原品牌图形，将缩写字样调整为清晰的知识花园品牌锁定组合', '把个人空间和浏览器本地保存方式整理为容易识别的档案身份铭牌', '移除含义不清的“记录中”状态，明确标出真实的本地存储方式'] },
  { version: 'v1.0.19', date: '2026.10.25', title: '扩展为完整的终末地勘探档案工作台', items: ['将地形、路径、节点与分区仪表编排为多层舞台，并按真实视图状态切换强调', '为记录、筛选、详情与更新日志统一加入状态反馈和方向性进入动效', '重组手机端与短横屏为底部导航；背景人物设置默认收起，保留手动展开入口'] },
  { version: 'v1.0.18', date: '2026.10.25', title: '加入区域勘探与资源路径的原创视觉层', items: ['以 SVG 地形等高线和稀疏路径节点补充勘探氛围', '将记录标签整理为材料牌样式，并为档案卡加入角点校准线', '视觉参考来自终末地官方页面；未嵌入游戏原画、Logo 或界面素材'] },
  { version: 'v1.0.17', date: '2026.10.25', title: '补充终末地式的区域与档案标识', items: ['为导航、记录列表与成长轨迹加入清晰的工业档案层级', '用实时记录数和分类数标注当前内容，强化编号与校准刻度', '保留现有知识、获奖、搜索筛选和本地存储流程'] },
  { version: 'v1.0.16', date: '2026.10.25', title: '统一终末地主题的颜色与交互细节', items: ['收拢纸白、墨色、信号黄和获奖分类的颜色令牌', '统一档案卡片、操作控件和详情面板的几何与字体规则', '为键盘操作补充清晰的焦点描边'] },
  { version: 'v1.0.15', date: '2026.10.25', title: '修复首页折叠面板初始化错误', items: ['将成长轨迹折叠控件改为原生按钮与面板，避开开发环境的 React hooks 错误', '保留展开状态，并为面板按钮补充展开状态和内容关联信息'] },
  { version: 'v1.0.14', date: '2026.10.25', title: '以工业档案语言重塑知识花园', items: ['统一页面为冷灰、墨色与信号黄的视觉体系', '重做导航、首屏、快速记录、卡片和详情面板的排版层级', '保留背景人物与现有记录流程，优化窄屏阅读'] },
  { version: 'v1.0.13', date: '2026.09.17', title: '让首页更专注于记录本身', items: ['移除首页数据概览区域，减少首屏干扰', '保留快速记录、最近收集和侧边栏导航计数', '不改变已有记录数据、搜索筛选和本地保存能力'] },
  { version: 'v1.0.12', date: '2026.09.17', title: '让界面更有通透的层次', items: ['为首页数据概览加入液体玻璃表面', '增加背景模糊、半透明高光和柔和边缘', '保持统计数据与页面布局不变'] },
  { version: 'v1.0.11', date: '2026.09.17', title: '让侧边栏可以按需收起', items: ['新增桌面端侧边栏展开与收起按钮', '收起后保留图标和当前导航高亮', '记住侧边栏状态，刷新页面后仍保持选择'] },
  { version: 'v1.0.10', date: '2026.09.13', title: '让记录卡片更像一张张可回看的知识纸片', items: ['参考 Craft 与 Capacities，统一记录卡片为中性纸张表面', '用左侧主题色线保留知识与获奖的视觉区分', '降低大面积彩色背景，让标题和标签成为主要焦点'] },
  { version: 'v1.0.9', date: '2026.09.13', title: '让记录卡片更利落', items: ['移除记录卡片中的摘要占位文字', '保留详情抽屉里的摘要内容，已有数据不会丢失', '缩短卡片高度，让列表更容易快速浏览'] },
  { version: 'v1.0.8', date: '2026.09.13', title: '让知识花园更像每天会打开的工作台', items: ['压缩首页叙事区，突出快速记录和最近收集', '统计与右侧回顾模块改为更轻量、可折叠的布局', '记录详情改为侧边抽屉，并支持直接跳转到真实关联记录'] },
  { version: 'v1.0.7', date: '2026.09.11', title: '让每天记录更容易开始', items: ['新增“今天记录什么？”快速记录入口', '支持卡片/列表视图切换与最近更新排序', '压缩首屏标题区域，让记录入口更靠前'] },
  { version: 'v1.0.6', date: '2026.09.11', title: '让侧边栏更专注', items: ['移除空间概览和快速提示框，减少侧栏干扰', '背景人物设置支持展开与收起'] },
  { version: 'v1.0.5', date: '2026.09.10', title: '让移动端和线上日期更可靠', items: ['修复线上年份显示为 1970 的问题', '优化窄屏侧栏与导航无障碍标签', '导入记录前增加覆盖确认，补充日期和证明链接校验'] },
  { version: 'v1.0.4', date: '2026.09.09', title: '让背景人物更自然地融入页面', items: ['为人物图增加左侧、顶部和底部的柔和渐隐', '降低背景图片的饱和度与对比度，减少生硬的边界感'] },
  { version: 'v1.0.3', date: '2026.09.09', title: '让背景人物铺满显示区域', items: ['修复人物图片底部出现空白的问题', '按背景区域高度等比铺开图片，保留人物比例与半透明效果'] },
  { version: 'v1.0.2', date: '2026.09.09', title: '把背景人物设置放到侧边栏', items: ['将修改背景入口移至左侧导航下方，更方便随时找到', '支持上传自定义人物图片并调节半透明程度', '背景设置保存在当前浏览器中，刷新后仍会保留'] },
  { version: 'v1.0.1', date: '2026.09.08', title: '统一统计卡片边框', items: ['移除知识条目卡片多余的橙色强调边线', '让三张统计卡片保持一致的视觉层级'] },
  { version: 'v1.0.0', date: '2026.09.08', title: '知识花园视觉焕新', items: ['升级背景层次、卡片质感和导航高亮效果', '增加按钮、卡片和统计模块的细腻交互反馈', '统一版本记录：本次美化作为 1.0.0 正式版本'] },
  { version: 'v0.11.0', date: '2026.09.07', title: '让主内容区更易阅读', items: ['统一放大统计、记录卡片和右侧信息模块的字号', '保持原有间距和布局比例，减少小字带来的阅读压力'] },
  { version: 'v0.10.0', date: '2026.09.07', title: '修复底部滚动时的侧栏背景', items: ['让深色侧边栏在整页滚动到底部时持续铺满左侧', '修正 sticky 侧栏被外层容器截断的问题'] },
  { version: 'v0.9.0', date: '2026.09.07', title: '让侧边栏底部更有内容', items: ['新增空间概览区，减少页面滚动到底部时的空白感', '展示知识、荣誉与标签数量，让积累状态一眼可见'] },
  { version: 'v0.8.0', date: '2026.09.07', title: '优化侧边栏状态区', items: ['新增快速提示卡，集中展示记录天数和内容数量', '重组个人空间状态信息，让左下角更清晰、更有层次'] },
  { version: 'v0.7.0', date: '2026.09.07', title: '让记录标题更有阅读感', items: ['知识与获奖卡片标题改用宋体显示', '保留原有字号、粗细与卡片布局'] },
  { version: 'v0.6.0', date: '2026.09.07', title: '让知识花园更有氛围', items: ['统一收窄界面圆角，让信息层级更利落', '新增半透明二次元背景插画，让页面更有陪伴感'] },
  { version: 'v0.5.0', date: '2026.09.07', title: '让记录界面更专注', items: ['移除待复习功能及相关导航入口', '保留知识库、获奖记录、筛选和更新日志等核心能力'] },
  { version: 'v0.4.0', date: '2026.09.07', title: '让知识库更适合长期使用', items: ['新增待复习入口、分类与排序筛选', '支持书籍、课程、文章、视频和项目等内容形式', '增加关联记录，让知识彼此连接'] },
  { version: 'v0.3.0', date: '2026.09.07', title: '让知识更容易被找到', items: ['新增标签索引和可点击标签筛选', '增强详情展示与本地备份能力'] },
  { version: 'v0.2.0', date: '2026.09.07', title: '记录可以被再次使用', items: ['支持编辑与详情查看', '支持 JSON 导入和导出'] },
  { version: 'v0.1.0', date: '2026.09.07', title: '知识花园上线', items: ['支持记录知识条目和获奖经历', '使用浏览器本地保存，不需要账号'] },
];
const emptyDraft = { type: 'knowledge' as EntryType, format: 'note' as EntryFormat, title: '', category: '', date: '', summary: '', tags: '', notes: '', source: '', issuer: '', awardLevel: '', role: '', proof: '', related: '' };
const formatLabels: Record<EntryFormat, string> = { note: '笔记', book: '书籍', course: '课程', article: '文章', video: '视频', project: '项目' };

function formatDisplayDate(value: Date): string {
  return `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, '0')}.${String(value.getDate()).padStart(2, '0')}`;
}

function normalizeEntryDate(value: string, fallback: string): string {
  const match = value.trim().replace(/[/-]/g, '.').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return fallback;
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
}

function entryDateTimestamp(value: string): number {
  const match = value.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!match) return 0;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeEntries(value: unknown, fallbackDate: string): Entry[] {
  const raw = Array.isArray(value) ? value : value && typeof value === 'object' && Array.isArray((value as { entries?: unknown }).entries) ? (value as { entries: unknown[] }).entries : [];
  return raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').map((item, index) => ({
    id: typeof item.id === 'string' ? item.id : `imported-${Date.now()}-${index}`,
    type: item.type === 'award' ? 'award' : 'knowledge',
    format: ['note', 'book', 'course', 'article', 'video', 'project'].includes(item.format as string) ? item.format as EntryFormat : 'note',
    title: typeof item.title === 'string' ? item.title : '未命名记录',
    category: typeof item.category === 'string' ? item.category : '未分类',
    date: typeof item.date === 'string' ? normalizeEntryDate(item.date, fallbackDate) : fallbackDate,
    summary: typeof item.summary === 'string' ? item.summary : '',
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 3) : [],
    color: typeof item.color === 'string' ? item.color : item.type === 'award' ? 'gold' : 'coral',
    notes: typeof item.notes === 'string' ? item.notes : '',
    source: typeof item.source === 'string' ? item.source : '',
    issuer: typeof item.issuer === 'string' ? item.issuer : '',
    awardLevel: typeof item.awardLevel === 'string' ? item.awardLevel : '',
    role: typeof item.role === 'string' ? item.role : '',
    proof: typeof item.proof === 'string' ? normalizeHttpUrl(item.proof) ?? '' : '',
    related: typeof item.related === 'string' ? item.related : '',
    updatedAt: typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : entryDateTimestamp(typeof item.date === 'string' ? normalizeEntryDate(item.date, fallbackDate) : fallbackDate),
  }));
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [displayDate, setDisplayDate] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'updated' | 'latest' | 'oldest' | 'title'>('updated');
  const [entryView, setEntryView] = useState<'cards' | 'list'>('cards');
  const [search, setSearch] = useState('');
  const [quickCaptureTitle, setQuickCaptureTitle] = useState('');
  const [quickCaptureType, setQuickCaptureType] = useState<EntryType>('knowledge');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [changelogQuery, setChangelogQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [backgroundImage, setBackgroundImage] = useState(defaultBackgroundImage);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.13);
  const [backgroundExpanded, setBackgroundExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(true);
  const [releaseScrambleToken, setReleaseScrambleToken] = useState(0);
  const importInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateVisibility = () => { document.documentElement.dataset.archivePageVisible = document.hidden ? 'false' : 'true'; };
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => { document.removeEventListener('visibilitychange', updateVisibility); delete document.documentElement.dataset.archivePageVisible; };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem('knowledge-garden-entries');
    const fallbackDate = formatDisplayDate(new Date());
    let parsed: Entry[] | null = null;
    if (saved !== null) {
      try { parsed = normalizeEntries(JSON.parse(saved), fallbackDate); } catch { window.localStorage.removeItem('knowledge-garden-entries'); }
    }
    const timer = window.setTimeout(() => { setDisplayDate(fallbackDate); setEntries(parsed ?? starterEntries); setHydrated(true); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let savedTheme = window.localStorage.getItem(themeStorageKey);
    const shouldAdoptDarkDefault = window.matchMedia('(min-width: 1024px)').matches
      && window.localStorage.getItem(themeDefaultMigrationKey) !== 'applied';
    if (shouldAdoptDarkDefault) {
      savedTheme = 'dark';
      try {
        window.localStorage.setItem(themeStorageKey, 'dark');
        window.localStorage.setItem(themeDefaultMigrationKey, 'applied');
      } catch {}
    }
    const isDark = savedTheme === 'dark';
    setDarkTheme(isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedImage = window.localStorage.getItem(backgroundImageStorageKey);
      const savedOpacity = Number(window.localStorage.getItem(backgroundOpacityStorageKey));
      if (savedImage) setBackgroundImage(savedImage);
      if (Number.isFinite(savedOpacity) && savedOpacity >= 0.04 && savedOpacity <= 0.3) setBackgroundOpacity(savedOpacity);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedSidebarState = window.localStorage.getItem(sidebarCollapsedStorageKey);
      if (savedSidebarState === 'true') setSidebarCollapsed(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { if (hydrated) window.localStorage.setItem('knowledge-garden-entries', JSON.stringify(entries)); }, [entries, hydrated]);

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      '.archive-release-feature, .quick-capture, .workspace-grid, .page-footer, .entry-card, .add-card, .milestone-card, .empty-state',
    );
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((target) => { target.dataset.motionVisible = 'true'; });
      return;
    }
    const observer = new IntersectionObserver((records) => {
      records.forEach((record) => {
        if (record.isIntersecting) {
          (record.target as HTMLElement).dataset.motionVisible = 'true';
          observer.unobserve(record.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [entries, search, categoryFilter, activeView]);

  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
        document.documentElement.style.setProperty('--archive-scroll-progress', `${Math.max(0, Math.min(progress, 1)) * 100}%`);
      });
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: 'add_knowledge_garden_record',
      title: '添加知识花园记录',
      description: '在个人知识花园中新增一条学习知识或获奖记录，并同步更新页面内容。',
      inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['knowledge', 'award'] }, title: { type: 'string' }, category: { type: 'string' }, summary: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['type', 'title', 'category'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object') throw new Error('请输入记录内容');
        const record = input as Record<string, unknown>;
        const type = record.type === 'award' ? 'award' : record.type === 'knowledge' ? 'knowledge' : null;
        const title = typeof record.title === 'string' ? record.title.trim() : '';
        const category = typeof record.category === 'string' ? record.category.trim() : '';
        if (!type || !title || !category) throw new Error('type、title 和 category 都是必填项');
        const id = `${type}-${Date.now()}`;
        const tags = Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 3) : [];
        setEntries((current) => [{ id, type, format: 'note', title, category, date: displayDate, summary: typeof record.summary === 'string' ? record.summary.trim() : '', tags, color: type === 'award' ? 'gold' : 'coral', updatedAt: Date.now() }, ...current]);
        return { id, type, title, status: 'created' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [displayDate]);

  const knowledgeCount = entries.filter((entry) => entry.type === 'knowledge').length;
  const awardCount = entries.filter((entry) => entry.type === 'award').length;
  const entriesInActiveView = activeView === 'all' ? entries : entries.filter((entry) => entry.type === activeView);
  const emptyStateTitle = entriesInActiveView.length > 0 ? '这里还没有匹配的内容' : activeView === 'award' ? '还没有获奖记录' : activeView === 'knowledge' ? '还没有知识记录' : '还没有档案记录';
  const emptyStateDescription = entriesInActiveView.length > 0 ? '换个关键词或筛选条件，或添加一条新的记录。' : activeView === 'award' ? '记录获得的荣誉与成果，方便以后回看。' : activeView === 'knowledge' ? '先记下一条知识，之后可以慢慢补充分类与笔记。' : '从一条知识或获奖经历开始，之后可以继续补充细节。';
  const filteredUpdateLogs = useMemo(() => {
    const query = changelogQuery.trim().toLocaleLowerCase();
    if (!query) return updateLogs;
    return updateLogs.filter((release) => [release.version, release.date, release.title, ...release.items].join(' ').toLocaleLowerCase().includes(query));
  }, [changelogQuery]);
  const currentYear = displayDate.slice(0, 4);
  const categories = useMemo(() => Array.from(new Set(entries.filter((entry) => activeView === 'all' || entry.type === activeView).map((entry) => entry.category))).sort((a, b) => a.localeCompare(b)), [activeView, entries]);

  const toggleTheme = (event: MouseEvent<HTMLButtonElement>) => {
    const next = darkTheme ? 'light' : 'dark';
    transitionTheme(event.currentTarget, () => {
      setDarkTheme(next === 'dark');
      document.documentElement.dataset.theme = next;
      try { window.localStorage.setItem(themeStorageKey, next); } catch {}
    });
  };

  useEffect(() => {
    if (categoryFilter !== 'all' && !categories.includes(categoryFilter)) setCategoryFilter('all');
  }, [categories, categoryFilter]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesView = activeView === 'all' || entry.type === activeView;
      const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
      const matchesSearch = !query || [entry.title, entry.category, entry.summary, entry.notes, entry.source, entry.issuer, entry.related, ...entry.tags].join(' ').toLowerCase().includes(query);
      return matchesView && matchesCategory && matchesSearch;
    });
  }, [activeView, categoryFilter, entries, search]);

  const sortedEntries = useMemo(() => [...filteredEntries].sort((a, b) => sortBy === 'title' ? a.title.localeCompare(b.title) : sortBy === 'oldest' ? a.date.localeCompare(b.date) : sortBy === 'latest' ? b.date.localeCompare(a.date) : (b.updatedAt ?? entryDateTimestamp(b.date)) - (a.updatedAt ?? entryDateTimestamp(a.date))), [filteredEntries, sortBy]);
  const viewTitle = activeView === 'award' ? '获奖记录' : activeView === 'knowledge' ? '知识库' : '总览';
  const newRecordType = activeView === 'all' ? quickCaptureType : activeView;
  const logEyebrow = activeView === 'award' ? '// AWARD LOG /' : activeView === 'knowledge' ? '// KNOWLEDGE LOG /' : '// FIELD LOG /';
  const changeView = (view: ViewMode) => { setActiveView(view); setCategoryFilter('all'); if (view !== 'all') setQuickCaptureType(view); };
  function focusQuickCapture() {
    const input = document.getElementById('quick-capture-title');
    input?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    input?.focus({ preventScroll: true });
  }
  function openRelease(release: UpdateLog) { setChangelogQuery(release.title); setChangelogOpen(true); }
  const archiveEyebrow = activeView === 'award' ? '// AWARD ARCHIVE' : activeView === 'knowledge' ? '// KNOWLEDGE ARCHIVE' : '// PERSONAL ARCHIVE';
  const heroTitle = activeView === 'award' ? <>把走过的，变成<br /><em>下一次出发的底气。</em></> : <>把学过的，变成<br /><em>下一次找得到的答案。</em></>;
  const heroDescription = activeView === 'award' ? '每一份成果，都值得被认真归档。' : '今天先记一句，之后再慢慢整理。';
  const archiveViewDescription = activeView === 'award' ? '集中回看已获得的成果与相关证明。' : '按主题筛选、搜索并回看已整理的学习记录。';
  const quickCaptureHint = quickCaptureType === 'award' ? '先记下成果名称，详情可以随后补充。' : '先写下一句话，详细内容之后再补充。';
  const quickCapturePlaceholder = quickCaptureType === 'award' ? '输入荣誉或成果名称' : '例如：今天学会了如何拆解复杂问题';
  const quickCaptureEyebrow = quickCaptureType === 'award' ? '// AWARD ENTRY / QUICK CAPTURE' : '// KNOWLEDGE ENTRY / QUICK CAPTURE';

  function showNotice(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 2600); }
  function saveQuickCapture(event: { preventDefault: () => void }) {
    event.preventDefault();
    const title = quickCaptureTitle.trim();
    if (!title) { showNotice('先写下一句话，再保存记录'); return; }
    const id = `${quickCaptureType}-${Date.now()}`;
    setEntries((current) => [{ id, type: quickCaptureType, format: quickCaptureType === 'award' ? 'project' : 'note', title, category: '待整理', date: displayDate || formatDisplayDate(new Date()), summary: '先记录下来，之后再补充。', tags: [], color: quickCaptureType === 'award' ? 'gold' : ['coral', 'sky', 'lilac', 'mint'][knowledgeCount % 4], updatedAt: Date.now() }, ...current]);
    setQuickCaptureTitle('');
    showNotice('已快速保存，之后可以打开详情补充内容');
  }
  function openCreate(type: EntryType = 'knowledge') { setEditingId(null); setDraft({ ...emptyDraft, type, format: type === 'award' ? 'project' : 'note', date: displayDate || formatDisplayDate(new Date()) }); setDialogOpen(true); }
  function openEdit(entry: Entry) {
    setEditingId(entry.id);
    setDraft({ type: entry.type, format: entry.format, title: entry.title, category: entry.category, date: entry.date, summary: entry.summary, tags: entry.tags.join(', '), notes: entry.notes ?? '', source: entry.source ?? '', issuer: entry.issuer ?? '', awardLevel: entry.awardLevel ?? '', role: entry.role ?? '', proof: entry.proof ?? '', related: entry.related ?? '' });
    setDetailsOpen(false);
    setDialogOpen(true);
  }
  function saveEntry() {
    if (!draft.title.trim() || !draft.category.trim()) { showNotice('请至少填写标题和分类'); return; }
    const date = normalizeEntryDate(draft.date, '');
    if (!date) { showNotice('日期格式应为 YYYY.MM.DD'); return; }
    const proof = normalizeHttpUrl(draft.proof);
    if (proof === null) { showNotice('证明链接需以 http:// 或 https:// 开头'); return; }
    const nextEntry: Entry = { id: editingId ?? `${draft.type}-${Date.now()}`, type: draft.type, format: draft.format, title: draft.title.trim(), category: draft.category.trim(), date, summary: draft.summary.trim() || '还没有写下摘要，之后再来补充。', tags: draft.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 3), color: draft.type === 'award' ? 'gold' : editingId ? entries.find((entry) => entry.id === editingId)?.color ?? 'coral' : ['coral', 'sky', 'lilac', 'mint'][knowledgeCount % 4], notes: draft.notes.trim(), source: draft.source.trim(), issuer: draft.issuer.trim(), awardLevel: draft.awardLevel.trim(), role: draft.role.trim(), proof, related: draft.related.trim(), updatedAt: Date.now() };
    setEntries((current) => editingId ? current.map((entry) => entry.id === editingId ? nextEntry : entry) : [nextEntry, ...current]);
    setDialogOpen(false); setEditingId(null); setDraft(emptyDraft); showNotice(editingId ? '记录已更新' : '已添加到你的知识花园');
  }
  function removeEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    setDetailsOpen(false); setPendingConfirmation(null); showNotice('记录已移除');
  }
  function confirmPendingAction() {
    if (!pendingConfirmation) return;
    if (pendingConfirmation.kind === 'import') {
      setEntries(pendingConfirmation.entries); setPendingConfirmation(null); showNotice(`已导入 ${pendingConfirmation.entries.length} 条记录`); return;
    }
    removeEntry(pendingConfirmation.entry.id);
  }
  function exportSnapshot() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `knowledge-garden-${displayDate.replaceAll('.', '-')}.json`; link.click(); URL.revokeObjectURL(url); showNotice('快照已下载');
  }
  async function importSnapshot(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = normalizeEntries(JSON.parse(await file.text()), displayDate || formatDisplayDate(new Date()));
      if (!imported.length) throw new Error('empty');
      if (entries.length) setPendingConfirmation({ kind: 'import', entries: imported, replaceCount: entries.length });
      else { setEntries(imported); showNotice(`已导入 ${imported.length} 条记录`); }
    } catch { showNotice('导入失败，请选择知识花园导出的 JSON 文件'); }
    event.target.value = '';
  }
  function customizeBackground(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showNotice('请选择图片文件'); event.target.value = ''; return; }
    if (file.size > 6 * 1024 * 1024) { showNotice('图片请控制在 6MB 以内'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) { showNotice('图片读取失败，请重试'); return; }
      setBackgroundImage(result);
      try { window.localStorage.setItem(backgroundImageStorageKey, result); showNotice('背景图片已更新'); } catch { showNotice('图片已应用，但浏览器空间不足，刷新后可能恢复默认'); }
    };
    reader.onerror = () => showNotice('图片读取失败，请重试');
    reader.readAsDataURL(file);
    event.target.value = '';
  }
  function changeBackgroundOpacity(value: number) {
    setBackgroundOpacity(value);
    window.localStorage.setItem(backgroundOpacityStorageKey, value.toString());
  }
  function resetBackground() {
    setBackgroundImage(defaultBackgroundImage);
    setBackgroundOpacity(0.13);
    window.localStorage.removeItem(backgroundImageStorageKey);
    window.localStorage.removeItem(backgroundOpacityStorageKey);
    showNotice('已恢复默认背景设置');
  }
  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(sidebarCollapsedStorageKey, String(next));
      return next;
    });
  }

  if (!hydrated) {
    return <main className="site-loading" aria-busy="true"><div className="site-loading-card"><Sparkles size={18} /><span>正在打开你的知识花园…</span></div></main>;
  }

  return (
    <main className={`site-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} data-view={activeView} data-entry-mode={entryView} data-entry-state={sortedEntries.length ? 'available' : 'empty'} data-search-state={search ? 'active' : 'idle'} data-sidebar-state={sidebarCollapsed ? 'collapsed' : 'expanded'} data-milestones-state={milestonesOpen ? 'open' : 'closed'} data-detail-state={detailsOpen ? 'open' : 'closed'} data-dialog-state={dialogOpen ? 'open' : 'closed'} data-changelog-state={changelogOpen ? 'open' : 'closed'}>
      <span className="archive-scroll-progress" aria-hidden="true" />
      <div className="site-background-image" aria-hidden="true" style={{ backgroundImage: backgroundImage ? `url("${backgroundImage}")` : 'none', opacity: backgroundOpacity }} />
      <div className="terrain-contour-overlay" aria-hidden="true" />
      <aside className="side-rail">
        <div className="rail-topline"><div className="brand-mark" aria-label="我的知识花园"><span className="brand-symbol" aria-hidden="true">K</span><span className="brand-lockup"><strong>知识花园</strong><small>FIELD KNOWLEDGE ARCHIVE</small></span></div><button type="button" className="rail-collapse-toggle" aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'} onClick={toggleSidebar}>{sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div>
        <p className="rail-section-label">{"// FIELD INDEX "}<span>/</span> 05</p>
        <nav className="side-nav" aria-label="主导航">
          <button className={`nav-item ${activeView === 'all' ? 'active' : ''}`} type="button" aria-label="总览" title="总览" aria-pressed={activeView === 'all'} onClick={() => changeView('all')}><LayoutGrid size={18} /><span>总览</span></button>
          <button className={`nav-item ${activeView === 'knowledge' ? 'active' : ''}`} type="button" aria-label="知识库" title="知识库" aria-pressed={activeView === 'knowledge'} onClick={() => changeView('knowledge')}><BookOpen size={18} /><span>知识库</span><span className="nav-count">{knowledgeCount}</span></button>
          <button className={`nav-item ${activeView === 'award' ? 'active' : ''}`} type="button" aria-label="获奖记录" title="获奖记录" aria-pressed={activeView === 'award'} onClick={() => changeView('award')}><Medal size={18} /><span>获奖记录</span><span className="nav-count">{awardCount}</span></button>
          <button className="nav-item" type="button" aria-label="更新日志" title="更新日志" onClick={() => setChangelogOpen(true)}><History size={18} /><span>更新日志</span><span className="nav-count">{updateLogs.length}</span></button>
          <a className="nav-item" href={withBasePath('/ui-kit/')} aria-label="设计样张" title="设计样张"><Sparkles size={18} /><span>设计样张</span><span className="nav-count">06</span></a>
        </nav>
        <section className="rail-background" aria-label="背景图片设置"><button type="button" className="rail-background-heading" aria-label={backgroundExpanded ? '收起背景图片设置' : '展开背景图片设置'} aria-expanded={backgroundExpanded} aria-controls="rail-background-content" onClick={() => setBackgroundExpanded((current) => !current)}><div><span className="rail-background-label">{"// BACKGROUND"}</span><strong>背景图片</strong></div><span className="rail-background-toggle" aria-hidden="true">{backgroundExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span></button><div id="rail-background-content" className="rail-background-content" data-open={backgroundExpanded} aria-hidden={!backgroundExpanded} inert={!backgroundExpanded}><button type="button" className={`rail-background-preview ${backgroundImage ? 'has-background' : 'is-empty'}`} aria-label={backgroundImage ? '更换背景图片' : '选择背景图片'} onClick={() => backgroundInputRef.current?.click()} style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : undefined}><span>{backgroundImage ? `${Math.round(backgroundOpacity * 100)}%` : '未设置'}</span></button><input ref={backgroundInputRef} className="sr-only" type="file" accept="image/*" tabIndex={-1} onChange={customizeBackground} /><div className="rail-background-actions"><button type="button" className="rail-background-button" onClick={() => backgroundInputRef.current?.click()}><FileUp size={13} />更换图片</button><button type="button" className="rail-background-reset" onClick={resetBackground}>恢复默认</button></div>{backgroundImage && <label className="rail-opacity-control" htmlFor="background-opacity"><span>透明度</span><input id="background-opacity" type="range" min="0.04" max="0.3" step="0.01" value={backgroundOpacity} onChange={(event) => changeBackgroundOpacity(Number(event.target.value))} /></label>}</div></section>
        <div className="rail-bottom">
          <div className="rail-account"><div className="avatar" aria-label="个人头像">K</div><div className="account-copy"><span className="account-eyebrow">{"// PERSONAL ARCHIVE"}</span><strong>我的空间</strong><small>个人知识库</small></div></div>
          <div className="account-status" aria-label="数据保存在当前浏览器"><span className="streak-dot" aria-hidden="true" />浏览器本地保存</div>
        </div>
      </aside>

      <section className="content-area">
        <header className="topbar">
          <div className="breadcrumb"><span>我的空间</span><ChevronRight size={15} /><strong>{viewTitle}</strong><span className="version-badge">{currentVersion}</span></div>
          <div className="top-actions">
            <button className="icon-button theme-toggle" type="button" aria-label="深色主题" aria-pressed={darkTheme} title={darkTheme ? '切换到浅色主题' : '切换到深色主题'} onClick={toggleTheme}>{darkTheme ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-button" type="button" aria-label="搜索" onClick={() => document.getElementById('search')?.focus()}><Search size={18} /></button>
            <input ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" tabIndex={-1} onChange={importSnapshot} />
            <Button variant="outline" className="export-button import-button" onClick={() => importInputRef.current?.click()}><FileUp size={15} />导入</Button>
            <Button variant="outline" className="export-button" onClick={exportSnapshot}><Download size={15} />导出快照</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button className="add-button" onClick={() => openCreate(newRecordType)}><Plus size={16} />添加记录</Button>} />
              <DialogContent className="entry-dialog form-dialog">
                <DialogHeader><DialogTitle>{editingId ? '编辑记录' : '添加一条记录'}</DialogTitle><DialogDescription>{editingId ? '把这条记录补充得更完整。' : '把刚学会的，或刚获得的，放进你的长期积累里。'}</DialogDescription></DialogHeader>
                <div className="dialog-form">
                  <div className="type-picker" role="group" aria-label="记录类型"><button type="button" className={draft.type === 'knowledge' ? 'type-option selected' : 'type-option'} aria-pressed={draft.type === 'knowledge'} onClick={() => setDraft((current) => ({ ...current, type: 'knowledge', format: 'note' }))}><BookOpen size={16} />学到的知识</button><button type="button" className={draft.type === 'award' ? 'type-option selected' : 'type-option'} aria-pressed={draft.type === 'award'} onClick={() => setDraft((current) => ({ ...current, type: 'award', format: 'project' }))}><Trophy size={16} />获奖情况</button></div>
                  <p className="form-section-label">{"// CORE FIELDS"}</p>
                  <div className="form-grid"><label htmlFor="entry-title">标题<Input id="entry-title" placeholder={draft.type === 'award' ? '例如：设计大赛 · 最佳创意奖' : '例如：卡片分类法'} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label htmlFor="entry-date">日期<Input id="entry-date" inputMode="numeric" placeholder="YYYY.MM.DD" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label></div>
                  <div className="form-grid"><label htmlFor="entry-category">分类<Input id="entry-category" placeholder={draft.type === 'award' ? '例如：竞赛获奖' : '例如：产品设计'} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label><label htmlFor="entry-tags">标签（选填）<Input id="entry-tags" placeholder="用逗号分隔" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} /></label></div>
                  <div className="form-grid"><div className="form-field"><span>内容形式</span><Select value={draft.format} itemToStringLabel={(value) => formatLabels[value as EntryFormat] ?? value} onValueChange={(value) => setDraft({ ...draft, format: value as EntryFormat })}><SelectTrigger className="form-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="note">笔记</SelectItem><SelectItem value="book">书籍</SelectItem><SelectItem value="course">课程</SelectItem><SelectItem value="article">文章</SelectItem><SelectItem value="video">视频</SelectItem><SelectItem value="project">项目</SelectItem></SelectContent></Select></div><label htmlFor="entry-related">关联记录<Input id="entry-related" placeholder="例如：费曼学习法" value={draft.related} onChange={(event) => setDraft({ ...draft, related: event.target.value })} /></label></div>
                  <p className="form-section-label">{"// SOURCE / CONTEXT"}</p>
                  {draft.type === 'award' ? <div className="form-grid"><label htmlFor="entry-issuer">颁发机构<Input id="entry-issuer" placeholder="例如：大赛组委会" value={draft.issuer} onChange={(event) => setDraft({ ...draft, issuer: event.target.value })} /></label><label htmlFor="entry-level">获奖级别<Input id="entry-level" placeholder="例如：一等奖" value={draft.awardLevel} onChange={(event) => setDraft({ ...draft, awardLevel: event.target.value })} /></label></div> : <div className="form-grid"><label htmlFor="entry-source">学习来源<Input id="entry-source" placeholder="书籍、课程或链接" value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} /></label><div /> </div>}
                  {draft.type === 'award' && <div className="form-grid"><label htmlFor="entry-role">个人角色<Input id="entry-role" placeholder="你负责了什么" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label><label htmlFor="entry-proof">证明链接<Input id="entry-proof" placeholder="证书或项目链接" value={draft.proof} onChange={(event) => setDraft({ ...draft, proof: event.target.value })} /></label></div>}
                  <p className="form-section-label">{"// NOTES / DETAILS"}</p>
                  <label htmlFor="entry-summary">摘要（选填）<Textarea id="entry-summary" placeholder="写下最值得以后再次回看的那句话…" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
                  <label htmlFor="entry-notes">详细笔记（选填）<Textarea id="entry-notes" className="notes-textarea" placeholder="补充例子、关键洞察或下一步行动…" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={saveEntry}><Check size={15} />{editingId ? '保存修改' : '保存记录'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="page-scroll">
          <section className="page-heading" aria-label={activeView === 'all' ? '个人档案首页' : viewTitle}>
            <div className="archive-meta-line" aria-label={`当前日期 ${displayDate}，共 ${entries.length} 条档案，${knowledgeCount} 条知识，${awardCount} 项成果`}>
              <span>{displayDate || currentYear}</span><i aria-hidden="true" />
              <span><AnimatedCount value={entries.length} initialScramble delay={0} /> 条档案</span><i aria-hidden="true" />
              <span><AnimatedCount value={knowledgeCount} initialScramble delay={70} /> 条知识</span><i aria-hidden="true" />
              <span><AnimatedCount value={awardCount} initialScramble delay={140} /> 项成果</span>
            </div>
            <div className="heading-copy-block">
              <div className="archive-overview-copy">
                <p className="archive-wordmark" aria-hidden="true"><span className="archive-wordmark-solid">KNOWLEDGE</span><span className="archive-wordmark-outline">GARDEN</span></p>
                <p className="eyebrow"><span className="signal-mark" aria-hidden="true" />{archiveEyebrow} <span className="eyebrow-divider">/</span> {currentYear}</p>
                <h1>{heroTitle}</h1>
                <p className="heading-copy">{heroDescription}</p>
                <div className="archive-hero-actions" aria-label="档案快捷入口">
                  <button type="button" className="archive-hero-action primary" onClick={focusQuickCapture}><Plus size={15} />开始记录</button>
                  <button type="button" className="archive-hero-action" onClick={() => changeView('knowledge')}><BookOpen size={15} />浏览知识库</button>
                  <button type="button" className="archive-hero-action" onClick={() => { setChangelogQuery(''); setChangelogOpen(true); }}><History size={15} />版本记录</button>
                </div>
              </div>
              <div className="archive-subview-copy">
                <p className="eyebrow"><span className="signal-mark" aria-hidden="true" />{archiveEyebrow} <span className="eyebrow-divider">/</span> {currentYear}</p>
                <h1>{viewTitle}</h1>
                <p className="heading-copy">{archiveViewDescription}</p>
              </div>
            </div>
            <figure className="archive-hero-stage" onPointerMove={(event) => {
              if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - rect.left) / rect.width - 0.5;
              const y = (event.clientY - rect.top) / rect.height - 0.5;
              event.currentTarget.style.setProperty('--archive-pointer-x', `${x * -10}px`);
              event.currentTarget.style.setProperty('--archive-pointer-y', `${y * -8}px`);
              event.currentTarget.style.setProperty('--archive-hatch-x', `${x * 8}px`);
              event.currentTarget.style.setProperty('--archive-hatch-y', `${y * 6}px`);
              event.currentTarget.style.setProperty('--archive-glint-x', `${((x + 0.5) * 100).toFixed(1)}%`);
              event.currentTarget.style.setProperty('--archive-glint-y', `${((y + 0.5) * 100).toFixed(1)}%`);
            }} onPointerLeave={(event) => {
              event.currentTarget.style.setProperty('--archive-pointer-x', '0px');
              event.currentTarget.style.setProperty('--archive-pointer-y', '0px');
              event.currentTarget.style.setProperty('--archive-hatch-x', '0px');
              event.currentTarget.style.setProperty('--archive-hatch-y', '0px');
              event.currentTarget.style.setProperty('--archive-glint-x', '50%');
              event.currentTarget.style.setProperty('--archive-glint-y', '50%');
            }}>
                <svg aria-hidden="true" focusable="false" viewBox="40 25 320 350" fill="none" stroke="currentColor" strokeWidth="2">
                  <path pathLength={1} d="M58 38h230l54 54v282H58z" />
                  <path pathLength={1} d="M288 38v54h54M83 122h228M83 153h175M83 183h212M83 258h228M83 288h156" />
                  <path pathLength={1} d="M83 211h76v30H83zM176 211h74v30h-74zM267 211h44v30h-44z" />
                  <path pathLength={1} d="M83 326h64m18 0h38m20 0h74" strokeDasharray="3 7" />
                  <path pathLength={1} d="M40 368h320" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="archive-hero-art-label">KNOWLEDGE / ARCHIVE</span>
                <div className="heading-note"><span className="note-line" /><div><span className="status-caption">{"// ARCHIVE TOTALS"}</span><div className="archive-tally" aria-label={`共${knowledgeCount}条知识记录，${awardCount}项获奖记录`}><div className="archive-tally-row"><span>KNOWLEDGE</span><strong><AnimatedCount value={knowledgeCount} /></strong></div><div className="archive-tally-row"><span>AWARDS</span><strong><AnimatedCount value={awardCount} /></strong></div></div></div></div>
            </figure>
            <div className="archive-update-strip" aria-label="最近更新">
              <span className="archive-update-label">{"// RECENT UPDATES"}</span>
              <div className="archive-update-viewport"><div className="archive-update-track">
                <div className="archive-update-group">{updateLogs.slice(0, 8).map((release) => <button type="button" className="archive-update-item" key={release.version} onClick={() => openRelease(release)}><span className="archive-update-version">{release.version}</span><span className="archive-update-title">{release.title}</span><ChevronRight size={13} aria-hidden="true" /></button>)}</div>
                <div className="archive-update-group archive-update-group-clone" aria-hidden="true">{updateLogs.slice(0, 8).map((release) => <button type="button" className="archive-update-item" key={`clone-${release.version}`} tabIndex={-1} disabled><span className="archive-update-version">{release.version}</span><span className="archive-update-title">{release.title}</span><ChevronRight size={13} aria-hidden="true" /></button>)}</div>
              </div></div>
            </div>
          </section>
          <section className="archive-release-feature" aria-label="最新更新" onPointerEnter={() => setReleaseScrambleToken((token) => token + 1)} onFocusCapture={() => setReleaseScrambleToken((token) => token + 1)}>
            <ScrambledVersion value={updateLogs[0].version} trigger={releaseScrambleToken} />
            <div className="archive-release-copy">
              <div className="archive-release-meta"><span>最新更新</span><time>{updateLogs[0].version} │ {updateLogs[0].date}</time></div>
              <h2>{updateLogs[0].title}</h2>
              <p>{updateLogs[0].items[0]}</p>
              <button type="button" className="archive-release-link" onClick={() => openRelease(updateLogs[0])}>查看更新内容 <ArrowUpRight size={15} /></button>
            </div>
          </section>
          <section className="quick-capture" aria-label="快速记录">
            <div className="quick-capture-copy"><span className="quick-capture-icon"><Plus size={16} /></span><div><p className="section-kicker">{quickCaptureEyebrow}</p><h2>今天记录什么？</h2><p>{quickCaptureHint}</p></div></div>
            <form className="quick-capture-form" onSubmit={saveQuickCapture}><div className="quick-type-picker" role="group" aria-label="记录类型"><button type="button" aria-pressed={quickCaptureType === 'knowledge'} className={quickCaptureType === 'knowledge' ? 'quick-type selected' : 'quick-type'} onClick={() => setQuickCaptureType('knowledge')}><BookOpen size={14} />知识</button><button type="button" aria-pressed={quickCaptureType === 'award'} className={quickCaptureType === 'award' ? 'quick-type selected' : 'quick-type'} onClick={() => setQuickCaptureType('award')}><Trophy size={14} />获奖</button></div><Input id="quick-capture-title" aria-label="快速记录标题" placeholder={quickCapturePlaceholder} value={quickCaptureTitle} onChange={(event) => setQuickCaptureTitle(event.target.value)} /><Button type="submit" className="quick-capture-submit"><Plus size={15} />保存</Button></form>
          </section>

          <div className="workspace-grid">
            <section className="knowledge-section">
              <div className="section-header"><div><p className="section-kicker">{logEyebrow} {String(sortedEntries.length).padStart(2, '0')} ENTRIES</p><h2>{viewTitle === '总览' ? '最近收集' : viewTitle === '知识库' ? '全部知识条目' : '全部获奖记录'}</h2></div><div className="view-tools"><div className="search-box"><Search size={16} /><Input id="search" aria-label="搜索知识与获奖记录" placeholder="搜索条目…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" className="clear-search" aria-label="清除搜索" onClick={() => setSearch('')}><X size={14} /></button>}</div><Select value={activeView} itemToStringLabel={(value) => value === 'all' ? '全部内容' : value === 'knowledge' ? '知识条目' : '获奖经历'} onValueChange={(value) => { if (value) changeView(value as ViewMode); }}><SelectTrigger className={'filter-trigger' + (activeView !== 'all' ? ' filter-active' : '')} aria-label="筛选内容类型"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部内容</SelectItem><SelectItem value="knowledge">知识条目</SelectItem><SelectItem value="award">获奖经历</SelectItem></SelectContent></Select><Select value={categoryFilter} itemToStringLabel={(value) => value === 'all' ? '全部分类' : value} onValueChange={(value) => { if (value) setCategoryFilter(value); }}><SelectTrigger className={'filter-trigger category-trigger' + (categoryFilter !== 'all' ? ' filter-active' : '')} aria-label="按分类筛选"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部分类</SelectItem>{categories.map((category) => <SelectItem value={category} key={category}>{category}</SelectItem>)}</SelectContent></Select><Select value={sortBy} itemToStringLabel={(value) => value === 'updated' ? '最近更新' : value === 'latest' ? '最近记录' : value === 'oldest' ? '最早记录' : '按标题'} onValueChange={(value) => { if (value) setSortBy(value as 'updated' | 'latest' | 'oldest' | 'title'); }}><SelectTrigger className={'filter-trigger sort-trigger' + (sortBy !== 'updated' ? ' filter-active' : '')} aria-label="排序记录"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="updated">最近更新</SelectItem><SelectItem value="latest">最近记录</SelectItem><SelectItem value="oldest">最早记录</SelectItem><SelectItem value="title">按标题</SelectItem></SelectContent></Select><div className="view-mode-toggle" role="group" aria-label="记录展示方式"><button type="button" aria-label="卡片视图" aria-pressed={entryView === 'cards'} className={entryView === 'cards' ? 'view-mode-button selected' : 'view-mode-button'} onClick={() => setEntryView('cards')}><LayoutGrid size={14} /></button><button type="button" aria-label="列表视图" aria-pressed={entryView === 'list'} className={entryView === 'list' ? 'view-mode-button selected' : 'view-mode-button'} onClick={() => setEntryView('list')}><List size={14} /></button></div></div></div>
               {sortedEntries.length === 0 ? <div className="empty-state"><FolderOpen size={27} /><h3>{emptyStateTitle}</h3><p>{emptyStateDescription}</p><button className="empty-state-action" type="button" onClick={() => openCreate(newRecordType)}><Plus size={14} />{newRecordType === 'award' ? '添加获奖记录' : '添加知识记录'}</button></div> : <div className={`entry-grid ${entryView === 'list' ? 'list-view' : ''}`}>{sortedEntries.map((entry, index) => <article style={{ '--entry-delay': `${Math.min(index, 14) * 16}ms` } as CSSProperties & { '--entry-delay': string }} className={`entry-card ${entry.type === 'award' ? 'entry-award' : 'entry-knowledge'} ${colorStyles[entry.color] ?? 'card-coral'}`} key={entry.id}><div className="entry-topline"><Badge className={`entry-type ${entry.type === 'award' ? 'award-badge' : ''}`}>{entry.type === 'award' ? '获奖' : '知识'}</Badge><button type="button" className="card-delete" aria-label={`删除记录：${entry.title}`} title="删除记录" onClick={() => setPendingConfirmation({ kind: 'delete', entry })}><Trash2 size={16} /></button></div><div className="entry-body"><p className="entry-category">{entry.category} <span className="entry-meta-separator" aria-hidden="true">│</span> {entry.date}</p><h3>{entry.title}</h3>{entry.summary.trim() && <p className="entry-excerpt">{entry.summary}</p>}</div><div className="entry-footer"><div className="tag-list">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><button type="button" className="entry-detail-button" onClick={() => { setSelectedEntry(entry); setDetailsOpen(true); }}>查看详情 <ArrowUpRight size={15} /></button></div></article>)}<button className="add-card" type="button" onClick={() => openCreate(activeView === 'award' ? 'award' : 'knowledge')}><span><Plus size={18} /></span><strong>添加下一条</strong><small>记录一个新发现</small></button></div>}
            </section>

            <aside className="right-column">
              <Collapsible open={milestonesOpen}>
                <section className="milestone-card" data-open={milestonesOpen}><CollapsibleTrigger className="side-card-heading side-card-trigger" aria-expanded={milestonesOpen} aria-controls="milestone-content" onClick={() => setMilestonesOpen((open) => !open)}><div><p className="section-kicker">{"// MILESTONES / "}{String(awardCount).padStart(2, '0')} AWARDS</p><h2>成长轨迹</h2></div><span className="side-card-toggle" aria-hidden="true"><ChevronDown size={17} /></span></CollapsibleTrigger><CollapsibleContent id="milestone-content" className="milestone-content" aria-hidden={!milestonesOpen} inert={!milestonesOpen}><div className="milestone-content-inner"><div className="timeline">{entries.filter((entry) => entry.type === 'award').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map((entry, index) => <div className="timeline-item" key={entry.id}><div className="timeline-dot">{index === 0 ? <Trophy size={14} /> : <Medal size={14} />}</div><div><p>{entry.date}</p><strong>{entry.title}</strong><span>{entry.category}</span></div></div>)}{awardCount === 0 && <p className="side-empty">添加你的第一项荣誉，让成长有迹可循。</p>}</div><button type="button" className="text-link" onClick={() => changeView('award')}>查看全部获奖 <ArrowUpRight size={14} /></button></div></CollapsibleContent></section>
              </Collapsible>
            </aside>
          </div>
          <footer className="page-footer"><span>当前日期 {displayDate}</span><span>浏览器本地保存 │ 导出 JSON 可备份</span></footer>
        </div>
      </section>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="entry-sheet detail-dialog" side="right">
          {selectedEntry && <>
            <p className="detail-record-kicker">{"// "}{selectedEntry.type === 'award' ? 'AWARD RECORD' : 'KNOWLEDGE RECORD'}</p>
            <div className="detail-topline"><Badge className={`entry-type ${selectedEntry.type === 'award' ? 'award-badge' : ''}`}>{selectedEntry.type === 'award' ? '获奖' : '知识'}</Badge><span>{selectedEntry.date}</span></div>
            <SheetHeader><SheetTitle>{selectedEntry.title}</SheetTitle><SheetDescription>{selectedEntry.category}</SheetDescription></SheetHeader>
            <div className="detail-copy"><h4>摘要</h4><p>{selectedEntry.summary}</p>{selectedEntry.notes && <><h4>详细笔记</h4><p>{selectedEntry.notes}</p></>}{selectedEntry.tags.length > 0 && <div className="detail-tags">{selectedEntry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}</div>
            <div className="detail-meta-grid"><div><span>内容形式</span><strong>{formatLabels[selectedEntry.format]}</strong></div>{selectedEntry.type === 'award' ? <>{selectedEntry.issuer && <div><span>颁发机构</span><strong>{selectedEntry.issuer}</strong></div>}{selectedEntry.awardLevel && <div><span>获奖级别</span><strong>{selectedEntry.awardLevel}</strong></div>}{selectedEntry.role && <div><span>个人角色</span><strong>{selectedEntry.role}</strong></div>}</> : <>{selectedEntry.source && <div><span>学习来源</span><strong>{selectedEntry.source}</strong></div>}</>}</div>
            {selectedEntry.related && <div className="detail-related"><span>关联记录</span>{selectedEntry.related.split(/[,，]/).map((related) => { const relatedTitle = related.trim(); const relatedEntry = entries.find((entry) => entry.title === relatedTitle); return <button type="button" key={relatedTitle} onClick={() => { if (relatedEntry) { setSelectedEntry(relatedEntry); } else { setSearch(relatedTitle); setDetailsOpen(false); } }}>{relatedTitle} {relatedEntry ? <ChevronRight size={13} /> : <ArrowUpRight size={13} />}</button>; })}</div>}
            {selectedEntry.proof && <a className="detail-link" href={selectedEntry.proof} target="_blank" rel="noreferrer"><ExternalLink size={14} />打开证明链接</a>}
            <SheetFooter><Button variant="outline" onClick={() => openEdit(selectedEntry)}><Pencil size={14} />编辑记录</Button><Button variant="destructive" onClick={() => setPendingConfirmation({ kind: 'delete', entry: selectedEntry })}><Trash2 size={14} />删除记录</Button></SheetFooter>
          </>}
        </SheetContent>
      </Sheet>
        <AlertDialog open={pendingConfirmation !== null} onOpenChange={(open) => { if (!open) setPendingConfirmation(null); }}>
        <AlertDialogContent className={pendingConfirmation?.kind === 'import' ? 'archive-import-dialog' : 'archive-delete-dialog'}>
          <AlertDialogHeader>
              <p className="delete-dialog-kicker">{pendingConfirmation?.kind === 'import' ? '// IMPORT SNAPSHOT' : '// DELETE RECORD'}</p>
              <AlertDialogTitle>{pendingConfirmation?.kind === 'import' ? '确认覆盖当前档案？' : '确认删除这条记录？'}</AlertDialogTitle>
              <AlertDialogDescription>{pendingConfirmation?.kind === 'import' ? `将用文件中的 ${pendingConfirmation.entries.length} 条记录替换当前 ${pendingConfirmation.replaceCount} 条记录，此操作无法撤销。` : `“${pendingConfirmation?.kind === 'delete' ? pendingConfirmation.entry.title : ''}”将从知识档案中移除，此操作无法撤销。`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction className={pendingConfirmation?.kind === 'import' ? 'archive-import-confirm' : 'archive-delete-confirm'} onClick={confirmPendingAction}>{pendingConfirmation?.kind === 'import' ? <FileUp size={14} /> : <Trash2 size={14} />}{pendingConfirmation?.kind === 'import' ? '导入并覆盖' : '确认删除'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={changelogOpen} onOpenChange={(open) => { setChangelogOpen(open); if (!open) setChangelogQuery(''); }}>
        <DialogContent className="entry-dialog changelog-dialog">
          <DialogHeader><p className="dialog-kicker">// CHANGE HISTORY</p><DialogTitle>更新日志</DialogTitle><DialogDescription>每次迭代都留下版本记录，方便回看知识花园如何慢慢长大。</DialogDescription></DialogHeader>
          <div className="release-tools"><label className="release-search"><Search size={15} aria-hidden="true" /><Input aria-label="搜索更新日志" placeholder="搜索版本、日期、标题或内容" value={changelogQuery} onChange={(event) => setChangelogQuery(event.target.value)} />{changelogQuery && <button type="button" className="release-search-clear" aria-label="清除更新日志搜索" onClick={() => setChangelogQuery('')}><X size={14} /></button>}</label><span className="release-count">{filteredUpdateLogs.length} / {updateLogs.length} 条</span></div>
          <div className="release-list">{filteredUpdateLogs.length > 0 ? filteredUpdateLogs.map((release) => <article className="release-item" key={release.version}><div className="release-heading"><span className="release-version">{release.version}</span><time>{release.date}</time></div><h3>{release.title}</h3><ul>{release.items.map((item) => <li key={item}>{item}</li>)}</ul></article>) : <div className="release-empty"><p>没有找到匹配的更新日志，请换个关键词试试。</p><button type="button" onClick={() => setChangelogQuery('')}>清空搜索</button></div>}</div>
        </DialogContent>
      </Dialog>
      {notice && createPortal(<div className="toast" role="status" aria-live="polite"><Check size={15} /> {notice}</div>, document.body)}
    </main>
  );
}
