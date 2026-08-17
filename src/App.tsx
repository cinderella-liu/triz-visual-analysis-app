import {
  Archive,
  BookOpen,
  Check,
  CirclePlus,
  Clock3,
  FileText,
  GitBranch,
  Lightbulb,
  Pencil,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type CaseStatus = "草稿" | "分析中" | "已完成";

type TrizCase = {
  id: string;
  title: string;
  description: string;
  domain: string;
  systemName: string;
  goal: string;
  constraint: string;
  status: CaseStatus;
  updatedAt: string;
};

type CaseDraft = Omit<TrizCase, "id" | "updatedAt">;

const storageKey = "triz.visual.analysis.cases.v1";

const emptyDraft: CaseDraft = {
  title: "",
  description: "",
  domain: "",
  systemName: "",
  goal: "",
  constraint: "",
  status: "草稿",
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
    status: "分析中",
    updatedAt: new Date().toISOString(),
  },
];

function loadCases(): TrizCase[] {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return seedCases;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedCases;
  } catch {
    return seedCases;
  }
}

function saveCases(cases: TrizCase[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(cases));
}

function createCase(draft: CaseDraft): TrizCase {
  return {
    ...draft,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
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
  if (status === "已完成") return "done";
  if (status === "分析中") return "active";
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
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function deriveTitle(draft: CaseDraft) {
  return draft.title.trim() || draft.description.trim().slice(0, 24) || "未命名案例";
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
      active: cases.filter((item) => item.status === "分析中").length,
      done: cases.filter((item) => item.status === "已完成").length,
    }),
    [cases],
  );

  function updateCases(nextCases: TrizCase[]) {
    setCases(nextCases);
    if (!nextCases.some((item) => item.id === selectedId)) {
      setSelectedId(nextCases[0]?.id ?? "");
    }
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();

    const nextCase = createCase({
      ...draft,
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
      status: item.status,
    });
    setEditing(true);
  }

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCase) return;

    updateCases(
      cases.map((item) =>
        item.id === selectedCase.id
          ? {
              ...item,
              ...draft,
              title: deriveTitle(draft),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setEditing(false);
    setDraft(emptyDraft);
  }

  function removeCase(id: string) {
    updateCases(cases.filter((item) => item.id !== id));
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">TRIZ 可视化分析工具</p>
            <h1>案例收件箱</h1>
          </div>
          <button className="icon-button" aria-label="打开方法库">
            <BookOpen size={20} />
          </button>
        </header>

        <section className="stats-grid" aria-label="案例统计">
          <StatCard icon={<Archive size={19} />} label="案例" value={stats.total} />
          <StatCard icon={<Clock3 size={19} />} label="分析中" value={stats.active} />
          <StatCard icon={<Check size={19} />} label="完成" value={stats.done} />
        </section>

        <section className="capture-panel">
          <div className="section-title">
            <CirclePlus size={19} />
            <h2>新建分析</h2>
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
                <span>资料完整度</span>
                <strong>{caseCompleteness(selectedCase)}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${caseCompleteness(selectedCase)}%` }} />
              </div>
            </div>

            <dl className="case-fields">
              <Field label="问题描述" value={selectedCase.description} />
              <Field label="行业场景" value={selectedCase.domain} />
              <Field label="当前系统" value={selectedCase.systemName} />
              <Field label="改善目标" value={selectedCase.goal} />
              <Field label="限制条件" value={selectedCase.constraint} />
            </dl>

            <section className="analysis-path" aria-label="分析路径预览">
              <div className="section-title">
                <GitBranch size={19} />
                <h2>分析路径</h2>
              </div>
              <div className="path-map">
                <PathNode title="问题" value={selectedCase.description || "未填写"} />
                <PathNode title="系统" value={selectedCase.systemName || "未填写"} />
                <PathNode title="矛盾" value={selectedCase.constraint || "待识别"} />
                <PathNode title="原理" value="V2 推荐" />
              </div>
            </section>

            <section className="next-step">
              <Lightbulb size={20} />
              <p>V1 先沉淀案例；V2 将在这里加入技术矛盾、物理矛盾和发明原理推荐。</p>
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
      <label>
        状态
        <select value={draft.status} onChange={(event) => update("status", event.target.value as CaseStatus)}>
          <option value="草稿">草稿</option>
          <option value="分析中">分析中</option>
          <option value="已完成">已完成</option>
        </select>
      </label>
      <button className="primary-button" type="submit">
        <Save size={18} />
        {mode === "create" ? "保存案例" : "保存修改"}
      </button>
    </form>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "未填写"}</dd>
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

