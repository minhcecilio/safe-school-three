import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close mobile menu and avatar dropdown when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location]);

  // Handle scroll to add background shadow/opacity
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle clicking outside the avatar dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    // In a real application, integration with Firebase Auth/AuthContext would go here:
    // e.g., const { logout } = useAuth(); await logout();
    console.log("Integrate Auth: Logging out user...");
    alert("Đăng xuất thành công! (Mock action - logic tích hợp sau)");
    navigate('/');
  };

  return (
    <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container header-container">
        {/* Logo */}
        <NavLink to="/" className="header-logo">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 11L11 13L15 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="logo-text">Safe<span className="accent-text">School</span></span>
        </NavLink>

        {/* Desktop Menu */}
        <nav className={`header-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <ul className="nav-list">
            <li className="nav-item">
              <NavLink 
                to="/" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                end
              >
                Trang chủ
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/articles" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Bài viết
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/reports" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Báo cáo
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/notifications" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Thông báo
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/consultation" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Đặt lịch tham vấn
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Action Button & Hamburger */}
        <div className="header-actions">
          {/* Avatar Dropdown Container */}
          <div className="avatar-dropdown-container" ref={dropdownRef}>
            <button 
              className={`avatar-btn ${isDropdownOpen ? 'active' : ''}`} 
              onClick={toggleDropdown}
              aria-label="User profile dropdown"
              aria-expanded={isDropdownOpen}
            >
              <svg className="user-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="avatar-dropdown">
                <div className="dropdown-user-info">
                  <p className="user-display-name">Nguyễn Văn A</p>
                  <p className="user-display-role">Học sinh</p>
                </div>
                <hr className="dropdown-divider" />
                <NavLink to="/profile" className="dropdown-item">
                  <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Thông tin cá nhân
                </NavLink>
                <button onClick={handleLogout} className="dropdown-item dropdown-logout-btn">
                  <svg className="dropdown-item-icon text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-danger">Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
          
          <button className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu} aria-label="Toggle menu">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
