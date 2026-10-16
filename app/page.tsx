"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  Guitar,
  Heart,
  LogOut,
  Music2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsResponse } from "@/lib/analytics";

const numberFormat = new Intl.NumberFormat("pt-BR");
const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const eventLabels = { chord_view: "Visualizou cifra", search: "Fez uma busca", favorite_add: "Adicionou aos favoritos" };
const ranges = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
] as const;

export default function Home() {
  const [token, setToken] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("7d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(window.sessionStorage.getItem("comav-dashboard-token") ?? "");
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar as estatísticas.");
      setData(result as AnalyticsResponse);
    } catch (caught) {
      setData(null);
      setError(caught instanceof Error ? caught.message : "Erro inesperado ao carregar estatísticas.");
    } finally {
      setLoading(false);
    }
  }, [range, token]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = tokenDraft.trim();
    if (!nextToken) return;
    window.sessionStorage.setItem("comav-dashboard-token", nextToken);
    setToken(nextToken);
    setTokenDraft("");
  }

  function signOut() {
    window.sessionStorage.removeItem("comav-dashboard-token");
    setToken("");
    setData(null);
  }

  if (!token) {
    return (
      <main className="access-screen">
        <form className="access-card" onSubmit={signIn}>
          <div className="brand-mark"><Guitar size={24} strokeWidth={2.2} /></div>
          <p className="eyebrow">COMAV CIFRAS · PAINEL</p>
          <h1>Suas cifras, em números.</h1>
          <p className="access-copy">Entre com o token de acesso configurado para este painel.</p>
          <label htmlFor="dashboard-token">Token do painel</label>
          <input
            autoComplete="current-password"
            id="dashboard-token"
            onChange={(event) => setTokenDraft(event.target.value)}
            placeholder="Digite seu token de acesso"
            type="password"
            value={tokenDraft}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit">Acessar painel <ChevronDown size={16} /></button>
          <p className="secure-note"><ShieldCheck size={15} /> Acesso protegido</p>
        </form>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Comav Cifras início">
          <span className="brand-mark"><Guitar size={22} strokeWidth={2.2} /></span>
          <span className="brand-name">comav<span>cifras</span></span>
        </a>
        <div className="sidebar-label">VISÃO GERAL</div>
        <nav>
          <a className="nav-item active" href="#inicio"><BarChart3 size={18} /> Estatísticas</a>
          <a className="nav-item" href="#cifras"><Music2 size={18} /> Cifras populares</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-dot" /> {data ? "Firebase conectado" : "Conectando Firebase"}
          </div>
          <button className="logout-button" onClick={signOut} type="button"><LogOut size={17} /> Sair do painel</button>
          <div className="sidebar-foot">COMAV CIFRAS <span>·</span> ANALYTICS</div>
        </div>
      </aside>

      <main className="main-content" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">Painel <span>/</span> <strong>Estatísticas</strong></div>
          <div className="topbar-right">
            <span className="live-label"><span className="status-dot" /> Dados do Firestore</span>
            <span className="avatar">C</span>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">ACOMPANHE O QUE ESTÁ TOCANDO</p>
            <h1>Estatísticas</h1>
            <p className="subtitle">Uma visão clara de como a comunidade usa o Comav Cifras.</p>
          </div>
          <div className="range-picker" aria-label="Período">
            {ranges.map((item) => (
              <button
                aria-pressed={range === item.value}
                className={range === item.value ? "selected" : ""}
                key={item.value}
                onClick={() => setRange(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <strong>Não foi possível carregar os dados.</strong> {error}
            <button onClick={() => void loadAnalytics()} type="button">Tentar novamente</button>
          </div>
        )}

        {data?.truncated && (
          <div className="notice-banner">Este período contém mais de 20 mil eventos; os totais exibidos podem estar incompletos.</div>
        )}

        <section className="stats-grid" aria-label="Indicadores principais">
          <MetricCard
            label="Visualizações de cifras"
            value={data?.summary.totalViews}
            icon={<Music2 size={19} />}
            color="mint"
            helper="Cifras abertas no app"
          />
          <MetricCard
            label="Buscas realizadas"
            value={data?.summary.searches}
            icon={<Search size={19} />}
            color="blue"
            helper="Pesquisas feitas no app"
          />
          <MetricCard
            label="Favoritos adicionados"
            value={data?.summary.favorites}
            icon={<Heart size={19} />}
            color="pink"
            helper="Cifras salvas pela comunidade"
          />
          <MetricCard
            label="Usuários ativos"
            value={data?.summary.activeUsers}
            icon={<Users size={19} />}
            color="purple"
            helper="Usuários únicos no período"
          />
        </section>

        <section className="content-grid">
          <article className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">ATIVIDADE</p>
                <h2>Uso ao longo do tempo</h2>
              </div>
              <span className="chart-legend"><i /> Visualizações</span>
            </div>
            {loading && !data ? <PanelLoading /> : data && data.daily.length > 0 ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#31aa77" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#31aa77" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf0ed" strokeDasharray="4 5" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="date"
                      tickFormatter={(value: string) => dateFormat.format(new Date(`${value}T12:00:00`))}
                      tickLine={false}
                      tick={{ fill: "#929b95", fontSize: 11 }}
                      minTickGap={24}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#929b95", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ border: "1px solid #edf0ed", borderRadius: 12, boxShadow: "0 8px 24px #1c362110" }}
                      labelFormatter={(value) => dateFormat.format(new Date(`${value}T12:00:00`))}
                      formatter={(value) => [numberFormat.format(Number(value)), "Visualizações"]}
                    />
                    <Area dataKey="views" stroke="#299c6b" strokeWidth={2.5} fill="url(#viewsFill)" activeDot={{ r: 5, fill: "#299c6b", stroke: "#fff", strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState loading={loading} message="Os eventos de uso aparecerão aqui assim que forem registrados." />
            )}
            <div className="chart-footer"><Activity size={15} /> <span>Atividade diária de visualização de cifras</span></div>
          </article>

          <article className="panel songs-panel" id="cifras">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">EM ALTA</p>
                <h2>Cifras populares</h2>
              </div>
              <span className="subtle-period">{ranges.find((item) => item.value === range)?.label}</span>
            </div>
            {loading && !data ? <PanelLoading /> : data?.topSongs.length ? (
              <div className="song-list">
                {data.topSongs.map((song, index) => (
                  <div className="song-row" key={song.id}>
                    <span className={`song-rank ${index === 0 ? "top-rank" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                    <span className="song-cover"><Music2 size={17} /></span>
                    <span className="song-info"><strong>{song.title}</strong><small>{song.artist}</small></span>
                    <span className="song-views">{numberFormat.format(song.views)}<small> acessos</small></span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState loading={loading} message="Ainda não há cifras visualizadas neste período." />
            )}
            <div className="songs-footer"><span className="tiny-equalizer"><i /><i /><i /><i /></span> Top 5 por visualizações</div>
          </article>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">ACOMPANHAMENTO</p>
              <h2>Atividade recente</h2>
            </div>
            <span className="subtle-period">Últimos eventos</span>
          </div>
          {loading && !data ? <PanelLoading /> : data?.recentEvents.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>ATIVIDADE</th><th>CIFRA / BUSCA</th><th>ARTISTA</th><th>HORÁRIO</th></tr>
                </thead>
                <tbody>
                  {data.recentEvents.map((event) => (
                    <tr key={event.id}>
                      <td><span className={`event-icon ${event.type}`}><Activity size={15} /></span>{eventLabels[event.type]}</td>
                      <td className="table-primary">{event.songTitle}</td>
                      <td className="table-muted">{event.artist || "—"}</td>
                      <td className="table-muted">{timeFormat.format(new Date(event.createdAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState loading={loading} message="A atividade recente será exibida depois dos primeiros eventos." />
          )}
        </section>

        <footer className="page-footer">
          <span>Feito para quem vive de música <span className="footer-heart">♥</span></span>
          <span>{data ? `Atualizado às ${timeFormat.format(new Date(data.generatedAt))}` : "Aguardando dados do Firebase"}</span>
        </footer>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
  helper,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  color: string;
  helper: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><span className={`metric-icon ${color}`}>{icon}</span></div>
      <div className="metric-value">{value === undefined ? <span className="skeleton-value" /> : numberFormat.format(value)}</div>
      <div className="metric-helper">{helper}</div>
    </article>
  );
}

function PanelLoading() {
  return <div className="panel-loading" aria-label="Carregando"><span /><span /><span /><span /><span /></div>;
}

function EmptyState({ message, loading }: { message: string; loading: boolean }) {
  return <div className="empty-state">{loading ? "Carregando estatísticas..." : message}</div>;
}
