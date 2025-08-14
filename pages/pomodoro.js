import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function PomodoroPage() {
  const [tomatoMinutes, setTomatoMinutes] = useState(25) // 单个番茄钟分钟数
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)

  const [tasks, setTasks] = useState([])
  const [activeTask, setActiveTask] = useState(null)
  const [user, setUser] = useState(null)

  const timerRef = useRef(null)

  // 获取登录用户
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const u = data?.session?.user
      if (u) {
        setUser(u)
        fetchTasks(u.id)
      }
    }
    init()
  }, [])

  // 获取任务列表
  const fetchTasks = async (uid) => {
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })
    if (!error) {
      setTasks(data)
      const current = data.find(t => t.is_active)
      setActiveTask(current || null)
    }
  }

  // 切换当前任务
  const setCurrentTask = async (taskId) => {
    if (!user) return
    await supabase.from('progress').update({ is_active: false }).eq('user_id', user.id)
    await supabase.from('progress').update({ is_active: true }).eq('id', taskId)
    fetchTasks(user.id)
  }

  // 退出当前任务
  const exitCurrentTask = async () => {
    if (!activeTask || !user) return
    await supabase.from('progress').update({ is_active: false }).eq('id', activeTask.id)
    setActiveTask(null)
    fetchTasks(user.id)
  }

  // 格式化时间
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // 倒计时逻辑
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            setIsRunning(false)
            if (!isBreak) {
              if (activeTask) {
                updateTaskProgress()
              }
              alert('学习时间到！休息一下吧 🍵')
              setIsBreak(true)
              setTimeLeft(breakMinutes * 60)
              setIsRunning(true)
            } else {
              alert('休息结束！开始学习吧 📚')
              setIsBreak(false)
              setTimeLeft(tomatoMinutes * 60)
              setIsRunning(true)
            }
            return prev
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning, isBreak, activeTask])

  // 完成一个番茄后更新任务进度
  const updateTaskProgress = async () => {
    if (!activeTask) return
    const newProgress = Math.min(activeTask.progress + 1, activeTask.estimated_tomatoes)
    await supabase.from('progress').update({ progress: newProgress }).eq('id', activeTask.id)
    fetchTasks(user.id)
  }

  // 控制按钮
  const handleStartPause = () => setIsRunning((prev) => !prev)
  const handleReset = () => {
    clearInterval(timerRef.current)
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(tomatoMinutes * 60)
  }

  return (
    <div style={styles.container}>
      <h1>⏱ 番茄钟</h1>
      {activeTask ? (
        <p>当前任务：{activeTask.task} ({activeTask.progress}/{activeTask.estimated_tomatoes} 番茄)</p>
      ) : (
        <p>未选择任务</p>
      )}

      <p style={styles.mode}>{isBreak ? '休息时间 🍵' : '学习时间 📚'}</p>
      <p style={styles.timer}>{formatTime(timeLeft)}</p>

      {/* 控制按钮 */}
      <div style={styles.buttonContainer}>
        <button onClick={handleStartPause} style={styles.button}>
          {isRunning ? '暂停' : '开始'}
        </button>
        <button onClick={handleReset} style={styles.resetButton}>
          重置
        </button>
      </div>

      {/* 当前任务操作 */}
      {activeTask && (
        <button onClick={exitCurrentTask} style={styles.exitButton}>退出当前任务</button>
      )}

      {/* 任务列表选择 */}
      <h3>选择任务</h3>
      <ul style={styles.taskList}>
        {tasks.map(t => (
          <li key={t.id} style={{
            ...styles.taskItem,
            background: t.is_active ? '#d1fae5' : '#fff'
          }}>
            {t.task} ({t.progress}/{t.estimated_tomatoes})
            {!t.is_active && (
              <button onClick={() => setCurrentTask(t.id)} style={styles.setButton}>设为当前</button>
            )}
          </li>
        ))}
      </ul>

      <Link href="/" style={styles.backButton}>返回主页</Link>
    </div>
  )
}

const styles = {
  container: { maxWidth: '500px', margin: '0 auto', padding: '40px', textAlign: 'center' },
  mode: { fontSize: '20px', margin: '10px 0', color: '#666' },
  timer: { fontSize: '56px', fontWeight: 'bold', margin: '20px 0' },
  buttonContainer: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' },
  button: { padding: '10px 20px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  resetButton: { padding: '10px 20px', backgroundColor: '#888', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  exitButton: { marginTop: '10px', padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  taskList: { listStyle: 'none', padding: 0, marginTop: '10px' },
  taskItem: { display: 'flex', justifyContent: 'space-between', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '6px' },
  setButton: { padding: '4px 8px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  backButton: { display: 'inline-block', marginTop: '30px', padding: '10px 20px', backgroundColor: '#ff4d4d', color: '#fff', borderRadius: '6px', textDecoration: 'none' }
}

