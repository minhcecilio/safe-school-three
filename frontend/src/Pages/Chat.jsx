import React from 'react';

export default function Chat() {
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary-dark)' }}>Chat tư vấn trực tuyến</h1>
        <p style={{ color: 'var(--gray-text)', fontSize: '1.1rem', marginBottom: '24px' }}>
          Trò chuyện trực tiếp và bảo mật với chuyên gia tâm lý học đường để giải tỏa căng thẳng và giải quyết các vấn đề bạn gặp phải.
        </p>
        <div style={{ backgroundColor: 'var(--white)', padding: '32px', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--gray-medium)' }}>
          <p style={{ fontStyle: 'italic', color: 'var(--primary-light)' }}>Kênh chat bảo mật 1-1 sẽ mở sau khi bạn đăng nhập tài khoản.</p>
        </div>
      </div>
    </div>
  );
}
