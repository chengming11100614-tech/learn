import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function PomodoroPage() {
  const TOMATO_MINUTES = 25 // 一个番茄固定 25 分钟
  const [studyTomatoes, setStudyTomatoes] = useState(1) // 学习番茄个数
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [timeLeft, setTimeLeft] = useState(TOMATO_MINUTES * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [activeTask, setActiveTask] = useState(null)

  const timerRef = useRef(null)

  // 获取当前激活任务
  const fetchActiveTask = async () => {
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('is_active', true)
      .limit(1)
    if (!error && data && data.length > 0) {
      setActiveTask(data[0])
    } else {
      setActiveTask(null)
    }
  }

  useEffect(() => {
    fetchActiveTask()
  }, [])

  // 格式化时间 mm:ss
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
              // 完成一个番茄
              if (activeTask) {
                updateTaskProgress()
              }
              alert('一个番茄完成！休息一下吧 🍵')
              setIsBreak(true)
              setTimeLeft(breakMinutes * 60)
              setIsRunning(true)
            } else {
              alert('休息结束！开始下一个番茄吧 📚')
              setIsBreak(false)
              setTimeLeft(TOMATO_MINUTES * 60)
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

  // 更新任务进度
  const updateTaskProgress = async () => {
    if (!activeTask) return
    const estimatedTomatoes = activeTask.estimated_tomatoes || 1
    const increment = Math.round((1 / estimatedTomatoes) * 100)
    const newProgress = Math.min(100, activeTask.progress + increment)
    await supabase.from('progress').update({ progress: newProgress }).eq('id', activeTask.id)
    fetchActiveTask()
  }

  // 开始 / 暂停
  const handleStartPause = () => {
    setIsRunning((prev) => !prev)
  }

  // 重置
  const handleReset = () => {
    clearInterval(timerRef.current)
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(TOMATO_MINUTES * 60)
  }

  // 修改学习番茄个数
  const handleTomatoChange = (value) => {
    const num = Math.max(1, Number(value)) // 至少 1 个番茄
    setStudyTomatoes(num)
    setTimeLeft(TOMATO_MINUTES * 60) // 每个番茄固定 25 分钟
  }

  return (
    <div style={styles.container}>
      <h1>🍅 番茄钟</h1>
      {activeTask && (
        <p>当前任务：{activeTask.task}（进度 {activeTask.progress}%）</p>
      )}
      <p style={styles.mode}>{isBreak ? '休息时间 🍵' : '学习时间 📚'}</p>
      <p style={styles.timer}>{formatTime(timeLeft)}</p>

      {/* 设置学习番茄个数和休息时间 */}
      <div style={styles.settings}>
        <label>
          学习番茄个数：
          <input
            type="number"
            value={studyTomatoes}
            onChange={(e) => handleTomatoChange(e.target.value)}
            style={styles.input}
            disabled={isRunning}
          />
        </label>
        <label>
          休息时间（分钟）：
          <input
            type="number"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Math.max(1, Number(e.target.value)))}
            style={styles.input}
            disabled={isRunning}
          />
        </label>
      </div>

      {/* 控制按钮 */}
      <div style={styles.buttonContainer}>
        <button onClick={handleStartPause} style={styles.button}>
          {isRunning ? '暂停' : '开始'}
        </button>
        <button onClick={handleReset} style={styles.resetButton}>重置</button>
      </div>

      <Link href="/" style={styles.backButton}>返回主页</Link>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '40px',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif'
  },
  mode: {
    fontSize: '20px',
    margin: '10px 0',
    color: '#666'
  },
  timer: {
    fontSize: '56px',
    fontWeight: 'bold',
    margin: '20px 0'
  },
  settings: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '20px',
    marginBottom: '20px'
  },
  input: {
    width: '60px',
    marginLeft: '10px',
    padding: '5px',
    fontSize: '16px',
    textAlign: 'center'
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '20px'
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  resetButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#888',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  backButton: {
    display: 'inline-block',
    marginTop: '30px',
    padding: '10px 20px',
    backgroundColor: '#ff4d4d',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none'
  }
}
