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
import { Capacitor, CapacitorHttp } from "@capacitor/core";
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
  imaQueryDraft: string;
  knowledgeNotes: string;
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
  partsToChange?: string[];
  implementationSteps?: string[];
  metrics?: string[];
  decisionGate?: string;
};

type DiagnosticQuestion = {
  question: string;
  example: string;
};

type ImaQuery = {
  label: string;
  query: string;
  target: string;
};

type ImaApiConfig = {
  endpoint: string;
  clientId: string;
  apiKey: string;
  model: string;
};

type ImaRunState = {
  status: "idle" | "running" | "done" | "error";
  message: string;
};

type StructuredKnowledge = {
  principles: string[];
  cases: string[];
  formulas: string[];
  experiments: string[];
  risks: string[];
};

const storageKey = "triz.visual.analysis.cases.v2";
const legacyStorageKey = "triz.visual.analysis.cases.v1";
const imaConfigStorageKey = "triz.visual.analysis.ima.config.v1";

const emptyImaConfig: ImaApiConfig = {
  endpoint: "https://ima.qq.com/openapi/wiki/v1/search_knowledge_base",
  clientId: "",
  apiKey: "",
  model: "official-ima-wiki",
};

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
    imaQueryDraft: "",
    knowledgeNotes: "",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-inertial-precision",
    title: "惯性系统精度提升与体积不增加",
    description: "惯性导航系统希望提升姿态和位置测量精度，但不能增加 IMU 体积、重量和功耗。",
    domain: "惯性导航/传感器",
    systemName: "小型化惯性测量单元 IMU",
    goal: "提升导航与姿态测量精度",
    constraint: "不增加体积、重量和功耗",
    status: "已识别矛盾",
    contradictionType: "物理矛盾",
    improvingParameter: "accuracy",
    worseningParameter: "size",
    physicalContradiction: "谐振子或传感器规模既要更大以提升精度，又要更小以满足体积约束。",
    selectedPrincipleIds: [2, 1, 15, 23, 24],
    solutionHypothesis: "",
    imaQueryDraft: "",
    knowledgeNotes:
      "可优先检索误差建模、Allan 方差、ARW/VRW、卡尔曼滤波、MEMS 阵列、自校准、转台标定、零偏和标度因数补偿等资料。",
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
    imaQueryDraft: raw.imaQueryDraft ?? "",
    knowledgeNotes: raw.knowledgeNotes ?? "",
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

function loadImaApiConfig(): ImaApiConfig {
  const raw = window.localStorage.getItem(imaConfigStorageKey);
  if (!raw) return emptyImaConfig;

  try {
    const parsed = JSON.parse(raw) as Partial<ImaApiConfig>;
    return {
      endpoint: parsed.endpoint?.includes("chat/completions") ? emptyImaConfig.endpoint : parsed.endpoint ?? emptyImaConfig.endpoint,
      clientId: parsed.clientId ?? "",
      apiKey: parsed.apiKey ?? "",
      model: parsed.model ?? "official-ima-wiki",
    };
  } catch {
    return emptyImaConfig;
  }
}

