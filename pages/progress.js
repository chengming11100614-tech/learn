import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProgressPage() {
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [user, setUser] = useState(null);

  // 获取当前登录用户
  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user);
        console.log('当前登录用户:', data.session.user);
      }
    });

    // 监听登录状态变化
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 获取任务
  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user]);

  async function fetchTasks() {
    console.log('正在获取任务...');
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('获取任务失败:', error);
    } else {
      setTasks(data);
    }
  }

  // 添加任务
  async function addTask() {
    if (!taskInput.trim() || !user) return;
    console.log('准备插入任务:', taskInput, '用户ID:', user.id);

    const { data, error } = await supabase
      .from('progress')
      .insert([{ task: taskInput, user_id: user.id, progress: 0 }]);

    if (error) {
      console.error('插入任务失败:', error);
    } else {
      setTaskInput('');
      fetchTasks(); // 重新获取任务
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>学习进度</h1>

      {/* 添加任务输入框 */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="输入任务名称"
        />
        <button onClick={addTask}>添加任务</button>
      </div>

      {/* 任务列表 */}
      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            {t.task} - 进度 {t.progress}%
          </li>
        ))}
      </ul>
    </div>
  );
}

