import { useState, useEffect, useMemo, useCallback } from 'react'
import heroImg from './assets/hero.png'
import chaveamento from './dados/chaveamento.json'
import elencos from './dados/elencos.json'
import { ENDPOINT_PALPITES, STORAGE_KEY } from './config.js'

const GOL_CONTRA = '(gol contra)'

// ---------- helpers de dados ----------
const playersOf = (team) => (elencos[team] || []).map((p) => p.name)
const scorerOptions = (team) => [...playersOf(team), GOL_CONTRA]

const maskCPF = (v) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')

const onlyDigits = (v) => (v || '').replace(/\D/g, '')

// ---------- estado inicial ----------
const buildInitial = () => ({
  player: '',
  cpf: '',
  predictions: chaveamento.jogos.map((j) => ({
    id: j.id,
    fase: j.fase,
    mandante: j.mandante,
    visitante: j.visitante,
    provisorio: !!j.provisorio,
    brasilHome: j.mandante === 'Brasil',
    brasilAway: j.visitante === 'Brasil',
    homeScore: '',
    awayScore: '',
    homeScorers: [],
    awayScorers: [],
  })),
})

const loadDraft = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return buildInitial()
    const parsed = JSON.parse(saved)
    // re-mescla com o chaveamento atual (caso os jogos mudem)
    const base = buildInitial()
    base.player = parsed.player || ''
    base.cpf = parsed.cpf || ''
    base.predictions = base.predictions.map((p) => {
      const prev = (parsed.predictions || []).find((x) => x.id === p.id)
      if (!prev) return p
      const hs = prev.homeScore ?? ''
      const as = prev.awayScore ?? ''
      const nH = hs === '' ? 0 : parseInt(hs, 10)
      const nA = as === '' ? 0 : parseInt(as, 10)
      return {
        ...p,
        homeScore: hs, awayScore: as,
        homeScorers: Array.from({ length: nH }, (_, i) => (prev.homeScorers || [])[i] ?? ''),
        awayScorers: Array.from({ length: nA }, (_, i) => (prev.awayScorers || [])[i] ?? ''),
      }
    })
    return base
  } catch {
    return buildInitial()
  }
}

// pesos de placar para o "preencher aleatório" (mais 0/1/2 do que goleadas)
const randScore = () => { const w = [0, 0, 0, 1, 1, 1, 1, 2, 2, 3]; return w[Math.floor(Math.random() * w.length)] }
const randName = (team) => { const arr = playersOf(team); return arr.length ? arr[Math.floor(Math.random() * arr.length)] : '' }

