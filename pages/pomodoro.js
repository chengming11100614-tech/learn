import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function PomodoroPage() {
  const [studyMinutes, setStudyMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [activeTask, setActiveTask] = useState(null)

  const timerRef = useRef(null)

  // 获取正在进行的任务
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

  // 格式化 mm:ss
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
              // 学习时间结束，推进任务进度
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
              setTimeLeft(studyMinutes * 60)
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
  }, [isRunning, isBreak, activeTask, studyMinutes, breakMinutes])

  // 推进任务进度
  const updateTaskProgress = async () => {
    if (!activeTask) return
    const increment = Math.round((studyMinutes / activeTask.estimated_minutes) * 100)
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
    setTimeLeft(studyMinutes * 60)
  }

  return (
    <div style={styles.container}>
      <h1>⏱ 番茄钟</h1>
      {activeTask && (
        <p>当前任务：{activeTask.task}（进度 {activeTask.progress}%）</p>
      )}
      <p style={styles.mode}>{isBreak ? '休息时间 🍵' : '学习时间 📚'}</p>
      <p style={styles.timer}>{formatTime(timeLeft)}</p>

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
