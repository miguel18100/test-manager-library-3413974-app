import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('role') || '');
  const [currentTab, setCurrentTab] = useState('books');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form State
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Books State
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [booksPage, setBooksPage] = useState(1);
  const [booksTotal, setBooksTotal] = useState(0);
  const [bookModal, setBookModal] = useState(null); // 'create' | book object for edit

  // Members State
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberModal, setMemberModal] = useState(false);
  const [newMember, setNewMember] = useState({ full_name: '', document_number: '' });

  // Loans State
  const [loans, setLoans] = useState([]);
  const [loanModal, setLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState({ member_id: '', items: ['', '', ''] });

  // Overdue State
  const [overdueList, setOverdueList] = useState([]);

  // Reports State
  const [reportDates, setReportDates] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [reportRows, setReportRows] = useState([]);

  // Auth fetch helper
  const apiFetch = async (endpoint, options = {}) => {
    setErrorMsg('');
    setSuccessMsg('');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        let msg = data?.message || `Error del servidor (${res.status})`;
        if (data?.details?.length) {
          msg += `: ${data.details.map(d => `${d.field}: ${d.issue}`).join(', ')}`;
        }
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      setErrorMsg(err.message);
      throw err;
    }
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      setToken(data.access_token);
      setUserRole(data.role);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      setSuccessMsg('Inicio de sesiÃƒÂ³n exitoso');
    } catch (err) {
      // Error handled by apiFetch
    }
  };

  const handleLogout = () => {
    setToken('');
    setUserRole('');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  // Load Categories
  const loadCategories = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/categories');
      if (Array.isArray(data)) setCategories(data);
    } catch (err) {}
  };

  // Load Books
  const loadBooks = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ page: booksPage, size: 10 });
      if (searchQuery) params.append('q', searchQuery);
      if (selectedCategory) params.append('category_id', selectedCategory);
      const data = await apiFetch(`/books?${params.toString()}`);
      if (data?.items) {
        setBooks(data.items);
        setBooksTotal(data.total);
      }
    } catch (err) {}
  };

  // Load Members
  const loadMembers = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ page: 1, size: 50 });
      if (memberSearch) params.append('q', memberSearch);
      const data = await apiFetch(`/members?${params.toString()}`);
      if (data?.items) setMembers(data.items);
    } catch (err) {}
  };

  // Load Loans
  const loadLoans = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/loans?page=1&size=20');
      if (data?.items) setLoans(data.items);
    } catch (err) {}
  };

  // Load Overdue
  const loadOverdue = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/loans/overdue?page=1&size=50');
      if (data?.items) setOverdueList(data.items);
    } catch (err) {}
  };

  // Load Reports
  const loadReports = async () => {
    if (!token || userRole !== 'admin') return;
    try {
      const data = await apiFetch(`/reports/most-borrowed?from=${reportDates.from}&to=${reportDates.to}`);
      if (data?.rows) setReportRows(data.rows);
    } catch (err) {}
  };

  useEffect(() => {
    if (token) {
      loadCategories();
      if (currentTab === 'books') loadBooks();
      if (currentTab === 'members') loadMembers();
      if (currentTab === 'loans') loadLoans();
      if (currentTab === 'overdue') loadOverdue();
      if (currentTab === 'reports') loadReports();
    }
  }, [token, currentTab, booksPage, searchQuery, selectedCategory]);

  // Book Handlers
  const handleSaveBook = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const bookData = {
      title: fd.get('title'),
      author: fd.get('author'),
      isbn: fd.get('isbn'),
      category_id: fd.get('category_id'),
      total_copies: parseInt(fd.get('total_copies'), 10)
    };

    try {
      if (bookModal === 'create') {
        await apiFetch('/books', { method: 'POST', body: JSON.stringify(bookData) });
        setSuccessMsg('Libro creado correctamente');
      } else {
        await apiFetch(`/books/${bookModal.id}`, { method: 'PUT', body: JSON.stringify(bookData) });
        setSuccessMsg('Libro actualizado correctamente');
      }
      setBookModal(null);
      loadBooks();
    } catch (err) {}
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm('Ã‚Â¿Seguro de dar de baja este libro?')) return;
    try {
      await apiFetch(`/books/${id}`, { method: 'DELETE' });
      setSuccessMsg('Libro dado de baja (baja lÃƒÂ³gica aplicada)');
      loadBooks();
    } catch (err) {}
  };

  // Member Handlers
  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/members', { method: 'POST', body: JSON.stringify(newMember) });
      setSuccessMsg('Socio registrado con ÃƒÂ©xito');
      setMemberModal(false);
      setNewMember({ full_name: '', document_number: '' });
      loadMembers();
    } catch (err) {}
  };

  // Loan Handlers
  const handleCreateLoan = async (e) => {
    e.preventDefault();
    const validBooks = loanForm.items.filter(id => id.trim() !== '').map(id => ({ book_id: id }));
    if (!validBooks.length) {
      setErrorMsg('Selecciona al menos un libro para prestar.');
      return;
    }

    try {
      await apiFetch('/loans', {
        method: 'POST',
        body: JSON.stringify({ member_id: loanForm.member_id, items: validBooks })
      });
      setSuccessMsg('PrÃƒÂ©stamo registrado exitosamente');
      setLoanModal(false);
      setLoanForm({ member_id: '', items: ['', '', ''] });
      loadLoans();
      loadBooks(); // refresh copies
    } catch (err) {}
  };

  const handleReturnItem = async (loanId, itemId) => {
    try {
      await apiFetch(`/loans/${loanId}/items/${itemId}/return`, { method: 'POST' });
      setSuccessMsg('Ejemplar devuelto exitosamente');
      loadLoans();
      if (currentTab === 'overdue') loadOverdue();
      loadBooks();
    } catch (err) {}
  };

  // Acceso: pantalla de bienvenida con identidad visual independiente.
  if (!token) {
    return (
      <div className="auth-layout">
        <section className="auth-story">
          <div className="brand-lockup"><span className="brand-mark">N</span><span>NEXO <small>BIBLIOTECA</small></span></div>
          <div className="auth-story-copy">
            <span className="eyebrow">ESPACIO DE LECTURA Y CONOCIMIENTO</span>
            <h1>Las historias<br />encuentran su lugar.</h1>
            <p>Una forma mÃƒÂ¡s sencilla de organizar colecciones, acompaÃƒÂ±ar lectores y mantener cada prÃƒÂ©stamo en movimiento.</p>
            <div className="story-stat"><span className="story-dot"></span> Plataforma de gestiÃƒÂ³n bibliotecaria</div>
          </div>
          <div className="auth-footnote">MANAGER LIBRARY Ã‚Â· ADSO 3413974</div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-mobile-brand"><span className="brand-mark">N</span><b>NEXO Biblioteca</b></div>
            <span className="eyebrow">ACCESO DE PERSONAL</span>
            <h2>QuÃƒÂ© bueno verte.</h2>
            <p className="auth-subtitle">Ingresa tus datos para continuar al espacio de trabajo.</p>
            {errorMsg && <div className="alert-error" role="alert">{errorMsg}</div>}
            <form onSubmit={handleLogin} className="auth-form">
              <label>Usuario
                <input type="text" autoComplete="username" required value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} placeholder="Tu usuario" />
              </label>
              <label>ContraseÃƒÂ±a
                <input type="password" autoComplete="current-password" required value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Ingresa tu contraseÃƒÂ±a" />
              </label>
              <button type="submit" className="btn-primary auth-submit">Entrar al sistema <span aria-hidden="true">Ã¢â€ â€™</span></button>
            </form>
            <p className="auth-privacy">Acceso privado para personal autorizado.</p>
          </div>
        </section>
      </div>
    );
  }

  const navItems = [
    { id: 'books', label: 'CatÃƒÂ¡logo', icon: 'Ã¢â€“Â¤', detail: 'ColecciÃƒÂ³n' },
    { id: 'members', label: 'Lectores', icon: 'Ã¢â„¢â„¢', detail: 'Comunidad' },
    { id: 'loans', label: 'CirculaciÃƒÂ³n', icon: 'Ã¢â€¡â€ž', detail: 'PrÃƒÂ©stamos' },
    { id: 'overdue', label: 'Vencimientos', icon: 'Ã¢â€”Â·', detail: 'Seguimiento' },
    ...(userRole === 'admin' ? [{ id: 'reports', label: 'AnalÃƒÂ­tica', icon: 'Ã¢â€“Â¥', detail: 'Informes' }] : [])
  ];
  const pageNames = { books: 'CatÃƒÂ¡logo de libros', members: 'Directorio de lectores', loans: 'CirculaciÃƒÂ³n de ejemplares', overdue: 'PrÃƒÂ©stamos por revisar', reports: 'Actividad de la biblioteca' };

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark">N</span><span>NEXO<small>BIBLIOTECA</small></span></div>
        <div className="sidebar-caption">ESPACIO DE TRABAJO</div>
        <nav className="side-nav" aria-label="NavegaciÃƒÂ³n principal">
          {navItems.map(tab => (
            <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`side-link ${currentTab === tab.id ? 'active' : ''}`}>
              <span className="side-icon">{tab.icon}</span><span className="side-link-copy"><b>{tab.label}</b><small>{tab.detail}</small></span>{currentTab === tab.id && <span className="side-current">Ã¢â€”Â</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-mark">Ã¢Å“Â¦</span><b>Un lugar para cada historia</b><p>Organiza recursos y acompaÃƒÂ±a cada lectura.</p></div>
          <div className="profile-row"><div className="avatar">{(loginForm.username || 'A').slice(0,1).toUpperCase()}</div><div className="profile-copy"><b>{loginForm.username || 'Personal'}</b><small>{userRole === 'admin' ? 'Administrador' : 'Bibliotecario'}</small></div><button className="logout-button" onClick={handleLogout} title="Cerrar sesiÃƒÂ³n" aria-label="Cerrar sesiÃƒÂ³n">Ã¢â€ â€”</button></div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar"><div><span className="breadcrumb">Biblioteca <span>/</span> {pageNames[currentTab] || 'Panel'}</span><h1>{pageNames[currentTab] || 'Panel'}</h1></div><div className="topbar-meta"><span className="status-pill"><span></span> Sistema activo</span><span className={`role-pill ${userRole === 'admin' ? 'role-admin' : ''}`}>{userRole === 'admin' ? 'ADMINISTRADOR' : 'BIBLIOTECARIO'}</span></div></header>
        <div className="workspace-content">
          {errorMsg && <div className="alert-error global-alert" role="alert">{errorMsg}</div>}
          {successMsg && <div className="alert-success global-alert" role="status">{successMsg}</div>}
          <div className="content-intro"><div><span className="eyebrow">PANEL DE GESTIÃƒâ€œN</span><p>Administra los recursos y revisa la actividad de tu biblioteca.</p></div><span className="today-label">NEXO <span>Ã¢â‚¬Â¢</span> GESTIÃƒâ€œN</span></div>
          <main className="content-main">
      {/* BOOKS TAB */}
        {currentTab === 'books' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
                <input
                  type="text"
                  placeholder="Buscar por tÃƒÂ­tulo o autor..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                />
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                >
                  <option value="">Todas las CategorÃƒÂ­as</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {userRole === 'admin' && (
                <button
                  onClick={() => setBookModal('create')}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  + Agregar Libro
                </button>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>TÃƒÂ­tulo</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Autor</th>
                    <th style={{ padding: '0.75rem 1rem' }}>ISBN</th>
                    <th style={{ padding: '0.75rem 1rem' }}>CategorÃƒÂ­a</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Disponibles</th>
                    {userRole === 'admin' && <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {books.length === 0 ? (
                    <tr>
                      <td colSpan={userRole === 'admin' ? 6 : 5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No se encontraron libros en el catÃƒÂ¡logo.
                      </td>
                    </tr>
                  ) : (
                    books.map(b => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>{b.title}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{b.author}</td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#64748b' }}>{b.isbn}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                            {b.category?.name}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontWeight: 700,
                            color: b.available_copies > 0 ? '#16a34a' : '#dc2626',
                            background: b.available_copies > 0 ? '#f0fdf4' : '#fef2f2',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            {b.available_copies} / {b.total_copies}
                          </span>
                        </td>
                        {userRole === 'admin' && (
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <button
                              onClick={() => setBookModal(b)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, marginRight: '0.75rem' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteBook(b.id)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600 }}
                            >
                              Baja
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {currentTab === 'members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Buscar socio por documento o nombre..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ flex: 1, maxWidth: '400px', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <button
                onClick={() => setMemberModal(true)}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem' }}
              >
                + Registrar Socio
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>Nombre Completo</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Documento</th>
                    <th style={{ padding: '0.75rem 1rem' }}>ID ÃƒÅ¡nico</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>{m.full_name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569', fontFamily: 'monospace' }}>{m.document_number}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>{m.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOANS TAB */}
        {currentTab === 'loans' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>PrÃƒÂ©stamos Activos y Devoluciones</h2>
              <button
                onClick={() => {
                  loadMembers();
                  loadBooks();
                  setLoanModal(true);
                }}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem' }}
              >
                + Nuevo PrÃƒÂ©stamo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loans.map(loan => (
                <div key={loan.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Fecha: {new Date(loan.loaned_at).toLocaleDateString()}</span>
                      <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>Ã¢â‚¬Â¢</span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Socio: {loan.member_id}</span>
                    </div>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: loan.status === 'open' ? '#dbeafe' : loan.status === 'overdue' ? '#fee2e2' : '#dcfce7',
                      color: loan.status === 'open' ? '#1e40af' : loan.status === 'overdue' ? '#991b1b' : '#166534'
                    }}>
                      {loan.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    {loan.items?.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                        <div>
                          <strong style={{ color: '#1e293b' }}>{item.book_title}</strong>
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>({item.category_name})</span>
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>Vence: {new Date(item.due_at).toLocaleDateString()}</span>
                        </div>
                        {item.returned_at ? (
                          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Devuelto ({new Date(item.returned_at).toLocaleDateString()})</span>
                        ) : (
                          <button
                            onClick={() => handleReturnItem(loan.id, item.id)}
                            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#2563eb', padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Registrar DevoluciÃƒÂ³n
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OVERDUE TAB */}
        {currentTab === 'overdue' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Libros Vencidos y en Mora (HU-09)</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>LÃƒÂ­neas de prÃƒÂ©stamo que han superado los 14 dÃƒÂ­as reglamentarios sin devoluciÃƒÂ³n.</p>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>Libro</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Socio</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Fecha de Vencimiento</th>
                    <th style={{ padding: '0.75rem 1rem' }}>DÃƒÂ­as de Retraso</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>AcciÃƒÂ³n</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueList.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        Ã‚Â¡Excelente! No hay libros vencidos en este momento.
                      </td>
                    </tr>
                  ) : (
                    overdueList.map(item => (
                      <tr key={item.item_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>{item.book_title}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{item.member_name}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#dc2626' }}>{new Date(item.due_at).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
                            {item.days_late} dÃƒÂ­as
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleReturnItem(item.loan_id, item.item_id)}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Devolver
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {currentTab === 'reports' && userRole === 'admin' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Libros MÃƒÂ¡s Prestados (HU-10)</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Reporte agrupado por datos inmutables congelados en cada lÃƒÂ­nea de prÃƒÂ©stamo.</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>Desde:</label>
                <input
                  type="date"
                  value={reportDates.from}
                  onChange={e => setReportDates({ ...reportDates, from: e.target.value })}
                  style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>Hasta:</label>
                <input
                  type="date"
                  value={reportDates.to}
                  onChange={e => setReportDates({ ...reportDates, to: e.target.value })}
                  style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <button
                onClick={loadReports}
                style={{ marginTop: '1.2rem', background: '#2563eb', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem' }}
              >
                Generar Reporte
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>TÃƒÂ­tulo Congelado</th>
                    <th style={{ padding: '0.75rem 1rem' }}>CategorÃƒÂ­a Congelada</th>
                    <th style={{ padding: '0.75rem 1rem' }}>PrÃƒÂ©stamos Concedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No hay prÃƒÂ©stamos registrados en el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    reportRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>{row.book_title}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{row.category_name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.85rem' }}>
                            {row.times_borrowed} veces
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Book Modal */}
      {bookModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              {bookModal === 'create' ? 'Crear Nuevo Libro' : 'Editar Libro'}
            </h3>
            <form onSubmit={handleSaveBook}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>TÃƒÂ­tulo</label>
                <input name="title" defaultValue={bookModal.title || ''} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Autor</label>
                <input name="author" defaultValue={bookModal.author || ''} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>ISBN (13 dÃƒÂ­gitos)</label>
                <input name="isbn" defaultValue={bookModal.isbn || ''} maxLength={13} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>CategorÃƒÂ­a</label>
                <select name="category_id" defaultValue={bookModal.category?.id || categories[0]?.id} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Ejemplares Totales (mÃ­nimo 1)</label>
                <input name="total_copies" type="number" min={1} defaultValue={bookModal.total_copies || 1} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setBookModal(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>Cancelar</button>
                <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600 }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {memberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '450px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>Registrar Socio</h3>
            <form onSubmit={handleCreateMember}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nombre Completo</label>
                <input
                  required
                  value={newMember.full_name}
                  onChange={e => setNewMember({ ...newMember, full_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Documento de Identidad (ÃƒÅ¡nico)</label>
                <input
                  required
                  value={newMember.document_number}
                  onChange={e => setNewMember({ ...newMember, document_number: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setMemberModal(false)} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>Cancelar</button>
                <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600 }}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Modal */}
      {loanModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '550px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>Registrar PrÃƒÂ©stamo</h3>
            <form onSubmit={handleCreateLoan}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Socio Lector</label>
                <select
                  required
                  value={loanForm.member_id}
                  onChange={e => setLoanForm({ ...loanForm, member_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                >
                  <option value="">Selecciona un socio...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.document_number})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Libros a Prestar (1 a 3 ejemplares)
                </label>
                {[0, 1, 2].map(idx => (
                  <div key={idx} style={{ marginBottom: '0.5rem' }}>
                    <select
                      value={loanForm.items[idx]}
                      onChange={e => {
                        const newItems = [...loanForm.items];
                        newItems[idx] = e.target.value;
                        setLoanForm({ ...loanForm, items: newItems });
                      }}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                    >
                      <option value="">{idx === 0 ? '-- Libro Obligatorio (1) --' : `-- Libro Opcional (${idx + 1}) --`}</option>
                      {books.filter(b => b.available_copies > 0).map(b => (
                        <option key={b.id} value={b.id}>{b.title} (Disp: {b.available_copies})</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setLoanModal(false)} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>Cancelar</button>
                <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600 }}>Confirmar PrÃƒÂ©stamo</button>
              </div>
            </form>
          </div>
        </div>
      )}

        </div>
        <footer className="workspace-footer"><span>NEXO Biblioteca</span><span>GestiÃƒÂ³n de colecciones Ã‚Â· ADSO 3413974</span></footer>
      </div>
    </div>
  );
}


