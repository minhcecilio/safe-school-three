import React from 'react';

export default function News() {
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary-dark)' }}>Bài viết & Tin tức</h1>
        <p style={{ color: 'var(--gray-text)', fontSize: '1.1rem', marginBottom: '24px' }}>
          Trang tổng hợp bài viết, kiến thức phòng chống bạo lực học đường và kỹ năng bảo vệ bản thân dành cho học sinh.
        </p>
        <div style={{ backgroundColor: 'var(--white)', padding: '32px', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--gray-medium)' }}>
          <p style={{ fontStyle: 'italic', color: 'var(--primary-light)' }}>Nội dung bài viết sẽ được tải ở đây trong giai đoạn tiếp theo.</p>
        </div>
      </div>
    </div>
  );
}
