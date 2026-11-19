import Field, { SelectField, TextareaField } from './Field';

export interface DynamicFieldDef {
  key: string;
  label: string;
  labelKo?: string | null;
  labelEn?: string | null;
  fieldType: string;
  isRequired?: boolean;
  requiredForApproval?: boolean;
  validation?: Record<string, any>;
}

export interface UserOption {
  value: string;
  label: string;
}

function fieldLabel(f: DynamicFieldDef) {
  return f.labelKo || f.labelEn || f.label;
}

function optionList(f: DynamicFieldDef): string[] {
  const opts = Array.isArray(f.validation?.options) ? f.validation.options : [];
  return opts
    .map((o: any) => (typeof o === 'string' ? o : o?.value ?? null))
    .filter((v): v is string => typeof v === 'string');
}

/** 필수 필드 없는 목록을 받아 누락한 필수 필드 → 오류 맵 (검증 페이지/모달 공용) */
export function missingRequired(
  fields: DynamicFieldDef[],
  values: Record<string, any>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (!f.isRequired) continue;
    const v = values[f.key];
    const missing =
      v === undefined ||
      v === null ||
      (typeof v === 'string' && v.trim() === '') ||
      (Array.isArray(v) && v.length === 0);
    if (missing) errors[f.key] = `${fieldLabel(f)}은(는) 필수입니다.`;
  }
  return errors;
}

interface DynamicFormProps {
  fields: DynamicFieldDef[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  /** 'user' 타입의 값 목록 (스페이스 멤버 기준) */
  userOptions?: UserOption[];
  errors?: Record<string, string>;
  disabled?: boolean;
}

const reqStar = (
  <span aria-hidden="true" style={{ color: 'var(--danger, #dc2626)' }}>
    {' *'}
  </span>
);

const Err = ({ error }: { error?: string }) =>
  error ? (
    <div className="error-msg">
      <span role="img" aria-label="Error">
        ❌
      </span>{' '}
      {error}
    </div>
  ) : null;

/**
 * 동적 필드 폼 렌더러 (M2: 스페이스 조원기/프로젝트에서 FieldDefinition 목록을 받아 폼을 그림)
 * 타입: text, textarea, number, decimal, boolean, date, select, multiselect, user, url
 * - native validation: 필수 필드에 required 속성 → :user-invalid 활성화
 * - requiredForApproval 필드에는 승인 시 필수 안내 표시
 */
export default function DynamicForm({
  fields,
  values,
  onChange,
  userOptions = [],
  errors = {},
  disabled = false,
}: DynamicFormProps) {
  const set = (key: string, value: any) => onChange({ ...values, [key]: value });
  if (!fields?.length) return null;

  return (
    <div className="flex flex-col gap-4">
      {fields.map((f) => {
        const id = `df-${f.key}`;
        const label = fieldLabel(f);
        const hint = f.requiredForApproval ? '승인 시 필수' : undefined;
        const error = errors[f.key];
        const req = !!f.isRequired;
        const options = optionList(f).map((o) => ({ value: o, label: o }));

        switch (f.fieldType) {
          case 'text':
          case 'url':
            return (
              <Field
                key={f.key}
                id={id}
                label={label}
                required={req}
                error={error}
                hint={hint}
                type={f.fieldType === 'url' ? 'url' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e: any) => set(f.key, e.target.value)}
                disabled={disabled}
              />
            );

          case 'textarea':
            return (
              <TextareaField
                key={f.key}
                id={id}
                label={label}
                required={req}
                error={error}
                hint={hint}
                value={values[f.key] ?? ''}
                onChange={(e: any) => set(f.key, e.target.value)}
                disabled={disabled}
              />
            );

          case 'number':
          case 'decimal':
            return (
              <Field
                key={f.key}
                id={id}
                label={label}
                required={req}
                error={error}
                hint={hint}
                type="number"
                value={values[f.key] ?? ''}
                onChange={(e: any) => set(f.key, e.target.value)}
                disabled={disabled}
              />
            );

          case 'date':
            return (
              <Field
                key={f.key}
                id={id}
                label={label}
                required={req}
                error={error}
                hint={hint}
                type="date"
                value={values[f.key] ?? ''}
                onChange={(e: any) => set(f.key, e.target.value)}
                disabled={disabled}
              />
            );

          case 'boolean':
            return (
              <div key={f.key} className="field">
                <label htmlFor={id}>
                  {label}
                  {reqStar}
                </label>
                <input
                  id={id}
                  type="checkbox"
                  checked={!!values[f.key]}
                  onChange={(e: any) => set(f.key, e.target.checked)}
                  disabled={disabled}
                  required={req}
                />
                {hint && <span className="hint">{hint}</span>}
                <Err error={error} />
              </div>
            );

          case 'select':
            return (
              <SelectField
                key={f.key}
                id={id}
                label={label}
                required={req}
                error={error}
                hint={hint}
                options={options}
                value={values[f.key] ?? ''}
                onChange={(e: any) => set(f.key, e.target.value)}
                disabled={disabled}
              />
            );

          case 'multiselect':
            return (
              <div key={f.key} className="field" role="group" aria-labelledby={id}>
                <label id={id}>
                  {label}
                  {reqStar}
                </label>
                {hint && <span className="hint">{hint}</span>}
                <div className="flex flex-col gap-1 mt-1">
                  {options.map((o) => (
                    <label
                      key={o.value}
                      className="flex items-center gap-2 text-sm"
                      htmlFor={`${id}-${o.value}`}
                    >
                      <input
                        id={`${id}-${o.value}`}
                        type="checkbox"
                        checked={(values[f.key] ?? []).includes(o.value)}
                        onChange={(e: any) =>
                          set(
                            f.key,
                            e.target.checked
                              ? [...(values[f.key] ?? []), o.value]
                              : (values[f.key] ?? []).filter((v: string) => v !== o.value),
                          )
                        }
                        disabled={disabled}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
                <Err error={error} />
              </div>
            );

          case 'user':
            return (
              <SelectField
                key={f.key}
                id={id}
                label={label}
                required={req}
                error={error}
                hint={hint}
                options={[
                  { value: '', label: '(선택)' },
                  ...userOptions.map((o) => ({ value: o.value, label: o.label })),
                ]}
                value={values[f.key] ?? ''}
                onChange={(e: any) => set(f.key, e.target.value)}
                disabled={disabled}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
