const BASE = '/api';

export async function fetchQuestions() {
  const res = await fetch(`${BASE}/config/questions`);
  if (!res.ok) throw new Error('Failed to fetch questions');
  return res.json();
}

export async function submitEntry(formData) {
  const res = await fetch(`${BASE}/entries`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '提交失败' }));
    throw new Error(err.error || '提交失败');
  }
  return res.json();
}
