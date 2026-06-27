import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ANCHOR_API = "https://api.anchorbrowser.io/v1";

function anchorHeaders(apiKey: string) {
  return {
    "anchor-api-key": apiKey,
    "Content-Type": "application/json",
  };
}

// POST /api/anchor/sessions — create a headful browser session
router.post("/anchor/sessions", async (req, res) => {
  const apiKey = process.env["VITE_ANCHOR_API_KEY"] ?? req.headers["x-anchor-key"] as string ?? "";
  if (!apiKey) { res.status(401).json({ error: "No Anchor API key configured" }); return; }

  try {
    const response = await fetch(`${ANCHOR_API}/sessions`, {
      method: "POST",
      headers: anchorHeaders(apiKey),
      body: JSON.stringify({
        browser: { headless: { active: false } },
        session: {
          recording: { active: false },
          proxy: { active: true },
          timeout: { idle_timeout: 5, max_duration: 10 },
        },
      }),
    });

    const data = await response.json() as Record<string, unknown>;
    if (!response.ok) { res.status(response.status).json(data); return; }

    const sessionData = (data as { data?: { id?: string; live_view_url?: string } }).data;
    res.json({
      sessionId: sessionData?.id,
      liveViewUrl: sessionData?.live_view_url,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/anchor/task — run a web task (optionally in an existing session)
router.post("/anchor/task", async (req, res) => {
  const apiKey = process.env["VITE_ANCHOR_API_KEY"] ?? req.headers["x-anchor-key"] as string ?? "";
  if (!apiKey) { res.status(401).json({ error: "No Anchor API key configured" }); return; }

  const { task, sessionId } = req.body as { task?: string; sessionId?: string };
  if (!task) { res.status(400).json({ error: "task is required" }); return; }

  try {
    const url = sessionId
      ? `${ANCHOR_API}/tools/perform-web-task?sessionId=${sessionId}`
      : `${ANCHOR_API}/tools/perform-web-task`;

    const response = await fetch(url, {
      method: "POST",
      headers: anchorHeaders(apiKey),
      body: JSON.stringify({ task }),
    });

    const data = await response.json() as Record<string, unknown>;
    if (!response.ok) { res.status(response.status).json(data); return; }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/anchor/sessions/:id — close a session
router.delete("/anchor/sessions/:id", async (req, res) => {
  const apiKey = process.env["VITE_ANCHOR_API_KEY"] ?? req.headers["x-anchor-key"] as string ?? "";
  if (!apiKey) { res.status(401).json({ error: "No Anchor API key" }); return; }

  try {
    const response = await fetch(`${ANCHOR_API}/sessions/${req.params["id"]}`, {
      method: "DELETE",
      headers: anchorHeaders(apiKey),
    });
    res.status(response.ok ? 200 : response.status).json({ ok: response.ok });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
