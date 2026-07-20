import React from 'react';

export default function Report() {
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary-dark)' }}>Báo cáo & Phản ánh</h1>
        <p style={{ color: 'var(--gray-text)', fontSize: '1.1rem', marginBottom: '24px' }}>
          Gửi báo cáo bảo mật về bạo lực học đường hoặc các hành vi không an toàn. Thông tin của bạn hoàn toàn được bảo mật.
        </p>
        <div style={{ backgroundColor: 'var(--white)', padding: '32px', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--gray-medium)' }}>
          <p style={{ fontStyle: 'italic', color: 'var(--primary-light)' }}>Mẫu báo cáo phản ánh sẽ được tích hợp ở đây trong giai đoạn tiếp theo.</p>
        </div>
      </div>
    </div>
  );
}
