"use client"

import { useEffect, useMemo, useState } from "react"

type Code = {
  id: string
  name: string
  type: string
  definition: string
  color: string
}

type Segment = {
  id: string
  speaker: string
  text: string
  memo: string
  codeIds: string[]
}

type Interview = {
  id: string
  title: string
  participant: string
  role: string
  createdAt: string
  transcript: string
  segments: Segment[]
}

const STORAGE_KEY = "ci_dissertation_open_coding_workspace_v1"

const COLORS = [
  "bg-cyan-400/15 border-cyan-300/30 text-cyan-100",
  "bg-yellow-400/15 border-yellow-300/30 text-yellow-100",
  "bg-emerald-400/15 border-emerald-300/30 text-emerald-100",
  "bg-purple-400/15 border-purple-300/30 text-purple-100",
  "bg-red-400/15 border-red-300/30 text-red-100",
  "bg-blue-400/15 border-blue-300/30 text-blue-100",
]

function id() {
  return crypto.randomUUID()
}

function segmentTranscript(transcript: string): Segment[] {
  const cleaned = transcript.replace(/\r/g, "").trim()
  if (!cleaned) return []

  const speakerBlocks = cleaned
    .split(/\n(?=(Interviewer|Participant|P\d+|I|R|Nurse|NP|Clinician|Supervisor|Researcher)\s*:)/gi)
    .map((x) => x.trim())
    .filter(Boolean)

  const blocks =
    speakerBlocks.length > 2
      ? speakerBlocks
      : cleaned.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)

  return blocks.map((block, index) => {
    const match = block.match(/^([^:\n]{1,40}):\s*([\s\S]*)$/)
    return {
      id: id(),
      speaker: match ? match[1].trim() : `Segment ${index + 1}`,
      text: match ? match[2].trim() : block,
      memo: "",
      codeIds: [],
    }
  })
}

function saveFile(name: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""').replaceAll("\n", " ")}"`
}

