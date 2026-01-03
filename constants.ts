
import { Role, Status, SchoolYear, Month, Week, ClassRoom, ViolationCategory, User } from './types';

export const CURRENT_YEAR_ID = 'sy-2024-2025';

export const SEED_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Admin Hệ Thống', 
    role: Role.ADMIN, 
    username: 'admin', 
    password: 'Demo@123', 
    isFirstLogin: true, 
    phone: '0901234567', 
    email: 'admin@school.edu.vn' 
  },
  { 
    id: 'u2', 
    name: 'Nguyễn Văn A', 
    role: Role.DUTY_TEACHER, 
    username: 'gvtt1', 
    password: '123', 
    isFirstLogin: true, 
    phone: '0912345678', 
    email: 'vanna@school.edu.vn' 
  },
  { 
    id: 'u3', 
    name: 'Trần Thị B', 
    role: Role.TEACHER, 
    username: 'gv1', 
    password: '123', 
    isFirstLogin: true, 
    phone: '0923456789', 
    email: 'thib@school.edu.vn' 
  },
];

export const SEED_SCHOOL_YEAR: SchoolYear = {
  id: CURRENT_YEAR_ID,
  name: '2024-2025',
  status: Status.OPEN
};

export const SEED_MONTHS: Month[] = [
  { id: 'm-sep', schoolYearId: CURRENT_YEAR_ID, name: 'Tháng 9', monthNumber: 9, status: Status.OPEN },
  { id: 'm-oct', schoolYearId: CURRENT_YEAR_ID, name: 'Tháng 10', monthNumber: 10, status: Status.OPEN },
];

export const SEED_WEEKS: Week[] = [
  { id: 'w1', monthId: 'm-sep', name: 'Tuần 1', weekNumber: 1, status: Status.OPEN },
  { id: 'w2', monthId: 'm-sep', name: 'Tuần 2', weekNumber: 2, status: Status.OPEN },
  { id: 'w3', monthId: 'm-sep', name: 'Tuần 3', weekNumber: 3, status: Status.OPEN },
  { id: 'w4', monthId: 'm-sep', name: 'Tuần 4', weekNumber: 4, status: Status.OPEN },
];

export const SEED_CLASSES: ClassRoom[] = [
  { id: 'c1', name: '6A1', grade: 6 },
  { id: 'c2', name: '7A1', grade: 7 },
  { id: 'c3', name: '8A1', grade: 8 },
];

export const SEED_VIOLATIONS: ViolationCategory[] = [
  { id: 'v1', name: 'Đi học muộn', points: -2.5 },
  { id: 'v2', name: 'Không đeo khăn quàng', points: -1.0 },
  { id: 'v3', name: 'Nói chuyện trong giờ', points: -2.0 },
  { id: 'v4', name: 'Vệ sinh lớp kém', points: -5.0 },
  { id: 'v5', name: 'Trực nhật tốt (Cộng)', points: 5.0 },
  { id: 'v6', name: 'Đạt giải HSG cấp trường (Cộng)', points: 10.0 },
  { id: 'v7', name: 'Vi phạm đồng phục', points: -1.5 },
  { id: 'v8', name: 'Mất trật tự hành lang', points: -3.0 },
];
