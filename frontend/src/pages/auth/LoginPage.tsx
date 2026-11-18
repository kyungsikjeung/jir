import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api.client';
import Field from '../../components/Field';

export default function LoginPage() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) return; // 네이티브 검증이 첫 번째 오류 필드로 포커스
    setSubmitting(true);
    try {
      const email = (form.elements.namedItem('email') as HTMLInputElement).value;
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;
      const res = await apiClient.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('email', res.data.user?.email || email);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-center">Login</h1>
      <p className="text-sm text-gray-500 mb-6 text-center">
        회사 이메일로 로그인하세요.
      </p>

      {/* 서버 오류는 role="status"가 공지 (forms 가이드) */}
      <div role="status" aria-live="polite" className="min-h-0">
        {error && (
          <p className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <span role="img" aria-label="Error">❌</span> {error}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-1">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          required
          ref={emailRef}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          enterKeyHint="done"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full mt-4"
        >
          {submitting ? '로그인 중…' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        Don't have an account?{' '}
        <a href="/register" className="text-blue-600 hover:underline">
          Register
        </a>
      </p>
    </div>
  );
}
