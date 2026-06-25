'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/src/lib/supabase'

type Interview = {
  id: string
  title: string
  participant_label: string | null
  role_label: string | null
  transcript_text: string
  created_at: string
}

type Segment = {
  id: string
  interview_id: string
  segment_number: number
  segment_text: string
}

type OpenCode = {
  id: string
  code_name: string
  code_type: string
  definition: string | null
}

type AppliedCode = {
  id: string
  segment_id: string
  code_id: string
  analytic_note: string | null
  research_open_codes?: OpenCode
}

export default function ResearchCodingPage() {
  const supabase = createClient()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [codes, setCodes] = useState<OpenCode[]>([])
  const [appliedCodes, setAppliedCodes] = useState<AppliedCode[]>([])
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null)

  const [title, setTitle] = useState('')
  const [participant, setParticipant] = useState('')
  const [role, setRole] = useState('')
  const [transcript, setTranscript] = useState('')

  const [newCode, setNewCode] = useState('')
  const [codeType, setCodeType] = useState('open')
  const [definition, setDefinition] = useState('')
  const [memoText, setMemoText] = useState('')

  async function loadAll() {
    const { data: interviewData } = await supabase
      .from('research_interviews')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: codeData } = await supabase
      .from('research_open_codes')
      .select('*')
      .order('code_name')

    setInterviews(interviewData || [])
    setCodes(codeData || [])
  }

  async function loadInterview(interview: Interview) {
    setSelectedInterview(interview)
    setSelectedSegment(null)

    const { data: segmentData } = await supabase
      .from('research_segments')
      .select('*')
      .eq('interview_id', interview.id)
      .order('segment_number')

    const segmentIds = (segmentData || []).map((s) => s.id)

    let appliedData: AppliedCode[] = []
    if (segmentIds.length) {
      const { data } = await supabase
        .from('research_segment_codes')
        .select('*, research_open_codes(*)')
        .in('segment_id', segmentIds)

      appliedData = data || []
    }

    setSegments(segmentData || [])
    setAppliedCodes(appliedData)
  }

  function splitTranscript(text: string) {
    return text
      .split(/\n\s*\n|(?<=\.)\s+(?=[A-Z"“])/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 20)
  }

  async function createInterview() {
    if (!title.trim() || !transcript.trim()) return

    const { data: interviewData, error } = await supabase
      .from('research_interviews')
      .insert({
        title: title.trim(),
        participant_label: participant.trim() || null,
        role_label: role.trim() || null,
        transcript_text: transcript.trim(),
      })
      .select()
      .single()

    if (error || !interviewData) {
      alert(error?.message || 'Could not create interview')
      return
    }

    const rows = splitTranscript(transcript).map((text, index) => ({
      interview_id: interviewData.id,
      segment_number: index + 1,
      segment_text: text,
    }))

    if (rows.length) {
      await supabase.from('research_segments').insert(rows)
    }

    setTitle('')
    setParticipant('')
    setRole('')
    setTranscript('')

    await loadAll()
    await loadInterview(interviewData)
  }

  async function createCodeAndApply() {
    if (!selectedSegment || !newCode.trim()) return

    const { data: codeData, error } = await supabase
      .from('research_open_codes')
      .upsert({
        code_name: newCode.trim(),
        code_type: codeType,
        definition: definition.trim() || null,
      }, { onConflict: 'user_id,code_name' })
      .select()
      .single()

    if (error || !codeData) {
      alert(error?.message || 'Could not create code')
      return
    }

    await supabase.from('research_segment_codes').upsert({
      segment_id: selectedSegment.id,
      code_id: codeData.id,
    }, { onConflict: 'segment_id,code_id' })

    setNewCode('')
    setDefinition('')
    await loadAll()
    if (selectedInterview) await loadInterview(selectedInterview)
  }

  async function applyExistingCode(codeId: string) {
    if (!selectedSegment || !codeId) return

    await supabase.from('research_segment_codes').upsert({
      segment_id: selectedSegment.id,
      code_id: codeId,
    }, { onConflict: 'segment_id,code_id' })

    if (selectedInterview) await loadInterview(selectedInterview)
  }

  async function saveMemo() {
    if (!selectedInterview || !memoText.trim()) return

    await supabase.from('research_memos').insert({
      interview_id: selectedInterview.id,
      segment_id: selectedSegment?.id || null,
      memo_type: 'analytic',
      memo_text: memoText.trim(),
    })

    setMemoText('')
    alert('Memo saved')
  }

  const selectedCodes = useMemo(() => {
    if (!selectedSegment) return []
    return appliedCodes.filter((x) => x.segment_id === selectedSegment.id)
  }, [selectedSegment, appliedCodes])

  useEffect(() => {
    loadAll()
  }, [])

  return (
    <main className="min-h-screen bg-[#0B0A07] text-[#F5E7C8]">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 rounded-3xl border border-[#3A2A14] bg-[#151107] p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A45D]">Dissertation Coding MVP</p>
          <h1 className="mt-2 text-3xl font-bold">Open Coding Workspace</h1>
          <p className="mt-2 max-w-3xl text-[#D8C69A]">
            Paste a transcript, break it into segments, assign open codes, preserve in-vivo codes, and write analytic memos.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr_360px]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-[#3A2A14] bg-[#151107] p-4">
              <h2 className="mb-3 text-xl font-semibold">New Interview</h2>
              <input className="mb-2 w-full rounded-xl bg-[#0B0A07] p-3 text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="mb-2 w-full rounded-xl bg-[#0B0A07] p-3 text-sm" placeholder="Participant label, e.g. P01" value={participant} onChange={(e) => setParticipant(e.target.value)} />
              <input className="mb-2 w-full rounded-xl bg-[#0B0A07] p-3 text-sm" placeholder="Role label" value={role} onChange={(e) => setRole(e.target.value)} />
              <textarea className="mb-3 h-44 w-full rounded-xl bg-[#0B0A07] p-3 text-sm" placeholder="Paste transcript here" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
              <button onClick={createInterview} className="w-full rounded-xl bg-[#C8A45D] px-4 py-3 font-semibold text-black">Create + Segment</button>
            </div>

            <div className="rounded-3xl border border-[#3A2A14] bg-[#151107] p-4">
              <h2 className="mb-3 text-xl font-semibold">Interviews</h2>
              <div className="space-y-2">
                {interviews.map((i) => (
                  <button key={i.id} onClick={() => loadInterview(i)} className="w-full rounded-xl border border-[#3A2A14] p-3 text-left hover:bg-[#211907]">
                    <div className="font-semibold">{i.title}</div>
                    <div className="text-xs text-[#D8C69A]">{i.participant_label || 'No participant'} · {i.role_label || 'No role'}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="rounded-3xl border border-[#3A2A14] bg-[#151107] p-4">
            <h2 className="mb-3 text-xl font-semibold">
              {selectedInterview ? selectedInterview.title : 'Transcript Segments'}
            </h2>

            <div className="max-h-[760px] space-y-3 overflow-y-auto pr-2">
              {segments.map((s) => {
                const count = appliedCodes.filter((a) => a.segment_id === s.id).length
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSegment(s)}
                    className={`w-full rounded-2xl border p-4 text-left ${
                      selectedSegment?.id === s.id ? 'border-[#C8A45D] bg-[#211907]' : 'border-[#3A2A14] bg-[#0B0A07]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-[#C8A45D]">Segment {s.segment_number}</span>
                      <span className="text-xs text-[#D8C69A]">{count} codes</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#F5E7C8]">{s.segment_text}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-[#3A2A14] bg-[#151107] p-4">
              <h2 className="mb-3 text-xl font-semibold">Selected Segment</h2>
              {selectedSegment ? (
                <p className="rounded-xl bg-[#0B0A07] p-3 text-sm leading-relaxed">{selectedSegment.segment_text}</p>
              ) : (
                <p className="text-sm text-[#D8C69A]">Select a segment to code.</p>
              )}
            </div>

            <div className="rounded-3xl border border-[#3A2A14] bg-[#151107] p-4">
              <h2 className="mb-3 text-xl font-semibold">Applied Codes</h2>
              <div className="space-y-2">
                {selectedCodes.map((a) => (
                  <div key={a.id} className="rounded-xl bg-[#0B0A07] p-3 text-sm">
                    <div className="font-semibold">{a.research_open_codes?.code_name}</div>
                    <div className="text-xs text-[#D8C69A]">{a.research_open_codes?.code_type}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#3A2A14] bg-[#151107] p-4">
              <h2 className="mb-3 text-xl font-semibold">Add Open Code</h2>
              <input className="mb-2 w-full rounded-xl bg-[#0B0A07] p-3 text-sm" placeholder="Code name" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
              <select className="mb-2 w-full rounded-xl bg-[#0B0A07] p-3 text-sm" value={codeType} onChange={(e) => setCodeType(e.target.value)}>
                <option value="open">Open Code</option>
                <option value="in-vivo">In Vivo Code</option>
                <option value="process">Process Code</option>
                <option value="emotion">Emotion Code</option>
                <option value="action">Action Code</option>
              </select>
              <textarea className="mb-3 h-20 w-full rounded-xl bg-[#0B0A07] p-3 text-sm" placeholder="Optional definition" value={definition} onChange={(e) => setDefinition(e.target.value)} />
              <button onClick={createCodeAndApply} className="w-full rounded-xl bg-[#C8A45D] px-4 py-3 font-semibold text-black">Create + Apply</button>
            </div>

            <div className="rounded-3xl border border-[#3A2A14] bg-[#151107] p-4">
              <h2 className="mb-3 text-xl font-semibold">Apply Existing Code</h2>
              <select className="w-full rounded-xl bg-[#0B0A07] p-3 text-sm" onChange={(e) => applyExistingCode(e.target.value)} defaultValue="">
                <option value="">Choose code</option>
                {codes.map((c) => (
                  <option key={c.id} value={c.id}>{c.code_name}</option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl border border-[#3A2A14] bg-[#151107] p-4">
              <h2 className="mb-3 text-xl font-semibold">Analytic Memo</h2>
              <textarea className="mb-3 h-28 w-full rounded-xl bg-[#0B0A07] p-3 text-sm" placeholder="Write memo..." value={memoText} onChange={(e) => setMemoText(e.target.value)} />
              <button onClick={saveMemo} className="w-full rounded-xl border border-[#C8A45D] px-4 py-3 font-semibold text-[#F5E7C8]">Save Memo</button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
