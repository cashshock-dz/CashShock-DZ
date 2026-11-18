import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Dashboard from './Dashboard';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setBusy(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;

        setMessage('تم إنشاء الحساب. تحققي من بريدك الإلكتروني لتأكيد التسجيل، ثم ادخلي إلى حسابك.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  if (loading) {
    return <div style={{padding: 40, textAlign: 'center'}}>جاري التحميل...</div>;
  }

  if (session) {
    return (
      <>
        <div style={{padding: 12, textAlign: 'left'}}>
          <button onClick={logout}>تسجيل الخروج</button>
        </div>
        <Dashboard />
      </>
    );
  }

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      background: 'linear-gradient(135deg, #f0fdfa, #f8fafc, #eff6ff)'
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: 420,
        background: 'white',
        padding: 28,
        borderRadius: 16,
        boxShadow: '0 12px 35px #102b4618', border: '1px solid #e2e8f0'
      }}>
        <h1 style={{textAlign: 'center', fontSize: 32, fontWeight: 800, background: 'linear-gradient(90deg, #102b46, #168b70, #00d6a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>CashShock DZ</h1>
        <p style={{textAlign: 'center', color: '#64748b'}}>
          محاكي التدفقات النقدية تحت الصدمات الاقتصادية
        </p>

        <h2 style={{color: '#102b46'}}>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</h2>

        <label style={{display: 'block', color: '#102b46', fontWeight: 600}}>البريد الإلكتروني</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="example@email.com"
          style={{width: '100%', padding: 12, margin: '8px 0 18px', boxSizing: 'border-box', color: '#071936', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 9, fontSize: 15, outlineColor: '#00d6a0'}}
        />

        <label style={{display: 'block', color: '#102b46', fontWeight: 600}}>كلمة المرور (8 أحرف على الأقل)</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          style={{width: '100%', padding: 12, margin: '8px 0 18px', boxSizing: 'border-box', color: '#071936', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 9, fontSize: 15, outlineColor: '#00d6a0'}}
        />

        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%',
            padding: 13,
            background: 'linear-gradient(90deg, #102b46, #168b70, #00d6a0)',
            color: 'white',
            border: 0,
            borderRadius: 8,
            fontSize: 16
          }}
        >
          {busy ? 'يرجى الانتظار...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
        </button>

        {message && (
          <p style={{padding: 12, background: '#f0fdfa', color: '#102b46', borderRadius: 8, border: '1px solid #86efac'}}>
            {message}
          </p>
        )}

        <p style={{textAlign: 'center', marginTop: 20, color: '#102b46'}}>
          {mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setMessage('');
            }}
            style={{
              border: 0,
              background: 'none',
              color: '#168b70',
              fontWeight: 'bold',
              marginRight: 6
            }}
          >
            {mode === 'login' ? 'إنشاء حساب' : 'تسجيل الدخول'}
          </button>
        </p>
      </form>
    </div>
  );
}

export default App;
