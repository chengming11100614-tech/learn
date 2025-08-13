import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [status, setStatus] = useState('检测中...');

  useEffect(() => {
    async function testConnection() {
      try {
        // 1. 测试基础 API 是否可访问
        const ping = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
        });

        if (!ping.ok) {
          setStatus(`❌ API 基础连接失败 (${ping.status}) - 可能是网络/VPN 问题`);
          return;
        }

        // 2. 尝试从 progress 表读取（无需登录）
        const { data, error } = await supabase
          .from('progress')
          .select('*')
          .limit(1);

        if (error) {
          setStatus(`⚠️ 数据库可连接，但有权限/策略问题: ${error.message}`);
          return;
        }

        setStatus(`✅ 连接正常！已获取数据: ${JSON.stringify(data)}`);
      } catch (err) {
        setStatus(`❌ 请求异常: ${err.message}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Supabase 调试工具</h1>
      <p>状态：{status}</p>
    </div>
  );
}
