"use client";

import {
  Activity,
  ArrowDown,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  Database,
  GitBranch,
  History,
  LoaderCircle,
  LockKeyhole,
  Network,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  historyRecordFromPlan,
  parseRunHistory,
  upsertRunHistory,
} from "@/lib/fridie/history";
import type { AgentKind, GoalPlan, RunHistoryRecord } from "@/lib/fridie/types";

const STARTER_GOAL =
  "Build the first working F.R.I.D.I.E. AI assistant with MongoDB, task decomposition, specialist agents, explainable results, and security checks.";

const agentLabels: Record<AgentKind, string> = {
  planning: "Planning",
  research: "Research",
  coding: "Engineering",
  analysis: "Analysis",
  design: "Product design",
  testing: "Testing",
  documentation: "Documentation",
  verification: "Verification",
};

const agentDescriptions: Array<{ agent: AgentKind; detail: string }> = [
  { agent: "planning", detail: "Scopes outcomes and dependencies" },
  { agent: "research", detail: "Ranks source evidence" },
  { agent: "coding", detail: "Builds the smallest reliable slice" },
  { agent: "design", detail: "Resolves interaction systems" },
  { agent: "testing", detail: "Challenges behavior and boundaries" },
  { agent: "verification", detail: "Reconciles evidence before handoff" },
];

function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.7) return "Useful, with assumptions";
  return "Needs clarification";
}

function formatRunTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Home() {
  const [goal, setGoal] = useState(STARTER_GOAL);
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RunHistoryRecord[]>([]);
  const [historyStatus, setHistoryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<"idle" | "saving" | "approved" | "error">(
    "idle",
  );
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const planControllerRef = useRef<AbortController | null>(null);
  const historyControllerRef = useRef<AbortController | null>(null);
  const approvalControllerRef = useRef<AbortController | null>(null);
  const goalRef = useRef<HTMLTextAreaElement | null>(null);
  const planHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const loadHistory = useCallback(async (showLoading = true) => {
    historyControllerRef.current?.abort();
    const controller = new AbortController();
    historyControllerRef.current = controller;
    if (showLoading) setHistoryStatus("loading");
    setHistoryError(null);

    try {
      const response = await fetch("/api/runs?limit=10", {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        data?: unknown;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Persistent run history could not be loaded.");
      }
      setHistory(parseRunHistory(payload.data));
      setHistoryStatus("ready");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
      setHistoryStatus("error");
      setHistoryError(
        caughtError instanceof Error
          ? caughtError.message
          : "Persistent run history could not be loaded.",
      );
    } finally {
      if (historyControllerRef.current === controller) historyControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    document.title = "Command center — F.R.I.D.I.E.";
    const initialHistoryTimer = window.setTimeout(() => void loadHistory(), 0);
    return () => {
      window.clearTimeout(initialHistoryTimer);
      planControllerRef.current?.abort();
      historyControllerRef.current?.abort();
      approvalControllerRef.current?.abort();
    };
  }, [loadHistory]);

  async function createPlan() {
    const trimmedGoal = goal.trim();
    if (trimmedGoal.length < 8) {
      setError("Describe the goal in at least 8 characters so the agents have a real outcome to plan.");
      goalRef.current?.focus();
      return;
    }

    planControllerRef.current?.abort();
    approvalControllerRef.current?.abort();
    approvalControllerRef.current = null;
    const controller = new AbortController();
    planControllerRef.current = controller;
    setIsPlanning(true);
    setError(null);
    setApprovalStatus("idle");
    setApprovalError(null);

    try {
      const response = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: trimmedGoal }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        data?: GoalPlan;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "The orchestrator could not create this plan.");
      }
      const nextPlan = payload.data;
      setPlan(nextPlan);
      setHistory((current) => upsertRunHistory(current, historyRecordFromPlan(nextPlan)));
      setHistoryStatus("ready");
      void loadHistory(false);
      requestAnimationFrame(() => planHeadingRef.current?.focus());
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The orchestrator could not create this plan. Try again.",
      );
    } finally {
      if (planControllerRef.current === controller) {
        planControllerRef.current = null;
        setIsPlanning(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPlanning) void createPlan();
  }

  async function approvePlan() {
    if (!plan || approvalStatus === "saving" || approvalStatus === "approved") return;

    approvalControllerRef.current?.abort();
    const controller = new AbortController();
    approvalControllerRef.current = controller;
    setApprovalStatus("saving");
    setApprovalError(null);

    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(plan.traceId)}/approve`, {
        method: "POST",
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        data?: RunHistoryRecord;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "The plan approval could not be saved.");
      }
      if (approvalControllerRef.current !== controller) return;
      setHistory((current) => upsertRunHistory(current, payload.data as RunHistoryRecord));
      setPlan({ ...plan, status: "approved", approvedAt: payload.data.approvedAt ?? undefined });
      setApprovalStatus("approved");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
      setApprovalStatus("error");
      setApprovalError(
        caughtError instanceof Error
          ? caughtError.message
          : "The plan approval could not be saved. Try again.",
      );
    } finally {
      if (approvalControllerRef.current === controller) approvalControllerRef.current = null;
    }
  }

  const activeAgents = plan ? new Set(plan.tasks.map((task) => task.owner)) : new Set<AgentKind>();

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#command" aria-label="F.R.I.D.I.E. command center">
          <span className="brand-mark" aria-hidden="true"><BrainCircuit size={20} /></span>
          <span><strong>F.R.I.D.I.E.</strong><small>Reason. Divide. Verify.</small></span>
        </a>
        <nav className="topnav" aria-label="Command center sections">
          <a href="#command">Command</a><a href="#history">History</a><a href="#agents">Agents</a><a href="#activity">Activity</a>
        </nav>
        <div className="local-badge" aria-label="Owner-only authenticated workspace">
          <LockKeyhole size={14} aria-hidden="true" /> Owner-only v0.2
        </div>
      </header>

      <main>
        <section className="command-grid" id="command" aria-labelledby="command-title">
          <div className="command-copy">
            <p className="eyebrow"><Sparkles size={15} aria-hidden="true" /> Goal orchestration</p>
            <h1 id="command-title">Give one outcome.<br />Get a coordinated plan.</h1>
            <p className="lede">
              F.R.I.D.I.E. divides complex work across specialist agents, makes dependencies visible,
              and puts verification before delivery.
            </p>

            <form className="goal-composer" onSubmit={handleSubmit} noValidate>
              <div className="composer-heading">
                <label htmlFor="goal">What are we trying to achieve?</label>
                <span>{goal.length.toLocaleString()} / 4,000</span>
              </div>
              <Textarea
                ref={goalRef}
                id="goal"
                value={goal}
                maxLength={4_000}
                rows={5}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "goal-help goal-error" : "goal-help"}
                className="goal-input resize-none"
                onChange={(event) => {
                  setGoal(event.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.isComposing) {
                    event.preventDefault();
                    if (!isPlanning) void createPlan();
                  }
                }}
              />
              <div className="composer-footer">
                <p id="goal-help">Include the outcome, constraints, and what a good result must prove.</p>
                <Button type="submit" className="plan-button" disabled={isPlanning || !goal.trim()}>
                  {isPlanning ? <LoaderCircle className="spin" aria-hidden="true" /> : <GitBranch aria-hidden="true" />}
                  <span>{isPlanning ? "Dividing goal…" : "Divide this goal"}</span>
                </Button>
              </div>
              <p className="shortcut-hint">Ctrl/⌘ + Enter to run</p>
            </form>

            {error ? (
              <div className="error-panel" id="goal-error" role="alert">
                <div><strong>Planning stopped</strong><p>{error}</p></div>
                <Button type="button" variant="outline" onClick={() => void createPlan()}>
                  <RotateCcw aria-hidden="true" /> Retry
                </Button>
              </div>
            ) : null}
          </div>

          <aside className="system-panel" aria-labelledby="system-title">
            <div className="panel-kicker"><span>System readiness</span><Badge variant="outline">Foundation</Badge></div>
            <h2 id="system-title">Authenticated persistence is connected.</h2>
            <div className="readiness-list">
              <div className="readiness-row is-ready">
                <span className="readiness-icon"><Network size={18} aria-hidden="true" /></span>
                <div><strong>Protected API boundary</strong><small>Ready · server-only credential</small></div>
                <CheckCircle2 size={18} aria-label="Ready" />
              </div>
              <div className="readiness-row is-ready">
                <span className="readiness-icon"><Database size={18} aria-hidden="true" /></span>
                <div><strong>MongoDB Atlas FRIDIE</strong><small>Durable owner-scoped run history</small></div>
                <CheckCircle2 size={18} aria-label="Ready" />
              </div>
              <div className="readiness-row is-ready">
                <span className="readiness-icon"><Bot size={18} aria-hidden="true" /></span>
                <div><strong>Deterministic planner</strong><small>Persisted before the plan appears</small></div>
                <CheckCircle2 size={18} aria-label="Ready" />
              </div>
              <div className="readiness-row is-planned">
                <span className="readiness-icon"><TerminalSquare size={18} aria-hidden="true" /></span>
                <div><strong>Execution sandbox</strong><small>Planned · disabled safely</small></div>
                <CircleDot size={18} aria-label="Planned" />
              </div>
            </div>
            <div className="trust-note">
              <ShieldCheck size={19} aria-hidden="true" />
              <p><strong>No credential in the browser.</strong> The owner-only site forwards an opaque identity through its protected server route. Filesystem tools, agents, and code execution stay off.</p>
            </div>
          </aside>
        </section>

        <section className={`plan-section ${plan ? "has-plan" : ""}`} aria-labelledby="plan-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><GitBranch size={15} aria-hidden="true" /> Divide and conquer trace</p>
              <h2 id="plan-title" ref={planHeadingRef} tabIndex={-1}>
                {plan ? "One goal, ordered into accountable work." : "Your execution trace will appear here."}
              </h2>
            </div>
            {plan ? <div className="trace-meta"><span>Trace</span><code>{plan.traceId}</code></div> : null}
          </div>

          {isPlanning ? (
            <div className="planning-state" role="status" aria-live="polite">
              <div className="planning-orbit" aria-hidden="true"><BrainCircuit /></div>
              <div><strong>Mapping intent to specialist work</strong><p>Resolving dependencies, risk, and acceptance checks…</p></div>
            </div>
          ) : plan ? (
            <div className="plan-layout">
              <div className="task-trace" aria-label="Planned specialist tasks">
                {plan.tasks.map((item, index) => (
                  <article className="task-card" key={item.id}>
                    <div className="trace-node" aria-hidden="true"><span>{index + 1}</span></div>
                    <div className="task-card-body">
                      <div className="task-topline">
                        <span className={`agent-chip agent-${item.owner}`}>{agentLabels[item.owner]}</span>
                        <span className="phase-label">{item.phase}</span>
                      </div>
                      <h3>{item.title}</h3><p>{item.rationale}</p>
                      <div className="acceptance"><CheckCircle2 size={15} aria-hidden="true" /><span>{item.acceptanceCheck}</span></div>
                      {item.dependsOn.length > 0 ? <small>Starts after {item.dependsOn.join(", ")}</small> : <small>Ready to start</small>}
                    </div>
                  </article>
                ))}
              </div>

              <aside className="plan-evidence" aria-label="Plan confidence and boundaries">
                <div className="confidence-card">
                  <div><span>Planning confidence</span><strong>{Math.round(plan.confidence * 100)}%</strong></div>
                  <Progress value={plan.confidence * 100} aria-label="Planning confidence" />
                  <p>{confidenceLabel(plan.confidence)}. Confirm the assumptions before execution.</p>
                </div>
                <div className="evidence-card"><h3>Assumptions</h3><ul>{plan.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div className="evidence-card limitation-card"><h3>Current limits</h3><ul>{plan.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div className="handoff-card">
                  <span>Next control</span><strong>Approve the plan before agents execute.</strong>
                  <p>Approval is written to MongoDB Atlas and its audit log. It does not run tools or agents.</p>
                  <Button
                    type="button"
                    className="approve-button"
                    disabled={approvalStatus === "saving" || approvalStatus === "approved"}
                    aria-busy={approvalStatus === "saving"}
                    onClick={() => void approvePlan()}
                  >
                    {approvalStatus === "saving" ? (
                      <LoaderCircle className="spin" aria-hidden="true" />
                    ) : approvalStatus === "approved" ? (
                      <CheckCircle2 aria-hidden="true" />
                    ) : (
                      <Save aria-hidden="true" />
                    )}
                    <span>
                      {approvalStatus === "saving"
                        ? "Saving approval…"
                        : approvalStatus === "approved"
                          ? "Plan approved"
                          : "Approve plan"}
                    </span>
                  </Button>
                  {approvalStatus === "approved" ? (
                    <p className="approval-success" role="status">Approved for the next-stage execution gate. Execution remains disabled.</p>
                  ) : null}
                  {approvalError ? <p className="approval-error" role="alert">{approvalError}</p> : null}
                </div>
              </aside>
            </div>
          ) : (
            <div className="empty-plan">
              <div className="empty-diagram" aria-hidden="true"><span>Goal</span><ArrowDown /><span>Agents</span><ArrowDown /><span>Verified result</span></div>
              <p>Use the prepared example or write your own goal, then choose <strong>Divide this goal</strong>.</p>
            </div>
          )}
        </section>

        <section className="history-section" id="history" aria-labelledby="history-title">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow"><History size={15} aria-hidden="true" /> Persistent run history</p><h2 id="history-title">Your latest owner-scoped plans.</h2></div>
            <p className="history-boundary"><Database size={16} aria-hidden="true" /> MongoDB Atlas · latest 10 runs</p>
          </div>
          {historyStatus === "loading" ? (
            <div className="history-state" role="status" aria-live="polite">
              <LoaderCircle className="spin" size={22} aria-hidden="true" />
              <div><strong>Loading persistent history</strong><p>Reading your latest owner-scoped runs…</p></div>
            </div>
          ) : historyStatus === "error" ? (
            <div className="history-state history-error" role="alert">
              <ShieldCheck size={22} aria-hidden="true" />
              <div><strong>History is temporarily unavailable</strong><p>{historyError}</p></div>
              <Button type="button" variant="outline" onClick={() => void loadHistory()}>
                <RotateCcw aria-hidden="true" /> Retry
              </Button>
            </div>
          ) : history.length > 0 ? (
            <ol className="history-list">
              {history.map((item) => (
                <li key={item.traceId}>
                  <div className="history-time"><time dateTime={item.approvedAt ?? item.createdAt}>{formatRunTime(item.approvedAt ?? item.createdAt)}</time><span className={item.status === "approved" ? "is-approved" : "is-planned"}>{item.status === "approved" ? "Approved" : "Planned"}</span></div>
                  <div className="history-copy"><strong>{item.objective}</strong><code>{item.traceId}</code></div>
                  <div className="history-metrics"><span>{item.taskCount} tasks</span><span>{Math.round(item.confidence * 100)}% confidence</span></div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="history-empty">
              <Database size={22} aria-hidden="true" />
              <div><strong>No persistent plans yet</strong><p>Create a plan to store its trace, tasks, and audit event in MongoDB Atlas.</p></div>
            </div>
          )}
        </section>

        <section className="agents-section" id="agents" aria-labelledby="agents-title">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow"><Bot size={15} aria-hidden="true" /> Specialist roster</p><h2 id="agents-title">Different minds, one shared contract.</h2></div>
            <p>Agents exchange structured tasks—not an untraceable group chat.</p>
          </div>
          <div className="agent-grid">
            {agentDescriptions.map((item, index) => {
              const isActive = activeAgents.has(item.agent);
              return (
                <article className={`agent-card ${isActive ? "is-active" : ""}`} key={item.agent}>
                  <div className="agent-number">{String(index + 1).padStart(2, "0")}</div>
                  <div><h3>{agentLabels[item.agent]}</h3><p>{item.detail}</p></div>
                  <span>{isActive ? "Assigned" : "Available"}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="activity-section" id="activity" aria-labelledby="activity-title">
          <div className="activity-heading">
            <div><p className="eyebrow"><Activity size={15} aria-hidden="true" /> Audit-friendly by design</p><h2 id="activity-title">Every important step leaves a trace.</h2></div>
            <div className="audit-status"><span aria-hidden="true" /> Append-only event contract</div>
          </div>
          <ol className="activity-list">
            <li><time>Now</time><div><strong>Product architecture loaded</strong><p>Eight supplied specifications reconciled into the v0.1 scope.</p></div></li>
            <li><time>Guarded</time><div><strong>Server boundary authenticated</strong><p>Only the owner-only site proxy can call the persistent API; its credential never enters browser code.</p></div></li>
            <li><time>Durable</time><div><strong>MongoDB Atlas connected</strong><p>Database name remains FRIDIE for cross-platform compatibility.</p></div></li>
            <li><time>{plan?.status === "approved" ? "Approved" : plan ? "Stored" : "Waiting"}</time><div><strong>{plan?.status === "approved" ? "Plan approval recorded" : plan ? "Goal plan persisted" : "Goal input ready"}</strong><p>{plan?.status === "approved" ? `${plan.traceId} is approved in Atlas; no execution started.` : plan ? `${plan.tasks.length} tasks persisted under ${plan.traceId}.` : "No user goal has been submitted in this session yet."}</p></div></li>
          </ol>
        </section>
      </main>

      <footer>
        <div><BrainCircuit size={17} aria-hidden="true" /><strong>F.R.I.D.I.E.</strong><span>Fast Reasoning, Intelligent Development, Analysis & Innovation Engine</span></div>
        <span>Authenticated persistence build · 2026</span>
      </footer>
    </div>
  );
}