export default function OpenCodingWorkspacePage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [codes, setCodes] = useState<Code[]>([])
  const [selectedInterviewId, setSelectedInterviewId] = useState("")
  const [selectedSegmentId, setSelectedSegmentId] = useState("")
  const [search, setSearch] = useState("")

  const [title, setTitle] = useState("")
  const [participant, setParticipant] = useState("")
  const [role, setRole] = useState("")
  const [transcript, setTranscript] = useState("")

  const [codeName, setCodeName] = useState("")
  const [codeType, setCodeType] = useState("Open Code")
  const [codeDefinition, setCodeDefinition] = useState("")
  const [existingCodeId, setExistingCodeId] = useState("")

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      setInterviews(parsed.interviews || [])
      setCodes(parsed.codes || [])
      setSelectedInterviewId(parsed.selectedInterviewId || "")
      setSelectedSegmentId(parsed.selectedSegmentId || "")
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ interviews, codes, selectedInterviewId, selectedSegmentId })
    )
  }, [interviews, codes, selectedInterviewId, selectedSegmentId])

  const selectedInterview = interviews.find((i) => i.id === selectedInterviewId)
  const selectedSegment = selectedInterview?.segments.find((s) => s.id === selectedSegmentId)

  const filteredSegments = useMemo(() => {
    const segments = selectedInterview?.segments || []
    if (!search.trim()) return segments
    const q = search.toLowerCase()
    return segments.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        s.speaker.toLowerCase().includes(q) ||
        s.codeIds.some((cid) => codes.find((c) => c.id === cid)?.name.toLowerCase().includes(q))
    )
  }, [selectedInterview, search, codes])

  const codeCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const interview of interviews) {
      for (const segment of interview.segments) {
        for (const cid of segment.codeIds) map.set(cid, (map.get(cid) || 0) + 1)
      }
    }
    return map
  }, [interviews])

  const stats = useMemo(() => {
    const segments = selectedInterview?.segments || []
    const coded = segments.filter((s) => s.codeIds.length > 0).length
    const memos = segments.filter((s) => s.memo.trim()).length
    return {
      total: segments.length,
      coded,
      remaining: segments.length - coded,
      memos,
      coverage: segments.length ? Math.round((coded / segments.length) * 100) : 0,
    }
  }, [selectedInterview])

  function createInterview() {
    const segments = segmentTranscript(transcript)
    const newInterview: Interview = {
      id: id(),
      title: title || `Interview ${interviews.length + 1}`,
      participant: participant || `P${interviews.length + 1}`,
      role,
      createdAt: new Date().toISOString(),
      transcript,
      segments,
    }

    setInterviews([newInterview, ...interviews])
    setSelectedInterviewId(newInterview.id)
    setSelectedSegmentId(segments[0]?.id || "")
    setTitle("")
    setParticipant("")
    setRole("")
    setTranscript("")
  }

  function updateSelectedSegment(patch: Partial<Segment>) {
    if (!selectedInterview || !selectedSegment) return

    setInterviews((prev) =>
      prev.map((interview) =>
        interview.id === selectedInterview.id
          ? {
              ...interview,
              segments: interview.segments.map((segment) =>
                segment.id === selectedSegment.id ? { ...segment, ...patch } : segment
              ),
            }
          : interview
      )
    )
  }

  function createAndApplyCode() {
    if (!codeName.trim() || !selectedSegment) return

    const newCode: Code = {
      id: id(),
      name: codeName.trim(),
      type: codeType,
      definition: codeDefinition.trim(),
      color: COLORS[codes.length % COLORS.length],
    }

    setCodes((prev) => [...prev, newCode])
    updateSelectedSegment({
      codeIds: [...new Set([...selectedSegment.codeIds, newCode.id])],
    })

    setCodeName("")
    setCodeDefinition("")
  }

  function applyExistingCode() {
    if (!existingCodeId || !selectedSegment) return
    updateSelectedSegment({
      codeIds: [...new Set([...selectedSegment.codeIds, existingCodeId])],
    })
    setExistingCodeId("")
  }

  function removeCodeFromSegment(codeId: string) {
    if (!selectedSegment) return
    updateSelectedSegment({
      codeIds: selectedSegment.codeIds.filter((id) => id !== codeId),
    })
  }

  function exportJSON() {
    saveFile(
      "open-coding-workspace.json",
      JSON.stringify({ interviews, codes }, null, 2),
      "application/json"
    )
  }

  function exportCSV() {
    const rows = [
      ["Interview", "Participant", "Role", "Segment Speaker", "Segment Text", "Codes", "Memo"],
      ...interviews.flatMap((interview) =>
        interview.segments.map((segment) => [
          interview.title,
          interview.participant,
          interview.role,
          segment.speaker,
          segment.text,
          segment.codeIds.map((cid) => codes.find((c) => c.id === cid)?.name || "").join("; "),
          segment.memo,
        ])
      ),
    ]

    saveFile("coded-segments.csv", rows.map((r) => r.map(csvEscape).join(",")).join("\n"), "text/csv")
  }

  function exportCodebookCSV() {
    const rows = [
      ["Code", "Type", "Definition", "References"],
      ...codes.map((c) => [c.name, c.type, c.definition, codeCounts.get(c.id) || 0]),
    ]

    saveFile("codebook.csv", rows.map((r) => r.map(csvEscape).join(",")).join("\n"), "text/csv")
  }

  return (
    <main className="min-h-screen bg-[#080604] px-6 py-10 text-[#F4EFE6]">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/[0.06] p-7">
          <div className="text-xs font-black uppercase tracking-[0.4em] text-yellow-300">
            Dissertation Coding MVP
          </div>
          <h1 className="mt-3 text-4xl font-black">Open Coding Workspace</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#B8AA96]">
            1. Create an interview. 2. Select a segment. 3. Apply or create open codes.
            4. Write analytic memos. 5. Export your coded data and codebook.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          <Stat label="Segments" value={stats.total} />
          <Stat label="Coded" value={stats.coded} />
          <Stat label="Remaining" value={stats.remaining} />
          <Stat label="Memos" value={stats.memos} />
          <Stat label="Coverage" value={`${stats.coverage}%`} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[300px_1fr_340px]">
          <aside className="space-y-4">
            <Panel title="New Interview">
              <input className="field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="field" placeholder="Participant label, e.g. P01" value={participant} onChange={(e) => setParticipant(e.target.value)} />
              <input className="field" placeholder="Role label" value={role} onChange={(e) => setRole(e.target.value)} />
              <textarea className="field h-40" placeholder="Paste transcript here" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
              <button className="button w-full" onClick={createInterview}>Create + Segment</button>
            </Panel>

            <Panel title="Interviews">
              <div className="space-y-2">
                {interviews.map((interview) => (
                  <button
                    key={interview.id}
                    onClick={() => {
                      setSelectedInterviewId(interview.id)
                      setSelectedSegmentId(interview.segments[0]?.id || "")
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                      interview.id === selectedInterviewId
                        ? "border-yellow-300/40 bg-yellow-400/10"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="font-black">{interview.participant} · {interview.title}</div>
                    <div className="text-xs text-[#8E8170]">{interview.segments.length} segments</div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Codebook">
              <div className="space-y-2">
                {codes.map((code) => (
                  <div key={code.id} className={`rounded-xl border px-3 py-2 text-sm ${code.color}`}>
                    <div className="font-black">{code.name}</div>
                    <div className="text-xs opacity-80">{code.type} · {codeCounts.get(code.id) || 0} refs</div>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>

          <section className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Transcript Segments</h2>
              <input
                className="field max-w-xs"
                placeholder="Search transcript or codes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-[720px] space-y-3 overflow-y-auto pr-2">
              {filteredSegments.map((segment, index) => (
                <button
                  key={segment.id}
                  onClick={() => setSelectedSegmentId(segment.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    segment.id === selectedSegmentId
                      ? "border-yellow-300/50 bg-yellow-400/10"
                      : "border-white/10 bg-[#111111] hover:bg-[#181818]"
                  }`}
                >
                  <div className="mb-2 flex justify-between gap-3">
                    <div className="font-black">{index + 1}. {segment.speaker}</div>
                    <div className="text-xs text-[#8E8170]">
                      {segment.codeIds.length} codes · {segment.memo ? "memo" : "no memo"}
                    </div>
                  </div>
                  <p className="line-clamp-4 text-sm leading-6 text-[#B8AA96]">{segment.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {segment.codeIds.map((cid) => {
                      const code = codes.find((c) => c.id === cid)
                      return code ? <span key={cid} className={`rounded-full border px-2 py-1 text-xs ${code.color}`}>{code.name}</span> : null
                    })}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <Panel title="Selected Segment">
              {selectedSegment ? (
                <>
                  <div className="text-sm font-black text-yellow-200">{selectedSegment.speaker}</div>
                  <p className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[#B8AA96]">
                    {selectedSegment.text}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#B8AA96]">Select a segment to code.</p>
              )}
            </Panel>

            <Panel title="Applied Codes">
              <div className="space-y-2">
                {selectedSegment?.codeIds.map((cid) => {
                  const code = codes.find((c) => c.id === cid)
                  return code ? (
                    <div key={cid} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${code.color}`}>
                      <span className="font-black">{code.name}</span>
                      <button onClick={() => removeCodeFromSegment(cid)} className="text-xs opacity-80">Remove</button>
                    </div>
                  ) : null
                })}
              </div>
            </Panel>

            <Panel title="Add Open Code">
              <input className="field" placeholder="Code name" value={codeName} onChange={(e) => setCodeName(e.target.value)} />
              <select className="field" value={codeType} onChange={(e) => setCodeType(e.target.value)}>
                <option>Open Code</option>
                <option>In-Vivo Code</option>
                <option>Process Code</option>
                <option>Emotion Code</option>
                <option>Descriptive Code</option>
              </select>
              <textarea className="field h-24" placeholder="Optional definition" value={codeDefinition} onChange={(e) => setCodeDefinition(e.target.value)} />
              <button className="button w-full" onClick={createAndApplyCode}>Create + Apply</button>
            </Panel>

            <Panel title="Apply Existing Code">
              <select className="field" value={existingCodeId} onChange={(e) => setExistingCodeId(e.target.value)}>
                <option value="">Choose code</option>
                {codes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="button w-full" onClick={applyExistingCode}>Apply Code</button>
            </Panel>

            <Panel title="Analytic Memo">
              <textarea
                className="field h-40"
                placeholder="Write analytic memo for this segment..."
                value={selectedSegment?.memo || ""}
                onChange={(e) => updateSelectedSegment({ memo: e.target.value })}
              />
            </Panel>

            <Panel title="Export">
              <div className="grid gap-2">
                <button className="button" onClick={exportCSV}>Export Coded Segments CSV</button>
                <button className="button" onClick={exportCodebookCSV}>Export Codebook CSV</button>
                <button className="button" onClick={exportJSON}>Backup JSON</button>
              </div>
            </Panel>
          </aside>
        </section>
      </div>

      <style jsx global>{`
        .field {
          width: 100%;
          border-radius: 0.85rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.45);
          padding: 0.85rem;
          color: #F4EFE6;
          outline: none;
        }
        .field:focus {
          border-color: rgba(250,204,21,0.55);
        }
        .button {
          border-radius: 0.9rem;
          background: #d5ad55;
          padding: 0.85rem 1rem;
          color: black;
          font-weight: 900;
        }
      `}</style>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-4">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-4">
      <div className="text-xs font-black uppercase tracking-[0.3em] text-[#8E8170]">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
    </div>
  )
}
