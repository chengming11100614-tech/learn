import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login') // 没登录，跳转到登录页
      } else {
        setUser(data.user)
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>加载中...</p>

  return (
    <div style={styles.container}>
      <h1>🎓 学习网站主页</h1>
      <p>欢迎回来，{user.email}</p>
      <div style={styles.buttonContainer}>
        <Link href="/pomodoro" style={styles.button}>⏱ 番茄钟</Link>
        <Link href="/progress" style={styles.button}>📊 学习进度</Link>
        <Link href="/badges" style={styles.button}>🏅 我的徽章</Link>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={styles.button}>🚪 退出登录</button>
      </div>
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
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '30px'
  },
  button: {
    padding: '12px 20px',
    backgroundColor: '#0070f3',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
    cursor: 'pointer'
  }
}

