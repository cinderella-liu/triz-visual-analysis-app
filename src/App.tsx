import {
  Archive,
  ArrowRight,
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  Check,
  CirclePlus,
  Clock3,
  FileText,
  GitBranch,
  Layers3,
  Lightbulb,
  Pencil,
  Save,
  Search,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type CaseStatus = "待整理" | "已建模" | "已识别矛盾" | "已生成原理" | "已形成方案";
type LegacyStatus = "草稿" | "分析中" | "已完成";
type ContradictionType = "技术矛盾" | "物理矛盾";

type TrizCase = {
  id: string;
  title: string;
  description: string;
  domain: string;
  systemName: string;
  goal: string;
  constraint: string;
  status: CaseStatus;
  contradictionType: ContradictionType;
  improvingParameter: string;
  worseningParameter: string;
  physicalContradiction: string;
  selectedPrincipleIds: number[];
  solutionHypothesis: string;
  updatedAt: string;
};

type CaseDraft = Pick<TrizCase, "title" | "description" | "domain" | "systemName" | "goal" | "constraint">;

type Parameter = {
  id: string;
  name: string;
  hint: string;
};

type Principle = {
  id: number;
  name: string;
  summary: string;
  action: string;
  tags: string[];
};

type ContradictionCandidate = {
  type: ContradictionType;
  title: string;
  statement: string;
  why: string;
};

type ResourceItem = {
  category: string;
  resource: string;
  move: string;
};

type SolutionConcept = {
  title: string;
  principle: string;
  mechanism: string;
  engineeringMove: string;
  validation: string;
  risk: string;
  impact: number;
  effort: number;
};

const storageKey = "triz.visual.analysis.cases.v2";
const legacyStorageKey = "triz.visual.analysis.cases.v1";

const parameters: Parameter[] = [
  { id: "weight", name: "重量", hint: "系统、部件或载荷变重" },
  { id: "size", name: "体积/厚度", hint: "尺寸、空间占用、便携性" },
  { id: "speed", name: "速度", hint: "响应、处理、运输或执行速度" },
  { id: "energy", name: "能量消耗", hint: "功耗、燃料、热量或资源消耗" },
  { id: "reliability", name: "可靠性", hint: "稳定、寿命、故障率" },
  { id: "accuracy", name: "精度", hint: "识别、测量、控制或定位精度" },
  { id: "complexity", name: "复杂度", hint: "结构、维护、学习或操作复杂度" },
  { id: "cost", name: "成本", hint: "制造、部署、时间或人力成本" },
  { id: "adaptability", name: "适应性", hint: "适配不同场景和变化条件" },
  { id: "automation", name: "自动化程度", hint: "减少人工判断和操作" },
  { id: "information", name: "信息可见性", hint: "反馈、监控、可解释性" },
  { id: "comfort", name: "易用性/体验", hint: "摩擦、舒适、安全感和学习成本" },
];

const principles: Principle[] = [
  {
    id: 1,
    name: "分割",
    summary: "把对象、流程或职责拆成更小的独立部分。",
    action: "把大问题拆成可独立调整的模块，再分别优化。",
    tags: ["size", "complexity", "cost"],
  },
  {
    id: 2,
    name: "抽取",
    summary: "把造成干扰的部分抽离，或只保留关键能力。",
    action: "移除非必要环节，把关键功能单独拿出来处理。",
    tags: ["energy", "accuracy", "comfort"],
  },
  {
    id: 3,
    name: "局部质量",
    summary: "不同位置、时间或对象采用不同配置。",
    action: "不要全局一刀切，让关键区域采用更合适的局部设计。",
    tags: ["adaptability", "accuracy", "reliability"],
  },
  {
    id: 10,
    name: "预先作用",
    summary: "提前完成必要动作，减少运行时负担。",
    action: "把计算、准备、校验或缓冲前置。",
    tags: ["speed", "reliability", "automation"],
  },
  {
    id: 15,
    name: "动态化",
    summary: "让系统参数、结构或流程可以按场景变化。",
    action: "把固定配置改成可切换、可伸缩、可自适应。",
    tags: ["adaptability", "comfort", "size"],
  },
  {
    id: 19,
    name: "周期性作用",
    summary: "用间歇、批处理或节奏化动作替代连续动作。",
    action: "把持续消耗改成按需启动、定时同步或批量处理。",
    tags: ["energy", "cost", "speed"],
  },
  {
    id: 23,
    name: "反馈",
    summary: "引入可观测反馈，让系统根据结果自动修正。",
    action: "增加状态监控、用户反馈或结果校验闭环。",
    tags: ["information", "accuracy", "reliability"],
  },
  {
    id: 24,
    name: "中介",
    summary: "使用中间对象、缓冲层或代理机制降低直接冲突。",
    action: "增加缓存、适配层、辅助工具或过渡状态。",
    tags: ["complexity", "comfort", "cost"],
  },
  {
    id: 25,
    name: "自服务",
    summary: "让系统利用自身资源完成维护、检测或调节。",
    action: "让对象自检、自恢复、自配置或自解释。",
    tags: ["automation", "reliability", "information"],
  },
  {
    id: 28,
    name: "机械系统替代",
    summary: "用光、电、声、场、软件或信息机制替代传统结构。",
    action: "把硬件负担转移到算法、传感或信息流。",
    tags: ["weight", "size", "automation"],
  },
  {
    id: 35,
    name: "参数变化",
    summary: "改变状态、浓度、弹性、温度、密度或节奏等参数。",
    action: "调整关键参数，而不是替换整个系统。",
    tags: ["energy", "speed", "adaptability"],
  },
  {
    id: 40,
    name: "复合材料",
    summary: "用组合结构获得单一材料或单一方法无法达到的效果。",
    action: "组合多种材料、流程、角色或能力，各取优势。",
    tags: ["weight", "reliability", "cost"],
  },
];

const emptyDraft: CaseDraft = {
  title: "",
  description: "",
  domain: "",
  systemName: "",
  goal: "",
  constraint: "",
};

const seedCases: TrizCase[] = [
  {
    id: "seed-battery",
    title: "手机续航与机身厚度矛盾",
    description: "如何让手机电池续航更长，同时不增加机身厚度？",
    domain: "消费电子",
    systemName: "智能手机",
    goal: "延长续航时间",
    constraint: "不增加机身厚度和重量",
    status: "已识别矛盾",
    contradictionType: "技术矛盾",
    improvingParameter: "energy",
    worseningParameter: "size",
    physicalContradiction: "电池既要容量更大，又不能占用更多空间。",
    selectedPrincipleIds: [28, 35, 40],
    solutionHypothesis: "通过高能量密度材料、动态功耗管理和软硬件协同降低单位任务能耗。",
    updatedAt: new Date().toISOString(),
  },
];

function migrateStatus(status: CaseStatus | LegacyStatus | undefined): CaseStatus {
  if (status === "已完成") return "已形成方案";
  if (status === "分析中") return "已建模";
  if (status === "草稿") return "待整理";
  return status ?? "待整理";
}

function normalizeCase(raw: Partial<TrizCase> & { status?: CaseStatus | LegacyStatus }): TrizCase {
  return {
    id: raw.id ?? crypto.randomUUID(),
    title: raw.title ?? "未命名案例",
    description: raw.description ?? "",
    domain: raw.domain ?? "",
    systemName: raw.systemName ?? "",
    goal: raw.goal ?? "",
    constraint: raw.constraint ?? "",
    status: migrateStatus(raw.status),
    contradictionType: raw.contradictionType ?? "技术矛盾",
    improvingParameter: raw.improvingParameter ?? "",
    worseningParameter: raw.worseningParameter ?? "",
    physicalContradiction: raw.physicalContradiction ?? "",
    selectedPrincipleIds: Array.isArray(raw.selectedPrincipleIds) ? raw.selectedPrincipleIds : [],
    solutionHypothesis: raw.solutionHypothesis ?? "",
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function loadCases(): TrizCase[] {
  const raw = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey);
  if (!raw) return seedCases;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeCase) : seedCases;
  } catch {
    return seedCases;
  }
}

