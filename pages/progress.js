// pages/progress.js
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function ProgressPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  // --- 登录检查：优先读现有 session，其次监听变化 ---
  useEffect(() => {
    let authSub
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        const u = data?.session?.user
        if (!u) {
          router.replace('/login')
          return
        }
        setUser(u)
      } catch (e) {
        setErrorMsg(`获取登录状态失败：${e.message || e}`)
      } finally {
        setLoading(false)
      }
      // 监听登录状态变化
      const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
        const u = session?.user || null
        setUser(u)
        if (!u) router.replace('/login')
      })
      authSub = sub
    }
    init()
    return () => {
      authSub?.subscription?.unsubscribe?.()
    }
  }, [router])

  // --- 拉取任务列表 ---
  const fetchTasks = async () => {
    if (!user) return
    setErrorMsg('')
    setInfoMsg('')
    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      setTasks(data || [])
    } catch (e) {
      // 常见 503/策略问题在这里能看到 message
      setErrorMsg(`获取任务失败：${e.message || e}`)
    }
  }

  useEffect(() => {
    if (user) fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // --- 添加任务 ---
  const addTask = async () => {
    if (!newTask.trim() || !user) return
    setAdding(true)
    setErrorMsg('')
    setInfoMsg('')
    try {
      const { error } = await supabase
        .from('progress')
        .insert([{ task: newTask.trim(), user_id: user.id, progress: 0 }])
      if (error) throw error
      setNewTask('')
      setInfoMsg('添加成功 ✅')
      fetchTasks()
    } catch (e) {
      setErrorMsg(`添加任务失败：${e.message || e}`)
    } finally {
      setAdding(false)
    }
  }

  // --- 更新进度（0-100）---
  const updateProgress = async (id, value) => {
    const val = Math.min(100, Math.max(0, Number(value) || 0))
    setErrorMsg('')
    setInfoMsg('')
    try {
      // 乐观更新
      setTasks((prev) => prev.map(t => (t.id === id ? { ...t, progress: val } : t)))
      const { error } = await supabase.from('progress').update({ progress: val }).eq('id', id)
      if (error) throw error
      setInfoMsg('进度已保存 ✅')
    } catch (e) {
      setErrorMsg(`更新进度失败：${e.message || e}`)
      // 回滚：重新拉取
      fetchTasks()
    }
  }

  // --- 删除任务 ---
  const deleteTask = async (id) => {
    if (!confirm('确认删除这个任务吗？')) return
    setErrorMsg('')
    setInfoMsg('')
    try {
      // 乐观更新
      const prev = tasks
      setTasks(prev.filter(t => t.id !== id))
      const { error } = await supabase.from('progress').delete().eq('id', id)
      if (error) throw error
      setInfoMsg('已删除 ✅')
    } catch (e) {
      setErrorMsg(`删除失败：${e.message || e}`)
      fetchTasks()
    }
  }

  // --- 友好提示（比如 503）---
  const networkHint = useMemo(() => {
    if (!errorMsg) return ''
    // 简单关键字判断，给出引导
    if (/503|Service Unavailable|schema cache|Failed to fetch/i.test(errorMsg)) {
      return '提示：这是后端连通性问题。若本地无 VPN，请以 Vercel 部署页面访问；或检查 Vercel 环境变量是否已配置并重新部署。'
    }
    if (/row-level security|RLS|policy|not allowed/i.test(errorMsg)) {
      return '提示：请确认 progress 表已启用 RLS，且已配置“只允许用户访问自己的行”的策略。'
    }
    if (/No API key|apikey/i.test(errorMsg)) {
      return '提示：Vercel 环境变量缺失。请在 Settings → Environment Variables 中配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY 并 Redeploy。'
    }
    return ''
  }, [errorMsg])

  if (loading) {
    return (
      <div style={styles.container}>
        <p>正在检查登录状态…</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={{ marginTop: 0 }}>📊 学习进度</h1>

        {/* 顶部操作区 */}
        <div style={styles.row}>
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="输入任务名称"
            style={styles.input}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
          />
          <button onClick={addTask} disabled={adding || !newTask.trim()} style={styles.primaryBtn}>
            {adding ? '添加中…' : '添加任务'}
          </button>
          <button onClick={fetchTasks} style={styles.ghostBtn}>刷新</button>
        </div>

        {/* 消息区 */}
        {infoMsg ? <div style={styles.info}>{infoMsg}</div> : null}
        {errorMsg ? (
          <div style={styles.error}>
            <div style={{ marginBottom: 6 }}>{errorMsg}</div>
            {networkHint ? <div style={styles.hint}>{networkHint}</div> : null}
          </div>
        ) : null}

        {/* 列表 */}
        <div style={{ marginTop: 10 }}>
          {(!tasks || tasks.length === 0) ? (
            <div style={styles.empty}>暂无任务，先在上方添加一个吧～</div>
          ) : (
            <ul style={styles.list}>
              {tasks.map((t) => (
                <li key={t.id} style={styles.item}>
                  <div style={{ flex: 1, fontWeight: 500 }}>{t.task}</div>

                  {/* 数字输入 */}
                  <div style={styles.progressBox}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={t.progress ?? 0}
                      onChange={(e) => updateProgress(t.id, e.target.value)}
                      style={styles.progressInput}
                    />
                    <span style={{ marginLeft: 4 }}>%</span>
                  </div>

                  {/* 或者用 range（滑条），想同时保留就都给你 */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={t.progress ?? 0}
                    onChange={(e) => updateProgress(t.id, e.target.value)}
                    style={styles.range}
                  />

                  <button onClick={() => deleteTask(t.id)} style={styles.dangerBtn}>删除</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f6f7fb',
    padding: '40px 16px',
  },
  card: {
    maxWidth: 720,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
  },
  row: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 220,
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
  },
  primaryBtn: {
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#0070f3',
    color: '#fff',
    cursor: 'pointer',
  },
  ghostBtn: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
  },
  dangerBtn: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #ef4444',
    color: '#ef4444',
    background: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '8px 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  item: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    padding: '12px 12px',
    border: '1px solid #eee',
    borderRadius: 10,
  },
  progressBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  progressInput: {
    width: 70,
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
  },
  range: {
    flex: 1,
  },
  empty: {
    padding: '16px 12px',
    border: '1px dashed #e5e7eb',
