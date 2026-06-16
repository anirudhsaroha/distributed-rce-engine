import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function statify(items) {
  return items;
}

export default function AdminDashboard() {
  const [workers, setWorkers] = useState([]);
  const [queueDepth, setQueueDepth] = useState(0);
  const [runningJobs, setRunningJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [cpu, setCpu] = useState(0);
  const [memory, setMemory] = useState(0);
  const [latency, setLatency] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    // connect socket
    const socket = io(API);
    socketRef.current = socket;

    socket.on('connect', () => console.log('admin socket connected'));

    socket.on('admin.workers', (payload) => setWorkers(payload));
    socket.on('admin.queueDepth', (n) => setQueueDepth(n));
    socket.on('admin.runningJobs', (list) => setRunningJobs(list));
    socket.on('admin.completedJobs', (list) => setCompletedJobs((prev) => [...list, ...prev].slice(0, 100)));
    socket.on('admin.metrics', (m) => {
      setCpu(m.cpu || 0);
      setMemory(m.memory || 0);
      setLatency(m.latencyMs || 0);
    });

    // initial fetch
    axios.get(`${API}/api/admin/status`).then((r) => {
      const data = r.data || {};
      setWorkers(data.workers || []);
      setQueueDepth(data.queueDepth || 0);
      setRunningJobs(data.runningJobs || []);
      setCompletedJobs(data.completedJobs || []);
      setCpu(data.metrics?.cpu || 0);
      setMemory(data.metrics?.memory || 0);
      setLatency(data.metrics?.latencyMs || 0);
    }).catch(() => {});

    return () => socket.disconnect();
  }, []);

  return (
    <div className="admin">
      <h1>Admin Dashboard</h1>
      <section className="panel">
        <h2>Workers ({workers.length})</h2>
        <ul>
          {workers.map((w) => (
            <li key={w.id}>{w.id} - {w.host} - {w.uptime}s</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Queue</h2>
        <p>Depth: {queueDepth}</p>
      </section>

      <section className="panel">
        <h2>Running Jobs</h2>
        <ul>
          {runningJobs.map((j) => (
            <li key={j.id}>{j.id} - {j.submissionId} - {j.language}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Completed Jobs</h2>
        <ul>
          {completedJobs.map((c) => (
            <li key={c.jobId}>{c.jobId} - {c.submissionId} - {c.status}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Metrics</h2>
        <p>CPU: {cpu}%</p>
        <p>Memory: {Math.round(memory / (1024*1024))} MB</p>
        <p>Latency: {latency} ms</p>
      </section>
    </div>
  );
}
