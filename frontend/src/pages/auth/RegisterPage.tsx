import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api.client';
import Field from '../../components/Field';

export default function RegisterPage() {
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) return;
    setSubmitting(true);
    try {
      const fd = new FormData(form);
      await apiClient.post('/api/auth/register', {
        displayName: fd.get('displayName'),
        email: fd.get('email'),
        password: fd.get('password'),
      });
      setSuccess('가입이 완료되었습니다. 이메일 인증 후 관리자 승인이 필요합니다.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-center">Register</h1>
      <p className="text-sm text-gray-500 mb-6 text-center">
        내부 계정은 회사 이메일, 외부 계정은 인증 + 승인이 필요합니다.
      </p>

      <div role="status" aria-live="polite">
        {error && (
          <p className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <span role="img" aria-label="Error">❌</span> {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
            {success}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-1">
        <Field
          label="Display Name"
          name="displayName"
          type="text"
          autoComplete="name"
          enterKeyHint="next"
          required
          ref={nameRef}
        />
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
        />
        <Field
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={8}
          enterKeyHint="done"
          required
          rules={[
            '8자 이상',
            '대문자 1자 이상',
            '소문자 1자 이상',
            '숫자 1자 이상',
            '특수문자 1자 이상',
          ]}
        />
        <div className="field">
          <button
            type="button"
            aria-pressed={showPassword}
            aria-label="Show password"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
          </button>
        </div>
        <button type="submit" disabled={submitting} className="btn btn-primary w-full mt-4">
          {submitting ? '가입 중…' : 'Register'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        Already have an account?{' '}
        <a href="/login" className="text-blue-600 hover:underline">
          Login
        </a>
      </p>
    </div>
  );
}
