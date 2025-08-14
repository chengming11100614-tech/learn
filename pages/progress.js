import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function ProgressPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [estimatedTomatoes, setEstimatedTomatoes] = useState(1)
  const [adding, setAdding] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  // 检查登录
  useEffect(() => {
    let sub
    const init = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        setErrorMsg(`获取登录状态失败：${error.message}`)
        setLoading(false)
        return
      }
      const u = data?.session?.user
      if (!u) {
        router.replace('/login')
        return
      }
      setUser(u)
      setLoading(false)

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null)
        if (!session?.user) router.replace('/login')
      })
      sub = listener
    }

    init()
    return () => {
      sub?.subscription?.unsubscribe?.()
    }
  }, [router])

  // 获取任务
  const fetchTasks = async () => {
    if (!user) return
    setErrorMsg('')
    setInfoMsg('')
    try {
      const { data, error } = await supabase
        .from('progress')
        .select('id, task, progress, estimated_tomatoes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      setTasks(data || [])
    } catch (e) {
      setErrorMsg(`获取任务失败：${e.message}`)
    }
  }

  useEffect(() => {
    if (user) fetchTasks()
  }, [user])

  // 添加任务
  const addTask = async () => {
    if (!newTask.trim() || !user) return
    setAdding(true)
    setErrorMsg('')
    setInfoMsg('')
    try {
      const { error } = await supabase
        .from('progress')
        .insert([{
          task: newTask.trim(),
          user_id: user.id,
          progress: 0,
          estimated_tomatoes: Math.max(1, estimatedTomatoes)
        }])
      if (error) throw error
      setNewTask('')
      setEstimatedTomatoes(1)
      setInfoMsg('添加成功')
      fetchTasks()
    } catch (e) {
      setErrorMsg(`添加任务失败：${e.message}`)
    } finally {
      setAdding(false)
    }
  }

  // 更新已完成番茄数
  const updateProgress = async (id, value) => {
    const tomatoes = Math.max(0, Number(value) || 0)
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const finalValue = Math.min(tomatoes, task.estimated_tomatoes)

    setTasks(prev => prev.map(t => t.id === id ? { ...t, progress: finalValue } : t))

    try {
      const { error } = await supabase
        .from('progress')
        .update({ progress: finalValue })
        .eq('id', id)
      if (error) throw error
      setInfoMsg('进度已保存')
    } catch (e) {
      setErrorMsg(`更新进度失败：${e.message}`)
      fetchTasks()
    }
  }

  // 删除任务
  const deleteTask = async (id) => {
    if (!window.confirm('确认删除这个任务吗？')) return
    try {
      const { error } = await supabase.from('progress').delete().eq('id', id)
      if (error) throw error
      setInfoMsg('已删除')
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      setErrorMsg(`删除失败：${e.message}`)
      fetchTasks()
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>正在检查登录状态…</div>
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>📊 学习进度（番茄数）</h1>

        <div style={styles.row}>
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="输入任务名称"
            style={styles.input}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
          />
          <input
            type="number"
            value={estimatedTomatoes}
            onChange={(e) => setEstimatedTomatoes(Number(e.target.value))}
            min={1}
            style={{ ...styles.input, width: 100 }}
            placeholder="番茄数"
          />
          <button onClick={addTask} disabled={adding || !newTask.trim()} style={styles.primaryBtn}>
            {adding ? '添加中…' : '添加任务'}
          </button>
          <button onClick={fetchTasks} style={styles.ghostBtn}>刷新</button>
        </div>

        {infoMsg && <div style={styles.info}>{infoMsg}</div>}
        {errorMsg && <div style={styles.error}>{errorMsg}</div>}

        <div style={{ marginTop: 10 }}>
          {tasks.length === 0 ? (
            <div style={styles.empty}>暂无任务，先在上方添加一个吧～</div>
          ) : (
            <ul style={styles.list}>
              {tasks.map(t => (
                <li key={t.id} style={styles.item}>
                  <div style={{ flex: 1, fontWeight: 500 }}>
                    {t.task} ({t.progress}/{t.estimated_tomatoes} 番茄)
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={t.estimated_tomatoes}
                    value={t.progress}
                    onChange={(e) => updateProgress(t.id, e.target.value)}
                    style={styles.progressInput}
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
    minWidth: 120,
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
  progressInput: {
    width: 70,
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
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
