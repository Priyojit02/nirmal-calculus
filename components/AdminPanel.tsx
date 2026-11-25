'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AIProblemGenerator from '@/components/AIProblemGenerator';

interface AdminUserRow {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'super_admin';
  provider: string;
  solvedCount: number;
}

interface AdminProblemRow {
  _id: string;
  slug: string;
  title: string;
  topic: string;
  difficulty: string;
  type: string;
}

interface AdminTestRow {
  _id: string;
  slug: string;
  title: string;
  difficulty: string;
  duration: number;
  questionCount: number;
}

interface AdminPanelProps {
  currentAdminId: string;
  users: AdminUserRow[];
  problems: AdminProblemRow[];
  tests: AdminTestRow[];
}

export default function AdminPanel({
  currentAdminId,
  users,
  problems,
  tests,
}: AdminPanelProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleRoleToggle = async (
    userId: string,
    currentRole: 'user' | 'super_admin'
  ) => {
    setBusyId(userId);
    setMessage('');
    const nextRole = currentRole === 'super_admin' ? 'user' : 'super_admin';
    const res = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: nextRole }),
    });
    setBusyId(null);
    if (res.ok) {
      setMessage(`Updated user role to ${nextRole}.`);
      router.refresh();
    }
  };

  const handleDelete = async (
    kind: 'user' | 'problem' | 'test',
    id: string,
    label: string
  ) => {
    if (!window.confirm(`Delete ${kind} "${label}" from MongoDB?`)) return;
    setBusyId(id);
    setMessage('');
    const res = await fetch(
      `/api/admin?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    setBusyId(null);
    if (res.ok) {
      setMessage(`Deleted ${kind}: ${label}`);
      router.refresh();
    }
  };

  return (
    <>
      {message && (
        <div className="callout ok-box" style={{ marginBottom: 16 }}>
          <strong>{message}</strong>
        </div>
      )}

      <AIProblemGenerator mode="problems" />

      <div className="card">
        <h3>Users &amp; Roles ({users.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Provider</th>
              <th>Role</th>
              <th>Solved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className="tag subtle">{u.provider}</span>
                </td>
                <td>
                  <span
                    className={
                      u.role === 'super_admin' ? 'tag purple' : 'tag'
                    }
                  >
                    {u.role}
                  </span>
                </td>
                <td>{u.solvedCount}</td>
                <td>
                  <div className="row" style={{ marginTop: 0 }}>
                    {u._id !== currentAdminId && (
                      <>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={busyId === u._id}
                          onClick={() => handleRoleToggle(u._id, u.role)}
                        >
                          {u.role === 'super_admin'
                            ? 'Demote'
                            : 'Make Super Admin'}
                        </button>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={busyId === u._id}
                          onClick={() => handleDelete('user', u._id, u.email)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {u._id === currentAdminId && (
                      <span className="mu">You (Active)</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>AI-Generated Problems in MongoDB ({problems.length})</h3>
        {problems.length === 0 ? (
          <p className="mu">No problems in MongoDB yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((p) => (
                <tr key={p._id}>
                  <td>
                    <Link href={`/problems/${p.slug}`}>{p.title}</Link>
                  </td>
                  <td>{p.topic}</td>
                  <td>{p.difficulty}</td>
                  <td>{p.type}</td>
                  <td>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={busyId === p._id}
                      onClick={() => handleDelete('problem', p._id, p.title)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Mock Exams ({tests.length})</h3>
        {tests.length === 0 ? (
          <p className="mu">No mock exams in MongoDB yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Questions</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t._id}>
                  <td>
                    <Link href={`/tests/${t.slug}`}>{t.title}</Link>
                  </td>
                  <td>{t.difficulty}</td>
                  <td>{t.questionCount}</td>
                  <td>{t.duration}m</td>
                  <td>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={busyId === t._id}
                      onClick={() => handleDelete('test', t._id, t.title)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
