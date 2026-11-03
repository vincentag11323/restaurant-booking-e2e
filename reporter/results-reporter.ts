// Writes RESULTS.md: one row per test with expected and actual result, and copies each video to
// videos/<scenario-id>.webm (requirements/E2E_SPEC.md §4).
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

interface Row {
  id: string;
  title: string;
  project: string;
  expected: string;
  actual: string;
  status: string;
  seconds: string;
  video: string;
  transcript?: string;
}

const ICON: Record<string, string> = { passed: "✅", failed: "❌", timedOut: "❌", skipped: "⏭️", interrupted: "⚠️" };

export default class ResultsReporter implements Reporter {
  private rows: Row[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const id = /^\[([A-Z]+\d*)\]/.exec(test.title)?.[1] ?? "?";
    const note = (type: string) => test.annotations.filter((a) => a.type === type).map((a) => a.description).join(" ");
    const video = result.attachments.find((a) => a.name === "video" && a.path);
    let videoFile = "";
    if (video?.path) {
      mkdirSync("videos", { recursive: true });
      // One file per browser: the WebKit and Firefox runs repeat some Chromium scenarios.
      const project = test.parent.project()?.name ?? "";
      videoFile = `videos/${project === "app" ? "" : `${project}-`}${id}.webm`;
      copyFileSync(video.path, videoFile);
    }
    const firstError = result.errors[0]?.message?.split("\n").find((l) => l.trim()) ?? "";
    this.rows.push({
      id,
      title: test.title.replace(/^\[[A-Z]+\d*\]\s*/, ""),
      project: test.parent.project()?.name ?? "",
      expected: note("expected"),
      actual: result.status === "passed" ? note("actual") || "As expected" : result.status === "skipped" ? `Skipped: ${note("skip") || "not run"}` : clean(firstError),
      status: result.status,
      seconds: (result.duration / 1000).toFixed(1),
      video: videoFile,
      transcript: note("transcript") || undefined,
    });
  }

  onEnd(result: FullResult) {
    const count = (s: string) => this.rows.filter((r) => r.status === s).length;
    const table = (project: string) =>
      this.rows
        .filter((r) => r.project === project)
        .map((r) => `| ${r.id} | ${r.title} | ${r.expected} | ${ICON[r.status] ?? r.status} ${r.actual} | ${r.seconds}s | ${r.video ? `[video](${r.video})` : ""} |`)
        .join("\n");
    const header = "| ID | Scenario | Expected | Actual | Time | Video |\n|---|---|---|---|---|---|";
    const transcripts = this.rows
      .filter((r) => r.transcript)
      .map((r) => `### ${r.id}: ${r.title}\n\`\`\`\n${r.transcript}\n\`\`\``)
      .join("\n\n");
    writeFileSync(
      "RESULTS.md",
      `# End-to-End Results\n\nRun: ${new Date().toISOString()} · overall: **${result.status}** · ` +
        `${count("passed")} passed, ${count("failed") + count("timedOut")} failed, ${count("skipped")} skipped\n\n` +
        `Real stack, no mocking (requirements/E2E_SPEC.md). Scenario IDs refer to requirements/TEST_SCENARIOS_APP.md and TEST_SCENARIOS_ASSISTANT.md.\n\n` +
        `## App (guest and admin in the browser)\n\n${header}\n${table("app")}\n\n` +
        `## Assistant (guest → AI → API)\n\n${header}\n${table("assistant")}\n\n` +
        (transcripts ? `## Assistant transcripts\n\n${transcripts}\n` : ""),
    );
  }
}

/** Keeps a failure message to one readable table cell. */
function clean(message: string): string {
  return message.replace(/\u001b\[[0-9;]*m/g, "").replace(/\|/g, "\\|").slice(0, 300);
}
