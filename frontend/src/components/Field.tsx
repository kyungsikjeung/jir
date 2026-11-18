import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  /** 규칙 목록을 입력 위에 표시 (비밀번호 복잡도 등) */
  rules?: string[];
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  options: Array<{ value: string; label: string }>;
}

interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor}>
      {children}
      {required && (
        <span aria-hidden="true" style={{ color: 'hsl(var(--danger))' }}>
          {' *'}
        </span>
      )}
    </label>
  );
}

function ErrorMsg({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <div id={id} className="error-msg">
      <span role="img" aria-label="Error">
        ❌
      </span>{' '}
      {error}
    </div>
  );
}

/**
 * 폼 필드 (forms + validate-input-after-interaction 가이드)
 * - label for/id 연결, 힌트/규칙은 입력 위에 (모바일 키보드가 가리지 않게)
 * - 오류 메시지는 data-error → aria-describedby로 연결
 * - 시각 상태는 :user-invalid CSS가 담당 (상호작용 후에만 오류 표시)
 */
const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, rules, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null, rest['aria-describedby']]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      {hint && (
        <span id={hintId} className="hint">
          {hint}
        </span>
      )}
      {rules && (
        <ul id={hintId} className="rules-list">
          {rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        data-error={error ? errorId : undefined}
        required={required}
        {...rest}
      />
      <ErrorMsg id={errorId} error={error} />
    </div>
  );
});

export default Field;

export function SelectField({
  label,
  hint,
  error,
  options,
  id,
  required,
  ...rest
}: SelectFieldProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null, rest['aria-describedby']]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      {hint && (
        <span id={hintId} className="hint">
          {hint}
        </span>
      )}
      <select
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        data-error={error ? errorId : undefined}
        required={required}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ErrorMsg id={errorId} error={error} />
    </div>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  id,
  required,
  ...rest
}: TextareaFieldProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null, rest['aria-describedby']]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      {hint && (
        <span id={hintId} className="hint">
          {hint}
        </span>
      )}
      <textarea
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        data-error={error ? errorId : undefined}
        required={required}
        {...rest}
      />
      <ErrorMsg id={errorId} error={error} />
    </div>
  );
}
