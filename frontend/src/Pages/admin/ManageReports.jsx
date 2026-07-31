import React, { useEffect, useMemo, useState } from 'react';
import {
  assignReport, getHandlers, restoreReport, searchReports,
  softDeleteReport, suggestAssignees, updateReportStatus,
} from '../../api/admin';
import Toast from '../../components/Common/Toast';

const initialFilters = {
  q: '', status: 'all', assignee: '', type: '', priority: 'all',
  from: '', to: '', sort_by: 'createdAt', sort_order: 'desc', include_deleted: false,
};

const ManageReports = ({ currentUser }) => {
  const [reports, setReports] = useState([]);
  const [handlers, setHandlers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const load = async () => {
    try {
      setLoading(true);
      const [reportRes, handlerRes] = await Promise.all([
        searchReports(filters), getHandlers(),
      ]);
      setReports(reportRes.data?.data || reportRes.data || []);
      setHandlers(handlerRes.data?.data || handlerRes.data || []);
    } catch (error) {
      setToast({ message: error.message || 'Không thể tải dữ liệu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters.status, filters.assignee, filters.type, filters.priority,
    filters.from, filters.to, filters.sort_by, filters.sort_order, filters.include_deleted]);

  const myReports = useMemo(
    () => reports.filter((r) => r.assignedTo === currentUser?.uid),
    [reports, currentUser?.uid],
  );

  const overdueCount = myReports.filter((r) =>
    r.sla?.isResponseOverdue || r.sla?.isResolutionOverdue || r.sla?.isEscalated).length;

  const submitSearch = (event) => { event.preventDefault(); load(); };

  const openAssign = async (report) => {
    setSelected(report); setAssigneeId(report.assignedTo || ''); setNote('');
    try {
      const response = await suggestAssignees(report.id);
      setSuggestions(response.data?.data || response.data || []);
    } catch {
      setSuggestions([]);
    }
  };

  const confirmAssign = async () => {
    if (!selected || !assigneeId) return;
    await assignReport(selected.id, assigneeId, note);
    setSelected(null); setToast({ message: 'Phân công thành công', type: 'success' }); load();
  };

  const changeStatus = async (report, status) => {
    const resolution = status === 'resolved' ? window.prompt('Nhập kết quả xử lý:') : '';
    if (status === 'resolved' && resolution === null) return;
    await updateReportStatus(report.id, status, resolution || '', note);
    setToast({ message: 'Cập nhật trạng thái thành công', type: 'success' }); load();
  };

  const remove = async (report) => {
    if (!window.confirm('Chuyển báo cáo vào thùng rác trong 30 ngày?')) return;
    await softDeleteReport(report.id); load();
  };

  const restore = async (report) => { await restoreReport(report.id); load(); };

  const setFilter = (key, value) => setFilters((old) => ({ ...old, [key]: value }));

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      {toast.message && <Toast {...toast} onClose={() => setToast({ message: '', type: 'info' })} />}
      <h1>SafeSchool – Quản lý báo cáo</h1>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <article style={card}><b>Báo cáo của tôi</b><div style={metric}>{myReports.length}</div></article>
        <article style={card}><b>Quá hạn SLA</b><div style={metric}>{overdueCount}</div></article>
        <article style={card}><b>Thùng rác</b><div style={metric}>{filters.include_deleted ? reports.length : '—'}</div></article>
      </section>

      <form onSubmit={submitSearch} style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input value={filters.q} onChange={(e) => setFilter('q', e.target.value)} placeholder="Tìm tiêu đề, nội dung, mã, địa điểm..." style={input} />
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} style={input}>
          <option value="all">Mọi trạng thái</option><option value="pending">Chờ xử lý</option>
          <option value="processing">Đang xử lý</option><option value="resolved">Hoàn thành</option>
        </select>
        <select value={filters.assignee} onChange={(e) => setFilter('assignee', e.target.value)} style={input}>
          <option value="">Mọi người xử lý</option>
          {handlers.map((h) => <option key={h.uid} value={h.uid}>{h.displayName} ({h.workload || 0})</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} style={input}>
          <option value="all">Mọi ưu tiên</option><option value="sos">SOS</option>
          <option value="high">Cao</option><option value="normal">Thường</option><option value="low">Thấp</option>
        </select>
        <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} style={input} />
        <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} style={input} />
        <button type="submit">Tìm kiếm</button>
        <button type="button" onClick={() => setFilter('assignee', currentUser?.uid || '')}>Báo cáo của tôi</button>
        <button type="button" onClick={() => setFilters({ ...initialFilters, include_deleted: !filters.include_deleted })}>
          {filters.include_deleted ? 'Quay lại danh sách' : 'Thùng rác'}
        </button>
      </form>

      <div style={{ ...card, overflowX: 'auto' }}>
        {loading ? <p>Đang tải...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th>Mã / Nội dung</th><th>Ưu tiên</th><th>Người xử lý</th><th>SLA</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{reports.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={cell}><b>#{r.trackingCode || r.id.slice(0, 8)}</b><br />{r.title}<br /><small>{r.description}</small></td>
                <td style={cell}>{String(r.priority || 'NORMAL').toUpperCase()}</td>
                <td style={cell}>{r.assignedToName || 'Chưa phân công'}</td>
                <td style={cell}>{r.sla?.isEscalated ? '⚠ Quá hạn' : r.sla?.resolutionDeadline || '—'}</td>
                <td style={cell}>{r.status}</td>
                <td style={cell}>
                  {filters.include_deleted ? <button onClick={() => restore(r)}>Khôi phục</button> : <>
                    <button onClick={() => openAssign(r)}>Phân công</button>{' '}
                    <button onClick={() => changeStatus(r, 'processing')}>Đang xử lý</button>{' '}
                    <button onClick={() => changeStatus(r, 'resolved')}>Hoàn thành</button>{' '}
                    <button onClick={() => remove(r)}>Xóa</button>
                  </>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {selected && <div style={overlay}>
        <div style={{ ...card, width: 520 }}>
          <h3>Phân công: {selected.title}</h3>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={{ ...input, width: '100%' }}>
            <option value="">Chọn người xử lý</option>
            {suggestions.map((h) => <option key={h.uid} value={h.uid}>
              {h.displayName} – {h.matchScore} điểm – workload {h.workload}
            </option>)}
          </select>
          {suggestions.find((h) => h.uid === assigneeId)?.matchReason &&
            <p>{suggestions.find((h) => h.uid === assigneeId).matchReason}</p>}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú phân công" style={{ ...input, width: '100%', minHeight: 90 }} />
          <div style={{ textAlign: 'right' }}><button onClick={() => setSelected(null)}>Hủy</button>{' '}<button onClick={confirmAssign}>Xác nhận</button></div>
        </div>
      </div>}
    </div>
  );
};

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 };
const metric = { fontSize: 28, fontWeight: 800, marginTop: 8 };
const input = { padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 };
const cell = { padding: 12, verticalAlign: 'top' };
const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'grid', placeItems: 'center', zIndex: 50 };
export default ManageReports;