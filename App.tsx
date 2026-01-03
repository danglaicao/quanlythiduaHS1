
import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Role, Status, SchoolYear, Month, Week, ClassRoom, 
  ViolationCategory, ScoreEntry, AuditLog, RankingItem 
} from './types';
import { 
  SEED_USERS, SEED_SCHOOL_YEAR, SEED_MONTHS, SEED_WEEKS, 
  SEED_CLASSES, SEED_VIOLATIONS 
} from './constants';

// --- Utilities ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const roundPoints = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

const App: React.FC = () => {
  // --- Global State (MVP In-Memory) ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([SEED_SCHOOL_YEAR]);
  const [activeYearId, setActiveYearId] = useState<string>(SEED_SCHOOL_YEAR.id);
  const [months, setMonths] = useState<Month[]>(SEED_MONTHS);
  const [weeks, setWeeks] = useState<Week[]>(SEED_WEEKS);
  const [classes, setClasses] = useState<ClassRoom[]>(SEED_CLASSES);
  const [violations, setViolations] = useState<ViolationCategory[]>(SEED_VIOLATIONS);
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'score' | 'ranking' | 'report' | 'locking' | 'audit' | 'manage'>('dashboard');
  const [manageSubTab, setManageSubTab] = useState<'year' | 'month' | 'week' | 'class' | 'violation' | 'user'>('year');
  const [rankingViewMode, setRankingViewMode] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');
  const [reportViewMode, setReportViewMode] = useState<'WEEK' | 'MONTH' | 'YEAR'>('YEAR');
  
  // Selection State
  const [selectedWeekId, setSelectedWeekId] = useState<string>(SEED_WEEKS[0].id); // For Scoring Tab
  const [rankingWeekId, setRankingWeekId] = useState<string>(SEED_WEEKS[0].id);   // For Ranking Tab
  const [rankingMonthId, setRankingMonthId] = useState<string>(SEED_MONTHS[0].id); // For Ranking Tab
  
  const [reportWeekId, setReportWeekId] = useState<string>(SEED_WEEKS[0].id);     // For Report Tab
  const [reportMonthId, setReportMonthId] = useState<string>(SEED_MONTHS[0].id);   // For Report Tab

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; payload: any } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  
  // Detail View State
  const [selectedDetail, setSelectedDetail] = useState<{
    classId: string;
    periodType: 'WEEK' | 'MONTH' | 'YEAR';
    periodId: string;
    periodName: string;
  } | null>(null);

  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [mustChangePasswordUser, setMustChangePasswordUser] = useState<User | null>(null);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Edit State
  const [editingItem, setEditingItem] = useState<{ type: string; data: any } | null>(null);

  // --- Logic Helpers ---
  const schoolYear = schoolYears.find(sy => sy.id === activeYearId) || schoolYears[0];
  
  const getWeekById = (id: string) => weeks.find(w => w.id === id);
  const getMonthById = (id: string) => months.find(m => m.id === id);
  const getMonthByWeekId = (weekId: string) => {
    const w = getWeekById(weekId);
    return months.find(m => m.id === w?.monthId);
  };

  const currentYearMonths = useMemo(() => months.filter(m => m.schoolYearId === activeYearId), [months, activeYearId]);
  const currentYearWeeks = useMemo(() => weeks.filter(w => currentYearMonths.find(m => m.id === w.monthId)), [weeks, currentYearMonths]);

  useEffect(() => {
    if (currentYearMonths.length > 0) {
      if (!currentYearMonths.find(m => m.id === rankingMonthId)) setRankingMonthId(currentYearMonths[0].id);
      if (!currentYearMonths.find(m => m.id === reportMonthId)) setReportMonthId(currentYearMonths[0].id);
    }
    if (currentYearWeeks.length > 0) {
      if (!currentYearWeeks.find(w => w.id === rankingWeekId)) setRankingWeekId(currentYearWeeks[0].id);
      if (!currentYearWeeks.find(w => w.id === reportWeekId)) setReportWeekId(currentYearWeeks[0].id);
      if (!currentYearWeeks.find(w => w.id === selectedWeekId)) setSelectedWeekId(currentYearWeeks[0].id);
    }
  }, [activeYearId, currentYearMonths, currentYearWeeks, rankingMonthId, rankingWeekId, selectedWeekId, reportMonthId, reportWeekId]);


  const isLocked = (weekId: string) => {
    const w = getWeekById(weekId);
    const m = getMonthByWeekId(weekId);
    if (!w || !m || !schoolYear) return true;
    return w.status === Status.LOCKED || m.status === Status.LOCKED || schoolYear.status === Status.LOCKED;
  };

  const canEditScore = (weekId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === Role.ADMIN) return true;
    if (currentUser.role === Role.DUTY_TEACHER) {
      return !isLocked(weekId);
    }
    return false;
  };

  // --- Auth Actions ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const user = users.find(u => u.username === loginUsername && u.password === loginPassword);
    
    if (user) {
      if (user.isFirstLogin) {
        setMustChangePasswordUser(user);
      } else {
        setCurrentUser(user);
      }
    } else {
      setLoginError('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) return alert('Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (newPass !== confirmPass) return alert('Mật khẩu xác nhận không khớp.');

    const updatedUsers = users.map(u => 
      u.id === mustChangePasswordUser?.id 
        ? { ...u, password: newPass, isFirstLogin: false } 
        : u
    );
    setUsers(updatedUsers);
    
    const freshUser = updatedUsers.find(u => u.id === mustChangePasswordUser?.id);
    if (freshUser) {
      setCurrentUser(freshUser);
      setMustChangePasswordUser(null);
      setNewPass('');
      setConfirmPass('');
      setLoginPassword('');
    }
  };

  // --- Ranking Calculation ---
  const calculateRankings = (periodType: 'WEEK' | 'MONTH' | 'YEAR', targetId: string) => {
    const basePoints = 100;
    const rankings: RankingItem[] = classes.map(cls => {
      let relevantEntries: ScoreEntry[] = [];
      if (periodType === 'WEEK') {
        relevantEntries = scoreEntries.filter(e => e.classId === cls.id && e.weekId === targetId);
        const sum = relevantEntries.reduce((sum, e) => sum + e.points, 0);
        const total = roundPoints(basePoints + sum);
        return { classId: cls.id, className: cls.name, totalPoints: total, rank: 0 };
      } else if (periodType === 'MONTH') {
        const monthWeeks = weeks.filter(w => w.monthId === targetId).map(w => w.id);
        const monthTotal = monthWeeks.reduce((acc, wId) => {
          const wEntries = scoreEntries.filter(e => e.classId === cls.id && e.weekId === wId);
          return acc + basePoints + wEntries.reduce((sum, e) => sum + e.points, 0);
        }, 0);
        return { classId: cls.id, className: cls.name, totalPoints: roundPoints(monthTotal), rank: 0 };
      } else {
        const yearWeeks = weeks.filter(w => {
           const m = months.find(month => month.id === w.monthId);
           return m?.schoolYearId === activeYearId;
        });
        const yearTotal = yearWeeks.reduce((acc, w) => {
          const wEntries = scoreEntries.filter(e => e.classId === cls.id && e.weekId === w.id);
          return acc + basePoints + wEntries.reduce((sum, e) => sum + e.points, 0);
        }, 0);
        return { classId: cls.id, className: cls.name, totalPoints: roundPoints(yearTotal), rank: 0 };
      }
    });

    return rankings.sort((a, b) => b.totalPoints - a.totalPoints).map((item, index) => ({ ...item, rank: index + 1 }));
  };

  // --- Statistics ---
  const calculateViolationStats = (periodType: 'WEEK' | 'MONTH' | 'YEAR', targetId: string) => {
    let relevantEntries: ScoreEntry[] = [];
    if (periodType === 'WEEK') {
      relevantEntries = scoreEntries.filter(e => e.weekId === targetId);
    } else if (periodType === 'MONTH') {
      const monthWeeks = weeks.filter(w => w.monthId === targetId).map(w => w.id);
      relevantEntries = scoreEntries.filter(e => monthWeeks.includes(e.weekId));
    } else {
      const yearWeeks = weeks.filter(w => {
         const m = months.find(month => month.id === w.monthId);
         return m?.schoolYearId === activeYearId;
      }).map(w => w.id);
      relevantEntries = scoreEntries.filter(e => yearWeeks.includes(e.weekId));
    }

    const stats = violations.map(v => {
      const vEntries = relevantEntries.filter(e => e.violationId === v.id);
      const frequency = vEntries.length;
      const totalStudents = vEntries.reduce((sum, e) => sum + e.studentCount, 0);
      const totalPoints = vEntries.reduce((sum, e) => sum + e.points, 0);
      
      return {
        id: v.id,
        name: v.name,
        basePoints: v.points,
        frequency,
        totalStudents,
        totalPoints: roundPoints(totalPoints)
      };
    });

    return stats.sort((a, b) => b.frequency - a.frequency || a.totalPoints - b.totalPoints);
  };

  // --- Actions ---
  const addScoreEntry = (entryData: Omit<ScoreEntry, 'id' | 'createdAt' | 'createdBy' | 'points'>) => {
    const locked = isLocked(entryData.weekId);
    if (locked && currentUser?.role !== Role.ADMIN) {
      alert("Tuần này đã bị khóa sổ. Không thể thao tác.");
      return;
    }

    const perform = (reason: string = '') => {
      const v = violations.find(vi => vi.id === entryData.violationId);
      const totalPoints = roundPoints((v?.points || 0) * entryData.studentCount);
      
      const newEntry: ScoreEntry = {
        ...entryData,
        points: totalPoints,
        id: generateId(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Unknown'
      };
      setScoreEntries(prev => [...prev, newEntry]);
      
      const log: AuditLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        actorId: currentUser?.id || '',
        actorName: currentUser?.name || '',
        action: 'CREATE',
        targetType: 'SCORE',
        targetId: newEntry.id,
        details: `Thêm điểm: ${newEntry.points.toFixed(2)} (SL: ${newEntry.studentCount}) cho lớp ${classes.find(c => c.id === entryData.classId)?.name}`,
        reason: reason
      };
      setAuditLogs(prev => [log, ...prev]);
    };

    if (locked && currentUser?.role === Role.ADMIN) {
      setPendingAction({ type: 'ADD_SCORE', payload: { perform } });
      setIsOverrideModalOpen(true);
    } else {
      perform();
    }
  };

  const deleteScoreEntry = (id: string) => {
    const entry = scoreEntries.find(e => e.id === id);
    if (!entry) return;
    const locked = isLocked(entry.weekId);

    const perform = (reason: string = '') => {
      setScoreEntries(prev => prev.filter(e => e.id !== id));
      const log: AuditLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        actorId: currentUser?.id || '',
        actorName: currentUser?.name || '',
        action: 'DELETE',
        targetType: 'SCORE',
        targetId: id,
        details: `Xóa điểm cho lớp ${classes.find(c => c.id === entry.classId)?.name}`,
        reason: reason
      };
      setAuditLogs(prev => [log, ...prev]);
    };

    if (locked && currentUser?.role === Role.ADMIN) {
      setPendingAction({ type: 'DELETE_SCORE', payload: { perform } });
      setIsOverrideModalOpen(true);
    } else {
      perform();
    }
  };

  const toggleLock = (type: 'WEEK' | 'MONTH' | 'YEAR', id: string, newStatus: Status) => {
    const perform = (reason: string = '') => {
      if (type === 'WEEK') setWeeks(prev => prev.map(w => w.id === id ? { ...w, status: newStatus } : w));
      if (type === 'MONTH') setMonths(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      if (type === 'YEAR') setSchoolYears(prev => prev.map(sy => sy.id === id ? { ...sy, status: newStatus } : sy));

      const log: AuditLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        actorId: currentUser?.id || '',
        actorName: currentUser?.name || '',
        action: newStatus === Status.LOCKED ? 'LOCK' : 'UNLOCK',
        targetType: type,
        targetId: id,
        details: `Thay đổi trạng thái ${type} thành ${newStatus}`,
        reason: reason
      };
      setAuditLogs(prev => [log, ...prev]);
    };

    if (newStatus === Status.OPEN) {
      setPendingAction({ type: 'UNLOCK', payload: { perform } });
      setIsOverrideModalOpen(true);
    } else {
      perform();
    }
  };

  const handleOverrideConfirm = () => {
    if (overrideReason.length < 10) {
      alert("Lý do phải từ 10 ký tự trở lên.");
      return;
    }
    pendingAction?.payload.perform(overrideReason);
    setIsOverrideModalOpen(false);
    setOverrideReason('');
    setPendingAction(null);
  };

  const exportToExcel = (data: any[], fileName: string) => {
    // @ts-ignore
    const ws = XLSX.utils.json_to_sheet(data);
    // @ts-ignore
    const wb = XLSX.utils.book_new();
    // @ts-ignore
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    // @ts-ignore
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const addYear = (name: string) => {
    const newY = { id: generateId(), name, status: Status.OPEN };
    setSchoolYears([...schoolYears, newY]);
  };
  const updateYear = (id: string, name: string) => {
    setSchoolYears(schoolYears.map(sy => sy.id === id ? { ...sy, name } : sy));
    setEditingItem(null);
  };
  const deleteYear = (id: string) => {
    if (schoolYears.length === 1) return alert("Phải có ít nhất một năm học.");
    setSchoolYears(schoolYears.filter(sy => sy.id !== id));
    if (activeYearId === id) setActiveYearId(schoolYears[0].id);
  };

  const addClass = (name: string, grade: number) => {
    const newClass = { id: generateId(), name, grade };
    setClasses([...classes, newClass]);
  };
  const updateClass = (id: string, name: string, grade: number) => {
    setClasses(classes.map(c => c.id === id ? { ...c, name, grade } : c));
    setEditingItem(null);
  };
  const deleteClass = (id: string) => setClasses(classes.filter(c => c.id !== id));

  const addViolation = (name: string, points: number) => {
    const newV = { id: generateId(), name, points: roundPoints(points) };
    setViolations([...violations, newV]);
  };
  const updateViolation = (id: string, name: string, points: number) => {
    setViolations(violations.map(v => v.id === id ? { ...v, name, points: roundPoints(points) } : v));
    setEditingItem(null);
  };
  const deleteViolation = (id: string) => setViolations(violations.filter(v => v.id !== id));

  const addWeek = (name: string, monthId: string, weekNumber: number) => {
    const newWeek = { id: generateId(), name, monthId, weekNumber, status: Status.OPEN };
    setWeeks([...weeks, newWeek]);
  };
  const updateWeek = (id: string, name: string, monthId: string, weekNumber: number) => {
    setWeeks(weeks.map(w => w.id === id ? { ...w, name, monthId, weekNumber } : w));
    setEditingItem(null);
  };
  const deleteWeek = (id: string) => setWeeks(weeks.filter(w => w.id !== id));

  const addMonth = (name: string, monthNumber: number) => {
    const newMonth = { id: generateId(), name, schoolYearId: activeYearId, monthNumber, status: Status.OPEN };
    setMonths([...months, newMonth]);
  };
  const updateMonth = (id: string, name: string, monthNumber: number) => {
    setMonths(months.map(m => m.id === id ? { ...m, name, monthNumber } : m));
    setEditingItem(null);
  };
  const deleteMonth = (id: string) => setMonths(months.filter(m => m.id !== id));

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser = { ...userData, id: generateId(), isFirstLogin: true };
    setUsers([...users, newUser]);
  };
  const updateUser = (id: string, userData: Omit<User, 'id'>) => {
    setUsers(users.map(u => u.id === id ? { ...userData, id } : u));
    setEditingItem(null);
  };
  const deleteUser = (id: string) => {
    if (users.length === 1) return alert("Hệ thống phải có ít nhất một tài khoản.");
    if (currentUser?.id === id) return alert("Bạn không thể tự xóa chính mình.");
    setUsers(users.filter(u => u.id !== id));
  };
  
  const resetPassword = (id: string) => {
    if(!window.confirm("Bạn có chắc chắn muốn reset mật khẩu của thành viên này về mặc định (Demo@123)?")) return;
    setUsers(users.map(u => u.id === id ? { ...u, password: 'Demo@123', isFirstLogin: true } : u));
    alert("Đã reset mật khẩu thành công về Demo@123.");
  };

  if (!currentUser) {
    if (mustChangePasswordUser) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
            <div className="flex flex-col items-center mb-6">
              <h1 className="text-xl font-bold text-center text-blue-900 uppercase">TRƯỜNG THCS CHU VĂN AN</h1>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">Ea Kar</p>
              <p className="text-[10px] text-purple-600 italic mt-1">Sản phẩm được thiết kế bằng công nghệ AI</p>
            </div>
            
            <h2 className="text-lg font-bold text-center mb-2">Đổi mật khẩu</h2>
            <p className="text-xs text-gray-500 text-center mb-6">Đây là lần đầu bạn đăng nhập. Vui lòng thay đổi mật khẩu để bảo mật tài khoản.</p>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Nhập mật khẩu mới"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
                <input 
                  type="password" 
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Xác nhận lại mật khẩu"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Cập nhật & Đăng nhập
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-bold text-center text-blue-900 uppercase">TRƯỜNG THCS CHU VĂN AN</h1>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">Ea Kar</p>
            <p className="text-[10px] text-purple-600 italic mt-1">Sản phẩm được thiết kế bằng công nghệ AI</p>
            <div className="w-12 h-1 bg-blue-600 rounded-full mt-4"></div>
          </div>

          <h2 className="text-lg font-semibold text-center mb-6 text-gray-700 uppercase tracking-tight">Đăng nhập Hệ thống</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
              <input 
                type="text" 
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition" 
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition" 
                placeholder="Nhập mật khẩu"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded border border-red-100">{loginError}</p>}
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-lg hover:bg-blue-700 shadow-md active:transform active:scale-95 transition"
            >
              Đăng nhập
            </button>
          </form>
        </div>
        <p className="mt-8 text-xs text-gray-400 text-center">© 2024-2025 Hệ thống Quản lý Thi đua - Trường THCS Chu Văn An</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-4 sticky top-0 h-auto md:h-screen overflow-y-auto z-40">
        <div className="flex items-center space-x-2 mb-8 px-2 border-b border-gray-100 pb-4">
          <span className="text-lg font-bold tracking-tight text-blue-900 leading-tight">Quản lý Thi đua Liên Đội Chu Văn An</span>
        </div>

        <nav className="space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="🏠" label="Tổng quan" />
          <NavItem active={activeTab === 'score'} onClick={() => setActiveTab('score')} icon="✍️" label="Nhập điểm tuần" />
          <NavItem active={activeTab === 'ranking'} onClick={() => setActiveTab('ranking')} icon="📊" label="Xếp hạng" />
          <NavItem active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon="📈" label="Thống kê" />
          {currentUser.role === Role.ADMIN && (
            <>
              <NavItem active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} icon="⚙️" label="Quản trị" />
              <NavItem active={activeTab === 'locking'} onClick={() => setActiveTab('locking')} icon="🔒" label="Khóa sổ" />
              <NavItem active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon="📋" label="Audit Log" />
            </>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-gray-100">
          <div className="px-2 py-3 bg-gray-50 rounded-lg mb-4">
            <p className="text-sm font-semibold">{currentUser.name}</p>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">{currentUser.role}</p>
          </div>
          <button 
            onClick={() => {
              setCurrentUser(null);
              setLoginUsername('');
              setLoginPassword('');
            }} 
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold capitalize text-gray-800">
              {activeTab === 'dashboard' && 'Trang chủ'}
              {activeTab === 'score' && 'Nhập điểm tuần'}
              {activeTab === 'ranking' && 'Bảng xếp hạng'}
              {activeTab === 'report' && 'Thống kê vi phạm'}
              {activeTab === 'locking' && 'Quản lý khóa sổ'}
              {activeTab === 'audit' && 'Nhật ký hệ thống'}
              {activeTab === 'manage' && 'Quản lý danh mục'}
            </h2>
            <div className="flex items-center mt-1">
               <p className="text-sm text-gray-500">Năm học: </p>
               <select 
                value={activeYearId} 
                onChange={(e) => setActiveYearId(e.target.value)}
                className="ml-2 bg-transparent text-sm font-bold text-blue-600 border-none focus:ring-0 cursor-pointer"
               >
                 {schoolYears.map(sy => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
               </select>
               <span className="mx-2 text-gray-300">|</span>
               <span className={`px-2 py-0.5 rounded text-xs font-bold ${schoolYear.status === Status.OPEN ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {schoolYear.status}
               </span>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-2">Lớp tham gia</h3>
                <p className="text-3xl font-bold text-blue-600">{classes.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-2">Tuần học</h3>
                <p className="text-3xl font-bold text-green-600">{weeks.length} / 35</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-2">Số vi phạm ghi nhận</h3>
                <p className="text-3xl font-bold text-orange-600">{scoreEntries.length}</p>
              </div>
            </div>
            <DashboardChart data={calculateRankings('YEAR', schoolYear.id)} />
          </>
        )}

        {activeTab === 'score' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <select 
                value={selectedWeekId} 
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2"
              >
                {weeks.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({months.find(m => m.id === w.monthId)?.name})</option>
                ))}
              </select>
              {isLocked(selectedWeekId) ? (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                  <span className="mr-1">🔒</span> ĐÃ KHÓA SỔ
                </span>
              ) : (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                  <span className="mr-1">🔓</span> ĐANG MỞ
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4">Ghi nhận vi phạm/thành tích</h3>
                <ScoreForm 
                  classes={classes} 
                  violations={violations} 
                  onSubmit={(data) => addScoreEntry({ ...data, weekId: selectedWeekId })}
                  disabled={!canEditScore(selectedWeekId)}
                />
              </div>
              
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Lớp</th>
                      <th className="px-4 py-3 font-semibold">Mục thi đua</th>
                      <th className="px-4 py-3 font-semibold">Số HS</th>
                      <th className="px-4 py-3 font-semibold">Điểm</th>
                      <th className="px-4 py-3 font-semibold">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scoreEntries.filter(e => e.weekId === selectedWeekId).map(entry => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 font-medium">{classes.find(c => c.id === entry.classId)?.name}</td>
                        <td className="px-4 py-3">{violations.find(v => v.id === entry.violationId)?.name}</td>
                        <td className="px-4 py-3 text-center">{entry.studentCount}</td>
                        <td className={`px-4 py-3 font-bold ${entry.points < 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {entry.points > 0 ? `+${entry.points.toFixed(2)}` : entry.points.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => deleteScoreEntry(entry.id)}
                            disabled={!canEditScore(selectedWeekId)}
                            className="text-red-600 hover:underline disabled:opacity-30"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-6">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <SubTab active={manageSubTab === 'year'} onClick={() => setManageSubTab('year')} label="Năm học" />
              <SubTab active={manageSubTab === 'month'} onClick={() => setManageSubTab('month')} label="Tháng" />
              <SubTab active={manageSubTab === 'week'} onClick={() => setManageSubTab('week')} label="Tuần" />
              <SubTab active={manageSubTab === 'class'} onClick={() => setManageSubTab('class')} label="Lớp" />
              <SubTab active={manageSubTab === 'violation'} onClick={() => setManageSubTab('violation')} label="Vi phạm/Thi đua" />
              <SubTab active={manageSubTab === 'user'} onClick={() => setManageSubTab('user')} label="Thành viên" />
            </div>

            {manageSubTab === 'year' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold mb-4">{editingItem?.type === 'year' ? 'Sửa Năm học' : 'Thêm Năm học'}</h3>
                    <AddYearForm 
                      onSubmit={editingItem?.type === 'year' ? (name: string) => updateYear(editingItem.data.id, name) : addYear} 
                      editingData={editingItem?.type === 'year' ? editingItem.data : null}
                      onCancel={() => setEditingItem(null)}
                    />
                 </div>
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr><th className="px-4 py-2">Tên năm</th><th className="px-4 py-2">Trạng thái</th><th className="px-4 py-2">Hành động</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {schoolYears.map(sy => (
                          <tr key={sy.id} className={activeYearId === sy.id ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-2 font-medium">{sy.name}</td>
                            <td className="px-4 py-2 text-xs">{sy.status}</td>
                            <td className="px-4 py-2 space-x-2">
                              <button onClick={() => setEditingItem({type: 'year', data: sy})} className="text-blue-500 text-xs hover:underline">Sửa</button>
                              <button onClick={() => deleteYear(sy.id)} className="text-red-500 text-xs hover:underline">Xóa</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}

            {manageSubTab === 'user' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold mb-4">{editingItem?.type === 'user' ? 'Sửa Thành viên' : 'Thêm Thành viên'}</h3>
                  <AddUserForm 
                    onSubmit={editingItem?.type === 'user' ? (data: Omit<User, 'id'>) => updateUser(editingItem.data.id, data) : addUser}
                    editingData={editingItem?.type === 'user' ? editingItem.data : null}
                    onCancel={() => setEditingItem(null)}
                  />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">Họ và tên</th>
                        <th className="px-4 py-3">Username</th>
                        <th className="px-4 py-3">Phân quyền</th>
                        <th className="px-4 py-3">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="px-4 py-3 font-medium">{u.name}</td>
                          <td className="px-4 py-3 text-gray-500">{u.username}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{u.role}</span>
                          </td>
                          <td className="px-4 py-3 space-x-3">
                            <button onClick={() => setEditingItem({ type: 'user', data: u })} className="text-blue-500 text-xs hover:underline">Sửa</button>
                            <button onClick={() => resetPassword(u.id)} className="text-orange-500 text-xs hover:underline font-bold">Reset MK</button>
                            <button onClick={() => deleteUser(u.id)} className="text-red-500 text-xs hover:underline">Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {manageSubTab === 'month' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold mb-4">{editingItem?.type === 'month' ? 'Sửa Tháng' : 'Thêm Tháng'}</h3>
                    <AddMonthForm 
                      onSubmit={editingItem?.type === 'month' ? (name: string, num: number) => updateMonth(editingItem.data.id, name, num) : addMonth} 
                      editingData={editingItem?.type === 'month' ? editingItem.data : null}
                      onCancel={() => setEditingItem(null)}
                    />
                 </div>
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr><th className="px-4 py-2">Tên tháng</th><th className="px-4 py-2">Thứ tự</th><th className="px-4 py-2">Hành động</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {months.filter(m => m.schoolYearId === activeYearId).map(m => (
                          <tr key={m.id}><td className="px-4 py-2">{m.name}</td><td className="px-4 py-2">{m.monthNumber}</td><td className="px-4 py-2 space-x-2">
                            <button onClick={() => setEditingItem({type: 'month', data: m})} className="text-blue-500 text-xs">Sửa</button>
                            <button onClick={() => deleteMonth(m.id)} className="text-red-500 text-xs">Xóa</button>
                          </td></tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}

            {manageSubTab === 'week' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold mb-4">{editingItem?.type === 'week' ? 'Sửa Tuần' : 'Thêm Tuần'}</h3>
                    <AddWeekForm 
                      months={months.filter(m => m.schoolYearId === activeYearId)} 
                      onSubmit={editingItem?.type === 'week' ? (name: string, mid: string, num: number) => updateWeek(editingItem.data.id, name, mid, num) : addWeek} 
                      editingData={editingItem?.type === 'week' ? editingItem.data : null}
                      onCancel={() => setEditingItem(null)}
                    />
                 </div>
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr><th className="px-4 py-2">Tên</th><th className="px-4 py-2">Tháng</th><th className="px-4 py-2">Hành động</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {weeks.filter(w => months.find(m => m.id === w.monthId)?.schoolYearId === activeYearId).map(w => (
                          <tr key={w.id}>
                            <td className="px-4 py-2">{w.name}</td>
                            <td className="px-4 py-2">{months.find(m => m.id === w.monthId)?.name}</td>
                            <td className="px-4 py-2 space-x-2">
                              <button onClick={() => setEditingItem({type: 'week', data: w})} className="text-blue-500 text-xs">Sửa</button>
                              <button onClick={() => deleteWeek(w.id)} className="text-red-500 text-xs">Xóa</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}

            {manageSubTab === 'class' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold mb-4">{editingItem?.type === 'class' ? 'Sửa Lớp học' : 'Thêm Lớp học'}</h3>
                    <AddClassForm 
                      onSubmit={editingItem?.type === 'class' ? (name: string, grade: number) => updateClass(editingItem.data.id, name, grade) : addClass} 
                      editingData={editingItem?.type === 'class' ? editingItem.data : null}
                      onCancel={() => setEditingItem(null)}
                    />
                 </div>
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr><th className="px-4 py-2">Tên lớp</th><th className="px-4 py-2">Hành động</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {classes.map(c => (
                          <tr key={c.id}>
                            <td className="px-4 py-2">{c.name}</td>
                            <td className="px-4 py-2 space-x-2">
                              <button onClick={() => setEditingItem({ type: 'class', data: c })} className="text-blue-500 text-xs">Sửa</button>
                              <button onClick={() => deleteClass(c.id)} className="text-red-500 text-xs">Xóa</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}

            {manageSubTab === 'violation' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold mb-4">{editingItem?.type === 'violation' ? 'Sửa Hạng mục' : 'Thêm Hạng mục'}</h3>
                    <AddViolationForm 
                      onSubmit={editingItem?.type === 'violation' ? (name: string, points: number) => updateViolation(editingItem.data.id, name, points) : addViolation} 
                      editingData={editingItem?.type === 'violation' ? editingItem.data : null}
                      onCancel={() => setEditingItem(null)}
                    />
                 </div>
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr><th className="px-4 py-2">Nội dung</th><th className="px-4 py-2">Điểm</th><th className="px-4 py-2">Thao tác</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {violations.map(v => (
                          <tr key={v.id}>
                            <td className="px-4 py-2">{v.name}</td>
                            <td className="px-4 py-2">{v.points.toFixed(2)}</td>
                            <td className="px-4 py-2 space-x-2">
                              <button onClick={() => setEditingItem({ type: 'violation', data: v })} className="text-blue-500 text-xs">Sửa</button>
                              <button onClick={() => deleteViolation(v.id)} className="text-red-500 text-xs">Xóa</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* ... Rest of tabs: ranking, report, locking, audit (unchanged) ... */}
        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-600">Xem theo:</span>
                    <select value={rankingViewMode} onChange={(e) => setRankingViewMode(e.target.value as any)} className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="WEEK">Tuần</option>
                      <option value="MONTH">Tháng</option>
                      <option value="YEAR">Năm học</option>
                    </select>
                </div>
                {rankingViewMode === 'WEEK' && (
                  <select value={rankingWeekId} onChange={(e) => setRankingWeekId(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none">
                    {currentYearWeeks.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                )}
                {rankingViewMode === 'MONTH' && (
                  <select value={rankingMonthId} onChange={(e) => setRankingMonthId(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none">
                    {currentYearMonths.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
              </div>
            </div>
            {rankingViewMode === 'WEEK' && <RankingSection title="Xếp hạng Tuần" data={calculateRankings('WEEK', rankingWeekId)} periodName={getWeekById(rankingWeekId)?.name || ''} onExport={() => exportToExcel(calculateRankings('WEEK', rankingWeekId), `Rank_Week`)} onViewDetail={(classId: string) => setSelectedDetail({ classId, periodType: 'WEEK', periodId: rankingWeekId, periodName: getWeekById(rankingWeekId)?.name || '' })} />}
            {rankingViewMode === 'MONTH' && <RankingSection title="Xếp hạng Tháng" data={calculateRankings('MONTH', rankingMonthId)} periodName={getMonthById(rankingMonthId)?.name || ''} onExport={() => exportToExcel(calculateRankings('MONTH', rankingMonthId), `Rank_Month`)} onViewDetail={(classId: string) => setSelectedDetail({ classId, periodType: 'MONTH', periodId: rankingMonthId, periodName: getMonthById(rankingMonthId)?.name || '' })} />}
            {rankingViewMode === 'YEAR' && <RankingSection title="Xếp hạng Năm học" data={calculateRankings('YEAR', schoolYear.id)} periodName={schoolYear.name} onExport={() => exportToExcel(calculateRankings('YEAR', schoolYear.id), `Rank_Year`)} onViewDetail={(classId: string) => setSelectedDetail({ classId, periodType: 'YEAR', periodId: schoolYear.id, periodName: schoolYear.name })} />}
          </div>
        )}
        
        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                <select value={reportViewMode} onChange={(e) => setReportViewMode(e.target.value as any)} className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="WEEK">Tuần</option>
                  <option value="MONTH">Tháng</option>
                  <option value="YEAR">Năm học</option>
                </select>
                {reportViewMode === 'WEEK' && <select value={reportWeekId} onChange={(e) => setReportWeekId(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm">{currentYearWeeks.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>}
                {reportViewMode === 'MONTH' && <select value={reportMonthId} onChange={(e) => setReportMonthId(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm">{currentYearMonths.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-xs font-bold text-gray-500 uppercase">
                    <th className="px-6 py-3">Nội dung</th>
                    <th className="px-6 py-3 text-center">Lượt</th>
                    <th className="px-6 py-3 text-right">Tổng điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calculateViolationStats(reportViewMode, reportViewMode === 'WEEK' ? reportWeekId : reportViewMode === 'MONTH' ? reportMonthId : schoolYear.id).map(stat => (
                    <tr key={stat.id}>
                      <td className="px-6 py-4 font-medium">{stat.name}</td>
                      <td className="px-6 py-4 text-center">{stat.frequency}</td>
                      <td className={`px-6 py-4 text-right font-bold ${stat.totalPoints < 0 ? 'text-red-600' : 'text-green-600'}`}>{stat.totalPoints.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedDetail && (
        <ClassDetailModal 
          selectedDetail={selectedDetail}
          onClose={() => setSelectedDetail(null)}
          scoreEntries={scoreEntries}
          classes={classes}
          violations={violations}
          weeks={weeks}
          months={months}
          activeYearId={activeYearId}
        />
      )}

      {/* Override Reason Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Xác nhận Admin</h3>
            <p className="text-sm text-gray-600 mb-4">Nhập lý do thực hiện thao tác này (tối thiểu 10 ký tự):</p>
            <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm h-32 mb-4" placeholder="..." value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            <div className="flex space-x-3">
              <button onClick={() => setIsOverrideModalOpen(false)} className="flex-1 py-2 bg-gray-100 rounded-lg">Hủy</button>
              <button onClick={handleOverrideConfirm} className="flex-1 py-2 bg-blue-600 text-white rounded-lg">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---
const NavItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
    <span>{icon}</span>
    <span className="text-left leading-tight">{label}</span>
  </button>
);

const SubTab = ({ active, onClick, label }: any) => (
  <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{label}</button>
);

const ScoreForm = ({ classes, violations, onSubmit, disabled }: any) => {
  const [classId, setClassId] = useState(classes[0].id);
  const [violationId, setViolationId] = useState(violations[0].id);
  const [studentCount, setStudentCount] = useState(1);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ classId, violationId, studentCount, note: '' });
    setStudentCount(1);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lớp</label>
        <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50">
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mục thi đua</label>
        <select value={violationId} onChange={e => setViolationId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50">
          {violations.map((v: any) => <option key={v.id} value={v.id}>{v.name} ({v.points > 0 ? '+' : ''}{v.points})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số lượng</label>
        <input type="number" min="1" value={studentCount} onChange={e => setStudentCount(parseInt(e.target.value) || 1)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
      </div>
      <button type="submit" disabled={disabled} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold disabled:bg-gray-300">Ghi nhận</button>
    </form>
  );
};

const AddYearForm = ({ onSubmit, editingData, onCancel }: any) => {
  const [name, setName] = useState(editingData?.name || '');
  useEffect(() => { if(editingData) setName(editingData.name); }, [editingData]);
  return (
    <div className="space-y-4">
      <input placeholder="Tên năm học" className="w-full border p-2 text-sm rounded" value={name} onChange={e => setName(e.target.value)} />
      <div className="flex gap-2">
         <button onClick={() => { onSubmit(name); setName(''); }} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm">{editingData ? 'Cập nhật' : 'Thêm'}</button>
         {editingData && <button onClick={onCancel} className="flex-1 bg-gray-200 py-2 rounded text-sm">Hủy</button>}
      </div>
    </div>
  );
};

const AddUserForm = ({ onSubmit, editingData, onCancel }: any) => {
  const [name, setName] = useState(editingData?.name || '');
  const [username, setUsername] = useState(editingData?.username || '');
  const [role, setRole] = useState(editingData?.role || Role.TEACHER);
  // Default password logic for new members
  const [password, setPassword] = useState(editingData ? '' : 'Demo@123');

  useEffect(() => {
    if (editingData) {
      setName(editingData.name);
      setUsername(editingData.username);
      setRole(editingData.role);
    }
  }, [editingData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username) return;
    const data: any = { name, username, role, phone: '', email: '', isFirstLogin: true };
    if (!editingData) data.password = password || 'Demo@123';
    onSubmit(data);
    if (!editingData) {
      setName('');
      setUsername('');
      setPassword('Demo@123');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input className="border p-2 text-sm rounded" placeholder="Họ và tên" value={name} onChange={e => setName(e.target.value)} required />
      <input className="border p-2 text-sm rounded" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
      <select className="border p-2 text-sm rounded bg-white" value={role} onChange={e => setRole(e.target.value as Role)}>
        <option value={Role.ADMIN}>Admin</option>
        <option value={Role.DUTY_TEACHER}>GV Trực tuần</option>
        <option value={Role.TEACHER}>Giáo viên</option>
      </select>
      {!editingData && (
        <input className="border p-2 text-sm rounded bg-gray-50" placeholder="Mật khẩu (Mặc định: Demo@123)" value={password} onChange={e => setPassword(e.target.value)} />
      )}
      <div className="md:col-span-2 flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded font-bold">{editingData ? 'Lưu' : 'Thêm mới'}</button>
        {editingData && <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 py-2 rounded font-bold">Hủy</button>}
      </div>
    </form>
  );
};

// ... Monthly, Weekly, Class, Violation forms (simplified for space) ...
const AddMonthForm = ({ onSubmit, editingData, onCancel }: any) => {
  const [name, setName] = useState(editingData?.name || '');
  const [num, setNum] = useState(editingData?.monthNumber || 9);
  return (
    <div className="space-y-4">
      <input placeholder="Tên tháng" className="w-full border p-2 rounded text-sm" value={name} onChange={e => setName(e.target.value)} />
      <input type="number" className="w-full border p-2 rounded text-sm" value={num} onChange={e => setNum(parseInt(e.target.value))} />
      <button onClick={() => { onSubmit(name, num); setName(''); }} className="w-full bg-blue-600 text-white py-2 rounded">Lưu</button>
    </div>
  );
};
const AddWeekForm = ({ months, onSubmit, editingData, onCancel }: any) => {
  const [name, setName] = useState(editingData?.name || '');
  const [mId, setMId] = useState(editingData?.monthId || months[0]?.id || '');
  const [num, setNum] = useState(editingData?.weekNumber || 1);
  return (
    <div className="space-y-4">
      <input placeholder="Tên tuần" className="w-full border p-2 rounded text-sm" value={name} onChange={e => setName(e.target.value)} />
      <select className="w-full border p-2 rounded text-sm" value={mId} onChange={e => setMId(e.target.value)}>{months.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      <button onClick={() => { onSubmit(name, mId, num); setName(''); }} className="w-full bg-blue-600 text-white py-2 rounded">Lưu</button>
    </div>
  );
};
const AddClassForm = ({ onSubmit, editingData, onCancel }: any) => {
  const [name, setName] = useState(editingData?.name || '');
  const [grade, setGrade] = useState(editingData?.grade || 6);
  return (
    <div className="space-y-4">
      <input placeholder="Tên lớp" className="w-full border p-2 rounded text-sm" value={name} onChange={e => setName(e.target.value)} />
      <input type="number" className="w-full border p-2 rounded text-sm" value={grade} onChange={e => setGrade(parseInt(e.target.value))} />
      <button onClick={() => { onSubmit(name, grade); setName(''); }} className="w-full bg-blue-600 text-white py-2 rounded">Lưu</button>
    </div>
  );
};
const AddViolationForm = ({ onSubmit, editingData, onCancel }: any) => {
  const [name, setName] = useState(editingData?.name || '');
  const [points, setPoints] = useState(editingData?.points || 0);
  return (
    <div className="space-y-4">
      <input placeholder="Tên nội dung" className="w-full border p-2 rounded text-sm" value={name} onChange={e => setName(e.target.value)} />
      <input type="number" step="0.1" className="w-full border p-2 rounded text-sm" value={points} onChange={e => setPoints(parseFloat(e.target.value))} />
      <button onClick={() => { onSubmit(name, points); setName(''); }} className="w-full bg-blue-600 text-white py-2 rounded">Lưu</button>
    </div>
  );
};

const RankingSection = ({ title, data, periodName, onExport, onViewDetail }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
      <h3 className="text-lg font-bold text-gray-800">{title} ({periodName})</h3>
      <button onClick={onExport} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded">Xuất Excel</button>
    </div>
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50 border-b">
        <tr><th className="px-6 py-3">Hạng</th><th className="px-6 py-3">Lớp</th><th className="px-6 py-3">Điểm</th><th className="px-6 py-3 text-right">Chi tiết</th></tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.map((item: any) => (
          <tr key={item.classId}>
            <td className="px-6 py-4 font-bold">{item.rank}</td>
            <td className="px-6 py-4">{item.className}</td>
            <td className="px-6 py-4 font-bold text-blue-600">{item.totalPoints.toFixed(2)}</td>
            <td className="px-6 py-4 text-right"><button onClick={() => onViewDetail(item.classId)} className="text-blue-600 text-xs">Xem</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DashboardChart = ({ data }: { data: RankingItem[] }) => {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.totalPoints), 100);
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6 overflow-x-auto">
      <h3 className="text-lg font-bold mb-6">Biểu đồ Tổng điểm</h3>
      <div className="relative h-64 flex items-end space-x-4 min-w-[600px] pb-8 px-4">
        {data.map((item) => {
          const heightPercent = Math.max((item.totalPoints / maxVal) * 100, 5);
          return (
            <div key={item.classId} className="flex-1 flex flex-col items-center group relative">
              <span className="text-xs font-bold text-blue-600 mb-1">{item.totalPoints.toFixed(1)}</span>
              <div style={{ height: `${heightPercent}%` }} className="w-full max-w-[40px] bg-blue-500 rounded-t group-hover:bg-blue-600 transition-all"></div>
              <span className="text-[10px] font-bold text-gray-500 mt-2 rotate-45 origin-left whitespace-nowrap">{item.className}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ClassDetailModal = ({ selectedDetail, onClose, scoreEntries, classes, violations, weeks, months, activeYearId }: any) => {
  const { classId, periodType, periodId, periodName } = selectedDetail;
  const targetClass = classes.find((c: any) => c.id === classId);
  const filteredEntries = useMemo(() => {
    if (periodType === 'WEEK') return scoreEntries.filter((e: any) => e.classId === classId && e.weekId === periodId);
    if (periodType === 'MONTH') {
      const monthWeeks = weeks.filter((w: any) => w.monthId === periodId).map((w: any) => w.id);
      return scoreEntries.filter((e: any) => e.classId === classId && monthWeeks.includes(e.weekId));
    }
    const yearWeeks = weeks.filter((w: any) => months.find((m: any) => m.id === w.monthId)?.schoolYearId === activeYearId).map((w: any) => w.id);
    return scoreEntries.filter((e: any) => e.classId === classId && yearWeeks.includes(e.weekId));
  }, [scoreEntries, classId, periodType, periodId, weeks, months, activeYearId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-blue-50 rounded-t-2xl">
          <h3 className="text-xl font-bold">Lớp {targetClass?.name} - {periodName}</h3>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500 uppercase text-[10px]"><th className="py-2 text-left">Nội dung</th><th className="py-2 text-right">Điểm</th></tr></thead>
            <tbody>
              {filteredEntries.map((e: any) => (
                <tr key={e.id} className="border-b"><td className="py-2">{violations.find((v: any) => v.id === e.violationId)?.name} (x{e.studentCount})</td><td className={`py-2 text-right font-bold ${e.points < 0 ? 'text-red-500' : 'text-green-600'}`}>{e.points.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default App;
