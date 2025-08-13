import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function PomodoroPage() {
  const [studyMinutes, setStudyMinutes] = useState(25) // 学习时间（分钟）
  const [breakMinutes, setBreakMinutes] = useState(5) // 休息时间（分钟）
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false) // 是否在休息模式
  const timerRef = useRef(null)

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
            return prev // 防止闪跳
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }

    return () => clearInterval(timerRef.current)
  }, [isRunning, isBreak, studyMinutes, breakMinutes])

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

  // 修改学习/休息时间
  const handleTimeChange = (setter, value) => {
    const num = Math.max(1, Number(value)) // 至少 1 分钟
    setter(num)
    if (!isBreak) {
      setTimeLeft(num * 60)
    }
  }

  return (
    <div style={styles.container}>
      <h1>⏱ 番茄钟</h1>
      <p style={styles.mode}>{isBreak ? '休息时间 🍵' : '学习时间 📚'}</p>

      <p style={styles.timer}>{formatTime(timeLeft)}</p>

      {/* 时间设置 */}
      <div style={styles.settings}>
        <label>
          学习时间（分钟）：
          <input
            type="number"
            value={studyMinutes}
            onChange={(e) => handleTimeChange(setStudyMinutes, e.target.value)}
            style={styles.input}
            disabled={isRunning}
          />
        </label>
        <label>
          休息时间（分钟）：
          <input
            type="number"
            value={breakMinutes}
            onChange={(e) => handleTimeChange(setBreakMinutes, e.target.value)}
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
        <button onClick={handleReset} style={styles.resetButton}>
          重置
        </button>
      </div>

      <Link href="/home" style={styles.backButton}>
        返回主页
      </Link>
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
