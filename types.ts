
export enum Role {
  ADMIN = 'ADMIN',
  DUTY_TEACHER = 'DUTY_TEACHER', // GV Trực tuần
  TEACHER = 'TEACHER'           // GV bình thường
}

export enum Status {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  username: string;
  password?: string;      // Mật khẩu (plaintext cho demo MVP)
  isFirstLogin: boolean;  // Đánh dấu cần đổi mật khẩu
  phone: string;
  email: string;
}

export interface SchoolYear {
  id: string;
  name: string;
  status: Status;
}

export interface Month {
  id: string;
  schoolYearId: string;
  name: string;
  monthNumber: number; // 9, 10, 11, 12, 1, 2, 3, 4, 5
  status: Status;
}

export interface Week {
  id: string;
  monthId: string;
  name: string;
  weekNumber: number; // 1 to 35
  status: Status;
}

export interface ClassRoom {
  id: string;
  name: string;
  grade: number;
}

export interface ViolationCategory {
  id: string;
  name: string;
  points: number; // Điểm trừ thường là số âm, điểm cộng số dương
}

export interface ScoreEntry {
  id: string;
  weekId: string;
  classId: string;
  violationId: string;
  studentCount: number; // Số lượng học sinh vi phạm
  points: number;       // Tổng điểm (sau khi nhân studentCount)
  note: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOCK' | 'UNLOCK';
  targetType: 'SCORE' | 'WEEK' | 'MONTH' | 'YEAR' | 'CLASS' | 'VIOLATION' | 'USER';
  targetId: string;
  details: string;
  reason: string;
}

export interface RankingItem {
  classId: string;
  className: string;
  totalPoints: number;
  rank: number;
}