function saveCases(cases: TrizCase[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(cases));
}

function createCase(draft: CaseDraft): TrizCase {
  return normalizeCase({
    ...draft,
    title: deriveTitle(draft),
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(status: CaseStatus) {
  if (status === "已形成方案") return "done";
  if (status === "已生成原理" || status === "已识别矛盾") return "active";
  if (status === "已建模") return "model";
  return "draft";
}

function caseCompleteness(item: TrizCase) {
  const fields = [
    item.title,
    item.description,
    item.domain,
    item.systemName,
    item.goal,
    item.constraint,
    item.improvingParameter,
    item.worseningParameter || item.physicalContradiction,
    item.selectedPrincipleIds.length ? "principles" : "",
    item.solutionHypothesis,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function deriveTitle(draft: CaseDraft) {
  return draft.title.trim() || draft.description.trim().slice(0, 24) || "未命名案例";
}

function parameterName(id: string) {
  return parameters.find((item) => item.id === id)?.name ?? "未选择";
}

function knownParameterName(id: string, fallback: string) {
  return parameters.find((item) => item.id === id)?.name ?? fallback;
}

function recommendPrinciples(item: TrizCase) {
  const signals = [item.improvingParameter, item.worseningParameter].filter(Boolean);
  const ranked = principles
    .map((principle) => ({
      principle,
      score: principle.tags.filter((tag) => signals.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || a.principle.id - b.principle.id);

  const matched = ranked.filter((item) => item.score > 0).map((item) => item.principle);
  return (matched.length ? matched : principles.slice(0, 4)).slice(0, 5);
}

function buildProblemBreakdown(item: TrizCase) {
  const improving = knownParameterName(item.improvingParameter, item.goal || "目标效果");
  const worsening = knownParameterName(item.worseningParameter, item.constraint || "副作用");

  return [
    {
      label: "系统对象",
      value: item.systemName || "待识别",
      insight: `先把分析边界限定在「${item.systemName || "当前系统"}」，避免把外部环境和系统内部问题混在一起。`,
    },
    {
      label: "有用功能",
      value: item.goal || "待识别",
      insight: `用户真正想增强的是「${improving}」，不是简单增加功能数量。`,
    },
    {
      label: "有害副作用",
      value: item.constraint || worsening,
      insight: `当前阻碍来自「${worsening}」或约束条件，TRIZ 要求在不牺牲它的前提下改进目标。`,
    },
    {
      label: "理想最终结果",
      value: `${item.goal || "目标改善"}，同时${item.constraint || "不引入新的副作用"}`,
      insight: "理想解不是折中，而是让有用功能增加、代价尽量不增加。",
    },
    {
      label: "可用资源",
      value: "结构、时间、信息、控制策略、材料、环境",
      insight: "优先寻找系统已有资源，再考虑新增部件或新增成本。",
    },
  ];
}

function buildContradictionCandidates(item: TrizCase): ContradictionCandidate[] {
  const system = item.systemName || "当前系统";
  const goal = item.goal || "目标效果";
  const constraint = item.constraint || knownParameterName(item.worseningParameter, "约束条件");
  const improving = knownParameterName(item.improvingParameter, goal);
  const worsening = knownParameterName(item.worseningParameter, constraint);

  return [
    {
      type: "技术矛盾",
      title: "性能提升 vs 副作用增加",
      statement: `为了提升「${improving}」，${system}通常会增加结构、能量、流程或控制强度，但这会恶化「${worsening}」。`,
      why: "这是最常见的工程矛盾，适合用发明原理寻找非折中路径。",
    },
    {
      type: "物理矛盾",
      title: "同一对象需要相反状态",
      statement:
        item.physicalContradiction ||
        `${system}在完成「${goal}」时需要更强/更多/更快，但在满足「${constraint}」时又需要更轻/更少/更稳。`,
      why: "物理矛盾适合用空间分离、时间分离、条件分离或整体/部分分离。",
    },
    {
      type: "技术矛盾",
      title: "自动化提升 vs 可控性下降",
      statement: `如果让${system}更自动地达成「${goal}」，可能带来调试困难、误判或用户不可理解，从而影响「${constraint}」。`,
      why: "很多软件、硬件和流程系统的问题，本质是控制闭环不足，而不是功能数量不足。",
    },
  ];
}

function buildResourceInventory(item: TrizCase): ResourceItem[] {
  const system = item.systemName || "当前系统";
  const goal = item.goal || "目标效果";
  const constraint = item.constraint || "关键约束";

  return [
    {
      category: "结构资源",
      resource: `${system}已有部件、模块、接口、支撑结构`,
      move: `优先复用已有结构承载「${goal}」，避免新增部件直接冲击「${constraint}」。`,
    },
    {
      category: "时间资源",
      resource: "空闲时段、启动前、运行间隙、低负载窗口",
      move: "把高成本动作前置、分批或按需触发，减少峰值压力。",
    },
    {
      category: "空间资源",
      resource: "未使用空间、边缘区域、可分层区域、远端/云端位置",
      move: "把冲突功能放到不同空间位置，降低同一区域内的竞争。",
    },
    {
      category: "信息资源",
      resource: "传感数据、日志、用户反馈、阈值、历史模式",
      move: "建立反馈闭环，让系统根据真实状态调整策略，而不是固定动作。",
    },
    {
      category: "场与材料资源",
      resource: "电、热、光、声、磁、软件模型、复合材料",
      move: "考虑用信息流、场效应或复合结构替代高代价机械/人工动作。",
    },
  ];
}

function buildSolutionConcepts(item: TrizCase, activePrinciples: Principle[]): SolutionConcept[] {
  const system = item.systemName || "当前系统";
  const goal = item.goal || "改善目标";
  const constraint = item.constraint || knownParameterName(item.worseningParameter, "副作用");
  const chosen = activePrinciples.length ? activePrinciples : recommendPrinciples(item).slice(0, 3);

  return chosen.slice(0, 4).map((principle, index) => {
    if (principle.id === 23) {
      return {
        title: "反馈闭环控制方案",
        principle: `${principle.id}. ${principle.name}`,
        mechanism: `给${system}增加状态采集、结果判断和纠偏规则，让系统按真实反馈接近「${goal}」。`,
        engineeringMove: "定义输入信号、阈值、异常状态和自动修正动作，形成最小闭环。",
        validation: `对比有/无反馈闭环时「${goal}」的提升幅度，并记录「${constraint}」是否恶化。`,
        risk: "反馈信号不准会导致误调节，需要先做日志和人工复核。",
        impact: 5,
        effort: 3,
      };
    }
    if (principle.id === 15 || principle.id === 35) {
      return {
        title: "动态参数切换方案",
        principle: `${principle.id}. ${principle.name}`,
        mechanism: `把${system}的固定参数改成多档位或自适应策略，在不同场景下分别优化「${goal}」和「${constraint}」。`,
        engineeringMove: "列出高负载、低负载、异常、人工接管四类场景，并为每类配置不同策略。",
        validation: "做场景 A/B 测试，观察目标指标、副作用指标和切换稳定性。",
        risk: "规则过多会增加维护复杂度，需要限制首版策略数量。",
        impact: 4,
        effort: 3,
      };
    }
    if (principle.id === 28) {
      return {
        title: "信息替代物理负担方案",
        principle: `${principle.id}. ${principle.name}`,
        mechanism: `把${system}中成本高、体积大或动作慢的部分转移到算法、传感、预测或软件控制。`,
        engineeringMove: "找出最重/最慢/最贵的环节，判断哪些可以用模型预测、软件补偿或远端处理替代。",
        validation: "用模拟数据或小样机验证替代后是否仍能达到核心性能。",
        risk: "算法替代会引入误差边界，需要定义失败保护策略。",
        impact: 5,
        effort: 4,
      };
    }
    if (principle.id === 1 || principle.id === 3) {
      return {
        title: "分区分层优化方案",
        principle: `${principle.id}. ${principle.name}`,
        mechanism: `把${system}拆成关键区和非关键区，只在真正影响「${goal}」的位置投入增强。`,
        engineeringMove: "画出功能模块图，标记高价值节点、瓶颈节点和可降级节点。",
        validation: "先优化一个关键节点，验证整体指标是否改善，再决定是否扩展。",
        risk: "拆分边界错误会造成局部优化、整体无效。",
        impact: 4,
        effort: 2,
      };
    }
    if (principle.id === 10 || principle.id === 19) {
      return {
        title: "预处理与节奏化方案",
        principle: `${principle.id}. ${principle.name}`,
        mechanism: `把${system}的高成本动作提前准备、批量处理或周期触发，减少实时运行压力。`,
        engineeringMove: "识别可以预计算、预装配、预校验或批处理的步骤，并把它们移出关键路径。",
        validation: "测量关键路径耗时、峰值资源占用和异常恢复时间。",
        risk: "预处理结果可能过期，需要设置刷新条件。",
        impact: 3,
        effort: 2,
      };
    }

    return {
      title: `${principle.name}驱动方案`,
      principle: `${principle.id}. ${principle.name}`,
      mechanism: `${principle.action}，让${system}绕开「${constraint}」对「${goal}」的限制。`,
      engineeringMove: "把该原理转成一个可画图、可做样机、可测指标的设计动作。",
      validation: "做最小实验，比较目标指标和副作用指标的变化。",
      risk: "原理转译可能过宽，需要用真实指标收敛。",
      impact: Math.max(3, 5 - index),
      effort: 2 + index,
    };
  });
}

function buildDecisionSummary(concepts: SolutionConcept[]) {
  const ranked = [...concepts].sort((a, b) => b.impact - b.effort - (a.impact - a.effort));
  const best = ranked[0];
  if (!best) return "先补充矛盾参数，系统会生成可比较的方案候选。";
  return `优先验证「${best.title}」：收益/代价比最高，适合作为第一轮工程实验。`;
}

function generateAnalysisPlan(item: TrizCase, activePrinciples: Principle[]) {
  const improving = knownParameterName(item.improvingParameter, item.goal || "待改善参数");
  const worsening = knownParameterName(item.worseningParameter, item.constraint || "可能恶化参数");
  const contradiction =
    item.contradictionType === "技术矛盾"
      ? `希望改善「${improving}」，但可能恶化「${worsening}」。`
      : item.physicalContradiction || `同一系统同时需要满足互相冲突的状态。`;
  const breakdown = buildProblemBreakdown(item);
  const contradictionCandidates = buildContradictionCandidates(item);
  const resources = buildResourceInventory(item);
  const concepts = buildSolutionConcepts(item, activePrinciples);
  const principleLines = activePrinciples.map(
    (principle, index) => `${index + 1}. ${principle.name}：${principle.action}`,
  );

  return [
    `TRIZ 分析报告：${item.title}`,
    "",
    "一、问题拆解",
    ...breakdown.map((part) => `- ${part.label}：${part.value}。${part.insight}`),
    "",
    "二、矛盾推导",
    `- 表层问题：${item.description || "待补充问题描述"}`,
    `- 技术矛盾：${contradiction}`,
    `- 物理矛盾：${item.physicalContradiction || `系统既要提升「${improving}」，又不能付出「${worsening}」代价。`}`,
    `- TRIZ 关键问法：怎样让「${improving}」变好，同时不让「${worsening}」变差？`,
    ...contradictionCandidates.map((candidate, index) => `- 候选 ${index + 1}（${candidate.type}）：${candidate.statement} ${candidate.why}`),
    "",
    "三、资源盘点",
    ...resources.map((resource) => `- ${resource.category}：${resource.resource}。${resource.move}`),
    "",
    "四、可用发明原理",
    ...principleLines,
    "",
    "五、方案候选",
    ...concepts.map(
      (concept, index) =>
        `${index + 1}. ${concept.title}（${concept.principle}）：${concept.mechanism} 工程动作：${concept.engineeringMove} 验证：${concept.validation} 风险：${concept.risk}`,
    ),
    "",
    "六、验证路径",
    `- 目标指标：验证「${improving}」是否显著改善。`,
    `- 副作用指标：验证「${worsening}」是否没有明显恶化。`,
    "- 最小实验：先做一个低成本原型或流程模拟，用前后对比数据判断方案是否值得继续。",
    `- 首选实验：${buildDecisionSummary(concepts)}`,
    "- 决策标准：只有当目标收益大于新增复杂度、成本和风险时，才进入下一轮方案深化。",
  ].join("\n");
}

function buildStage(item: TrizCase): CaseStatus {
  if (item.solutionHypothesis.trim()) return "已形成方案";
  if (item.selectedPrincipleIds.length) return "已生成原理";
  if (item.improvingParameter && (item.worseningParameter || item.physicalContradiction)) return "已识别矛盾";
  if (item.description && item.systemName && item.goal) return "已建模";
  return "待整理";
}

export function App() {
  const [cases, setCases] = useState<TrizCase[]>(loadCases);
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CaseDraft>(emptyDraft);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    saveCases(cases);
  }, [cases]);

  const selectedCase = cases.find((item) => item.id === selectedId) ?? cases[0];

  const filteredCases = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return cases;

    return cases.filter((item) =>
      [item.title, item.description, item.domain, item.systemName, item.goal]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [cases, query]);

  const stats = useMemo(
    () => ({
      total: cases.length,
      modeled: cases.filter((item) => item.status !== "待整理").length,
      solved: cases.filter((item) => item.status === "已形成方案").length,
    }),
    [cases],
  );

  const recommended = selectedCase ? recommendPrinciples(selectedCase) : [];
  const selectedPrinciples = selectedCase
    ? principles.filter((principle) => selectedCase.selectedPrincipleIds.includes(principle.id))
    : [];
  const breakdown = selectedCase ? buildProblemBreakdown(selectedCase) : [];
  const activePrinciples = selectedPrinciples.length ? selectedPrinciples : recommended.slice(0, 3);
  const contradictionCandidates = selectedCase ? buildContradictionCandidates(selectedCase) : [];
  const resources = selectedCase ? buildResourceInventory(selectedCase) : [];
  const solutionConcepts = selectedCase ? buildSolutionConcepts(selectedCase, activePrinciples) : [];
  const decisionSummary = buildDecisionSummary(solutionConcepts);

  function updateCases(nextCases: TrizCase[]) {
    setCases(nextCases);
    if (!nextCases.some((item) => item.id === selectedId)) {
      setSelectedId(nextCases[0]?.id ?? "");
    }
  }

  function updateCase(nextCase: TrizCase) {
    updateCases(
      cases.map((item) =>
        item.id === nextCase.id
          ? {
              ...nextCase,
              status: buildStage(nextCase),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }

  function updateSelected<K extends keyof TrizCase>(key: K, value: TrizCase[K]) {
    if (!selectedCase) return;
    updateCase({ ...selectedCase, [key]: value });
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();

    const nextCase = createCase({
      title: deriveTitle(draft),
      description: draft.description.trim(),
      domain: draft.domain.trim(),
      systemName: draft.systemName.trim(),
      goal: draft.goal.trim(),
      constraint: draft.constraint.trim(),
    });

    updateCases([nextCase, ...cases]);
    setSelectedId(nextCase.id);
    setDraft(emptyDraft);
  }

  function beginEdit(item: TrizCase) {
    setDraft({
      title: item.title,
      description: item.description,
      domain: item.domain,
      systemName: item.systemName,
      goal: item.goal,
      constraint: item.constraint,
    });
    setEditing(true);
  }

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCase) return;

    updateCase({
      ...selectedCase,
      ...draft,
      title: deriveTitle(draft),
    });
    setEditing(false);
    setDraft(emptyDraft);
  }

  function removeCase(id: string) {
    updateCases(cases.filter((item) => item.id !== id));
  }

  function togglePrinciple(id: number) {
    if (!selectedCase) return;
    const exists = selectedCase.selectedPrincipleIds.includes(id);
    updateSelected(
      "selectedPrincipleIds",
      exists
        ? selectedCase.selectedPrincipleIds.filter((item) => item !== id)
        : [...selectedCase.selectedPrincipleIds, id],
    );
  }

  function handleGeneratePlan() {
    if (!selectedCase) return;
    updateCase({
      ...selectedCase,
      selectedPrincipleIds: activePrinciples.map((principle) => principle.id),
      solutionHypothesis: generateAnalysisPlan(selectedCase, activePrinciples),
    });
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">TRIZ V2 可视化分析工具</p>
            <h1>分析收件箱</h1>
          </div>
          <button className="icon-button" aria-label="打开方法库">
            <BookOpen size={20} />
          </button>
        </header>

        <section className="stats-grid" aria-label="案例统计">
          <StatCard icon={<Archive size={19} />} label="案例" value={stats.total} />
          <StatCard icon={<BrainCircuit size={19} />} label="已建模" value={stats.modeled} />
          <StatCard icon={<Check size={19} />} label="方案" value={stats.solved} />
        </section>

        <section className="capture-panel">
          <div className="section-title">
            <CirclePlus size={19} />
            <h2>{editing ? "编辑案例" : "新建分析"}</h2>
          </div>
          <CaseForm draft={draft} setDraft={setDraft} onSubmit={editing ? saveEdit : handleCreate} mode={editing ? "edit" : "create"} />
          {editing ? (
            <button
              className="ghost-button full-width"
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(emptyDraft);
              }}
            >
              <X size={18} />
              取消编辑
            </button>
          ) : null}
        </section>

        <section className="case-list-panel">
          <div className="section-title">
            <FileText size={19} />
            <h2>我的案例</h2>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索案例、系统或目标"
            />
          </label>
          <div className="case-list">
            {filteredCases.map((item) => (
              <button
                className={`case-item ${item.id === selectedCase?.id ? "selected" : ""}`}
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
              >
                <span className="case-item-title">{item.title}</span>
                <span className="case-item-meta">
                  <span className={`status-pill ${statusTone(item.status)}`}>{item.status}</span>
                  <span>{formatDate(item.updatedAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </section>

      <aside className="detail-pane">
        {selectedCase ? (
          <>
            <div className="detail-header">
              <div>
                <p className="eyebrow">当前案例</p>
                <h2>{selectedCase.title}</h2>
              </div>
              <div className="detail-actions">
                <button className="icon-button" aria-label="编辑案例" onClick={() => beginEdit(selectedCase)}>
                  <Pencil size={18} />
                </button>
                <button className="icon-button danger" aria-label="删除案例" onClick={() => removeCase(selectedCase.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="progress-block">
              <div className="progress-label">
                <span>分析完整度</span>
                <strong>{caseCompleteness(selectedCase)}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${caseCompleteness(selectedCase)}%` }} />
              </div>
            </div>

            <WorkflowSteps status={selectedCase.status} />

            <section className="engine-panel">
              <div className="section-title">
                <BrainCircuit size={19} />
                <h2>TRIZ 分析引擎</h2>
              </div>
              <div className="engine-grid">
                <div>
                  <span>当前判断</span>
                  <strong>{decisionSummary}</strong>
                </div>
                <div>
                  <span>分析输出</span>
                  <strong>矛盾候选 + 资源盘点 + 方案候选 + 验证实验</strong>
                </div>
              </div>
              <button className="primary-button full-width" type="button" onClick={handleGeneratePlan}>
                <Sparkles size={18} />
                一键分析工程问题
              </button>
            </section>

            <section className="decomposition-panel">
              <div className="section-title">
                <FileText size={19} />
                <h2>问题拆解</h2>
              </div>
              <div className="decomposition-grid">
                {breakdown.map((item) => (
                  <div className="decomposition-card" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.insight}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="analysis-board">
              <div className="section-title">
                <BrainCircuit size={19} />
                <h2>矛盾分析向导</h2>
              </div>

              <div className="switch-row" role="group" aria-label="矛盾类型">
                {(["技术矛盾", "物理矛盾"] as const).map((type) => (
                  <button
                    key={type}
                    className={selectedCase.contradictionType === type ? "switch-option active" : "switch-option"}
                    type="button"
                    onClick={() => updateSelected("contradictionType", type)}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="parameter-grid">
                <label>
                  想改善的参数
                  <select
                    value={selectedCase.improvingParameter}
                    onChange={(event) => updateSelected("improvingParameter", event.target.value)}
                  >
                    <option value="">请选择</option>
                    {parameters.map((parameter) => (
                      <option key={parameter.id} value={parameter.id}>
                        {parameter.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  可能恶化的参数
                  <select
                    value={selectedCase.worseningParameter}
                    onChange={(event) => updateSelected("worseningParameter", event.target.value)}
                  >
                    <option value="">请选择</option>
                    {parameters.map((parameter) => (
                      <option key={parameter.id} value={parameter.id}>
                        {parameter.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                物理矛盾表达
                <textarea
                  className="compact-textarea"
                  value={selectedCase.physicalContradiction}
                  onChange={(event) => updateSelected("physicalContradiction", event.target.value)}
                  placeholder="例如：电池既要容量更大，又不能占用更多空间"
                />
              </label>
            </section>

            <section className="contradiction-panel">
              <div className="section-title">
                <AlertTriangle size={19} />
                <h2>矛盾候选</h2>
              </div>
              <div className="contradiction-list">
                {contradictionCandidates.map((candidate) => (
                  <article className="contradiction-card" key={candidate.title}>
                    <span>{candidate.type}</span>
                    <strong>{candidate.title}</strong>
                    <p>{candidate.statement}</p>
                    <small>{candidate.why}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="resource-panel">
              <div className="section-title">
                <Layers3 size={19} />
                <h2>资源盘点</h2>
              </div>
              <div className="resource-grid">
                {resources.map((resource) => (
                  <article className="resource-card" key={resource.category}>
                    <span>{resource.category}</span>
                    <strong>{resource.resource}</strong>
                    <p>{resource.move}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="principle-panel">
              <div className="section-title">
                <Sparkles size={19} />
                <h2>推荐发明原理</h2>
              </div>
              <div className="principle-list">
                {recommended.map((principle) => (
                  <button
                    className={`principle-card ${selectedCase.selectedPrincipleIds.includes(principle.id) ? "selected" : ""}`}
                    key={principle.id}
                    type="button"
                    onClick={() => togglePrinciple(principle.id)}
                  >
                    <span>{principle.id}</span>
                    <strong>{principle.name}</strong>
                    <small>{principle.summary}</small>
                  </button>
                ))}
              </div>
              <button className="primary-button plan-button" type="button" onClick={handleGeneratePlan}>
                <Sparkles size={18} />
                生成 TRIZ 分析方案
              </button>
              <label>
                TRIZ 分析报告
                <textarea
                  className="plan-textarea"
                  value={selectedCase.solutionHypothesis}
                  onChange={(event) => updateSelected("solutionHypothesis", event.target.value)}
                  placeholder="点击「生成分析方案」，系统会把矛盾和发明原理转成可验证方案"
                />
              </label>
            </section>

            <section className="possibility-panel">
              <div className="section-title">
                <Wrench size={19} />
                <h2>方案候选</h2>
              </div>
              <div className="solution-grid">
                {solutionConcepts.map((concept) => (
                  <article className="solution-card" key={concept.title}>
                    <div className="solution-head">
                      <span>{concept.principle}</span>
                      <strong>{concept.title}</strong>
                    </div>
                    <p>{concept.mechanism}</p>
                    <dl>
                      <div>
                        <dt>工程动作</dt>
                        <dd>{concept.engineeringMove}</dd>
                      </div>
                      <div>
                        <dt>验证实验</dt>
                        <dd>{concept.validation}</dd>
                      </div>
                      <div>
                        <dt>风险</dt>
                        <dd>{concept.risk}</dd>
                      </div>
                    </dl>
                    <div className="score-row">
                      <span>收益 {concept.impact}/5</span>
                      <span>难度 {concept.effort}/5</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="analysis-path" aria-label="分析图谱">
              <div className="section-title">
                <GitBranch size={19} />
                <h2>理论分析图谱</h2>
              </div>
              <AnalysisGraph item={selectedCase} selectedPrinciples={selectedPrinciples} />
            </section>

            <section className="next-step">
              <Lightbulb size={20} />
              <p>{decisionSummary}</p>
            </section>
          </>
        ) : (
          <section className="empty-state">
            <FileText size={28} />
            <h2>还没有案例</h2>
            <p>创建第一个 TRIZ 分析案例后，这里会显示详情和分析路径。</p>
          </section>
        )}
      </aside>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="stat-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CaseForm({
  draft,
  setDraft,
  onSubmit,
  mode,
}: {
  draft: CaseDraft;
  setDraft: (next: CaseDraft) => void;
  onSubmit: (event: FormEvent) => void;
  mode: "create" | "edit";
}) {
  function update<K extends keyof CaseDraft>(key: K, value: CaseDraft[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <form className="case-form" onSubmit={onSubmit}>
      <label>
        案例标题
        <input
          value={draft.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder="例如：手机续航与机身厚度矛盾"
        />
      </label>
      <label>
        问题描述
        <textarea
          value={draft.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="描述你想分析的产品、系统或工程问题"
          required
        />
      </label>
      <div className="form-grid">
        <label>
          行业场景
          <input value={draft.domain} onChange={(event) => update("domain", event.target.value)} placeholder="消费电子" />
        </label>
        <label>
          当前系统
          <input value={draft.systemName} onChange={(event) => update("systemName", event.target.value)} placeholder="智能手机" />
        </label>
      </div>
      <div className="form-grid">
        <label>
          改善目标
          <input value={draft.goal} onChange={(event) => update("goal", event.target.value)} placeholder="延长续航" />
        </label>
        <label>
          限制条件
          <input value={draft.constraint} onChange={(event) => update("constraint", event.target.value)} placeholder="不增加厚度" />
        </label>
      </div>
      <button className="primary-button" type="submit">
        <Save size={18} />
        {mode === "create" ? "保存案例" : "保存修改"}
      </button>
    </form>
  );
}

function WorkflowSteps({ status }: { status: CaseStatus }) {
  const steps: CaseStatus[] = ["待整理", "已建模", "已识别矛盾", "已生成原理", "已形成方案"];
  const activeIndex = Math.max(0, steps.indexOf(status));

  return (
    <section className="workflow" aria-label="分析阶段">
      {steps.map((step, index) => (
        <div className={`workflow-step ${index <= activeIndex ? "active" : ""}`} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </section>
  );
}

function AnalysisGraph({ item, selectedPrinciples }: { item: TrizCase; selectedPrinciples: Principle[] }) {
  const nodes = [
    { title: "问题", value: item.description || "未填写" },
    { title: "系统", value: item.systemName || "未填写" },
    {
      title: item.contradictionType,
      value:
        item.contradictionType === "技术矛盾"
          ? `${parameterName(item.improvingParameter)} -> ${parameterName(item.worseningParameter)}`
          : item.physicalContradiction || "待表达",
    },
    {
      title: "原理",
      value: selectedPrinciples.length ? selectedPrinciples.map((principle) => principle.name).join(" / ") : "待推荐",
    },
    { title: "方案", value: item.solutionHypothesis || "待形成" },
  ];

  return (
    <div className="graph-card">
      <div className="graph-flow">
        {nodes.map((node, index) => (
          <div className="graph-node-wrap" key={node.title}>
            <PathNode title={node.title} value={node.value} />
            {index < nodes.length - 1 ? (
              <span className="graph-arrow" aria-hidden="true">
                <ArrowRight size={18} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="parameter-hints">
        {parameters
          .filter((parameter) => [item.improvingParameter, item.worseningParameter].includes(parameter.id))
          .map((parameter) => (
            <span key={parameter.id}>
              <strong>{parameter.name}</strong>
              {parameter.hint}
            </span>
          ))}
      </div>
    </div>
  );
}

function PathNode({ title, value }: { title: string; value: string }) {
  return (
    <div className="path-node">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