function saveImaApiConfig(config: ImaApiConfig) {
  window.localStorage.setItem(imaConfigStorageKey, JSON.stringify(config));
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
  if (isInertialPrecisionCase(item)) {
    return [2, 1, 15, 23, 24]
      .map((id) => principles.find((principle) => principle.id === id))
      .filter(Boolean) as Principle[];
  }

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

function isInertialPrecisionCase(item: TrizCase) {
  const text = [item.description, item.goal, item.constraint, item.domain, item.systemName, item.knowledgeNotes]
    .join(" ")
    .toLowerCase();
  const isInertial = ["惯性", "imu", "陀螺", "加速度计", "导航", "inertial", "gyro"].some((word) => text.includes(word));
  const isPrecision = ["精度", "误差", "漂移", "零偏", "accuracy", "error"].some((word) => text.includes(word)) || item.improvingParameter === "accuracy";
  const isSizeBound = ["体积", "尺寸", "重量", "功耗", "size", "weight"].some((word) => text.includes(word)) || ["size", "weight"].includes(item.worseningParameter);

  return isInertial && isPrecision && isSizeBound;
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

function inferProblemFocus(item: TrizCase) {
  if (isInertialPrecisionCase(item)) return "inertialPrecision";

  const text = [item.description, item.goal, item.constraint, item.domain, item.systemName]
    .join(" ")
    .toLowerCase();
  const signals = [item.improvingParameter, item.worseningParameter, text];

  if (signals.some((value) => String(value).includes("energy") || String(value).includes("续航") || String(value).includes("电池") || String(value).includes("功耗"))) {
    return "energy";
  }
  if (signals.some((value) => String(value).includes("speed") || String(value).includes("速度") || String(value).includes("响应") || String(value).includes("延迟"))) {
    return "speed";
  }
  if (signals.some((value) => String(value).includes("accuracy") || String(value).includes("精度") || String(value).includes("识别") || String(value).includes("误差"))) {
    return "accuracy";
  }
  if (signals.some((value) => String(value).includes("reliability") || String(value).includes("可靠") || String(value).includes("故障") || String(value).includes("稳定"))) {
    return "reliability";
  }
  if (signals.some((value) => String(value).includes("size") || String(value).includes("weight") || String(value).includes("体积") || String(value).includes("重量") || String(value).includes("厚度"))) {
    return "structure";
  }
  if (signals.some((value) => String(value).includes("cost") || String(value).includes("成本") || String(value).includes("预算"))) {
    return "cost";
  }
  return "general";
}

function buildConcreteParts(item: TrizCase, principle: string) {
  const system = item.systemName || "当前系统";
  const focus = inferProblemFocus(item);
  const common = [`${system}的关键功能模块`, "采集/反馈信号", "控制策略或工作流程"];

  if (focus === "inertialPrecision") {
    return ["陀螺零偏/标度因数/安装误差", "加速度计偏置和随机噪声", "温度补偿模型与卡尔曼滤波状态量", "不改变体积的冗余/融合路径"];
  }
  if (focus === "energy") return ["耗能最高的模块", "电源/电池/供能路径", "后台任务和待机策略"];
  if (focus === "speed") return ["关键路径步骤", "缓存或预处理模块", "等待/排队环节"];
  if (focus === "accuracy") return ["传感或输入数据", "校准规则", "误差检测与复核流程"];
  if (focus === "reliability") return ["高故障部件", "冗余或降级路径", "异常检测和恢复机制"];
  if (focus === "structure") return ["占空间/重量最大的部件", "承力或支撑结构", "可分层或可折叠区域"];
  if (focus === "cost") return ["高成本物料/工序", "可复用标准件", "人工维护步骤"];
  if (principle.includes("反馈")) return ["状态采集点", "判断阈值", "自动纠偏动作"];
  return common;
}

function buildConcreteSteps(item: TrizCase, conceptTitle: string) {
  const system = item.systemName || "当前系统";
  const goal = item.goal || "目标指标";
  const constraint = item.constraint || "副作用指标";
  const focus = inferProblemFocus(item);

  if (focus === "inertialPrecision") {
    return [
      "先做静基座不少于 2 小时的数据采集，计算 Allan 方差，提取 BI、ARW、VRW。",
      "用三轴转台输入 1/10/50/100 deg/s，标定标度因数、安装误差和非线性项。",
      "把零偏、温度项、标度因数和安装误差写入补偿模型，再用卡尔曼滤波在线估计残余漂移。",
    ];
  }
  if (focus === "energy") {
    return [
      `列出${system}在典型使用场景下的前三个耗能来源。`,
      "把每个耗能来源拆成可关闭、可降频、可延后、可替代四类动作。",
      `先做一个只影响单一场景的原型，比较「${goal}」和「${constraint}」的变化。`,
    ];
  }
  if (focus === "speed") {
    return [
      "画出从输入到输出的关键路径，标出等待时间最长的步骤。",
      "把可预处理、可缓存、可并行的步骤移出主路径。",
      "用同一批测试样本测量改造前后的 P50/P95 响应时间。",
    ];
  }
  if (focus === "accuracy") {
    return [
      "先定义错误类型：误识别、漏识别、漂移、噪声还是人工判断不一致。",
      "增加校准样本、二次判断或反馈复核机制。",
      "用固定测试集比较准确率、误报率、漏报率和人工修正次数。",
    ];
  }
  if (focus === "reliability") {
    return [
      "找出最常发生故障的部件、状态或操作步骤。",
      "增加检测点、降级路径或自恢复动作。",
      "用压力测试和异常注入验证故障率、恢复时间和用户影响范围。",
    ];
  }
  if (focus === "structure") {
    return [
      "把空间、重量或厚度贡献最大的部件列成清单。",
      "尝试分层、折叠、复合材料、共用结构或功能转移。",
      "用体积/重量/强度/散热四类指标判断是否值得进入样机。",
    ];
  }
  if (focus === "cost") {
    return [
      "拆出 BOM、工时、维护、返修和培训五类成本。",
      "优先替换高成本低差异化环节，而不是削弱核心性能。",
      "用单件成本、返工率和交付周期判断方案是否成立。",
    ];
  }

  return [
    `把「${conceptTitle}」拆成一个可改造对象、一个控制动作和一个反馈指标。`,
    `先只改${system}的一个局部，避免一次性改变整个系统。`,
    `验证「${goal}」是否提升，同时确认「${constraint}」没有明显恶化。`,
  ];
}

function buildConcreteMetrics(item: TrizCase) {
  const improving = knownParameterName(item.improvingParameter, item.goal || "目标指标");
  const worsening = knownParameterName(item.worseningParameter, item.constraint || "副作用指标");
  const focus = inferProblemFocus(item);

  if (focus === "inertialPrecision") return ["零偏不稳定性 BI", "角度随机游走 ARW", "速度随机游走 VRW", "标度因数非线性", "1h 位置误差增长", "体积/重量/功耗变化"];
  if (focus === "energy") return ["单位任务耗电量", "连续使用时长", "峰值功耗", "温升"];
  if (focus === "speed") return ["平均响应时间", "P95 延迟", "吞吐量", "失败重试次数"];
  if (focus === "accuracy") return ["准确率", "误报率", "漏报率", "人工修正次数"];
  if (focus === "reliability") return ["故障率", "平均恢复时间", "异常覆盖率", "降级成功率"];
  if (focus === "structure") return ["体积", "重量", "强度", "散热余量"];
  if (focus === "cost") return ["单件成本", "工时", "返工率", "维护成本"];
  return [improving, worsening, "新增复杂度", "用户可感知收益"];
}

function buildDecisionGate(item: TrizCase, concept: Pick<SolutionConcept, "impact" | "effort">) {
  if (isInertialPrecisionCase(item)) {
    return "进入下一轮的条件：精度提升不少于 20%，体积增加不超过 5%；若目标是惯性级，继续追踪标度因数相对误差、安装误差和漂移绝对误差。";
  }

  const goal = item.goal || knownParameterName(item.improvingParameter, "目标指标");
  const constraint = item.constraint || knownParameterName(item.worseningParameter, "约束指标");
  const expectedLift = concept.impact >= 5 ? "20%" : "10%";
  const allowedCost = concept.effort >= 4 ? "5%" : "10%";
  return `进入下一轮的条件：${goal}至少改善 ${expectedLift}，同时${constraint}恶化不超过 ${allowedCost}。`;
}

function completeConcept(concept: SolutionConcept, item: TrizCase): SolutionConcept {
  return {
    ...concept,
    partsToChange: buildConcreteParts(item, concept.principle),
    implementationSteps: buildConcreteSteps(item, concept.title),
    metrics: buildConcreteMetrics(item),
    decisionGate: buildDecisionGate(item, concept),
  };
}

function buildDiagnosticQuestions(item: TrizCase): DiagnosticQuestion[] {
  const system = item.systemName || "这个系统";
  const questions: DiagnosticQuestion[] = [];

  if (!item.systemName) {
    questions.push({ question: "这个问题发生在哪个具体系统或部件上？", example: "例如：手机电池、散热结构、识别算法、装配工位" });
  }
  if (!item.goal) {
    questions.push({ question: "你希望改善的指标是什么？", example: "例如：续航提升 20%、误报率降低到 1%、响应时间小于 300ms" });
  }
  if (!item.constraint) {
    questions.push({ question: "不能牺牲什么？", example: "例如：不能增加厚度、不能提高成本、不能降低安全性" });
  }
  questions.push({
    question: `${system}现在最失败的表现是什么？`,
    example: "例如：温升过高、寿命不足、误识别、用户等待太久、维护成本高",
  });
  questions.push({
    question: "你能接受的第一轮实验成本是多少？",
    example: "例如：只做软件策略验证、3D 打印样件、单台设备 A/B 测试",
  });

  return questions.slice(0, 5);
}

function buildImaQueries(item: TrizCase): ImaQuery[] {
  const system = item.systemName || "当前系统";
  const goal = item.goal || knownParameterName(item.improvingParameter, "目标指标");
  const constraint = item.constraint || knownParameterName(item.worseningParameter, "约束指标");
  const focus = inferProblemFocus(item);
  const focusMap: Record<string, string> = {
    inertialPrecision: "惯性导航、陀螺仪、加速度计、误差建模、Allan 方差、卡尔曼滤波、MEMS 阵列、自校准",
    energy: "功耗、续航、电池、能量管理",
    speed: "响应速度、关键路径、缓存、并行处理",
    accuracy: "精度、误差、传感器、校准、统计验证",
    reliability: "可靠性、故障模式、冗余、降级、自恢复",
    structure: "结构轻量化、强度、材料、拓扑优化、载荷路径",
    cost: "成本、制造工艺、BOM、标准件、装配效率",
    general: "工程问题、设计矛盾、验证方法",
  };

  return [
    {
      label: "工程原理",
      target: "knowledge-base",
      query: `${system} 如何在提升 ${goal} 的同时不恶化 ${constraint}？请返回相关的${focusMap[focus]}原理、公式、设计准则和适用边界。`,
    },
    {
      label: "可复用案例",
      target: "knowledge-base",
      query: `${system} ${goal} ${constraint} 有哪些工程案例、专利方案或失败案例？请按方案、机制、验证指标、风险整理。`,
    },
    {
      label: "实验验证",
      target: "knowledge-base",
      query: `${system} 针对 ${goal} 和 ${constraint} 应该如何设计第一轮验证实验？需要哪些测试指标、样机条件和通过标准？`,
    },
    {
      label: "TRIZ 映射",
      target: "knowledge-base",
      query: `${system} 的问题「${item.description || goal}」可以映射到哪些 TRIZ 发明原理？请给出每个原理对应的具体工程动作。`,
    },
  ];
}

function formatImaQueryDraft(queries: ImaQuery[]) {
  return queries.map((item, index) => `${index + 1}. [${item.label}/${item.target}] ${item.query}`).join("\n");
}

function extractKnowledgeFindings(notes: string) {
  return notes
    .split(/\n|。|；|;/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line.length >= 8)
    .sort((a, b) => knowledgeScore(b) - knowledgeScore(a))
    .slice(0, 8);
}

function extractStructuredKnowledge(notes: string): StructuredKnowledge {
  const lines = notes
    .split(/\n|。|；|;/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line.length >= 6);

  const pick = (signals: string[]) =>
    lines
      .filter((line) => signals.some((signal) => line.toLowerCase().includes(signal.toLowerCase())))
      .sort((a, b) => knowledgeScore(b) - knowledgeScore(a))
      .slice(0, 4);

  return {
    principles: pick(["原理", "机制", "模型", "补偿", "卡尔曼", "Allan", "误差"]),
    cases: pick(["案例", "项目", "DARPA", "博世", "诺格", "赛峰", "Honeywell", "MEMS", "专利"]),
    formulas: pick(["公式", "方程", "δ", "误差模型", "ARW", "VRW", "BI", "°/h", "sqrt", "√"]),
    experiments: pick(["实验", "测试", "验证", "转台", "静基座", "样机", "指标", "通过标准"]),
    risks: pick(["风险", "失败", "边界", "受限", "复杂度", "功耗", "实时性", "失配"]),
  };
}

function knowledgeScore(line: string) {
  const signals = ["Allan", "卡尔曼", "MEMS", "ARW", "VRW", "零偏", "标度", "转台", "°/h", "deg/s", "√", "实验", "案例", "TRIZ"];
  return signals.reduce((score, signal) => score + (line.includes(signal) ? 1 : 0), 0);
}

function formatStructuredKnowledge(knowledge: StructuredKnowledge) {
  const groups: Array<[string, string[]]> = [
    ["原理依据", knowledge.principles],
    ["工程案例", knowledge.cases],
    ["公式/模型", knowledge.formulas],
    ["实验方法", knowledge.experiments],
    ["风险边界", knowledge.risks],
  ];

  return groups
    .map(([title, items]) => [`${title}：`, ...(items.length ? items.map((item) => `- ${item}`) : ["- 待补充"])].join("\n"))
    .join("\n\n");
}

async function callImaCompatibleApi(config: ImaApiConfig, query: ImaQuery) {
  if (!config.clientId.trim()) {
    throw new Error("请先填写 ima Client ID。");
  }
  if (!config.apiKey.trim()) {
    throw new Error("请先填写 API Key。");
  }

  const baseEndpoint = config.endpoint.trim() || emptyImaConfig.endpoint;
  const searchText = compactImaSearchQuery(query.query);
  const knowledgeBaseResponse = await imaPost(config, baseEndpoint, {
    query: "",
    cursor: "",
    limit: 20,
  });

  const knowledgeBases = extractImaItems(knowledgeBaseResponse)
    .map((entry) => ({
      id: readImaField(entry, ["id", "knowledge_base_id", "kb_id", "media_id", "knowledge_base.id", "knowledge_base_info.id"]),
      title: readImaField(entry, ["title", "name", "knowledge_base_name", "knowledge_base.name", "knowledge_base_info.name"]) || "未命名知识库",
      raw: entry,
    }))
    .filter((entry) => entry.id);

  const searchEndpoint = baseEndpoint.replace(/search_knowledge_base$/, "search_knowledge");
  const documents: string[] = [];

  for (const knowledgeBase of knowledgeBases.slice(0, 5)) {
    const result = await imaPost(config, searchEndpoint, {
      query: searchText,
      knowledge_base_id: knowledgeBase.id,
      cursor: "",
      limit: 10,
    });
    const hits = extractImaItems(result);
    const renderedHits = hits.map((hit) => renderImaItem(hit, knowledgeBase.title)).filter(Boolean);
    documents.push(...renderedHits);
  }

  if (!documents.length) {
    try {
      const globalResult = await imaPost(config, searchEndpoint, {
        query: searchText,
        cursor: "",
        limit: 10,
      });
      documents.push(...extractImaItems(globalResult).map((hit) => renderImaItem(hit)).filter(Boolean));
    } catch {
      // Some ima deployments require knowledge_base_id for search_knowledge.
    }
  }

  const content = documents.length ? documents.slice(0, 12).join("\n") : "";

  if (!content.trim()) {
    if (knowledgeBases.length) {
      const names = knowledgeBases.slice(0, 5).map((base) => `「${base.title}」`).join("、");
      return `【${query.label}】\nima 已找到 ${knowledgeBases.length} 个可访问知识库：${names}；但关键词「${searchText}」没有命中可展示的知识片段。可尝试换更短的关键词，或确认资料已被加入这些知识库。`;
    }
    return `【${query.label}】\nima 认证成功，但当前 API 没有返回可访问的知识库或知识片段。请确认 ima 里已创建/授权知识库，并且知识库内有可被 skill 检索的文档。`;
  }

  return `【${query.label}】\n${content}`;
}

async function imaPost(config: ImaApiConfig, endpoint: string, body: Record<string, unknown>) {
  const headers = {
    "Content-Type": "application/json",
    "ima-openapi-clientid": config.clientId.trim(),
    "ima-openapi-apikey": config.apiKey.trim(),
  };

  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.post({
      url: endpoint,
      headers,
      data: body,
      responseType: "json",
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`ima 请求失败：${response.status} ${JSON.stringify(response.data).slice(0, 160)}`);
    }
    const data = response.data;
    if (typeof data?.code === "number" && data.code !== 0) {
      throw new Error(`ima 返回错误：${data.code} ${data.msg ?? data.message ?? ""}`);
    }
    return data;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ima 请求失败：${response.status} ${text.slice(0, 160)}`);
  }

  const data = await response.json();
  if (typeof data?.code === "number" && data.code !== 0) {
    throw new Error(`ima 返回错误：${data.code} ${data.msg ?? data.message ?? ""}`);
  }
  return data;
}

function extractImaItems(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  const body = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const candidates = [body.info_list, body.list, body.records, body.items, body.knowledge_base_list, body.result, root.info_list];
  const list = candidates.find(Array.isArray);
  return Array.isArray(list) ? (list.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>) : [];
}

function readImaField(item: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[key];
    }, item);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function compactImaSearchQuery(rawQuery: string) {
  const candidateTerms = ["惯性系统", "精度", "体积", "误差补偿", "陀螺", "加速度计", "Allan", "卡尔曼", "MEMS", "自校准", "TRIZ"];
  const terms = candidateTerms.filter((term) => rawQuery.includes(term));
  if (terms.length) return Array.from(new Set(terms)).join(" ");

  return rawQuery
    .replace(/\[[^\]]+\]|\([^)]*\)|请返回.*|有哪些.*|如何.*/g, " ")
    .split(/\s|，|。|、|\?|？/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 8)
    .join(" ")
    .slice(0, 80);
}

function renderImaItem(item: Record<string, unknown>, knowledgeBaseTitle?: string) {
  const title = readImaField(item, ["title", "name", "file_name", "knowledge_base_name", "knowledge.title", "knowledge.name"]) || "未命名条目";
  const content = readImaField(item, ["highlight_content", "summary", "content", "text", "abstract", "knowledge.highlight_content"]);
  const source = knowledgeBaseTitle ? `知识库：${knowledgeBaseTitle}` : "";
  return [source, `标题：${title}`, content ? `片段：${content}` : ""].filter(Boolean).join("；");
}

function buildKnowledgeUse(item: TrizCase, concept: SolutionConcept) {
  const findings = extractKnowledgeFindings(item.knowledgeNotes);
  if (!findings.length) {
    return `待从 ima 知识库补充「${concept.title}」的工程依据、案例和验证边界。`;
  }
  return findings.slice(0, 2).join("；");
}

function generateKnowledgeEnhancedPlan(item: TrizCase, activePrinciples: Principle[]) {
  const baseReport = generateAnalysisPlan(item, activePrinciples);
  const queries = buildImaQueries(item);
  const findings = extractKnowledgeFindings(item.knowledgeNotes);
  const structuredKnowledge = extractStructuredKnowledge(item.knowledgeNotes);
  const concepts = buildSolutionConcepts(item, activePrinciples);

  return [
    baseReport,
    "",
    "七、ima 知识库增强",
    findings.length
      ? `- 已提取知识依据：${findings.join("；")}`
      : "- 当前还没有粘贴 ima 返回内容；请先用下方检索问题去 ima knowledge-base 查询，再把结果粘贴回来。",
    "",
    "八、结构化知识摘要",
    formatStructuredKnowledge(structuredKnowledge),
    "",
    "九、建议检索问题",
    ...queries.map((item, index) => `- ${index + 1}. ${item.query}`),
    "",
    "十、知识到方案的落地映射",
    ...concepts.map((concept, index) => `- ${index + 1}. ${concept.title}：${buildKnowledgeUse(item, concept)}`),
  ].join("\n");
}

function buildSolutionConcepts(item: TrizCase, activePrinciples: Principle[]): SolutionConcept[] {
  const system = item.systemName || "当前系统";
  const goal = item.goal || "改善目标";
  const constraint = item.constraint || knownParameterName(item.worseningParameter, "副作用");
  const chosen = activePrinciples.length ? activePrinciples : recommendPrinciples(item).slice(0, 3);

  if (isInertialPrecisionCase(item)) {
    return [
      {
        title: "误差建模 + 软件补偿",
        principle: "2. 抽取",
        mechanism: "把精度提升从增大谐振子、光纤环或传感器尺寸，抽取到误差模型、温度补偿和在线估计。",
        engineeringMove: "建立陀螺/加速度计静态、动态、随机误差模型，离线标定确定性误差，在线估计残余漂移。",
        validation: "补偿前后重复静态 Allan 方差、速率转台和 1h 纯惯导位置误差测试。",
        risk: "误差不稳定或温度模型失配时补偿会失效。",
        impact: 5,
        effort: 3,
      },
      {
        title: "MEMS 冗余阵列 + 统计平均",
        principle: "1. 分割 + 40. 复合材料",
        mechanism: "把单个高精度大器件拆成多个小 MEMS 器件，通过阵列平均和状态融合降低随机噪声，理论随机项约按 sqrt(N) 改善。",
        engineeringMove: "在体积预算内选择 N 个低成本 IMU，统一时钟同步，做阵列标定和加权融合。",
        validation: "比较单器件与阵列的 ARW、VRW、零偏稳定性、功耗和体积。",
        risk: "功耗和数据处理复杂度会上升，传感器相关噪声会削弱 sqrt(N) 收益。",
        impact: 4,
        effort: 4,
      },
      {
        title: "自校准 / 模态反转",
        principle: "15. 动态化",
        mechanism: "让谐振子或测量轴在不同工作模态间周期切换，用自身运动抑制驱动轴/检测轴非对称。",
        engineeringMove: "设计自校准时间窗口和校准频率；高精度场景增加校准，实时性场景降低校准。",
        validation: "比较自校准前后零偏稳定性、标度因数线性度、信噪比和实时性损失。",
        risk: "校准占用测量时间，实时任务可能受影响。",
        impact: 5,
        effort: 4,
      },
      {
        title: "外部参考融合",
        principle: "24. 中介 + 23. 反馈",
        mechanism: "引入 GPS、星敏、里程仪或视觉等外部参考作为中介，通过卡尔曼滤波约束惯导误差发散。",
        engineeringMove: "把平台失准角、速度/位置误差、陀螺漂移、加速度计偏置纳入状态向量。",
        validation: "对比纯惯导与组合导航在同一路径下的 CEP、1h 漂移和丢失外部参考后的恢复表现。",
        risk: "GNSS 拒止或外部参考不可用时收益下降，需要降级策略。",
        impact: 4,
        effort: 3,
      },
    ].map((concept) => completeConcept(concept, item));
  }

  const baseConcepts = chosen.slice(0, 4).map((principle, index) => {
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

  return baseConcepts.map((concept) => completeConcept(concept, item));
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
        [
          `${index + 1}. ${concept.title}（${concept.principle}）：${concept.mechanism}`,
          `   - 改造对象：${concept.partsToChange?.join("、")}`,
          `   - 工程动作：${concept.engineeringMove}`,
          `   - 实施步骤：${concept.implementationSteps?.join("；")}`,
          `   - 验证指标：${concept.metrics?.join("、")}`,
          `   - 验证实验：${concept.validation}`,
          `   - 风险：${concept.risk}`,
          `   - 判定门槛：${concept.decisionGate}`,
        ].join("\n"),
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
  const [imaConfig, setImaConfig] = useState<ImaApiConfig>(loadImaApiConfig);
  const [imaRunState, setImaRunState] = useState<ImaRunState>({ status: "idle", message: "等待配置 ima Open API" });

  useEffect(() => {
    saveCases(cases);
  }, [cases]);

  useEffect(() => {
    saveImaApiConfig(imaConfig);
  }, [imaConfig]);

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
  const diagnosticQuestions = selectedCase ? buildDiagnosticQuestions(selectedCase) : [];
  const imaQueries = selectedCase ? buildImaQueries(selectedCase) : [];
  const knowledgeFindings = selectedCase ? extractKnowledgeFindings(selectedCase.knowledgeNotes) : [];
  const structuredKnowledge = selectedCase ? extractStructuredKnowledge(selectedCase.knowledgeNotes) : extractStructuredKnowledge("");

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

  function handleGenerateImaQueries() {
    if (!selectedCase) return;
    updateCase({
      ...selectedCase,
      imaQueryDraft: formatImaQueryDraft(imaQueries),
    });
  }

  function handleGenerateKnowledgePlan() {
    if (!selectedCase) return;
    updateCase({
      ...selectedCase,
      selectedPrincipleIds: activePrinciples.map((principle) => principle.id),
      imaQueryDraft: selectedCase.imaQueryDraft || formatImaQueryDraft(imaQueries),
      solutionHypothesis: generateKnowledgeEnhancedPlan(selectedCase, activePrinciples),
    });
  }

  async function handleRunImaWorkflow() {
    if (!selectedCase) return;

    const queries = buildImaQueries(selectedCase);
    setImaRunState({ status: "running", message: `正在调用 ima：0/${queries.length}` });

    try {
      const results: string[] = [];

      for (const [index, query] of queries.entries()) {
        setImaRunState({ status: "running", message: `正在调用 ima：${index + 1}/${queries.length} - ${query.label}` });
        results.push(await callImaCompatibleApi(imaConfig, query));
      }

      const nextCase = {
        ...selectedCase,
        selectedPrincipleIds: activePrinciples.map((principle) => principle.id),
        imaQueryDraft: formatImaQueryDraft(queries),
        knowledgeNotes: results.join("\n\n"),
      };

      updateCase({
        ...nextCase,
        solutionHypothesis: generateKnowledgeEnhancedPlan(nextCase, activePrinciples),
      });
      setImaRunState({ status: "done", message: `ima 检索完成：已吸收 ${queries.length} 组知识` });
    } catch (error) {
      setImaRunState({
        status: "error",
        message: error instanceof Error ? error.message : "ima 调用失败，请检查 endpoint、key 或网络。",
      });
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">TRIZ V6.4 ima 关键词检索</p>
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

            <section className="diagnostic-panel">
              <div className="section-title">
                <Search size={19} />
                <h2>让方案变具体的追问</h2>
              </div>
              <div className="diagnostic-list">
                {diagnosticQuestions.map((item) => (
                  <article className="diagnostic-card" key={item.question}>
                    <strong>{item.question}</strong>
                    <span>{item.example}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="knowledge-panel">
              <div className="section-title">
                <BookOpen size={19} />
                <h2>ima 知识增强</h2>
              </div>
              <div className="knowledge-summary">
                <div>
                  <span>连接方式</span>
                  <strong>使用 ima 官方知识库 OpenAPI；Client ID 和 Key 仅保存在当前设备本地。</strong>
                </div>
                <div>
                  <span>已识别知识点</span>
                  <strong>{knowledgeFindings.length ? `${knowledgeFindings.length} 条` : "等待粘贴 ima 返回内容"}</strong>
                </div>
              </div>
              <div className="api-config-grid">
                <label>
                  Client ID
                  <input
                    value={imaConfig.clientId}
                    onChange={(event) => setImaConfig({ ...imaConfig, clientId: event.target.value })}
                    placeholder="ima 页面里显示的 Client ID"
                  />
                </label>
                <label>
                  API Key
                  <input
                    type="password"
                    value={imaConfig.apiKey}
                    onChange={(event) => setImaConfig({ ...imaConfig, apiKey: event.target.value })}
                    placeholder="只保存在本机 localStorage"
                  />
                </label>
                <label>
                  官方接口
                  <input
                    value={imaConfig.endpoint}
                    onChange={(event) => setImaConfig({ ...imaConfig, endpoint: event.target.value || emptyImaConfig.endpoint })}
                    placeholder="https://ima.qq.com/openapi/wiki/v1/search_knowledge_base"
                  />
                </label>
              </div>
              <div className={`api-status ${imaRunState.status}`}>
                <span>{imaRunState.message}</span>
              </div>
              <button className="ghost-button full-width" type="button" onClick={handleGenerateImaQueries}>
                <Search size={18} />
                生成 ima 检索问题
              </button>
              <button className="primary-button full-width" type="button" onClick={handleRunImaWorkflow} disabled={imaRunState.status === "running"}>
                <Sparkles size={18} />
                自动调用 ima 并生成增强分析
              </button>
              <label>
                ima 检索问题
                <textarea
                  className="compact-textarea"
                  value={selectedCase.imaQueryDraft}
                  onChange={(event) => updateSelected("imaQueryDraft", event.target.value)}
                  placeholder="点击上方按钮，生成适合复制到 ima knowledge-base 的检索问题"
                />
              </label>
              <label>
                ima 返回的知识片段
                <textarea
                  className="knowledge-textarea"
                  value={selectedCase.knowledgeNotes}
                  onChange={(event) => updateSelected("knowledgeNotes", event.target.value)}
                  placeholder="把 ima 返回的工程原理、案例、公式、验证方法粘贴到这里"
                />
              </label>
              <div className="knowledge-findings">
                {(knowledgeFindings.length ? knowledgeFindings : ["暂无知识片段。先生成检索问题，到 ima 查询后粘贴结果。"]).map((finding) => (
                  <span key={finding}>{finding}</span>
                ))}
              </div>
              <div className="structured-knowledge">
                {[
                  ["原理依据", structuredKnowledge.principles],
                  ["工程案例", structuredKnowledge.cases],
                  ["公式/模型", structuredKnowledge.formulas],
                  ["实验方法", structuredKnowledge.experiments],
                  ["风险边界", structuredKnowledge.risks],
                ].map(([title, items]) => (
                  <article key={title as string}>
                    <strong>{title as string}</strong>
                    <span>{(items as string[]).slice(0, 2).join("；") || "待补充"}</span>
                  </article>
                ))}
              </div>
              <button className="primary-button full-width" type="button" onClick={handleGenerateKnowledgePlan}>
                <Sparkles size={18} />
                用 ima 知识增强分析
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
                        <dt>改造对象</dt>
                        <dd>{concept.partsToChange?.join("、")}</dd>
                      </div>
                      <div>
                        <dt>工程动作</dt>
                        <dd>{concept.engineeringMove}</dd>
                      </div>
                      <div>
                        <dt>实施步骤</dt>
                        <dd>{concept.implementationSteps?.join("；")}</dd>
                      </div>
                      <div>
                        <dt>验证实验</dt>
                        <dd>{concept.validation}</dd>
                      </div>
                      <div>
                        <dt>验证指标</dt>
                        <dd>{concept.metrics?.join("、")}</dd>
                      </div>
                      <div>
                        <dt>风险</dt>
                        <dd>{concept.risk}</dd>
                      </div>
                      <div>
                        <dt>判定门槛</dt>
                        <dd>{concept.decisionGate}</dd>
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
