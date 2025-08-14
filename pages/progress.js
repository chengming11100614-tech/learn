import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

export default function ProgressPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(25)
  const [adding, setAdding] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  useEffect(() => {
    let sub
    const init = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error || !data?.session?.user) {
        router.replace('/login')
        return
      }
      setUser(data.session.user)

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null)
        if (!session?.user) router.replace('/login')
      })
      sub = listener
      setLoading(false)
    }
    init()
    return () => sub?.subscription?.unsubscribe?.()
  }, [router])

  const fetchTasks = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (!error) setTasks(data || [])
  }

  useEffect(() => {
    if (user) fetchTasks()
  }, [user])

  const addTask = async () => {
    if (!newTask.trim()) return
    setAdding(true)
    const { error } = await supabase.from('progress').insert([{
      task: newTask.trim(),
      user_id: user.id,
      progress: 0,
      estimated_minutes: estimatedMinutes,
      is_active: false
    }])
    if (!error) {
      setNewTask('')
      setEstimatedMinutes(25)
      fetchTasks()
    }
    setAdding(false)
  }

  const deleteTask = async (id) => {
    if (!confirm('确认删除这个任务吗？')) return
    await supabase.from('progress').delete().eq('id', id)
    fetchTasks()
  }

  const setActiveTask = async (id) => {
    // 把所有任务设为非 active，再设当前任务为 active
    await supabase.from('progress').update({ is_active: false }).eq('user_id', user.id)
    await supabase.from('progress').update({ is_active: true }).eq('id', id)
    fetchTasks()
  }

  if (loading) return <p>正在加载…</p>

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>📊 学习进度</h1>
        <div style={styles.row}>
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="输入任务名称"
            style={styles.input}
          />
          <input
            type="number"
            min="1"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            style={{ ...styles.input, width: 80 }}
            placeholder="分钟"
          />
          <button onClick={addTask} disabled={adding} style={styles.primaryBtn}>
            添加任务
          </button>
          <button onClick={fetchTasks} style={styles.ghostBtn}>刷新</button>
        </div>
        <ul style={styles.list}>
          {tasks.map((t) => (
            <li key={t.id} style={styles.item}>
              <div style={{ flex: 1 }}>
                <strong>{t.task}</strong>
                <div>进度: {t.progress}% | 预计: {t.estimated_minutes} 分钟</div>
                {t.is_active && <div style={{ color: 'green' }}>当前进行中</div>}
              </div>
              <button onClick={() => setActiveTask(t.id)} style={styles.primaryBtn}>设为当前</button>
              <button onClick={() => deleteTask(t.id)} style={styles.dangerBtn}>删除</button>
            </li>
          ))}
        </ul>
        <Link href="/" style={styles.homeBtn}>返回主页</Link>
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
  homeBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    background: '#f3f4f6',
    color: '#111827',
    textDecoration: 'none',
    border: '1px solid #e5e7eb',
    fontSize: 14,
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
    borderRadius: 10,
    color: '#6b7280',
    background: '#fafafa',
    textAlign: 'center',
  },
  info: {
    padding: '8px 12px',
    background: '#ecfdf5',
    color: '#065f46',
    border: '1px solid #a7f3d0',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  error: {
    padding: '10px 12px',
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 14,
  },
}