export default function App() {
  const [form, setForm] = useState(loadDraft)
  const [statusMsg, setStatusMsg] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null) // {type, title, message}
  const [sending, setSending] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  // salva rascunho local a cada mudança
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)) } catch { /* ignore */ }
  }, [form])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const updateScore = useCallback((id, side, raw) => {
    let v = raw.replace(/\D/g, '')
    if (v !== '') v = String(Math.min(20, parseInt(v, 10)))
    setForm((f) => ({
      ...f,
      predictions: f.predictions.map((p) => {
        if (p.id !== id) return p
        const n = v === '' ? 0 : parseInt(v, 10)
        const key = side === 'home' ? 'homeScorers' : 'awayScorers'
        const next = Array.from({ length: n }, (_, i) => p[key][i] ?? '')
        return { ...p, [side === 'home' ? 'homeScore' : 'awayScore']: v, [key]: next }
      }),
    }))
  }, [])

  const setScorer = useCallback((id, side, idx, name) => {
    setForm((f) => ({
      ...f,
      predictions: f.predictions.map((p) => {
        if (p.id !== id) return p
        const key = side === 'home' ? 'homeScorers' : 'awayScorers'
        const arr = [...p[key]]
        arr[idx] = name
        return { ...p, [key]: arr }
      }),
    }))
  }, [])

  const fillRandom = () => {
    setForm((f) => ({
      ...f,
      predictions: f.predictions.map((p) => {
        const hs = randScore(), as = randScore()
        return {
          ...p,
          homeScore: String(hs), awayScore: String(as),
          homeScorers: Array.from({ length: hs }, () => randName(p.mandante)),
          awayScorers: Array.from({ length: as }, () => randName(p.visitante)),
        }
      }),
    }))
    setStatusMsg('Palpites preenchidos aleatoriamente — revise antes de enviar.')
  }

  const filledCount = useMemo(
    () => form.predictions.filter((p) => p.homeScore !== '' && p.awayScore !== '').length,
    [form.predictions],
  )
  const totalGames = form.predictions.length
  const pct = Math.round((filledCount / totalGames) * 100)
  const single = totalGames === 1

  // ---------- validação ----------
  const validate = () => {
    const errors = []
    if (!form.player.trim()) errors.push('Informe o nome do participante.')
    if (onlyDigits(form.cpf).length !== 11) errors.push('Informe um CPF válido (11 dígitos).')
    if (filledCount < totalGames) errors.push(totalGames === 1 ? 'Preencha o placar do jogo.' : `Preencha o placar de todos os ${totalGames} jogos (${filledCount}/${totalGames}).`)
    // Brasil: artilheiros obrigatórios
    for (const p of form.predictions) {
      if (p.brasilHome && p.homeScore !== '' && parseInt(p.homeScore, 10) > 0) {
        if (p.homeScorers.some((s) => !s)) errors.push(`Preencha os artilheiros do Brasil em ${p.mandante} x ${p.visitante}.`)
      }
      if (p.brasilAway && p.awayScore !== '' && parseInt(p.awayScore, 10) > 0) {
        if (p.awayScorers.some((s) => !s)) errors.push(`Preencha os artilheiros do Brasil em ${p.mandante} x ${p.visitante}.`)
      }
    }
    return errors
  }

  const onTrySend = () => {
    const errors = validate()
    if (errors.length) {
      setShowErrors(true)
      setResult({ type: 'error', title: 'Revise seu palpite', message: errors.join('\n') })
      return
    }
    setConfirmOpen(true)
  }

  const buildPayload = () => ({
    player: form.player.trim(),
    cpf: onlyDigits(form.cpf),
    fase: chaveamento.faseAtual,
    predictions: form.predictions.map((p) => ({
      matchId: p.id,
      fase: p.fase,
      mandante: p.mandante,
      visitante: p.visitante,
      homeScore: p.homeScore === '' ? null : Number(p.homeScore),
      awayScore: p.awayScore === '' ? null : Number(p.awayScore),
      homeScorers: p.homeScorers,
      awayScorers: p.awayScorers,
    })),
  })

  const doSend = async () => {
    setConfirmOpen(false)
    setSending(true)
    setStatusMsg('Salvando...')
    const payload = buildPayload()
    // MODO DEMONSTRAÇÃO: sem endpoint configurado
    if (!ENDPOINT_PALPITES) {
      console.log('[DEMO] Payload que seria enviado:', payload)
      setSending(false)
      setStatusMsg('')
      setResult({
        type: 'success',
        title: 'Modo demonstração',
        message: 'Endpoint não configurado (src/config.js). O palpite foi validado e o JSON impresso no console do navegador.',
      })
      return
    }
    try {
      const res = await fetch(ENDPOINT_PALPITES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      // Lê o status pelo corpo (o fluxo pode responder sempre 200 com {status,message})
      let body = null
      try { body = await res.json() } catch (e) { /* resposta sem corpo JSON */ }
      const bstatus = body && (body.status || (body.result && body.result.status))
      const bmsg = body && (body.message || (body.result && body.result.message))
      if (res.status === 409 || bstatus === 'duplicate') {
        setStatusMsg('')
        setResult({ type: 'error', title: 'Palpite já enviado', message: bmsg || 'Esse CPF já possui um palpite cadastrado. Não é possível enviar mais de um palpite por pessoa.' })
        return
      }
      if (!res.ok || bstatus === 'error') {
        throw new Error(bmsg || `Erro ${res.status}`)
      }
      setStatusMsg('')
      setResult({ type: 'success', title: 'Palpite enviado', message: bmsg || 'Suas informações foram salvas com sucesso. Boa sorte!' })
    } catch (e) {
      setStatusMsg('')
      setResult({ type: 'error', title: 'Falha ao enviar palpite', message: (e && e.message) || 'Não foi possível salvar. Tente novamente.' })
    } finally {
      setSending(false)
    }
  }

  // agrupa por fase (preparado para Oitavas/Quartas no futuro)
  const byPhase = useMemo(() => {
    const m = new Map()
    for (const p of form.predictions) {
      if (!m.has(p.fase)) m.set(p.fase, [])
      m.get(p.fase).push(p)
    }
    return [...m.entries()]
  }, [form.predictions])

  return (
    <div className="page">
      <header className="sheet-hero">
        <img className="hero-image" src={heroImg} alt="" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p>Bolão do Escritório · {single ? 'Jogo do Brasil' : 'Jogos do Brasil'}</p>
          <h1>Bolão Balera<small className="hero-line2">Copa do Mundo FIFA 2026</small></h1>
          <span className="hero-tag"><BrasilFlag />{single ? 'Jogo do Brasil' : `${totalGames} jogos do Brasil`} · placar + artilheiros</span>
        </div>
      </header>

      <section className="sheet-shell" aria-labelledby="sheet-title">
        <div className="sheet-toolbar">
          <div>
            <p className="kicker">{chaveamento.faseAtual}</p>
            <h2 id="sheet-title">{single ? 'Meu palpite' : 'Meus palpites'}</h2>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="random-button" onClick={fillRandom} disabled={sending}>
              Preencher aleatório
            </button>
          </div>
        </div>

        {statusMsg && <p className="save-status" role="status">{statusMsg}</p>}

        <div className="player-grid" aria-label="Dados do participante">
          <label>
            Participante
            <input
              value={form.player}
              onChange={(e) => setField('player', e.target.value)}
              placeholder="Nome completo"
              className={showErrors && !form.player.trim() ? 'missing' : ''}
            />
          </label>
          <label>
            CPF
            <input
              value={form.cpf}
              onChange={(e) => setField('cpf', maskCPF(e.target.value))}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              className={showErrors && onlyDigits(form.cpf).length !== 11 ? 'missing' : ''}
            />
          </label>
          <div className="progress-card">
            <strong>{filledCount}/{totalGames}</strong>
            <span>{single ? 'jogo com placar preenchido' : 'jogos com placar preenchido'}</span>
            <div className="progress-track" aria-label={`${pct}% preenchido`}>
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="legend">
          <span><i style={{ background: '#ffeb00' }} /> Jogo do Brasil — artilheiros obrigatórios</span>
          {form.predictions.some((p) => p.provisorio) && (
            <span><i style={{ background: '#ffe4e6' }} /> Confronto provisório (depende dos últimos jogos dos grupos)</span>
          )}
          <span>Demais times: artilheiros opcionais (mas pontuam se acertar).</span>
        </div>

        <div className="matches-wrap">
          {byPhase.map(([fase, jogos]) => (
            <div key={fase} style={{ display: 'contents' }}>
              <h3 className="phase-title">{fase}</h3>
              <div className="matches-grid">
                {jogos.map((p) => (
                  <MatchCard key={p.id} p={p} updateScore={updateScore} setScorer={setScorer} showErrors={showErrors} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="save-bar">
          <span className="kicker" style={{ margin: 0 }}>
            {ENDPOINT_PALPITES ? 'Confira tudo antes de enviar — não dá para alterar depois.' : 'Modo demonstração (endpoint não configurado).'}
          </span>
          <button type="button" className="save-button" onClick={onTrySend} disabled={sending}>
            {sending ? 'Enviando...' : (single ? 'Enviar palpite' : 'Enviar palpites')}
          </button>
        </div>
      </section>

      {confirmOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirmOpen(false)}>
          <div className="save-modal save-modal-confirm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-mark" aria-hidden="true">!</div>
            <h2>Confirmar envio</h2>
            <p>Depois de enviar, seu palpite não poderá ser alterado. Deseja continuar?</p>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button type="button" onClick={doSend}>Enviar</button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="modal-backdrop" role="presentation" onClick={() => setResult(null)}>
          <div className={`save-modal save-modal-${result.type}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-mark" aria-hidden="true">{result.type === 'success' ? '✓' : '!'}</div>
            <h2>{result.title}</h2>
            <p>{result.message}</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setResult(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- bandeira do Brasil (SVG inline; consistente em qualquer sistema) ----------
function BrasilFlag() {
  return (
    <svg viewBox="0 0 28 20" aria-hidden="true"
      style={{ height: '0.85em', width: 'auto', verticalAlign: '-2px', borderRadius: 2, boxShadow: '0 0 0 1.5px rgba(255,255,255,.85)', marginRight: 6 }}>
      <rect width="28" height="20" fill="#009c3b" />
      <path d="M14 2 L26 10 L14 18 L2 10 Z" fill="#ffdf00" />
      <circle cx="14" cy="10" r="4.2" fill="#002776" />
    </svg>
  )
}

// ---------- cartão de jogo ----------
function MatchCard({ p, updateScore, setScorer, showErrors }) {
  const nH = p.homeScore === '' ? 0 : parseInt(p.homeScore, 10)
  const nA = p.awayScore === '' ? 0 : parseInt(p.awayScore, 10)
  const homeOpts = scorerOptions(p.mandante)
  const awayOpts = scorerOptions(p.visitante)

  return (
    <div className={`match-card${p.brasilHome || p.brasilAway ? ' is-brasil' : ''}`}>
      {(p.brasilHome || p.brasilAway) && <div className="brasil-banner"><BrasilFlag /> Jogo do Brasil</div>}
      <div className="match-top">
        <span className="match-num">J{p.id}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {p.provisorio && <span className="tag-prov">provisório</span>}
        </span>
      </div>

      <div className="match-score">
        <div className="team-block home">
          <span className="team-name">{p.mandante}</span>
        </div>
        <div className="score-cell">
          <input
            inputMode="numeric" type="text" value={p.homeScore}
            onChange={(e) => updateScore(p.id, 'home', e.target.value)}
            aria-label={`Gols de ${p.mandante}`}
          />
          <span className="score-x">x</span>
          <input
            inputMode="numeric" type="text" value={p.awayScore}
            onChange={(e) => updateScore(p.id, 'away', e.target.value)}
            aria-label={`Gols de ${p.visitante}`}
          />
        </div>
        <div className="team-block away">
          <span className="team-name">{p.visitante}</span>
        </div>
      </div>

      {(nH > 0 || nA > 0) && (
        <div className="scorers">
          {nH > 0 && (
            <ScorerColumn
              side="home" team={p.mandante} count={nH} options={homeOpts}
              values={p.homeScorers} required={p.brasilHome} showErrors={showErrors}
              onChange={(idx, name) => setScorer(p.id, 'home', idx, name)}
            />
          )}
          {nA > 0 && (
            <ScorerColumn
              side="away" team={p.visitante} count={nA} options={awayOpts}
              values={p.awayScorers} required={p.brasilAway} showErrors={showErrors}
              onChange={(idx, name) => setScorer(p.id, 'away', idx, name)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ScorerColumn({ side, team, count, options, values, required, showErrors, onChange }) {
  return (
    <div className="scorers-col">
      <h4>
        Gols de {team} {required && <span className="req-star">obrigatório*</span>}
      </h4>
      {Array.from({ length: count }, (_, i) => {
        const val = values[i] ?? ''
        const missing = showErrors && required && !val
        return (
          <div key={i} className={`scorer-row ${side}`}>
            <span className="scorer-idx">{i + 1}</span>
            <select
              className={missing ? 'missing' : ''}
              value={val}
              onChange={(e) => onChange(i, e.target.value)}
            >
              <option value="">{required ? 'Selecione o artilheiro' : 'Selecione (opcional)'}</option>
              {options.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
